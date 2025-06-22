import { apiService } from './api'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export const chatbotService = {
  // Generate AI response using backend
  async generateResponse(messages: ChatMessage[]): Promise<string> {
    try {
      const response = await apiService.post('/chatbot/chat', {
        messages
      })
      return response.data.response
    } catch (error: any) {
      console.error('Chatbot API Error:', error)
      throw new Error(error.response?.data?.message || 'Failed to get AI response')
    }
  },

  // Optional: Get boards context for debugging
  async getBoardsContext(): Promise<any> {
    try {
      const response = await apiService.get('/chatbot/context')
      return response.data
    } catch (error: any) {
      console.error('Failed to get boards context:', error)
      throw new Error(error.response?.data?.message || 'Failed to get boards context')
    }
  }
} 