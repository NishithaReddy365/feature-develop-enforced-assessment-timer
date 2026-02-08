export type Question = {
  questionId: string
  questionText: string
  questionType: 'MCQ' | 'TEXT'
  options?: string[]
}

const MOCK_QUESTIONS: Question[] = [
  {
    questionId: 'r1',
    questionText: 'What is JSX in React?',
    questionType: 'MCQ',
    options: ['A templating language', 'A syntax extension for JavaScript', 'A CSS-in-JS library', 'A build tool']
  },
  {
    questionId: 'r2',
    questionText: 'Which hook would you use to manage local component state?',
    questionType: 'MCQ',
    options: ['useEffect', 'useState', 'useContext', 'useRef']
  },
  {
    questionId: 'r3',
    questionText: 'Props vs State: which is correct?',
    questionType: 'MCQ',
    options: ['Props are mutable; state is immutable', 'Props are passed from parent; state is managed internally', 'Both are global', 'Both are immutable']
  },
  {
    questionId: 'r4',
    questionText: 'What defines a controlled component?',
    questionType: 'MCQ',
    options: ['Component that manages its own form state internally', 'Component whose value is driven by React state/props', 'Any component using refs', 'A component without state']
  },
  {
    questionId: 'r5',
    questionText: 'Which hook is best for fetching data on mount?',
    questionType: 'MCQ',
    options: ['useMemo', 'useCallback', 'useEffect', 'useLayoutEffect']
  },
  {
    questionId: 'r6',
    questionText: 'Why are keys important when rendering lists?',
    questionType: 'MCQ',
    options: ['They improve CSS selector performance', 'They uniquely identify elements for reconciliation', 'They are required for accessibility', 'They store state']
  },
  {
    questionId: 'r7',
    questionText: 'Which hook memoizes a computed value?',
    questionType: 'MCQ',
    options: ['useMemo', 'useState', 'useReducer', 'useLayoutEffect']
  },
  {
    questionId: 'r8',
    questionText: 'What is the Virtual DOM?',
    questionType: 'MCQ',
    options: ['A copy of the real DOM used for efficient diffing', 'The browser DOM API', 'A server-side rendering tool', 'A CSS layout engine']
  },
  {
    questionId: 'r9',
    questionText: 'Which hook references a DOM node directly?',
    questionType: 'MCQ',
    options: ['useRef', 'useState', 'useEffect', 'useContext']
  },
  {
    questionId: 'r10',
    questionText: 'What are error boundaries used for?',
    questionType: 'MCQ',
    options: ['Catching rendering errors in a component tree', 'Handling network errors', 'Validating props types', 'Managing state']
  },
  {
    questionId: 'r11',
    questionText: 'Which rule must be followed when using React Hooks?',
    questionType: 'MCQ',
    options: ['Call hooks conditionally inside loops', 'Call hooks only at the top level of React functions', 'Call hooks after return', 'Call hooks in nested functions']
  },
  {
    questionId: 'r12',
    questionText: 'What does "lifting state up" mean?',
    questionType: 'MCQ',
    options: ['Moving state to a parent component to share it', 'Persisting state to localStorage', 'Using refs instead of state', 'Converting state to props']
  },
  {
    questionId: 'r13',
    questionText: 'Which feature avoids prop drilling for deep data?',
    questionType: 'MCQ',
    options: ['Context API', 'Fragments', 'Portals', 'Refs']
  },
  {
    questionId: 'r14',
    questionText: 'What is the purpose of React.memo?',
    questionType: 'MCQ',
    options: ['To memoize components and prevent unnecessary re-renders', 'To manage side effects', 'To create portals', 'To handle form inputs']
  },
  {
    questionId: 'r15',
    questionText: 'useEffect vs useLayoutEffect: which is true?',
    questionType: 'MCQ',
    options: ['useEffect fires synchronously before paint', 'useLayoutEffect fires synchronously after paint', 'useLayoutEffect fires synchronously before paint', 'Both fire after paint']
  }
  ,
  {
    questionId: 't1',
    questionText: 'Briefly explain the difference between props and state in React.',
    questionType: 'TEXT'
  },
  {
    questionId: 't2',
    questionText: 'Describe a situation where you would lift state up in a React app.',
    questionType: 'TEXT'
  },
  {
    questionId: 't3',
    questionText: 'Type a short paragraph about how you would prevent unnecessary re-renders.',
    questionType: 'TEXT'
  }
]

