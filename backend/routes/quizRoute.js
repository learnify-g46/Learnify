import express from "express"
import isAuth from "../middlewares/isAuth.js"
import {
  createQuiz,
  deleteQuiz,
  editQuiz,
  generateQuizWithAI,
  getMyQuizAttempts,
  getMyQuizStats,
  getOverallLeaderboard,
  getQuizByCourseForStudent,
  getQuizLeaderboard,
  getQuizzesByCourseForTeacher,
  submitQuizAttempt
} from "../controllers/quizController.js"

const quizRouter = express.Router()

// Teacher-only (ownership enforced inside controller)
quizRouter.post("/generate-ai/:courseId", isAuth, generateQuizWithAI)
quizRouter.post("/create/:courseId", isAuth, createQuiz)
quizRouter.put("/edit/:quizId", isAuth, editQuiz)
quizRouter.delete("/:quizId", isAuth, deleteQuiz)
quizRouter.get("/teacher/course/:courseId", isAuth, getQuizzesByCourseForTeacher)

// Student (enrollment enforced inside controller)
quizRouter.get("/course/:courseId", isAuth, getQuizByCourseForStudent)
quizRouter.post("/submit/:quizId", isAuth, submitQuizAttempt)

// Leaderboard & rank
quizRouter.get("/leaderboard/:quizId", isAuth, getQuizLeaderboard)
quizRouter.get("/overall-leaderboard", isAuth, getOverallLeaderboard)
quizRouter.get("/my-stats", isAuth, getMyQuizStats)
quizRouter.get("/my-attempts", isAuth, getMyQuizAttempts)

export default quizRouter
