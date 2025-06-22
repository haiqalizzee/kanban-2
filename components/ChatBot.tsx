"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { MessageCircle, Send, Bot, User, Loader2, Trash2 } from 'lucide-react'
import { chatbotService, type ChatMessage, type ChatBubble } from '@/services/chatbot'
import { useToast } from '@/hooks/use-toast'

interface ChatBotProps {
  boards: any[]
  user: any
}

export function ChatBot({ boards = [], user }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatBubble[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
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

  // Welcome message when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const boardCount = boards.length
      const totalCards = boards.reduce((total, board) => total + (board.cards?.length || 0), 0)
      
      const welcomeMessage: ChatBubble = {
        id: 'welcome',
        role: 'assistant',
        content: `Hey **${user?.username || 'there'}**! 👋 

I can see you've got **${boardCount} board${boardCount !== 1 ? 's' : ''}** going on, and I can peek at all your tasks too! Think of me as your organizing buddy who's here to help you make sense of everything.

I'm pretty good at:
- **Looking at your tasks** and helping you figure out what's urgent
- **Suggesting ways** to organize your workflow better
- **Helping you prioritize** when things feel overwhelming
- **Just chatting** about your projects and what's on your mind

What's going on with your tasks today? Anything stressing you out or need help with? 😊`,
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [isOpen, user?.username, messages.length, boards.length])

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

    try {
      // Backend handles all context and board data
      const chatMessages: ChatMessage[] = [
        ...messages
          .filter(msg => msg.id !== 'welcome') // Exclude welcome message from context
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
        description: error.message || "Failed to get response from AI assistant. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatMessage = (content: string) => {
    // Convert **text** to bold and *text* to bold as well
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // **bold**
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')      // *bold*
      .replace(/\n/g, '<br>')                            // line breaks
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover-lift z-50"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5 text-primary" />
              Kanban Assistant
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearChat}
              className="h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Ask me about your boards and tasks
          </p>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
            <div className="space-y-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : ''}`}>
                    <Card className={`${message.role === 'user' ? 'bg-primary text-primary-foreground' : ''}`}>
                      <CardContent className="p-3">
                        <div 
                          className="text-sm whitespace-pre-wrap break-words"
                          dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                        />
                        <p className={`text-xs mt-2 ${
                          message.role === 'user' 
                            ? 'text-primary-foreground/70' 
                            : 'text-muted-foreground'
                        }`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 mt-1 order-2">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your boards..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!inputValue.trim() || isLoading}
                size="icon"
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 