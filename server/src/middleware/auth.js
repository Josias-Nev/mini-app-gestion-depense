const jwt = require('jsonwebtoken');

const JWT_SECRET =
  process.env.JWT_SECRET || 'dev-secret-change-me-in-production';
const TOKEN_COOKIE = 'token';
const TOKEN_TTL = '7d';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 jours en ms

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
}

function setAuthCookie(res, token) {
  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie(TOKEN_COOKIE, { path: '/' });
}

/** Middleware : exige un utilisateur authentifié (cookie httpOnly ou Bearer). */
function requireAuth(req, res, next) {
  let token = req.cookies?.[TOKEN_COOKIE];
  const header = req.headers.authorization;
  if (!token && header && header.startsWith('Bearer ')) {
    token = header.slice(7);
  }
  if (!token) {
    return res.status(401).json({ error: { message: 'Authentification requise.' } });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: { message: 'Session invalide ou expirée.' } });
  }
}

module.exports = { signToken, setAuthCookie, clearAuthCookie, requireAuth, TOKEN_COOKIE };
