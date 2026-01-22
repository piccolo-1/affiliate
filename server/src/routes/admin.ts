import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from '../database/schema';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { getRetryQueueStats, processRetryQueue, cleanupOldEntries } from '../services/postbackRetry';
import { getRateLimitStats } from '../middleware/rateLimit';
import { getNetworkFraudOverview, getAffiliateFraudStats } from '../services/fraudDetection';

const router = Router();

// All admin routes require admin role
router.use(authenticate, requireRole('admin'));

// Get admin dashboard overview
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    const monthStart = firstOfMonth.toISOString().split('T')[0];

    // Today's stats
    const todayStats = db.prepare(`
      SELECT
        COALESCE(SUM(clicks), 0) as clicks,
        COALESCE(SUM(conversions), 0) as conversions,
        COALESCE(SUM(revenue), 0) as revenue,
        COALESCE(SUM(payout), 0) as payout
      FROM daily_stats WHERE date = ?
    `).get(today) as any;

    // Month stats
    const monthStats = db.prepare(`
      SELECT
        COALESCE(SUM(clicks), 0) as clicks,
        COALESCE(SUM(conversions), 0) as conversions,
        COALESCE(SUM(revenue), 0) as revenue,
        COALESCE(SUM(payout), 0) as payout
      FROM daily_stats WHERE date >= ?
    `).get(monthStart) as any;

    // User counts
    const userCounts = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN role = 'affiliate' THEN 1 ELSE 0 END) as affiliates,
        SUM(CASE WHEN role = 'advertiser' THEN 1 ELSE 0 END) as advertisers,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM users
    `).get() as any;

    // Offer counts
    const offerCounts = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused
      FROM offers
    `).get() as any;

    // Pending approvals
    const pendingApprovals = db.prepare(`
      SELECT COUNT(*) as count FROM affiliate_offers WHERE status = 'pending'
    `).get() as any;

    // Top affiliates this month
    const topAffiliates = db.prepare(`
      SELECT
        ds.affiliate_id,
        u.email,
        u.first_name,
        u.last_name,
        SUM(ds.clicks) as clicks,
        SUM(ds.conversions) as conversions,
        SUM(ds.payout) as payout
      FROM daily_stats ds
      JOIN users u ON ds.affiliate_id = u.id
      WHERE ds.date >= ?
      GROUP BY ds.affiliate_id
      ORDER BY payout DESC
      LIMIT 10
    `).all(monthStart) as any[];

    // Recent conversions
    const recentConversions = db.prepare(`
      SELECT c.*, o.name as offer_name, u.email as affiliate_email
      FROM conversions c
      JOIN offers o ON c.offer_id = o.id
      JOIN users u ON c.affiliate_id = u.id
      ORDER BY c.created_at DESC
      LIMIT 20
    `).all() as any[];

    res.json({
      today: {
        clicks: todayStats.clicks,
        conversions: todayStats.conversions,
        revenue: todayStats.revenue,
        payout: todayStats.payout,
        profit: todayStats.revenue - todayStats.payout
      },
      month: {
        clicks: monthStats.clicks,
        conversions: monthStats.conversions,
        revenue: monthStats.revenue,
        payout: monthStats.payout,
        profit: monthStats.revenue - monthStats.payout
      },
      users: {
        total: userCounts.total,
        affiliates: userCounts.affiliates,
        advertisers: userCounts.advertisers,
        pending: userCounts.pending
      },
      offers: {
        total: offerCounts.total,
        active: offerCounts.active,
        paused: offerCounts.paused
      },
      pendingApprovals: pendingApprovals.count,
      topAffiliates: topAffiliates.map(a => ({
        id: a.affiliate_id,
        email: a.email,
        name: `${a.first_name} ${a.last_name}`,
        clicks: a.clicks,
        conversions: a.conversions,
        payout: a.payout
      })),
      recentConversions: recentConversions.map(c => ({
        id: c.id,
        offerName: c.offer_name,
        affiliateEmail: c.affiliate_email,
        status: c.status,
        payout: c.payout,
        revenue: c.revenue,
        createdAt: c.created_at
      }))
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Get all users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { role, status, search, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = 'SELECT * FROM users WHERE 1=1';
    const params: any[] = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR company LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const users = db.prepare(query).all(...params) as any[];

    res.json({
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        company: u.company,
        role: u.role,
        status: u.status,
        referralCode: u.referral_code,
        managerId: u.manager_id,
        createdAt: u.created_at
      }))
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Update user status
router.put('/users/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    db.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, id);

    res.json({ message: 'User status updated' });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Assign manager to affiliate
router.put('/users/:id/manager', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { managerId } = req.body;

    db.prepare('UPDATE users SET manager_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(managerId || null, id);

    res.json({ message: 'Manager assigned successfully' });
  } catch (error) {
    console.error('Assign manager error:', error);
    res.status(500).json({ error: 'Failed to assign manager' });
  }
});

// Get all managers
router.get('/managers', async (req: AuthRequest, res: Response) => {
  try {
    const managers = db.prepare(`
      SELECT u.*,
             (SELECT COUNT(*) FROM users WHERE manager_id = u.id) as affiliate_count
      FROM users u
      WHERE u.role = 'manager'
      ORDER BY u.created_at DESC
    `).all() as any[];

    res.json({
      managers: managers.map(m => ({
        id: m.id,
        email: m.email,
        firstName: m.first_name,
        lastName: m.last_name,
        company: m.company,
        phone: m.phone,
        skype: m.skype,
        telegram: m.telegram,
        status: m.status,
        createdAt: m.created_at,
        affiliateCount: m.affiliate_count
      }))
    });
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({ error: 'Failed to get managers' });
  }
});

// Create manager
router.post('/managers', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, firstName, lastName, company, phone, skype, telegram } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, password, first name, and last name are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const referralCode = 'MGR' + Math.random().toString(36).substring(2, 8).toUpperCase();

    db.prepare(`
      INSERT INTO users (id, email, password, first_name, last_name, company, phone, skype, telegram, role, status, referral_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'manager', 'active', ?)
    `).run(id, email, hashedPassword, firstName, lastName, company || null, phone || null, skype || null, telegram || null, referralCode);

    res.json({ id, message: 'Manager created successfully' });
  } catch (error) {
    console.error('Create manager error:', error);
    res.status(500).json({ error: 'Failed to create manager' });
  }
});

