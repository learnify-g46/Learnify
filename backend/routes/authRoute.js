import express from "express"
import {googleSignup, login, logOut, resetPassword, sendOtp, signUp, verifyOtp } from "../controllers/authController.js"

const authRouter = express.Router()

authRouter.post("/signup",signUp)

authRouter.post("/login",login)
authRouter.get("/logout",logOut)
authRouter.post("/googlesignup",googleSignup)
authRouter.post("/sendotp",sendOtp)
authRouter.post("/verifyotp",verifyOtp)
authRouter.post("/resetpassword",resetPassword)


export default authRouter