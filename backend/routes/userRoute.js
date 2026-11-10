import express from "express"
import isAuth from "../middlewares/isAuth.js"
import { getCurrentUser, UpdateProfile } from "../controllers/userController.js"
import { uploadLimiter } from "../middlewares/rateLimit.js"
import upload from "../middlewares/multer.js"



let userRouter = express.Router()

userRouter.get("/currentuser",isAuth,getCurrentUser)
userRouter.post("/updateprofile",isAuth,uploadLimiter,upload.single("photoUrl"),UpdateProfile)


export default userRouter