// Delete manager
router.delete('/managers/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Unassign any affiliates from this manager
    db.prepare('UPDATE users SET manager_id = NULL WHERE manager_id = ?').run(id);

    // Delete the manager
    db.prepare('DELETE FROM users WHERE id = ? AND role = "manager"').run(id);

    res.json({ message: 'Manager deleted successfully' });
  } catch (error) {
    console.error('Delete manager error:', error);
    res.status(500).json({ error: 'Failed to delete manager' });
  }
});

// Create admin user
router.post('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();

    db.prepare(`
      INSERT INTO users (id, email, password, first_name, last_name, role, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).run(id, email, hashedPassword, firstName, lastName, role || 'affiliate');

    res.json({ id, message: 'User created successfully' });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get all offers (admin view)
router.get('/offers', async (req: AuthRequest, res: Response) => {
  try {
    const offers = db.prepare(`
      SELECT o.*, u.email as advertiser_email
      FROM offers o
      LEFT JOIN users u ON o.advertiser_id = u.id
      ORDER BY o.created_at DESC
    `).all() as any[];

    res.json(offers.map(o => ({
      id: o.id,
      name: o.name,
      description: o.description,
      url: o.url,
      category: o.category,
      payoutType: o.payout_type,
      payoutAmount: o.payout_amount,
      revenueAmount: o.revenue_amount,
      status: o.status,
      requiresApproval: o.requires_approval === 1,
      advertiserEmail: o.advertiser_email,
      createdAt: o.created_at
    })));
  } catch (error) {
    console.error('Get offers error:', error);
    res.status(500).json({ error: 'Failed to get offers' });
  }
});

// Get pending affiliate-offer applications
router.get('/applications', async (req: AuthRequest, res: Response) => {
  try {
    const applications = db.prepare(`
      SELECT ao.*, u.email as affiliate_email, u.first_name, u.last_name, o.name as offer_name
      FROM affiliate_offers ao
      JOIN users u ON ao.affiliate_id = u.id
      JOIN offers o ON ao.offer_id = o.id
      WHERE ao.status = 'pending'
      ORDER BY ao.created_at DESC
    `).all() as any[];

    res.json(applications.map(a => ({
      id: a.id,
      affiliateId: a.affiliate_id,
      affiliateEmail: a.affiliate_email,
      affiliateName: `${a.first_name} ${a.last_name}`,
      offerId: a.offer_id,
      offerName: a.offer_name,
      status: a.status,
      createdAt: a.created_at
    })));
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to get applications' });
  }
});

// Approve/reject affiliate-offer application
router.put('/applications/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, customPayout } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    db.prepare(`
      UPDATE affiliate_offers SET
        status = ?,
        custom_payout = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, customPayout || null, id);

    res.json({ message: `Application ${status}` });
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// Get all conversions (admin view)
router.get('/conversions', async (req: AuthRequest, res: Response) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 100 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT c.*, o.name as offer_name, u.email as affiliate_email
      FROM conversions c
      JOIN offers o ON c.offer_id = o.id
      JOIN users u ON c.affiliate_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }

    if (startDate) {
      query += ' AND DATE(c.created_at) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(c.created_at) <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const conversions = db.prepare(query).all(...params) as any[];

    res.json(conversions.map(c => ({
      id: c.id,
      clickId: c.click_id,
      offerName: c.offer_name,
      affiliateEmail: c.affiliate_email,
      status: c.status,
      revenue: c.revenue,
      payout: c.payout,
      sub1: c.sub1,
      sub2: c.sub2,
      createdAt: c.created_at
    })));
  } catch (error) {
    console.error('Get conversions error:', error);
    res.status(500).json({ error: 'Failed to get conversions' });
  }
});

