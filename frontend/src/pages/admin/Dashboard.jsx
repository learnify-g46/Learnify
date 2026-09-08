import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from "react-redux";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import img from "../../assets/empty.jpg"; // fallback photo
import { useNavigate } from 'react-router-dom';
import { FaArrowLeftLong } from "react-icons/fa6";
import { FaBook, FaUsers, FaLayerGroup } from "react-icons/fa";
import axios from 'axios';
import { serverUrl } from '../../App';
import { setCreatorCourseData } from '../../redux/courseSlice';

function Dashboard() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { userData } = useSelector((state) => state.user);
  const { creatorCourseData } = useSelector((state) => state.course);
  const [loading, setLoading] = useState(true)

  // Fetch this educator's own courses right here — don't rely on the /courses
  // page having already run and populated Redux, otherwise a teacher landing
  // directly on /dashboard sees an empty dashboard even though they have
  // courses and lectures.
  useEffect(() => {
    const fetchCreatorCourses = async () => {
      try {
        setLoading(true)
        const result = await axios.get(serverUrl + "/api/course/getcreatorcourses", { withCredentials: true })
        dispatch(setCreatorCourseData(result.data))
      } catch (error) {
        console.log(error)
      } finally {
        setLoading(false)
      }
    }
    fetchCreatorCourses()
  }, [])

  const courses = creatorCourseData || []

  const courseProgressData = courses.map(course => ({
    name: course.title?.slice(0, 10) + "...",
    lectures: course.lectures?.length || 0
  }));

  const enrollData = courses.map(course => ({
    name: course.title?.slice(0, 10) + "...",
    enrolled: course.enrolledStudents?.length || 0
  }));

  const totalEarnings = courses.reduce((sum, course) => {
    const studentCount = course.enrolledStudents?.length || 0;
    const courseRevenue = course.price ? course.price * studentCount : 0;
    return sum + courseRevenue;
  }, 0);

  const totalLectures = courses.reduce((sum, course) => sum + (course.lectures?.length || 0), 0)
  const totalEnrolled = courses.reduce((sum, course) => sum + (course.enrolledStudents?.length || 0), 0)

  return (
    <div className="flex min-h-screen bg-gray-100">
      <FaArrowLeftLong className=' w-[22px] absolute top-[10%]
      left-[10%] h-[22px] cursor-pointer' onClick={() => navigate("/")} />
      <div className="w-full px-6 py-10   bg-gray-50 space-y-10">
        {/* Welcome Section */}
        <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-md p-6 flex flex-col md:flex-row items-center gap-6">
          <img
            src={userData?.photoUrl || img}
            alt="Educator"
            className="w-28 h-28 rounded-full object-cover border-4 border-black shadow-md"
          />
          <div className="text-center md:text-left space-y-1">
            <h1 className="text-2xl font-bold text-gray-800">
              Welcome, {userData?.name || "Educator"} 👋
            </h1>
            <h1 className='text-xl font-semibold text-gray-800'>Total Earning : <span className='font-light text-gray-900'>₹{totalEarnings.toLocaleString()}</span>  </h1>
            <p className="text-gray-600 text-sm">
              {userData?.description || "Start creating amazing courses for your students!"}
            </p>
            <h1 className='px-[10px] text-center  py-[10px] border-2  bg-black border-black text-white  rounded-[10px] text-[15px] font-light flex items-center justify-center gap-2 cursor-pointer' onClick={() => navigate("/courses")}>Create Courses</h1>
          </div>
        </div>

        {/* Quick stats */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-lg shadow-md p-5 flex items-center gap-4">
            <FaLayerGroup className="text-3xl text-indigo-600" />
            <div>
              <p className="text-2xl font-bold text-gray-800">{courses.length}</p>
              <p className="text-sm text-gray-500">Total Courses</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-5 flex items-center gap-4">
            <FaBook className="text-3xl text-green-600" />
            <div>
              <p className="text-2xl font-bold text-gray-800">{totalLectures}</p>
              <p className="text-sm text-gray-500">Total Lectures Created</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-5 flex items-center gap-4">
            <FaUsers className="text-3xl text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-gray-800">{totalEnrolled}</p>
              <p className="text-sm text-gray-500">Total Enrolled Students</p>
            </div>
          </div>
        </div>

        {/* All Courses — name, lecture count, published state, quick link */}
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">My Courses ({courses.length})</h2>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading your courses...</p>
          ) : courses.length === 0 ? (
            <p className="text-gray-500 text-sm">You haven't created any courses yet. Click "Create Courses" above to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="py-2 pr-4">Course</th>
                    <th className="py-2 pr-4">Lectures</th>
                    <th className="py-2 pr-4">Enrolled</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map(course => (
                    <tr key={course._id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium text-gray-800">{course.title}</td>
                      <td className="py-2 pr-4">{course.lectures?.length || 0}</td>
                      <td className="py-2 pr-4">{course.enrolledStudents?.length || 0}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${course.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                          {course.isPublished ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <button className="text-indigo-600 hover:underline mr-3" onClick={() => navigate(`/createlecture/${course._id}`)}>+ Lectures</button>
                        <button className="text-gray-600 hover:underline" onClick={() => navigate(`/addcourses/${course._id}`)}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Graphs Section */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Course Progress Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Course Progress (Lectures)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={courseProgressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="lectures" fill="black" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Enrolled Students Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Student Enrollment</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={enrollData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="enrolled" fill="black" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
