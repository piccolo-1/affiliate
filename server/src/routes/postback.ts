import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/schema';
import { queuePostbackRetry } from '../services/postbackRetry';

const router = Router();

// Server-to-server (S2S) postback endpoint for recording conversions
// URL format: /postback?click_id=XXX&payout=XX.XX&event=conversion&tx_id=XXX
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      click_id,
      payout,
      revenue,
      event = 'conversion',
      tx_id,
      status = 'approved',
      adv_ref,
      sale_amount
    } = req.query;

    if (!click_id) {
      return res.status(400).json({ error: 'click_id is required' });
    }

    // Find the click
    const click = db.prepare(`
      SELECT c.*, o.payout_amount as default_payout, o.revenue_amount as default_revenue,
             ao.custom_payout
      FROM clicks c
      JOIN offers o ON c.offer_id = o.id
      LEFT JOIN affiliate_offers ao ON ao.affiliate_id = c.affiliate_id AND ao.offer_id = c.offer_id
      WHERE c.click_id = ?
    `).get(click_id as string) as any;

    if (!click) {
      return res.status(404).json({ error: 'Click not found' });
    }

    // Check for duplicate conversion
    const existingConversion = db.prepare(`
      SELECT id FROM conversions WHERE click_id = ? AND event_type = ?
    `).get(click_id as string, event as string);

    if (existingConversion) {
      return res.status(200).json({ status: 'duplicate', message: 'Conversion already recorded' });
    }

    // Calculate payout and revenue
    const finalPayout = payout ? parseFloat(payout as string) : (click.custom_payout || click.default_payout);
    const finalRevenue = revenue ? parseFloat(revenue as string) : click.default_revenue;

    // Create conversion
    const conversionId = uuidv4();
    db.prepare(`
      INSERT INTO conversions (
        id, click_id, affiliate_id, offer_id, conversion_id, event_type, status,
        revenue, payout, sale_amount, currency,
        sub1, sub2, sub3, sub4, sub5,
        ip_address, user_agent, country,
        transaction_id, advertiser_ref
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      conversionId, click_id, click.affiliate_id, click.offer_id,
      tx_id || uuidv4(), event, status,
      finalRevenue, finalPayout, sale_amount ? parseFloat(sale_amount as string) : null,
      click.sub1, click.sub2, click.sub3, click.sub4, click.sub5,
      click.ip_address, click.user_agent, click.country,
      tx_id || null, adv_ref || null
    );

    // Update daily stats
    updateDailyStatsConversion(click.affiliate_id, click.offer_id, finalRevenue, finalPayout);

    // Fire affiliate postbacks
    await fireAffiliatePostbacks(click, conversionId, event as string, finalPayout, finalRevenue);

    res.json({
      status: 'success',
      conversion_id: conversionId,
      click_id: click_id,
      payout: finalPayout,
      revenue: finalRevenue
    });
  } catch (error) {
    console.error('Postback error:', error);
    res.status(500).json({ error: 'Postback processing failed' });
  }
});

// Alternative POST endpoint for postbacks
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      click_id,
      payout,
      revenue,
      event = 'conversion',
      tx_id,
      status = 'approved',
      adv_ref,
      sale_amount
    } = req.body;

    if (!click_id) {
      return res.status(400).json({ error: 'click_id is required' });
    }

    // Find the click
    const click = db.prepare(`
      SELECT c.*, o.payout_amount as default_payout, o.revenue_amount as default_revenue,
             ao.custom_payout
      FROM clicks c
      JOIN offers o ON c.offer_id = o.id
      LEFT JOIN affiliate_offers ao ON ao.affiliate_id = c.affiliate_id AND ao.offer_id = c.offer_id
      WHERE c.click_id = ?
    `).get(click_id) as any;

    if (!click) {
      return res.status(404).json({ error: 'Click not found' });
    }

    // Check for duplicate conversion
    const existingConversion = db.prepare(`
      SELECT id FROM conversions WHERE click_id = ? AND event_type = ?
    `).get(click_id, event);

    if (existingConversion) {
      return res.status(200).json({ status: 'duplicate', message: 'Conversion already recorded' });
    }

    // Calculate payout and revenue
    const finalPayout = payout ? parseFloat(payout) : (click.custom_payout || click.default_payout);
    const finalRevenue = revenue ? parseFloat(revenue) : click.default_revenue;

    // Create conversion
    const conversionId = uuidv4();
    db.prepare(`
      INSERT INTO conversions (
        id, click_id, affiliate_id, offer_id, conversion_id, event_type, status,
        revenue, payout, sale_amount, currency,
        sub1, sub2, sub3, sub4, sub5,
        ip_address, user_agent, country,
        transaction_id, advertiser_ref
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      conversionId, click_id, click.affiliate_id, click.offer_id,
      tx_id || uuidv4(), event, status,
      finalRevenue, finalPayout, sale_amount ? parseFloat(sale_amount) : null,
      click.sub1, click.sub2, click.sub3, click.sub4, click.sub5,
      click.ip_address, click.user_agent, click.country,
      tx_id || null, adv_ref || null
    );

    // Update daily stats
    updateDailyStatsConversion(click.affiliate_id, click.offer_id, finalRevenue, finalPayout);

    // Fire affiliate postbacks
    await fireAffiliatePostbacks(click, conversionId, event, finalPayout, finalRevenue);

    res.json({
      status: 'success',
      conversion_id: conversionId,
      click_id: click_id,
      payout: finalPayout,
      revenue: finalRevenue
    });
  } catch (error) {
    console.error('Postback error:', error);
    res.status(500).json({ error: 'Postback processing failed' });
  }
});

