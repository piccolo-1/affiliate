import { Router, Response } from 'express';
import db from '../database/connection';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get daily stats (chart data)
router.get('/daily', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, offerId } = req.query;

    // Default to last 30 days
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    let query = `
      SELECT
        date,
        SUM(clicks) as clicks,
        SUM(unique_clicks) as unique_clicks,
        SUM(conversions) as conversions,
        SUM(revenue) as revenue,
        SUM(payout) as payout
      FROM daily_stats
      WHERE affiliate_id = ?
      AND date >= ? AND date <= ?
    `;
    const params: any[] = [req.user!.id, start.toISOString().split('T')[0], end.toISOString().split('T')[0]];

    if (offerId) {
      query += ' AND offer_id = ?';
      params.push(offerId);
    }

    query += ' GROUP BY date ORDER BY date ASC';

    const stats = db.prepare(query).all(...params) as any[];

    res.json(stats.map(s => ({
      date: s.date,
      clicks: s.clicks,
      uniqueClicks: s.unique_clicks,
      conversions: s.conversions,
      revenue: s.revenue,
      payout: s.payout,
      epc: s.clicks > 0 ? s.payout / s.clicks : 0,
      conversionRate: s.clicks > 0 ? (s.conversions / s.clicks) * 100 : 0
    })));
  } catch (error) {
    console.error('Get daily stats error:', error);
    res.status(500).json({ error: 'Failed to get daily stats' });
  }
});

// Get stats by offer
router.get('/by-offer', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to last 30 days
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const stats = db.prepare(`
      SELECT
        ds.offer_id,
        o.name as offer_name,
        SUM(ds.clicks) as clicks,
        SUM(ds.unique_clicks) as unique_clicks,
        SUM(ds.conversions) as conversions,
        SUM(ds.revenue) as revenue,
        SUM(ds.payout) as payout
      FROM daily_stats ds
      JOIN offers o ON ds.offer_id = o.id
      WHERE ds.affiliate_id = ?
      AND ds.date >= ? AND ds.date <= ?
      GROUP BY ds.offer_id
      ORDER BY payout DESC
    `).all(req.user!.id, start.toISOString().split('T')[0], end.toISOString().split('T')[0]) as any[];

    res.json(stats.map(s => ({
      offerId: s.offer_id,
      offerName: s.offer_name,
      clicks: s.clicks,
      uniqueClicks: s.unique_clicks,
      conversions: s.conversions,
      revenue: s.revenue,
      payout: s.payout,
      epc: s.clicks > 0 ? s.payout / s.clicks : 0,
      conversionRate: s.clicks > 0 ? (s.conversions / s.clicks) * 100 : 0
    })));
  } catch (error) {
    console.error('Get offer stats error:', error);
    res.status(500).json({ error: 'Failed to get offer stats' });
  }
});

// Get stats by sub-ID
router.get('/by-sub', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, offerId, subField = 'sub1' } = req.query;

    // Validate sub field
    if (!['sub1', 'sub2', 'sub3', 'sub4', 'sub5'].includes(subField as string)) {
      return res.status(400).json({ error: 'Invalid sub field' });
    }

    // Default to last 30 days
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    let clicksQuery = `
      SELECT
        ${subField} as sub_value,
        COUNT(*) as clicks,
        SUM(is_unique) as unique_clicks
      FROM clicks
      WHERE affiliate_id = ?
      AND ${subField} IS NOT NULL
      AND created_at >= ? AND created_at <= ?
    `;
    const clicksParams: any[] = [req.user!.id, start.toISOString(), end.toISOString()];

    if (offerId) {
      clicksQuery += ' AND offer_id = ?';
      clicksParams.push(offerId);
    }

    clicksQuery += ` GROUP BY ${subField}`;

    const clickStats = db.prepare(clicksQuery).all(...clicksParams) as any[];

    let convQuery = `
      SELECT
        ${subField} as sub_value,
        COUNT(*) as conversions,
        SUM(payout) as payout,
        SUM(revenue) as revenue
      FROM conversions
      WHERE affiliate_id = ?
      AND ${subField} IS NOT NULL
      AND created_at >= ? AND created_at <= ?
    `;
    const convParams: any[] = [req.user!.id, start.toISOString(), end.toISOString()];

    if (offerId) {
      convQuery += ' AND offer_id = ?';
      convParams.push(offerId);
    }

    convQuery += ` GROUP BY ${subField}`;

    const convStats = db.prepare(convQuery).all(...convParams) as any[];

    // Merge click and conversion stats
    const statsMap = new Map();
    clickStats.forEach(s => {
      statsMap.set(s.sub_value, {
        subValue: s.sub_value,
        clicks: s.clicks,
        uniqueClicks: s.unique_clicks,
        conversions: 0,
        payout: 0,
        revenue: 0
      });
    });

    convStats.forEach(s => {
      if (statsMap.has(s.sub_value)) {
        const existing = statsMap.get(s.sub_value);
        existing.conversions = s.conversions;
        existing.payout = s.payout || 0;
        existing.revenue = s.revenue || 0;
      } else {
        statsMap.set(s.sub_value, {
          subValue: s.sub_value,
          clicks: 0,
          uniqueClicks: 0,
          conversions: s.conversions,
          payout: s.payout || 0,
          revenue: s.revenue || 0
        });
      }
    });

    const result = Array.from(statsMap.values()).map(s => ({
      ...s,
      epc: s.clicks > 0 ? s.payout / s.clicks : 0,
      conversionRate: s.clicks > 0 ? (s.conversions / s.clicks) * 100 : 0
    })).sort((a, b) => b.payout - a.payout);

    res.json(result);
  } catch (error) {
    console.error('Get sub stats error:', error);
    res.status(500).json({ error: 'Failed to get sub stats' });
  }
});

