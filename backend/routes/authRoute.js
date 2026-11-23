import express from "express"
import { loginLimiter, googleLimiter, sendOtpLimiter, otpCheckLimiter, signupLimiter } from "../middlewares/rateLimit.js"
import {googleSignup, login, logOut, resetPassword, sendOtp, signUp, verifyOtp, verifyEmail, resendEmailOtp } from "../controllers/authController.js"

const authRouter = express.Router()

authRouter.post("/signup",signupLimiter,signUp)

authRouter.post("/login",loginLimiter,login)
// POST (not GET) so another website cannot log a user out with an <img> tag
authRouter.post("/logout",logOut)
authRouter.post("/googlesignup",googleLimiter,googleSignup)
authRouter.post("/verify-email",otpCheckLimiter,verifyEmail)
authRouter.post("/resend-email-otp",sendOtpLimiter,resendEmailOtp)
authRouter.post("/sendotp",sendOtpLimiter,sendOtp)
authRouter.post("/verifyotp",otpCheckLimiter,verifyOtp)
authRouter.post("/resetpassword",otpCheckLimiter,resetPassword)


export default authRouter