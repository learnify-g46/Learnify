import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate, useParams } from 'react-router-dom'
import { serverUrl } from '../App'
import { FaArrowLeftLong } from "react-icons/fa6"
import { FaTrophy } from "react-icons/fa"

function TakeQuiz() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [quizzes, setQuizzes] = useState([])
  const [activeQuiz, setActiveQuiz] = useState(null)
  const [answers, setAnswers] = useState([])
  const [result, setResult] = useState(null)
  const [startTime, setStartTime] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const result = await axios.get(serverUrl + `/api/quiz/course/${courseId}`, { withCredentials: true })
        setQuizzes(result.data)
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load quizzes")
      }
    }
    fetchQuizzes()
  }, [courseId])

  const startQuiz = (quiz) => {
    setActiveQuiz(quiz)
    setAnswers(new Array(quiz.questions.length).fill(null))
    setResult(null)
    setStartTime(Date.now())
  }

  const selectAnswer = (qIndex, optIndex) => {
    setAnswers(prev => prev.map((a, i) => i === qIndex ? optIndex : a))
  }

  const handleSubmit = async () => {
    if (answers.some(a => a === null)) {
      return toast.error("Please answer all questions")
    }
    try {
      setSubmitting(true)
      const timeTakenSeconds = Math.round((Date.now() - startTime) / 1000)
      const res = await axios.post(serverUrl + `/api/quiz/submit/${activeQuiz._id}`, {
        answers, timeTakenSeconds
      }, { withCredentials: true })
      setResult(res.data)
      toast.success("Quiz submitted!")
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit quiz")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-[90px] px-4 md:px-10 pb-16">
      <FaArrowLeftLong className="w-[22px] h-[22px] cursor-pointer mb-4" onClick={() => activeQuiz ? setActiveQuiz(null) : navigate(-1)} />

      {!activeQuiz && (
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Course Quizzes</h1>
          {quizzes.length === 0 ? (
            <p className="text-gray-500">No quizzes available for this course yet.</p>
          ) : (
            <div className="space-y-3">
              {quizzes.map(q => (
                <div key={q._id} className="bg-white rounded-lg shadow p-4 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-gray-800">{q.title}</h3>
                    <p className="text-xs text-gray-500">{q.questions.length} questions</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => navigate(`/leaderboard/${q._id}`)} className="text-sm flex items-center gap-1 text-gray-600 hover:text-black">
                      <FaTrophy /> Leaderboard
                    </button>
                    <button onClick={() => startQuiz(q)} className="bg-black text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800">
                      Start Quiz
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeQuiz && !result && (
        <div className="max-w-2xl">
          <h1 className="text-xl font-bold text-gray-900 mb-6">{activeQuiz.title}</h1>
          <div className="space-y-5">
            {activeQuiz.questions.map((q, qIndex) => (
              <div key={qIndex} className="bg-white rounded-lg shadow p-4 border border-gray-100">
                <p className="font-medium text-gray-800 mb-3">{qIndex + 1}. {q.questionText}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {q.options.map((opt, optIndex) => (
                    <label key={optIndex} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-sm
                      ${answers[qIndex] === optIndex ? "border-black bg-gray-100" : "border-gray-200"}`}>
                      <input type="radio" checked={answers[qIndex] === optIndex} onChange={() => selectAnswer(qIndex, optIndex)} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleSubmit} disabled={submitting}
            className="mt-6 bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-60">
            {submitting ? "Submitting..." : "Submit Quiz"}
          </button>
        </div>
      )}

      {result && (
        <div className="max-w-md mx-auto bg-white rounded-xl shadow p-8 border border-gray-100 text-center">
          <FaTrophy className="text-4xl text-yellow-500 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {result.score} / {result.totalQuestions}
          </h2>
          <p className="text-gray-500 mb-6">Great effort! Keep learning 🎉</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate(`/leaderboard/${activeQuiz._id}`)} className="bg-black text-white px-5 py-2.5 rounded-lg hover:bg-gray-800">
              View Leaderboard
            </button>
            <button onClick={() => setActiveQuiz(null)} className="border border-gray-300 px-5 py-2.5 rounded-lg hover:bg-gray-50">
              Back to Quizzes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TakeQuiz
