/**
 * logService: small adapter around the client EventLogger instance.
 * This isolates logging concerns and keeps components/hook code simple.
 */
import logger from '../utils/eventLogger'

export function log(eventType: string, opts?: { questionId?: string | null; metadata?: any }) {
  // logger.log is synchronous (pushes to outbox + persists), so we keep this simple
  return logger.log(eventType, opts)
}

export function flush() {
  return logger.flush()
}

export function seal() {
  return logger.seal()
}

export function getSent() {
  return logger.getSent()
}
