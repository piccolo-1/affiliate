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
import { startRetryWorker } from './services/postbackRetry';
import {
  authRateLimiter,
  apiRateLimiter,
  trackingRateLimiter,
  postbackRateLimiter,
  adminRateLimiter
} from './middleware/rateLimit';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
initializeDatabase();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Trust proxy for accurate IP detection
app.set('trust proxy', true);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes with rate limiting
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/affiliate', apiRateLimiter, affiliateRoutes);
app.use('/api/offers', apiRateLimiter, offerRoutes);
app.use('/api/conversions', apiRateLimiter, conversionRoutes);
app.use('/api/stats', apiRateLimiter, statsRoutes);
app.use('/api/admin', adminRateLimiter, adminRoutes);

// Tracking Routes (public) with appropriate rate limits
app.use('/track', trackingRateLimiter, trackingRoutes);
app.use('/postback', postbackRateLimiter, postbackRoutes);

// Serve click redirect (short tracking links) with high-throughput rate limit
app.use('/c', trackingRateLimiter, trackingRoutes);

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

  // Start the postback retry worker
  startRetryWorker();
});

export default app;
