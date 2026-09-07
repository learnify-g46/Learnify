import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { serverUrl } from '../App'
import { FaArrowLeftLong } from "react-icons/fa6"
import { FaCertificate, FaDownload } from "react-icons/fa"
import { toast } from 'react-toastify'

function Certificate() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { userData } = useSelector(state => state.user)
  const { courseData } = useSelector(state => state.course)
  const course = courseData?.find(c => c._id === courseId)

  const [eligible, setEligible] = useState(null)

  useEffect(() => {
    const checkEligibility = async () => {
      try {
        const result = await axios.get(serverUrl + `/api/progress/course/${courseId}`, { withCredentials: true })
        const completed = result.data?.completedLectures?.length || 0
        const total = course?.lectures?.length || 0
        setEligible(total > 0 && completed === total)
      } catch (error) {
        setEligible(false)
      }
    }
    if (course) checkEligibility()
  }, [course])

  const handleDownload = () => {
    window.print()
  }

  if (eligible === false) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-[90px] px-4 flex flex-col items-center justify-center text-center">
        <FaCertificate className="text-5xl text-gray-300 dark:text-gray-700 mb-4" />
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Certificate not available yet</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Complete all lectures in this course to unlock your certificate.</p>
        <button onClick={() => navigate(`/viewlecture/${courseId}`)} className="bg-black dark:bg-white dark:text-black text-white px-5 py-2.5 rounded-lg">
          Continue Course
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 pt-[90px] px-4 pb-16 flex flex-col items-center print:pt-0 print:bg-white">
      <div className="w-full max-w-3xl flex justify-between items-center mb-6 print:hidden">
        <FaArrowLeftLong className="w-[22px] h-[22px] cursor-pointer text-gray-800 dark:text-gray-200" onClick={() => navigate(-1)} />
        <button onClick={handleDownload} className="flex items-center gap-2 bg-black dark:bg-white dark:text-black text-white px-5 py-2.5 rounded-lg text-sm">
          <FaDownload /> Download / Print
        </button>
      </div>

      {/* Certificate */}
      <div className="w-full max-w-3xl aspect-[1.414/1] bg-white border-[10px] border-double border-yellow-600 rounded-lg shadow-2xl flex flex-col items-center justify-center text-center px-10 py-12 relative print:shadow-none print:border-yellow-600">
        <FaCertificate className="text-5xl text-yellow-600 mb-4" />
        <p className="uppercase tracking-[6px] text-gray-500 text-xs mb-2">Certificate of Completion</p>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: "serif" }}>{userData?.name}</h1>
        <p className="text-gray-600 text-sm md:text-base mb-1">has successfully completed the course</p>
        <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-6">{course?.title}</h2>
        <div className="flex items-center gap-10 mt-6">
          <div className="text-center">
            <p className="border-t border-gray-400 pt-1 text-xs text-gray-500 px-4">Learnify</p>
          </div>
          <div className="text-center">
            <p className="border-t border-gray-400 pt-1 text-xs text-gray-500 px-4">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 print:hidden">
        Tip: Use "Save as PDF" in the print dialog to download this certificate.
      </p>
    </div>
  )
}

export default Certificate
