import { useEffect, useRef } from 'react'
import * as api from '../services/apiService'

/**
 * useTimer: small helper that starts/stops tick and periodic sync.
 * It keeps side effects (intervals and server sync) out of the component.
 */
export default function useTimer(
  remaining: number,
  isRunning: boolean,
  setRemaining: (n: number) => void,
  setIsRunning: (b: boolean) => void,
  options?: { syncInterval?: number }
) {
  const tickRef = useRef<number | null>(null)
  const syncRef = useRef<number | null>(null)
  const SYNC = options?.syncInterval ?? 5000

  useEffect(() => {
    if (isRunning) {
      // start ticking
      tickRef.current = window.setInterval(() => {
        setRemaining((r) => {
          const nr = r - 1
          if (nr <= 0) setIsRunning(false)
          return Math.max(0, nr)
        })
      }, 1000)

      // start periodic sync to server
      syncRef.current = window.setInterval(() => {
        api.updateTimerState({ remaining, running: isRunning, updatedAt: Date.now() }).catch(() => {})
      }, SYNC)
    } else {
      if (tickRef.current) clearInterval(tickRef.current)
      if (syncRef.current) clearInterval(syncRef.current)
      tickRef.current = null
      syncRef.current = null
    }

    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      if (syncRef.current) clearInterval(syncRef.current)
    }
    // we intentionally omit remaining from deps to avoid restarting interval every second
    // instead server sync uses the closure capturing 'remaining' value via setInterval call
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning])
}
