import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { serverUrl } from '../App'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

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
    <section className="bg-slate-50 dark:bg-gray-900 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-1">Recommended for you</h2>
        <p className="text-slate-500 dark:text-gray-400 mb-8 text-sm">Based on what you're already learning</p>

        <div className="flex gap-5 overflow-x-auto pb-3">
          {courses.map(course => (
            <div
              key={course._id}
              onClick={() => navigate(`/viewcourse/${course._id}`)}
              className="min-w-[240px] max-w-[240px] bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden cursor-pointer
                hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <img src={course.thumbnail} alt={course.title} className="w-full h-[130px] object-cover" />
              <div className="p-3">
                <h3 className="font-semibold text-sm text-slate-800 dark:text-gray-100 line-clamp-2 h-[40px]">{course.title}</h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-950/40 rounded-full text-blue-600 dark:text-blue-400">{course.category}</span>
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">
                    {course.price ? `₹${course.price}` : <span className="text-green-600">Free</span>}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Recommendations
