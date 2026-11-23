// Finds (and with --apply removes) records left behind by deletions made BEFORE the cleanup was added:
// lectures / quizzes / assignments / submissions / progress / reviews that belong to a course or user that
// no longer exists, and dangling ids inside users' and courses' lists. Also handles courses whose teacher is gone
// (deleted when nobody is enrolled, otherwise archived - same rule as deleting a user).
//
//   node scripts/cleanOrphans.js          -> dry run: only prints what it found
//   node scripts/cleanOrphans.js --apply  -> backs everything up to backend/backups/ first, then cleans
//
// Payment records (Order, Enrollment) are never touched. Safe to run again.
import "dotenv/config"
import mongoose from "mongoose"
import Course from "../models/courseModel.js"
import Lecture from "../models/lectureModel.js"
import Quiz from "../models/quizModel.js"
import QuizAttempt from "../models/quizAttemptModel.js"
import Assignment from "../models/assignmentModel.js"
import AssignmentSubmission from "../models/assignmentSubmissionModel.js"
import Progress from "../models/progressModel.js"
import Review from "../models/reviewModel.js"
import User from "../models/userModel.js"
import { deleteFromCloudinary } from "../configs/cloudinary.js"
import { deleteCourseCascade } from "../services/cleanup.js"
import { configureCloudinary, writeBackup } from "./_shared.js"

const apply = process.argv.includes("--apply")
configureCloudinary()
await mongoose.connect(process.env.MONGODB_URL)

const ids = async (Model) => new Set((await Model.find().select("_id").lean()).map(d => String(d._id)))
const courseIds = await ids(Course), userIds = await ids(User), lectureIdsInCourses = new Set()
for (const c of await Course.find().select("lectures").lean()) (c.lectures || []).forEach(l => lectureIdsInCourses.add(String(l)))
const quizIds = await ids(Quiz), assignmentIds = await ids(Assignment)

const dropFile = async (url) => { if (apply && url) { try { await deleteFromCloudinary(url) } catch (e) { console.log("  (could not delete a file:", e?.message || e, ")") } } }

const found = {
    lectures: (await Lecture.find()).filter(l => !lectureIdsInCourses.has(String(l._id))),
    quizzes: (await Quiz.find()).filter(q => !courseIds.has(String(q.course))),
    quizAttempts: (await QuizAttempt.find()).filter(a => !courseIds.has(String(a.course)) || !quizIds.has(String(a.quiz)) || !userIds.has(String(a.student))),
    assignments: (await Assignment.find()).filter(a => !courseIds.has(String(a.course))),
    submissions: (await AssignmentSubmission.find()).filter(s => !courseIds.has(String(s.course)) || !assignmentIds.has(String(s.assignment)) || !userIds.has(String(s.student))),
    progress: (await Progress.find()).filter(p => !courseIds.has(String(p.course)) || !userIds.has(String(p.student))),
    reviews: (await Review.find()).filter(r => !courseIds.has(String(r.course)) || !userIds.has(String(r.user))),
    teacherlessCourses: (await Course.find()).filter(c => c.creator && !userIds.has(String(c.creator))),
}
let danglingUserCourseIds = 0, danglingCourseStudentIds = 0
const users = await User.find({ enrolledCourses: { $exists: true, $ne: [] } }).select("enrolledCourses")
for (const u of users) danglingUserCourseIds += u.enrolledCourses.filter(id => !courseIds.has(String(id))).length
const coursesWithStudents = await Course.find({ enrolledStudents: { $exists: true, $ne: [] } }).select("enrolledStudents")
for (const c of coursesWithStudents) danglingCourseStudentIds += c.enrolledStudents.filter(id => !userIds.has(String(id))).length

console.log("Found:")
for (const [k, v] of Object.entries(found)) console.log(`  ${k.padEnd(20)} ${v.length}`)
console.log(`  ${"dangling course ids in users".padEnd(30)} ${danglingUserCourseIds}`)
console.log(`  ${"dangling student ids in courses".padEnd(30)} ${danglingCourseStudentIds}`)

if (apply) {
    console.log("\nBackup written to:", writeBackup("orphans", Object.fromEntries(Object.entries(found).map(([k, v]) => [k, v.map(d => d.toObject())]))))
    for (const l of found.lectures) { await dropFile(l.videoUrl); for (const r of l.resources || []) await dropFile(r.url) }
    await Lecture.deleteMany({ _id: { $in: found.lectures.map(d => d._id) } })
    await QuizAttempt.deleteMany({ _id: { $in: found.quizAttempts.map(d => d._id) } })
    await Quiz.deleteMany({ _id: { $in: found.quizzes.map(d => d._id) } })
    for (const s of found.submissions) await dropFile(s.fileUrl)
    await AssignmentSubmission.deleteMany({ _id: { $in: found.submissions.map(d => d._id) } })
    await Assignment.deleteMany({ _id: { $in: found.assignments.map(d => d._id) } })
    await Progress.deleteMany({ _id: { $in: found.progress.map(d => d._id) } })
    const badReviews = found.reviews.map(d => d._id)
    await Course.updateMany({ reviews: { $in: badReviews } }, { $pull: { reviews: { $in: badReviews } } })
    await Review.deleteMany({ _id: { $in: badReviews } })
    for (const c of found.teacherlessCourses) {
        if ((c.enrolledStudents || []).length === 0) await deleteCourseCascade(c._id)
        else await Course.updateOne({ _id: c._id }, { $set: { isPublished: false, archivedAt: new Date() } })
    }
    for (const u of users) {
        const keep = u.enrolledCourses.filter(id => courseIds.has(String(id)))
        if (keep.length !== u.enrolledCourses.length) await User.updateOne({ _id: u._id }, { $set: { enrolledCourses: keep } })
    }
    for (const c of coursesWithStudents) {
        const keep = c.enrolledStudents.filter(id => userIds.has(String(id)))
        if (keep.length !== c.enrolledStudents.length) await Course.updateOne({ _id: c._id }, { $set: { enrolledStudents: keep } })
    }
    console.log("Cleaned.")
} else {
    console.log("\nDry run - nothing changed. Run again with --apply to clean up.")
}
await mongoose.disconnect()
