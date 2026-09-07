import { GoogleGenAI } from "@google/genai"
import Quiz from "../models/quizModel.js"
import QuizAttempt from "../models/quizAttemptModel.js"
import Course from "../models/courseModel.js"
import User from "../models/userModel.js"
import { XP_RULES, awardXp, applyStreakActivity, markDailyQuestTask, checkAndAwardBadges, BADGE_META } from "../utils/gamification.js"

// Helper: only the teacher who created the course can manage its quizzes
const ensureCourseOwner = async (courseId, userId) => {
    const course = await Course.findById(courseId)
    if (!course) return { error: "Course not found", status: 404 }
    if (course.creator?.toString() !== userId?.toString()) {
        return { error: "Access denied. Only this course's teacher can manage its quiz.", status: 403 }
    }
    return { course }
}

// Generate quiz questions using AI (draft - not saved yet)
export const generateQuizWithAI = async (req, res) => {
    try {
        const { courseId } = req.params
        const { topic, numberOfQuestions = 5, difficulty = "Intermediate" } = req.body

        const ownership = await ensureCourseOwner(courseId, req.userId)
        if (ownership.error) return res.status(ownership.status).json({ message: ownership.error })

        const ai = new GoogleGenAI({})
        const prompt = `You are an assistant that creates multiple choice quiz questions for an LMS platform.
Generate exactly ${numberOfQuestions} MCQ questions on the topic: "${topic}" at ${difficulty} difficulty.
Reply ONLY with valid JSON, no markdown fences, no extra text, in this exact structure:
[
  {
    "questionText": "string",
    "options": ["option1","option2","option3","option4"],
    "correctOptionIndex": 0
  }
]`

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        })

        let raw = response.text.trim()
        raw = raw.replace(/```json|```/g, "").trim()
        const questions = JSON.parse(raw)

        return res.status(200).json({ questions })
    } catch (error) {
        return res.status(500).json({ message: `AI quiz generation failed ${error}` })
    }
}

// Save the (possibly AI-edited) quiz - only course owner
export const createQuiz = async (req, res) => {
    try {
        const { courseId } = req.params
        const { title, questions, isPublished } = req.body

        const ownership = await ensureCourseOwner(courseId, req.userId)
        if (ownership.error) return res.status(ownership.status).json({ message: ownership.error })

        if (!questions || questions.length === 0) {
            return res.status(400).json({ message: "At least one question is required" })
        }

        const quiz = await Quiz.create({
            title,
            course: courseId,
            createdBy: req.userId,
            questions,
            isPublished: !!isPublished
        })
        return res.status(201).json(quiz)
    } catch (error) {
        return res.status(500).json({ message: `Failed to create quiz ${error}` })
    }
}

// Edit an existing quiz - only course owner
export const editQuiz = async (req, res) => {
    try {
        const { quizId } = req.params
        const quiz = await Quiz.findById(quizId)
        if (!quiz) return res.status(404).json({ message: "Quiz not found" })

        const ownership = await ensureCourseOwner(quiz.course, req.userId)
        if (ownership.error) return res.status(ownership.status).json({ message: ownership.error })

        const { title, questions, isPublished } = req.body
        if (title !== undefined) quiz.title = title
        if (questions !== undefined) quiz.questions = questions
        if (isPublished !== undefined) quiz.isPublished = isPublished
        await quiz.save()

        return res.status(200).json(quiz)
    } catch (error) {
        return res.status(500).json({ message: `Failed to edit quiz ${error}` })
    }
}

// Delete a quiz - only course owner
export const deleteQuiz = async (req, res) => {
    try {
        const { quizId } = req.params
        const quiz = await Quiz.findById(quizId)
        if (!quiz) return res.status(404).json({ message: "Quiz not found" })

        const ownership = await ensureCourseOwner(quiz.course, req.userId)
        if (ownership.error) return res.status(ownership.status).json({ message: ownership.error })

        await Quiz.findByIdAndDelete(quizId)
        return res.status(200).json({ message: "Quiz deleted successfully" })
    } catch (error) {
        return res.status(500).json({ message: `Failed to delete quiz ${error}` })
    }
}

// Get all quizzes for the teacher managing a course
export const getQuizzesByCourseForTeacher = async (req, res) => {
    try {
        const { courseId } = req.params
        const ownership = await ensureCourseOwner(courseId, req.userId)
        if (ownership.error) return res.status(ownership.status).json({ message: ownership.error })

        const quizzes = await Quiz.find({ course: courseId })
        return res.status(200).json(quizzes)
    } catch (error) {
        return res.status(500).json({ message: `Failed to fetch quizzes ${error}` })
    }
}

