import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from '../database/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import {
  validate,
  updateUserStatusSchema,
  createManagerSchema,
  createUserSchema,
  updateApplicationSchema,
  updateConversionSchema,
  createPayoutSchema,
  updatePayoutSchema
} from '../middleware/validation';

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
router.put('/users/:id/status', validate(updateUserStatusSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

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
router.post('/managers', validate(createManagerSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, firstName, lastName, company, phone, skype, telegram } = req.body;

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
router.post('/users', validate(createUserSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

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
router.put('/applications/:id', validate(updateApplicationSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, customPayout } = req.body;

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
router.put('/conversions/:id', validate(updateConversionSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, notes } = req.body;

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
router.post('/payouts', validate(createPayoutSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { affiliateId, amount, paymentMethod, notes } = req.body;

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

export default router;
