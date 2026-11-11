import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate, useParams } from 'react-router-dom'
import { serverUrl } from '../../App'
import { FaArrowLeftLong } from "react-icons/fa6"
import { FaExclamationTriangle, FaCheckCircle } from "react-icons/fa"

const STATUS_LABEL = {
  in_progress: "In Progress", submitted: "Submitted", under_review: "Under Review", evaluated: "Evaluated"
}

function ReviewAssignmentSubmissions() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()

  const [assignment, setAssignment] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [active, setActive] = useState(null)
  const [finalMarks, setFinalMarks] = useState("")
  const [teacherFeedback, setTeacherFeedback] = useState("")
  const [typedReview, setTypedReview] = useState({}) // { questionId: { marks, feedback } }
  const [saving, setSaving] = useState(false)

  const fetchAll = async () => {
    try {
      const [aRes, sRes] = await Promise.all([
        axios.get(serverUrl + `/api/assignment/teacher/${assignmentId}`, { withCredentials: true }),
        axios.get(serverUrl + `/api/assignment/teacher/submissions/${assignmentId}`, { withCredentials: true })
      ])
      setAssignment(aRes.data)
      setSubmissions(sRes.data)
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load submissions")
    }
  }

  useEffect(() => { fetchAll() }, [assignmentId])

  const openSubmission = (s) => {
    setActive(s)
    setFinalMarks(s.finalMarks ?? s.aiSuggestedMarks ?? "")
    setTeacherFeedback(s.teacherFeedback || "")
    if (s.type === "typed") {
      const initial = {}
      s.typedAnswers.forEach(a => {
        initial[a.questionId] = { marks: a.teacherMarks ?? a.aiSuggestedMarks ?? 0, feedback: a.teacherFeedback || a.aiFeedback || "" }
      })
      setTypedReview(initial)
    }
  }

  const handleSaveReview = async () => {
    try {
      setSaving(true)
      const payload = { teacherFeedback }
      if (active.type === "typed") {
        payload.typedAnswerReviews = Object.entries(typedReview).map(([questionId, v]) => ({
          questionId, teacherMarks: Number(v.marks), teacherFeedback: v.feedback
        }))
      } else {
        payload.finalMarks = Number(finalMarks)
      }
      await axios.put(serverUrl + `/api/assignment/review/${active._id}`, payload, { withCredentials: true })
      toast.success("Review saved")
      setActive(null)
      fetchAll()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save review")
    } finally {
      setSaving(false)
    }
  }

  const handleReleaseResults = async () => {
    try {
      await axios.put(serverUrl + `/api/assignment/release-results/${assignmentId}`, {}, { withCredentials: true })
      toast.success("Results released to students")
      fetchAll()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to release results")
    }
  }

  const questionById = (qid) => assignment?.typedQuestions?.find(q => q._id === qid)

  return (
    <div className="min-h-screen bg-gray-50 pt-[90px] px-4 md:px-10 pb-16">
      <FaArrowLeftLong className="w-[22px] h-[22px] cursor-pointer mb-4" onClick={() => navigate(-1)} />
      <div className="flex items-center justify-between mb-6 max-w-5xl">
        <h1 className="text-2xl font-bold text-gray-900">{assignment?.title || "Assignment"} — Submissions</h1>
        {assignment && assignment.resultReleaseMode === "manual" && !assignment.resultsReleased && (
          <button onClick={handleReleaseResults} className="bg-black text-white px-4 py-2 rounded-lg text-sm">
            Release Results to Students
          </button>
        )}
      </div>

      <div className="max-w-5xl bg-white rounded-xl shadow border border-gray-100 overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Submitted</th>
              <th className="py-3 px-4">AI Suggested</th>
              <th className="py-3 px-4">Final Marks</th>
              <th className="py-3 px-4">Duplicate Flag</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {submissions.map(s => (
              <tr key={s._id} className="border-b last:border-0">
                <td className="py-3 px-4">{s.student?.name}</td>
                <td className="py-3 px-4">{STATUS_LABEL[s.status]}</td>
                <td className="py-3 px-4">{s.submittedAt ? new Date(s.submittedAt).toLocaleString() : "—"} {s.isLate && <span className="text-red-500 text-xs ml-1">(late)</span>}</td>
                <td className="py-3 px-4">{s.aiSuggestedMarks ?? (s.aiEvaluationFailed ? "AI failed" : "—")}</td>
                <td className="py-3 px-4 font-medium">{s.finalMarks ?? "—"}</td>
                <td className="py-3 px-4">
                  {s.duplicateStatus !== "none" ? (
                    <span className="flex items-center gap-1 text-amber-600 text-xs"><FaExclamationTriangle /> {s.duplicateStatus.replace(/_/g, " ")}{s.similarityScore ? ` (${s.similarityScore}%)` : ""}</span>
                  ) : <span className="text-gray-400 text-xs">none</span>}
                </td>
                <td className="py-3 px-4">
                  <button onClick={() => openSubmission(s)} className="text-blue-600 hover:underline text-xs">Review</button>
                </td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-gray-400">No submissions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Review panel */}
      {active && (
        <div className="max-w-3xl bg-white rounded-xl shadow border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Reviewing: {active.student?.name}</h2>
            <button onClick={() => setActive(null)} className="text-gray-400 hover:text-black text-sm">Close</button>
          </div>

          {active.duplicateStatus !== "none" && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3 mb-4 flex items-start gap-2">
              <FaExclamationTriangle className="mt-0.5 shrink-0" />
              <span>Flagged as <b>{active.duplicateStatus.replace(/_/g, " ")}</b>{active.similarityScore ? ` (${active.similarityScore}% text similarity)` : ""}. This is advisory only — it has not affected this student's score. Please review both submissions before deciding anything.</span>
            </div>
          )}

          {active.type === "mcq" && (
            <p className="text-sm text-gray-600 mb-4">MCQ is auto-graded: {active.mcqScore} / {assignment?.maxMarks}. You can still adjust the final marks below if needed.</p>
          )}

          {active.type === "typed" && (
            <div className="space-y-4 mb-4">
              {active.typedAnswers.map(a => {
                const q = questionById(a.questionId)
                return (
                  <div key={a.questionId} className="border border-gray-200 rounded-lg p-4">
                    <p className="font-medium text-sm text-gray-800 mb-1">{q?.questionText}</p>
                    <p className="text-xs text-gray-500 mb-2">Max marks: {q?.maxMarks} {active.pasteAttempts > 0 && `· ${active.pasteAttempts} paste event(s) detected (best-effort indicator only)`}</p>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm whitespace-pre-wrap mb-2">{a.answerText || <span className="text-gray-400">(empty)</span>}</div>
                    <p className="text-xs text-gray-500 mb-2">AI suggested: {a.aiSuggestedMarks ?? "—"} — {a.aiFeedback || "no AI feedback"}</p>
                    <div className="flex items-center gap-3">
                      <label className="text-xs">Marks:
                        <input type="number" min={0} max={q?.maxMarks} value={typedReview[a.questionId]?.marks ?? ""}
                          onChange={e => setTypedReview(prev => ({ ...prev, [a.questionId]: { ...prev[a.questionId], marks: e.target.value } }))}
                          className="w-16 border border-gray-300 rounded px-2 py-1 ml-1" />
                      </label>
                      <input placeholder="Feedback" value={typedReview[a.questionId]?.feedback ?? ""}
                        onChange={e => setTypedReview(prev => ({ ...prev, [a.questionId]: { ...prev[a.questionId], feedback: e.target.value } }))}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {active.type === "pdf" && (
            <div className="mb-4">
              <a href={active.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm">Open submitted file ({active.fileName})</a>
              <p className="text-xs text-gray-500 mt-2">Extraction method: {active.ocrMethod === "text-layer" ? "PDF text layer" : active.ocrMethod === "ocr" ? "Image OCR" : "Not available — please open and review the file directly"}</p>
              {active.ocrText && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm whitespace-pre-wrap mt-2 max-h-60 overflow-y-auto">{active.ocrText}</div>
              )}
              <p className="text-xs text-gray-500 mt-2">AI suggested: {active.aiSuggestedMarks ?? (active.aiEvaluationFailed ? "AI evaluation failed" : "not available")} {active.aiFeedback && `— ${active.aiFeedback}`}</p>
            </div>
          )}

          {active.type !== "typed" && (
            <label className="block text-sm mb-3">
              Final marks (out of {assignment?.maxMarks})
              <input type="number" min={0} max={assignment?.maxMarks} value={finalMarks} onChange={e => setFinalMarks(e.target.value)}
                className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 ml-2" />
            </label>
          )}
          <label className="block text-sm mb-4">
            Overall feedback
            <textarea value={teacherFeedback} onChange={e => setTeacherFeedback(e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1" />
          </label>

          <button onClick={handleSaveReview} disabled={saving} className="bg-black text-white px-5 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-60 flex items-center gap-2">
            <FaCheckCircle /> {saving ? "Saving..." : "Save & Mark Evaluated"}
          </button>
        </div>
      )}
    </div>
  )
}

export default ReviewAssignmentSubmissions
