import rateLimit, { ipKeyGenerator } from "express-rate-limit"

// Rate limits protect the AI quota, the e-mail account and the login / OTP endpoints.
// RATE_LIMIT_DISABLED=true switches every limiter off (automated tests only).
// Counters live in server memory: fine for one server, use a shared store (Redis) if you ever
// run several.
const disabled = () => process.env.RATE_LIMIT_DISABLED === "true"

const MIN = 60 * 1000

const make = ({ windowMs, limit, message, key, skipSuccessfulRequests = false }) =>
  rateLimit({
    windowMs,
    limit,
    skip: disabled,
    skipSuccessfulRequests,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) => key(req),
    handler: (req, res) =>
      res.status(429).json({ code: "RATE_LIMITED", message })
  })

const ip = (req) => ipKeyGenerator(req.ip)
const emailOf = (req) => String(req.body?.email || "").trim().toLowerCase().slice(0, 100)
const userOrIp = (req) => (req.userId ? `u:${req.userId}` : `ip:${ip(req)}`)

// every /api request, per IP - a safety net, normal use never gets near it
export const globalLimiter = make({
  windowMs: MIN, limit: 300, key: ip,
  message: "Too many requests. Please slow down and try again in a minute."
})

// login / signup: only FAILED attempts count, so normal users are never blocked
export const loginLimiter = make({
  windowMs: 15 * MIN, limit: 10, skipSuccessfulRequests: true,
  key: (req) => `${ip(req)}|${emailOf(req)}`,
  message: "Too many attempts. Please try again in 15 minutes."
})

// Google sign-in (no e-mail in the body - the token carries it)
export const googleLimiter = make({
  windowMs: 15 * MIN, limit: 30, skipSuccessfulRequests: true, key: ip,
  message: "Too many attempts. Please try again in 15 minutes."
})

// OTP e-mail: stops inbox spam and protects the sending Gmail account
export const sendOtpLimiter = make({
  windowMs: 10 * MIN, limit: 3,
  key: (req) => `${emailOf(req) || ip(req)}`,
  message: "Too many OTP requests. Please try again in 10 minutes."
})

// verify OTP / reset password
export const otpCheckLimiter = make({
  windowMs: 10 * MIN, limit: 10,
  key: (req) => `${ip(req)}|${emailOf(req)}`,
  message: "Too many attempts. Please try again in 10 minutes."
})

// Search with AI (uses the AI quota) and the lighter live search while typing
export const aiSearchLimiter = make({
  windowMs: MIN, limit: 30, key: ip,
  message: "Too many searches. Please wait a moment and try again."
})
export const liveSearchLimiter = make({
  windowMs: MIN, limit: 90, key: ip,
  message: "Too many searches. Please wait a moment and try again."
})

// uploads (video / pdf / images) per logged-in user
export const uploadLimiter = make({
  windowMs: 10 * MIN, limit: 40, key: userOrIp,
  message: "Too many uploads. Please wait a few minutes and try again."
})

// assignment submissions per logged-in user
export const submitLimiter = make({
  windowMs: 10 * MIN, limit: 30, key: userOrIp,
  message: "Too many submissions. Please wait a few minutes and try again."
})

// teacher-side AI question generation (quiz / assignment)
export const aiGenerateLimiter = make({
  windowMs: 10 * MIN, limit: 15, key: userOrIp,
  message: "Too many AI requests. Please wait a few minutes and try again."
})
