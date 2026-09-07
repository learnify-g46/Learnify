import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { serverUrl } from '../App'
import { FaArrowLeftLong } from "react-icons/fa6"
import { FaFire, FaTrophy, FaMedal, FaCertificate, FaPlayCircle } from "react-icons/fa"

function StudentDashboard() {
  const navigate = useNavigate()
  const { userData } = useSelector(state => state.user)

  const [summary, setSummary] = useState(null)
  const [quizStats, setQuizStats] = useState(null)
  const [recentAttempts, setRecentAttempts] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [gamification, setGamification] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true)
        const [summaryRes, statsRes, attemptsRes, recRes, gamificationRes] = await Promise.all([
          axios.get(serverUrl + "/api/progress/my-summary", { withCredentials: true }),
          axios.get(serverUrl + "/api/quiz/my-stats", { withCredentials: true }),
          axios.get(serverUrl + "/api/quiz/my-attempts", { withCredentials: true }),
          axios.get(serverUrl + "/api/ai/recommendations", { withCredentials: true }),
          // New gamification widget — isolated with its own catch so that if
          // this endpoint ever fails, the rest of the (already working)
          // dashboard still loads exactly as before.
          axios.get(serverUrl + "/api/gamification/my-progress", { withCredentials: true }).catch(() => null),
        ])
        setSummary(summaryRes.data)
        setQuizStats(statsRes.data)
        setRecentAttempts(attemptsRes.data)
        setRecommendations(recRes.data)
        if (gamificationRes) setGamification(gamificationRes.data)
      } catch (error) {
        console.log(error)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-[90px] px-4 md:px-10 pb-16 transition-colors">
      <FaArrowLeftLong className="w-[22px] h-[22px] cursor-pointer mb-4 text-gray-800 dark:text-gray-200" onClick={() => navigate("/")} />

      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        Welcome back, {userData?.name?.split(" ")[0]} 👋
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">Here's how your learning journey is going.</p>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading your dashboard...</p>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-5 border border-gray-100 dark:border-gray-800">
              <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Enrolled Courses</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{summary?.enrolledCourses?.length || 0}</h2>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl shadow p-5 border border-orange-100 dark:border-orange-900">
              <p className="text-orange-500 text-xs sm:text-sm flex items-center gap-1"><FaFire /> Learning Streak</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{summary?.streak || 0} days</h2>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl shadow p-5 border border-yellow-100 dark:border-yellow-900">
              <p className="text-yellow-600 dark:text-yellow-400 text-xs sm:text-sm flex items-center gap-1"><FaTrophy /> Best Rank</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                {quizStats?.bestRank ? `#${quizStats.bestRank.rank}` : "—"}
              </h2>
            </div>
            <div onClick={() => navigate("/overall-leaderboard")} className="bg-gray-100 dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow">
              <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm flex items-center gap-1"><FaMedal /> Overall Rank</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                {quizStats?.overallRank ? `#${quizStats.overallRank}` : "—"}
              </h2>
            </div>
          </div>

          {/* 🎮 My Learning Progress — gamification widget (new, additive) */}
          {gamification && (
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-5 border border-gray-100 dark:border-gray-800 mb-8">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                🎮 My Learning Progress
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Level + XP bar */}
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Level {gamification.level}
                    {gamification.xpForNextLevel !== null && (
                      <span className="text-gray-400 dark:text-gray-500 font-normal"> · {gamification.xpIntoLevel} / {gamification.xpForNextLevel} XP</span>
                    )}
                  </p>
                  <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${gamification.levelPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{gamification.xp} XP total</p>
                </div>

                {/* Streak + Daily Quest */}
                <div className="flex flex-col gap-2 justify-center">
                  <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <FaFire className="text-orange-500" /> {gamification.currentStreak} Day Streak
                    <span className="text-xs text-gray-400 dark:text-gray-500">(Longest: {gamification.longestStreak})</span>
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    🎯 Today's Quest — {gamification.dailyQuest.tasksCompleted} / {gamification.dailyQuest.totalTasks} completed
                    {gamification.dailyQuest.claimed && <span className="text-green-600 dark:text-green-400 text-xs ml-1">(+{gamification.dailyQuest.reward} XP claimed)</span>}
                  </p>
                </div>

                {/* Badges */}
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">🏆 My Badges</p>
                  {gamification.badges.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500">Complete lessons & quizzes to earn your first badge!</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 text-2xl" title={gamification.badges.map(b => b.label).join(", ")}>
                      {gamification.badges.map(b => <span key={b.key}>{b.emoji}</span>)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* My Courses with progress */}
          <div className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">My Courses</h2>
            {summary?.enrolledCourses?.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-8 text-center border border-gray-100 dark:border-gray-800">
                <p className="text-gray-500 dark:text-gray-400 mb-3">You haven't enrolled in any courses yet.</p>
                <button onClick={() => navigate("/allcourses")} className="bg-black dark:bg-white dark:text-black text-white px-5 py-2 rounded-lg text-sm">
                  Explore Courses
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {summary?.enrolledCourses?.map(course => (
                  <div key={course._id} className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <img src={course.thumbnail} alt={course.title} className="w-full h-[130px] object-cover" />
                    <div className="p-4">
                      <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100 line-clamp-2 h-[40px]">{course.title}</h3>

                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span>{course.completedCount}/{course.totalLectures} lectures</span>
                          <span>{course.percent}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-black dark:bg-white rounded-full transition-all" style={{ width: `${course.percent}%` }} />
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => navigate(`/viewlecture/${course._id}`)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-black dark:bg-white dark:text-black text-white py-2 rounded-lg text-xs font-medium hover:opacity-85"
                        >
                          <FaPlayCircle /> {course.lastWatchedLecture ? "Continue" : "Start"}
                        </button>
                        {course.isCompleted && (
                          <button
                            onClick={() => navigate(`/certificate/${course._id}`)}
                            className="flex items-center justify-center gap-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
                            title="Download Certificate"
                          >
                            <FaCertificate />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Quiz Attempts */}
          <div className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Recent Quiz Attempts</h2>
            {recentAttempts.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No quiz attempts yet.</p>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 overflow-hidden">
                {recentAttempts.map(a => (
                  <div key={a._id} className="flex items-center justify-between px-5 py-3 border-b last:border-0 border-gray-100 dark:border-gray-800">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">{a.quiz?.title}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{a.course?.title}</p>
                    </div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 shrink-0">{a.score}/{a.totalQuestions}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Recommended for you</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {recommendations.map(course => (
                  <div
                    key={course._id}
                    onClick={() => navigate(`/viewcourse/${course._id}`)}
                    className="min-w-[200px] max-w-[200px] bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <img src={course.thumbnail} alt={course.title} className="w-full h-[100px] object-cover" />
                    <div className="p-3">
                      <h3 className="font-medium text-xs text-gray-800 dark:text-gray-100 line-clamp-2">{course.title}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default StudentDashboard