// Update conversion status
router.put('/conversions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, notes } = req.body;

    if (!['pending', 'approved', 'rejected', 'reversed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    db.prepare(`
      UPDATE conversions SET
        status = ?,
        rejection_reason = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, rejectionReason || null, notes || null, id);

    res.json({ message: 'Conversion updated' });
  } catch (error) {
    console.error('Update conversion error:', error);
    res.status(500).json({ error: 'Failed to update conversion' });
  }
});

// Get payouts
router.get('/payouts', async (req: AuthRequest, res: Response) => {
  try {
    const payouts = db.prepare(`
      SELECT p.*, u.email as affiliate_email, u.first_name, u.last_name
      FROM payouts p
      JOIN users u ON p.affiliate_id = u.id
      ORDER BY p.created_at DESC
    `).all() as any[];

    res.json(payouts.map(p => ({
      id: p.id,
      affiliateId: p.affiliate_id,
      affiliateEmail: p.affiliate_email,
      affiliateName: `${p.first_name} ${p.last_name}`,
      amount: p.amount,
      status: p.status,
      paymentMethod: p.payment_method,
      transactionId: p.transaction_id,
      createdAt: p.created_at,
      processedAt: p.processed_at
    })));
  } catch (error) {
    console.error('Get payouts error:', error);
    res.status(500).json({ error: 'Failed to get payouts' });
  }
});

// Create payout
router.post('/payouts', async (req: AuthRequest, res: Response) => {
  try {
    const { affiliateId, amount, paymentMethod, notes } = req.body;

    if (!affiliateId || !amount) {
      return res.status(400).json({ error: 'Affiliate ID and amount required' });
    }

    const id = uuidv4();
    const today = new Date().toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO payouts (id, affiliate_id, amount, payment_method, notes, period_end)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, affiliateId, amount, paymentMethod || 'paypal', notes || null, today);

    res.json({ id, message: 'Payout created' });
  } catch (error) {
    console.error('Create payout error:', error);
    res.status(500).json({ error: 'Failed to create payout' });
  }
});

