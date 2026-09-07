import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate, useParams } from 'react-router-dom'
import { serverUrl } from '../App'
import { FaArrowLeftLong } from "react-icons/fa6"
import { FaMedal } from "react-icons/fa"

const medalColor = (rank) => {
  if (rank === 1) return "text-yellow-500"
  if (rank === 2) return "text-gray-400"
  if (rank === 3) return "text-amber-600"
  return "text-gray-300"
}

function Leaderboard({ overall = false }) {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const [board, setBoard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const url = overall
          ? serverUrl + "/api/quiz/overall-leaderboard"
          : serverUrl + `/api/quiz/leaderboard/${quizId}`
        const result = await axios.get(url, { withCredentials: true })
        setBoard(overall
          ? result.data.map(e => ({ ...e, studentId: e.studentId, score: e.totalScore, totalQuestions: null }))
          : result.data
        )
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load leaderboard")
      } finally {
        setLoading(false)
      }
    }
    fetchBoard()
  }, [quizId, overall])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-[90px] px-4 md:px-10 pb-16 transition-colors">
      <FaArrowLeftLong className="w-[22px] h-[22px] cursor-pointer mb-4 text-gray-800 dark:text-gray-200" onClick={() => navigate(-1)} />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
        <FaMedal className="text-yellow-500" /> {overall ? "Platform Leaderboard" : "Leaderboard"}
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
        {overall ? "Top performers across all quizzes on Learnify" : "Top performers on this quiz"}
      </p>

      <div className="max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <p className="p-6 text-gray-500 dark:text-gray-400">Loading...</p>
        ) : board.length === 0 ? (
          <p className="p-6 text-gray-500 dark:text-gray-400">No attempts yet. Be the first!</p>
        ) : (
          board.map(entry => (
            <div key={entry.studentId} className={`flex items-center justify-between gap-2 px-3 sm:px-5 py-4 border-b last:border-0 border-gray-100 dark:border-gray-800
              ${entry.rank <= 3 ? "bg-yellow-50/40 dark:bg-yellow-900/10" : ""}`}>
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <span className={`text-xl font-bold w-8 shrink-0 text-center ${medalColor(entry.rank)}`}>
                  {entry.rank <= 3 ? <FaMedal /> : entry.rank}
                </span>
                <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-medium overflow-hidden shrink-0">
                  {entry.photoUrl ? <img src={entry.photoUrl} className="w-full h-full object-cover" alt="" /> : entry.name?.slice(0, 1).toUpperCase()}
                </div>
                <span className="font-medium text-gray-800 dark:text-gray-100 truncate">{entry.name}</span>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {overall ? `${entry.score} pts` : `${entry.score}/${entry.totalQuestions}`}
                </p>
                {!overall && <p className="text-xs text-gray-400 dark:text-gray-500">{entry.timeTakenSeconds}s</p>}
                {overall && <p className="text-xs text-gray-400 dark:text-gray-500">{entry.quizzesTaken} quizzes</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Leaderboard