// Get published quizzes for an enrolled student (correct answers hidden)
export const getQuizByCourseForStudent = async (req, res) => {
    try {
        const { courseId } = req.params
        const course = await Course.findById(courseId)
        if (!course) return res.status(404).json({ message: "Course not found" })

        const isEnrolled = course.enrolledStudents?.some(id => id.toString() === req.userId.toString())
        if (!isEnrolled) {
            return res.status(403).json({ message: "Enroll in this course to access its quizzes" })
        }

        const quizzes = await Quiz.find({ course: courseId, isPublished: true })
            .select("-questions.correctOptionIndex")
        return res.status(200).json(quizzes)
    } catch (error) {
        return res.status(500).json({ message: `Failed to fetch quizzes ${error}` })
    }
}

// Student submits quiz answers -> auto-graded (MCQ match) + saved for leaderboard/rank
export const submitQuizAttempt = async (req, res) => {
    try {
        const { quizId } = req.params
        const { answers, timeTakenSeconds } = req.body // answers: [selectedOptionIndex, ...] in question order

        const quiz = await Quiz.findById(quizId)
        if (!quiz) return res.status(404).json({ message: "Quiz not found" })

        const course = await Course.findById(quiz.course)
        const isEnrolled = course.enrolledStudents?.some(id => id.toString() === req.userId.toString())
        if (!isEnrolled) {
            return res.status(403).json({ message: "Enroll in this course to attempt its quiz" })
        }

        let score = 0
        quiz.questions.forEach((q, index) => {
            if (answers?.[index] === q.correctOptionIndex) score++
        })

        const attempt = await QuizAttempt.create({
            student: req.userId,
            quiz: quizId,
            course: quiz.course,
            score,
            totalQuestions: quiz.questions.length,
            timeTakenSeconds: timeTakenSeconds || 0
        })

        // ---- Gamification side effects (additive). Re-attempts are still
        // recorded above for the leaderboard as before; XP for a given quiz
        // (base + perfect bonus) is only ever granted once each. ----
        let gamification = null
        try {
            const user = await User.findById(req.userId)
            if (user) {
                let xpEarned = 0
                const isPerfect = quiz.questions.length > 0 && score === quiz.questions.length

                const alreadyGotBaseXp = user.xpAwardedQuizIds.some(id => id.toString() === quizId)
                if (!alreadyGotBaseXp) {
                    awardXp(user, XP_RULES.QUIZ)
                    xpEarned += XP_RULES.QUIZ
                    user.xpAwardedQuizIds.push(quizId)
                }

                const alreadyGotPerfectBonus = user.perfectBonusQuizIds.some(id => id.toString() === quizId)
                if (isPerfect && !alreadyGotPerfectBonus) {
                    awardXp(user, XP_RULES.QUIZ_PERFECT_BONUS)
                    xpEarned += XP_RULES.QUIZ_PERFECT_BONUS
                    user.perfectBonusQuizIds.push(quizId)
                }

                applyStreakActivity(user)

                let dailyQuestJustCompleted = markDailyQuestTask(user, "quizDone")
                if (isPerfect) {
                    dailyQuestJustCompleted = markDailyQuestTask(user, "bonusDone") || dailyQuestJustCompleted
                }
                if (dailyQuestJustCompleted) xpEarned += XP_RULES.DAILY_QUEST

                const perfectQuizCount = user.perfectBonusQuizIds.length
                const newBadgeKeys = checkAndAwardBadges(user, { perfectQuizCount })

                await user.save()

                gamification = {
                    xpEarned,
                    xp: user.xp,
                    currentStreak: user.currentStreak,
                    longestStreak: user.longestStreak,
                    dailyQuestCompleted: dailyQuestJustCompleted,
                    newBadges: newBadgeKeys.map(key => ({ key, ...BADGE_META[key] }))
                }
            }
        } catch (gamificationError) {
            console.log("Gamification update failed (non-blocking):", gamificationError)
        }

        return res.status(200).json({
            message: "Quiz submitted successfully",
            score,
            totalQuestions: quiz.questions.length,
            attempt,
            gamification
        })
    } catch (error) {
        return res.status(500).json({ message: `Failed to submit quiz ${error}` })
    }
}