// Update payout status
router.put('/payouts/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, transactionId } = req.body;

    db.prepare(`
      UPDATE payouts SET
        status = COALESCE(?, status),
        transaction_id = COALESCE(?, transaction_id),
        processed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE processed_at END,
        processed_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, transactionId, status, req.user!.id, id);

    res.json({ message: 'Payout updated' });
  } catch (error) {
    console.error('Update payout error:', error);
    res.status(500).json({ error: 'Failed to update payout' });
  }
});

// Network stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const stats = db.prepare(`
      SELECT
        date,
        SUM(clicks) as clicks,
        SUM(conversions) as conversions,
        SUM(revenue) as revenue,
        SUM(payout) as payout
      FROM daily_stats
      WHERE date >= ? AND date <= ?
      GROUP BY date
      ORDER BY date ASC
    `).all(start.toISOString().split('T')[0], end.toISOString().split('T')[0]) as any[];

    res.json(stats.map(s => ({
      date: s.date,
      clicks: s.clicks,
      conversions: s.conversions,
      revenue: s.revenue,
      payout: s.payout,
      profit: s.revenue - s.payout
    })));
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ========================================
// Postback Retry Queue Management
// ========================================

// Get retry queue statistics
router.get('/postback-queue/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = getRetryQueueStats();
    res.json(stats);
  } catch (error) {
    console.error('Get retry queue stats error:', error);
    res.status(500).json({ error: 'Failed to get retry queue stats' });
  }
});

// Get retry queue items
router.get('/postback-queue', async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT prq.*, u.email as affiliate_email, o.name as offer_name, pb.url as postback_url
      FROM postback_retry_queue prq
      JOIN users u ON prq.affiliate_id = u.id
      JOIN offers o ON prq.offer_id = o.id
      JOIN postback_urls pb ON prq.postback_url_id = pb.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ' AND prq.status = ?';
      params.push(status);
    }

    query += ' ORDER BY prq.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const items = db.prepare(query).all(...params) as any[];

    res.json({
      items: items.map(item => ({
        id: item.id,
        conversionId: item.conversion_id,
        clickId: item.click_id,
        affiliateEmail: item.affiliate_email,
        offerName: item.offer_name,
        postbackUrl: item.postback_url,
        eventType: item.event_type,
        payout: item.payout,
        revenue: item.revenue,
        retryCount: item.retry_count,
        maxRetries: item.max_retries,
        nextRetryAt: item.next_retry_at,
        lastError: item.last_error,
        status: item.status,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }))
    });
  } catch (error) {
    console.error('Get retry queue error:', error);
    res.status(500).json({ error: 'Failed to get retry queue' });
  }
});

// Manually trigger retry processing
router.post('/postback-queue/process', async (req: AuthRequest, res: Response) => {
  try {
    const result = await processRetryQueue();
    res.json({
      message: 'Retry queue processed',
      ...result
    });
  } catch (error) {
    console.error('Process retry queue error:', error);
    res.status(500).json({ error: 'Failed to process retry queue' });
  }
});

// Reset a failed item back to pending for retry
router.post('/postback-queue/:id/retry', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const item = db.prepare('SELECT * FROM postback_retry_queue WHERE id = ?').get(id) as any;
    if (!item) {
      return res.status(404).json({ error: 'Queue item not found' });
    }

    // Reset to pending with immediate retry
    const nextRetryAt = new Date().toISOString();
    db.prepare(`
      UPDATE postback_retry_queue SET
        status = 'pending',
        retry_count = 0,
        next_retry_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nextRetryAt, id);

    res.json({ message: 'Item queued for immediate retry' });
  } catch (error) {
    console.error('Retry queue item error:', error);
    res.status(500).json({ error: 'Failed to retry queue item' });
  }
});

// Delete a queue item
router.delete('/postback-queue/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM postback_retry_queue WHERE id = ?').run(id);
    res.json({ message: 'Queue item deleted' });
  } catch (error) {
    console.error('Delete queue item error:', error);
    res.status(500).json({ error: 'Failed to delete queue item' });
  }
});

// Cleanup old completed/failed entries
router.post('/postback-queue/cleanup', async (req: AuthRequest, res: Response) => {
  try {
    const deletedCount = cleanupOldEntries();
    res.json({
      message: 'Cleanup completed',
      deletedCount
    });
  } catch (error) {
    console.error('Cleanup retry queue error:', error);
    res.status(500).json({ error: 'Failed to cleanup retry queue' });
  }
});

