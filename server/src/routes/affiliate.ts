import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/schema';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// Generate short code for tracking links
function generateShortCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get affiliate dashboard overview
router.get('/dashboard', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const affiliateId = req.user!.id;
    const today = new Date().toISOString().split('T')[0];

    // Get today's stats
    const todayStats = db.prepare(`
      SELECT
        COALESCE(SUM(clicks), 0) as clicks,
        COALESCE(SUM(unique_clicks), 0) as unique_clicks,
        COALESCE(SUM(conversions), 0) as conversions,
        COALESCE(SUM(revenue), 0) as revenue,
        COALESCE(SUM(payout), 0) as payout
      FROM daily_stats
      WHERE affiliate_id = ? AND date = ?
    `).get(affiliateId, today) as any;

    // Get this month's stats
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    const monthStart = firstOfMonth.toISOString().split('T')[0];

    const monthStats = db.prepare(`
      SELECT
        COALESCE(SUM(clicks), 0) as clicks,
        COALESCE(SUM(unique_clicks), 0) as unique_clicks,
        COALESCE(SUM(conversions), 0) as conversions,
        COALESCE(SUM(revenue), 0) as revenue,
        COALESCE(SUM(payout), 0) as payout
      FROM daily_stats
      WHERE affiliate_id = ? AND date >= ?
    `).get(affiliateId, monthStart) as any;

    // Get pending balance (approved but unpaid conversions)
    const pendingBalance = db.prepare(`
      SELECT COALESCE(SUM(payout), 0) as pending
      FROM conversions
      WHERE affiliate_id = ? AND status = 'approved'
      AND id NOT IN (SELECT conversion_id FROM payouts WHERE status = 'completed')
    `).get(affiliateId) as any;

    // Get active offers count
    const activeOffers = db.prepare(`
      SELECT COUNT(*) as count FROM affiliate_offers
      WHERE affiliate_id = ? AND status = 'approved'
    `).get(affiliateId) as any;

    // Get recent conversions
    const recentConversions = db.prepare(`
      SELECT c.*, o.name as offer_name
      FROM conversions c
      JOIN offers o ON c.offer_id = o.id
      WHERE c.affiliate_id = ?
      ORDER BY c.created_at DESC
      LIMIT 10
    `).all(affiliateId) as any[];

    // Get top performing offers this month
    const topOffers = db.prepare(`
      SELECT
        ds.offer_id,
        o.name as offer_name,
        SUM(ds.clicks) as clicks,
        SUM(ds.conversions) as conversions,
        SUM(ds.payout) as payout,
        CASE WHEN SUM(ds.clicks) > 0 THEN (SUM(ds.payout) / SUM(ds.clicks)) ELSE 0 END as epc
      FROM daily_stats ds
      JOIN offers o ON ds.offer_id = o.id
      WHERE ds.affiliate_id = ? AND ds.date >= ?
      GROUP BY ds.offer_id
      ORDER BY payout DESC
      LIMIT 5
    `).all(affiliateId, monthStart) as any[];

    res.json({
      today: {
        clicks: todayStats.clicks,
        uniqueClicks: todayStats.unique_clicks,
        conversions: todayStats.conversions,
        revenue: todayStats.revenue,
        payout: todayStats.payout,
        epc: todayStats.clicks > 0 ? todayStats.payout / todayStats.clicks : 0,
        conversionRate: todayStats.clicks > 0 ? (todayStats.conversions / todayStats.clicks) * 100 : 0
      },
      month: {
        clicks: monthStats.clicks,
        uniqueClicks: monthStats.unique_clicks,
        conversions: monthStats.conversions,
        revenue: monthStats.revenue,
        payout: monthStats.payout,
        epc: monthStats.clicks > 0 ? monthStats.payout / monthStats.clicks : 0,
        conversionRate: monthStats.clicks > 0 ? (monthStats.conversions / monthStats.clicks) * 100 : 0
      },
      pendingBalance: pendingBalance.pending,
      activeOffers: activeOffers.count,
      recentConversions: recentConversions.map(c => ({
        id: c.id,
        clickId: c.click_id,
        offerName: c.offer_name,
        status: c.status,
        payout: c.payout,
        sub1: c.sub1,
        sub2: c.sub2,
        createdAt: c.created_at
      })),
      topOffers: topOffers.map(o => ({
        offerId: o.offer_id,
        offerName: o.offer_name,
        clicks: o.clicks,
        conversions: o.conversions,
        payout: o.payout,
        epc: o.epc
      }))
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Get affiliate's tracking links
router.get('/links', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const links = db.prepare(`
      SELECT tl.*, o.name as offer_name, o.payout_amount, o.payout_type
      FROM tracking_links tl
      JOIN offers o ON tl.offer_id = o.id
      WHERE tl.affiliate_id = ? AND tl.status != 'deleted'
      ORDER BY tl.created_at DESC
    `).all(req.user!.id) as any[];

    res.json(links.map(l => ({
      id: l.id,
      offerId: l.offer_id,
      offerName: l.offer_name,
      shortCode: l.short_code,
      name: l.name,
      trackingUrl: `${process.env.BASE_URL || 'http://localhost:3001'}/c/${l.short_code}`,
      defaultSub1: l.default_sub1,
      defaultSub2: l.default_sub2,
      defaultSub3: l.default_sub3,
      defaultSub4: l.default_sub4,
      defaultSub5: l.default_sub5,
      status: l.status,
      payout: l.payout_amount,
      payoutType: l.payout_type,
      createdAt: l.created_at
    })));
  } catch (error) {
    console.error('Get links error:', error);
    res.status(500).json({ error: 'Failed to get tracking links' });
  }
});

// Create new tracking link
router.post('/links', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { offerId, name, defaultSub1, defaultSub2, defaultSub3, defaultSub4, defaultSub5 } = req.body;

    if (!offerId) {
      return res.status(400).json({ error: 'Offer ID is required' });
    }

    // Check if affiliate is approved for this offer
    const assignment = db.prepare(`
      SELECT * FROM affiliate_offers WHERE affiliate_id = ? AND offer_id = ?
    `).get(req.user!.id, offerId) as any;

    // Check if offer exists and doesn't require approval, or affiliate is approved
    const offer = db.prepare('SELECT * FROM offers WHERE id = ? AND status = "active"').get(offerId) as any;
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found or inactive' });
    }

    if (offer.requires_approval && (!assignment || assignment.status !== 'approved')) {
      return res.status(403).json({ error: 'You need approval to run this offer' });
    }

    // Auto-create assignment if offer doesn't require approval
    if (!assignment && !offer.requires_approval) {
      const assignmentId = uuidv4();
      db.prepare(`
        INSERT INTO affiliate_offers (id, affiliate_id, offer_id, status)
        VALUES (?, ?, ?, 'approved')
      `).run(assignmentId, req.user!.id, offerId);
    }

    // Generate unique short code
    let shortCode = generateShortCode();
    let attempts = 0;
    while (db.prepare('SELECT id FROM tracking_links WHERE short_code = ?').get(shortCode) && attempts < 10) {
      shortCode = generateShortCode();
      attempts++;
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO tracking_links (id, affiliate_id, offer_id, short_code, name, default_sub1, default_sub2, default_sub3, default_sub4, default_sub5)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user!.id, offerId, shortCode, name || null, defaultSub1 || null, defaultSub2 || null, defaultSub3 || null, defaultSub4 || null, defaultSub5 || null);

    res.json({
      id,
      offerId,
      shortCode,
      name,
      trackingUrl: `${process.env.BASE_URL || 'http://localhost:3001'}/c/${shortCode}`,
      status: 'active'
    });
  } catch (error) {
    console.error('Create link error:', error);
    res.status(500).json({ error: 'Failed to create tracking link' });
  }
});

