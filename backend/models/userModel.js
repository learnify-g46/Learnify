import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String
      
    },
    description: {
      type: String
    },
    role: {
      type: String,
      enum: ["educator", "student", "admin"],
      required: true
    },
    photoUrl: {
      type: String,
      default: ""
    },
    enrolledCourses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    }],
    resetOtp:{
      type:String
    },
    otpExpires:{
      type:Date
    },
    isOtpVerifed:{
      type:Boolean,
      default:false
    },

    // ---- Gamification (additive; does not affect any existing field/logic) ----
    xp: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActivityDate: { type: String, default: null }, // "YYYY-MM-DD" (UTC calendar day)
    earnedBadges: [{
      key: { type: String },
      earnedAt: { type: Date, default: Date.now }
    }],
    // Track which quizzes already granted XP so re-attempts (needed for the
    // leaderboard) never award XP more than once per quiz.
    xpAwardedQuizIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Quiz" }],
    perfectBonusQuizIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Quiz" }],
    dailyQuest: {
      date: { type: String, default: null }, // "YYYY-MM-DD", resets automatically when this is stale
      lessonDone: { type: Boolean, default: false },
      quizDone: { type: Boolean, default: false },
      bonusDone: { type: Boolean, default: false }, // a perfect quiz score OR a 2nd lesson that day
      claimed: { type: Boolean, default: false }
    }

  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