export function fetchQuestions() {
  return new Promise<Question[]>((res) => {
    setTimeout(() => res(MOCK_QUESTIONS), 300)
  })
}

export function syncAnswers(payload: Record<string, string | string[]>) {
  return new Promise<{ ok: boolean }>((res) => {
    console.log('SYNC to backend', payload)
    setTimeout(() => res({ ok: true }), 200)
  })
}

export function submitAssessment(payload: { answers: Record<string, any> }) {
  return new Promise<{ ok: boolean; result?: string }>((res) => {
    // legacy submit: store answers
    serverSubmissions.push({ payload, ts: Date.now() })
    console.log('SUBMIT to backend', payload)
    setTimeout(() => res({ ok: true, result: 'submitted' }), 500)
  })
}

type Submission = { payload: any; ts: number }
const serverSubmissions: Submission[] = []

// New combined submission endpoint that accepts answers, events and timeSpent
export function submitFullAssessment(payload: { answers: Record<string, any>; events: UnifiedEvent[]; timeSpentSeconds: number }) {
  return new Promise<{ ok: boolean; result?: string }>((res) => {
    serverSubmissions.push({ payload, ts: Date.now() })
    console.log('FULL SUBMIT to backend', payload)
    
    // Clean up timer state after submission
    serverTimerState = null
    try {
      localStorage.removeItem('mock_server_timer_state')
      console.log('[MOCK API] Cleared serverTimerState after submission')
    } catch (e) {}
    
    setTimeout(() => res({ ok: true, result: 'submitted' }), 500)
  })
}

// Simple in-memory server-side timer state and event log to simulate backend
type TimerState = {
  remaining: number
  running: boolean
  updatedAt: number // timestamp
}

// Initialize from localStorage to persist across page reloads
let serverTimerState: TimerState | null = null
try {
  const stored = localStorage.getItem('mock_server_timer_state')
  if (stored) {
    serverTimerState = JSON.parse(stored)
    console.log('[MOCK API] Restored serverTimerState from localStorage:', serverTimerState)
  }
} catch (e) {
  console.error('[MOCK API] Failed to restore timer state:', e)
}

let eventLog: Array<{ event: string; ts: number; meta?: any }> = []

export function fetchTimerState() {
  return new Promise<TimerState | null>((res) => {
    console.log('[MOCK API] fetchTimerState returning:', serverTimerState)
    setTimeout(() => res(serverTimerState), 200)
  })
}

export function updateTimerState(state: TimerState) {
  return new Promise<{ ok: boolean }>((res) => {
    serverTimerState = { ...state }
    // persist to localStorage so it survives page reloads
    try {
      localStorage.setItem('mock_server_timer_state', JSON.stringify(serverTimerState))
      console.log('[MOCK API] updateTimerState saved to localStorage:', serverTimerState)
    } catch (e) {
      console.error('[MOCK API] Failed to save timer state:', e)
    }
    console.log('[MOCK API] SERVER timer updated', serverTimerState)
    setTimeout(() => res({ ok: true }), 150)
  })
}

export function logTimerEvent(event: string, meta?: any) {
  return new Promise<{ ok: boolean }>((res) => {
    eventLog.push({ event, ts: Date.now(), meta })
    console.log('TIMER EVENT LOGGED', event, meta)
    setTimeout(() => res({ ok: true }), 50)
  })
}

export function _dumpEventLog() {
  return eventLog.slice()
}

// Unified batch log endpoint — accepts immutable events and stores them server-side
export type UnifiedEvent = {
  eventType: string
  timestamp: number
  attemptId: string
  questionId?: string | null
  metadata?: any
}

const serverEventStore: UnifiedEvent[] = []

export function batchLogEvents(events: UnifiedEvent[]) {
  return new Promise<{ ok: boolean; stored: number }>((res) => {
    // append-only on server
    for (const e of events) {
      serverEventStore.push({ ...e })
    }
    console.log('SERVER BATCH LOGGED', events)
    setTimeout(() => res({ ok: true, stored: events.length }), 120)
  })
}

export function fetchServerEvents() {
  return new Promise<UnifiedEvent[]>((res) => {
    setTimeout(() => res(serverEventStore.slice()), 100)
  })
}


export function logSecurityEvent(event: string, meta?: any) {
  return new Promise<{ ok: boolean }>((res) => {
    eventLog.push({ event, ts: Date.now(), meta })
    console.log('SECURITY EVENT LOGGED', event, meta)
    setTimeout(() => res({ ok: true }), 30)
  })
}


