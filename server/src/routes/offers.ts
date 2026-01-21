import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/schema';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// Get all active offers (for affiliates to browse)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { category, vertical, search, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT o.*, u.company as advertiser_name,
             (SELECT status FROM affiliate_offers WHERE affiliate_id = ? AND offer_id = o.id) as my_status
      FROM offers o
      LEFT JOIN users u ON o.advertiser_id = u.id
      WHERE o.status = 'active'
    `;
    const params: any[] = [req.user!.id];

    if (category) {
      query += ' AND o.category = ?';
      params.push(category);
    }

    if (vertical && vertical !== 'all') {
      query += ' AND o.vertical = ?';
      params.push(vertical);
    }

    if (search) {
      query += ' AND (o.name LIKE ? OR o.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY o.is_featured DESC, o.is_top DESC, o.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const offers = db.prepare(query).all(...params) as any[];

    // Get total count
    let countQuery = "SELECT COUNT(*) as total FROM offers WHERE status = 'active'";
    const countParams: any[] = [];
    if (category) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }
    if (vertical && vertical !== 'all') {
      countQuery += ' AND vertical = ?';
      countParams.push(vertical);
    }
    if (search) {
      countQuery += ' AND (name LIKE ? OR description LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }
    const total = (db.prepare(countQuery).get(...countParams) as any).total;

    // Get vertical counts for sidebar
    const verticalCounts = db.prepare(`
      SELECT vertical, COUNT(*) as count
      FROM offers
      WHERE status = 'active'
      GROUP BY vertical
    `).all() as any[];

    res.json({
      offers: offers.map(o => ({
        id: o.id,
        name: o.name,
        description: o.description,
        previewUrl: o.preview_url,
        thumbnailUrl: o.thumbnail_url,
        category: o.category,
        vertical: o.vertical,
        payoutType: o.payout_type,
        payoutAmount: o.payout_amount,
        countries: o.countries ? JSON.parse(o.countries) : null,
        allowedTraffic: o.allowed_traffic ? JSON.parse(o.allowed_traffic) : null,
        restrictedTraffic: o.restricted_traffic ? JSON.parse(o.restricted_traffic) : null,
        requiresApproval: o.requires_approval === 1,
        isFeatured: o.is_featured === 1,
        isTop: o.is_top === 1,
        myStatus: o.my_status || 'not_applied',
        advertiserName: o.advertiser_name,
        createdAt: o.created_at
      })),
      verticalCounts: verticalCounts.reduce((acc, v) => {
        acc[v.vertical] = v.count;
        return acc;
      }, {} as Record<string, number>),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get offers error:', error);
    res.status(500).json({ error: 'Failed to get offers' });
  }
});

// Get single offer details
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const offer = db.prepare(`
      SELECT o.*, u.company as advertiser_name,
             (SELECT status FROM affiliate_offers WHERE affiliate_id = ? AND offer_id = o.id) as my_status,
             (SELECT custom_payout FROM affiliate_offers WHERE affiliate_id = ? AND offer_id = o.id) as my_payout
      FROM offers o
      LEFT JOIN users u ON o.advertiser_id = u.id
      WHERE o.id = ?
    `).get(req.user!.id, req.user!.id, id) as any;

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Get offer stats for this affiliate
    const stats = db.prepare(`
      SELECT
        COALESCE(SUM(clicks), 0) as total_clicks,
        COALESCE(SUM(conversions), 0) as total_conversions,
        COALESCE(SUM(payout), 0) as total_payout
      FROM daily_stats
      WHERE affiliate_id = ? AND offer_id = ?
    `).get(req.user!.id, id) as any;

    res.json({
      id: offer.id,
      name: offer.name,
      description: offer.description,
      url: offer.url,
      previewUrl: offer.preview_url,
      category: offer.category,
      payoutType: offer.payout_type,
      payoutAmount: offer.my_payout || offer.payout_amount,
      countries: offer.countries ? JSON.parse(offer.countries) : null,
      allowedTraffic: offer.allowed_traffic ? JSON.parse(offer.allowed_traffic) : null,
      restrictedTraffic: offer.restricted_traffic ? JSON.parse(offer.restricted_traffic) : null,
      conversionCap: offer.conversion_cap,
      dailyCap: offer.daily_cap,
      monthlyCap: offer.monthly_cap,
      requiresApproval: offer.requires_approval === 1,
      myStatus: offer.my_status || 'not_applied',
      advertiserName: offer.advertiser_name,
      createdAt: offer.created_at,
      stats: {
        totalClicks: stats.total_clicks,
        totalConversions: stats.total_conversions,
        totalPayout: stats.total_payout,
        conversionRate: stats.total_clicks > 0 ? (stats.total_conversions / stats.total_clicks) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Get offer error:', error);
    res.status(500).json({ error: 'Failed to get offer' });
  }
});

// Get offer categories
router.get('/meta/categories', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const categories = db.prepare(`
      SELECT DISTINCT category FROM offers WHERE category IS NOT NULL AND status = 'active'
    `).all() as any[];

    res.json(categories.map(c => c.category));
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Create new offer (admin/advertiser only)
router.post('/', authenticate, requireRole('admin', 'advertiser'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      name, description, url, previewUrl, category,
      payoutType, payoutAmount, revenueAmount,
      countries, allowedTraffic, restrictedTraffic,
      conversionCap, dailyCap, monthlyCap,
      requiresApproval, trackingDomain
    } = req.body;

    if (!name || !url || !payoutAmount) {
      return res.status(400).json({ error: 'Name, URL, and payout amount are required' });
    }

    const id = uuidv4();
    const advertiserId = req.user!.role === 'advertiser' ? req.user!.id : null;

    db.prepare(`
      INSERT INTO offers (
        id, name, description, url, preview_url, advertiser_id, category,
        payout_type, payout_amount, revenue_amount,
        countries, allowed_traffic, restricted_traffic,
        conversion_cap, daily_cap, monthly_cap,
        requires_approval, tracking_domain, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      id, name, description || null, url, previewUrl || null, advertiserId, category || null,
      payoutType || 'cpa', payoutAmount, revenueAmount || 0,
      countries ? JSON.stringify(countries) : null,
      allowedTraffic ? JSON.stringify(allowedTraffic) : null,
      restrictedTraffic ? JSON.stringify(restrictedTraffic) : null,
      conversionCap || null, dailyCap || null, monthlyCap || null,
      requiresApproval ? 1 : 0, trackingDomain || null
    );

    res.json({
      id,
      name,
      status: 'active',
      message: 'Offer created successfully'
    });
  } catch (error) {
    console.error('Create offer error:', error);
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

// Update offer (admin/advertiser only)
router.put('/:id', authenticate, requireRole('admin', 'advertiser'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify ownership for advertisers
    if (req.user!.role === 'advertiser') {
      const offer = db.prepare('SELECT advertiser_id FROM offers WHERE id = ?').get(id) as any;
      if (!offer || offer.advertiser_id !== req.user!.id) {
        return res.status(403).json({ error: 'Not authorized to update this offer' });
      }
    }

    const {
      name, description, url, previewUrl, category,
      payoutType, payoutAmount, revenueAmount,
      countries, allowedTraffic, restrictedTraffic,
      conversionCap, dailyCap, monthlyCap,
      requiresApproval, trackingDomain, status
    } = req.body;

    db.prepare(`
      UPDATE offers SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        url = COALESCE(?, url),
        preview_url = COALESCE(?, preview_url),
        category = COALESCE(?, category),
        payout_type = COALESCE(?, payout_type),
        payout_amount = COALESCE(?, payout_amount),
        revenue_amount = COALESCE(?, revenue_amount),
        countries = COALESCE(?, countries),
        allowed_traffic = COALESCE(?, allowed_traffic),
        restricted_traffic = COALESCE(?, restricted_traffic),
        conversion_cap = COALESCE(?, conversion_cap),
        daily_cap = COALESCE(?, daily_cap),
        monthly_cap = COALESCE(?, monthly_cap),
        requires_approval = COALESCE(?, requires_approval),
        tracking_domain = COALESCE(?, tracking_domain),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name, description, url, previewUrl, category,
      payoutType, payoutAmount, revenueAmount,
      countries ? JSON.stringify(countries) : null,
      allowedTraffic ? JSON.stringify(allowedTraffic) : null,
      restrictedTraffic ? JSON.stringify(restrictedTraffic) : null,
      conversionCap, dailyCap, monthlyCap,
      requiresApproval !== undefined ? (requiresApproval ? 1 : 0) : null,
      trackingDomain, status, id
    );

    res.json({ message: 'Offer updated successfully' });
  } catch (error) {
    console.error('Update offer error:', error);
    res.status(500).json({ error: 'Failed to update offer' });
  }
});

export default router;
