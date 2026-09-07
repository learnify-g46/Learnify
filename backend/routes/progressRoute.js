import express from "express"
import isAuth from "../middlewares/isAuth.js"
import { getCourseProgress, getMyDashboardSummary, markLectureComplete, updateLastWatched } from "../controllers/progressController.js"

const progressRouter = express.Router()

progressRouter.post("/complete", isAuth, markLectureComplete)
progressRouter.post("/last-watched", isAuth, updateLastWatched)
progressRouter.get("/course/:courseId", isAuth, getCourseProgress)
progressRouter.get("/my-summary", isAuth, getMyDashboardSummary)

export default progressRouter
