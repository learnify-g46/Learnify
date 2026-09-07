import User from "../models/userModel.js"
import { getLevelInfo, ensureDailyQuestFresh, BADGE_META } from "../utils/gamification.js"

// Everything the student dashboard's gamification widget needs, in one call.
export const getMyGamificationProgress = async (req, res) => {
    try {
        const user = await User.findById(req.userId)
        if (!user) return res.status(404).json({ message: "User not found" })

        // Reading this should also silently roll the quest over to a new day
        // if the stored date is stale, so the UI never shows yesterday's quest.
        const beforeDate = user.dailyQuest?.date
        ensureDailyQuestFresh(user)
        if (user.dailyQuest.date !== beforeDate) {
            await user.save()
        }

        const levelInfo = getLevelInfo(user.xp)

        return res.status(200).json({
            xp: user.xp,
            level: levelInfo.level,
            xpIntoLevel: levelInfo.xp - levelInfo.currentLevelMin,
            xpForNextLevel: levelInfo.nextLevelMin !== null ? levelInfo.nextLevelMin - levelInfo.currentLevelMin : null,
            levelPercent: levelInfo.percent,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
            dailyQuest: {
                tasksCompleted: [user.dailyQuest.lessonDone, user.dailyQuest.quizDone, user.dailyQuest.bonusDone].filter(Boolean).length,
                totalTasks: 3,
                lessonDone: user.dailyQuest.lessonDone,
                quizDone: user.dailyQuest.quizDone,
                bonusDone: user.dailyQuest.bonusDone,
                claimed: user.dailyQuest.claimed,
                reward: 50
            },
            badges: (user.earnedBadges || []).map(b => ({ key: b.key, earnedAt: b.earnedAt, ...BADGE_META[b.key] }))
        })
    } catch (error) {
        return res.status(500).json({ message: `Failed to fetch gamification progress ${error}` })
    }
}
