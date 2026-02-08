import { useEffect, useState } from 'react'
import * as api from '../services/apiService'
import type { Question } from '../types'

/**
 * useAssessment encapsulates question loading, local persistence of answers,
 * and syncing to backend. This isolates persistence concerns from the UI.
 */
export default function useAssessment() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})

  const LS_KEY = 'assessment_answers_v1'

  useEffect(() => {
    api.fetchQuestions().then((q) => setQuestions(q))
    const stored = localStorage.getItem(LS_KEY)
    if (stored) setAnswers(JSON.parse(stored))
  }, [])

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(answers))
    api.syncAnswers(answers).catch(() => {})
  }, [answers])

  function setAnswer(questionId: string, value: any) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  function clearAnswers() {
    setAnswers({})
    localStorage.removeItem(LS_KEY)
    api.syncAnswers({}).catch(() => {})
  }

  return { questions, answers, setAnswer, clearAnswers }
}
