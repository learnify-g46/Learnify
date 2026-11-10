import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import { useNavigate } from 'react-router-dom'
import { serverUrl } from '../App'
import { useSelector } from 'react-redux'
import { useChatContext } from '../context/ChatContext'
import { BsChatDotsFill } from "react-icons/bs"
import { IoSend, IoClose } from "react-icons/io5"
import { FaRobot, FaRedo, FaExclamationCircle } from "react-icons/fa"

const MAX_CHARS = 1000

const WELCOME = "Hi! I'm Learnify Assistant. Ask me any doubt about your course, or ask me to suggest a course 😊"

// Students only ever see friendly, product-style messages - never API / provider details.
const MESSAGES = {
  offline: "You appear to be offline. Please check your connection and try again.",
  unreachable: "We couldn't reach our servers. Please try again in a moment.",
  session: "Your session has expired. Please log in again to continue chatting.",
  busy: "Learnify Assistant is experiencing high demand right now. Please try again in a few minutes.",
  timeout: "This is taking longer than expected. Please try again.",
  unavailable: "Learnify Assistant is temporarily unavailable. We're working on it and it will be back soon.",
  limit: "Please wait a moment before sending another message.",
  tooLong: "Your message is too long. Please shorten it and try again.",
  empty: "Please type your question first.",
  maintenance: "Learnify Assistant is under maintenance right now. Thank you for your patience. In the meantime, you can use the lecture notes and study materials."
}

// returns { text, retryable, service } - `service` marks failures on our side (as opposed to the
// student being offline / logged out / rate limited), only those count towards the maintenance notice
const describeError = (error, failures) => {
  if (!error?.response) {
    return { text: typeof navigator !== "undefined" && navigator.onLine === false ? MESSAGES.offline : MESSAGES.unreachable, retryable: true }
  }
  const { status, data } = error.response
  const code = data?.code
  const serverText = String(data?.message || "")

  // Login problems come from the auth middleware (no code field)
  if (!code && (status === 401 || status === 403 || /token|auth/i.test(serverText))) {
    return { text: MESSAGES.session, retryable: false }
  }
  if (code === "RATE_LIMITED" || status === 429) return { text: MESSAGES.limit, retryable: true }
  if (code === "MESSAGE_TOO_LONG") return { text: MESSAGES.tooLong, retryable: false }
  if (code === "EMPTY_MESSAGE") return { text: MESSAGES.empty, retryable: false }
  // several service failures in a row -> stop inviting endless retries
  if (failures + 1 >= 3) return { text: MESSAGES.maintenance, retryable: false, service: true }
  if (code === "ASSISTANT_TIMEOUT" || status === 504) return { text: MESSAGES.timeout, retryable: true, service: true }
  if (code === "ASSISTANT_UNAVAILABLE" || status === 503) return { text: MESSAGES.busy, retryable: true, service: true }
  return { text: MESSAGES.unavailable, retryable: true, service: true }
}

const priceLabel = (price) => (price && Number(price) > 0 ? `₹${price}` : "Free")

