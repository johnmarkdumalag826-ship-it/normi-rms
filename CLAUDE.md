# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

NORMI RMS (Research Management & Monitoring System) — a capstone/thesis workflow platform for Northern Mindanao Colleges, Inc. It manages research proposal submission, adviser review, defense scheduling, panel evaluation, and archiving across five roles: student, adviser, coordinator, panelist, admin.

This is a **frontend-only prototype**: there is no backend server. All "database" state lives in React state, is seeded from `src/db/mockData.ts`, and is persisted to the browser's `localStorage` (keys prefixed `normi_*`, synced via `useEffect` in `src/App.tsx`). Login is simulated client-side against hardcoded demo credentials in `src/components/Login.tsx` — there is no real authentication or server-side authorization.

## Commands

```bash
npm install       # install dependencies
npm run dev        # start Vite dev server on port 3000
npm run build       # production build (vite build)
npm run preview      # preview the production build
npm run lint        # type-check only (tsc --noEmit) — there is no separate linter (no ESLint config)
npm run clean       # rm -rf dist server.js
```

There is no test suite/runner configured in this repo (no test files, no test script, no Vitest/Jest config).

## Architecture

**Everything is driven from `src/App.tsx`.** It is the single source of truth: it owns all top-level state (users, research records, versions, comments, announcements, notifications, consultations, schedules, evaluations, audit logs, defense types), all the `handle*` mutation functions, the `normi_*` localStorage persistence effects, and a hand-rolled router (`renderTabContent`, switched on `activeTab` string + role) with a role-based `allowedTabs` access-control map. There is no routing library and no global state library (no Redux/Zustand/Context providers for domain data) — everything is prop-drilled from `App.tsx` down into `src/components/*`.

**Data flow pattern**: every mutation in `App.tsx` typically does three things together — update the relevant state array, push a `SystemNotification` to affected users, and call `logTransaction(...)` to append an `AuditLog` entry. When adding a new mutation, follow this same shape rather than just updating state.

**Domain model** (`src/types.ts`) centers on `Research`, which moves through a fixed status pipeline: `Submitted → Under Review → Revision Required → Approved by Adviser → Pending Coordinator → Scheduled → Completed → Archived`. Each `Research` has one or more `ResearchVersion`s (one per manuscript upload), and each version tracks five chapter statuses independently (`chapter1`–`chapter5`, each `Pending | Approved | Revision Required | Not Submitted`). `Schedule` (defense slot) and `Evaluation` (panelist scoring) are separate entities linked by `researchId`/`scheduleId`.

**Components** (`src/components/`) are flat (no subfolders) and split into:
- Role dashboards: `DashboardStudent`, `DashboardAdviser`, `DashboardCoordinator`, `DashboardPanelist`, `DashboardAdmin` — each is a large, self-contained view (600–1100+ lines) receiving the full relevant slice of state plus `handle*` callbacks as props.
- Shared/cross-role views: `RepositoryView`, `SchedulerCalendar`, `DefenseSchedulesList`, `AutomatedScheduler`, `ResearchDetailsView`, `DocumentReview`, `InteractiveERD`.
- Shell: `Sidebar`, `Header`, `LandingPage`, `Login`.

Mock/seed data (departments, courses, school years, rooms, users, research, versions, comments, panel availability, announcements, notifications, consultations, schedules, evaluations, audit logs) all lives in `src/db/mockData.ts` and is used as the initial value whenever `localStorage` is empty.

## Notable things to know before changing code

- `@google/genai`, `express`, and `dotenv` are present in `package.json` (leftovers from the AI Studio scaffold this project was generated from) but are **not used anywhere in `src/`** — there is no live Gemini API integration and no Express server despite `.env.example` referencing `GEMINI_API_KEY`/`APP_URL`.
- Styling is Tailwind CSS v4 (`@tailwindcss/vite` plugin, config-free — theme tokens and custom utilities like `glass-panel`/`glass-card` are defined directly in `src/index.css` via `@theme`/`@utility`). There's also a global CSS override in `index.css` that forces translucency/blur onto any element matching `bg-white`/`bg-slate-50`/`bg-slate-100` classes — worth knowing about since it can produce surprising visual results on new components using those Tailwind classes.
- Path alias `@/*` maps to the project root (see `tsconfig.json` / `vite.config.ts`), not `src/`.
- `vite.config.ts` disables HMR/file watching when `DISABLE_HMR=true` — this is intentional (used by the AI Studio agent environment to avoid flicker during automated edits), not a bug.
