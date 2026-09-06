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

function Leaderboard() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const [board, setBoard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const result = await axios.get(serverUrl + `/api/quiz/leaderboard/${quizId}`, { withCredentials: true })
        setBoard(result.data)
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load leaderboard")
      } finally {
        setLoading(false)
      }
    }
    fetchBoard()
  }, [quizId])

  return (
    <div className="min-h-screen bg-gray-50 pt-[90px] px-4 md:px-10 pb-16">
      <FaArrowLeftLong className="w-[22px] h-[22px] cursor-pointer mb-4" onClick={() => navigate(-1)} />
      <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
        <FaMedal className="text-yellow-500" /> Leaderboard
      </h1>
      <p className="text-gray-500 mb-6 text-sm">Top performers on this quiz</p>

      <div className="max-w-2xl bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        {loading ? (
          <p className="p-6 text-gray-500">Loading...</p>
        ) : board.length === 0 ? (
          <p className="p-6 text-gray-500">No attempts yet. Be the first!</p>
        ) : (
          board.map(entry => (
            <div key={entry.studentId} className={`flex items-center justify-between gap-2 px-3 sm:px-5 py-4 border-b last:border-0
              ${entry.rank <= 3 ? "bg-yellow-50/40" : ""}`}>
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <span className={`text-xl font-bold w-8 shrink-0 text-center ${medalColor(entry.rank)}`}>
                  {entry.rank <= 3 ? <FaMedal /> : entry.rank}
                </span>
                <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-medium overflow-hidden shrink-0">
                  {entry.photoUrl ? <img src={entry.photoUrl} className="w-full h-full object-cover" alt="" /> : entry.name?.slice(0, 1).toUpperCase()}
                </div>
                <span className="font-medium text-gray-800 truncate">{entry.name}</span>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-gray-900">{entry.score}/{entry.totalQuestions}</p>
                <p className="text-xs text-gray-400">{entry.timeTakenSeconds}s</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Leaderboard