// Leaderboard for one specific quiz
export const getQuizLeaderboard = async (req, res) => {
    try {
        const { quizId } = req.params

        // Best attempt per student: highest score, then fastest time
        const attempts = await QuizAttempt.find({ quiz: quizId }).populate("student", "name photoUrl")

        const bestByStudent = {}
        attempts.forEach(a => {
            const key = a.student._id.toString()
            if (!bestByStudent[key] ||
                a.score > bestByStudent[key].score ||
                (a.score === bestByStudent[key].score && a.timeTakenSeconds < bestByStudent[key].timeTakenSeconds)) {
                bestByStudent[key] = a
            }
        })

        const leaderboard = Object.values(bestByStudent)
            .sort((a, b) => b.score - a.score || a.timeTakenSeconds - b.timeTakenSeconds)
            .map((a, index) => ({
                rank: index + 1,
                studentId: a.student._id,
                name: a.student.name,
                photoUrl: a.student.photoUrl,
                score: a.score,
                totalQuestions: a.totalQuestions,
                timeTakenSeconds: a.timeTakenSeconds
            }))

        return res.status(200).json(leaderboard)
    } catch (error) {
        return res.status(500).json({ message: `Failed to fetch leaderboard ${error}` })
    }
}

// Platform-wide leaderboard (sum of best scores across all quizzes)
export const getOverallLeaderboard = async (req, res) => {
    try {
        const attempts = await QuizAttempt.find().populate("student", "name photoUrl")

        const totals = {}
        attempts.forEach(a => {
            const key = a.student._id.toString()
            if (!totals[key]) {
                totals[key] = { studentId: a.student._id, name: a.student.name, photoUrl: a.student.photoUrl, totalScore: 0, quizzesTaken: 0 }
            }
            totals[key].totalScore += a.score
            totals[key].quizzesTaken += 1
        })

        const leaderboard = Object.values(totals)
            .sort((a, b) => b.totalScore - a.totalScore)
            .map((entry, index) => ({ rank: index + 1, ...entry }))

        return res.status(200).json(leaderboard)
    } catch (error) {
        return res.status(500).json({ message: `Failed to fetch overall leaderboard ${error}` })
    }
}

// A student's own recent quiz attempts (for dashboard)
export const getMyQuizAttempts = async (req, res) => {
    try {
        const attempts = await QuizAttempt.find({ student: req.userId })
            .populate("quiz", "title")
            .populate("course", "title")
            .sort({ createdAt: -1 })
            .limit(10)
        return res.status(200).json(attempts)
    } catch (error) {
        return res.status(500).json({ message: `Failed to fetch quiz attempts ${error}` })
    }
}

// A single student's stats for their own dashboard: best rank + overall rank
export const getMyQuizStats = async (req, res) => {
    try {
        const studentId = req.userId
        const myAttempts = await QuizAttempt.find({ student: studentId }).populate("quiz", "title")

        // Best rank across any single quiz
        let bestRank = null
        for (const attempt of myAttempts) {
            const allAttemptsForQuiz = await QuizAttempt.find({ quiz: attempt.quiz._id })
            const bestByStudent = {}
            allAttemptsForQuiz.forEach(a => {
                const key = a.student.toString()
                if (!bestByStudent[key] || a.score > bestByStudent[key].score ||
                    (a.score === bestByStudent[key].score && a.timeTakenSeconds < bestByStudent[key].timeTakenSeconds)) {
                    bestByStudent[key] = a
                }
            })
            const sorted = Object.values(bestByStudent).sort((a, b) => b.score - a.score || a.timeTakenSeconds - b.timeTakenSeconds)
            const myIndex = sorted.findIndex(a => a.student.toString() === studentId.toString())
            const myRank = myIndex + 1
            if (myRank > 0 && (!bestRank || myRank < bestRank.rank)) {
                bestRank = { rank: myRank, quizTitle: attempt.quiz.title }
            }
        }

        // Overall platform rank
        const allAttempts = await QuizAttempt.find()
        const totals = {}
        allAttempts.forEach(a => {
            const key = a.student.toString()
            totals[key] = (totals[key] || 0) + a.score
        })
        const sortedTotals = Object.entries(totals).sort((a, b) => b[1] - a[1])
        const overallIndex = sortedTotals.findIndex(([id]) => id === studentId.toString())

        return res.status(200).json({
            totalQuizzesTaken: myAttempts.length,
            bestRank,
            overallRank: overallIndex >= 0 ? overallIndex + 1 : null,
            totalStudentsRanked: sortedTotals.length
        })
    } catch (error) {
        return res.status(500).json({ message: `Failed to fetch quiz stats ${error}` })
    }
}
