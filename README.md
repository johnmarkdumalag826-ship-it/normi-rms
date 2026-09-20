# NORMI RMS — Research Management & Monitoring System (Frontend)

A web app for Northern Mindanao Colleges, Inc. It helps students, advisers, panel members,
coordinators and admins handle thesis and capstone work: sending research papers, adviser
feedback, defense scheduling, panel scoring, and the research repository.

Built with React 19, TypeScript, Vite and Tailwind CSS v4. It talks to the NORMI RMS backend
(Express and MongoDB), which lives in a separate `Backend` folder.

## Run it on your computer

You need [Node.js](https://nodejs.org) and the backend running (see the backend's own instructions).

1. Install the packages:
   ```bash
   npm install
   ```
2. Tell the app where the backend is. Copy `.env.example` to `.env.local` and set the address:
   ```
   VITE_API_URL="http://localhost:5000/api"
   ```
3. Start the app:
   ```bash
   npm run dev
   ```
   Then open http://localhost:3000.

The backend must allow this address. Its `CLIENT_URL` setting has to match the address you
open in the browser (for example `http://localhost:3000`).

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Starts the app for development |
| `npm run build` | Builds the app for release |
| `npm run preview` | Shows the built app |
| `npm run lint` | Checks the code for type errors |

## Where things are

- `src/App.tsx` — the main file: loads the data and switches between pages.
- `src/components/` — the screens (Landing, Login, one home page per role, Repository, Defense Schedule, and more).
- `src/ui/` — shared building blocks (buttons, form fields, badges, cards, tables, pop-ups) and
  `labels.ts`, which turns stored values into plain words and readable dates.
- `src/api/` — how the app talks to the backend.
- `src/index.css` — the colours, text sizes and other design settings.

Demo accounts are created by the backend's seed script.
