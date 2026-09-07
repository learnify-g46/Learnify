import express from "express"
import isAuth from "../middlewares/isAuth.js"
import { getMyGamificationProgress } from "../controllers/gamificationController.js"

const gamificationRouter = express.Router()

gamificationRouter.get("/my-progress", isAuth, getMyGamificationProgress)

export default gamificationRouter
