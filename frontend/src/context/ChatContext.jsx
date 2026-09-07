import React, { createContext, useContext, useState } from 'react'

const ChatContext = createContext(null)

export const ChatProvider = ({ children }) => {
  const [chatContext, setChatContext] = useState({ courseTitle: null, lectureTitle: null })
  return (
    <ChatContext.Provider value={{ chatContext, setChatContext }}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChatContext = () => useContext(ChatContext)
