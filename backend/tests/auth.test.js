process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const request = require('supertest');
const bcrypt = require('bcryptjs');

const app = require('../src/app');
const db = require('../src/config/database');
const { migrate } = require('../src/db/migrate');
const { validatePassword } = require('../src/scripts/createAdmin');

const TEST_DB_PATH = path.resolve(__dirname, '../../data/test_auth_db.db');
process.env.DB_PATH = TEST_DB_PATH;

const TEST_ADMIN = {
  username: 'testsecadmin',
  email: 'secadmin@enterprise.local',
  password: 'AdminPassword123!',
  fullName: 'Security Test Administrator'
};

let activeSessionToken = null;
let testAdminId = null;

test.before(async () => {
  process.env.DB_PATH = TEST_DB_PATH;
  await db.close();
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  await migrate(TEST_DB_PATH);

  // Seed test administrator with verified bcrypt hash
  const hash = await bcrypt.hash(TEST_ADMIN.password, 10);
  const result = await db.run(
    `INSERT INTO administrators (username, email, password_hash, full_name, role)
     VALUES (?, ?, ?, ?, 'SUPERADMIN')`,
    [TEST_ADMIN.username, TEST_ADMIN.email, hash, TEST_ADMIN.fullName]
  );
  testAdminId = result.lastID;
});

test.after(async () => {
  await db.close();
  if (fs.existsSync(TEST_DB_PATH)) {
    try {
      fs.unlinkSync(TEST_DB_PATH);
    } catch {
      // ignore unlink error
    }
  }
});

// ---------------------------------------------------------------------------
// 1. Password Policy Tests
// ---------------------------------------------------------------------------
test('1. Password policy enforces minimum length and complexity', () => {
  assert.ok(validatePassword('short'), 'Should reject passwords shorter than 8 chars');
  assert.ok(validatePassword('nouppernumberhere'), 'Should reject passwords lacking number/symbol');
  assert.strictEqual(validatePassword('ValidPass123!'), null, 'Should accept compliant passwords');
});

// ---------------------------------------------------------------------------
// 2. Login Tests
// ---------------------------------------------------------------------------
test('2. POST /api/auth/login succeeds with valid username and password', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      username: TEST_ADMIN.username,
      password: TEST_ADMIN.password
    })
    .expect('Content-Type', /json/)
    .expect(200);

  const body = response.body;
  assert.strictEqual(body.success, true);
  assert.ok(body.data.token, 'Must return session token');
  assert.strictEqual(body.data.administrator.username, TEST_ADMIN.username);
  assert.strictEqual(body.data.administrator.email, TEST_ADMIN.email);
  assert.strictEqual(body.data.administrator.password_hash, undefined, 'Must NEVER return password_hash');

  // Verify Set-Cookie header contains HttpOnly session_id
  const setCookie = response.headers['set-cookie'];
  assert.ok(setCookie, 'Must set session cookie');
  assert.ok(setCookie.some((c) => c.includes('session_id=')), 'Cookie must contain session_id');
  assert.ok(setCookie.some((c) => c.includes('HttpOnly')), 'Cookie must be HttpOnly');

  activeSessionToken = body.data.token;

  // Verify audit log recorded LOGIN_SUCCESS
  const log = await db.get(
    "SELECT * FROM audit_logs WHERE action = 'LOGIN_SUCCESS' AND admin_id = ? ORDER BY id DESC LIMIT 1",
    [testAdminId]
  );
  assert.ok(log, 'Must create audit log entry for successful login');
  assert.strictEqual(log.entity_type, 'AUTH');
});

test('3. POST /api/auth/login succeeds with email identifier (case-insensitive)', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      identifier: TEST_ADMIN.email.toUpperCase(),
      password: TEST_ADMIN.password
    })
    .expect(200);

  assert.strictEqual(response.body.success, true);
  assert.strictEqual(response.body.data.administrator.email, TEST_ADMIN.email);
});

test('4. POST /api/auth/login rejects invalid password with generic 401 error', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      username: TEST_ADMIN.username,
      password: 'WrongPassword999!'
    })
    .expect(401);

  assert.strictEqual(response.body.success, false);
  assert.strictEqual(response.body.error, 'Invalid username/email or password.');

  // Verify audit log recorded LOGIN_FAILED
  const log = await db.get(
    "SELECT * FROM audit_logs WHERE action = 'LOGIN_FAILED' ORDER BY id DESC LIMIT 1"
  );
  assert.ok(log, 'Must create audit log entry for failed login');
});

