require('dotenv').config();
const app = require('./src/app');
const db = require('./src/config/database');

const PORT = process.env.PORT || 5000;

// Verify database connection on startup
db.getDb();

const server = app.listen(PORT, () => {
  console.log(`[Server] IT Asset Lifecycle Backend running on http://localhost:${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Server] Database target: ${db.resolveDbPath()}`);
});

// Graceful shutdown handling
function handleShutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Closing HTTP server and database...`);
  server.close(async () => {
    try {
      await db.close();
      console.log('[Server] Database connection closed cleanly.');
      process.exit(0);
    } catch (err) {
      console.error('[Server] Error closing database:', err.message);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

module.exports = server;
