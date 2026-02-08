import { useMemo } from 'react'
import * as logService from '../services/logService'

/**
 * useEventLogger hook
 * Lightweight hook that exposes log/flush/seal methods.
 * Kept tiny because the underlying logger persists to localStorage
 * and manages background flushes; the hook makes the API available
 * through dependency injection and keeps components easy to test.
 */
export default function useEventLogger() {
  return useMemo(() => ({
    log: (eventType: string, opts?: { questionId?: string | null; metadata?: any }) => logService.log(eventType, opts),
    flush: () => logService.flush(),
    seal: () => logService.seal(),
    getSent: () => logService.getSent()
  }), [])
}