// Update tracking link
router.put('/links/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, defaultSub1, defaultSub2, defaultSub3, defaultSub4, defaultSub5, status } = req.body;

    // Verify ownership
    const link = db.prepare('SELECT * FROM tracking_links WHERE id = ? AND affiliate_id = ?').get(id, req.user!.id);
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    db.prepare(`
      UPDATE tracking_links SET
        name = COALESCE(?, name),
        default_sub1 = COALESCE(?, default_sub1),
        default_sub2 = COALESCE(?, default_sub2),
        default_sub3 = COALESCE(?, default_sub3),
        default_sub4 = COALESCE(?, default_sub4),
        default_sub5 = COALESCE(?, default_sub5),
        status = COALESCE(?, status)
      WHERE id = ?
    `).run(name, defaultSub1, defaultSub2, defaultSub3, defaultSub4, defaultSub5, status, id);

    res.json({ message: 'Link updated successfully' });
  } catch (error) {
    console.error('Update link error:', error);
    res.status(500).json({ error: 'Failed to update link' });
  }
});

// Delete tracking link
router.delete('/links/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const link = db.prepare('SELECT * FROM tracking_links WHERE id = ? AND affiliate_id = ?').get(id, req.user!.id);
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    db.prepare('UPDATE tracking_links SET status = "deleted" WHERE id = ?').run(id);

    res.json({ message: 'Link deleted successfully' });
  } catch (error) {
    console.error('Delete link error:', error);
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

// Get postback URLs
router.get('/postbacks', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const postbacks = db.prepare(`
      SELECT p.*, o.name as offer_name
      FROM postback_urls p
      LEFT JOIN offers o ON p.offer_id = o.id
      WHERE p.affiliate_id = ?
      ORDER BY p.created_at DESC
    `).all(req.user!.id) as any[];

    res.json(postbacks.map(p => ({
      id: p.id,
      offerId: p.offer_id,
      offerName: p.offer_name,
      url: p.url,
      eventType: p.event_type,
      method: p.method,
      status: p.status,
      createdAt: p.created_at
    })));
  } catch (error) {
    console.error('Get postbacks error:', error);
    res.status(500).json({ error: 'Failed to get postback URLs' });
  }
});

