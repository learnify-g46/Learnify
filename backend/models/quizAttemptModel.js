import mongoose from "mongoose";

const quizAttemptSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  timeTakenSeconds: { type: Number, default: 0 }
}, { timestamps: true })

const QuizAttempt = mongoose.model("QuizAttempt", quizAttemptSchema)
export default QuizAttempt
