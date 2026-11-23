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

// Everything that has to go when a course or a user is deleted, in one place, so no route can forget a part.
//
// KEPT on purpose: Order and Enrollment records. They are the payment history (who paid what, when) and
// are needed for accounting / refunds; they only point at ids and hold no files or personal content.

// a failed file delete (already gone, Cloudinary hiccup) must never stop the database cleanup
const dropFile = async (url) => {
    if (!url) return
    try { await deleteFromCloudinary(url) } catch (e) { console.log("cleanup: could not delete a stored file:", e?.message || e) }
}

// ---- a whole course ----------------------------------------------------------------------------------
export const deleteCourseCascade = async (courseId) => {
    const course = await Course.findById(courseId)
    if (!course) return { deleted: false }

    // lectures + their videos and study materials
    const lectures = await Lecture.find({ _id: { $in: course.lectures || [] } })
    for (const l of lectures) {
        await dropFile(l.videoUrl)
        for (const r of l.resources || []) await dropFile(r.url)
    }
    await Lecture.deleteMany({ _id: { $in: course.lectures || [] } })

    // quizzes, assignments and what students handed in (including the submitted PDF files)
    await QuizAttempt.deleteMany({ course: course._id })
    await Quiz.deleteMany({ course: course._id })
    const subs = await AssignmentSubmission.find({ course: course._id, fileUrl: { $exists: true, $ne: "" } }).select("fileUrl")
    for (const s of subs) await dropFile(s.fileUrl)
    await AssignmentSubmission.deleteMany({ course: course._id })
    await Assignment.deleteMany({ course: course._id })

    await Progress.deleteMany({ course: course._id })
    await Review.deleteMany({ course: course._id })
    await User.updateMany({ enrolledCourses: course._id }, { $pull: { enrolledCourses: course._id } })

    await dropFile(course.thumbnail)
    await course.deleteOne()
    return { deleted: true }
}

// ---- a user ------------------------------------------------------------------------------------------
// What happens to the courses of a deleted TEACHER:
//   - nobody enrolled  -> the course is deleted completely
//   - students enrolled -> the course is archived: hidden from the catalogue, enrolled students keep access
export const deleteUserCascade = async (user) => {
    const summary = { coursesDeleted: 0, coursesArchived: 0 }

    // as a teacher
    const own = await Course.find({ creator: user._id }).select("_id enrolledStudents")
    for (const c of own) {
        if ((c.enrolledStudents || []).length === 0) {
            await deleteCourseCascade(c._id)
            summary.coursesDeleted++
        } else {
            await Course.updateOne({ _id: c._id }, { $set: { isPublished: false, archivedAt: new Date() } })
            summary.coursesArchived++
        }
    }

    // as a student: their work, results and traces in other people's courses
    await QuizAttempt.deleteMany({ student: user._id })
    const subs = await AssignmentSubmission.find({ student: user._id, fileUrl: { $exists: true, $ne: "" } }).select("fileUrl")
    for (const s of subs) await dropFile(s.fileUrl)
    await AssignmentSubmission.deleteMany({ student: user._id })
    await Progress.deleteMany({ student: user._id })
    const reviews = await Review.find({ user: user._id }).select("_id")
    if (reviews.length) {
        for (const rv of reviews) await Course.updateMany({ reviews: rv._id }, { $pull: { reviews: rv._id } })
        await Review.deleteMany({ user: user._id })
    }
    await Course.updateMany({ enrolledStudents: user._id }, { $pull: { enrolledStudents: user._id } })

    await dropFile(user.photoUrl)
    await User.findByIdAndDelete(user._id)
    return summary
}
