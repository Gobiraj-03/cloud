require('dotenv').config();
const app = require('./src/app');
const db = require('./src/config/database');

const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Verify database connection on startup based on active engine
const clientType = db.getClientType();
if (clientType === 'postgres') {
  console.log('[Server] Target database engine: PostgreSQL (Connection pooling active)');
  db.getPool();
  db.isAlive()
    .then((alive) => {
      if (alive) {
        console.log('[Server] PostgreSQL database connection ping verified.');
      } else {
        console.warn('[Server] Warning: PostgreSQL ping returned false on startup. Check network or credentials.');
      }
    })
    .catch((err) => {
      console.error('[Server] Warning: PostgreSQL startup verification failed:', err.message);
    });
} else {
  console.log(`[Server] Target database engine: SQLite 3 (${db.resolveDbPath()})`);
  db.getDb();
}

const server = app.listen(PORT, HOST, () => {
  console.log(`[Server] IT Asset Lifecycle Backend running on http://${HOST}:${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Server] Database engine: ${clientType.toUpperCase()}`);
});

// Graceful shutdown handling for container & hosting platforms (SIGINT / SIGTERM)
let isShuttingDown = false;

function handleShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);

  // Hard stop timeout if in-flight connections fail to terminate cleanly within 10s
  const forceTimer = setTimeout(() => {
    console.error('[Server] Graceful shutdown timed out after 10s. Forcing exit.');
    process.exit(1);
  }, 10000);
  forceTimer.unref();

  server.close(async () => {
    try {
      await db.close();
      console.log('[Server] HTTP server and database connections closed cleanly.');
      process.exit(0);
    } catch (err) {
      console.error('[Server] Error while closing database connection:', err.message);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

module.exports = server;
