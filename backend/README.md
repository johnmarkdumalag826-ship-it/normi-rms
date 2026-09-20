# NORMI RMS — Backend

The server for the **NORMI Research Management & Monitoring System** of Northern Mindanao Colleges, Inc.
It stores the data and answers the requests from the web app.

- The web app (frontend) is in the [`../frontend`](../frontend) folder. See the [main README](../README.md) for how to run both together.
- Built with Node.js, Express 5 and MongoDB (Mongoose).

## What it does

- Sign-in with email and password (passwords are stored hashed; sessions use signed tokens). There is no public sign-up: only an Admin creates accounts, and an Admin can set a new password for someone who forgot theirs.
- Role-based access for students, advisers, coordinators, panel members and admins.
- Research papers, versions, chapter feedback and comments.
- Defense scheduling with rooms and panels, and panel scoring.
- Announcements, notifications, consultations, an audit log, and file uploads (PDF and Word).

## Run it on your computer

You need [Node.js](https://nodejs.org) and a MongoDB database (a free MongoDB Atlas cluster works).

1. **Install the packages**
   ```bash
   npm install
   ```
2. **Create your settings file.** Copy `.env.example` to a new file named `.env` and fill it in:

   | Setting | What to put |
   |---|---|
   | `MONGODB_URI` | The address of your MongoDB database |
   | `JWT_SECRET` | A long random text that only you know |
   | `PORT` | The port for this server (default `5000`) |
   | `CLIENT_URL` | The address of the web app, for example `http://localhost:3000` |

   Never share or upload the `.env` file. It is already listed in `.gitignore`.
3. **Add the school's starting data** (departments, courses, school years and rooms):
   ```bash
   npm run seed
   ```
4. **Create the first Admin** (asks for a name, an email and a password; the password is hidden as you type):
   ```bash
   npm run create-admin
   ```
5. **Start the server**
   ```bash
   npm run dev
   ```
   The server runs at http://localhost:5000, and the API is under `/api`.

Then sign in on the website as the Admin and add everyone else from **Manage Accounts**.

### Testing only

- `npm run test-accounts` creates one account for each role (`test.student@normi.edu.ph` and so on).
  It shows a random password once, or uses `TEST_PASSWORD` if you set it. It refuses to run when
  `NODE_ENV=production`. Delete these accounts before real use.
- `node scripts/dev-mongo.js` starts a temporary in-memory database on port 27117, so you can try
  the system without MongoDB Atlas. Set `MONGODB_URI=mongodb://127.0.0.1:27117/normi_rms` in `.env`.
  Its data disappears when you stop it.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Starts the server and restarts it when files change |
| `npm start` | Starts the server |
| `npm run seed` | Adds departments, courses, school years and rooms (safe to run again) |
| `npm run create-admin` | Creates the first Admin account |
| `npm run test-accounts` | Creates one test account per role (testing only) |
| `npm run smoke-test` | Runs a full self-check (sign-in, security, papers, defenses, scoring) on a temporary database |

## Where things are

```
src/
├── server.js        Starts the server and lists every API address
├── config/          Database connection
├── models/          The shape of each kind of data (User, Research, Schedule, ...)
├── controllers/     What happens for each request
├── routes/          Which address calls which controller
├── middleware/      Sign-in checks, role checks, file upload rules
└── utils/           Small helpers (errors, audit log, notifications)
scripts/             seed, dev-mongo and smoke-test
uploads/             Uploaded files are saved here (not stored in Git)
```

## API overview

All addresses start with `/api`: `auth`, `users`, `departments`, `courses`, `school-years`, `rooms`,
`defense-types`, `research`, `versions`, `comments`, `notifications`, `announcements`, `consultations`,
`panel-availability`, `schedules`, `evaluations`, `audit-logs` and `uploads`.

## Security notes

- Keep `.env` private. It holds your database address and your secret key.
- `JWT_SECRET` must be a long random text (16 or more characters). The server will not start without it.
- Public sign-up is closed. Only an Admin can create accounts (`POST /api/users`).
- Delete any test accounts before real use.
- Uploaded student files stay on the server in `uploads/` and are not part of this repository.
