const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const employeeRoutes = require('./routes/employee.routes');
const assetRoutes = require('./routes/asset.routes');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

const app = express();

// Security and utility middleware: Strict CORS origin validation
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigin = process.env.CORS_ORIGIN || (isProduction ? null : 'http://localhost:5173');

app.use(cors({
  origin: function (origin, callback) {
    // Non-browser requests without origin header (e.g., automated tests, server health checks)
    if (!origin) return callback(null, true);

    if (isProduction && !process.env.CORS_ORIGIN) {
      return callback(new Error('CORS misconfiguration: CORS_ORIGIN must be explicitly defined in production.'));
    }

    if (origin === allowedOrigin) {
      return callback(null, true);
    }

    const corsError = new Error(`Origin '${origin}' blocked by CORS policy.`);
    corsError.statusCode = 403;
    return callback(corsError);
  },
  credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Development request logger (non-sensitive)
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/assets', assetRoutes);

// Catch-all 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
