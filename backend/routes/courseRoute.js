import express from "express"
import isAuth from "../middlewares/isAuth.js"
import { createCourse, createLecture, editCourse, editLecture, enrollFreeCourse, getCourseById, getCourseLecture, getCreatorById, getCreatorCourses, getPublishedCourses, removeCourse, removeLecture, removeLectureResource, removeLectureVideo } from "../controllers/courseController.js"
import { uploadLimiter } from "../middlewares/rateLimit.js"
import upload from "../middlewares/multer.js"
import { getCreatorAnalytics } from "../controllers/analyticsController.js"

let courseRouter = express.Router()

courseRouter.post("/create",isAuth,createCourse)
courseRouter.get("/getpublishedcoures",getPublishedCourses)
courseRouter.get("/getcreatorcourses",isAuth,getCreatorCourses)
courseRouter.post("/editcourse/:courseId",isAuth,uploadLimiter,upload.single("thumbnail"),editCourse)
courseRouter.get("/getcourse/:courseId",isAuth,getCourseById)
courseRouter.delete("/removecourse/:courseId",isAuth,removeCourse)
courseRouter.post("/createlecture/:courseId",isAuth,createLecture)
courseRouter.get("/getcourselecture/:courseId",isAuth,getCourseLecture)
courseRouter.post("/editlecture/:lectureId",isAuth,uploadLimiter,upload.fields([{name:"videoUrl",maxCount:1},{name:"resources",maxCount:5}]),editLecture)
courseRouter.post("/removelectureresource/:lectureId",isAuth,removeLectureResource)
courseRouter.post("/removelecturevideo/:lectureId",isAuth,removeLectureVideo)
courseRouter.delete("/removelecture/:lectureId",isAuth,removeLecture)
courseRouter.get("/creator-analytics",isAuth,getCreatorAnalytics)
courseRouter.post("/getcreator",isAuth,getCreatorById)
courseRouter.post("/enroll/:courseId",isAuth,enrollFreeCourse)







export default courseRouter