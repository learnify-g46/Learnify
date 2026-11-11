import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate, useParams } from 'react-router-dom'
import { serverUrl } from '../../App'
import { FaArrowLeftLong } from "react-icons/fa6"
import { FaMagic, FaTrash, FaPlus, FaClipboardList, FaChartBar } from "react-icons/fa"

const TYPE_LABEL = { mcq: "MCQ", typed: "Typed / Code Answer", pdf: "PDF / Handwritten Upload" }

function ManageAssignment() {
  const { courseId } = useParams()
  const navigate = useNavigate()

  const [existing, setExisting] = useState([])
  const [summary, setSummary] = useState(null)
  const [type, setType] = useState("mcq")

  // common fields
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [instructions, setInstructions] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [allowLateSubmission, setAllowLateSubmission] = useState(false)
  const [lateSubmissionPenaltyPercent, setLateSubmissionPenaltyPercent] = useState(0)
  const [resultReleaseMode, setResultReleaseMode] = useState("manual")

  // mcq
  const [mcqQuestions, setMcqQuestions] = useState([])
  const [topic, setTopic] = useState("")
  const [numberOfQuestions, setNumberOfQuestions] = useState(5)
  const [difficulty, setDifficulty] = useState("Intermediate")
  const [generating, setGenerating] = useState(false)

  // typed
  const [typedQuestions, setTypedQuestions] = useState([])
  const [isCodeAssignment, setIsCodeAssignment] = useState(false)

  // pdf
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(10)
  const [maxMarksPdf, setMaxMarksPdf] = useState(10)

  const [saving, setSaving] = useState(false)

  const fetchAll = async () => {
    try {
      const [listRes, summaryRes] = await Promise.all([
        axios.get(serverUrl + `/api/assignment/teacher/course/${courseId}`, { withCredentials: true }),
        axios.get(serverUrl + `/api/assignment/teacher/dashboard/${courseId}`, { withCredentials: true })
      ])
      setExisting(listRes.data)
      setSummary(summaryRes.data)
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load assignments")
    }
  }

  useEffect(() => { fetchAll() }, [courseId])

  const resetForm = () => {
    setTitle(""); setDescription(""); setInstructions(""); setDueDate("")
    setAllowLateSubmission(false); setLateSubmissionPenaltyPercent(0); setResultReleaseMode("manual")
    setMcqQuestions([]); setTopic("")
    setTypedQuestions([]); setIsCodeAssignment(false)
  }

  const handleGenerate = async () => {
    if (!topic.trim()) return toast.error("Enter a topic first")
    try {
      setGenerating(true)
      const result = await axios.post(serverUrl + `/api/assignment/generate-ai/${courseId}`, {
        type, topic, numberOfQuestions, difficulty
      }, { withCredentials: true })
      if (type === "mcq") setMcqQuestions(result.data.questions)
      if (type === "typed") setTypedQuestions(result.data.questions)
      setTitle(prev => prev || topic)
      toast.success("Questions generated! Review and publish below.")
    } catch (error) {
      toast.error(error.response?.data?.message || "AI generation failed")
    } finally {
      setGenerating(false)
    }
  }

  const updateMcq = (index, field, value) => {
    setMcqQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q))
  }
  const updateMcqOption = (qIndex, optIndex, value) => {
    setMcqQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q
      const newOptions = [...q.options]; newOptions[optIndex] = value
      return { ...q, options: newOptions }
    }))
  }
  const removeMcq = (index) => setMcqQuestions(prev => prev.filter((_, i) => i !== index))
  const addManualMcq = () => setMcqQuestions(prev => [...prev, {
    questionText: "", options: ["", "", "", ""], correctOptionIndex: 0, explanation: "", marks: 1
  }])

  const updateTyped = (index, field, value) => {
    setTypedQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q))
  }
  const removeTyped = (index) => setTypedQuestions(prev => prev.filter((_, i) => i !== index))
  const addManualTyped = () => setTypedQuestions(prev => [...prev, { questionText: "", markingCriteria: "", maxMarks: 10 }])

  const handlePublish = async (publish) => {
    if (!title.trim() || !dueDate) return toast.error("Title and due date are required")
    if (type === "mcq" && mcqQuestions.length === 0) return toast.error("Add at least one MCQ question")
    if (type === "typed" && typedQuestions.length === 0) return toast.error("Add at least one question")

    try {
      setSaving(true)
      const payload = {
        title, description, instructions, type,
        dueDate, allowLateSubmission, lateSubmissionPenaltyPercent: Number(lateSubmissionPenaltyPercent),
        resultReleaseMode,
        status: publish ? "published" : "draft"
      }
      if (type === "mcq") {
        payload.mcqQuestions = mcqQuestions
        payload.maxMarks = mcqQuestions.reduce((s, q) => s + (Number(q.marks) || 1), 0)
      }
      if (type === "typed") {
        payload.typedQuestions = typedQuestions
        payload.isCodeAssignment = isCodeAssignment
        payload.maxMarks = typedQuestions.reduce((s, q) => s + (Number(q.maxMarks) || 10), 0)
      }
      if (type === "pdf") {
        payload.allowedFileTypes = ["pdf", "jpg", "jpeg", "png"]
        payload.maxFileSizeMB = Number(maxFileSizeMB)
        payload.maxMarks = Number(maxMarksPdf)
      }

      await axios.post(serverUrl + `/api/assignment/create/${courseId}`, payload, { withCredentials: true })
      toast.success(publish ? "Assignment published!" : "Assignment saved as draft")
      resetForm()
      fetchAll()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save assignment")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this assignment? All its submissions will be deleted too.")) return
    try {
      await axios.delete(serverUrl + `/api/assignment/${id}`, { withCredentials: true })
      toast.success("Assignment deleted")
      setExisting(prev => prev.filter(a => a._id !== id))
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete assignment")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-[90px] px-4 md:px-10 pb-16">
      <FaArrowLeftLong className="w-[22px] h-[22px] cursor-pointer mb-4" onClick={() => navigate("/courses")} />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Assignments</h1>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-4xl">
          <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
            <p className="text-gray-500 text-xs">Total Assignments</p>
            <h2 className="text-xl font-bold">{summary.totalAssignments}</h2>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
            <p className="text-gray-500 text-xs">Submitted</p>
            <h2 className="text-xl font-bold">{summary.submittedCount}</h2>
          </div>
          <div className="bg-amber-50 rounded-xl shadow p-4 border border-amber-100">
            <p className="text-amber-700 text-xs">Pending Review</p>
            <h2 className="text-xl font-bold">{summary.pendingReviewCount}</h2>
          </div>
          <div className="bg-red-50 rounded-xl shadow p-4 border border-red-100">
            <p className="text-red-600 text-xs">Overdue (not submitted)</p>
            <h2 className="text-xl font-bold">{summary.overdueCount}</h2>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
            <p className="text-gray-500 text-xs">Avg Score</p>
            <h2 className="text-xl font-bold">{summary.averageScorePercent !== null ? `${summary.averageScorePercent}%` : "—"}</h2>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
            <p className="text-gray-500 text-xs">AI Evaluations Done</p>
            <h2 className="text-xl font-bold">{summary.aiEvaluationsCompleted}</h2>
          </div>
          <div className="bg-purple-50 rounded-xl shadow p-4 border border-purple-100 col-span-2">
            <p className="text-purple-700 text-xs">Potential Duplicate Submissions (advisory)</p>
            <h2 className="text-xl font-bold">{summary.potentialDuplicates}</h2>
          </div>
        </div>
      )}

      {/* Create new */}
      <div className="bg-white rounded-xl shadow p-6 border border-gray-100 mb-8 max-w-3xl">
        <h2 className="font-semibold text-gray-800 mb-4">Create New Assignment</h2>

        <div className="flex gap-2 mb-5">
          {["mcq", "typed", "pdf"].map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${type === t ? "bg-black text-white" : "bg-gray-100 text-gray-600"}`}>
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <input placeholder="Assignment title" value={title} onChange={e => setTitle(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2" />
          <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2" />
        </div>
        <textarea placeholder="Description (shown to students)" value={description} onChange={e => setDescription(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 w-full mb-3 text-sm" rows={2} />
        <textarea placeholder="Instructions (evaluation guidance / submission rules)" value={instructions} onChange={e => setInstructions(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 w-full mb-4 text-sm" rows={2} />

        <div className="flex flex-wrap items-center gap-4 mb-5 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={allowLateSubmission} onChange={e => setAllowLateSubmission(e.target.checked)} />
            Allow late submission
          </label>
          {allowLateSubmission && (
            <label className="flex items-center gap-2">
              Penalty %
              <input type="number" min={0} max={100} value={lateSubmissionPenaltyPercent}
                onChange={e => setLateSubmissionPenaltyPercent(e.target.value)}
                className="w-16 border border-gray-300 rounded px-2 py-1" />
            </label>
          )}
          <label className="flex items-center gap-2">
            Result release:
            <select value={resultReleaseMode} onChange={e => setResultReleaseMode(e.target.value)} className="border border-gray-300 rounded px-2 py-1">
              <option value="manual">Manual (I release when ready)</option>
              <option value="immediate">Immediate (as soon as evaluated)</option>
              <option value="after-due-date">After due date</option>
            </select>
          </label>
        </div>

        {/* MCQ builder */}
        {type === "mcq" && (
          <div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><FaMagic /> Generate with AI</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                <input placeholder="Topic" value={topic} onChange={e => setTopic(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
                <input type="number" min={1} max={20} value={numberOfQuestions} onChange={e => setNumberOfQuestions(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
                <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2">
                  <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleGenerate} disabled={generating} className="bg-black text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60">
                  {generating ? "Generating..." : "Generate with AI"}
                </button>
                <button onClick={addManualMcq} className="border border-gray-300 px-4 py-2 rounded-lg text-sm flex items-center gap-1"><FaPlus /> Add manually</button>
              </div>
            </div>

            {mcqQuestions.map((q, qIndex) => (
              <div key={qIndex} className="border border-gray-200 rounded-lg p-4 relative mb-3">
                <FaTrash className="absolute top-3 right-3 text-red-400 hover:text-red-600 cursor-pointer" onClick={() => removeMcq(qIndex)} />
                <input value={q.questionText} placeholder="Question text" onChange={e => updateMcq(qIndex, "questionText", e.target.value)}
                  className="w-full border-b border-gray-200 pb-2 mb-3 font-medium outline-none" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                  {q.options.map((opt, optIndex) => (
                    <label key={optIndex} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer ${q.correctOptionIndex === optIndex ? "border-green-500 bg-green-50" : "border-gray-200"}`}>
                      <input type="radio" checked={q.correctOptionIndex === optIndex} onChange={() => updateMcq(qIndex, "correctOptionIndex", optIndex)} />
                      <input value={opt} placeholder={`Option ${optIndex + 1}`} onChange={e => updateMcqOption(qIndex, optIndex, e.target.value)} className="flex-1 outline-none bg-transparent text-sm" />
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  Marks: <input type="number" min={1} value={q.marks} onChange={e => updateMcq(qIndex, "marks", Number(e.target.value))} className="w-14 border border-gray-300 rounded px-2 py-1" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Typed/Code builder */}
        {type === "typed" && (
          <div>
            <label className="flex items-center gap-2 text-sm mb-4">
              <input type="checkbox" checked={isCodeAssignment} onChange={e => setIsCodeAssignment(e.target.checked)} />
              This is a code assignment (typed code, AI-suggested marks + teacher review — code is not executed)
            </label>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><FaMagic /> Generate with AI</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                <input placeholder="Topic" value={topic} onChange={e => setTopic(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
                <input type="number" min={1} max={20} value={numberOfQuestions} onChange={e => setNumberOfQuestions(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
                <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2">
                  <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleGenerate} disabled={generating} className="bg-black text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60">
                  {generating ? "Generating..." : "Generate with AI"}
                </button>
                <button onClick={addManualTyped} className="border border-gray-300 px-4 py-2 rounded-lg text-sm flex items-center gap-1"><FaPlus /> Add manually</button>
              </div>
            </div>

            {typedQuestions.map((q, qIndex) => (
              <div key={qIndex} className="border border-gray-200 rounded-lg p-4 relative mb-3">
                <FaTrash className="absolute top-3 right-3 text-red-400 hover:text-red-600 cursor-pointer" onClick={() => removeTyped(qIndex)} />
                <textarea value={q.questionText} placeholder="Question text" onChange={e => updateTyped(qIndex, "questionText", e.target.value)}
                  className="w-full border-b border-gray-200 pb-2 mb-3 font-medium outline-none" rows={2} />
                <textarea value={q.markingCriteria} placeholder="Marking criteria (used by AI evaluator + teacher)" onChange={e => updateTyped(qIndex, "markingCriteria", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-2 text-sm" rows={2} />
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  Max marks: <input type="number" min={1} value={q.maxMarks} onChange={e => updateTyped(qIndex, "maxMarks", Number(e.target.value))} className="w-16 border border-gray-300 rounded px-2 py-1" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PDF builder */}
        {type === "pdf" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
            <label className="text-sm flex items-center gap-2">
              Max file size (MB)
              <input type="number" min={1} value={maxFileSizeMB} onChange={e => setMaxFileSizeMB(e.target.value)} className="w-20 border border-gray-300 rounded px-2 py-1" />
            </label>
            <label className="text-sm flex items-center gap-2">
              Max marks
              <input type="number" min={1} value={maxMarksPdf} onChange={e => setMaxMarksPdf(e.target.value)} className="w-20 border border-gray-300 rounded px-2 py-1" />
            </label>
            <p className="md:col-span-2 text-xs text-gray-500">
              Students upload a PDF or image (photo of handwritten work). Text-based/typed PDFs are text-extracted automatically;
              scanned/handwritten PDFs don't have an automatic OCR path yet and are flagged "needs review" for you to open and grade directly —
              image uploads (jpg/png) do get full OCR. Files are checked for exact and near-duplicate submissions (advisory flag only).
            </p>
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={() => handlePublish(true)} disabled={saving} className="bg-black text-white px-5 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-60">
            {saving ? "Saving..." : "Publish Assignment"}
          </button>
          <button onClick={() => handlePublish(false)} disabled={saving} className="border border-gray-300 px-5 py-2.5 rounded-lg hover:bg-gray-50 disabled:opacity-60">
            Save as Draft
          </button>
        </div>
      </div>

      {/* Existing */}
      <div className="max-w-3xl">
        <h2 className="font-semibold text-gray-800 mb-4">Existing Assignments</h2>
        {existing.length === 0 ? (
          <p className="text-gray-500 text-sm">No assignments yet for this course.</p>
        ) : (
          <div className="space-y-3">
            {existing.map(a => (
              <div key={a._id} className="bg-white rounded-lg shadow p-4 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium text-gray-800">{a.title} <span className="text-xs text-gray-400">({TYPE_LABEL[a.type]})</span></h3>
                  <p className="text-xs text-gray-500">
                    Due {new Date(a.dueDate).toLocaleString()} · {a.status === "published" ? "Published" : a.status === "closed" ? "Closed" : "Draft"}
                    {a.resultsReleased && " · Results released"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => navigate(`/review-assignment/${a._id}`)} className="text-sm flex items-center gap-1 text-gray-600 hover:text-black" title="Review submissions">
                    <FaClipboardList /> Review
                  </button>
                  <FaTrash className="text-red-400 hover:text-red-600 cursor-pointer" onClick={() => handleDelete(a._id)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ManageAssignment
