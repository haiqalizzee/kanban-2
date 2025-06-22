"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface ChatBubble {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatBotContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  isMinimized: boolean
  setIsMinimized: (minimized: boolean) => void
  messages: ChatBubble[]
  setMessages: (messages: ChatBubble[] | ((prev: ChatBubble[]) => ChatBubble[])) => void
  isInitialized: boolean
  setIsInitialized: (initialized: boolean) => void
}

const ChatBotContext = createContext<ChatBotContextType | undefined>(undefined)

export function ChatBotProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatBubble[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Persist state to localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('chatbot-state')
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        setIsOpen(parsed.isOpen || false)
        setIsMinimized(parsed.isMinimized || false)
        setIsInitialized(parsed.isInitialized || false)
        if (parsed.messages) {
          // Convert timestamp strings back to Date objects
          const messagesWithDates = parsed.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
          setMessages(messagesWithDates)
        }
      } catch (error) {
        console.error('Failed to parse saved chat state:', error)
      }
    }
  }, [])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      isOpen,
      isMinimized,
      messages,
      isInitialized
    }
    localStorage.setItem('chatbot-state', JSON.stringify(stateToSave))
  }, [isOpen, isMinimized, messages, isInitialized])

  return (
    <ChatBotContext.Provider
      value={{
        isOpen,
        setIsOpen,
        isMinimized,
        setIsMinimized,
        messages,
        setMessages,
        isInitialized,
        setIsInitialized
      }}
    >
      {children}
    </ChatBotContext.Provider>
  )
}

export function useChatBot() {
  const context = useContext(ChatBotContext)
  if (context === undefined) {
    throw new Error('useChatBot must be used within a ChatBotProvider')
  }
  return context
} 