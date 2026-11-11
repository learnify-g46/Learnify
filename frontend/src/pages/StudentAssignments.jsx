import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate, useParams } from 'react-router-dom'
import { serverUrl } from '../App'
import { FaArrowLeftLong } from "react-icons/fa6"
import { FaCloudUploadAlt, FaClock } from "react-icons/fa"

const STATUS_STYLE = {
  not_started: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  submitted: "bg-amber-100 text-amber-700",
  under_review: "bg-purple-100 text-purple-700",
  evaluated: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700"
}
const STATUS_LABEL = {
  not_started: "Not Started", in_progress: "In Progress", submitted: "Submitted",
  under_review: "Under Review", evaluated: "Evaluated", overdue: "Overdue"
}

function StudentAssignments() {
  const { courseId } = useParams()
  const navigate = useNavigate()

  const [assignments, setAssignments] = useState([])
  const [active, setActive] = useState(null) // full assignment + submission, when opened
  const [submitting, setSubmitting] = useState(false)

  // MCQ state
  const [mcqAnswers, setMcqAnswers] = useState({}) // questionId -> optionIndex
  // Typed state
  const [typedAnswers, setTypedAnswers] = useState({}) // questionId -> text
  const [pasteAttempts, setPasteAttempts] = useState(0)
  // PDF state
  const [file, setFile] = useState(null)

  const fetchList = async () => {
    try {
      const res = await axios.get(serverUrl + `/api/assignment/course/${courseId}`, { withCredentials: true })
      setAssignments(res.data)
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load assignments")
    }
  }

  useEffect(() => { fetchList() }, [courseId])

  const openAssignment = async (id) => {
    try {
      const res = await axios.get(serverUrl + `/api/assignment/${id}`, { withCredentials: true })
      setActive(res.data)
      setMcqAnswers({})
      setTypedAnswers({})
      setPasteAttempts(0)
      setFile(null)
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to open assignment")
    }
  }

  const handleSubmitMcq = async () => {
    const a = active.assignment
    const answers = a.mcqQuestions.map(q => ({ questionId: q._id, selectedOptionIndex: mcqAnswers[q._id] ?? null }))
    if (answers.some(x => x.selectedOptionIndex === null)) return toast.error("Please answer all questions")
    try {
      setSubmitting(true)
      await axios.post(serverUrl + `/api/assignment/submit/mcq/${a._id}`, { answers }, { withCredentials: true })
      toast.success("Assignment submitted!")
      setActive(null); fetchList()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit")
    } finally { setSubmitting(false) }
  }

  const handleSubmitTyped = async () => {
    const a = active.assignment
    const answers = a.typedQuestions.map(q => ({ questionId: q._id, answerText: typedAnswers[q._id] || "" }))
    if (answers.every(x => !x.answerText.trim())) return toast.error("Please answer at least one question")
    try {
      setSubmitting(true)
      await axios.post(serverUrl + `/api/assignment/submit/typed/${a._id}`, { answers, pasteAttempts }, { withCredentials: true })
      toast.success("Assignment submitted! AI is preparing a suggested score for your teacher to review.")
      setActive(null); fetchList()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit")
    } finally { setSubmitting(false) }
  }

  const handleSubmitPdf = async () => {
    if (!file) return toast.error("Choose a file first")
    const a = active.assignment
    try {
      setSubmitting(true)
      const formData = new FormData()
      formData.append("file", file)
      await axios.post(serverUrl + `/api/assignment/submit/pdf/${a._id}`, formData, { withCredentials: true })
      toast.success("File submitted! Your teacher will review it.")
      setActive(null); fetchList()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit")
    } finally { setSubmitting(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-[90px] px-4 md:px-10 pb-16">
      <FaArrowLeftLong className="w-[22px] h-[22px] cursor-pointer mb-4" onClick={() => active ? setActive(null) : navigate(-1)} />

      {!active && (
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Assignments</h1>
          {assignments.length === 0 ? (
            <p className="text-gray-500">No assignments available for this course yet.</p>
          ) : (
            <div className="space-y-3">
              {assignments.map(a => (
                <div key={a._id} className="bg-white rounded-lg shadow p-4 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-gray-800">{a.title}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><FaClock /> Due {new Date(a.dueDate).toLocaleString()}</p>
                    {a.mySubmission?.finalMarks !== null && a.mySubmission?.finalMarks !== undefined && (
                      <p className="text-xs text-green-600 mt-1">Score: {a.mySubmission.finalMarks} / {a.maxMarks} {a.mySubmission.teacherFeedback && `— ${a.mySubmission.teacherFeedback}`}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLE[a.myStatus]}`}>{STATUS_LABEL[a.myStatus]}</span>
                    {(a.myStatus === "not_started") && (
                      <button onClick={() => openAssignment(a._id)} className="bg-black text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800">
                        Start
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {active && (
        <div className="max-w-2xl">
          <h1 className="text-xl font-bold text-gray-900 mb-2">{active.assignment.title}</h1>
          {active.assignment.description && <p className="text-sm text-gray-600 mb-1">{active.assignment.description}</p>}
          {active.assignment.instructions && <p className="text-sm text-gray-500 mb-5">{active.assignment.instructions}</p>}

          {active.assignment.type === "mcq" && (
            <div className="space-y-5">
              {active.assignment.mcqQuestions.map((q, qIndex) => (
                <div key={q._id} className="bg-white rounded-lg shadow p-4 border border-gray-100">
                  <p className="font-medium text-gray-800 mb-3">{qIndex + 1}. {q.questionText}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {q.options.map((opt, optIndex) => (
                      <label key={optIndex} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-sm ${mcqAnswers[q._id] === optIndex ? "border-black bg-gray-100" : "border-gray-200"}`}>
                        <input type="radio" checked={mcqAnswers[q._id] === optIndex} onChange={() => setMcqAnswers(prev => ({ ...prev, [q._id]: optIndex }))} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={handleSubmitMcq} disabled={submitting} className="bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-60">
                {submitting ? "Submitting..." : "Submit Assignment"}
              </button>
            </div>
          )}

          {active.assignment.type === "typed" && (
            <div className="space-y-5">
              {active.assignment.isCodeAssignment && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  This is a code assignment — paste your code as text below. Code is not executed; it is reviewed by AI and your teacher.
                </p>
              )}
              {active.assignment.typedQuestions.map((q, qIndex) => (
                <div key={q._id} className="bg-white rounded-lg shadow p-4 border border-gray-100">
                  <p className="font-medium text-gray-800 mb-3">{qIndex + 1}. {q.questionText} <span className="text-xs text-gray-400">({q.maxMarks} marks)</span></p>
                  <textarea
                    value={typedAnswers[q._id] || ""}
                    onChange={e => setTypedAnswers(prev => ({ ...prev, [q._id]: e.target.value }))}
                    onPaste={() => setPasteAttempts(prev => prev + 1)}
                    rows={active.assignment.isCodeAssignment ? 8 : 5}
                    className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${active.assignment.isCodeAssignment ? "font-mono" : ""}`}
                    placeholder="Type your answer here..."
                  />
                </div>
              ))}
              <button onClick={handleSubmitTyped} disabled={submitting} className="bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-60">
                {submitting ? "Submitting..." : "Submit Assignment"}
              </button>
            </div>
          )}

          {active.assignment.type === "pdf" && (
            <div className="bg-white rounded-lg shadow p-6 border border-gray-100 text-center">
              <FaCloudUploadAlt className="text-4xl text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-3">
                Upload a PDF or image (jpg/png) — max {active.assignment.maxFileSizeMB}MB
              </p>
              <input type="file" accept=".pdf,image/*" onChange={e => setFile(e.target.files[0])}
                className="block mx-auto mb-4 text-sm" />
              <button onClick={handleSubmitPdf} disabled={submitting || !file} className="bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-60">
                {submitting ? "Uploading..." : "Submit File"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default StudentAssignments
