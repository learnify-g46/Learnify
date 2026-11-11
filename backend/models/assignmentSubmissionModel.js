import mongoose from "mongoose"

const mcqAnswerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  selectedOptionIndex: { type: Number, default: null }
}, { _id: false })

const typedAnswerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  answerText: { type: String, default: "" },
  aiSuggestedMarks: { type: Number, default: null },
  aiFeedback: { type: String, default: "" },
  teacherMarks: { type: Number, default: null },
  teacherFeedback: { type: String, default: "" }
}, { _id: false })

const submissionSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["mcq", "typed", "pdf"], required: true },

  // Not Started has no submission doc at all. Once one exists, it's one of these:
  status: {
    type: String,
    enum: ["in_progress", "submitted", "under_review", "evaluated"],
    default: "in_progress"
  },

  // ---- MCQ ----
  mcqAnswers: [mcqAnswerSchema],
  mcqScore: { type: Number, default: null },        // raw auto-graded score (out of maxMarks), before late penalty

  // ---- Typed / Code ----
  typedAnswers: [typedAnswerSchema],
  pasteAttempts: { type: Number, default: 0 },        // best-effort activity indicator only, never treated as proof of cheating

  // ---- PDF ----
  fileUrl: { type: String, default: "" },
  fileName: { type: String, default: "" },
  sha256Hash: { type: String, default: "" },
  ocrText: { type: String, default: "" },
  ocrMethod: { type: String, enum: ["text-layer", "ocr", "failed", "not_applicable"], default: "not_applicable" },
  duplicateStatus: {
    type: String,
    enum: ["none", "exact_duplicate_candidate", "potential_duplicate", "needs_review"],
    default: "none"
  },
  duplicateOfSubmission: { type: mongoose.Schema.Types.ObjectId, ref: "AssignmentSubmission", default: null },
  similarityScore: { type: Number, default: null }, // 0-100, only set when duplicateStatus is a similarity-based flag

  // ---- AI evaluation (typed + pdf) — kept separate from the teacher's final say ----
  aiSuggestedMarks: { type: Number, default: null },
  aiFeedback: { type: String, default: "" },
  aiEvaluationFailed: { type: Boolean, default: false },

  // ---- Final result (what the student actually sees once released) ----
  finalMarks: { type: Number, default: null },
  teacherFeedback: { type: String, default: "" },

  isLate: { type: Boolean, default: false },

  submittedAt: { type: Date, default: null },
  evaluatedAt: { type: Date, default: null }
}, { timestamps: true })

// One submission document per student per assignment — updated in place on
// resubmission attempts rather than creating duplicates (handles repeated/
// double-click requests safely).
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true })

const AssignmentSubmission = mongoose.model("AssignmentSubmission", submissionSchema)
export default AssignmentSubmission
