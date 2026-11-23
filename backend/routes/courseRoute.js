import express from "express"
import isAuth from "../middlewares/isAuth.js"
import optionalAuth from "../middlewares/optionalAuth.js"
import { createCourse, createLecture, editCourse, editLecture, enrollFreeCourse, getCourseById, getCourseLecture, getCreatorById, getCreatorCourses, getPublishedCourses, removeCourse, removeLecture, removeLectureResource, removeLectureVideo } from "../controllers/courseController.js"
import { uploadLimiter } from "../middlewares/rateLimit.js"
import { uploadImage, uploadLecture, verifyUploads, cleanupUploads } from "../middlewares/multer.js"
import { isEducator, requireCourseOwner, requireLectureOwner } from "../middlewares/permissions.js"
import { getCreatorAnalytics } from "../controllers/analyticsController.js"

let courseRouter = express.Router()

courseRouter.post("/create",isAuth,isEducator,createCourse)
// public list: a visitor only gets preview lectures, the course's students and teacher get everything
courseRouter.get("/getpublishedcoures",optionalAuth,getPublishedCourses)
courseRouter.get("/getcreatorcourses",isAuth,getCreatorCourses)
// permission check first, only then is the upload accepted
courseRouter.post("/editcourse/:courseId",isAuth,requireCourseOwner,uploadLimiter,cleanupUploads,uploadImage.single("thumbnail"),verifyUploads,editCourse)
courseRouter.get("/getcourse/:courseId",isAuth,getCourseById)
courseRouter.delete("/removecourse/:courseId",isAuth,requireCourseOwner,removeCourse)
courseRouter.post("/createlecture/:courseId",isAuth,requireCourseOwner,createLecture)
courseRouter.get("/getcourselecture/:courseId",isAuth,getCourseLecture)
courseRouter.post("/editlecture/:lectureId",isAuth,requireLectureOwner,uploadLimiter,cleanupUploads,uploadLecture.fields([{name:"videoUrl",maxCount:1},{name:"resources",maxCount:5}]),verifyUploads,editLecture)
courseRouter.post("/removelectureresource/:lectureId",isAuth,removeLectureResource)
courseRouter.post("/removelecturevideo/:lectureId",isAuth,removeLectureVideo)
courseRouter.delete("/removelecture/:lectureId",isAuth,removeLecture)
courseRouter.get("/creator-analytics",isAuth,isEducator,getCreatorAnalytics)
courseRouter.post("/getcreator",isAuth,getCreatorById)
courseRouter.post("/enroll/:courseId",isAuth,enrollFreeCourse)

export default courseRouter
