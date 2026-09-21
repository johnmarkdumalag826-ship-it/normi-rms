# CLAUDE.md

Notes for AI coding assistants working in this folder.

## What this is

The **frontend** of NORMI RMS (Research Management & Monitoring System) for Northern Mindanao Colleges, Inc.
React 19 + TypeScript + Vite + Tailwind CSS v4. It talks to the Express/MongoDB backend in `../backend`
through `src/api/`. Roles: student, adviser, coordinator, panelist, admin. New people can register on the sign-in page; it stays "pending" until an Admin approves it.

## Commands

```bash
npm install
npm run dev      # Vite on port 3000 (pass --port=3001 to change)
npm run build
npm run lint     # type-check only (tsc --noEmit); there is no ESLint and no test runner
```

## Architecture

- `src/App.tsx` owns all state, the `handle*` functions that call the API, and a small hand-made router
  (`renderTabContent`, switched on `activeTab` and role, with an `allowedTabs` map).
  There is no router library and no global state library; data is passed down as props.
- Every change typically updates state, and the backend writes the notification and audit log entry.
- `src/components/` are the screens. `src/ui/` holds shared building blocks and `labels.ts`.
- `src/api/` has one file per backend topic; `client.ts` holds the base URL, token and `ApiError`.

## Rules of thumb

- Stored values (status names, role names, field names) never change. Friendly words come from `src/ui/labels.ts`.
- Use the shared components in `src/ui` (Button, Field, Modal, ConfirmDialog, Table, ...) instead of new one-off styles.
- Plain English, one term per thing: Research paper, Adviser, Panel Member, Defense, Repository.
- Ask "Are you sure?" (ConfirmDialog) before final or destructive actions.
- Text is at least 14 px, tap targets at least 44 px, and every field has a label.
- Do not add demo shortcuts, sample data or invented links to the app.
- Files are private. Never link to `/uploads/...` directly: use `src/api/files.ts` (`openFile`, `downloadFile`, `useFileLink`),
  which asks the server for a short link first.

## Environment

- `.env.local` sets `VITE_API_URL` (see `.env.example`). It is not committed.
- The backend's `CLIENT_URL` must equal the exact address opened in the browser, or requests are blocked (CORS).
