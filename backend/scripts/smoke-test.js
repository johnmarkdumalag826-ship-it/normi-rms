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
const mailer = require('../src/utils/mailer');

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

  // No real SMTP server in this test environment: capture what would have been emailed instead.
  const sentEmails = [];
  mailer.sendMail = async (opts) => { sentEmails.push(opts); };

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

  // Nobody, not even an Admin, creates accounts directly any more — people register themselves
  // and get approved. The test makes its users directly (bypassing that), then signs each one
  // in through the real login route to get a token.
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
  const adminSignUp = await request(server, 'POST', '/api/auth/register', { email: 'hacker@test.local', password: 'password123', name: 'Hacker', role: 'admin' });
  assert(adminSignUp.status === 400, 'nobody can sign up as an Admin -> 400');
  assert(!(await User.findOne({ email: 'hacker@test.local' })), 'no account was created for the Admin sign-up');

  const shortSignUp = await request(server, 'POST', '/api/auth/register', { email: 'short@test.local', password: '123', name: 'Short', role: 'student' });
  assert(shortSignUp.status === 400, 'sign-up with a short password -> 400');

  const signUpNoDept = await request(server, 'POST', '/api/auth/register', { email: 'nodept@test.local', password: 'new-student-1', name: 'No Dept', role: 'student' });
  assert(signUpNoDept.status === 400, 'a student cannot register without a department and course -> 400');

  const otherDept = await Department.create({ name: 'College of Business', code: 'CB' });
  const wrongCourse = await Course.create({ departmentId: otherDept._id, name: 'BS Accountancy', code: 'BSA' });
  const signUpMismatch = await request(server, 'POST', '/api/auth/register', {
    email: 'mismatch@test.local', password: 'new-student-1', name: 'Mismatch', role: 'student', departmentId: dept._id, courseId: wrongCourse._id,
  });
  assert(signUpMismatch.status === 400, "a course from a different department is refused -> 400");

  const signUp = await request(server, 'POST', '/api/auth/register', {
    email: 'new.student@test.local', password: 'new-student-1', name: 'New Student', role: 'student', departmentId: dept._id, courseId: course._id,
  });
  assert(signUp.status === 201, 'a new student can ask for an account, with a department and course -> 201');
  const created = await User.findOne({ email: 'new.student@test.local' });
  assert(created && created.status === 'pending', 'the new account starts as "pending"');
  assert(String(created.departmentId) === String(dept._id) && String(created.courseId) === String(course._id), "their department and course are saved");
  const dup = await request(server, 'POST', '/api/auth/register', { email: 'new.student@test.local', password: 'new-student-1', name: 'New Student', role: 'student' });
  assert(dup.status === 409, 'signing up twice with the same email -> 409');
  const pendingLogin = await request(server, 'POST', '/api/auth/login', { email: 'new.student@test.local', password: 'new-student-1' });
  assert(pendingLogin.status === 403, 'a pending account cannot sign in yet -> 403');
  const pendingDir = await request(server, 'GET', '/api/users/directory', null, studentToken);
  assert(!JSON.stringify(pendingDir.body).includes('new.student@test.local'), 'a pending account is not listed in the directory');
  const approveUser = await request(server, 'PATCH', `/api/users/${created._id}`, { status: 'active' }, adminToken);
  assert(approveUser.status === 200, 'an Admin can approve the account');
  const afterApprove = await request(server, 'POST', '/api/auth/login', { email: 'new.student@test.local', password: 'new-student-1' });
  assert(afterApprove.status === 200, 'after approval the person can sign in');

  const studentListsUsers = await request(server, 'GET', '/api/users', null, studentToken);
  assert(studentListsUsers.status === 403, 'a student cannot list all accounts -> 403');

  console.log('\n--- Nobody creates accounts directly; only registration + approval ---');
  const noCreateUser = await request(server, 'POST', '/api/users', { email: 'direct@test.local', password: 'password123', name: 'Direct', role: 'student' }, adminToken);
  assert(noCreateUser.status === 404, 'even an Admin cannot create an account directly -> 404');
  const noDirectAccount = await User.findOne({ email: 'direct@test.local' });
  assert(!noDirectAccount, 'no account was created by that attempt');

  console.log('\n--- Only the person can set their own password ---');
  const adminTriesDirectly = await request(server, 'PATCH', `/api/users/${student.id}`, { password: 'sneaky-new-pass' }, adminToken);
  assert(adminTriesDirectly.status === 200, "PATCH /api/users/:id with a password field is silently ignored, not rejected");
  const stillOldPw = await request(server, 'POST', '/api/auth/login', { email: 'student@test.local', password: 'student-pass-1' });
  assert(stillOldPw.status === 200, "the student's real password still works — the admin could not set it directly");

  const noForceReset = await request(server, 'POST', `/api/users/${student.id}/force-password-reset`, {}, adminToken);
  assert(noForceReset.status === 404, 'there is no admin-triggered password reset -> 404');

  const wrongCurrent = await request(server, 'PATCH', '/api/auth/change-password', { currentPassword: 'not-the-real-one', newPassword: 'student-pass-2' }, studentToken);
  assert(wrongCurrent.status === 401, 'changing your password with the wrong current password is refused -> 401');

  const shortNewPw = await request(server, 'PATCH', '/api/auth/change-password', { currentPassword: 'student-pass-1', newPassword: 'short' }, studentToken);
  assert(shortNewPw.status === 400, 'a new password under 8 characters is refused -> 400');

  const setOwnPassword = await request(server, 'PATCH', '/api/auth/change-password', { currentPassword: 'student-pass-1', newPassword: 'student-pass-2' }, studentToken);
  assert(setOwnPassword.status === 200, 'the student changes their own password -> 200');

  const oldPwGone = await request(server, 'POST', '/api/auth/login', { email: 'student@test.local', password: 'student-pass-1' });
  assert(oldPwGone.status === 401, 'the old password stops working once changed -> 401');

  const newPw = await request(server, 'POST', '/api/auth/login', { email: 'student@test.local', password: 'student-pass-2' });
  assert(newPw.status === 200 && !!newPw.body.token, "the student's own new password works -> 200");

  console.log('\n--- Forgot password: a 6-digit code emailed to the account owner ---');
  const missingEmail = await request(server, 'POST', '/api/auth/forgot-password', {});
  assert(missingEmail.status === 400, 'asking with no email is refused -> 400');

  const unknownEmail = await request(server, 'POST', '/api/auth/forgot-password', { email: 'nobody-here@test.local' });
  assert(unknownEmail.status === 200, 'an email with no account still gets a 200 (not a 404)');
  assert(sentEmails.length === 0, 'no email is actually sent for an unknown address');

  const knownEmail = await request(server, 'POST', '/api/auth/forgot-password', { email: 'student@test.local' });
  assert(knownEmail.status === 200, 'an email with an account gets a 200');
  assert(knownEmail.body.message === unknownEmail.body.message, 'the response is worded the same either way, so it cannot be used to check who has an account');
  assert(sentEmails.length === 1 && sentEmails[0].to === 'student@test.local', 'exactly one email goes out, to the account owner');

  const firstCode = sentEmails[0].text.match(/\d{6}/)[0];

  const wrongCode = await request(server, 'POST', '/api/auth/reset-password', { email: 'student@test.local', code: '000000', newPassword: 'brand-new-pass' });
  assert(wrongCode.status === 400, 'the wrong code is refused -> 400');

  const shortAfterCode = await request(server, 'POST', '/api/auth/reset-password', { email: 'student@test.local', code: firstCode, newPassword: 'short' });
  assert(shortAfterCode.status === 400, 'a new password under 8 characters is refused even with the right code -> 400');

  const doReset = await request(server, 'POST', '/api/auth/reset-password', { email: 'student@test.local', code: firstCode, newPassword: 'student-pass-3' });
  assert(doReset.status === 200, 'the right code sets a new password -> 200');

  const oldPwGoneAfterReset = await request(server, 'POST', '/api/auth/login', { email: 'student@test.local', password: 'student-pass-2' });
  assert(oldPwGoneAfterReset.status === 401, 'the old password stops working once reset');
  const newPwFromReset = await request(server, 'POST', '/api/auth/login', { email: 'student@test.local', password: 'student-pass-3' });
  assert(newPwFromReset.status === 200, 'signing in with the emailed-code password works');

  const reuseCode = await request(server, 'POST', '/api/auth/reset-password', { email: 'student@test.local', code: firstCode, newPassword: 'another-pass-1' });
  assert(reuseCode.status === 400, 'a code cannot be used twice -> 400');

  sentEmails.length = 0;
  await request(server, 'POST', '/api/auth/forgot-password', { email: 'student@test.local' });
  const expiredCode = sentEmails[0].text.match(/\d{6}/)[0];
  const expiredUser = await User.findOne({ email: 'student@test.local' });
  expiredUser.resetCodeExpires = new Date(Date.now() - 1000);
  await expiredUser.save({ validateBeforeSave: false });
  const useExpired = await request(server, 'POST', '/api/auth/reset-password', { email: 'student@test.local', code: expiredCode, newPassword: 'student-pass-4' });
  assert(useExpired.status === 400, 'an expired code is refused, even if correct -> 400');

  sentEmails.length = 0;
  await request(server, 'POST', '/api/auth/forgot-password', { email: 'student@test.local' });
  const lockoutCode = sentEmails[0].text.match(/\d{6}/)[0];
  for (let i = 0; i < 5; i++) {
    await request(server, 'POST', '/api/auth/reset-password', { email: 'student@test.local', code: '111111', newPassword: 'student-pass-5' });
  }
  const lockedOut = await request(server, 'POST', '/api/auth/reset-password', { email: 'student@test.local', code: lockoutCode, newPassword: 'student-pass-5' });
  assert(lockedOut.status === 429, 'after enough wrong tries, even the right code is refused until a fresh one is sent -> 429');

  console.log('\n--- A signed-in person can edit their own name and phone ---');
  const noAuthEdit = await request(server, 'PATCH', '/api/auth/me', { name: 'Nope' });
  assert(noAuthEdit.status === 401, 'editing your own profile requires signing in -> 401');
  const emptyName = await request(server, 'PATCH', '/api/auth/me', { name: '   ' }, studentToken);
  assert(emptyName.status === 400, 'an empty name is refused -> 400');
  const editedMe = await request(server, 'PATCH', '/api/auth/me', { name: 'Renamed Student', phone: '0917-555-0000' }, studentToken);
  assert(editedMe.status === 200 && editedMe.body.user.name === 'Renamed Student' && editedMe.body.user.phone === '0917-555-0000', 'name and phone are saved -> 200');
  assert(editedMe.body.user.role === 'student' && editedMe.body.user.email === 'student@test.local', "this does not touch role or email");
  const meAfter = await request(server, 'GET', '/api/auth/me', null, studentToken);
  assert(meAfter.body.user.name === 'Renamed Student', 'the new name sticks on the next request');

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

  console.log('\n--- A new title proposal\'s Version 1 uses the real uploaded file ---');
  const mainDocUpload = await uploadAs(secondStudent.token, 'real-main-doc.pdf', '%PDF-1.4 a real main document');
  assert(mainDocUpload.status === 201, 'the main document is uploaded before submitting the title -> 201');
  const proposalWithFile = await request(server, 'POST', '/api/research', {
    title: 'Real File Test', abstract: 'Checks Version 1 points at the real upload, not a fabricated path.', adviserId,
    fileName: 'real-main-doc.pdf',
    members: ['Juan dela Cruz', '  Maria Santos  ', '', 42],
    proposalFiles: [{
      id: 'pf-1', name: 'real-main-doc.pdf', url: mainDocUpload.body.url, size: mainDocUpload.body.size,
      uploadedAt: new Date().toISOString(), category: 'proposal_document',
    }],
  }, secondStudent.token);
  assert(proposalWithFile.status === 201, 'student submits a title with a real uploaded main document -> 201');
  assert(
    JSON.stringify(proposalWithFile.body.memberNames) === JSON.stringify(['Juan dela Cruz', 'Maria Santos', '42']),
    'the group members typed on the form are saved (trimmed, blanks dropped)',
  );
  assert(proposalWithFile.body.studentIds.length === 1, 'the person who sends the paper is the one group leader account');
  const proposalVersions = await request(server, 'GET', `/api/research/${proposalWithFile.body.id}/versions`, null, secondStudent.token);
  const v1 = proposalVersions.body[0];
  assert(v1 && v1.fileUrl === mainDocUpload.body.url, "Version 1's fileUrl is the real uploaded file's url, not a fabricated 'manuscripts/' path");
  const v1Access = await request(server, 'POST', '/api/uploads/access', { file: v1.fileUrl }, secondStudent.token);
  assert(v1Access.status === 200, 'that file is actually openable, end to end -> 200');

  console.log('\n--- A title hearing is a defense type that does not move the paper along ---');
  const hearingPaperId = proposalWithFile.body.id; // still "Submitted": the adviser has not reviewed it
  const hearingBody = {
    researchId: hearingPaperId, date: '2026-08-25', startTime: '09:00', endTime: '10:00', roomId: room._id,
    panelistIds: panelistTokens.map((p) => p.id), type: 'title_hearing',
  };
  const badType = await request(server, 'POST', '/api/schedules', { ...hearingBody, type: 'made-up' }, coordinatorToken);
  assert(badType.status === 400, 'an unknown defense type is refused -> 400');
  const hearing = await request(server, 'POST', '/api/schedules', hearingBody, coordinatorToken);
  assert(hearing.status === 201 && hearing.body.type === 'title_hearing', 'coordinator schedules a Title Hearing -> 201');
  const afterHearing = await request(server, 'GET', `/api/research/${hearingPaperId}`, null, secondStudent.token);
  assert(afterHearing.body.status === 'Submitted', 'a Title Hearing does not change the paper\'s status (not "Scheduled")');
  await request(server, 'PATCH', `/api/schedules/${hearing.body.id}/cancel`, null, coordinatorToken);
  const afterCancel = await request(server, 'GET', `/api/research/${hearingPaperId}`, null, secondStudent.token);
  assert(afterCancel.body.status === 'Submitted', 'cancelling a Title Hearing does not mark the paper "Approved by Adviser"');

  console.log('\n--- Starting as a group: register, send the prepared titles, then the title proposal ---');
  const leader = await makeUser({ email: 'student3@test.local', name: 'Group Leader', role: 'student', departmentId: dept._id, courseId: course._id }, 'student-pass-4');
  const noAdviser = await request(server, 'POST', '/api/research', { groupName: 'Team Alpha' }, leader.token);
  assert(noAdviser.status === 400, 'registering a group without choosing an adviser is refused -> 400');
  const noName = await request(server, 'POST', '/api/research', { adviserId }, leader.token);
  assert(noName.status === 400, 'registering a group without a group name is refused -> 400');

  const group = await request(server, 'POST', '/api/research', {
    groupName: '  Team Alpha  ', adviserId, members: ['Ana Reyes', '  Ben Cruz  ', ''],
  }, leader.token);
  assert(group.status === 201 && group.body.status === 'Group Registered', 'a group registers with only a name, an adviser and members -> 201 "Group Registered"');
  assert(group.body.groupName === 'Team Alpha' && group.body.title === '' && group.body.abstract === '', 'the group has a trimmed name and no title or summary yet');
  assert(JSON.stringify(group.body.memberNames) === JSON.stringify(['Ana Reyes', 'Ben Cruz']), 'the member names are saved');
  const groupVersions = await request(server, 'GET', `/api/research/${group.body.id}/versions`, null, leader.token);
  assert(Array.isArray(groupVersions.body) && groupVersions.body.length === 0, 'no version exists until the title proposal is sent');

  const titlesUpload = await uploadAs(leader.token, 'my-titles.pdf', '%PDF-1.4 three titles we prepared');
  const sendTitles = await request(server, 'POST', `/api/research/${group.body.id}/title-list`, {
    name: 'my-titles.pdf', url: titlesUpload.body.url, size: titlesUpload.body.size,
  }, leader.token);
  const titleFiles = (sendTitles.body.proposalFiles || []).filter((f) => f.category === 'title_list');
  assert(sendTitles.status === 200 && titleFiles.length === 1, 'the group sends its prepared titles file -> 200');
  assert(sendTitles.body.status === 'Group Registered', 'sending the titles file does not change the status');

  const otherOwner = await request(server, 'POST', `/api/research/${group.body.id}/title-list`, {
    name: 'stolen.pdf', url: mainDocUpload.body.url, size: 10,
  }, leader.token);
  assert(otherOwner.status === 400, "a file someone else uploaded cannot be attached as the group's titles -> 400");
  const otherGroupSends = await request(server, 'POST', `/api/research/${group.body.id}/title-list`, {
    name: 'x.pdf', url: mainDocUpload.body.url, size: 10,
  }, secondStudent.token);
  assert(otherGroupSends.status === 403, 'a student from another group cannot send titles for this group -> 403');

  const titlesAdviser = await request(server, 'POST', '/api/uploads/access', { file: titlesUpload.body.url }, adviserToken);
  assert(titlesAdviser.status === 200, "the group's adviser can open the titles file -> 200");
  const titlesOutsider = await request(server, 'POST', '/api/uploads/access', { file: titlesUpload.body.url }, secondStudent.token);
  assert(titlesOutsider.status === 403, 'a student from another group cannot open it -> 403');

  const titlesUpload2 = await uploadAs(leader.token, 'my-titles-v2.pdf', '%PDF-1.4 better titles');
  const resend = await request(server, 'POST', `/api/research/${group.body.id}/title-list`, {
    name: 'my-titles-v2.pdf', url: titlesUpload2.body.url, size: titlesUpload2.body.size,
  }, leader.token);
  const afterResend = (resend.body.proposalFiles || []).filter((f) => f.category === 'title_list');
  assert(afterResend.length === 1 && afterResend[0].name === 'my-titles-v2.pdf', 'sending the titles file again replaces the earlier one');

  const hearingForGroup = await request(server, 'POST', '/api/schedules', {
    researchId: group.body.id, date: '2026-08-26', startTime: '09:00', endTime: '10:00', roomId: room._id,
    panelistIds: panelistTokens.map((p) => p.id), type: 'title_hearing',
  }, coordinatorToken);
  assert(hearingForGroup.status === 201, 'a title hearing can be booked for a group that has not sent a title proposal');
  const panelOpens = await request(server, 'POST', '/api/uploads/access', { file: titlesUpload2.body.url }, panelistTokens[0].token);
  assert(panelOpens.status === 200, 'a panel member booked for the hearing can open the titles file -> 200');
  const groupAfterHearing = await request(server, 'GET', `/api/research/${group.body.id}`, null, leader.token);
  assert(groupAfterHearing.body.status === 'Group Registered', 'booking the hearing keeps the group "Group Registered"');
  const approveEmpty = await request(server, 'POST', `/api/research/${group.body.id}/approve`, { decision: 'Approve' }, adviserToken);
  assert(approveEmpty.status === 409, 'an adviser cannot approve a group that has not sent its title proposal -> 409');

  // The adviser checks the prepared titles
  const reviewPath = `/api/research/${group.body.id}/title-list/review`;
  assert(resend.body.titleReview && resend.body.titleReview.status === 'Pending', 'a newly sent titles file starts as "Pending" the adviser\'s check');
  const coordReview = await request(server, 'POST', reviewPath, { decision: 'Approve' }, coordinatorToken);
  assert(coordReview.status === 403, 'only an adviser can check the titles -> 403');
  const noNote = await request(server, 'POST', reviewPath, { decision: 'Revision' }, adviserToken);
  assert(noNote.status === 400, 'asking for changes without saying what to change is refused -> 400');
  const badDecision = await request(server, 'POST', reviewPath, { decision: 'maybe' }, adviserToken);
  assert(badDecision.status === 400, 'an unknown decision is refused -> 400');
  const noTitlesYet = await request(server, 'POST', `/api/research/${researchId}/title-list/review`, { decision: 'Approve' }, adviserToken);
  assert(noTitlesYet.status === 409, 'a group that sent no titles file cannot have it checked -> 409');
  const askChanges = await request(server, 'POST', reviewPath, { decision: 'Revision', feedback: '  Please add two more titles.  ' }, adviserToken);
  assert(askChanges.status === 200 && askChanges.body.titleReview.status === 'Revision Required' && askChanges.body.titleReview.feedback === 'Please add two more titles.', 'the adviser asks for changes with a note -> 200');
  const titlesUpload3 = await uploadAs(leader.token, 'my-titles-v3.pdf', '%PDF-1.4 two more titles');
  const resend3 = await request(server, 'POST', `/api/research/${group.body.id}/title-list`, {
    name: 'my-titles-v3.pdf', url: titlesUpload3.body.url, size: titlesUpload3.body.size,
  }, leader.token);
  assert(resend3.body.titleReview.status === 'Pending' && !resend3.body.titleReview.feedback, 'sending a new file puts it back to "Pending" and clears the old note');
  const approveTitles = await request(server, 'POST', reviewPath, { decision: 'Approve' }, adviserToken);
  assert(approveTitles.status === 200 && approveTitles.body.titleReview.status === 'Approved', 'the adviser approves the titles -> 200');

  const mainForGroup = await uploadAs(leader.token, 'proposal-main.pdf', '%PDF-1.4 the title proposal');
  const proposalBody = {
    title: 'Chosen Title', abstract: 'The title the panel picked.', keywords: ['one', ' two '],
    proposalFiles: [{ name: 'proposal-main.pdf', url: mainForGroup.body.url, size: mainForGroup.body.size, category: 'proposal_document' }],
  };
  const noTitle = await request(server, 'POST', `/api/research/${group.body.id}/title-proposal`, { ...proposalBody, title: '' }, leader.token);
  assert(noTitle.status === 400, 'a title proposal without a title is refused -> 400');
  const noMain = await request(server, 'POST', `/api/research/${group.body.id}/title-proposal`, { ...proposalBody, proposalFiles: [] }, leader.token);
  assert(noMain.status === 400, 'a title proposal without a main document is refused -> 400');
  const notMember = await request(server, 'POST', `/api/research/${group.body.id}/title-proposal`, proposalBody, secondStudent.token);
  assert(notMember.status === 403, 'only the group can send its title proposal -> 403');

  const sent = await request(server, 'POST', `/api/research/${group.body.id}/title-proposal`, proposalBody, leader.token);
  assert(sent.status === 200 && sent.body.status === 'Submitted' && sent.body.title === 'Chosen Title', 'the group sends its title proposal -> "Submitted"');
  assert(JSON.stringify(sent.body.keywords) === JSON.stringify(['one', 'two']), 'the keywords are saved trimmed');
  assert((sent.body.proposalFiles || []).some((f) => f.category === 'title_list'), 'the titles file is kept after the proposal is sent');
  const sentVersions = await request(server, 'GET', `/api/research/${group.body.id}/versions`, null, leader.token);
  assert(sentVersions.body.length === 1 && sentVersions.body[0].fileUrl === mainForGroup.body.url, "Version 1 is made from the proposal's real main document");
  const sentTwice = await request(server, 'POST', `/api/research/${group.body.id}/title-proposal`, proposalBody, leader.token);
  assert(sentTwice.status === 409, 'the title proposal cannot be sent a second time -> 409');

  console.log('\n--- Uploaded files are private ---');
  // Attach the student's file to their paper as a draft for the adviser.
  const attach = await request(server, 'POST', `/api/research/${researchId}/versions`, {
    title: 'Draft with file', abstract: 'x', fileName: 'manuscript.pdf', fileUrl: uploadResult.body.url, type: 'adviser_check',
  }, studentToken);
  assert(attach.status === 201, 'student attaches the file to their paper as a draft');
  const draftFile = uploadResult.body.url.replace('uploads/', '');

  console.log('\n--- Highlighted comments ---');
  const draftId = attach.body.id;
  const pdfAnchor = { kind: 'pdf', page: 1, rects: [{ x: 0.1, y: 0.2, w: 0.4, h: 0.02 }], quote: 'a highlighted sentence' };
  const wordAnchor = { kind: 'docx', start: 10, end: 40, quote: 'another highlighted sentence' };
  const c1 = await request(server, 'POST', `/api/research/${researchId}/comments`, { versionId: draftId, text: 'Add a source here', anchor: pdfAnchor }, adviserToken);
  assert(c1.status === 201 && c1.body.anchor && c1.body.anchor.page === 1, 'adviser comments on highlighted PDF text -> anchor is saved');
  const c2 = await request(server, 'POST', `/api/research/${researchId}/comments`, { versionId: draftId, text: 'Explain this', anchor: wordAnchor }, adviserToken);
  assert(c2.status === 201 && c2.body.anchor && c2.body.anchor.kind === 'docx', 'adviser comments on highlighted Word text -> anchor is saved');
  const c3 = await request(server, 'POST', `/api/research/${researchId}/comments`, { versionId: draftId, text: 'A normal comment' }, studentToken);
  assert(c3.status === 201 && !c3.body.anchor, 'a comment without a highlight still works');
  const badAnchor = await request(server, 'POST', `/api/research/${researchId}/comments`, { versionId: draftId, text: 'x', anchor: { kind: 'pdf', page: 0, rects: [] } }, adviserToken);
  assert(badAnchor.status === 400, 'a broken highlight is refused -> 400');
  const hugeAnchor = await request(server, 'POST', `/api/research/${researchId}/comments`, { versionId: draftId, text: 'x', anchor: { kind: 'docx', start: 5, end: 2, quote: 'x' } }, adviserToken);
  assert(hugeAnchor.status === 400, 'a highlight that ends before it starts is refused -> 400');
  const outsider = await request(server, 'POST', `/api/research/${researchId}/comments`, { versionId: draftId, text: 'hello' }, secondStudent.token);
  assert(outsider.status === 403, 'a student from another group cannot comment on this paper -> 403');
  const listed = await request(server, 'GET', `/api/comments?researchId=${researchId}`, null, studentToken);
  assert(listed.status === 200 && listed.body.filter((c) => c.anchor).length === 2, 'the student can read the highlighted comments');

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
