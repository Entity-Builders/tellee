---
description: How to build Tellee for production deployment
---

## Production Build

// turbo-all

1. Run the build from the app directory:

```bash
cd apps/tellee && yarn build
```

2. The output will be in `apps/tellee/dist/`.

3. Preview the production build locally:

```bash
cd apps/tellee && yarn preview
```

## Deployment Options

### Static Hosting (Vercel, Netlify, Cloudflare Pages)

- Point the build directory to `apps/tellee/dist`
- Set environment variable: `VITE_GEMINI_API_KEY`
- Build command: `cd apps/tellee && yarn build`

### Important Notes

- The Gemini API key is bundled at build time via `import.meta.env`
- For production, consider moving AI calls to a backend/edge function to protect the API key
