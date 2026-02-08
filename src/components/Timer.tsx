import React, { useEffect, useRef } from 'react'
import { Typography } from '@mui/material'

type Props = {
  remaining: number
  running: boolean
  onExpire: () => void
  warningThreshold?: number
  onWarning?: () => void
}

export default function Timer({ remaining, running, onExpire, warningThreshold = 300, onWarning }: Props) {
  const warnedRef = useRef(false)
  const prevRef = useRef<number | null>(null)

  useEffect(() => {
    const prev = prevRef.current
    // call onExpire when crossing from positive -> zero or below
    if (prev !== null && prev > 0 && remaining <= 0) {
      onExpire()
    }

    // trigger warning only when crossing threshold from above
    if (!warnedRef.current && prev !== null && prev > warningThreshold && remaining <= warningThreshold) {
      warnedRef.current = true
      onWarning && onWarning()
    }

    prevRef.current = remaining
  }, [remaining, running, onExpire, warningThreshold, onWarning])

  const mm = Math.floor(Math.max(0, remaining) / 60)
  const ss = Math.max(0, remaining) % 60

  return (
    <Typography variant="subtitle1">Time left: {mm}:{ss.toString().padStart(2, '0')}</Typography>
  )
}
