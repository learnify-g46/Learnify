// Shared gamification logic used by progressController and quizController.
// Kept in one place so XP/streak/badge rules aren't duplicated across files.

export const XP_RULES = {
  LESSON: 10,
  QUIZ: 20,
  QUIZ_PERFECT_BONUS: 30,
  DAILY_QUEST: 50,
}

const LEVELS = [
  { level: 1, min: 0 },
  { level: 2, min: 100 },
  { level: 3, min: 250 },
  { level: 4, min: 500 },
  { level: 5, min: 1000 },
]

// Returns level + progress-to-next-level info for a given xp total.
export function getLevelInfo(xp) {
  const safeXp = Math.max(0, xp || 0)
  let current = LEVELS[0]
  for (const l of LEVELS) {
    if (safeXp >= l.min) current = l
  }
  const currentIndex = LEVELS.findIndex(l => l.level === current.level)
  const next = LEVELS[currentIndex + 1] || null

  if (!next) {
    // Max level — show progress as "full" against the level-5 floor.
    return { level: current.level, xp: safeXp, currentLevelMin: current.min, nextLevelMin: null, percent: 100 }
  }

  const xpIntoLevel = safeXp - current.min
  const xpNeededForLevel = next.min - current.min
  const percent = Math.min(100, Math.round((xpIntoLevel / xpNeededForLevel) * 100))

  return { level: current.level, xp: safeXp, currentLevelMin: current.min, nextLevelMin: next.min, percent }
}

// Consistent "today" as a UTC calendar day string, e.g. "2026-09-07".
// Using one fixed basis (UTC) everywhere avoids streak/quest bugs that
// happen when server time and "local day" disagree near midnight.
export function todayStr(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function daysBetween(dateStrA, dateStrB) {
  const a = new Date(dateStrA + "T00:00:00Z")
  const b = new Date(dateStrB + "T00:00:00Z")
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

// Call once per meaningful activity (lesson complete / quiz submit).
// Mutates user.currentStreak / longestStreak / lastActivityDate in place.
// Does NOT save the user — caller is expected to save once after all
// gamification updates for the request are applied.
export function applyStreakActivity(user) {
  const today = todayStr()

  if (!user.lastActivityDate) {
    user.currentStreak = 1
  } else {
    const diff = daysBetween(user.lastActivityDate, today)
    if (diff === 0) {
      // Already logged activity today — no change to the streak count.
    } else if (diff === 1) {
      user.currentStreak = (user.currentStreak || 0) + 1
    } else if (diff > 1) {
      // A day (or more) was missed — streak restarts at 1 from today.
      user.currentStreak = 1
    }
    // diff < 0 (clock skew) is ignored defensively — leave streak unchanged.
  }

  user.lastActivityDate = today
  user.longestStreak = Math.max(user.longestStreak || 0, user.currentStreak || 0)
}

// Ensures dailyQuest resets automatically when the stored date is not today.
// Mutates in place; caller saves once at the end.
export function ensureDailyQuestFresh(user) {
  const today = todayStr()
  if (!user.dailyQuest || user.dailyQuest.date !== today) {
    user.dailyQuest = { date: today, lessonDone: false, quizDone: false, bonusDone: false, claimed: false }
  }
}

// Marks one of today's quest tasks done, and grants the +50 XP the moment
// all three are complete for the first time. Returns true if the quest was
// just completed by this call (so the caller can include it in the response).
export function markDailyQuestTask(user, taskKey) {
  ensureDailyQuestFresh(user)
  if (!user.dailyQuest[taskKey]) {
    user.dailyQuest[taskKey] = true
  }

  const allDone = user.dailyQuest.lessonDone && user.dailyQuest.quizDone && user.dailyQuest.bonusDone
  if (allDone && !user.dailyQuest.claimed) {
    user.dailyQuest.claimed = true
    user.xp = (user.xp || 0) + XP_RULES.DAILY_QUEST
    return true
  }
  return false
}

export function awardXp(user, amount) {
  user.xp = (user.xp || 0) + amount
}

// Awards a badge if not already earned. Returns true if newly earned.
function awardBadgeIfMissing(user, key) {
  const already = (user.earnedBadges || []).some(b => b.key === key)
  if (already) return false
  user.earnedBadges = [...(user.earnedBadges || []), { key, earnedAt: new Date() }]
  return true
}

// ctx: { totalLessonsCompleted, perfectQuizCount, courseJustCompleted }
// Returns an array of newly-earned badge keys.
export function checkAndAwardBadges(user, ctx = {}) {
  const newly = []

  if (ctx.totalLessonsCompleted >= 1 && awardBadgeIfMissing(user, "first_lesson")) newly.push("first_lesson")
  if (ctx.totalLessonsCompleted >= 5 && awardBadgeIfMissing(user, "fast_learner")) newly.push("fast_learner")
  if ((user.currentStreak || 0) >= 7 && awardBadgeIfMissing(user, "streak_7")) newly.push("streak_7")
  if (ctx.perfectQuizCount >= 3 && awardBadgeIfMissing(user, "quiz_master")) newly.push("quiz_master")
  if (ctx.courseJustCompleted && awardBadgeIfMissing(user, "course_completed")) newly.push("course_completed")

  return newly
}

export const BADGE_META = {
  streak_7: { emoji: "🔥", label: "7 Day Streak" },
  first_lesson: { emoji: "📚", label: "First Lesson" },
  quiz_master: { emoji: "🧠", label: "Quiz Master" },
  course_completed: { emoji: "🎯", label: "Course Completed" },
  fast_learner: { emoji: "🚀", label: "Fast Learner" },
}
