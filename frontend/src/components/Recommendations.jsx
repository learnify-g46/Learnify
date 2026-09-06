import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { serverUrl } from '../App'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FaStar } from "react-icons/fa"

function Recommendations() {
  const { userData } = useSelector(state => state.user)
  const [courses, setCourses] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const result = await axios.get(serverUrl + "/api/ai/recommendations", { withCredentials: true })
        setCourses(result.data)
      } catch (error) {
        console.log(error)
      }
    }
    if (userData) fetchRecs()
  }, [userData])

  if (!userData || courses.length === 0) return null

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Recommended for you</h2>
      <p className="text-gray-500 mb-6 text-sm">Based on what you're already learning</p>

      <div className="flex gap-5 overflow-x-auto pb-3">
        {courses.map(course => (
          <div
            key={course._id}
            onClick={() => navigate(`/viewcourse/${course._id}`)}
            className="min-w-[240px] max-w-[240px] bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden cursor-pointer
              hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <img src={course.thumbnail} alt={course.title} className="w-full h-[130px] object-cover" />
            <div className="p-3">
              <h3 className="font-semibold text-sm text-gray-800 line-clamp-2 h-[40px]">{course.title}</h3>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">{course.category}</span>
                <span className="font-semibold text-sm">
                  {course.price ? `₹${course.price}` : <span className="text-green-600">Free</span>}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Recommendations
