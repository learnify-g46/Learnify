import crypto from "crypto"

// One-time codes are stored as an HMAC made with a server secret, never as a plain hash: a 6-digit code
// has only 900,000 possibilities, so a plain SHA-256 can be reversed in under a second by anyone who
// reads the database or a backup. With the secret key the stored value is useless without the server.
// The purpose and the email are mixed in, so a code for one purpose / address cannot be used for another.
const secret = () => process.env.OTP_SECRET || process.env.JWT_SECRET || "dev-only-otp-secret"

export const hashOtp = (otp, purpose, email) =>
    crypto.createHmac("sha256", secret()).update(`${purpose}|${String(email || "").toLowerCase()}|${String(otp)}`).digest("hex")

// constant-time comparison (no early exit on the first differing character)
export const otpMatches = (otp, stored, purpose, email) => {
    if (typeof stored !== "string" || !stored) return false
    const a = Buffer.from(hashOtp(otp, purpose, email), "hex")
    const b = Buffer.from(stored, "hex")
    return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export const newOtp = () => crypto.randomInt(100000, 1000000).toString() // 6 digits, cryptographically random
