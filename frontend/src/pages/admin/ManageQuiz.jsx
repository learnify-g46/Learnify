import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate, useParams } from 'react-router-dom'
import { serverUrl } from '../../App'
import { FaArrowLeftLong } from "react-icons/fa6"
import { FaMagic, FaTrash, FaPlus, FaTrophy } from "react-icons/fa"

function ManageQuiz() {
  const { courseId } = useParams()
  const navigate = useNavigate()

  const [existingQuizzes, setExistingQuizzes] = useState([])
  const [topic, setTopic] = useState("")
  const [numberOfQuestions, setNumberOfQuestions] = useState(5)
  const [difficulty, setDifficulty] = useState("Intermediate")
  const [title, setTitle] = useState("")
  const [questions, setQuestions] = useState([])
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchQuizzes = async () => {
    try {
      const result = await axios.get(serverUrl + `/api/quiz/teacher/course/${courseId}`, { withCredentials: true })
      setExistingQuizzes(result.data)
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load quizzes")
    }
  }

  useEffect(() => { fetchQuizzes() }, [courseId])

  const handleGenerate = async () => {
    if (!topic.trim()) return toast.error("Enter a topic first")
    try {
      setGenerating(true)
      const result = await axios.post(serverUrl + `/api/quiz/generate-ai/${courseId}`, {
        topic, numberOfQuestions, difficulty
      }, { withCredentials: true })
      setQuestions(result.data.questions)
      setTitle(topic)
      toast.success("Questions generated! Review and publish below.")
    } catch (error) {
      toast.error(error.response?.data?.message || "AI generation failed")
    } finally {
      setGenerating(false)
    }
  }

  const updateQuestion = (index, field, value) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q))
  }
  const updateOption = (qIndex, optIndex, value) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q
      const newOptions = [...q.options]
      newOptions[optIndex] = value
      return { ...q, options: newOptions }
    }))
  }
  const removeQuestion = (index) => setQuestions(prev => prev.filter((_, i) => i !== index))

  const handlePublish = async (publish) => {
    if (!title.trim() || questions.length === 0) return toast.error("Generate/add questions first")
    try {
      setSaving(true)
      await axios.post(serverUrl + `/api/quiz/create/${courseId}`, {
        title, questions, isPublished: publish
      }, { withCredentials: true })
      toast.success(publish ? "Quiz published!" : "Quiz saved as draft")
      setQuestions([])
      setTitle("")
      setTopic("")
      fetchQuizzes()
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save quiz")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm("Delete this quiz?")) return
    try {
      await axios.delete(serverUrl + `/api/quiz/${quizId}`, { withCredentials: true })
      toast.success("Quiz deleted")
      setExistingQuizzes(prev => prev.filter(q => q._id !== quizId))
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete quiz")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-[90px] px-4 md:px-10 pb-16">
      <FaArrowLeftLong className="w-[22px] h-[22px] cursor-pointer mb-4" onClick={() => navigate("/courses")} />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Quiz</h1>

      {/* AI Generator */}
      <div className="bg-white rounded-xl shadow p-6 border border-gray-100 mb-8 max-w-3xl">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><FaMagic /> Generate quiz with AI</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <input
            placeholder="Topic (e.g. React Hooks)"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 md:col-span-1"
          />
          <input
            type="number" min={1} max={20}
            value={numberOfQuestions}
            onChange={e => setNumberOfQuestions(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="No. of questions"
          />
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2">
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </div>
        <button onClick={handleGenerate} disabled={generating}
          className="bg-black text-white px-5 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-60 flex items-center gap-2">
          <FaMagic /> {generating ? "Generating..." : "Generate with AI"}
        </button>
      </div>

      {/* Editable questions */}
      {questions.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6 border border-gray-100 mb-8 max-w-3xl">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Quiz title"
            className="border border-gray-300 rounded-lg px-3 py-2 w-full mb-5 font-medium"
          />
          <div className="space-y-5">
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="border border-gray-200 rounded-lg p-4 relative">
                <FaTrash className="absolute top-3 right-3 text-red-400 hover:text-red-600 cursor-pointer" onClick={() => removeQuestion(qIndex)} />
                <input
                  value={q.questionText}
                  onChange={e => updateQuestion(qIndex, "questionText", e.target.value)}
                  className="w-full border-b border-gray-200 pb-2 mb-3 font-medium outline-none"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {q.options.map((opt, optIndex) => (
                    <label key={optIndex} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer
                      ${q.correctOptionIndex === optIndex ? "border-green-500 bg-green-50" : "border-gray-200"}`}>
                      <input
                        type="radio"
                        checked={q.correctOptionIndex === optIndex}
                        onChange={() => updateQuestion(qIndex, "correctOptionIndex", optIndex)}
                      />
                      <input
                        value={opt}
                        onChange={e => updateOption(qIndex, optIndex, e.target.value)}
                        className="flex-1 outline-none bg-transparent text-sm"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => handlePublish(true)} disabled={saving}
              className="bg-black text-white px-5 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-60">
              {saving ? "Saving..." : "Publish Quiz"}
            </button>
            <button onClick={() => handlePublish(false)} disabled={saving}
              className="border border-gray-300 px-5 py-2.5 rounded-lg hover:bg-gray-50 disabled:opacity-60">
              Save as Draft
            </button>
          </div>
        </div>
      )}

      {/* Existing quizzes */}
      <div className="max-w-3xl">
        <h2 className="font-semibold text-gray-800 mb-4">Existing Quizzes</h2>
        {existingQuizzes.length === 0 ? (
          <p className="text-gray-500 text-sm">No quizzes yet for this course.</p>
        ) : (
          <div className="space-y-3">
            {existingQuizzes.map(q => (
              <div key={q._id} className="bg-white rounded-lg shadow p-4 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium text-gray-800">{q.title}</h3>
                  <p className="text-xs text-gray-500">{q.questions.length} questions · {q.isPublished ? "Published" : "Draft"}</p>
                </div>
                <div className="flex items-center gap-4">
                  <FaTrophy className="text-gray-500 hover:text-black cursor-pointer" title="View leaderboard"
                    onClick={() => navigate(`/leaderboard/${q._id}`)} />
                  <FaTrash className="text-red-400 hover:text-red-600 cursor-pointer" onClick={() => handleDeleteQuiz(q._id)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ManageQuiz
