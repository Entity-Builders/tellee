# Tellee — Agent Instructions

## Project Overview

**Tellee** is an AI-powered client briefing SaaS that translates informal client descriptions into structured technical specifications. Professionals create shareable links, clients submit briefs through those links, and the AI organizes everything into curated notes persisted in a dashboard.

- **App Name**: Tellee (from "Tell" + "-ee" — tellee.io)
- **Repository**: `entity-builders` monorepo → `apps/tellee`
- **Platform**: Web app (Vite + React + React Router)
- **Run**: `yarn start:tellee` from monorepo root

## Tech Stack

| Layer    | Technology                                 |
| -------- | ------------------------------------------ |
| Frontend | React 18, TypeScript, React Router DOM     |
| Bundler  | Vite 5                                     |
| Styling  | Vanilla CSS (design tokens/vars)           |
| AI       | `@google/generative-ai` (Gemini 2.0 Flash) |
| Backend  | Supabase (Auth, Postgres, RLS)             |
| Icons    | `lucide-react`                             |

## Project Structure

```
apps/tellee/
├── .agents/              # AI agent context (this folder)
│   ├── AGENT.md          # Project overview & conventions
│   └── workflows/        # Dev, build workflows
├── public/               # Static assets
├── src/
│   ├── components/       # Reusable React UI components
│   │   ├── BriefingInput.tsx       # Client free-text input
│   │   ├── CuratedNote.tsx         # Structured AI output display
│   │   ├── ProcessingIndicator.tsx # Loading animation
│   │   └── ProtectedRoute.tsx      # Auth guard (redirects to /login)
│   ├── contexts/
│   │   └── AuthProvider.tsx  # Supabase auth state context
│   ├── lib/
│   │   └── supabase.ts       # Web Supabase client (localStorage)
│   ├── mocks/
│   │   └── client-briefs.ts  # Mock data for dev/testing
│   ├── pages/
│   │   ├── LandingPage.tsx    # Public landing (/)
│   │   ├── LoginPage.tsx      # Auth UI (/login)
│   │   ├── Dashboard.tsx      # Link management (/dashboard)
│   │   ├── LinkDetail.tsx     # View briefings (/dashboard/link/:id)
│   │   └── ClientBriefPage.tsx # Public brief input (/b/:slug)
│   ├── services/
│   │   ├── briefing-service.ts     # Gemini AI curation logic
│   │   ├── briefing-db-service.ts  # Supabase CRUD for briefings
│   │   └── link-service.ts         # Supabase CRUD for links
│   ├── App.tsx           # Router + AuthProvider wrapper
│   ├── App.css           # Layout styles
│   ├── constants.ts      # Brand config (app name, tagline)
│   ├── index.css         # Design system (CSS variables, animations)
│   ├── main.tsx          # React entry point
│   └── types.ts          # TypeScript type definitions
├── index.html            # Entry HTML (Inter + Outfit fonts)
├── package.json
├── vite.config.ts
└── tsconfig*.json
```

## Core Architecture

### Routing

| Route                     | Page            | Auth      |
| ------------------------- | --------------- | --------- |
| `/`                       | LandingPage     | Public    |
| `/login`                  | LoginPage       | Public    |
| `/b/:slug`                | ClientBriefPage | Public    |
| `/dashboard`              | Dashboard       | Protected |
| `/dashboard/link/:linkId` | LinkDetail      | Protected |

### The "Tellee Method" (3-Phase Flow)

1. **Professional** creates a briefing link from the Dashboard
2. **Client** opens the shared link → types free-text description
3. **AI** (Gemini) extracts entities, questions, and suggests missing info
4. **Result** is persisted in Supabase and visible in the Dashboard

### Auth

- Supabase Auth (email-based)
- Only the **professional** needs an account
- **Clients** access links without authentication
- Auth state managed via `AuthProvider` context

### Database (Supabase)

| Table             | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `tellee_profiles` | Extends `auth.users` with display name, profession   |
| `briefing_links`  | Shareable links with slug, title, profession context |
| `briefings`       | Submitted briefs: client input + curated JSON        |

- RLS policies ensure owners see only their data
- Clients can insert briefings without auth
- Auto-profile creation on signup via trigger

### AI Output Structure

The `CuratedBriefing` type includes:

- `fields[]` — Structured key-value entities
- `clientQuestions[]` — Questions the client asked (with context quote)
- `suggestedQuestions[]` — AI-generated questions for missing info

## Coding Conventions

- **Language**: TypeScript strict mode
- **Components**: Functional React with hooks, one component per file
- **Styling**: Vanilla CSS with BEM-style class names, CSS variables from `index.css`
- **State**: `useState` (no external state library)
- **AI calls**: Client-side via Gemini SDK. API key via `VITE_GEMINI_API_KEY`
- **Supabase**: Client in `src/lib/supabase.ts`, NOT from `packages/logic` (that one uses React Native AsyncStorage)
- **No Tailwind**: Pure CSS with custom design system

## Design System

Defined in `src/index.css`:

- **Theme**: Dark with violet/purple accent palette
- **Fonts**: Outfit (headings), Inter (body)
- **Effects**: Glassmorphism (`.glass-card`), ambient gradients, glow shadows
- **Animations**: `fadeInUp`, `pulse-glow`, `shimmer`, `bounce-dot`

## Environment Variables

```bash
# .env (apps/tellee/.env)
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Key Commands

| Command        | Description                            |
| -------------- | -------------------------------------- |
| `yarn dev`     | Start Vite dev server (localhost:5173) |
| `yarn build`   | TypeScript check + production build    |
| `yarn preview` | Preview production build locally       |

## Roadmap Context

- [ ] Audio input (record → transcribe → curate)
- [ ] Configurable profession context (set by note creator)
- [ ] Notifications when a client submits a brief
- [ ] Brief iteration: client can refine after seeing curated note
- [ ] White-label: custom branding on client-facing pages
