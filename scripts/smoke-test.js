// Throwaway local verification script — boots an in-memory MongoDB (no Atlas needed),
// starts the real Express app against it, and exercises the core flows end-to-end:
// register -> login -> create research -> upload version -> adviser approve ->
// coordinator schedule -> panelist evaluate -> admin audit log.
// Run with: node scripts/smoke-test.js
require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-test-secret';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const http = require('http');

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
          resolve({ status: res.statusCode, body: json });
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
  await SchoolYear.create({ name: '2025-2026', isCurrent: true });
  const room = await Room.create({ name: 'Room 301', location: 'Main Building', capacity: 20 });

  console.log('\n--- Health check ---');
  const health = await request(server, 'GET', '/api/health');
  assert(health.status === 200 && health.body.status === 'ok', 'GET /api/health returns ok');

  console.log('\n--- Auth: register + login ---');
  const adviserReg = await request(server, 'POST', '/api/auth/register', {
    email: 'adviser@normi.edu.ph', password: 'adviser123', name: 'Dr. John Dumalag', role: 'adviser', departmentId: dept._id,
  });
  assert(adviserReg.status === 201 && adviserReg.body.token, 'register adviser -> 201 + token');
  const adviserToken = adviserReg.body.token;
  const adviserId = adviserReg.body.user.id;

  const studentReg = await request(server, 'POST', '/api/auth/register', {
    email: 'student@normi.edu.ph', password: 'student123', name: 'Juan Dela Cruz', role: 'student', departmentId: dept._id, courseId: course._id,
  });
  assert(studentReg.status === 201, 'register student -> 201');
  const studentToken = studentReg.body.token;

  const panelistTokens = [];
  for (let i = 1; i <= 3; i++) {
    const reg = await request(server, 'POST', '/api/auth/register', {
      email: `panelist${i}@normi.edu.ph`, password: 'panel123', name: `Panelist Number ${i}`, role: 'panelist', departmentId: dept._id,
    });
    panelistTokens.push({ token: reg.body.token, id: reg.body.user.id });
  }
  assert(panelistTokens.every((p) => p.token), 'register 3 panelists -> tokens issued');

  const coordinatorReg = await request(server, 'POST', '/api/auth/register', {
    email: 'coordinator@normi.edu.ph', password: 'coord123', name: 'Coordinator Reyes', role: 'coordinator', departmentId: dept._id,
  });
  const coordinatorToken = coordinatorReg.body.token;

  const adminReg = await request(server, 'POST', '/api/auth/register', {
    email: 'admin@normi.edu.ph', password: 'admin123', name: 'Super Admin', role: 'admin', departmentId: dept._id,
  });
  const adminToken = adminReg.body.token;

  const badLogin = await request(server, 'POST', '/api/auth/login', { email: 'student@normi.edu.ph', password: 'wrong' });
  assert(badLogin.status === 401, 'login with wrong password -> 401');

  const goodLogin = await request(server, 'POST', '/api/auth/login', { email: 'student@normi.edu.ph', password: 'student123' });
  assert(goodLogin.status === 200 && goodLogin.body.token, 'login with correct password -> 200 + token');

  const me = await request(server, 'GET', '/api/auth/me', null, studentToken);
  assert(me.status === 200 && me.body.user.email === 'student@normi.edu.ph', 'GET /api/auth/me returns the right user');

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
  const secondStudentReg = await request(server, 'POST', '/api/auth/register', {
    email: 'student2@normi.edu.ph', password: 'student123', name: 'Maria Santos', role: 'student', departmentId: dept._id, courseId: course._id,
  });
  const secondCreate = await request(server, 'POST', '/api/research', {
    title: 'Blockchain-Based Voting System', abstract: 'Another abstract.', adviserId, fileName: 'proposal2.pdf',
  }, secondStudentReg.body.token);
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
  const boundary = '----smoketestboundary';
  const fileContent = '%PDF-1.4 fake pdf content for smoke test';
  const multipartBody =
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="manuscript.pdf"\r\nContent-Type: application/pdf\r\n\r\n${fileContent}\r\n--${boundary}--\r\n`;
  const uploadResult = await new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: 'localhost', port: server.address().port, path: '/api/uploads', method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': Buffer.byteLength(multipartBody), Authorization: `Bearer ${studentToken}` } },
      (res) => { let raw = ''; res.on('data', (c) => (raw += c)); res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) })); },
    );
    req.on('error', reject);
    req.write(multipartBody);
    req.end();
  });
  assert(uploadResult.status === 201 && uploadResult.body.url.startsWith('uploads/'), 'real file upload via multer -> 201 + uploads/ url');

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
