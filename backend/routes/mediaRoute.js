import express from "express"
import optionalAuth from "../middlewares/optionalAuth.js"
import { mediaLimiter } from "../middlewares/rateLimit.js"
import { streamLectureVideo, streamLectureResource, streamSubmissionFile } from "../controllers/mediaController.js"

const mediaRouter = express.Router()

// the signed-in session (cookie) decides who may open a file; free-preview videos are open to everyone
mediaRouter.use(mediaLimiter)
mediaRouter.get("/lecture/:lectureId/video", optionalAuth, streamLectureVideo)
mediaRouter.get("/lecture/:lectureId/resource/:resourceId", optionalAuth, streamLectureResource)

mediaRouter.get("/submission/:submissionId/file", optionalAuth, streamSubmissionFile)

export default mediaRouter
