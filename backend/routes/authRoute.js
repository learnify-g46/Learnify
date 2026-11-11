import express from "express"
import { loginLimiter, googleLimiter, sendOtpLimiter, otpCheckLimiter } from "../middlewares/rateLimit.js"
import {googleSignup, login, logOut, resetPassword, sendOtp, signUp, verifyOtp } from "../controllers/authController.js"

const authRouter = express.Router()

authRouter.post("/signup",loginLimiter,signUp)

authRouter.post("/login",loginLimiter,login)
authRouter.get("/logout",logOut)
authRouter.post("/googlesignup",googleLimiter,googleSignup)
authRouter.post("/sendotp",sendOtpLimiter,sendOtp)
authRouter.post("/verifyotp",otpCheckLimiter,verifyOtp)
authRouter.post("/resetpassword",otpCheckLimiter,resetPassword)


export default authRouter