import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
  message?: string;      // Custom error message
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (replace with Redis in production for multi-instance)
const rateLimitStore: Map<string, RateLimitEntry> = new Map();

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Get client identifier (IP address)
function getClientId(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
    return ips[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// Create a rate limiter middleware with specified config
export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests, message = 'Too many requests, please try again later.' } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = getClientId(req);
    const key = `${clientId}:${req.path}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired one
      entry = {
        count: 1,
        resetTime: now + windowMs
      };
      rateLimitStore.set(key, entry);
    } else {
      entry.count++;
    }

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', resetSeconds);
      return res.status(429).json({
        error: message,
        retryAfter: resetSeconds
      });
    }

    next();
  };
}

// Predefined rate limiters for different use cases

// Strict rate limit for auth endpoints (login, register)
// 5 requests per 15 minutes per IP
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many authentication attempts. Please try again in 15 minutes.'
});

// Standard API rate limit
// 100 requests per minute per IP
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: 'API rate limit exceeded. Please slow down your requests.'
});

// High-throughput rate limit for tracking endpoints (clicks)
// 1000 requests per minute per IP (to allow for redirect traffic)
export const trackingRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 1000,
  message: 'Tracking rate limit exceeded.'
});

// Very strict rate limit for postback endpoints
// 50 requests per minute per IP
export const postbackRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 50,
  message: 'Postback rate limit exceeded.'
});

// Admin endpoints - moderate rate limit
// 60 requests per minute
export const adminRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,
  message: 'Admin API rate limit exceeded.'
});

// Get current rate limit stats (for monitoring)
export function getRateLimitStats(): {
  totalEntries: number;
  activeClients: number;
  topClients: Array<{ clientId: string; requestCount: number }>;
} {
  const now = Date.now();
  const clientCounts: Map<string, number> = new Map();

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime >= now) {
      const clientId = key.split(':')[0];
      const current = clientCounts.get(clientId) || 0;
      clientCounts.set(clientId, current + entry.count);
    }
  }

  const topClients = Array.from(clientCounts.entries())
    .map(([clientId, requestCount]) => ({ clientId, requestCount }))
    .sort((a, b) => b.requestCount - a.requestCount)
    .slice(0, 10);

  return {
    totalEntries: rateLimitStore.size,
    activeClients: clientCounts.size,
    topClients
  };
}
