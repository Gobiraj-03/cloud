/**
 * Centralized error handling and 404 middleware.
 */

function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

function globalErrorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log error details locally without exposing secrets
  console.error(`[Error] ${req.method} ${req.originalUrl} - Status ${status}:`, err.message);

  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
}

module.exports = {
  notFoundHandler,
  globalErrorHandler
};
