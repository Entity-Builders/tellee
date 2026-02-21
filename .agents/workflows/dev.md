---
description: How to start the Tellee development server
---

## Development Server

// turbo-all

1. Make sure you have the Gemini API key configured:

```bash
# Check if .env exists in apps/tellee/
cat apps/tellee/.env
# If not, copy from template:
cp apps/tellee/.env.example apps/tellee/.env
# Then add your real VITE_GEMINI_API_KEY
```

2. Start the dev server from the monorepo root:

```bash
yarn start:tellee
```

3. Or from the app directory:

```bash
cd apps/tellee && yarn dev
```

4. Open `http://localhost:5173` in the browser.

## Testing the AI Flow

1. Select a profession preset (e.g., 🎂 Repostería)
2. Paste or type a client description in the textarea
3. Press **Curar** or use `⌘ + Enter`
4. Verify the curated note appears with structured fields

## Common Issues

- **"Gemini API key not configured"**: Check that `VITE_GEMINI_API_KEY` is set in `apps/tellee/.env`
- **Port 5173 in use**: Kill the process using it or Vite will auto-pick another port
