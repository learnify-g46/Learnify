import crypto from "crypto"
import jwt from "jsonwebtoken"
import validator from "validator"
import bcrypt from "bcryptjs"
import User from "../models/userModel.js"
import sendMail from "../configs/Mail.js"
import { verifyFirebaseIdToken } from "../utils/firebaseToken.js"
import { setAuthCookie, clearAuthCookie, safeUser, SELF_ROLES } from "../utils/authHelpers.js"

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const cleanEmail = (e) => (typeof e === "string" ? e.trim() : "")

// exact match first (fast, uses the unique index), then a case-insensitive match so accounts
// created earlier with a differently-cased email are still found
const findByEmail = async (email) => {
    if (!email) return null
    return (await User.findOne({ email })) || (await User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, "i") }))
}

const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex")
const MAX_OTP_ATTEMPTS = 5

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
        if (typeof password !== "string" || password.length < 8) {
            return res.status(400).json({ message: "Please enter a Strong Password" })
        }
        if (!SELF_ROLES.includes(role)) {
            return res.status(400).json({ message: "Please choose a valid role (student or educator)" })
        }
        if (await findByEmail(email)) {
            return res.status(400).json({ message: "email already exist" })
        }

        const hashPassword = await bcrypt.hash(password, 10)
        const user = await User.create({ name: name.trim(), email: email.toLowerCase(), password: hashPassword, role })
        await setAuthCookie(res, user)
        return res.status(201).json(safeUser(user))
    } catch (error) {
        console.log("signUp error", error)
        return res.status(500).json({ message: `signUp Error ${error}` })
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
            return res.status(400).json({ message: "user does not exist" })
        }
        if (!user.password) {
            // account was created with Google and has no password yet
            return res.status(400).json({ message: "This account uses Google sign-in. Please continue with Google (or use Forgot password to set a password)." })
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(400).json({ message: "incorrect Password" })
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
                role,
                photoUrl: claims.picture || ""
            })
        }
        await setAuthCookie(res, user)
        return res.status(200).json(safeUser(user))
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
            return res.status(404).json({ message: "User not found" })
        }
        const otp = crypto.randomInt(100000, 1000000).toString() // 6 digits, cryptographically random

        user.resetOtp = hashOtp(otp)
        user.otpExpires = Date.now() + 5 * 60 * 1000
        user.isOtpVerifed = false
        user.otpAttempts = 0

        await user.save()
        try {
            await sendMail(user.email, otp)
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
        if (hashOtp(otp) !== user.resetOtp) {
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
        if (typeof password !== "string" || password.length < 8) {
            return res.status(400).json({ message: "Please enter a Strong Password" })
        }

        user.password = await bcrypt.hash(password, 10)
        user.isOtpVerifed = false
        user.otpExpires = undefined
        user.tokenVersion = (user.tokenVersion || 0) + 1 // sign out every other session
        await user.save()
        return res.status(200).json({ message: "Password Reset Successfully" })
    } catch (error) {
        return res.status(500).json({ message: `Reset Password error ${error}` })
    }
}
