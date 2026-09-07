import mongoose from "mongoose";

const progressSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  completedLectures: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lecture" }],
  lastWatchedLecture: { type: mongoose.Schema.Types.ObjectId, ref: "Lecture" },
}, { timestamps: true })

progressSchema.index({ student: 1, course: 1 }, { unique: true })

const Progress = mongoose.model("Progress", progressSchema)
export default Progress
