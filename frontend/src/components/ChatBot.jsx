import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { serverUrl } from '../App'
import { useSelector } from 'react-redux'
import { BsChatDotsFill } from "react-icons/bs"
import { IoSend, IoClose } from "react-icons/io5"
import { FaRobot } from "react-icons/fa"

function ChatBot({ courseTitle, lectureTitle }) {
  const { userData } = useSelector(state => state.user)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { sender: "ai", text: "Hi! I'm your learning assistant. Ask me any doubt about your course 😊" }
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, open])

  if (!userData) return null // only logged-in users get the assistant

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setMessages(prev => [...prev, { sender: "user", text: userMsg }])
    setInput("")
    setLoading(true)
    try {
      const result = await axios.post(serverUrl + "/api/ai/chat", {
        message: userMsg,
        courseTitle,
        lectureTitle
      }, { withCredentials: true })
      setMessages(prev => [...prev, { sender: "ai", text: result.data.reply }])
    } catch (error) {
      setMessages(prev => [...prev, { sender: "ai", text: "Sorry, I couldn't process that right now. Please try again." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      {open && (
        <div className="w-[90vw] max-w-[360px] h-[440px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden mb-3 animate-[fadeIn_0.2s_ease-out]">
          {/* Header */}
          <div className="bg-black text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaRobot />
              <span className="font-medium text-sm">Doubt Assistant</span>
            </div>
            <IoClose className="cursor-pointer w-5 h-5" onClick={() => setOpen(false)} />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-snug
                  ${m.sender === "user" ? "bg-black text-white rounded-br-sm" : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 px-3 py-2 rounded-2xl text-sm text-gray-400">Typing...</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 p-2 border-t border-gray-200 bg-white">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your doubt..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-full outline-none focus:border-black transition-colors"
            />
            <button onClick={handleSend} className="bg-black text-white p-2.5 rounded-full hover:bg-gray-800 transition-colors">
              <IoSend />
            </button>
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center shadow-xl hover:scale-105 transition-transform ml-auto"
      >
        {open ? <IoClose className="w-6 h-6" /> : <BsChatDotsFill className="w-6 h-6" />}
      </button>
    </div>
  )
}

export default ChatBot
