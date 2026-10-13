const { AuthService } = require('../services/auth.service');
const { SESSION_COOKIE_NAME } = require('../middleware/authMiddleware');

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
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

    // Set secure HttpOnly session cookie
    res.cookie(SESSION_COOKIE_NAME, result.sessionToken, getCookieOptions());

    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      data: {
        token: result.sessionToken,
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

    // Clear session cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/'
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
  getCurrentUser
};
