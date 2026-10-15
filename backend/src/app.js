const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const employeeRoutes = require('./routes/employee.routes');
const assetRoutes = require('./routes/asset.routes');
const licenseRoutes = require('./routes/license.routes');
const expiryRoutes = require('./routes/expiry.routes');
const reportRoutes = require('./routes/report.routes');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

const app = express();

// Trust reverse proxy (e.g. AWS App Runner, ALB, CloudFront) for correct client IP & HTTPS detection
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction || process.env.TRUST_PROXY) {
  const hops = process.env.TRUST_PROXY ? (parseInt(process.env.TRUST_PROXY, 10) || 1) : 1;
  app.set('trust proxy', hops);
}

// Security and utility middleware: Strict CORS origin validation
// Supports single origin, multiple comma-separated origins, and trailing slash normalization
function getAllowedOrigins() {
  const raw = process.env.CORS_ORIGIN;
  if (!raw) {
    return isProduction ? [] : ['http://localhost:5173'];
  }
  return raw
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

app.use(cors({
  origin: function (origin, callback) {
    // Non-browser requests without origin header (e.g., automated tests, server health checks)
    if (!origin) return callback(null, true);

    const allowedOrigins = getAllowedOrigins();

    if (isProduction && allowedOrigins.length === 0) {
      return callback(new Error('CORS misconfiguration: CORS_ORIGIN must be explicitly defined in production.'));
    }

    const normalizedOrigin = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
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
app.use('/api/licenses', licenseRoutes);
app.use('/api/expiry', expiryRoutes);
app.use('/api/reports', reportRoutes);

// Catch-all 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