// Get stats by country
router.get('/by-country', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, offerId } = req.query;

    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    let clicksQuery = `
      SELECT
        COALESCE(country_code, 'Unknown') as country,
        COUNT(*) as clicks,
        SUM(is_unique) as unique_clicks
      FROM clicks
      WHERE affiliate_id = ?
      AND created_at >= ? AND created_at <= ?
    `;
    const clicksParams: any[] = [req.user!.id, start.toISOString(), end.toISOString()];

    if (offerId) {
      clicksQuery += ' AND offer_id = ?';
      clicksParams.push(offerId);
    }

    clicksQuery += ' GROUP BY country_code';

    const clickStats = db.prepare(clicksQuery).all(...clicksParams) as any[];

    let convQuery = `
      SELECT
        COALESCE(country, 'Unknown') as country,
        COUNT(*) as conversions,
        SUM(payout) as payout
      FROM conversions
      WHERE affiliate_id = ?
      AND created_at >= ? AND created_at <= ?
    `;
    const convParams: any[] = [req.user!.id, start.toISOString(), end.toISOString()];

    if (offerId) {
      convQuery += ' AND offer_id = ?';
      convParams.push(offerId);
    }

    convQuery += ' GROUP BY country';

    const convStats = db.prepare(convQuery).all(...convParams) as any[];

    // Merge stats
    const statsMap = new Map();
    clickStats.forEach(s => {
      statsMap.set(s.country, {
        country: s.country,
        clicks: s.clicks,
        uniqueClicks: s.unique_clicks,
        conversions: 0,
        payout: 0
      });
    });

    convStats.forEach(s => {
      if (statsMap.has(s.country)) {
        const existing = statsMap.get(s.country);
        existing.conversions = s.conversions;
        existing.payout = s.payout || 0;
      }
    });

    const result = Array.from(statsMap.values()).map(s => ({
      ...s,
      epc: s.clicks > 0 ? s.payout / s.clicks : 0,
      conversionRate: s.clicks > 0 ? (s.conversions / s.clicks) * 100 : 0
    })).sort((a, b) => b.clicks - a.clicks);

    res.json(result);
  } catch (error) {
    console.error('Get country stats error:', error);
    res.status(500).json({ error: 'Failed to get country stats' });
  }
});

// Get stats by device
router.get('/by-device', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, offerId } = req.query;

    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    let query = `
      SELECT
        COALESCE(device_type, 'unknown') as device_type,
        COUNT(*) as clicks,
        SUM(is_unique) as unique_clicks
      FROM clicks
      WHERE affiliate_id = ?
      AND created_at >= ? AND created_at <= ?
    `;
    const params: any[] = [req.user!.id, start.toISOString(), end.toISOString()];

    if (offerId) {
      query += ' AND offer_id = ?';
      params.push(offerId);
    }

    query += ' GROUP BY device_type ORDER BY clicks DESC';

    const stats = db.prepare(query).all(...params) as any[];

    res.json(stats.map(s => ({
      deviceType: s.device_type,
      clicks: s.clicks,
      uniqueClicks: s.unique_clicks
    })));
  } catch (error) {
    console.error('Get device stats error:', error);
    res.status(500).json({ error: 'Failed to get device stats' });
  }
});

// Get click log (detailed click data)
router.get('/clicks', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, offerId, page = 1, limit = 100 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    let query = `
      SELECT c.*, o.name as offer_name
      FROM clicks c
      JOIN offers o ON c.offer_id = o.id
      WHERE c.affiliate_id = ?
      AND c.created_at >= ? AND c.created_at <= ?
    `;
    const params: any[] = [req.user!.id, start.toISOString(), end.toISOString()];

    if (offerId) {
      query += ' AND c.offer_id = ?';
      params.push(offerId);
    }

    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const clicks = db.prepare(query).all(...params) as any[];

    res.json({
      clicks: clicks.map(c => ({
        id: c.id,
        clickId: c.click_id,
        offerName: c.offer_name,
        sub1: c.sub1,
        sub2: c.sub2,
        sub3: c.sub3,
        sub4: c.sub4,
        sub5: c.sub5,
        deviceType: c.device_type,
        browser: c.browser_name,
        os: c.os_name,
        country: c.country_code,
        referrer: c.referrer_domain,
        isUnique: c.is_unique === 1,
        isBot: c.is_bot === 1,
        createdAt: c.created_at
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Get clicks error:', error);
    res.status(500).json({ error: 'Failed to get clicks' });
  }
});

export default router;
