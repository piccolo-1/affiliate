import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import UAParser from 'ua-parser-js';
import db from '../database/schema';
import { calculateFraudScore } from '../services/fraudDetection';

const router = Router();

// Generate a unique click ID (Everflow style)
function generateClickId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}${random}`.toUpperCase();
}

// Parse user agent to get device info
function parseUserAgent(userAgent: string) {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    deviceType: result.device.type || 'desktop',
    deviceBrand: result.device.vendor || null,
    deviceModel: result.device.model || null,
    osName: result.os.name || null,
    osVersion: result.os.version || null,
    browserName: result.browser.name || null,
    browserVersion: result.browser.version || null
  };
}

// Get client IP address
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// Simple bot detection
function detectBot(userAgent: string): boolean {
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /java\//i,
    /headless/i, /phantom/i, /selenium/i
  ];
  return botPatterns.some(pattern => pattern.test(userAgent));
}

// Get referrer domain
function getReferrerDomain(referrer: string | undefined): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    return url.hostname;
  } catch {
    return null;
  }
}

// Main tracking endpoint - redirect with click tracking
// URL format: /c/{short_code}?sub1=xxx&sub2=xxx&sub3=xxx&sub4=xxx&sub5=xxx
router.get('/:shortCode', async (req: Request, res: Response) => {
  try {
    const { shortCode } = req.params;
    const { sub1, sub2, sub3, sub4, sub5, utm_source, utm_medium, utm_campaign, utm_content, utm_term } = req.query;

    // Find tracking link
    const trackingLink = db.prepare(`
      SELECT tl.*, o.url as offer_url, o.status as offer_status, o.id as offer_id,
             ao.status as assignment_status, ao.custom_payout
      FROM tracking_links tl
      JOIN offers o ON tl.offer_id = o.id
      LEFT JOIN affiliate_offers ao ON ao.affiliate_id = tl.affiliate_id AND ao.offer_id = tl.offer_id
      WHERE tl.short_code = ? AND tl.status = 'active'
    `).get(shortCode) as any;

    if (!trackingLink) {
      return res.status(404).send('Link not found');
    }

    // Check if offer is active
    if (trackingLink.offer_status !== 'active') {
      return res.status(410).send('Offer no longer available');
    }

    // Get device info
    const userAgent = req.headers['user-agent'] || '';
    const deviceInfo = parseUserAgent(userAgent);
    const isBot = detectBot(userAgent);
    const ipAddress = getClientIP(req);
    const referrer = req.headers.referer || req.headers.referrer;

    // Generate click ID
    const clickId = generateClickId();
    const id = uuidv4();

    // Calculate fraud score
    const fraudResult = calculateFraudScore(
      ipAddress,
      userAgent,
      trackingLink.affiliate_id,
      trackingLink.offer_id,
      referrer as string || null,
      {
        deviceType: deviceInfo.deviceType,
        browserName: deviceInfo.browserName,
        osName: deviceInfo.osName
      }
    );

    // Check for duplicate clicks (same IP + offer within 24 hours)
    const existingClick = db.prepare(`
      SELECT id FROM clicks
      WHERE affiliate_id = ? AND offer_id = ? AND ip_address = ?
      AND created_at > datetime('now', '-24 hours')
    `).get(trackingLink.affiliate_id, trackingLink.offer_id, ipAddress);
    const isUnique = !existingClick;

    // Store click with fraud score
    db.prepare(`
      INSERT INTO clicks (
        id, click_id, tracking_link_id, affiliate_id, offer_id,
        sub1, sub2, sub3, sub4, sub5,
        ip_address, user_agent, device_type, device_brand, device_model,
        os_name, os_version, browser_name, browser_version,
        referrer, referrer_domain,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        is_unique, is_bot, fraud_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, clickId, trackingLink.id, trackingLink.affiliate_id, trackingLink.offer_id,
      sub1 || trackingLink.default_sub1 || null,
      sub2 || trackingLink.default_sub2 || null,
      sub3 || trackingLink.default_sub3 || null,
      sub4 || trackingLink.default_sub4 || null,
      sub5 || trackingLink.default_sub5 || null,
      ipAddress, userAgent,
      deviceInfo.deviceType, deviceInfo.deviceBrand, deviceInfo.deviceModel,
      deviceInfo.osName, deviceInfo.osVersion,
      deviceInfo.browserName, deviceInfo.browserVersion,
      referrer as string || null, getReferrerDomain(referrer as string),
      utm_source as string || null, utm_medium as string || null,
      utm_campaign as string || null, utm_content as string || null,
      utm_term as string || null,
      isUnique ? 1 : 0, isBot || fraudResult.signals.isBot ? 1 : 0,
      fraudResult.score
    );

    // Log high-risk clicks for monitoring
    if (fraudResult.riskLevel === 'critical') {
      console.log(`[FraudAlert] Critical fraud score ${fraudResult.score} for click ${clickId}: ${fraudResult.reason}`);
    }

    // Update daily stats
    updateDailyStats(trackingLink.affiliate_id, trackingLink.offer_id, isUnique);

    // Build redirect URL with click_id parameter
    let redirectUrl = trackingLink.offer_url;
    const separator = redirectUrl.includes('?') ? '&' : '?';
    redirectUrl += `${separator}click_id=${clickId}`;

    // Add sub-IDs to redirect URL if configured
    if (sub1) redirectUrl += `&sub1=${encodeURIComponent(sub1 as string)}`;
    if (sub2) redirectUrl += `&sub2=${encodeURIComponent(sub2 as string)}`;
    if (sub3) redirectUrl += `&sub3=${encodeURIComponent(sub3 as string)}`;
    if (sub4) redirectUrl += `&sub4=${encodeURIComponent(sub4 as string)}`;
    if (sub5) redirectUrl += `&sub5=${encodeURIComponent(sub5 as string)}`;

    // Redirect to offer
    const redirectType = trackingLink.redirect_type === '301' ? 301 : 302;
    res.redirect(redirectType, redirectUrl);
  } catch (error) {
    console.error('Tracking error:', error);
    res.status(500).send('Tracking error');
  }
});

