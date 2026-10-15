const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');
const { getCookieOptions } = require('../src/controllers/auth.controller');
const healthService = require('../src/services/health.service');
const healthRepository = require('../src/repositories/health.repository');

test('1. getCookieOptions configures SameSite=None and Secure=true in cross-site production', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalOrigin = process.env.CORS_ORIGIN;
  const originalSameSite = process.env.COOKIE_SAME_SITE;
  const originalSecure = process.env.COOKIE_SECURE;

  try {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGIN = 'https://assetflow.vercel.app';
    delete process.env.COOKIE_SAME_SITE;
    delete process.env.COOKIE_SECURE;

    const opts = getCookieOptions();
    assert.strictEqual(opts.httpOnly, true, 'HttpOnly must always be true');
    assert.strictEqual(opts.secure, true, 'Secure must be true in production');
    assert.strictEqual(opts.sameSite, 'none', 'SameSite must be none for cross-site Vercel deployment');
    assert.strictEqual(opts.path, '/', 'Path must be root');
  } finally {
    process.env.NODE_ENV = originalEnv;
    if (originalOrigin) process.env.CORS_ORIGIN = originalOrigin;
    else delete process.env.CORS_ORIGIN;
    if (originalSameSite) process.env.COOKIE_SAME_SITE = originalSameSite;
    if (originalSecure) process.env.COOKIE_SECURE = originalSecure;
  }
});

test('2. getCookieOptions defaults to SameSite=Lax and Secure=false in local development', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalSameSite = process.env.COOKIE_SAME_SITE;
  const originalSecure = process.env.COOKIE_SECURE;

  try {
    process.env.NODE_ENV = 'development';
    delete process.env.COOKIE_SAME_SITE;
    delete process.env.COOKIE_SECURE;

    const opts = getCookieOptions();
    assert.strictEqual(opts.httpOnly, true);
    assert.strictEqual(opts.secure, false, 'Secure should be false on localhost HTTP');
    assert.strictEqual(opts.sameSite, 'lax', 'SameSite should be lax for local dev');
  } finally {
    process.env.NODE_ENV = originalEnv;
    if (originalSameSite) process.env.COOKIE_SAME_SITE = originalSameSite;
    if (originalSecure) process.env.COOKIE_SECURE = originalSecure;
  }
});

test('3. getCookieOptions honors explicit COOKIE_SAME_SITE and COOKIE_SECURE environment variables', () => {
  const originalSameSite = process.env.COOKIE_SAME_SITE;
  const originalSecure = process.env.COOKIE_SECURE;

  try {
    process.env.COOKIE_SAME_SITE = 'strict';
    process.env.COOKIE_SECURE = 'true';

    const opts = getCookieOptions();
    assert.strictEqual(opts.sameSite, 'strict');
    assert.strictEqual(opts.secure, true);
  } finally {
    if (originalSameSite) process.env.COOKIE_SAME_SITE = originalSameSite;
    else delete process.env.COOKIE_SAME_SITE;
    if (originalSecure) process.env.COOKIE_SECURE = originalSecure;
    else delete process.env.COOKIE_SECURE;
  }
});

test('4. CORS middleware allows configured origin and strips trailing slash', async () => {
  const originalOrigin = process.env.CORS_ORIGIN;
  try {
    process.env.CORS_ORIGIN = 'https://assetflow.vercel.app/';

    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://assetflow.vercel.app');

    assert.strictEqual(response.headers['access-control-allow-origin'], 'https://assetflow.vercel.app');
    assert.strictEqual(response.headers['access-control-allow-credentials'], 'true');
  } finally {
    if (originalOrigin) process.env.CORS_ORIGIN = originalOrigin;
    else delete process.env.CORS_ORIGIN;
  }
});

test('5. CORS middleware supports multiple comma-separated origins', async () => {
  const originalOrigin = process.env.CORS_ORIGIN;
  try {
    process.env.CORS_ORIGIN = 'https://assetflow.vercel.app,https://preview-123.vercel.app';

    const res1 = await request(app)
      .get('/api/health')
      .set('Origin', 'https://preview-123.vercel.app');

    assert.strictEqual(res1.headers['access-control-allow-origin'], 'https://preview-123.vercel.app');

    const res2 = await request(app)
      .get('/api/health')
      .set('Origin', 'https://assetflow.vercel.app');

    assert.strictEqual(res2.headers['access-control-allow-origin'], 'https://assetflow.vercel.app');
  } finally {
    if (originalOrigin) process.env.CORS_ORIGIN = originalOrigin;
    else delete process.env.CORS_ORIGIN;
  }
});

test('6. Health check reports PostgreSQL engine name when client type is postgres', async () => {
  db.setClientType('postgres');
  const originalCheck = healthRepository.checkDatabaseHealth;

  healthRepository.checkDatabaseHealth = async () => ({
    alive: true,
    tableCount: 8,
    engine: 'PostgreSQL',
    error: null
  });

  try {
    const health = await healthService.getSystemHealth();
    assert.strictEqual(health.database.engine, 'PostgreSQL');
    assert.strictEqual(health.healthy, true);
    assert.strictEqual(health.database.tablesFound, 8);
  } finally {
    db.setClientType(null);
    healthRepository.checkDatabaseHealth = originalCheck;
  }
});

test('7. Session queries normalize SQLite DATETIME to PostgreSQL CURRENT_TIMESTAMP', () => {
  const sqliteSessionQuery =
    "SELECT s.id, s.expires_at FROM sessions s WHERE s.id = ? AND s.expires_at > DATETIME('now')";
  const pgSql = db.translateSqlForPostgres(sqliteSessionQuery);

  assert.ok(pgSql.includes('CURRENT_TIMESTAMP'), 'Must translate DATETIME("now") to CURRENT_TIMESTAMP');
  assert.ok(pgSql.includes('$1'), 'Must translate ? to $1');
  assert.ok(!pgSql.includes('?'), 'Must not leave ? placeholders');
});
