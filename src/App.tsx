import React from 'react'
import { Container, AppBar, Toolbar, Typography } from '@mui/material'
import Assessment from './components/Assessment'

export default function App() {
  return (
    <div>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6">Secure Test Enforcement</Typography>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>
        <Assessment />
      </Container>
    </div>
  )
}