// Bulk postback endpoint
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { conversions } = req.body;

    if (!Array.isArray(conversions)) {
      return res.status(400).json({ error: 'conversions array is required' });
    }

    const results = [];

    for (const conv of conversions) {
      const { click_id, payout, revenue, event = 'conversion', tx_id, status = 'approved' } = conv;

      if (!click_id) {
        results.push({ click_id: null, status: 'error', error: 'click_id is required' });
        continue;
      }

      const click = db.prepare(`
        SELECT c.*, o.payout_amount as default_payout, o.revenue_amount as default_revenue
        FROM clicks c
        JOIN offers o ON c.offer_id = o.id
        WHERE c.click_id = ?
      `).get(click_id) as any;

      if (!click) {
        results.push({ click_id, status: 'error', error: 'Click not found' });
        continue;
      }

      const existingConversion = db.prepare(`
        SELECT id FROM conversions WHERE click_id = ? AND event_type = ?
      `).get(click_id, event);

      if (existingConversion) {
        results.push({ click_id, status: 'duplicate' });
        continue;
      }

      const finalPayout = payout ? parseFloat(payout) : click.default_payout;
      const finalRevenue = revenue ? parseFloat(revenue) : click.default_revenue;

      const conversionId = uuidv4();
      db.prepare(`
        INSERT INTO conversions (
          id, click_id, affiliate_id, offer_id, conversion_id, event_type, status,
          revenue, payout, sub1, sub2, sub3, sub4, sub5, transaction_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        conversionId, click_id, click.affiliate_id, click.offer_id,
        tx_id || uuidv4(), event, status,
        finalRevenue, finalPayout,
        click.sub1, click.sub2, click.sub3, click.sub4, click.sub5,
        tx_id || null
      );

      updateDailyStatsConversion(click.affiliate_id, click.offer_id, finalRevenue, finalPayout);

      results.push({ click_id, status: 'success', conversion_id: conversionId });
    }

    res.json({ results });
  } catch (error) {
    console.error('Bulk postback error:', error);
    res.status(500).json({ error: 'Bulk postback processing failed' });
  }
});

// Fire postbacks to affiliate's configured postback URLs
async function fireAffiliatePostbacks(click: any, conversionId: string, event: string, payout: number, revenue: number) {
  try {
    // Get affiliate's postback URLs
    const postbackUrls = db.prepare(`
      SELECT * FROM postback_urls
      WHERE affiliate_id = ? AND status = 'active'
      AND (offer_id IS NULL OR offer_id = ?)
      AND (event_type = ? OR event_type = 'all')
    `).all(click.affiliate_id, click.offer_id, event) as any[];

    for (const postback of postbackUrls) {
      let url = postback.url;

      // Replace placeholders in URL
      url = url.replace('{click_id}', click.click_id || '');
      url = url.replace('{conversion_id}', conversionId);
      url = url.replace('{payout}', payout.toString());
      url = url.replace('{revenue}', revenue.toString());
      url = url.replace('{sub1}', click.sub1 || '');
      url = url.replace('{sub2}', click.sub2 || '');
      url = url.replace('{sub3}', click.sub3 || '');
      url = url.replace('{sub4}', click.sub4 || '');
      url = url.replace('{sub5}', click.sub5 || '');
      url = url.replace('{offer_id}', click.offer_id || '');
      url = url.replace('{event}', event);

      // Fire postback
      try {
        const response = await fetch(url, {
          method: postback.method || 'GET',
          headers: { 'User-Agent': 'AffiliateNetwork/1.0' }
        });

        // Log postback
        db.prepare(`
          INSERT INTO postback_logs (id, postback_url_id, conversion_id, request_url, response_code, success, retry_count)
          VALUES (?, ?, ?, ?, ?, ?, 0)
        `).run(uuidv4(), postback.id, conversionId, url, response.status, response.ok ? 1 : 0);

        // If failed (non-2xx response), queue for retry
        if (!response.ok) {
          queuePostbackRetry(
            postback.id,
            conversionId,
            {
              click_id: click.click_id,
              affiliate_id: click.affiliate_id,
              offer_id: click.offer_id,
              sub1: click.sub1,
              sub2: click.sub2,
              sub3: click.sub3,
              sub4: click.sub4,
              sub5: click.sub5
            },
            event,
            payout,
            revenue,
            `HTTP ${response.status}`
          );
        }
      } catch (err: any) {
        // Log failed postback
        db.prepare(`
          INSERT INTO postback_logs (id, postback_url_id, conversion_id, request_url, success, error_message, retry_count)
          VALUES (?, ?, ?, ?, 0, ?, 0)
        `).run(uuidv4(), postback.id, conversionId, url, err.message);

        // Queue for retry
        queuePostbackRetry(
          postback.id,
          conversionId,
          {
            click_id: click.click_id,
            affiliate_id: click.affiliate_id,
            offer_id: click.offer_id,
            sub1: click.sub1,
            sub2: click.sub2,
            sub3: click.sub3,
            sub4: click.sub4,
            sub5: click.sub5
          },
          event,
          payout,
          revenue,
          err.message
        );
      }
    }
  } catch (error) {
    console.error('Fire postbacks error:', error);
  }
}

// Update daily stats with conversion data
function updateDailyStatsConversion(affiliateId: string, offerId: string, revenue: number, payout: number) {
  const today = new Date().toISOString().split('T')[0];

  const existing = db.prepare(`
    SELECT id, clicks, conversions FROM daily_stats
    WHERE date = ? AND affiliate_id = ? AND offer_id = ?
  `).get(today, affiliateId, offerId) as any;

  if (existing) {
    const clicks = existing.clicks || 1;
    const conversions = existing.conversions + 1;
    const convRate = (conversions / clicks) * 100;
    const epc = (payout * conversions) / clicks;

    db.prepare(`
      UPDATE daily_stats SET
        conversions = conversions + 1,
        revenue = revenue + ?,
        payout = payout + ?,
        conversion_rate = ?,
        epc = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(revenue, payout, convRate, epc, existing.id);
  } else {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO daily_stats (id, date, affiliate_id, offer_id, clicks, conversions, revenue, payout, conversion_rate, epc)
      VALUES (?, ?, ?, ?, 0, 1, ?, ?, 0, 0)
    `).run(id, today, affiliateId, offerId, revenue, payout);
  }
}

export default router;
