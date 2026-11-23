import Review from "../models/reviewModel.js";
import Course from "../models/courseModel.js";

export const addReview = async (req, res) => {
  try {
    
    const { rating, comment ,courseId} = req.body;
    const userId = req.userId; 
    if (typeof courseId !== "string" || !/^[0-9a-fA-F]{24}$/.test(courseId)) {
      return res.status(400).json({ message: "Invalid course." });
    }
    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    // only students who are enrolled can review, and a teacher cannot rate their own course
    if (course.creator?.toString() === String(userId)) {
      return res.status(403).json({ message: "You can't review your own course." });
    }
    if (!course.enrolledStudents.some(id => id.toString() === String(userId))) {
      return res.status(403).json({ message: "Enroll in this course to review it." });
    }
    if (typeof comment === "string" && comment.length > 1000) {
      return res.status(400).json({ message: "Your review is too long (max 1000 characters)." });
    }

    // Optional: prevent duplicate review by same user
    const alreadyReviewed = await Review.findOne({ course: courseId, user: userId });
    if (alreadyReviewed) return res.status(400).json({ message: "You have already reviewed this course" });

    const review = new Review({
      course: courseId,
      user: userId,
      rating,
      comment
    });

    await review.save();

    course.reviews.push(review._id);
    await course.save();

    return res.status(201).json(review);
  } catch (error) {
    console.error("Add Review Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getCourseReviews = async (req, res) => {
  try {
    const { courseId } = req.params;
    const reviews = await Review.find({ course: courseId })
    return res.status(200).json(reviews);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching reviews" });
  }
};


export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find({})
      .populate("user", "name photoUrl role") // Populate user name & photo
      .sort({ reviewedAt: -1 }); // Optional: latest first

    // skip reviews whose author no longer exists
    return res.status(200).json(
      reviews.filter(r => r.user)
    );
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return res.status(500).json({ message: "Failed to fetch reviews" });
  }
};
