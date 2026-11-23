import mongoose from "mongoose"
import User from "../models/userModel.js"
import Course from "../models/courseModel.js"
import Assignment from "../models/assignmentModel.js"

// Permission checks that run BEFORE any file upload is accepted, so nobody without the right
// can make the server store a file. All answer 403/404 with a clear message.

export const validId = (id) => mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id)

// teacher (educator) or admin
export const isEducator = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId).select("role")
        if (!user || !["educator", "admin"].includes(user.role)) {
            return res.status(403).json({ message: "Only teachers can do this." })
        }
        req.userRole = user.role
        next()
    } catch (error) {
        console.log("isEducator error:", error.message)
        return res.status(500).json({ message: "Something went wrong. Please try again." })
    }
}

// the course owner (or an admin)
export const requireCourseOwner = async (req, res, next) => {
    try {
        const { courseId } = req.params
        if (!validId(courseId)) return res.status(400).json({ message: "Invalid course id." })
        const [course, user] = await Promise.all([
            Course.findById(courseId).select("creator"),
            User.findById(req.userId).select("role")
        ])
        if (!course) return res.status(404).json({ message: "Course not found" })
        const owner = course.creator?.toString() === String(req.userId)
        if (!owner && user?.role !== "admin") {
            return res.status(403).json({ message: "Access denied. Only this course's teacher can do this." })
        }
        req.course = course
        next()
    } catch (error) {
        console.log("requireCourseOwner error:", error.message)
        return res.status(500).json({ message: "Something went wrong. Please try again." })
    }
}

// the teacher who owns the course this lecture belongs to (or an admin)
export const requireLectureOwner = async (req, res, next) => {
    try {
        const { lectureId } = req.params
        if (!validId(lectureId)) return res.status(400).json({ message: "Invalid lecture id." })
        const [course, user] = await Promise.all([
            Course.findOne({ lectures: lectureId }).select("creator"),
            User.findById(req.userId).select("role")
        ])
        if (!course) return res.status(404).json({ message: "Lecture not found" })
        const owner = course.creator?.toString() === String(req.userId)
        if (!owner && user?.role !== "admin") {
            return res.status(403).json({ message: "Access denied. Only this course's teacher can modify its lectures." })
        }
        next()
    } catch (error) {
        console.log("requireLectureOwner error:", error.message)
        return res.status(500).json({ message: "Something went wrong. Please try again." })
    }
}

// student enrolled in the course of this assignment (checked before the PDF upload is accepted)
export const requireEnrolledForAssignment = async (req, res, next) => {
    try {
        const { assignmentId } = req.params
        if (!validId(assignmentId)) return res.status(404).json({ message: "Assignment not found" })
        const assignment = await Assignment.findById(assignmentId).select("course status")
        if (!assignment) return res.status(404).json({ message: "Assignment not found" })
        const course = await Course.findById(assignment.course).select("enrolledStudents")
        const enrolled = course?.enrolledStudents?.some(id => id.toString() === String(req.userId))
        if (!enrolled) return res.status(403).json({ message: "Enroll in this course to access its assignments" })
        next()
    } catch (error) {
        console.log("requireEnrolledForAssignment error:", error.message)
        return res.status(500).json({ message: "Something went wrong. Please try again." })
    }
}
