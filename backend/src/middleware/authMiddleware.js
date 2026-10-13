const { AuthService } = require('../services/auth.service');

const SESSION_COOKIE_NAME = 'session_id';

/**
 * Extracts opaque session token exclusively from the HttpOnly session cookie.
 * (Browser React frontend relies strictly on secure cookie storage to prevent XSS theft).
 */
function extractSessionToken(req) {
  if (req.cookies && req.cookies[SESSION_COOKIE_NAME]) {
    return req.cookies[SESSION_COOKIE_NAME];
  }
  return null;
}

/**
 * Middleware ensuring incoming request is authenticated by an active administrator session.
 */
async function authenticate(req, res, next) {
  try {
    const token = extractSessionToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No active session cookie provided.'
      });
    }

    // CSRF Protection for state-changing HTTP methods authenticated via cookies
    const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (stateChangingMethods.includes(req.method)) {
      const isProduction = process.env.NODE_ENV === 'production';
      const expectedOrigin = process.env.CORS_ORIGIN || (isProduction ? null : 'http://localhost:5173');

      if (isProduction && !process.env.CORS_ORIGIN) {
        return res.status(403).json({
          success: false,
          error: 'Security misconfiguration: CORS_ORIGIN is not configured in production.'
        });
      }

      const originHeader = req.headers.origin || req.headers.referer;
      if (originHeader) {
        let requestOrigin;
        try {
          requestOrigin = new URL(originHeader).origin;
        } catch {
          requestOrigin = originHeader;
        }

        if (requestOrigin !== expectedOrigin) {
          return res.status(403).json({
            success: false,
            error: 'Cross-site request blocked (CSRF validation failure).'
          });
        }
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
