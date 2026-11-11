import express from "express"
import isAuth from "../middlewares/isAuth.js"
import upload from "../middlewares/multer.js"
import { aiGenerateLimiter, submitLimiter, uploadLimiter } from "../middlewares/rateLimit.js"
import {
    generateAssignmentWithAI,
    createAssignment,
    editAssignment,
    deleteAssignment,
    getAssignmentsForTeacher,
    getAssignmentForTeacher,
    getAssignmentsForStudent,
    getAssignmentForStudent,
    submitMcqAssignment,
    submitTypedAssignment,
    submitPdfAssignment,
    getSubmissionsForAssignment,
    reviewSubmission,
    releaseResults,
    getAssignmentDashboardSummary
} from "../controllers/assignmentController.js"

const assignmentRouter = express.Router()

// Teacher-only (ownership enforced inside controller)
assignmentRouter.post("/generate-ai/:courseId", isAuth, aiGenerateLimiter, generateAssignmentWithAI)
assignmentRouter.post("/create/:courseId", isAuth, createAssignment)
assignmentRouter.put("/edit/:assignmentId", isAuth, editAssignment)
assignmentRouter.delete("/:assignmentId", isAuth, deleteAssignment)
assignmentRouter.get("/teacher/course/:courseId", isAuth, getAssignmentsForTeacher)
assignmentRouter.get("/teacher/:assignmentId", isAuth, getAssignmentForTeacher)
assignmentRouter.get("/teacher/dashboard/:courseId", isAuth, getAssignmentDashboardSummary)
assignmentRouter.get("/teacher/submissions/:assignmentId", isAuth, getSubmissionsForAssignment)
assignmentRouter.put("/review/:submissionId", isAuth, reviewSubmission)
assignmentRouter.put("/release-results/:assignmentId", isAuth, releaseResults)

// Student (enrollment enforced inside controller)
assignmentRouter.get("/course/:courseId", isAuth, getAssignmentsForStudent)
assignmentRouter.get("/:assignmentId", isAuth, getAssignmentForStudent)
assignmentRouter.post("/submit/mcq/:assignmentId", isAuth, submitLimiter, submitMcqAssignment)
assignmentRouter.post("/submit/typed/:assignmentId", isAuth, submitLimiter, submitTypedAssignment)
assignmentRouter.post("/submit/pdf/:assignmentId", isAuth, submitLimiter, uploadLimiter, upload.single("file"), submitPdfAssignment)

export default assignmentRouter
