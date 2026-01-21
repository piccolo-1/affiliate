import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

import { initializeDatabase } from './database/schema';
import authRoutes from './routes/auth';
import trackingRoutes from './routes/tracking';
import affiliateRoutes from './routes/affiliate';
import offerRoutes from './routes/offers';
import conversionRoutes from './routes/conversions';
import statsRoutes from './routes/stats';
import adminRoutes from './routes/admin';
import postbackRoutes from './routes/postback';
import { apiRateLimiter } from './middleware/rateLimiter';
import { csrfToken, csrfProtection, sendCsrfToken, getCsrfTokenHandler } from './middleware/csrf';

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Initialize database
initializeDatabase();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// CSRF protection for browser-based requests
app.use(csrfToken);
app.use(sendCsrfToken);

// API rate limiting (applied to all API routes)
app.use('/api', apiRateLimiter);

// Trust proxy for accurate IP detection
app.set('trust proxy', true);

// Health check (no rate limit)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// CSRF token endpoint
app.get('/api/csrf-token', getCsrfTokenHandler);

// Apply CSRF protection to state-changing API routes
app.use('/api/auth', csrfProtection, authRoutes);
app.use('/api/affiliate', csrfProtection, affiliateRoutes);
app.use('/api/offers', csrfProtection, offerRoutes);
app.use('/api/conversions', csrfProtection, conversionRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', csrfProtection, adminRoutes);

// Tracking Routes (public)
app.use('/track', trackingRoutes);
app.use('/postback', postbackRoutes);

// Serve click redirect (short tracking links)
app.use('/c', trackingRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Affiliate Network Server running on port ${PORT}`);
  console.log(`📊 Tracking endpoint: http://localhost:${PORT}/track`);
  console.log(`🔗 Click redirect: http://localhost:${PORT}/c/{short_code}`);
});

export default app;
