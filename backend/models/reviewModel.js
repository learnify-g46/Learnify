import mongoose from "mongoose";
const reviewSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    user: {
     type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true
    },
    reviewedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
)

const Review = mongoose.model("Review", reviewSchema);
export default Review;