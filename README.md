# NORMI RMS — Research Management & Monitoring System

A web system for **Northern Mindanao Colleges, Inc.** that helps students, advisers, panel members,
coordinators and admins handle thesis and capstone work in one place: sending research papers,
adviser feedback, defense scheduling, panel scoring, and a searchable research repository.

This repository holds the **whole system**, in two folders:

| Folder | What it is | Built with |
|---|---|---|
| [`frontend/`](frontend) | The website people use in their browser | React, TypeScript, Vite, Tailwind CSS |
| [`backend/`](backend) | The server that stores the data and checks who may do what | Node.js, Express, MongoDB |

```
Browser  ──►  frontend (port 3000)  ──►  backend (port 5000)  ──►  MongoDB
```

## Who uses it

| Who | What they can do |
|---|---|
| **Student** | Send a research paper, read adviser feedback, upload new versions, see their defense date and panel |
| **Adviser** | See student groups, read papers, give chapter-by-chapter feedback, approve or ask for changes |
| **Coordinator** | Set defense dates, rooms and panels (warns about double-booking), post announcements |
| **Panel Member** | See assigned defenses, read the defense copy, score each defense |
| **Admin** | Manage accounts, view all defenses, back up and restore data |

## Run the whole system on your computer

You need [Node.js](https://nodejs.org) and a MongoDB database (a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works). Open **two** terminal windows.

**Window 1: the backend**
```bash
cd backend
npm install
```
Copy `.env.example` to `.env` and fill in your database address and a long random secret. Then:
```bash
npm run seed            # adds departments, courses, school years and rooms
npm run create-admin    # creates the first Admin (asks for a name, email and password)
npm run dev             # starts the server on http://localhost:5000
```

**Window 2: the frontend**
```bash
cd frontend
npm install
```
Copy `.env.example` to `.env.local` (the default address already points to the backend). Then:
```bash
npm run dev             # opens the website on http://localhost:3000
```

Open http://localhost:3000 and sign in as the Admin. Add everyone else from **Manage Accounts**.
There is no public sign-up: only an Admin can create accounts.

The backend's `CLIENT_URL` setting must be the address you open in the browser, otherwise the browser
blocks the requests.

### Trying it out (testing only)

- `npm run test-accounts` (in `backend`) creates one account for each role, for example
  `test.student@normi.edu.ph`, with a random password shown once. **Delete these accounts before real use.**
- `node scripts/dev-mongo.js` (in `backend`) starts a temporary database on your computer, so you can
  test without Atlas. Its data disappears when you stop it. Set
  `MONGODB_URI=mongodb://127.0.0.1:27117/normi_rms` in `.env` to use it.

More detail is in each folder's own README: [`frontend/README.md`](frontend/README.md) and
[`backend/README.md`](backend/README.md).

## Keep it safe

- Never upload a `.env` file. It holds your database address and secret key.
  Both folders already ignore it.
- Use a strong password for the Admin, and delete any test accounts before real use.
- Uploaded student files stay on the server in `backend/uploads/` and are not stored in Git.
- Uploaded files are private: they open only through a short link that the server gives to people who are allowed to see that file
  (see the security notes in `backend/README.md`). Students can only read published papers and their own files.