function ChatBot() {
  const { userData } = useSelector(state => state.user)
  const { chatContext } = useChatContext() || { chatContext: {} }
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{ sender: "ai", text: WELCOME }])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [failures, setFailures] = useState(0)
  const [inputNote, setInputNote] = useState("")
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, open, loading])

  if (!userData) return null // only logged-in users get the assistant

  const send = async (rawText, { isRetry = false } = {}) => {
    const text = (rawText || "").trim()
    if (loading) return
    if (!text) { setInputNote(MESSAGES.empty); return }
    if (text.length > MAX_CHARS) { setInputNote(MESSAGES.tooLong); return }
    setInputNote("")

    // a retry replaces the old error bubble instead of repeating the student's message
    setMessages(prev => {
      const base = isRetry ? prev.filter(m => m.kind !== "error") : prev
      return isRetry ? base : [...base, { sender: "user", text }]
    })
    if (!isRetry) setInput("")
    setLoading(true)
    try {
      const result = await axios.post(serverUrl + "/api/ai/chat", {
        message: text,
        courseTitle: chatContext?.courseTitle,
        lectureTitle: chatContext?.lectureTitle
      }, { withCredentials: true })
      setFailures(0)
      setMessages(prev => [...prev, { sender: "ai", text: result.data.reply, courses: result.data.courses || [] }])
    } catch (error) {
      const { text: errText, retryable, service } = describeError(error, failures)
      if (service) setFailures(f => f + 1)
      setMessages(prev => [...prev, { sender: "ai", kind: "error", text: errText, retryText: retryable ? text : null }])
    } finally {
      setLoading(false)
    }
  }

  const suggestions = [
    "Suggest a course for me",
    chatContext?.lectureTitle ? "Explain this lecture in simple words" : "Help me with a doubt"
  ]
  const showSuggestions = messages.length === 1 && !loading

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      {open && (
        <div className="w-[90vw] max-w-[380px] h-[480px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden mb-3 animate-[fadeIn_0.2s_ease-out]">
          {/* Header */}
          <div className="bg-black dark:bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaRobot />
              <div>
                <p className="font-medium text-sm leading-tight">Learnify Assistant</p>
                {chatContext?.courseTitle && (
                  <p className="text-[11px] text-gray-300 leading-tight truncate max-w-[200px]">{chatContext.courseTitle}</p>
                )}
              </div>
            </div>
            <IoClose className="cursor-pointer w-5 h-5 shrink-0" onClick={() => setOpen(false)} />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50 dark:bg-gray-950">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                {m.kind === "error" ? (
                  <div data-testid="chat-error" className="max-w-[90%] px-3 py-2 rounded-xl text-sm leading-snug bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                    <div className="flex items-start gap-2">
                      <FaExclamationCircle className="mt-0.5 shrink-0" />
                      <span>{m.text}</span>
                    </div>
                    {m.retryText && (
                      <button
                        onClick={() => send(m.retryText, { isRetry: true })}
                        disabled={loading}
                        className="mt-2 flex items-center gap-1.5 text-xs font-medium border border-amber-300 dark:border-amber-700 rounded-full px-3 py-1 hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-50"
                      >
                        <FaRedo className="text-[10px]" /> Try again
                      </button>
                    )}
                  </div>
                ) : (
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-snug
                    ${m.sender === "user"
                      ? "bg-black text-white rounded-br-sm"
                      : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-sm"}`}>
                    {m.sender === "ai" ? (
                      <>
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-1">
                          <ReactMarkdown>{m.text}</ReactMarkdown>
                        </div>
                        {m.courses?.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {m.courses.map(course => (
                              <button
                                key={course._id}
                                data-testid="chat-course-card"
                                onClick={() => { setOpen(false); navigate(`/viewcourse/${course._id}`) }}
                                className="w-full flex items-center gap-2 text-left border border-gray-200 dark:border-gray-600 rounded-xl p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                {course.thumbnail ? (
                                  <img src={course.thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold truncate">{course.title}</p>
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{course.category} · {course.level} · {priceLabel(course.price)}</p>
                                  <p className="text-[11px] text-blue-600 dark:text-blue-400">View course →</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      m.text
                    )}
                  </div>
                )}
              </div>
            ))}

            {showSuggestions && (
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestions.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="text-xs border border-gray-300 dark:border-gray-600 rounded-full px-3 py-1.5 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-2xl text-sm text-gray-400">Learnify Assistant is thinking...</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            {inputNote && <p className="px-3 pt-2 text-xs text-amber-700 dark:text-amber-400">{inputNote}</p>}
            <div className="flex items-center gap-2 p-2">
              <input
                value={input}
                maxLength={MAX_CHARS}
                onChange={(e) => { setInput(e.target.value); if (inputNote) setInputNote("") }}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder="Ask a doubt or request a course..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-full outline-none focus:border-black dark:focus:border-white transition-colors"
              />
              <button onClick={() => send(input)} disabled={loading} aria-label="Send" className="bg-black dark:bg-white dark:text-black text-white p-2.5 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50">
                <IoSend />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-14 h-14 rounded-full bg-black dark:bg-white dark:text-black text-white flex items-center justify-center shadow-xl hover:scale-105 transition-transform ml-auto"
      >
        {open ? <IoClose className="w-6 h-6" /> : <BsChatDotsFill className="w-6 h-6" />}
      </button>
    </div>
  )
}

export default ChatBot
