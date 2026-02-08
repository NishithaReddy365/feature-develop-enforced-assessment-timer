import { useEffect } from 'react'
import useEventLogger from './useEventLogger'

/**
 * useBrowserGuard attaches browser security listeners (fullscreen, visibility,
 * clipboard, contextmenu, keyboard shortcuts) and invokes callbacks provided
 * by the caller. This keeps Assessment component focused on UI, while the
 * guard encapsulates browser-specific enforcement logic.
 */
export default function useBrowserGuard(
  started: boolean,
  isRunning: boolean,
  callbacks: {
    onPause: () => void
    onResume: () => void
    pushViolation: (msg: string, eventName?: string, meta?: any) => void
  },
  // optional suppression function: when it returns true, guard will ignore events
  shouldIgnore?: () => boolean
) {
  const logger = useEventLogger()

  useEffect(() => {
    if (!started) return

    const onFullscreenChange = () => {
      if (shouldIgnore && shouldIgnore()) return
      if (!document.fullscreenElement) {
        callbacks.pushViolation('Fullscreen exited — assessment paused', 'fullscreen_exit')
        if (isRunning) {
          callbacks.onPause()
        }
        logger.log('fullscreen_exit', { metadata: { fullscreen: false } })
      }
    }

    const onVisibilityChange = () => {
      if (shouldIgnore && shouldIgnore()) return
      if (document.hidden) {
        callbacks.pushViolation('Page hidden or switched tab — assessment paused', 'visibility_change')
        if (isRunning) callbacks.onPause()
        logger.log('visibility_change', { metadata: { hidden: true } })
      } else {
        if (document.fullscreenElement) {
          callbacks.onResume()
          logger.log('visibility_return', { metadata: { hidden: false } })
        }
      }
    }

    const onBlur = () => {
      if (shouldIgnore && shouldIgnore()) return
      callbacks.pushViolation('Window lost focus — assessment paused', 'window_blur')
      if (isRunning) callbacks.onPause()
      logger.log('window_blur')
    }

    const onFocus = () => {
      if (shouldIgnore && shouldIgnore()) return
      if (document.fullscreenElement) callbacks.onResume()
      logger.log('window_focus')
    }

    const onCopy = (e: ClipboardEvent) => {
      if (shouldIgnore && shouldIgnore()) return
      e.preventDefault()
      callbacks.pushViolation('Copy attempt blocked', 'copy_attempt')
      logger.log('copy_attempt')
    }
    const onPaste = (e: ClipboardEvent) => {
      if (shouldIgnore && shouldIgnore()) return
      e.preventDefault()
      callbacks.pushViolation('Paste attempt blocked', 'paste_attempt')
      logger.log('paste_attempt')
    }
    const onCut = (e: ClipboardEvent) => {
      if (shouldIgnore && shouldIgnore()) return
      e.preventDefault()
      callbacks.pushViolation('Cut attempt blocked', 'cut_attempt')
      logger.log('cut_attempt')
    }

    const onContextMenu = (e: MouseEvent) => {
      if (shouldIgnore && shouldIgnore()) return
      e.preventDefault()
      callbacks.pushViolation('Context menu disabled during assessment', 'context_menu')
      logger.log('context_menu', { metadata: { x: (e as any).clientX, y: (e as any).clientY } })
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnore && shouldIgnore()) return
      const key = e.key.toLowerCase()
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && (key === 'c' || key === 'v' || key === 'x')) {
        e.preventDefault()
        callbacks.pushViolation(`Keyboard shortcut ${e.metaKey ? 'Cmd' : 'Ctrl'}+${key.toUpperCase()} blocked`, 'keyboard_shortcut', { key })
        logger.log('keyboard_shortcut', { metadata: { key, ctrl: true } })
      }
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    document.addEventListener('copy', onCopy)
    document.addEventListener('paste', onPaste)
    document.addEventListener('cut', onCut)
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('paste', onPaste)
      document.removeEventListener('cut', onCut)
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('keydown', onKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, isRunning])
}
