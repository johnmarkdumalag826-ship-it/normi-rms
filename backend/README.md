# NORMI RMS — Backend

The server for the **NORMI Research Management & Monitoring System** of Northern Mindanao Colleges, Inc.
It stores the data and answers the requests from the web app.

- The web app (frontend) is a separate repository: **normi-rms**.
- Built with Node.js, Express 5 and MongoDB (Mongoose).

## What it does

- Sign-in with email and password (passwords are stored hashed; sessions use signed tokens).
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
3. **Add the starting data** (departments, courses, rooms and demo accounts):
   ```bash
   npm run seed
   ```
4. **Start the server**
   ```bash
   npm run dev
   ```
   The server runs at http://localhost:5000, and the API is under `/api`.

### No database yet? Use the built-in test one

`node scripts/dev-mongo.js` starts a temporary in-memory MongoDB on port 27117.
Set `MONGODB_URI=mongodb://127.0.0.1:27117/normi_rms` in `.env`, then seed and start as above.
Its data disappears when you stop it.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Starts the server and restarts it when files change |
| `npm start` | Starts the server |
| `npm run seed` | Adds the starting data (safe to run again) |
| `npm run smoke-test` | Runs a quick self-check with a temporary database |

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
- The demo accounts made by `npm run seed` use simple passwords. Change or remove them before real use.
- Uploaded student files stay on the server in `uploads/` and are not part of this repository.
