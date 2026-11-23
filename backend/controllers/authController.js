import crypto from "crypto"
import jwt from "jsonwebtoken"
import validator from "validator"
import bcrypt from "bcryptjs"
import User from "../models/userModel.js"
import sendMail from "../configs/Mail.js"
import { verifyFirebaseIdToken } from "../utils/firebaseToken.js"
import { setAuthCookie, clearAuthCookie, safeUser, SELF_ROLES, verificationRequired } from "../utils/authHelpers.js"
import { hashOtp, otpMatches, newOtp } from "../utils/otp.js"
import { emailDomainProblem } from "../utils/emailDomain.js"

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const cleanEmail = (e) => (typeof e === "string" ? e.trim() : "")

// exact match first (fast, uses the unique index), then a case-insensitive match so accounts
// created earlier with a differently-cased email are still found
const findByEmail = async (email) => {
    if (!email) return null
    return (await User.findOne({ email })) || (await User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, "i") }))
}

const MAX_OTP_ATTEMPTS = 5
const VERIFY_OTP_MINUTES = 10
const RESEND_COOLDOWN_MS = 60 * 1000
const NOT_VERIFIED_MESSAGE = "Please verify your email. We sent a 6-digit code to your inbox."

// make a fresh email-verification code for this account and mail it (throws if the mail fails)
const issueEmailOtp = async (user) => {
    const otp = newOtp()
    user.signupOtp = hashOtp(otp, "verify", user.email)
    user.signupOtpExpires = new Date(Date.now() + VERIFY_OTP_MINUTES * 60 * 1000)
    user.signupOtpAttempts = 0
    user.signupOtpSentAt = new Date()
    await user.save()
    await sendMail(user.email, otp, "verify")
}

// password rule: 8-72 characters (bcrypt ignores everything after 72), at least one letter and one
// number, and not one of the most common passwords
const COMMON_PASSWORDS = new Set(["password1", "password123", "12345678", "123456789", "1234567890", "qwerty123", "qwertyuiop", "iloveyou1", "admin123", "welcome1", "abc12345", "letmein123", "11111111", "00000000", "passw0rd"])
export const passwordProblem = (password) => {
    if (typeof password !== "string" || password.length < 8 || password.length > 72 ||
        !/[A-Za-z]/.test(password) || !/\d/.test(password) || COMMON_PASSWORDS.has(password.toLowerCase())) {
        return "Please choose a stronger password: 8-72 characters with at least one letter and one number (not a common password)."
    }
    return null
}
// compared against when the email is unknown, so "no such account" takes as long as "wrong password"
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10)

export const signUp = async (req, res) => {
    try {
        let { name, password, role } = req.body
        const email = cleanEmail(req.body.email)

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "Please enter your name" })
        }
        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: "Please enter valid Email" })
        }
        const domainProblem = await emailDomainProblem(email)
        if (domainProblem) {
            return res.status(400).json({ message: domainProblem.message, ...(domainProblem.suggestion ? { suggestion: domainProblem.suggestion } : {}) })
        }
        const pwProblem = passwordProblem(password)
        if (pwProblem) {
            return res.status(400).json({ message: pwProblem })
        }
        if (!SELF_ROLES.includes(role)) {
            return res.status(400).json({ message: "Please choose a valid role (student or educator)" })
        }
        const needVerify = verificationRequired()
        const hashPassword = await bcrypt.hash(password, 10)
        let user = await findByEmail(email)
        if (user) {
            // A sign-up that was never confirmed (it has a pending code) belongs to nobody yet, so a new
            // sign-up for the same address replaces it. Anything else is a real account.
            const pending = needVerify && !user.emailVerified && user.password && user.signupOtp
            if (!pending) return res.status(400).json({ message: "email already exist" })
            user.name = name.trim(); user.password = hashPassword; user.role = role
            user.tokenVersion = (user.tokenVersion || 0) + 1
        } else {
            user = new User({ name: name.trim(), email: email.toLowerCase(), password: hashPassword, role, emailVerified: !needVerify })
        }

        if (!needVerify) {
            await user.save()
            await setAuthCookie(res, user)
            return res.status(201).json(safeUser(user))
        }

        try {
            await issueEmailOtp(user) // saves the account (not yet verified) and mails the code
        } catch (mailError) {
            console.log("signup mail error:", mailError.code || mailError.message)
            return res.status(503).json({ code: "OTP_MAIL_FAILED", email: user.email, message: "Your account was created but we couldn't send the verification email. Please tap 'Resend code' in a minute." })
        }
        // no login cookie yet: the account only becomes usable after the code is entered
        return res.status(201).json({ needsVerification: true, email: user.email })
    } catch (error) {
        console.log("signUp error", error)
        return res.status(500).json({ message: "Sign up failed on the server. Please try again." })
    }
}

