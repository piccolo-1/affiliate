import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || 'dev-csrf-secret';
const TOKEN_LENGTH = 32;
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface CSRFToken {
  token: string;
  expires: number;
}

// In-memory token store (for production, consider Redis)
const tokenStore = new Map<string, CSRFToken>();

// Cleanup expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tokenStore.entries()) {
    if (now > value.expires) {
      tokenStore.delete(key);
    }
  }
}, 60000); // Every minute

function generateToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

function createTokenHash(token: string, sessionId: string): string {
  return crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(`${token}:${sessionId}`)
    .digest('hex');
}

export function csrfToken(req: Request, res: Response, next: NextFunction) {
  // Get or create session identifier from cookie
  let sessionId = req.cookies['session_id'];

  if (!sessionId) {
    sessionId = crypto.randomBytes(16).toString('hex');
    res.cookie('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
  }

  // Generate CSRF token
  const token = generateToken();
  const hash = createTokenHash(token, sessionId);

  tokenStore.set(hash, {
    token,
    expires: Date.now() + TOKEN_EXPIRY
  });

  // Attach token to response
  res.locals.csrfToken = token;

  next();
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF check for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip CSRF for API token auth (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // Get session ID
  const sessionId = req.cookies['session_id'];
  if (!sessionId) {
    return res.status(403).json({ error: 'Missing session' });
  }

  // Get CSRF token from request
  const token =
    req.headers['x-csrf-token'] as string ||
    req.headers['x-xsrf-token'] as string ||
    req.body?._csrf ||
    req.query?._csrf as string;

  if (!token) {
    return res.status(403).json({ error: 'Missing CSRF token' });
  }

  // Validate token
  const hash = createTokenHash(token, sessionId);
  const storedToken = tokenStore.get(hash);

  if (!storedToken || Date.now() > storedToken.expires) {
    return res.status(403).json({ error: 'Invalid or expired CSRF token' });
  }

  // Token is valid, delete it (one-time use) and continue
  tokenStore.delete(hash);

  next();
}

// Middleware to send CSRF token in response header
export function sendCsrfToken(req: Request, res: Response, next: NextFunction) {
  if (res.locals.csrfToken) {
    res.setHeader('X-CSRF-Token', res.locals.csrfToken);
  }
  next();
}

// Endpoint to get a new CSRF token
export function getCsrfTokenHandler(req: Request, res: Response) {
  res.json({ csrfToken: res.locals.csrfToken });
}
