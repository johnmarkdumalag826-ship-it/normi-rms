# NORMI RMS — Research Management & Monitoring System

A web app for **Northern Mindanao Colleges, Inc.** that helps students, advisers, panel members,
coordinators and admins handle thesis and capstone work in one place: sending research papers,
adviser feedback, defense scheduling, panel scoring, and a searchable research repository.

> **This folder is the frontend (the part people see in the browser).**
> It needs the backend in the [`../backend`](../backend) folder to work.
> See the [main README](../README.md) for how to run both together.

---

## What it does

| Who | What they can do |
|---|---|
| **Student** | Send a research paper, read adviser feedback, upload new versions, see their defense date and panel |
| **Adviser** | See student groups, read papers, give chapter-by-chapter feedback, approve or ask for changes |
| **Coordinator** | Set defense dates, rooms and panels (warns about double-booking), post announcements |
| **Panel Member** | See assigned defenses, read the defense copy, score each defense |
| **Admin** | Manage accounts and passwords, view all defenses, back up and restore data |
| **Everyone** | Search the Research Repository and see the defense schedule |

### How a research paper moves through the system

```
Submitted → Under Review → Revision needed ⇄ (student fixes and re-sends)
                        ↘ Approved by Adviser → Waiting for Coordinator
                                              → Defense scheduled → Defense completed → In the Repository
```

The words people read on screen come from `src/ui/labels.ts`. The values stored in the database
(such as `Approved by Adviser`) are never changed.

---

## Run it on your computer

You need [Node.js](https://nodejs.org) and the backend (in `../backend`) running.

1. **Install the packages**
   ```bash
   npm install
   ```
2. **Tell the app where the backend is.** Copy `.env.example` to `.env.local` and check the address:
   ```
   VITE_API_URL="http://localhost:5000/api"
   ```
3. **Start the app**
   ```bash
   npm run dev
   ```
   Then open http://localhost:3000.

The backend must allow the address you open in the browser. Its `CLIENT_URL` setting has to match
(for example `http://localhost:3000`), otherwise the browser will block the requests.

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | Starts the app for development |
| `npm run build` | Builds the app for release |
| `npm run preview` | Shows the built app |
| `npm run lint` | Checks the code for type errors |

---

## Where things are

```
src/
├── App.tsx              Main file: loads data, keeps state, switches between pages
├── main.tsx             Starts the app
├── types.ts             The shapes of the data (Research, User, Schedule, ...)
├── index.css            Colours, text sizes and other design settings
│
├── components/          The screens
│   ├── Login.tsx                            Sign in and create an account
│   ├── Sidebar.tsx, Header.tsx              The menu and top bar
│   ├── DashboardStudent / Adviser / Coordinator / Panelist / Admin.tsx
│   │                                        One home page for each role
│   ├── ResearchInformationForm.tsx          A student's first form
│   ├── ResearchDetailsView.tsx              A paper's chapters, versions and comments
│   ├── DocumentReview.tsx                   Adviser's review and decision screen
│   ├── AnnotatedPaper.tsx                   The paper on screen with highlights and the comment box
│   ├── RepositoryView.tsx                   Search the finished papers
│   ├── DefenseSchedulesList.tsx             Everyone's view of defense dates
│   └── SchedulerCalendar.tsx                Coordinator's calendar for setting defenses
│
├── ui/                  Shared building blocks used by every screen
│   ├── Button, Field (Input/Select/Textarea), Badge, Card, Table
│   ├── Modal (with ConfirmDialog), Alert (with Toast), EmptyState, Skeleton, PageHeader
│   └── labels.ts        Plain-English names for statuses and roles, and readable dates
│
└── api/                 How the app talks to the backend (one file per topic)
```

---

## Design notes

- **Plain English.** One word for one thing everywhere: *Research paper*, *Adviser*, *Panel Member*,
  *Defense*, *Repository*. Buttons say what they do, like "Send to My Adviser".
- **Easy on phones and laptops.** Layouts work from 375 px wide upward. Tables turn into cards on phones.
  Buttons and fields are at least 44 px tall.
- **Accessible.** Strong colour contrast, visible keyboard focus, labels on every field, and reduced
  motion for people who ask for it.
- **Safe actions.** Final or hard-to-undo actions (approving a paper, deleting an account, restoring a
  backup) ask "Are you sure?" first.

## Good to know

- There is no public sign-up. An Admin creates every account in **Manage Accounts**.
- If someone forgets their password, an Admin sets a new one from **Manage Accounts → Reset Password**.
  The website does not send emails yet.
- **Review Papers** shows the student's uploaded PDF inside the page. Word files are downloaded instead.
- Online (video) defenses are not supported yet: every defense needs a room.
