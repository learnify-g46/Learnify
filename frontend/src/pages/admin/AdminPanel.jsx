import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { serverUrl } from '../../App'
import { FaArrowLeftLong } from "react-icons/fa6"
import { FaUsers, FaBook, FaChartPie, FaTrash } from "react-icons/fa"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts"

const COLORS = ["#000000", "#4b5563", "#9ca3af", "#d1d5db", "#6b7280", "#111827"]

function AdminPanel() {
  const navigate = useNavigate()
  const [tab, setTab] = useState("reports")
  const [users, setUsers] = useState([])
  const [courses, setCourses] = useState([])
  const [reports, setReports] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [usersRes, coursesRes, reportsRes] = await Promise.all([
        axios.get(serverUrl + "/api/admin/users", { withCredentials: true }),
        axios.get(serverUrl + "/api/admin/courses", { withCredentials: true }),
        axios.get(serverUrl + "/api/admin/reports", { withCredentials: true }),
      ])
      setUsers(usersRes.data)
      setCourses(coursesRes.data)
      setReports(reportsRes.data)
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load admin data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Delete this user permanently?")) return
    try {
      await axios.delete(serverUrl + `/api/admin/users/${userId}`, { withCredentials: true })
      toast.success("User deleted")
      setUsers(prev => prev.filter(u => u._id !== userId))
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete user")
    }
  }

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm("Remove this course permanently?")) return
    try {
      await axios.delete(serverUrl + `/api/admin/courses/${courseId}`, { withCredentials: true })
      toast.success("Course removed")
      setCourses(prev => prev.filter(c => c._id !== courseId))
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete course")
    }
  }

  const categoryData = reports?.categoryBreakdown
    ? Object.entries(reports.categoryBreakdown).map(([name, value]) => ({ name, value }))
    : []

  const overviewData = reports ? [
    { name: "Students", count: reports.totalStudents },
    { name: "Teachers", count: reports.totalTeachers },
    { name: "Courses", count: reports.totalCourses },
    { name: "Published", count: reports.publishedCourses },
  ] : []

  return (
    <div className="min-h-screen bg-gray-50 pt-[90px] px-4 md:px-10 pb-16">
      <FaArrowLeftLong className="w-[22px] h-[22px] cursor-pointer mb-4" onClick={() => navigate("/")} />

      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Admin Panel</h1>
      <p className="text-gray-500 mb-6">Manage users, courses, and monitor platform activity.</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-white w-full sm:w-fit rounded-full p-1 shadow border border-gray-200 overflow-x-auto">
        <button onClick={() => setTab("reports")}
          className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${tab === "reports" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"}`}>
          <FaChartPie /> Reports
        </button>
        <button onClick={() => setTab("users")}
          className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${tab === "users" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"}`}>
          <FaUsers /> Users
        </button>
        <button onClick={() => setTab("courses")}
          className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${tab === "courses" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"}`}>
          <FaBook /> Courses
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading admin data...</p>
      ) : (
        <>
          {tab === "reports" && reports && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
                <p className="text-gray-500 text-sm">Total Students</p>
                <h2 className="text-3xl font-bold text-gray-900">{reports.totalStudents}</h2>
              </div>
              <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
                <p className="text-gray-500 text-sm">Total Teachers</p>
                <h2 className="text-3xl font-bold text-gray-900">{reports.totalTeachers}</h2>
              </div>
              <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
                <p className="text-gray-500 text-sm">Total Courses</p>
                <h2 className="text-3xl font-bold text-gray-900">{reports.totalCourses}</h2>
              </div>
              <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
                <p className="text-gray-500 text-sm">Total Revenue</p>
                <h2 className="text-3xl font-bold text-gray-900">₹{reports.totalRevenue.toLocaleString()}</h2>
              </div>

              <div className="bg-white rounded-xl shadow p-6 border border-gray-100 md:col-span-2 xl:col-span-2">
                <h3 className="font-semibold text-gray-800 mb-4">Platform Overview</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={overviewData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#111827" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow p-6 border border-gray-100 md:col-span-2 xl:col-span-2">
                <h3 className="font-semibold text-gray-800 mb-4">Courses by Category</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={90} label>
                      {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {tab === "users" && (
            <div className="bg-white rounded-xl shadow border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b bg-gray-50">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Enrolled</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium
                          ${u.role === "admin" ? "bg-yellow-100 text-yellow-700" : u.role === "educator" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.enrolledCourses?.length || 0}</td>
                      <td className="px-4 py-3">
                        {u.role !== "admin" &&
                          <button onClick={() => handleDeleteUser(u._id)} className="text-red-500 hover:text-red-700">
                            <FaTrash />
                          </button>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "courses" && (
            <div className="bg-white rounded-xl shadow border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b bg-gray-50">
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Creator</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Enrolled</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map(c => (
                    <tr key={c._id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{c.title}</td>
                      <td className="px-4 py-3 text-gray-600">{c.creator?.name || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{c.category}</td>
                      <td className="px-4 py-3 text-gray-600">{c.price ? `₹${c.price}` : "Free"}</td>
                      <td className="px-4 py-3 text-gray-600">{c.enrolledStudents?.length || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                          {c.isPublished ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteCourse(c._id)} className="text-red-500 hover:text-red-700">
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AdminPanel
