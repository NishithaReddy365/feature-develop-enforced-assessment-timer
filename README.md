# Secure Test Enforcement

Local scaffold of a React + TypeScript app that simulates a secure assessment environment.

Quick start:

1. Install dependencies:

```bash
npm install
```

2. Run dev server:

```bash
npm run dev
```

Notes:
- App tries to enforce fullscreen on `Start Assessment` and will show a dialog if fullscreen is exited.
- Questions are loaded from a mocked backend, answers persist to `localStorage` and are periodically synced to the mocked backend.
- Auto-submit is triggered when timer expires.
