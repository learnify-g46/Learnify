import { genToken } from "../configs/token.js"

const isProd = process.env.NODE_ENV === "production"

// Local dev: Strict + non-secure (http://localhost). Production (https, frontend and backend on
// different domains): None + Secure, otherwise the browser drops the cookie.
export const cookieOptions = () => ({
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000
})

export const setAuthCookie = async (res, user) => {
    const token = await genToken(user._id, user.tokenVersion || 0)
    res.cookie("token", token, cookieOptions())
}

export const clearAuthCookie = (res) => {
    const { httpOnly, secure, sameSite } = cookieOptions()
    res.clearCookie("token", { httpOnly, secure, sameSite })
}

// never send password hash / OTP / token internals to the browser
export const safeUser = (user) => {
    const obj = typeof user.toObject === "function" ? user.toObject() : { ...user }
    delete obj.password
    delete obj.resetOtp
    delete obj.otpExpires
    delete obj.isOtpVerifed
    delete obj.otpAttempts
    delete obj.tokenVersion
    delete obj.__v
    obj.hasPassword = Boolean(user.password)
    return obj
}

// roles anyone may pick for themselves; "admin" can never be self-assigned
export const SELF_ROLES = ["student", "educator"]
