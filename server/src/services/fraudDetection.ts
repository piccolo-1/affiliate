import db from '../database/schema';

// Fraud detection signals and their weights
export interface FraudSignals {
  isBot: boolean;
  isDuplicateIP: boolean;
  clickVelocityTooHigh: boolean;
  suspiciousUserAgent: boolean;
  headlessBrowser: boolean;
  datacenterIP: boolean;
  noReferrer: boolean;
  missingDeviceInfo: boolean;
  unusualTimePattern: boolean;
  knownBadIP: boolean;
}

export interface FraudResult {
  score: number;           // 0-100 (0 = legitimate, 100 = definitely fraud)
  signals: FraudSignals;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
}

// Known datacenter IP ranges (simplified - in production use a proper database)
const DATACENTER_PATTERNS = [
  /^35\./, /^34\./, // Google Cloud
  /^52\./, /^54\./, /^18\./, // AWS
  /^20\./, /^40\./, /^13\./, // Azure
  /^104\./, /^108\./, // DigitalOcean/generic
];

// Known bad user agents
const SUSPICIOUS_UA_PATTERNS = [
  /^$/,                          // Empty user agent
  /curl/i, /wget/i, /libwww/i,  // CLI tools
  /python/i, /java\//i, /php/i, // Programming languages
  /httpclient/i, /apache-httpclient/i,
  /go-http-client/i, /node-fetch/i,
  /okhttp/i, /axios/i, /request/i,
];

// Bot patterns
const BOT_PATTERNS = [
  /bot/i, /crawler/i, /spider/i, /scraper/i,
  /headless/i, /phantom/i, /selenium/i, /puppeteer/i,
  /playwright/i, /webdriver/i, /chromium/i,
  /slurp/i, /mediapartners/i, /adsbot/i,
];

// Headless browser signatures
const HEADLESS_PATTERNS = [
  /HeadlessChrome/i,
  /PhantomJS/i,
  /Nightmare/i,
  /Puppeteer/i,
  /JSDOM/i,
  /Electron/i,
];

// Calculate click velocity (clicks per minute from same IP)
function getClickVelocity(ipAddress: string, affiliateId: string, offerId: string): number {
  const result = db.prepare(`
    SELECT COUNT(*) as count
    FROM clicks
    WHERE ip_address = ? AND affiliate_id = ? AND offer_id = ?
    AND created_at > datetime('now', '-5 minutes')
  `).get(ipAddress, affiliateId, offerId) as { count: number };

  return result.count;
}

// Check for unusual time patterns (e.g., clicks at exact intervals)
function checkTimePatterns(ipAddress: string, affiliateId: string): boolean {
  const recentClicks = db.prepare(`
    SELECT created_at
    FROM clicks
    WHERE ip_address = ? AND affiliate_id = ?
    AND created_at > datetime('now', '-1 hour')
    ORDER BY created_at DESC
    LIMIT 10
  `).all(ipAddress, affiliateId) as { created_at: string }[];

  if (recentClicks.length < 3) return false;

  // Check for clicks at suspiciously regular intervals
  const intervals: number[] = [];
  for (let i = 0; i < recentClicks.length - 1; i++) {
    const time1 = new Date(recentClicks[i].created_at).getTime();
    const time2 = new Date(recentClicks[i + 1].created_at).getTime();
    intervals.push(Math.abs(time1 - time2));
  }

  // If all intervals are nearly identical (within 500ms), it's suspicious
  if (intervals.length >= 2) {
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const allSimilar = intervals.every(i => Math.abs(i - avgInterval) < 500);
    if (allSimilar && avgInterval < 10000) { // Less than 10 seconds apart and regular
      return true;
    }
  }

  return false;
}

// Check if IP is from a known datacenter
function isDatacenterIP(ipAddress: string): boolean {
  return DATACENTER_PATTERNS.some(pattern => pattern.test(ipAddress));
}

// Check if user agent is suspicious
function isSuspiciousUserAgent(userAgent: string): boolean {
  return SUSPICIOUS_UA_PATTERNS.some(pattern => pattern.test(userAgent));
}

// Check if it's a headless browser
function isHeadlessBrowser(userAgent: string): boolean {
  return HEADLESS_PATTERNS.some(pattern => pattern.test(userAgent));
}

// Check if it's a bot
function isBot(userAgent: string): boolean {
  return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}

