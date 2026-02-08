// Centralized type definitions for the assessment app

export type Question = {
  questionId: string
  questionText: string
  questionType: 'MCQ' | 'TEXT'
  options?: string[]
}

export type Answer = Record<string, string | string[]>

export type TimerState = {
  remaining: number
  running: boolean
  updatedAt: number
}

export type EventSchema = {
  eventType: string
  timestamp: number
  attemptId: string
  questionId?: string | null
  metadata?: any
}
