/**
 * apiService: thin wrapper around the mocked backend API.
 * Keeping a service layer makes it easier to swap the mock API
 * for a real HTTP client (fetch/axios) in production.
 */
import * as mock from '../api/mockApi'
import type { Question, TimerState } from '../types'

export async function fetchQuestions(): Promise<Question[]> {
  return mock.fetchQuestions()
}

export async function syncAnswers(payload: Record<string, any>) {
  return mock.syncAnswers(payload)
}

export async function submitFullAssessment(payload: { answers: Record<string, any>; events: any[]; timeSpentSeconds: number }) {
  return mock.submitFullAssessment(payload)
}

export async function fetchTimerState(): Promise<TimerState | null> {
  return mock.fetchTimerState()
}

export async function updateTimerState(state: TimerState) {
  return mock.updateTimerState(state)
}

export async function batchLogEvents(events: any[]) {
  return mock.batchLogEvents(events)
}

export async function fetchServerEvents() {
  return mock.fetchServerEvents()
}
