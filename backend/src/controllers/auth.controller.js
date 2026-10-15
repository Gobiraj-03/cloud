const { AuthService } = require('../services/auth.service');
const { SESSION_COOKIE_NAME } = require('../middleware/authMiddleware');

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  // Cross-site cookie configuration for separated frontend (Vercel) and backend (AWS App Runner)
  // When CORS_ORIGIN is configured in production or COOKIE_SAME_SITE is specified,
  // SameSite=None + Secure=true is used so cookies are transmitted across origins.
  // When running in same-site mode without CORS_ORIGIN, SameSite=Lax is preserved.
  let sameSiteSetting = 'lax';
  if (process.env.COOKIE_SAME_SITE) {
    sameSiteSetting = process.env.COOKIE_SAME_SITE.toLowerCase();
  } else if (isProduction && process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.startsWith('https://')) {
    sameSiteSetting = 'none';
  }

  const secureSetting = process.env.COOKIE_SECURE !== undefined
    ? process.env.COOKIE_SECURE === 'true'
    : (isProduction || sameSiteSetting === 'none');

  return {
    httpOnly: true,
    secure: secureSetting,
    sameSite: sameSiteSetting,
    path: '/',
    maxAge: 8 * 3600 * 1000 // 8 hours in milliseconds
  };
}

/**
 * Handles administrator authentication.
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { username, email, identifier, password } = req.body;
    // Support username, email, or identifier field
    const loginIdentifier = identifier || username || email;

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || null;

    const result = await AuthService.login({
      identifier: loginIdentifier,
      password,
      ipAddress,
      userAgent
    });

    // Set secure HttpOnly session cookie - token is kept EXCLUSIVELY in the cookie
    res.cookie(SESSION_COOKIE_NAME, result.sessionToken, getCookieOptions());

    // Do NOT return the raw session token in JSON; return only success and profile
    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      data: {
        administrator: result.administrator
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles administrator logout and session invalidation.
 * POST /api/auth/logout
 */
async function logout(req, res, next) {
  try {
    const sessionToken = req.sessionId || (req.cookies && req.cookies[SESSION_COOKIE_NAME]);
    const adminId = req.admin ? req.admin.id : null;
    const ipAddress = req.ip || req.connection.remoteAddress;

    await AuthService.logout({ sessionToken, adminId, ipAddress });

    // Clear session cookie using identical options
    const cookieOpts = getCookieOptions();
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Returns current authenticated administrator profile.
 * GET /api/auth/me
 */
async function getCurrentUser(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      data: {
        administrator: req.admin
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  logout,
  getCurrentUser,
  getCookieOptions
};
