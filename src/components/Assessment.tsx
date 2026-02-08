import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Button,
  Paper,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography
} from '@mui/material'
import {
  submitAssessment,
  submitFullAssessment,
  fetchTimerState,
  updateTimerState,
  Question
} from '../api/mockApi'
import useEventLogger from '../hooks/useEventLogger'
import useBrowserGuard from '../hooks/useBrowserGuard'
import useTimer from '../hooks/useTimer'
import useAssessment from '../hooks/useAssessment'
import { Snackbar, Alert } from '@mui/material'
import QuestionRenderer from './QuestionRenderer'
import Timer from './Timer'

const LS_KEY = 'assessment_answers_v1'
const LS_STARTED = 'assessment_started_v1'
const LS_TIMER = 'assessment_timer_v1'

export default function Assessment() {
  const [current, setCurrent] = useState(0)
  const [started, setStarted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showFullscreenRequiredDialog, setShowFullscreenRequiredDialog] = useState(false)
  const [showSubmittedDialog, setShowSubmittedDialog] = useState(false)
  const [showTimerWarning, setShowTimerWarning] = useState(false)
  const [showSubmitBlocked, setShowSubmitBlocked] = useState(false)
  const [remaining, setRemaining] = useState<number>(0)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const remainingRef = useRef<number>(0)
  const isRunningRef = useRef<boolean>(false)
  const restoreCompletedRef = useRef<boolean>(false)
  const warnTriggeredRef = useRef(false)
  const syncIntervalRef = useRef<number | null>(null)
  const tickIntervalRef = useRef<number | null>(null)
  const initialRemainingRef = useRef<number | null>(null)

  const totalTime = 30 * 60 // 30 minutes
  const WARNING_THRESHOLD = 5 * 60 // 5 minutes warning
  const SYNC_INTERVAL = 5000

  // use hook to manage questions/answers
  const { questions, answers, setAnswer, clearAnswers } = useAssessment()
  const eventLogger = useEventLogger()

  useEffect(() => {
    const wasStarted = !!localStorage.getItem(LS_STARTED)
    setStarted(wasStarted)

    // if started but not in fullscreen, show fullscreen required dialog
    if (wasStarted && !document.fullscreenElement) {
      setShowFullscreenRequiredDialog(true)
    }

    // try to restore timer from server first, then local
    ;(async () => {
      if (!wasStarted) {
        restoreCompletedRef.current = true
        return
      }
      
      try {
        const server = await fetchTimerState()
        if (server) {
          const elapsed = Math.floor((Date.now() - server.updatedAt) / 1000)
          const serverRemaining = Math.max(0, server.remaining - elapsed)
          console.log('[TIMER RESTORE] From server:', { serverRemaining, running: server.running, elapsed })
          setRemaining(serverRemaining)
          // don't resume timer until fullscreen is entered
          setIsRunning(false)
          initialRemainingRef.current = serverRemaining
          restoreCompletedRef.current = true
          if (serverRemaining === 0 && server.running) {
            eventLogger.log('timer_expired', { metadata: { source: 'server' } })
          }
          return
        }
      } catch (e) {
        console.error('[TIMER RESTORE] Server fetch failed:', e)
      }

      // fallback to local storage
      const t = localStorage.getItem(LS_TIMER)
      if (t) {
        try {
          const parsed = JSON.parse(t)
          const elapsed = Math.floor((Date.now() - parsed.updatedAt) / 1000)
          const localRemaining = Math.max(0, parsed.remaining - elapsed)
          console.log('[TIMER RESTORE] From localStorage:', { localRemaining, running: parsed.running, elapsed })
          setRemaining(localRemaining)
          // don't resume timer until fullscreen is entered
          setIsRunning(false)
          initialRemainingRef.current = localRemaining
        } catch (e) {
          console.error('[TIMER RESTORE] LocalStorage parse failed:', e)
        }
      }
      restoreCompletedRef.current = true
    })()
  }, [])

  // answers persistence/sync handled by useAssessment hook

  useEffect(() => {
    // persist timer locally whenever it changes
    localStorage.setItem(LS_TIMER, JSON.stringify({ remaining, running: isRunning, updatedAt: Date.now() }))
    // update refs for use in intervals/handlers
    remainingRef.current = remaining
    isRunningRef.current = isRunning
  }, [remaining, isRunning])

  useEffect(() => {
    if (started) localStorage.setItem(LS_STARTED, '1')
    else localStorage.removeItem(LS_STARTED)
  }, [started])

  useEffect(() => {
    const onFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement
      
      if (!isNowFullscreen && started && !submitted && remaining > 0) {
        // fullscreen was lost during assessment, show dialog
        console.log('[FULLSCREEN] Lost during assessment, showing fullscreen required dialog')
        setShowFullscreenRequiredDialog(true)
        setIsRunning(false)
        eventLogger.log('fullscreen_exit', { metadata: { fullscreen: false } })
        // sync paused state to server
        updateTimerState({ remaining: remainingRef.current, running: false, updatedAt: Date.now() }).catch(() => {})
      } else if (isNowFullscreen && showFullscreenRequiredDialog && started) {
        // user has re-entered fullscreen, close dialog and resume the timer
        console.log('[FULLSCREEN] Re-entered, resuming timer')
        setIsRunning(true)
        setShowFullscreenRequiredDialog(false)
        eventLogger.log('fullscreen_reentry', { metadata: { fullscreen: true } })
        // sync resumed state to server
        updateTimerState({ remaining: remainingRef.current, running: true, updatedAt: Date.now() }).catch(() => {})
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [started, submitted, remaining, showFullscreenRequiredDialog])

  const startAssessment = async () => {
    // try enter fullscreen
    try {
      await document.documentElement.requestFullscreen()
    } catch (e) {
      console.warn('Fullscreen request blocked', e)
    }
    setStarted(true)

    // initialize timer: prefer server value if any; otherwise start fresh
    try {
      const server = await fetchTimerState()
      if (server && server.remaining > 0) {
        const elapsed = Math.floor((Date.now() - server.updatedAt) / 1000)
        const serverRemaining = Math.max(0, server.remaining - elapsed)
        setRemaining(serverRemaining)
        setIsRunning(server.running && serverRemaining > 0)
        initialRemainingRef.current = serverRemaining
      } else {
        setRemaining(totalTime)
        initialRemainingRef.current = totalTime
        setIsRunning(true)
        // update server
        await updateTimerState({ remaining: totalTime, running: true, updatedAt: Date.now() })
      }
    } catch (e) {
      setRemaining(totalTime)
      setIsRunning(true)
    }

    eventLogger.log('timer_started', { metadata: { totalTime } })
  }

  const handleAnswer = (questionId: string, value: any) => {
    setAnswer(questionId, value)
    eventLogger.log('answer_changed', { questionId, metadata: { value } })
  }

  const handleSubmit = async (source: 'manual' | 'auto' = 'manual') => {
    console.log('handleSubmit called', { source, current, submitted })
    if (submitted) return

    // if manual submission attempted but not on last question, block
    if (source === 'manual' && current !== (questions.length - 1)) {
      setShowSubmitBlocked(true)
      return
    }

    setSubmitting(true)

    // compute time spent
    const initial = initialRemainingRef.current ?? totalTime
    const timeSpentSeconds = Math.max(0, initial - remaining)

    if (source === 'manual') eventLogger.log('manual_submission', { metadata: { method: 'manual' } })
    // flush events to server
    await eventLogger.flush().catch(() => {})

    // collect events (sent + any remaining outbox persisted)
    const sent = eventLogger.getSent()
    let outbox: any[] = []
    try {
      outbox = JSON.parse(localStorage.getItem('event_logs_outbox_v1') || '[]')
    } catch {}
    const eventsToSend = sent.concat(outbox)

    // submit full payload
    await submitFullAssessment({ answers, events: eventsToSend, timeSpentSeconds }).catch(() => {})

    // seal logger and lock UI
    eventLogger.seal()
    setSubmitted(true)

    setSubmitting(false)
    setStarted(false)
    localStorage.removeItem(LS_KEY)
    localStorage.removeItem(LS_STARTED)
    localStorage.removeItem(LS_TIMER)
    clearAnswers()
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {})
    // show a friendly submission dialog instead of a blocking alert
    setShowSubmittedDialog(true)
  }

  const onExpire = async () => {
    eventLogger.log('timer_expired', { metadata: { reason: 'countdown' } })
    eventLogger.log('auto_submission_triggered', { metadata: { source: 'timer' } })
    await handleSubmit('auto')
  }

  // Security/violation warnings
  const [violations, setViolations] = useState<Array<{ id: number; msg: string }>>([])
  const violationId = useRef(1)

  const pushViolation = async (msg: string, eventName?: string, meta?: any) => {
    const id = violationId.current++
    setViolations((v) => [...v, { id, msg }])
    if (eventName) eventLogger.log(eventName, { metadata: meta })
  }

  // attach browser guard listeners via hook to keep UI code clean
  useBrowserGuard(
    started,
    isRunning,
    {
    onPause: () => {
      setIsRunning(false)
      eventLogger.log('timer_paused', { metadata: { reason: 'browser_guard' } })
      // persist paused state to server to prevent tampering
      updateTimerState({ remaining: remainingRef.current, running: false, updatedAt: Date.now() }).catch(() => {})
    },
    onResume: () => {
      if (document.fullscreenElement) {
        setIsRunning(true)
        eventLogger.log('timer_resumed', { metadata: { reason: 'browser_guard' } })
        updateTimerState({ remaining: remainingRef.current, running: true, updatedAt: Date.now() }).catch(() => {})
      }
    },
      pushViolation: (msg: string, eventName?: string, meta?: any) => {
        const id = violationId.current++
        setViolations((v) => [...v, { id, msg }])
        if (eventName) eventLogger.log(eventName, { metadata: meta })
      }
    },
    // suppress guard reactions while submitting/submitted to avoid false positives
    () => submitting || submitted
  )

  const handleCloseViolation = (id?: number) => {
    if (!id) {
      setViolations([])
      return
    }
    setViolations((v) => v.filter((x) => x.id !== id))
  }

  const currentQ = questions[current]

  const domainWarning = useMemo(() => {
    const host = window.location.hostname
    const ua = navigator.userAgent
    return host !== 'example.com' || !ua.includes('Chrome')
  }, [])

  // tick handler: parent-driven countdown to prevent manual manipulation
  useEffect(() => {
    if (isRunning) {
      // start tick interval
      tickIntervalRef.current = window.setInterval(() => {
        setRemaining((r) => {
          const nr = r - 1
          if (nr <= 0) {
            setIsRunning(false)
          }
          return Math.max(0, nr)
        })
      }, 1000)
      // start sync interval
      syncIntervalRef.current = window.setInterval(() => {
        updateTimerState({ remaining: remainingRef.current, running: isRunningRef.current, updatedAt: Date.now() }).catch(() => {})
      }, SYNC_INTERVAL)
    } else {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current)
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
      tickIntervalRef.current = null
      syncIntervalRef.current = null
    }

    return () => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current)
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning])

  // sync to server whenever remaining changes (debounced by interval)
  // BUT: skip during restore phase to prevent syncing remaining=0 to server
  useEffect(() => {
    if (!restoreCompletedRef.current) {
      console.log('[TIMER SYNC] Skipping sync during restore phase')
      return
    }

    // prevent client from increasing remaining beyond server authoritative value
    ;(async () => {
      try {
        const server = await fetchTimerState()
        if (server) {
          const elapsed = Math.floor((Date.now() - server.updatedAt) / 1000)
          const serverRemaining = Math.max(0, server.remaining - elapsed)
          if (remaining > serverRemaining) {
            // override client-inflated value
            console.log('[TIMER SYNC] Client remaining higher than server, reverting:', { client: remaining, server: serverRemaining })
            setRemaining(serverRemaining)
            setIsRunning(server.running && serverRemaining > 0)
            return
          }
        }
        // update server with current refs (most up-to-date values)
        console.log('[TIMER SYNC] Updating server with refs:', { remaining: remainingRef.current, running: isRunningRef.current })
        await updateTimerState({ remaining: remainingRef.current, running: isRunningRef.current, updatedAt: Date.now() })
      } catch (e) {}
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining])

  // keep refs in sync with state (used by intervals/handlers)
  useEffect(() => {
    remainingRef.current = remaining
    isRunningRef.current = isRunning
  }, [remaining, isRunning])

  // attempt to persist timer to server on page unload
  useEffect(() => {
    const onBeforeUnload = () => {
      try {
        console.log('[TIMER UNLOAD] Syncing timer on unload:', { remaining: remainingRef.current, running: isRunningRef.current })
        // best-effort: fire update without awaiting
        updateTimerState({ remaining: remainingRef.current, running: isRunningRef.current, updatedAt: Date.now() }).catch(() => {})
      } catch (e) {
        console.error('[TIMER UNLOAD] Error:', e)
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  // watch for warning threshold and log once
  useEffect(() => {
    if (!warnTriggeredRef.current && remaining <= WARNING_THRESHOLD && remaining > 0) {
      warnTriggeredRef.current = true
      eventLogger.log('warning_threshold_reached', { metadata: { remaining } })
      setShowTimerWarning(true)
    }
  }, [remaining])

  return (
    <Paper sx={{ p: 3 }}>
     

      {submitted ? (
        <Stack spacing={2} alignItems="flex-start">
          <Typography variant="h5">Assessment submitted</Typography>
          <Typography variant="body2">Thank you — your responses have been recorded.</Typography>
        </Stack>
      ) : !started ? (
        <Stack spacing={2} alignItems="flex-start">
          <Typography variant="h5">Ready to start the assessment</Typography>
          <Button variant="contained" onClick={startAssessment} disabled={submitted}>
            Start Assessment
          </Button>
        </Stack>
      ) : (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography>Question {current + 1} / {questions.length}</Typography>
            <Timer
              remaining={remaining}
              running={isRunning}
              onExpire={onExpire}
              warningThreshold={WARNING_THRESHOLD}
              onWarning={() => eventLogger.log('warning_threshold_reached', { metadata: { remaining } })}
            />
          </Stack>

          {currentQ ? (
            <QuestionRenderer
              q={currentQ}
              value={answers[currentQ.questionId]}
              onChange={(v) => handleAnswer(currentQ.questionId, v)}
              disabled={submitted}
            />
          ) : (
            <Typography>Loading questions...</Typography>
          )}

          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button
              disabled={current === 0 || submitted}
              onClick={() => {
                const prev = Math.max(0, current - 1)
                setCurrent(prev)
                eventLogger.log('question_navigated', { questionId: questions[prev]?.questionId ?? null, metadata: { direction: 'previous' } })
              }}
            >
              Previous
            </Button>

            {current < (questions.length - 1) && (
              <Button
                disabled={submitted}
                onClick={() => {
                  const next = Math.min(questions.length - 1, current + 1)
                  setCurrent(next)
                  eventLogger.log('question_navigated', { questionId: questions[next]?.questionId ?? null, metadata: { direction: 'next' } })
                }}
              >
                Next
              </Button>
            )}

            {current === (questions.length - 1) && (
              <Button color="error" onClick={() => handleSubmit('manual')} disabled={submitting || submitted}>
                  Submit
                </Button>
            )}
          </Stack>
        </Box>
      )}

      <Dialog open={showFullscreenRequiredDialog} onClose={() => {}}>
        <DialogTitle>Fullscreen required</DialogTitle>
        <DialogContent>
          <Typography>Please enter fullscreen to continue with the assessment. Your timer is paused.</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={async () => {
              try {
                await document.documentElement.requestFullscreen()
              } catch (e) {
                console.error('Fullscreen request failed:', e)
              }
            }}
          >
            Enter Fullscreen
          </Button>
        </DialogActions>
      </Dialog>

      {violations.map((v) => (
        <Snackbar
          key={v.id}
          open
          autoHideDuration={5000}
          onClose={() => handleCloseViolation(v.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => handleCloseViolation(v.id)} severity="warning" sx={{ width: '100%' }}>
            {v.msg}
          </Alert>
        </Snackbar>
      ))}
      <Snackbar
        open={showTimerWarning}
        autoHideDuration={6000}
        onClose={() => setShowTimerWarning(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="warning" sx={{ width: '100%' }}>
          Warning: Less than 2 minutes remaining.
        </Alert>
      </Snackbar>

      <Snackbar
        open={showSubmitBlocked}
        autoHideDuration={4000}
        onClose={() => setShowSubmitBlocked(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="info" sx={{ width: '100%' }}>
          You can only submit on the last question. Please navigate to the final question.
        </Alert>
      </Snackbar>
    </Paper>
  )
}