// Direct click tracking (pixel/impression tracking)
router.get('/pixel/:shortCode', async (req: Request, res: Response) => {
  try {
    const { shortCode } = req.params;
    const { sub1, sub2, sub3, sub4, sub5 } = req.query;

    // Find tracking link
    const trackingLink = db.prepare(`
      SELECT * FROM tracking_links WHERE short_code = ? AND status = 'active'
    `).get(shortCode) as any;

    if (!trackingLink) {
      return res.status(404).send('Link not found');
    }

    // Get device info
    const userAgent = req.headers['user-agent'] || '';
    const deviceInfo = parseUserAgent(userAgent);
    const isBot = detectBot(userAgent);
    const ipAddress = getClientIP(req);

    // Generate click ID
    const clickId = generateClickId();
    const id = uuidv4();

    // Store click
    db.prepare(`
      INSERT INTO clicks (
        id, click_id, tracking_link_id, affiliate_id, offer_id,
        sub1, sub2, sub3, sub4, sub5,
        ip_address, user_agent, device_type, device_brand, device_model,
        os_name, os_version, browser_name, browser_version,
        is_bot
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, clickId, trackingLink.id, trackingLink.affiliate_id, trackingLink.offer_id,
      sub1 || null, sub2 || null, sub3 || null, sub4 || null, sub5 || null,
      ipAddress, userAgent,
      deviceInfo.deviceType, deviceInfo.deviceBrand, deviceInfo.deviceModel,
      deviceInfo.osName, deviceInfo.osVersion,
      deviceInfo.browserName, deviceInfo.browserVersion,
      isBot ? 1 : 0
    );

    // Return 1x1 transparent GIF
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.send(pixel);
  } catch (error) {
    console.error('Pixel tracking error:', error);
    res.status(500).send('Tracking error');
  }
});

// Click info endpoint (for debugging/verification)
router.get('/info/:clickId', (req: Request, res: Response) => {
  try {
    const { clickId } = req.params;

    const click = db.prepare(`
      SELECT c.*, o.name as offer_name, u.email as affiliate_email
      FROM clicks c
      JOIN offers o ON c.offer_id = o.id
      JOIN users u ON c.affiliate_id = u.id
      WHERE c.click_id = ?
    `).get(clickId) as any;

    if (!click) {
      return res.status(404).json({ error: 'Click not found' });
    }

    res.json({
      clickId: click.click_id,
      offerName: click.offer_name,
      affiliateEmail: click.affiliate_email,
      sub1: click.sub1,
      sub2: click.sub2,
      sub3: click.sub3,
      sub4: click.sub4,
      sub5: click.sub5,
      deviceType: click.device_type,
      browser: click.browser_name,
      os: click.os_name,
      country: click.country,
      createdAt: click.created_at
    });
  } catch (error) {
    console.error('Click info error:', error);
    res.status(500).json({ error: 'Failed to get click info' });
  }
});

// Helper function to update daily stats
function updateDailyStats(affiliateId: string, offerId: string, isUnique: boolean) {
  const today = new Date().toISOString().split('T')[0];

  const existing = db.prepare(`
    SELECT id, clicks, unique_clicks FROM daily_stats
    WHERE date = ? AND affiliate_id = ? AND offer_id = ?
  `).get(today, affiliateId, offerId) as any;

  if (existing) {
    db.prepare(`
      UPDATE daily_stats SET
        clicks = clicks + 1,
        unique_clicks = unique_clicks + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(isUnique ? 1 : 0, existing.id);
  } else {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO daily_stats (id, date, affiliate_id, offer_id, clicks, unique_clicks)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(id, today, affiliateId, offerId, isUnique ? 1 : 0);
  }
}

export default router;
