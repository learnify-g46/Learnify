import Progress from "../models/progressModel.js"
import Course from "../models/courseModel.js"
import QuizAttempt from "../models/quizAttemptModel.js"
import User from "../models/userModel.js"
import { XP_RULES, awardXp, applyStreakActivity, markDailyQuestTask, checkAndAwardBadges, BADGE_META } from "../utils/gamification.js"

// Mark a lecture as completed + update "last watched" pointer
export const markLectureComplete = async (req, res) => {
    try {
        const { courseId, lectureId } = req.body
        const studentId = req.userId

        let progress = await Progress.findOne({ student: studentId, course: courseId })
        let isNewCompletion = false

        if (!progress) {
            progress = await Progress.create({
                student: studentId,
                course: courseId,
                completedLectures: [lectureId],
                lastWatchedLecture: lectureId
            })
            isNewCompletion = true
        } else {
            if (!progress.completedLectures.some(id => id.toString() === lectureId)) {
                progress.completedLectures.push(lectureId)
                isNewCompletion = true
            }
            progress.lastWatchedLecture = lectureId
            await progress.save()
        }

        // ---- Gamification side effects (additive). Never blocks the core
        // response above if something here fails unexpectedly. ----
        let gamification = null
        if (isNewCompletion) {
            try {
                const user = await User.findById(studentId)
                if (user) {
                    awardXp(user, XP_RULES.LESSON)
                    applyStreakActivity(user)
                    const dailyQuestJustCompleted = markDailyQuestTask(user, "lessonDone")

                    // Total lessons completed by this student across all their courses
                    const allProgress = await Progress.find({ student: studentId })
                    const totalLessonsCompleted = allProgress.reduce((sum, p) => sum + (p.completedLectures?.length || 0), 0)

                    // Did this specific course just reach 100%?
                    const course = await Course.findById(courseId)
                    const totalLecturesInCourse = course?.lectures?.length || 0
                    const courseJustCompleted = totalLecturesInCourse > 0 && progress.completedLectures.length === totalLecturesInCourse

                    const newBadgeKeys = checkAndAwardBadges(user, { totalLessonsCompleted, courseJustCompleted })

                    await user.save()

                    gamification = {
                        xpEarned: XP_RULES.LESSON + (dailyQuestJustCompleted ? XP_RULES.DAILY_QUEST : 0),
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
        }

        return res.status(200).json({ ...progress.toObject(), gamification })
    } catch (error) {
        return res.status(500).json({ message: `Failed to update progress ${error}` })
    }
}

// Just update "last watched" (e.g. student opened a lecture but hasn't finished it)
export const updateLastWatched = async (req, res) => {
    try {
        const { courseId, lectureId } = req.body
        const studentId = req.userId

        let progress = await Progress.findOne({ student: studentId, course: courseId })
        if (!progress) {
            progress = await Progress.create({ student: studentId, course: courseId, lastWatchedLecture: lectureId, completedLectures: [] })
        } else {
            progress.lastWatchedLecture = lectureId
            await progress.save()
        }
        return res.status(200).json(progress)
    } catch (error) {
        return res.status(500).json({ message: `Failed to update last watched ${error}` })
    }
}

// Progress for a single course (used on ViewLecture / ViewCourse to show completion state)
export const getCourseProgress = async (req, res) => {
    try {
        const { courseId } = req.params
        const progress = await Progress.findOne({ student: req.userId, course: courseId })
        return res.status(200).json(progress || { completedLectures: [], lastWatchedLecture: null })
    } catch (error) {
        return res.status(500).json({ message: `Failed to fetch progress ${error}` })
    }
}

// Full student dashboard summary: enrolled courses with % progress, continue-watching, streak
export const getMyDashboardSummary = async (req, res) => {
    try {
        const studentId = req.userId
        const course = await Course.find({ enrolledStudents: studentId }).populate("lectures")
        const allProgress = await Progress.find({ student: studentId })

        const progressByCourse = {}
        allProgress.forEach(p => { progressByCourse[p.course.toString()] = p })

        const enrolledCoursesWithProgress = course.map(c => {
            const p = progressByCourse[c._id.toString()]
            const totalLectures = c.lectures?.length || 0
            const completedCount = p?.completedLectures?.length || 0
            const percent = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0
            return {
                _id: c._id,
                title: c.title,
                thumbnail: c.thumbnail,
                totalLectures,
                completedCount,
                percent,
                lastWatchedLecture: p?.lastWatchedLecture || null,
                isCompleted: totalLectures > 0 && completedCount === totalLectures
            }
        })

        // Learning streak: consecutive days (including today) with a progress update or quiz attempt
        const attempts = await QuizAttempt.find({ student: studentId })
        const activityDates = new Set()
        allProgress.forEach(p => activityDates.add(new Date(p.updatedAt).toDateString()))
        attempts.forEach(a => activityDates.add(new Date(a.createdAt).toDateString()))

        let streak = 0
        let cursor = new Date()
        while (activityDates.has(cursor.toDateString())) {
            streak++
            cursor.setDate(cursor.getDate() - 1)
        }

        return res.status(200).json({
            enrolledCourses: enrolledCoursesWithProgress,
            streak
        })
    } catch (error) {
        return res.status(500).json({ message: `Failed to fetch dashboard summary ${error}` })
    }
}
