// Throwaway local verification script — boots an in-memory MongoDB (no Atlas needed),
// starts the real Express app against it, and exercises the core flows end-to-end:
// login -> create research -> upload version -> adviser approve ->
// coordinator schedule -> panelist evaluate -> admin audit log.
// Run with: node scripts/smoke-test.js
require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-test-secret';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const http = require('http');
const User = require('../src/models/User');

let failures = 0;

function assert(cond, label) {
  if (cond) {
    console.log(`  OK   ${label}`);
  } else {
    console.log(`  FAIL ${label}`);
    failures++;
  }
}

async function request(server, method, path, body, token) {
  const port = server.address().port;
  const data = body ? JSON.stringify(body) : null;
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let json;
          try { json = raw ? JSON.parse(raw) : null; } catch { json = raw; }
          resolve({ status: res.statusCode, body: json, headers: res.headers });
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('In-memory MongoDB connected:', process.env.MONGODB_URI);

  const app = require('../src/server');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  console.log('App server listening on port', server.address().port);

  // Seed lookup data
  const Department = require('../src/models/Department');
  const Course = require('../src/models/Course');
  const SchoolYear = require('../src/models/SchoolYear');
  const Room = require('../src/models/Room');

  const dept = await Department.create({ name: 'College of Computing Studies', code: 'CCS' });
  const course = await Course.create({ departmentId: dept._id, name: 'BS Information Technology', code: 'BSIT' });
  const schoolYear = await SchoolYear.create({ name: '2025-2026', isCurrent: true });
  const room = await Room.create({ name: 'Room 301', location: 'Main Building', capacity: 20 });

  console.log('\n--- Health check ---');
  const health = await request(server, 'GET', '/api/health');
  assert(health.status === 200 && health.body.status === 'ok', 'GET /api/health returns ok');

  // There is no public sign-up: an Admin creates accounts. The test makes its users directly,
  // then signs each one in through the real login route to get a token.
  async function makeUser(fields, password) {
    await User.create({ ...fields, password, status: 'active' });
    const login = await request(server, 'POST', '/api/auth/login', { email: fields.email, password });
    return { token: login.body.token, id: login.body.user && login.body.user.id };
  }

  console.log('\n--- Auth: login ---');
  const adviser = await makeUser({ email: 'adviser@test.local', name: 'Dr. Test Adviser', role: 'adviser', departmentId: dept._id }, 'adviser-pass-1');
  assert(!!adviser.token, 'adviser can sign in -> token');
  const adviserToken = adviser.token;
  const adviserId = adviser.id;

  const student = await makeUser({ email: 'student@test.local', name: 'Test Student', role: 'student', departmentId: dept._id, courseId: course._id }, 'student-pass-1');
  assert(!!student.token, 'student can sign in -> token');
  const studentToken = student.token;

  const panelistTokens = [];
  for (let i = 1; i <= 3; i++) {
    panelistTokens.push(await makeUser({ email: `panelist${i}@test.local`, name: `Panelist Number ${i}`, role: 'panelist', departmentId: dept._id }, 'panel-pass-1'));
  }
  assert(panelistTokens.every((p) => p.token), '3 panelists can sign in -> tokens issued');

  const coordinatorToken = (await makeUser({ email: 'coordinator@test.local', name: 'Coordinator Test', role: 'coordinator', departmentId: dept._id }, 'coord-pass-1')).token;
  const adminAcc = await makeUser({ email: 'admin@test.local', name: 'Test Admin', role: 'admin' }, 'admin-pass-1');
  const adminToken = adminAcc.token;

  const badLogin = await request(server, 'POST', '/api/auth/login', { email: 'student@test.local', password: 'wrong' });
  assert(badLogin.status === 401, 'login with wrong password -> 401');

  const me = await request(server, 'GET', '/api/auth/me', null, studentToken);
  assert(me.status === 200 && me.body.user.email === 'student@test.local', 'GET /api/auth/me returns the right user');

  console.log('\n--- Security ---');
  const openSignUp = await request(server, 'POST', '/api/auth/register', { email: 'hacker@test.local', password: 'password123', name: 'Hacker', role: 'admin' });
  assert(openSignUp.status === 404, 'public sign-up is closed (POST /api/auth/register -> 404)');
  const noHacker = await User.findOne({ email: 'hacker@test.local' });
  assert(!noHacker, 'no account was created by the closed sign-up');

  const studentListsUsers = await request(server, 'GET', '/api/users', null, studentToken);
  assert(studentListsUsers.status === 403, 'a student cannot list all accounts -> 403');

  console.log('\n--- Admin sets a new password ---');
  const shortPw = await request(server, 'PATCH', `/api/users/${student.id}`, { password: 'short' }, adminToken);
  assert(shortPw.status === 400, 'a password under 8 characters is refused -> 400');
  const studentTriesReset = await request(server, 'PATCH', `/api/users/${student.id}`, { password: 'sneaky-new-pass' }, studentToken);
  assert(studentTriesReset.status === 403, 'a student cannot reset passwords -> 403');
  const reset = await request(server, 'PATCH', `/api/users/${student.id}`, { password: 'student-pass-2' }, adminToken);
  assert(reset.status === 200, 'admin can set a new password -> 200');
  const oldPw = await request(server, 'POST', '/api/auth/login', { email: 'student@test.local', password: 'student-pass-1' });
  assert(oldPw.status === 401, 'the old password stops working -> 401');
  const newPw = await request(server, 'POST', '/api/auth/login', { email: 'student@test.local', password: 'student-pass-2' });
  assert(newPw.status === 200 && !!newPw.body.token, 'the new password works -> 200');

  console.log('\n--- Admin publishes a finished paper with its PDF ---');
  const published = await request(server, 'POST', '/api/research/archived', {
    title: 'A Finished Paper', abstract: 'Already defended.', departmentId: dept._id, courseId: course._id,
    schoolYearId: schoolYear._id, adviserId, keywords: ['test'],
    proposalFiles: [{ name: 'finished.pdf', url: 'http://localhost/uploads/finished.pdf', size: 1234, category: 'proposal_document' }],
  }, adminToken);
  assert(published.status === 201, 'admin publishes a finished paper -> 201');
  assert(Array.isArray(published.body.proposalFiles) && published.body.proposalFiles.length === 1, 'the PDF is saved with the paper');
  const studentPublishes = await request(server, 'POST', '/api/research/archived', { title: 'x' }, studentToken);
  assert(studentPublishes.status === 403, 'a student cannot publish to the Repository -> 403');

  // Panelist availability for every day (so the auto-scheduler always has candidates)
  console.log('\n--- Panel availability ---');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (const p of panelistTokens) {
    for (const day of days) {
      await request(server, 'POST', '/api/panel-availability', { panelistId: p.id, dayOfWeek: day, startTime: '08:00', endTime: '17:00', isAvailable: true }, adminToken);
    }
  }
  const avail = await request(server, 'GET', '/api/panel-availability', null, adminToken);
  assert(avail.status === 200 && avail.body.length === 21, 'seeded 3 panelists x 7 days of availability');

  console.log('\n--- Research lifecycle ---');
  const createRes = await request(server, 'POST', '/api/research', {
    title: 'AI-Powered Campus Navigation System', abstract: 'A capstone project abstract.', keywords: ['ai', 'navigation'],
    adviserId, fileName: 'proposal-v1.pdf',
  }, studentToken);
  assert(createRes.status === 201 && createRes.body.status === 'Submitted', 'student creates research proposal -> Submitted');
  const researchId = createRes.body.id;

  const forbiddenCreate = await request(server, 'POST', '/api/research', { title: 'x', abstract: 'y', adviserId }, adviserToken);
  assert(forbiddenCreate.status === 403, 'adviser cannot create a research proposal (role-gated) -> 403');

  const approve = await request(server, 'POST', `/api/research/${researchId}/approve`, { decision: 'Approve' }, adviserToken);
  assert(approve.status === 200 && approve.body.status === 'Approved by Adviser', 'adviser approves manuscript -> Approved by Adviser');

  const notifs = await request(server, 'GET', '/api/notifications', null, studentToken);
  assert(notifs.status === 200 && notifs.body.some((n) => n.title === 'Manuscript Vetted'), 'student received approval notification');

  console.log('\n--- Scheduling ---');
  const schedule = await request(server, 'POST', '/api/schedules', {
    researchId, date: '2026-08-20', startTime: '09:00', endTime: '10:30', roomId: room._id,
    panelistIds: panelistTokens.map((p) => p.id), type: 'proposal',
  }, coordinatorToken);
  assert(schedule.status === 201, 'coordinator manually schedules defense -> 201');

  const researchAfterSchedule = await request(server, 'GET', `/api/research/${researchId}`, null, studentToken);
  assert(researchAfterSchedule.body.status === 'Scheduled', 'research status flips to Scheduled');

  console.log('\n--- Auto-scheduler (second research group) ---');
  const secondStudent = await makeUser({ email: 'student2@test.local', name: 'Second Student', role: 'student', departmentId: dept._id, courseId: course._id }, 'student-pass-3');
  const secondCreate = await request(server, 'POST', '/api/research', {
    title: 'Blockchain-Based Voting System', abstract: 'Another abstract.', adviserId, fileName: 'proposal2.pdf',
  }, secondStudent.token);
  await request(server, 'POST', `/api/research/${secondCreate.body.id}/approve`, { decision: 'Approve' }, adviserToken);

  const autoGen = await request(server, 'POST', '/api/schedules/auto-generate', {}, coordinatorToken);
  assert(autoGen.status === 200 && Array.isArray(autoGen.body.scheduled), 'auto-generate endpoint returns a schedule + logs');
  assert(autoGen.body.scheduled.length === 1, 'auto-generate schedules exactly the 1 remaining eligible research group');

  console.log('\n--- Evaluation ---');
  const evaluation = await request(server, 'POST', '/api/evaluations', {
    scheduleId: schedule.body.id, score1: 18, score2: 28, score3: 27, score4: 18, comment: 'Solid defense.', recommendation: 'Passed',
  }, panelistTokens[0].token);
  assert(evaluation.status === 201 && evaluation.body.totalScore === 91, 'panelist submits evaluation, totalScore computed server-side');

  const finalResearch = await request(server, 'GET', `/api/research/${researchId}`, null, studentToken);
  assert(finalResearch.body.status === 'Completed', 'research status flips to Completed after a Passed evaluation');

  console.log('\n--- Admin: audit logs + RBAC ---');
  const auditLogs = await request(server, 'GET', '/api/audit-logs', null, adminToken);
  assert(auditLogs.status === 200 && auditLogs.body.length > 0, 'admin can list audit logs');

  const forbiddenAudit = await request(server, 'GET', '/api/audit-logs', null, studentToken);
  assert(forbiddenAudit.status === 403, 'student is forbidden from audit logs (RBAC) -> 403');

  const noToken = await request(server, 'GET', '/api/notifications');
  assert(noToken.status === 401, 'unauthenticated request -> 401');

  console.log('\n--- File upload ---');
  async function uploadAs(token, fileName, content) {
    const boundary = '----smoketestboundary';
    const multipartBody =
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/pdf\r\n\r\n${content}\r\n--${boundary}--\r\n`;
    return new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: 'localhost', port: server.address().port, path: '/api/uploads', method: 'POST',
          headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': Buffer.byteLength(multipartBody), Authorization: `Bearer ${token}` } },
        (res) => { let raw = ''; res.on('data', (c) => (raw += c)); res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) })); },
      );
      req.on('error', reject);
      req.write(multipartBody);
      req.end();
    });
  }
  const uploadResult = await uploadAs(studentToken, 'manuscript.pdf', '%PDF-1.4 the student draft (private)');
  assert(uploadResult.status === 201 && uploadResult.body.url.startsWith('uploads/'), 'real file upload via multer -> 201 + uploads/ url');

  console.log('\n--- Uploaded files are private ---');
  // Attach the student's file to their paper as a draft for the adviser.
  const attach = await request(server, 'POST', `/api/research/${researchId}/versions`, {
    title: 'Draft with file', abstract: 'x', fileName: 'manuscript.pdf', fileUrl: uploadResult.body.url, type: 'adviser_check',
  }, studentToken);
  assert(attach.status === 201, 'student attaches the file to their paper as a draft');
  const draftFile = uploadResult.body.url.replace('uploads/', '');

  const openWithoutLink = await request(server, 'GET', `/uploads/${draftFile}`);
  assert(openWithoutLink.status === 401, 'the file address alone (no link) is refused -> 401');
  const openFakeLink = await request(server, 'GET', `/uploads/${draftFile}?ft=not-a-real-link`);
  assert(openFakeLink.status === 401, 'a made-up link is refused -> 401');
  const asksNoSignIn = await request(server, 'POST', '/api/uploads/access', { file: draftFile });
  assert(asksNoSignIn.status === 401, 'asking for a link without signing in -> 401');

  const strangerAsks = await request(server, 'POST', '/api/uploads/access', { file: draftFile }, secondStudent.token);
  assert(strangerAsks.status === 403, 'a student from another group cannot get a link to the draft -> 403');
  const strangerPanelist = await request(server, 'POST', '/api/uploads/access', { file: draftFile }, panelistTokens[0].token);
  assert(strangerPanelist.status === 403, 'a panel member cannot get a link to an adviser draft -> 403');

  const ownerLink = await request(server, 'POST', '/api/uploads/access', { file: draftFile, mode: 'view' }, studentToken);
  assert(ownerLink.status === 200 && ownerLink.body.path.startsWith(`/uploads/${draftFile}?ft=`), 'the student who uploaded it gets a link -> 200');
  const ownerOpen = await request(server, 'GET', ownerLink.body.path);
  assert(ownerOpen.status === 200 && String(ownerOpen.body).includes('the student draft'), 'the link opens the real file -> 200 with the content');
  assert(String(ownerOpen.headers['cache-control']).includes('no-store'), 'the file is not cached (private, no-store)');
  assert(String(ownerOpen.headers['content-disposition']) === 'inline', 'a "view" link shows the file inline');

  const adviserLink = await request(server, 'POST', '/api/uploads/access', { file: `http://localhost:5001/${uploadResult.body.url}` }, adviserToken);
  assert(adviserLink.status === 200, 'the adviser of that group gets a link (even from a full web address) -> 200');
  const coordLink = await request(server, 'POST', '/api/uploads/access', { file: draftFile }, coordinatorToken);
  assert(coordLink.status === 200, 'the coordinator gets a link -> 200');
  const adminLink = await request(server, 'POST', '/api/uploads/access', { file: draftFile, mode: 'download', name: 'My Paper.pdf' }, adminToken);
  assert(adminLink.status === 200, 'the admin gets a link -> 200');
  const adminDownload = await request(server, 'GET', adminLink.body.path);
  assert(String(adminDownload.headers['content-disposition']).startsWith('attachment;'), 'a "download" link downloads the file');

  // A link is for ONE file only.
  const otherUpload = await uploadAs(adminToken, 'other.pdf', '%PDF-1.4 a different file');
  const otherFile = otherUpload.body.url.replace('uploads/', '');
  const wrongFile = await request(server, 'GET', `/uploads/${otherFile}?ft=${ownerLink.body.path.split('ft=')[1]}`);
  assert(wrongFile.status === 403, 'a link for one file does not open another file -> 403');

  // Tricks with folders must not reach anything outside uploads.
  const sneaky = await request(server, 'POST', '/api/uploads/access', { file: '../../.env' }, adminToken);
  assert(sneaky.status === 404 || sneaky.status === 400, 'asking for "../../.env" gets nothing -> ' + sneaky.status);
  const sneakyGet = await request(server, 'GET', '/uploads/..%2f..%2fpackage.json?ft=x');
  assert(sneakyGet.status === 404 || sneakyGet.status === 401, 'a folder trick in the address gets nothing -> ' + sneakyGet.status);

  // A PUBLISHED paper's main file is readable by any signed-in person; drafts are not.
  const publishedWithFile = await request(server, 'POST', '/api/research/archived', {
    title: 'Published With Real File', abstract: 'Done.', departmentId: dept._id, courseId: course._id, schoolYearId: schoolYear._id,
    adviserId, keywords: ['x'],
    proposalFiles: [{ name: 'other.pdf', url: otherUpload.body.url, size: 10, category: 'proposal_document' }],
  }, adminToken);
  assert(publishedWithFile.status === 201, 'admin publishes a paper with the second file');
  const publicRead = await request(server, 'POST', '/api/uploads/access', { file: otherFile }, secondStudent.token);
  assert(publicRead.status === 200, 'any signed-in student can read a PUBLISHED paper\'s file -> 200');
  const stillPrivate = await request(server, 'POST', '/api/uploads/access', { file: draftFile }, secondStudent.token);
  assert(stillPrivate.status === 403, 'the same student still cannot read the private draft -> 403');

  server.close();
  await mongoose.disconnect();
  await mongod.stop();

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