// Create postback URL
router.post('/postbacks', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { offerId, url, eventType = 'conversion', method = 'GET' } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO postback_urls (id, affiliate_id, offer_id, url, event_type, method)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.user!.id, offerId || null, url, eventType, method);

    res.json({
      id,
      offerId,
      url,
      eventType,
      method,
      status: 'active'
    });
  } catch (error) {
    console.error('Create postback error:', error);
    res.status(500).json({ error: 'Failed to create postback URL' });
  }
});

// Delete postback URL
router.delete('/postbacks/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const postback = db.prepare('SELECT * FROM postback_urls WHERE id = ? AND affiliate_id = ?').get(id, req.user!.id);
    if (!postback) {
      return res.status(404).json({ error: 'Postback not found' });
    }

    db.prepare('DELETE FROM postback_urls WHERE id = ?').run(id);

    res.json({ message: 'Postback deleted successfully' });
  } catch (error) {
    console.error('Delete postback error:', error);
    res.status(500).json({ error: 'Failed to delete postback' });
  }
});

// Apply to run an offer
router.post('/offers/:offerId/apply', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { offerId } = req.params;

    // Check if offer exists
    const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(offerId) as any;
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Check if already applied
    const existing = db.prepare(`
      SELECT * FROM affiliate_offers WHERE affiliate_id = ? AND offer_id = ?
    `).get(req.user!.id, offerId);

    if (existing) {
      return res.status(400).json({ error: 'Already applied to this offer' });
    }

    const id = uuidv4();
    const status = offer.requires_approval ? 'pending' : 'approved';

    db.prepare(`
      INSERT INTO affiliate_offers (id, affiliate_id, offer_id, status)
      VALUES (?, ?, ?, ?)
    `).run(id, req.user!.id, offerId, status);

    res.json({
      id,
      offerId,
      status,
      message: status === 'pending' ? 'Application submitted for review' : 'You can now run this offer'
    });
  } catch (error) {
    console.error('Apply offer error:', error);
    res.status(500).json({ error: 'Failed to apply for offer' });
  }
});

export default router;
