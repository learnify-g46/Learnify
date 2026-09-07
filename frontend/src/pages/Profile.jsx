import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FaArrowLeftLong } from "react-icons/fa6";
import { FaTrophy, FaMedal } from "react-icons/fa";
import axios from 'axios'
import { serverUrl } from '../App'

function Profile() {
  let {userData} = useSelector(state=>state.user)
  let navigate = useNavigate()
  const [quizStats, setQuizStats] = useState(null)

  useEffect(() => {
    const fetchStats = async () => {
      if (userData?.role !== "student") return
      try {
        const result = await axios.get(serverUrl + "/api/quiz/my-stats", { withCredentials: true })
        setQuizStats(result.data)
      } catch (error) {
        console.log(error)
      }
    }
    fetchStats()
  }, [userData])

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 px-4 py-10 pt-[100px] flex items-center justify-center transition-colors">
      
      <div className="bg-white dark:bg-gray-900 shadow-lg rounded-2xl p-8 max-w-xl w-full relative text-gray-800 dark:text-gray-100 transition-colors">
        <FaArrowLeftLong  className='absolute top-[8%] left-[5%] w-[22px] h-[22px] cursor-pointer text-gray-800 dark:text-gray-200' onClick={()=>navigate("/")}/>
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center">
          {userData.photoUrl ? <img
            src={userData?.photoUrl}
            alt=""
            className="w-24 h-24 rounded-full object-cover border-4 border-[black]"
          /> : <div className='w-24 h-24 rounded-full text-white flex items-center justify-center text-[30px] border-2 bg-black  border-white cursor-pointer'>
         {userData?.name.slice(0,1).toUpperCase()}
          </div>}
          <h2 className="text-2xl font-bold mt-4 text-gray-800">{userData.name}</h2>
          <p className="text-sm text-gray-500">{userData.role}</p>
        </div>

        {/* Profile Info */}
        <div className="mt-6 space-y-4">
          <div className="text-sm">
            <span className="font-semibold text-gray-700">Email: </span>
            <span>{userData.email}</span>
          </div>

          <div className="text-sm">
            <span className="font-semibold text-gray-700">Bio: </span>
            <span>{userData.description}</span>
          </div>

          

          <div className="text-sm">
            <span className="font-semibold text-gray-700">Enrolled Courses: </span>
            <span>{userData.enrolledCourses.length}</span>
          </div>
        </div>

        {/* Quiz Stats - Motivation Cards */}
        {quizStats && quizStats.totalQuizzesTaken > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
              <FaTrophy className="text-yellow-500 text-xl mx-auto mb-1" />
              <p className="text-xs text-gray-600">Best Rank</p>
              <p className="font-bold text-gray-900">
                {quizStats.bestRank ? `#${quizStats.bestRank.rank}` : "—"}
              </p>
              {quizStats.bestRank && <p className="text-[11px] text-gray-500 truncate">{quizStats.bestRank.quizTitle}</p>}
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
              <FaMedal className="text-gray-500 text-xl mx-auto mb-1" />
              <p className="text-xs text-gray-600">Overall Rank</p>
              <p className="font-bold text-gray-900">
                {quizStats.overallRank ? `#${quizStats.overallRank}` : "—"}
              </p>
              <p className="text-[11px] text-gray-500">of {quizStats.totalStudentsRanked} students</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-center gap-4">
          <button className="px-5 py-2 rounded bg-[black] text-white active:bg-[#4b4b4b] cursor-pointer transition" onClick={()=>navigate("/editprofile")}>
            Edit Profile
          </button>
          
        </div>
      </div>
    </div>
  )
}

export default Profile
