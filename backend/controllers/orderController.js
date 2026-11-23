import crypto from "crypto"
import Course from "../models/courseModel.js"
import User from "../models/userModel.js"
import Enrollment from "../models/enrollmentModel.js"
import razorpay from "razorpay"
import dotenv from "dotenv"
import { recordEnrollment } from "./courseController.js"
dotenv.config()

// Payments stay OFF until you finish the Razorpay setup and set RAZORPAY_ENABLED=true in .env.
// (the routes also need a logged-in user - see paymentRoute.js)
export const paymentsEnabled = (req, res, next) => {
  if (process.env.RAZORPAY_ENABLED !== "true") {
    return res.status(503).json({ code: "PAYMENTS_DISABLED", message: "Online payments are not enabled yet. Please check back soon." })
  }
  next()
}

let instance
const getRazorpay = () => {
  // automated tests plug in a fake here; it is ignored in every other environment
  if (process.env.NODE_ENV === "test" && globalThis.__RAZORPAY_MOCK__) return globalThis.__RAZORPAY_MOCK__
  if (!instance) instance = new razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_SECRET })
  return instance
}

const objectId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v)

export const createOrder = async (req, res) => {
  try {
    const { courseId } = req.body
    if (!objectId(courseId)) return res.status(400).json({ message: "Invalid course" })

    const course = await Course.findById(courseId)
    if (!course || !course.isPublished) return res.status(404).json({ message: "Course not found" })
    if (!course.price || course.price <= 0) return res.status(400).json({ message: "This course is free. Use the free enroll option." })
    if (course.enrolledStudents?.some(id => id.toString() === req.userId)) {
      return res.status(400).json({ message: "You are already enrolled in this course." })
    }

    const order = await getRazorpay().orders.create({
      amount: Math.round(course.price * 100), // paise, always taken from OUR database, never from the browser
      currency: "INR",
      receipt: `c_${course._id}`.slice(0, 40),
      // the order is tied to this course and this user; verifyPayment checks it
      notes: { courseId: course._id.toString(), userId: req.userId }
    })
    return res.status(200).json(order)
  } catch (err) {
    console.log("create order error:", err?.error?.description || err?.message || err)
    return res.status(500).json({ message: "We couldn't start the payment. Please try again." })
  }
}

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = req.body
    const userId = req.userId // the logged-in user, never a value sent in the body
    if (![razorpay_order_id, razorpay_payment_id, razorpay_signature].every(v => typeof v === "string" && v.length > 0 && v.length < 100) || !objectId(courseId)) {
      return res.status(400).json({ message: "Payment verification failed." })
    }

    // 1) signature: proves Razorpay (and not someone else) confirmed this payment
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET || "").update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex")
    const given = Buffer.from(razorpay_signature, "utf8"), want = Buffer.from(expected, "utf8")
    if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
      return res.status(400).json({ message: "Payment verification failed." })
    }

    // 2) the order really is a paid order for THIS course and THIS user, for the right amount
    const course = await Course.findById(courseId)
    if (!course || !course.isPublished) return res.status(404).json({ message: "Course not found" })
    const order = await getRazorpay().orders.fetch(razorpay_order_id)
    if (order.status !== "paid" ||
        order.notes?.courseId !== course._id.toString() ||
        order.notes?.userId !== userId ||
        Number(order.amount) !== Math.round(course.price * 100)) {
      return res.status(400).json({ message: "Payment verification failed." })
    }

    // 3) one order buys one course, once (unique index on the order id)
    try {
      await Enrollment.updateOne(
        { student: userId, course: course._id },
        { $setOnInsert: { amount: course.price, paymentOrderId: razorpay_order_id } },
        { upsert: true }
      )
    } catch (e) {
      if (e?.code === 11000) return res.status(400).json({ message: "This payment has already been used." })
      throw e
    }

    await User.findByIdAndUpdate(userId, { $addToSet: { enrolledCourses: course._id } })
    await Course.findByIdAndUpdate(course._id, { $addToSet: { enrolledStudents: userId } })
    return res.status(200).json({ message: "Payment verified and enrollment successful" })
  } catch (error) {
    console.log("verify payment error:", error?.message || error)
    return res.status(500).json({ message: "We couldn't verify the payment. If money was deducted it will be refunded - please contact support." })
  }
}
