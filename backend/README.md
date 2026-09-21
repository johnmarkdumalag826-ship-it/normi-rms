# NORMI RMS — Backend

The server for the **NORMI Research Management & Monitoring System** of Northern Mindanao Colleges, Inc.
It stores the data and answers the requests from the web app.

- The web app (frontend) is in the [`../frontend`](../frontend) folder. See the [main README](../README.md) for how to run both together.
- Built with Node.js, Express 5 and MongoDB (Mongoose).

## What it does

- Sign-in with email and password (passwords are stored hashed; sessions use signed tokens). Anyone can register (`POST /api/auth/register`), but it starts as "pending" and cannot sign in until an Admin approves it. Nobody can sign up as an Admin. An Admin can also create accounts directly and set a new password for someone who forgot theirs.
- Role-based access for students, advisers, coordinators, panel members and admins.
- Research papers, versions, chapter feedback and comments.
- Defense scheduling with rooms and panels, and panel scoring.
- Announcements, notifications, consultations, an audit log, and private file uploads (PDF and Word).

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

### Using MongoDB Atlas (the permanent, real database)

Atlas keeps your data in the cloud, so it stays when you restart the computer. The free plan is enough for this project.

1. Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free **M0** cluster (choose a region close to you, for example Singapore).
2. **Database Access** → **Add New Database User**. Choose a user name and a password with **letters and numbers only** (symbols like `@` or `#` break the address). Give it "Read and write to any database".
3. **Network Access** → **Add IP Address** → **Allow access from anywhere** (fine while testing; use your server's address for real use).
4. **Database** → **Connect** → **Drivers**. Copy the address. It looks like
   `mongodb+srv://USER:PASSWORD@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`.
5. Open `backend/.env` in Notepad and set `MONGODB_URI` to that address, replacing `USER` and `PASSWORD`, and adding the database name
   before the `?`: `...mongodb.net/normi_rms?retryWrites=true&w=majority`.
6. Check it, then add the starting data and the first Admin:
   ```bash
   npm run db:check      # shows where it connected and how many records each collection has
   npm run seed          # departments, courses, school years, rooms
   npm run create-admin  # your first Admin
   ```

**Looking at the data**
- In Atlas: **Database** → **Browse Collections** → choose `normi_rms`. You can read every collection there.
- On your computer: `npm run db:check` (all collections and counts) and `npm run db:view -- users` (the records of one collection).
  Passwords are never shown.
- Optional: [MongoDB Compass](https://www.mongodb.com/products/tools/compass) is a free desktop app for browsing the same data.

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
| `npm run db:check` | Shows which database is connected and how many records each collection has |
| `npm run db:view -- <collection>` | Shows the records of one collection (passwords hidden) |
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
- Sign-up only makes a "pending" account (student, adviser, panelist or coordinator, never admin) and is limited to 10 requests per hour per address. An Admin approves it before it can sign in.
- Delete any test accounts before real use.
- Uploaded files stay on the server in `uploads/` and are not part of this repository.
- Uploaded files are **private**. The website asks `POST /api/uploads/access` for a short link (valid about 10 minutes, for
  one file) and only people allowed to see that file get one:
  - Admin: every file. Coordinator: every paper file and version.
  - Adviser: the papers and versions of their own student groups.
  - Student: their own group's files, their own uploads, and **published** papers (status Completed or Archived).
  - Panel Member: defense copies of papers they are scheduled for, and published papers.
  - Anyone signed in: the main file of a published paper.
  The file address on its own (`/uploads/name.pdf`) returns 401. Set `JWT_SECRET` to a strong value: file links are signed with a key made from it.