// the person types the 6-digit code from their inbox -> account verified and logged in
export const verifyEmail = async (req, res) => {
    try {
        const email = cleanEmail(req.body.email)
        const otp = String(req.body.otp ?? "").trim()
        const user = await findByEmail(email)
        if (!user || user.emailVerified || !user.signupOtp || !user.signupOtpExpires || user.signupOtpExpires < Date.now()) {
            return res.status(400).json({ message: "That code is wrong or has expired. Please request a new one." })
        }
        if ((user.signupOtpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
            user.signupOtp = undefined; user.signupOtpExpires = undefined
            await user.save()
            return res.status(429).json({ message: "Too many wrong attempts. Please request a new code." })
        }
        if (!/^\d{6}$/.test(otp) || !otpMatches(otp, user.signupOtp, "verify", user.email)) {
            user.signupOtpAttempts = (user.signupOtpAttempts || 0) + 1
            await user.save()
            return res.status(400).json({ message: "That code is wrong or has expired. Please request a new one." })
        }
        user.emailVerified = true
        user.signupOtp = undefined; user.signupOtpExpires = undefined; user.signupOtpAttempts = 0
        await user.save()
        await setAuthCookie(res, user)
        return res.status(200).json(safeUser(user))
    } catch (error) {
        console.log("verifyEmail error", error)
        return res.status(500).json({ message: "Verification failed on the server. Please try again." })
    }
}

export const resendEmailOtp = async (req, res) => {
    try {
        const email = cleanEmail(req.body.email)
        const user = await findByEmail(email)
        // same answer for every address, so this cannot be used to find out who is registered
        const generic = { message: "If this email is waiting for verification, a new code has been sent." }
        if (!user || user.emailVerified || !user.password) return res.status(200).json(generic)
        if (user.signupOtpSentAt && Date.now() - user.signupOtpSentAt.getTime() < RESEND_COOLDOWN_MS) return res.status(200).json(generic)
        try {
            await issueEmailOtp(user)
        } catch (mailError) {
            console.log("resend mail error:", mailError.code || mailError.message)
            return res.status(503).json({ message: "We couldn't send the email right now. Please try again in a few minutes." })
        }
        return res.status(200).json(generic)
    } catch (error) {
        console.log("resendEmailOtp error", error)
        return res.status(500).json({ message: "Something went wrong. Please try again." })
    }
}

export const login = async (req, res) => {
    try {
        const email = cleanEmail(req.body.email)
        const { password } = req.body
        if (!email || typeof password !== "string" || !password) {
            return res.status(400).json({ message: "Please enter your email and password" })
        }
        const user = await findByEmail(email)
        if (!user) {
            await bcrypt.compare(password, DUMMY_HASH)
            return res.status(400).json({ message: "Incorrect email or password" })
        }
        if (!user.password) {
            // account was created with Google and has no password yet
            return res.status(400).json({ message: "This account uses Google sign-in. Please continue with Google (or use Forgot password to set a password)." })
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect email or password" })
        }
        if (!user.emailVerified && verificationRequired()) {
            // right password, but the email was never confirmed (new sign-up, or an account from before verification existed)
            const justSent = user.signupOtpSentAt && Date.now() - user.signupOtpSentAt.getTime() < RESEND_COOLDOWN_MS
            let mailFailed = false
            if (!justSent) {
                try { await issueEmailOtp(user) } catch (e) { mailFailed = true; console.log("login verify mail error:", e.code || e.message) }
            }
            return res.status(403).json({ code: "EMAIL_NOT_VERIFIED", email: user.email, mailFailed, message: mailFailed ? "Please verify your email. We couldn't send the code right now - tap 'Resend code'." : NOT_VERIFIED_MESSAGE })
        }
        await setAuthCookie(res, user)
        return res.status(200).json(safeUser(user))
    } catch (error) {
        console.log("login error", error)
        return res.status(500).json({ message: `login Error ${error}` })
    }
}

export const logOut = async (req, res) => {
    try {
        // invalidate the token on the server too, not just in this browser
        const { token } = req.cookies || {}
        if (token) {
            try {
                const payload = jwt.verify(token, process.env.JWT_SECRET)
                if ((payload.tv || 0) === ((await User.findById(payload.userId).select("tokenVersion"))?.tokenVersion || 0)) {
                    await User.findByIdAndUpdate(payload.userId, { $inc: { tokenVersion: 1 } })
                }
            } catch (e) { /* expired / invalid token - nothing to revoke */ }
        }
        clearAuthCookie(res)
        return res.status(200).json({ message: "logOut Successfully" })
    } catch (error) {
        return res.status(500).json({ message: `logout Error ${error}` })
    }
}

// Google sign-in. The browser sends the Firebase ID token; name / email come from the VERIFIED
// token, never from the request body. A brand-new Google user must choose a role first.
export const googleSignup = async (req, res) => {
    try {
        const { idToken, role } = req.body
        if (!idToken || typeof idToken !== "string") {
            return res.status(400).json({ message: "Google sign-in could not be completed. Please try again." })
        }

        let claims
        try {
            claims = await verifyFirebaseIdToken(idToken)
        } catch (e) {
            console.log("google token rejected:", e.code || e.message)
            return res.status(401).json({ message: "We couldn't verify your Google sign-in. Please try again." })
        }
        const email = cleanEmail(claims.email)
        if (!email || claims.email_verified === false) {
            return res.status(401).json({ message: "Your Google account email is not verified." })
        }

        let user = await findByEmail(email)
        if (!user) {
            if (!role) {
                // frontend asks the person to pick student / educator, then calls again
                return res.status(200).json({ needsRole: true, email, name: claims.name || email.split("@")[0] })
            }
            if (!SELF_ROLES.includes(role)) {
                return res.status(400).json({ message: "Please choose a valid role (student or educator)" })
            }
            user = await User.create({
                name: claims.name || email.split("@")[0],
                email: email.toLowerCase(),
                emailVerified: true,
                role,
                photoUrl: claims.picture || ""
            })
        }
        // Google has just proven this person owns the email. A password-registered account for the same
        // email that never proved it could have been created by someone else (pre-hijacking), so its
        // password is removed and old sessions are signed out. The owner can set a new password with
        // "Forgot password" (which proves email ownership with an OTP).
        let passwordRemoved = false
        if (!user.emailVerified) {
            passwordRemoved = !!user.password
            const update = { $set: { emailVerified: true } }
            if (passwordRemoved) {
                update.$unset = { password: 1 }
                update.$inc = { tokenVersion: 1 }
                // the name / photo on the account were typed by whoever registered it - use the verified Google profile
                if (claims.name) update.$set.name = claims.name
                if (claims.picture) update.$set.photoUrl = claims.picture
            }
            await User.updateOne({ _id: user._id }, update)
            user = await User.findById(user._id)
        }
        await setAuthCookie(res, user)
        return res.status(200).json({ ...safeUser(user), ...(passwordRemoved ? { passwordRemoved: true } : {}) })
    } catch (error) {
        console.log("googleSignup error", error)
        return res.status(500).json({ message: "Google sign-in failed on the server. Please try again." })
    }
}

export const sendOtp = async (req, res) => {
    try {
        const email = cleanEmail(req.body.email)
        const user = await findByEmail(email)
        if (!user) {
            // same answer as for a real account, so this form can't be used to find out who is registered
            return res.status(200).json({ message: "Email Successfully send" })
        }
        const otp = newOtp()

        user.resetOtp = hashOtp(otp, "reset", user.email)
        user.otpExpires = Date.now() + 5 * 60 * 1000
        user.isOtpVerifed = false
        user.otpAttempts = 0

        await user.save()
        try {
            await sendMail(user.email, otp, "reset")
        } catch (mailError) {
            // a failed email must never take the server down - tell the person instead
            console.log("sendOtp mail error:", mailError.code || mailError.message)
            return res.status(503).json({ message: "We couldn't send the OTP email right now. Please try again in a few minutes." })
        }
        return res.status(200).json({ message: "Email Successfully send" })
    } catch (error) {
        return res.status(500).json({ message: `send otp error ${error}` })
    }
}

export const verifyOtp = async (req, res) => {
    try {
        const email = cleanEmail(req.body.email)
        const otp = String(req.body.otp ?? "").trim()
        const user = await findByEmail(email)
        if (!user || !user.resetOtp || !user.otpExpires || user.otpExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid OTP" })
        }
        if ((user.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
            user.resetOtp = undefined
            user.otpExpires = undefined
            await user.save()
            return res.status(429).json({ message: "Too many wrong attempts. Please request a new OTP." })
        }
        if (!/^\d{6}$/.test(otp) || !otpMatches(otp, user.resetOtp, "reset", user.email)) {
            user.otpAttempts = (user.otpAttempts || 0) + 1
            await user.save()
            return res.status(400).json({ message: "Invalid OTP" })
        }
        user.isOtpVerifed = true
        user.resetOtp = undefined
        user.otpAttempts = 0
        user.otpExpires = Date.now() + 10 * 60 * 1000 // window to set the new password
        await user.save()
        return res.status(200).json({ message: "OTP varified " })
    } catch (error) {
        return res.status(500).json({ message: `Varify otp error ${error}` })
    }
}

export const resetPassword = async (req, res) => {
    try {
        const email = cleanEmail(req.body.email)
        const { password } = req.body
        const user = await findByEmail(email)
        if (!user || !user.isOtpVerifed || !user.otpExpires || user.otpExpires < Date.now()) {
            return res.status(404).json({ message: "OTP verfication required" })
        }
        const pwProblem = passwordProblem(password)
        if (pwProblem) {
            return res.status(400).json({ message: pwProblem })
        }

        user.password = await bcrypt.hash(password, 10)
        user.emailVerified = true // the OTP went to this inbox
        user.isOtpVerifed = false
        user.otpExpires = undefined
        user.resetOtp = undefined; user.otpAttempts = 0                       // every old reset code is dead
        user.signupOtp = undefined; user.signupOtpExpires = undefined; user.signupOtpAttempts = 0 // and any pending verification code
        user.tokenVersion = (user.tokenVersion || 0) + 1 // sign out every other session
        await user.save()
        return res.status(200).json({ message: "Password Reset Successfully" })
    } catch (error) {
        return res.status(500).json({ message: `Reset Password error ${error}` })
    }
}
