import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: {
    type: [String],
    validate: v => v.length >= 2
  },
  correctOptionIndex: { type: Number, required: true }
}, { _id: true })

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  questions: [questionSchema],
  isPublished: { type: Boolean, default: false }
}, { timestamps: true })

const Quiz = mongoose.model("Quiz", quizSchema)
export default Quiz
