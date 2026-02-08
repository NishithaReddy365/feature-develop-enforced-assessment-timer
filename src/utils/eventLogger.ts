import { batchLogEvents, UnifiedEvent } from '../api/mockApi'

const OUTBOX_KEY = 'event_logs_outbox_v1'
const SENT_KEY = 'event_logs_sent_v1'

function now() {
  return Date.now()
}

export class EventLogger {
  outbox: UnifiedEvent[] = []
  sent: UnifiedEvent[] = []
  attemptId: string
  flushInterval = 5000
  timer: number | null = null
  sealed = false

  constructor(attemptId?: string) {
    this.attemptId = attemptId || `attempt_${Math.floor(Math.random() * 1e9)}`
    this.restore()
    this.startPeriodicFlush()
    window.addEventListener('beforeunload', () => this.beforeUnloadFlush())
  }

  restore() {
    try {
      const raw = localStorage.getItem(OUTBOX_KEY)
      if (raw) this.outbox = JSON.parse(raw)
      const rawSent = localStorage.getItem(SENT_KEY)
      if (rawSent) this.sent = JSON.parse(rawSent)
    } catch (e) {
      console.warn('Failed to restore event logger state', e)
    }
  }

  persist() {
    try {
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(this.outbox))
      localStorage.setItem(SENT_KEY, JSON.stringify(this.sent))
    } catch (e) {
      console.warn('Failed to persist event logger state', e)
    }
  }

  log(eventType: string, opts?: { questionId?: string | null; metadata?: any }) {
    if (this.sealed) return null
    const ev: UnifiedEvent = {
      eventType,
      timestamp: now(),
      attemptId: this.attemptId,
      questionId: opts?.questionId ?? null,
      metadata: opts?.metadata ?? {}
    }
    // append-only outbox
    this.outbox.push(ev)
    this.persist()
    return ev
  }

  seal() {
    // stop further logging and flushing
    this.sealed = true
    this.stopPeriodicFlush()
    // persist final state
    this.persist()
  }

  async flush() {
    if (this.outbox.length === 0) return { ok: true }
    const toSend = this.outbox.slice()
    try {
      // try using fetch via mock API
      const res = await batchLogEvents(toSend)
      if (res.ok) {
        // move to sent store (immutable)
        this.sent = this.sent.concat(toSend)
        this.outbox = []
        this.persist()
        return { ok: true }
      }
    } catch (e) {
      // network failure — leave outbox intact
      console.warn('Flush failed', e)
    }
    return { ok: false }
  }

  startPeriodicFlush() {
    if (this.timer) return
    this.timer = window.setInterval(() => this.flush(), this.flushInterval)
  }

  stopPeriodicFlush() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  beforeUnloadFlush() {
    // try to send using navigator.sendBeacon — best-effort
    try {
      if (this.outbox.length === 0) return
      const payload = JSON.stringify(this.outbox)
      const url = '/__batch_log' // this is a mock path; in environment with a real backend change accordingly
      if (navigator && (navigator as any).sendBeacon) {
        try {
          ;(navigator as any).sendBeacon(url, payload)
          // optimistic: mark as sent locally
          this.sent = this.sent.concat(this.outbox)
          this.outbox = []
          this.persist()
        } catch (e) {
          // fallback persist only
          this.persist()
        }
      } else {
        this.persist()
      }
    } catch (e) {
      this.persist()
    }
  }

  // allow explicit drain and retrieval of sent logs
  getSent() {
    return this.sent.slice()
  }
}

const logger = new EventLogger()
export default logger
