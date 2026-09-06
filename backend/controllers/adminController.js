import User from "../models/userModel.js"
import Course from "../models/courseModel.js"
import Order from "../models/orderModel.js"
import Review from "../models/reviewModel.js"

// GET all users (students + teachers)
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password -resetOtp -otpExpires")
        return res.status(200).json(users)
    } catch (error) {
        return res.status(500).json({ message: `Failed to fetch users ${error}` })
    }
}

// DELETE / ban a user
export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params
        const user = await User.findById(userId)
        if (!user) return res.status(404).json({ message: "User not found" })
        if (user.role === "admin") {
            return res.status(400).json({ message: "Cannot delete an admin account" })
        }
        await User.findByIdAndDelete(userId)
        return res.status(200).json({ message: "User deleted successfully" })
    } catch (error) {
        return res.status(500).json({ message: `Failed to delete user ${error}` })
    }
}

// GET all courses (published + unpublished) for moderation
export const getAllCoursesAdmin = async (req, res) => {
    try {
        const courses = await Course.find()
            .populate("creator", "name email")
            .populate("lectures")
        return res.status(200).json(courses)
    } catch (error) {
        return res.status(500).json({ message: `Failed to fetch courses ${error}` })
    }
}

// DELETE a course (moderation)
export const deleteCourseAdmin = async (req, res) => {
    try {
        const { courseId } = req.params
        const course = await Course.findById(courseId)
        if (!course) return res.status(404).json({ message: "Course not found" })
        await Course.findByIdAndDelete(courseId)
        return res.status(200).json({ message: "Course removed successfully" })
    } catch (error) {
        return res.status(500).json({ message: `Failed to delete course ${error}` })
    }
}

// GET system-wide reports for admin dashboard
export const getAdminReports = async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: "student" })
        const totalTeachers = await User.countDocuments({ role: "educator" })
        const totalCourses = await Course.countDocuments()
        const publishedCourses = await Course.countDocuments({ isPublished: true })
        const totalReviews = await Review.countDocuments()

        const orders = await Order.find({ isPaid: true })
        const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0)

        const courses = await Course.find()
        const categoryBreakdown = {}
        courses.forEach(c => {
            const cat = c.category || "Others"
            categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1
        })

        return res.status(200).json({
            totalStudents,
            totalTeachers,
            totalCourses,
            publishedCourses,
            totalReviews,
            totalRevenue,
            categoryBreakdown
        })
    } catch (error) {
        return res.status(500).json({ message: `Failed to fetch reports ${error}` })
    }
}
