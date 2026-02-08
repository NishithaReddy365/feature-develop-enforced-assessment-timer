import React from 'react'
import {
  Box,
  Radio,
  RadioGroup,
  FormControlLabel,
  TextField,
  Typography
} from '@mui/material'
import type { Question } from '../api/mockApi'

type Props = {
  q: Question
  value: string
  onChange: (val: string) => void
  disabled?: boolean
}

export default function QuestionRenderer({ q, value, onChange, disabled }: Props) {
  if (q.questionType === 'MCQ') {
    return (
      <Box>
        <Typography variant="h6">{q.questionText}</Typography>
        <RadioGroup value={value || ''} onChange={(e) => onChange(e.target.value)}>
          {q.options?.map((opt) => (
            <FormControlLabel key={opt} value={opt} control={<Radio />} label={opt} disabled={!!disabled} />
          ))}
        </RadioGroup>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h6">{q.questionText}</Typography>
      <TextField
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        multiline
        minRows={3}
        fullWidth
        disabled={!!disabled}
      />
    </Box>
  )
}