// Get postback logs with retry information
router.get('/postback-logs', async (req: AuthRequest, res: Response) => {
  try {
    const { success, page = 1, limit = 100 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT pl.*, c.click_id, pb.url as postback_url, u.email as affiliate_email
      FROM postback_logs pl
      JOIN conversions c ON pl.conversion_id = c.id
      JOIN postback_urls pb ON pl.postback_url_id = pb.id
      JOIN users u ON pb.affiliate_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (success !== undefined) {
      query += ' AND pl.success = ?';
      params.push(success === 'true' ? 1 : 0);
    }

    query += ' ORDER BY pl.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const logs = db.prepare(query).all(...params) as any[];

    res.json({
      logs: logs.map(log => ({
        id: log.id,
        conversionId: log.conversion_id,
        clickId: log.click_id,
        affiliateEmail: log.affiliate_email,
        postbackUrl: log.postback_url,
        requestUrl: log.request_url,
        responseCode: log.response_code,
        success: log.success === 1,
        errorMessage: log.error_message,
        retryCount: log.retry_count || 0,
        createdAt: log.created_at
      }))
    });
  } catch (error) {
    console.error('Get postback logs error:', error);
    res.status(500).json({ error: 'Failed to get postback logs' });
  }
});

// ========================================
// Rate Limiting Monitoring
// ========================================

// Get rate limit statistics
router.get('/rate-limit/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = getRateLimitStats();
    res.json(stats);
  } catch (error) {
    console.error('Get rate limit stats error:', error);
    res.status(500).json({ error: 'Failed to get rate limit stats' });
  }
});

// ========================================
// Fraud Detection & Monitoring
// ========================================

// Get network-wide fraud overview
router.get('/fraud/overview', async (req: AuthRequest, res: Response) => {
  try {
    const { days = 7 } = req.query;
    const overview = getNetworkFraudOverview(Number(days));
    res.json(overview);
  } catch (error) {
    console.error('Get fraud overview error:', error);
    res.status(500).json({ error: 'Failed to get fraud overview' });
  }
});

// Get affiliate-specific fraud stats
router.get('/fraud/affiliate/:affiliateId', async (req: AuthRequest, res: Response) => {
  try {
    const { affiliateId } = req.params;
    const { days = 7 } = req.query;
    const stats = getAffiliateFraudStats(affiliateId, Number(days));
    res.json(stats);
  } catch (error) {
    console.error('Get affiliate fraud stats error:', error);
    res.status(500).json({ error: 'Failed to get affiliate fraud stats' });
  }
});

// Get high-risk clicks
router.get('/fraud/clicks', async (req: AuthRequest, res: Response) => {
  try {
    const { minScore = 50, page = 1, limit = 100 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const clicks = db.prepare(`
      SELECT c.*, u.email as affiliate_email, o.name as offer_name
      FROM clicks c
      JOIN users u ON c.affiliate_id = u.id
      JOIN offers o ON c.offer_id = o.id
      WHERE c.fraud_score >= ?
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(Number(minScore), Number(limit), offset) as any[];

    res.json({
      clicks: clicks.map(c => ({
        id: c.id,
        clickId: c.click_id,
        affiliateEmail: c.affiliate_email,
        offerName: c.offer_name,
        fraudScore: c.fraud_score,
        isBot: c.is_bot === 1,
        ipAddress: c.ip_address,
        userAgent: c.user_agent,
        deviceType: c.device_type,
        browserName: c.browser_name,
        osName: c.os_name,
        referrer: c.referrer,
        country: c.country,
        createdAt: c.created_at
      }))
    });
  } catch (error) {
    console.error('Get fraud clicks error:', error);
    res.status(500).json({ error: 'Failed to get fraud clicks' });
  }
});

// Get fraud statistics by date
router.get('/fraud/stats', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const stats = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total_clicks,
        SUM(CASE WHEN fraud_score > 50 THEN 1 ELSE 0 END) as flagged_clicks,
        SUM(CASE WHEN fraud_score > 80 THEN 1 ELSE 0 END) as blocked_clicks,
        SUM(CASE WHEN is_bot = 1 THEN 1 ELSE 0 END) as bot_clicks,
        AVG(fraud_score) as avg_fraud_score
      FROM clicks
      WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(start.toISOString().split('T')[0], end.toISOString().split('T')[0]) as any[];

    res.json(stats.map(s => ({
      date: s.date,
      totalClicks: s.total_clicks,
      flaggedClicks: s.flagged_clicks,
      blockedClicks: s.blocked_clicks,
      botClicks: s.bot_clicks,
      avgFraudScore: Math.round((s.avg_fraud_score || 0) * 100) / 100,
      fraudRate: s.total_clicks > 0 ? Math.round((s.flagged_clicks / s.total_clicks) * 10000) / 100 : 0
    })));
  } catch (error) {
    console.error('Get fraud stats error:', error);
    res.status(500).json({ error: 'Failed to get fraud stats' });
  }
});

export default router;