// Main fraud detection function
export function calculateFraudScore(
  ipAddress: string,
  userAgent: string,
  affiliateId: string,
  offerId: string,
  referrer: string | null,
  deviceInfo: {
    deviceType: string | null;
    browserName: string | null;
    osName: string | null;
  }
): FraudResult {
  const signals: FraudSignals = {
    isBot: false,
    isDuplicateIP: false,
    clickVelocityTooHigh: false,
    suspiciousUserAgent: false,
    headlessBrowser: false,
    datacenterIP: false,
    noReferrer: false,
    missingDeviceInfo: false,
    unusualTimePattern: false,
    knownBadIP: false,
  };

  let score = 0;
  const reasons: string[] = [];

  // Check for bot
  if (isBot(userAgent)) {
    signals.isBot = true;
    score += 50;
    reasons.push('Bot detected');
  }

  // Check for duplicate IP (recent click from same IP)
  const existingClick = db.prepare(`
    SELECT id FROM clicks
    WHERE ip_address = ? AND offer_id = ?
    AND created_at > datetime('now', '-24 hours')
  `).get(ipAddress, offerId);

  if (existingClick) {
    signals.isDuplicateIP = true;
    score += 15;
    reasons.push('Duplicate IP');
  }

  // Check click velocity
  const velocity = getClickVelocity(ipAddress, affiliateId, offerId);
  if (velocity > 10) { // More than 10 clicks per 5 minutes
    signals.clickVelocityTooHigh = true;
    score += Math.min(30, velocity * 2); // Cap at 30 points
    reasons.push(`High click velocity (${velocity})`);
  }

  // Check suspicious user agent
  if (isSuspiciousUserAgent(userAgent)) {
    signals.suspiciousUserAgent = true;
    score += 25;
    reasons.push('Suspicious user agent');
  }

  // Check for headless browser
  if (isHeadlessBrowser(userAgent)) {
    signals.headlessBrowser = true;
    score += 40;
    reasons.push('Headless browser');
  }

  // Check for datacenter IP
  if (isDatacenterIP(ipAddress)) {
    signals.datacenterIP = true;
    score += 20;
    reasons.push('Datacenter IP');
  }

  // Check for missing referrer (can indicate direct bot access)
  if (!referrer) {
    signals.noReferrer = true;
    score += 5; // Low weight as direct links are sometimes legitimate
    reasons.push('No referrer');
  }

  // Check for missing device info
  if (!deviceInfo.browserName || !deviceInfo.osName) {
    signals.missingDeviceInfo = true;
    score += 15;
    reasons.push('Missing device info');
  }

  // Check for unusual time patterns
  if (checkTimePatterns(ipAddress, affiliateId)) {
    signals.unusualTimePattern = true;
    score += 25;
    reasons.push('Unusual timing pattern');
  }

  // Cap score at 100
  score = Math.min(100, score);

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (score <= 20) {
    riskLevel = 'low';
  } else if (score <= 50) {
    riskLevel = 'medium';
  } else if (score <= 80) {
    riskLevel = 'high';
  } else {
    riskLevel = 'critical';
  }

  return {
    score,
    signals,
    riskLevel,
    reason: reasons.length > 0 ? reasons.join(', ') : 'Clean'
  };
}

// Get fraud statistics for an affiliate
export function getAffiliateFraudStats(affiliateId: string, days: number = 7): {
  totalClicks: number;
  suspiciousClicks: number;
  botClicks: number;
  averageFraudScore: number;
  topSignals: { signal: string; count: number }[];
} {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_clicks,
      SUM(CASE WHEN fraud_score > 50 THEN 1 ELSE 0 END) as suspicious_clicks,
      SUM(CASE WHEN is_bot = 1 THEN 1 ELSE 0 END) as bot_clicks,
      AVG(fraud_score) as avg_fraud_score
    FROM clicks
    WHERE affiliate_id = ? AND created_at >= ?
  `).get(affiliateId, startDate) as any;

  return {
    totalClicks: stats.total_clicks || 0,
    suspiciousClicks: stats.suspicious_clicks || 0,
    botClicks: stats.bot_clicks || 0,
    averageFraudScore: Math.round((stats.avg_fraud_score || 0) * 100) / 100,
    topSignals: [] // Would need additional tracking to populate this
  };
}

// Get network-wide fraud overview
export function getNetworkFraudOverview(days: number = 7): {
  totalClicks: number;
  flaggedClicks: number;
  blockedClicks: number;
  fraudRate: number;
  topFraudulentAffiliates: { affiliateId: string; email: string; fraudScore: number }[];
} {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const overview = db.prepare(`
    SELECT
      COUNT(*) as total_clicks,
      SUM(CASE WHEN fraud_score > 50 THEN 1 ELSE 0 END) as flagged_clicks,
      SUM(CASE WHEN fraud_score > 80 THEN 1 ELSE 0 END) as blocked_clicks
    FROM clicks
    WHERE created_at >= ?
  `).get(startDate) as any;

  const topFraudulent = db.prepare(`
    SELECT
      c.affiliate_id,
      u.email,
      AVG(c.fraud_score) as avg_fraud_score
    FROM clicks c
    JOIN users u ON c.affiliate_id = u.id
    WHERE c.created_at >= ?
    GROUP BY c.affiliate_id
    HAVING avg_fraud_score > 30
    ORDER BY avg_fraud_score DESC
    LIMIT 10
  `).all(startDate) as any[];

  const totalClicks = overview.total_clicks || 0;
  const flaggedClicks = overview.flagged_clicks || 0;

  return {
    totalClicks,
    flaggedClicks,
    blockedClicks: overview.blocked_clicks || 0,
    fraudRate: totalClicks > 0 ? Math.round((flaggedClicks / totalClicks) * 10000) / 100 : 0,
    topFraudulentAffiliates: topFraudulent.map(a => ({
      affiliateId: a.affiliate_id,
      email: a.email,
      fraudScore: Math.round(a.avg_fraud_score * 100) / 100
    }))
  };
}
