const { AuthService } = require('../services/auth.service');

const SESSION_COOKIE_NAME = 'session_id';

/**
 * Extracts session token from HTTP request cookies or Authorization header.
 */
function extractSessionToken(req) {
  // 1. Check HttpOnly cookie
  if (req.cookies && req.cookies[SESSION_COOKIE_NAME]) {
    return { token: req.cookies[SESSION_COOKIE_NAME], source: 'cookie' };
  }

  // 2. Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return { token: authHeader.slice(7).trim(), source: 'header' };
  }

  return { token: null, source: null };
}

/**
 * Middleware ensuring incoming request is authenticated by an active administrator session.
 */
async function authenticate(req, res, next) {
  try {
    const { token, source } = extractSessionToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No active session provided.'
      });
    }

    // CSRF Protection for state-changing HTTP methods authenticated via cookies
    const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (source === 'cookie' && stateChangingMethods.includes(req.method)) {
      const origin = req.headers.origin || req.headers.referer;
      const expectedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
      
      // If origin header is present, verify against configured CORS origin
      if (origin && !origin.startsWith(expectedOrigin)) {
        return res.status(403).json({
          success: false,
          error: 'Cross-site request blocked (CSRF validation failure).'
        });
      }
    }

    const admin = await AuthService.getProfile(token);
    req.admin = admin;
    req.sessionId = token;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: err.message || 'Session expired or invalid.'
    });
  }
}

/**
 * Middleware ensuring authenticated administrator holds a specific role.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }
    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden. You do not possess the required administrative permissions.'
      });
    }
    next();
  };
}

module.exports = {
  authenticate,
  requireRole,
  SESSION_COOKIE_NAME
};
