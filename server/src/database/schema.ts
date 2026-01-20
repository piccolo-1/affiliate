import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../data/affiliate.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initializeDatabase() {
  // Users table - supports affiliates, advertisers, and admins
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      company TEXT,
      role TEXT NOT NULL DEFAULT 'affiliate' CHECK (role IN ('affiliate', 'advertiser', 'admin')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
      referral_code TEXT UNIQUE,
      referred_by TEXT REFERENCES users(id),
      payout_method TEXT DEFAULT 'paypal',
      payout_details TEXT,
      minimum_payout REAL DEFAULT 50.00,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Offers table - campaigns that affiliates can promote
  db.exec(`
    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      url TEXT NOT NULL,
      preview_url TEXT,
      advertiser_id TEXT REFERENCES users(id),
      category TEXT,
      payout_type TEXT NOT NULL DEFAULT 'cpa' CHECK (payout_type IN ('cpa', 'cpl', 'cpc', 'cpm', 'revshare')),
      payout_amount REAL NOT NULL DEFAULT 0,
      revenue_amount REAL NOT NULL DEFAULT 0,
      conversion_cap INTEGER,
      daily_cap INTEGER,
      monthly_cap INTEGER,
      countries TEXT, -- JSON array of allowed country codes
      allowed_traffic TEXT, -- JSON array of allowed traffic types
      restricted_traffic TEXT, -- JSON array of restricted traffic types
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired', 'pending')),
      requires_approval INTEGER DEFAULT 0,
      tracking_domain TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Affiliate-Offer assignments (which affiliates can run which offers)
  db.exec(`
    CREATE TABLE IF NOT EXISTS affiliate_offers (
      id TEXT PRIMARY KEY,
      affiliate_id TEXT NOT NULL REFERENCES users(id),
      offer_id TEXT NOT NULL REFERENCES offers(id),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
      custom_payout REAL,
      custom_tracking_link TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(affiliate_id, offer_id)
    )
  `);

  // Tracking links generated for affiliates
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracking_links (
      id TEXT PRIMARY KEY,
      affiliate_id TEXT NOT NULL REFERENCES users(id),
      offer_id TEXT NOT NULL REFERENCES offers(id),
      short_code TEXT UNIQUE NOT NULL,
      name TEXT,
      default_sub1 TEXT,
      default_sub2 TEXT,
      default_sub3 TEXT,
      default_sub4 TEXT,
      default_sub5 TEXT,
      redirect_type TEXT DEFAULT '302',
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Clicks table - main tracking table for all clicks
  db.exec(`
    CREATE TABLE IF NOT EXISTS clicks (
      id TEXT PRIMARY KEY,
      click_id TEXT UNIQUE NOT NULL,
      tracking_link_id TEXT REFERENCES tracking_links(id),
      affiliate_id TEXT NOT NULL REFERENCES users(id),
      offer_id TEXT NOT NULL REFERENCES offers(id),

      -- Sub-ID parameters (Everflow style)
      sub1 TEXT,
      sub2 TEXT,
      sub3 TEXT,
      sub4 TEXT,
      sub5 TEXT,

      -- Device and browser info
      ip_address TEXT,
      user_agent TEXT,
      device_type TEXT,
      device_brand TEXT,
      device_model TEXT,
      os_name TEXT,
      os_version TEXT,
      browser_name TEXT,
      browser_version TEXT,

      -- Geo data
      country TEXT,
      country_code TEXT,
      region TEXT,
      city TEXT,

      -- Referrer info
      referrer TEXT,
      referrer_domain TEXT,

      -- Landing page
      landing_page TEXT,

      -- UTM parameters
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      utm_term TEXT,

      -- Timestamps
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      -- Fraud detection flags
      is_unique INTEGER DEFAULT 1,
      is_bot INTEGER DEFAULT 0,
      fraud_score REAL DEFAULT 0
    )
  `);

  // Conversions table - tracks all conversions/events
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversions (
      id TEXT PRIMARY KEY,
      click_id TEXT REFERENCES clicks(click_id),
      affiliate_id TEXT NOT NULL REFERENCES users(id),
      offer_id TEXT NOT NULL REFERENCES offers(id),

      -- Conversion details
      conversion_id TEXT, -- External conversion ID from advertiser
      event_type TEXT DEFAULT 'conversion', -- conversion, lead, sale, install, etc.
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'reversed')),

      -- Revenue and payout
      revenue REAL DEFAULT 0,
      payout REAL DEFAULT 0,
      sale_amount REAL, -- For revshare
      currency TEXT DEFAULT 'USD',

      -- Sub-IDs (copied from click for easier querying)
      sub1 TEXT,
      sub2 TEXT,
      sub3 TEXT,
      sub4 TEXT,
      sub5 TEXT,

      -- Additional data
      ip_address TEXT,
      user_agent TEXT,
      country TEXT,

      -- Postback data
      transaction_id TEXT,
      advertiser_ref TEXT,

      -- Notes
      notes TEXT,
      rejection_reason TEXT,

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Payouts table - tracks affiliate payments
  db.exec(`
    CREATE TABLE IF NOT EXISTS payouts (
      id TEXT PRIMARY KEY,
      affiliate_id TEXT NOT NULL REFERENCES users(id),
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
      payment_method TEXT,
      payment_details TEXT,
      transaction_id TEXT,
      period_start DATE,
      period_end DATE,
      notes TEXT,
      processed_by TEXT REFERENCES users(id),
      processed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Postback URLs - for sending conversion data to affiliates
  db.exec(`
    CREATE TABLE IF NOT EXISTS postback_urls (
      id TEXT PRIMARY KEY,
      affiliate_id TEXT NOT NULL REFERENCES users(id),
      offer_id TEXT REFERENCES offers(id), -- NULL means global postback
      url TEXT NOT NULL,
      event_type TEXT DEFAULT 'conversion',
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
      method TEXT DEFAULT 'GET' CHECK (method IN ('GET', 'POST')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Postback logs - track all postback attempts
  db.exec(`
    CREATE TABLE IF NOT EXISTS postback_logs (
      id TEXT PRIMARY KEY,
      postback_url_id TEXT REFERENCES postback_urls(id),
      conversion_id TEXT REFERENCES conversions(id),
      request_url TEXT,
      request_body TEXT,
      response_code INTEGER,
      response_body TEXT,
      success INTEGER DEFAULT 0,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Daily stats table for fast reporting
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_stats (
      id TEXT PRIMARY KEY,
      date DATE NOT NULL,
      affiliate_id TEXT REFERENCES users(id),
      offer_id TEXT REFERENCES offers(id),
      clicks INTEGER DEFAULT 0,
      unique_clicks INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      revenue REAL DEFAULT 0,
      payout REAL DEFAULT 0,
      epc REAL DEFAULT 0,
      conversion_rate REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, affiliate_id, offer_id)
    )
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_clicks_affiliate_id ON clicks(affiliate_id);
    CREATE INDEX IF NOT EXISTS idx_clicks_offer_id ON clicks(offer_id);
    CREATE INDEX IF NOT EXISTS idx_clicks_created_at ON clicks(created_at);
    CREATE INDEX IF NOT EXISTS idx_clicks_click_id ON clicks(click_id);
    CREATE INDEX IF NOT EXISTS idx_conversions_affiliate_id ON conversions(affiliate_id);
    CREATE INDEX IF NOT EXISTS idx_conversions_offer_id ON conversions(offer_id);
    CREATE INDEX IF NOT EXISTS idx_conversions_click_id ON conversions(click_id);
    CREATE INDEX IF NOT EXISTS idx_conversions_created_at ON conversions(created_at);
    CREATE INDEX IF NOT EXISTS idx_tracking_links_short_code ON tracking_links(short_code);
    CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
  `);

  console.log('Database initialized successfully');
}

export default db;
