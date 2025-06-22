"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageCircle, Send, Bot, User, X, Minus } from 'lucide-react'
import { chatbotService, type ChatMessage } from '@/services/chatbot'
import { useToast } from '@/hooks/use-toast'
import { useChatBot, type ChatBubble } from '@/contexts/ChatBotContext'

interface ChatBotProps {
  boards: any[]
  user: any
}

export function ChatBot({ boards = [], user }: ChatBotProps) {
  const {
    isOpen,
    setIsOpen,
    isMinimized,
    setIsMinimized,
    messages,
    setMessages,
    isInitialized,
    setIsInitialized
  } = useChatBot()
  
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [messages])

  // Welcome message when chat opens for the first time
  useEffect(() => {
    if (isOpen && messages.length === 0 && !isInitialized) {
      const boardCount = boards.length
      
      const welcomeMessage: ChatBubble = {
        id: 'welcome',
        role: 'assistant',
        content: `Hi **${user?.username || 'there'}**! 👋 

I can help you with your **${boardCount} board${boardCount !== 1 ? 's' : ''}** and tasks.

What can I help you organize today?`,
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
      setIsInitialized(true)
    }
  }, [isOpen, user?.username, boards.length, messages.length, isInitialized, setMessages, setIsInitialized])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: ChatBubble = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setIsTyping(true)

    try {
      // Add a small delay for natural feel
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const chatMessages: ChatMessage[] = [
        ...messages
          .filter(msg => msg.id !== 'welcome')
          .map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: userMessage.content }
      ]

      const response = await chatbotService.generateResponse(chatMessages)

      const assistantMessage: ChatBubble = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to get response. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
  }

  const toggleChat = () => {
    if (!isOpen) {
      setIsOpen(true)
      setIsMinimized(false)
    } else {
      setIsOpen(false)
      setIsMinimized(false)
    }
  }

  const minimizeChat = () => {
    setIsMinimized(!isMinimized)
  }

  return (
    <>
      {/* Chat Toggle Button */}
      {!isOpen && (
        <Button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 z-[100]"
          size="icon"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      )}

      {/* Floating Chat Panel */}
      {isOpen && (
        <div className={`fixed right-6 bottom-20 w-80 bg-background border rounded-lg shadow-2xl z-[99] transition-all duration-300 transform ${
          isMinimized ? 'h-12' : 'h-96'
        } ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-background rounded-t-lg">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-3 w-3 text-primary" />
              </div>
              <span className="text-sm font-medium">Assistant</span>
              {isTyping && (
                <div className="flex gap-1 ml-2">
                  <div className="w-1 h-1 bg-primary/60 rounded-full animate-pulse"></div>
                  <div className="w-1 h-1 bg-primary/60 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-1 h-1 bg-primary/60 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={minimizeChat}
                className="h-6 w-6 p-0 hover:bg-muted/50 rounded-full"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0 hover:bg-muted/50 rounded-full"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <>
              <ScrollArea className="h-80 p-3 bg-background" ref={scrollAreaRef}>
                <div className="space-y-3">
                  {messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`flex gap-2 animate-in slide-in-from-bottom-2 duration-300 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="h-3 w-3 text-primary" />
                          </div>
                        </div>
                      )}
                      
                      <div className={`max-w-[75%] ${message.role === 'user' ? 'order-1' : ''}`}>
                        <div className={`px-3 py-2 rounded-2xl text-sm transition-all duration-200 hover:shadow-sm ${
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground rounded-br-md' 
                            : 'bg-muted rounded-bl-md'
                        }`}>
                          <div 
                            className="leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                          />
                        </div>
                      </div>
                      
                      {message.role === 'user' && (
                        <div className="flex-shrink-0 mt-0.5 order-2">
                          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                            <User className="h-3 w-3 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="p-3 border-t bg-background rounded-b-lg">
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything..."
                    disabled={isLoading}
                    className="flex-1 h-8 text-sm border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/50 rounded-full px-3"
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!inputValue.trim() || isLoading}
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full shrink-0"
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
} 