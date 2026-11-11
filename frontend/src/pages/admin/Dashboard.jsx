import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from "react-redux";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, ComposedChart, Line } from "recharts";
import img from "../../assets/empty.jpg"; // fallback photo
import { useNavigate } from 'react-router-dom';
import { FaArrowLeftLong } from "react-icons/fa6";
import { FaBook, FaUsers, FaLayerGroup, FaRupeeSign, FaGraduationCap, FaChartLine, FaSearch } from "react-icons/fa";
import axios from 'axios';
import { serverUrl } from '../../App';
import { setCreatorCourseData } from '../../redux/courseSlice';

function Dashboard() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { userData } = useSelector((state) => state.user);
  const { creatorCourseData } = useSelector((state) => state.course);
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState(null)
  const [analyticsError, setAnalyticsError] = useState(false)
  const [rangeDays, setRangeDays] = useState(30)
  const [studentCourseId, setStudentCourseId] = useState("all")
  const [studentSearch, setStudentSearch] = useState("")

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

  // Real numbers from the server: student completion, enrollments over time, revenue, quiz/assignment results
  useEffect(() => {
    let cancelled = false
    const fetchAnalytics = async () => {
      try {
        setAnalyticsError(false)
        const result = await axios.get(serverUrl + `/api/course/creator-analytics?days=${rangeDays}`, { withCredentials: true })
        if (!cancelled) setAnalytics(result.data)
      } catch (error) {
        console.log(error)
        if (!cancelled) setAnalyticsError(true)
      }
    }
    fetchAnalytics()
    return () => { cancelled = true }
  }, [rangeDays])

  const courses = creatorCourseData || []

  const shortName = (title = "") => title.length > 18 ? title.slice(0, 17) + "…" : title
  const totals = analytics?.totals
  const perCourse = (analytics?.perCourse || []).map(c => ({ ...c, name: shortName(c.title) }))
  const trend = (analytics?.trend || []).map(d => ({ ...d, label: new Date(d.date + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }) }))
  const hasTrendData = trend.some(d => d.enrollments > 0)
  // Every enrolled student across the chosen course(s) - free and paid courses are treated identically
  const enrolledRows = perCourse
    .filter(c => studentCourseId === "all" || c.courseId === studentCourseId)
    .flatMap(c => (c.students || []).map(st => ({ ...st, courseId: c.courseId, courseTitle: c.title, isFree: c.isFree })))
    .filter(row => {
      const q = studentSearch.trim().toLowerCase()
      return !q || row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q)
    })

  const hasCompletionData = perCourse.some(c => c.enrolled > 0 && c.totalLectures > 0)
  const hasScoreData = perCourse.some(c => c.quizAvgPercent !== null || c.assignmentAvgPercent !== null)

  const totalEarnings = totals ? totals.revenue : courses.reduce((sum, course) => sum + (course.price ? course.price * (course.enrolledStudents?.length || 0) : 0), 0)
  const totalLectures = courses.reduce((sum, course) => sum + (course.lectures?.length || 0), 0)
  const totalEnrolled = totals ? totals.students : courses.reduce((sum, course) => sum + (course.enrolledStudents?.length || 0), 0)

  const EmptyState = ({ children }) => (
    <div className="h-[260px] flex items-center justify-center text-center text-sm text-gray-400 px-6">{children}</div>
  )

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
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-5 gap-5">
          <div className="bg-white rounded-lg shadow-md p-5 flex items-center gap-4">
            <FaLayerGroup className="text-3xl text-indigo-600 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-gray-800">{courses.length}</p>
              <p className="text-sm text-gray-500">Courses</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-5 flex items-center gap-4">
            <FaBook className="text-3xl text-green-600 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-gray-800">{totalLectures}</p>
              <p className="text-sm text-gray-500">Lectures</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-5 flex items-center gap-4">
            <FaUsers className="text-3xl text-purple-600 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-gray-800">{totalEnrolled}</p>
              <p className="text-sm text-gray-500">Students</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-5 flex items-center gap-4">
            <FaGraduationCap className="text-3xl text-amber-600 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-gray-800">{totals?.avgCompletion !== null && totals?.avgCompletion !== undefined ? `${totals.avgCompletion}%` : "—"}</p>
              <p className="text-sm text-gray-500">Avg. Completion</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-5 flex items-center gap-4 col-span-2 lg:col-span-1">
            <FaRupeeSign className="text-3xl text-emerald-600 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-gray-800">₹{Number(totalEarnings).toLocaleString("en-IN")}</p>
              <p className="text-sm text-gray-500">Est. Revenue</p>
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
                        <button className="text-gray-600 hover:underline mr-3" onClick={() => navigate(`/addcourses/${course._id}`)}>Edit</button>
                        <button className="text-amber-600 hover:underline" onClick={() => navigate(`/manageassignment/${course._id}`)}>Assignments</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>


        {/* Enrolled students - every course, free or paid, listed the same way */}
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><FaUsers /> Enrolled Students ({enrolledRows.length})</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search name or email"
                  className="border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-sm w-full sm:w-56" />
              </div>
              <select value={studentCourseId} onChange={e => setStudentCourseId(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                <option value="all">All courses</option>
                {perCourse.map(c => <option key={c.courseId} value={c.courseId}>{c.title} ({c.enrolled}) {c.isFree ? "· Free" : "· Paid"}</option>)}
              </select>
            </div>
          </div>
          {!analytics ? <EmptyState>Loading…</EmptyState> : enrolledRows.length === 0 ? (
            <EmptyState>{perCourse.some(c => c.enrolled > 0) ? "No students match your search." : "No students have enrolled yet. Free and paid enrollments will both appear here."}</EmptyState>
          ) : (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b text-gray-500">
                    <th className="py-2 pr-4">Student</th>
                    <th className="py-2 pr-4">Course</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Enrolled on</th>
                    <th className="py-2 pr-4">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolledRows.map(row => (
                    <tr key={row.courseId + row.studentId} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <img src={row.photoUrl || img} alt="" className="w-8 h-8 rounded-full object-cover" />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">{row.name}</p>
                            <p className="text-xs text-gray-400 truncate">{row.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-gray-700">{row.courseTitle}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${row.isFree ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {row.isFree ? "Free" : `Paid ₹${row.amountPaid}`}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-gray-600">{row.enrolledAt ? new Date(row.enrolledAt).toLocaleDateString() : "—"}</td>
                      <td className="py-2 pr-4 w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-black rounded-full" style={{ width: `${row.completionPercent}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-9 text-right">{row.completionPercent}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Analytics */}
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2"><FaChartLine /> Analytics</h2>
            <div className="flex gap-1 bg-white rounded-lg shadow-sm p-1">
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => setRangeDays(d)}
                  className={`px-3 py-1 text-xs rounded-md ${rangeDays === d ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                  {d} days
                </button>
              ))}
            </div>
          </div>

          {analyticsError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">Couldn't load analytics right now. Please refresh the page.</div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Enrollments + revenue over time */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-1">New Enrollments &amp; Revenue</h3>
              <p className="text-xs text-gray-400 mb-4">Last {rangeDays} days</p>
              {!analytics ? <EmptyState>Loading…</EmptyState> : !hasTrendData ? (
                <EmptyState>No new enrollments in this period yet. This chart fills in as students join your courses.</EmptyState>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                    <Tooltip formatter={(value, name) => name === "Revenue" ? [`₹${value}`, name] : [value, name]} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="enrollments" name="Enrollments" fill="#111827" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="#059669" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
              {analytics?.untrackedEnrollments > 0 && (
                <p className="text-xs text-gray-400 mt-3">{analytics.untrackedEnrollments} earlier enrollment(s) joined before dates were recorded, so they count in your totals but not in this trend.</p>
              )}
            </div>

            {/* Real student completion */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-1">Student Completion by Course</h3>
              <p className="text-xs text-gray-400 mb-4">Average % of lectures finished by enrolled students</p>
              {!analytics ? <EmptyState>Loading…</EmptyState> : !hasCompletionData ? (
                <EmptyState>Needs at least one lecture and one enrolled student.</EmptyState>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={perCourse} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => [`${value ?? 0}%`, "Avg. completion"]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.title || label}
                    />
                    <Bar dataKey="avgCompletion" name="Avg. completion" fill="#111827" radius={[0, 5, 5, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Enrolled vs completed */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-1">Enrolled vs Completed</h3>
              <p className="text-xs text-gray-400 mb-4">Students who joined vs students who finished every lecture</p>
              {!analytics ? <EmptyState>Loading…</EmptyState> : perCourse.length === 0 ? (
                <EmptyState>Create a course to see this chart.</EmptyState>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={perCourse}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(label, payload) => payload?.[0]?.payload?.title || label} />
                    <Legend />
                    <Bar dataKey="enrolled" name="Enrolled" fill="#111827" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="completedStudents" name="Completed" fill="#059669" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Quiz + assignment performance */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-1">Quiz &amp; Assignment Performance</h3>
              <p className="text-xs text-gray-400 mb-4">Average score (%) — best quiz attempt per student, graded assignments</p>
              {!analytics ? <EmptyState>Loading…</EmptyState> : !hasScoreData ? (
                <EmptyState>No quiz attempts or graded assignments yet.</EmptyState>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={perCourse}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => value === null || value === undefined ? ["—", ""] : `${value}%`}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.title || label} />
                    <Legend />
                    <Bar dataKey="quizAvgPercent" name="Quiz avg" fill="#6366f1" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="assignmentAvgPercent" name="Assignment avg" fill="#f59e0b" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
