import mongoose from "mongoose"

// One record per (student, course) capturing WHEN the student enrolled and what
// the course cost at that moment. Powers the teacher dashboard trend charts.
// Course.enrolledStudents stays the source of truth for access; this is analytics only.
const enrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  amount: { type: Number, default: 0 }
}, { timestamps: true })

enrollmentSchema.index({ student: 1, course: 1 }, { unique: true })

const Enrollment = mongoose.model("Enrollment", enrollmentSchema)
export default Enrollment