test('5. POST /api/auth/login rejects nonexistent user with identical generic 401 error', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'nonexistent_ghost_admin',
      password: 'SomePassword123!'
    })
    .expect(401);

  assert.strictEqual(response.body.success, false);
  assert.strictEqual(response.body.error, 'Invalid username/email or password.');
});

test('6. POST /api/auth/login returns 400 Bad Request on missing fields', async () => {
  const missingPassword = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin' })
    .expect(400);
  assert.strictEqual(missingPassword.body.success, false);

  const missingUser = await request(app)
    .post('/api/auth/login')
    .send({ password: 'password123' })
    .expect(400);
  assert.strictEqual(missingUser.body.success, false);
});

// ---------------------------------------------------------------------------
// 3. Protected Route & Profile Verification Tests
// ---------------------------------------------------------------------------
test('7. GET /api/auth/me returns profile using cookie session', async () => {
  const response = await request(app)
    .get('/api/auth/me')
    .set('Cookie', [`session_id=${activeSessionToken}`])
    .expect(200);

  const admin = response.body.data.administrator;
  assert.strictEqual(admin.username, TEST_ADMIN.username);
  assert.strictEqual(admin.email, TEST_ADMIN.email);
  assert.strictEqual(admin.password_hash, undefined);
});

test('8. GET /api/auth/me returns profile using Authorization Bearer header', async () => {
  const response = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${activeSessionToken}`)
    .expect(200);

  assert.strictEqual(response.body.data.administrator.username, TEST_ADMIN.username);
});

test('9. GET /api/auth/me returns 401 Unauthorized when unauthenticated', async () => {
  const response = await request(app)
    .get('/api/auth/me')
    .expect(401);

  assert.strictEqual(response.body.success, false);
  assert.ok(response.body.error.includes('Authentication required'));
});

test('10. GET /api/auth/verify protects arbitrary routes from unauthenticated access', async () => {
  // Without token -> 401
  await request(app)
    .get('/api/auth/verify')
    .expect(401);

  // With token -> 200
  const authed = await request(app)
    .get('/api/auth/verify')
    .set('Authorization', `Bearer ${activeSessionToken}`)
    .expect(200);

  assert.strictEqual(authed.body.success, true);
  assert.ok(authed.body.message.includes('Access granted'));
});

// ---------------------------------------------------------------------------
// 4. Session Expiration & CSRF Tests
// ---------------------------------------------------------------------------
test('11. Protected routes reject expired sessions', async () => {
  // Insert an expired session manually into test DB
  const expiredToken = 'expired_test_session_token_1234567890';
  await db.run(
    `INSERT INTO sessions (id, admin_id, expires_at)
     VALUES (?, ?, DATETIME('now', '-1 hour'))`,
    [expiredToken, testAdminId]
  );

  const response = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${expiredToken}`)
    .expect(401);

  assert.strictEqual(response.body.success, false);
  assert.ok(response.body.error.includes('expired or invalid'));
});

test('12. Cookie-based state-changing requests block cross-site CSRF origins', async () => {
  const response = await request(app)
    .post('/api/auth/logout')
    .set('Cookie', [`session_id=${activeSessionToken}`])
    .set('Origin', 'http://malicious-attacker-site.com')
    .expect(403);

  assert.strictEqual(response.body.success, false);
  assert.ok(response.body.error.includes('Cross-site request blocked'));
});

// ---------------------------------------------------------------------------
// 5. Logout Tests
// ---------------------------------------------------------------------------
test('13. POST /api/auth/logout invalidates session and prevents reuse', async () => {
  // Perform logout
  const response = await request(app)
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${activeSessionToken}`)
    .expect(200);

  assert.strictEqual(response.body.success, true);

  // Verify session removed from sessions table in DB
  const sessionInDb = await db.get('SELECT * FROM sessions WHERE id = ?', [activeSessionToken]);
  assert.strictEqual(sessionInDb, undefined, 'Session must be deleted from sessions table');

  // Verify subsequent request with the logged-out token returns 401
  await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${activeSessionToken}`)
    .expect(401);
});
