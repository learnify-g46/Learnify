import mongoose from "mongoose"

// MCQ question (same shape as Quiz's question schema, plus marks + optional explanation)
const mcqQuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: {
    type: [String],
    validate: v => v.length >= 2
  },
  correctOptionIndex: { type: Number, required: true },
  explanation: { type: String, default: "" },
  marks: { type: Number, default: 1 }
}, { _id: true })

// Typed-answer / code question
const typedQuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  markingCriteria: { type: String, default: "" }, // guidance given to the AI evaluator + teacher
  maxMarks: { type: Number, default: 10 }
}, { _id: true })

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  instructions: { type: String, default: "" },

  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  type: { type: String, enum: ["mcq", "typed", "pdf"], required: true },

  // ---- MCQ-specific ----
  mcqQuestions: [mcqQuestionSchema],
  randomizeQuestions: { type: Boolean, default: false },

  // ---- Typed / Code-specific ----
  typedQuestions: [typedQuestionSchema],
  isCodeAssignment: { type: Boolean, default: false }, // true = code submission (no execution, AI+teacher review only)

  // ---- PDF / Handwritten-specific ----
  allowedFileTypes: { type: [String], default: ["pdf"] },
  maxFileSizeMB: { type: Number, default: 10 },

  maxMarks: { type: Number, required: true, default: 10 },

  dueDate: { type: Date, required: true },
  allowLateSubmission: { type: Boolean, default: false },
  lateSubmissionPenaltyPercent: { type: Number, default: 0 }, // 0-100, applied to final marks when late

  // When students are allowed to see their score/correct answers
  resultReleaseMode: { type: String, enum: ["immediate", "manual", "after-due-date"], default: "manual" },
  resultsReleased: { type: Boolean, default: false }, // used when resultReleaseMode === "manual"

  status: { type: String, enum: ["draft", "published", "closed"], default: "draft" }
}, { timestamps: true })

const Assignment = mongoose.model("Assignment", assignmentSchema)
export default Assignment
