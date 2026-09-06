import express from "express"
import isAuth from "../middlewares/isAuth.js"
import isAdmin from "../middlewares/isAdmin.js"
import { deleteCourseAdmin, deleteUser, getAdminReports, getAllCoursesAdmin, getAllUsers } from "../controllers/adminController.js"

const adminRouter = express.Router()

adminRouter.get("/users", isAuth, isAdmin, getAllUsers)
adminRouter.delete("/users/:userId", isAuth, isAdmin, deleteUser)
adminRouter.get("/courses", isAuth, isAdmin, getAllCoursesAdmin)
adminRouter.delete("/courses/:courseId", isAuth, isAdmin, deleteCourseAdmin)
adminRouter.get("/reports", isAuth, isAdmin, getAdminReports)

export default adminRouter
