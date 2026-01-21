import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';
import db, { initializeDatabase } from './database/schema';

async function seed() {
  console.log('🚀 Seeding database...\n');

  initializeDatabase();

  // ===========================
  // USERS
  // ===========================

  // Create admin user
  const adminId = uuidv4();
  const adminPassword = await bcrypt.hash('admin123', 10);

  try {
    db.prepare(`
      INSERT INTO users (id, email, password, first_name, last_name, role, status, referral_code)
      VALUES (?, ?, ?, ?, ?, 'admin', 'active', ?)
    `).run(adminId, 'admin@example.com', adminPassword, 'Admin', 'User', 'ADMIN001');
    console.log('✅ Created admin user: admin@example.com / admin123');
  } catch (e) {
    console.log('ℹ️  Admin user already exists');
  }

  // Create managers
  const managerId = uuidv4();
  const manager2Id = uuidv4();
  const managerPassword = await bcrypt.hash('manager123', 10);

  try {
    db.prepare(`
      INSERT INTO users (id, email, password, first_name, last_name, role, status, referral_code, skype, telegram)
      VALUES (?, ?, ?, ?, ?, 'manager', 'active', ?, ?, ?)
    `).run(managerId, 'sarah@example.com', managerPassword, 'Sarah', 'Johnson', 'MGR001', 'live:sarah.am', '@sarah_am');
    console.log('✅ Created manager: sarah@example.com / manager123');
  } catch (e) {
    console.log('ℹ️  Manager Sarah already exists');
  }

  try {
    db.prepare(`
      INSERT INTO users (id, email, password, first_name, last_name, role, status, referral_code, skype, telegram)
      VALUES (?, ?, ?, ?, ?, 'manager', 'active', ?, ?, ?)
    `).run(manager2Id, 'mike@example.com', managerPassword, 'Mike', 'Williams', 'MGR002', 'live:mike.am', '@mike_am');
    console.log('✅ Created manager: mike@example.com / manager123');
  } catch (e) {
    console.log('ℹ️  Manager Mike already exists');
  }

  // Create demo affiliate
  const affiliateId = uuidv4();
  const affiliatePassword = await bcrypt.hash('demo123', 10);

  try {
    db.prepare(`
      INSERT INTO users (id, email, password, first_name, last_name, company, role, status, referral_code, manager_id, payout_method, payout_details)
      VALUES (?, ?, ?, ?, ?, ?, 'affiliate', 'active', ?, ?, 'paypal', 'demo@paypal.com')
    `).run(affiliateId, 'demo@example.com', affiliatePassword, 'Demo', 'Affiliate', 'Demo Media LLC', 'DEMO1234', managerId);
    console.log('✅ Created affiliate: demo@example.com / demo123');
  } catch (e) {
    console.log('ℹ️  Demo affiliate already exists');
  }

  // Create additional affiliates
  const affiliate2Id = uuidv4();
  const affiliate3Id = uuidv4();

  try {
    db.prepare(`
      INSERT INTO users (id, email, password, first_name, last_name, company, role, status, referral_code, manager_id)
      VALUES (?, ?, ?, ?, ?, ?, 'affiliate', 'active', ?, ?)
    `).run(affiliate2Id, 'john@mediabuyers.com', affiliatePassword, 'John', 'Smith', 'Media Buyers Inc', 'JOHN5678', managerId);
    console.log('✅ Created affiliate: john@mediabuyers.com');
  } catch (e) {
    console.log('ℹ️  John affiliate already exists');
  }

  try {
    db.prepare(`
      INSERT INTO users (id, email, password, first_name, last_name, company, role, status, referral_code, manager_id)
      VALUES (?, ?, ?, ?, ?, ?, 'affiliate', 'pending', ?, ?)
    `).run(affiliate3Id, 'pending@example.com', affiliatePassword, 'New', 'Applicant', 'Startup Media', 'PEND9999', manager2Id);
    console.log('✅ Created pending affiliate: pending@example.com');
  } catch (e) {
    console.log('ℹ️  Pending affiliate already exists');
  }

  // ===========================
  // OFFERS
  // ===========================

  console.log('\n📦 Creating offers...');

  const offers = [
    {
      id: uuidv4(),
      name: 'Premium VPN Pro',
      description: 'Top-converting VPN offer with global appeal. Strong brand recognition and excellent conversion rates. Pays per successful subscription sign-up.',
      url: 'https://example.com/vpn?click_id={click_id}&sub1={sub1}&sub2={sub2}',
      category: 'Security Software',
      vertical: 'software',
      payoutType: 'cpa',
      payoutAmount: 45.00,
      revenueAmount: 60.00,
      countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR'],
      allowedTraffic: ['search', 'social', 'native', 'display', 'email'],
      restrictedTraffic: ['incentive', 'adult', 'pop'],
      isFeatured: true,
      isTop: true
    },
    {
      id: uuidv4(),
      name: 'LoveConnect Dating App',
      description: 'Premium dating app for singles aged 25-45. High engagement rates and excellent user retention. iOS and Android.',
      url: 'https://example.com/dating?click_id={click_id}',
      category: 'Dating Apps',
      vertical: 'dating',
      payoutType: 'cpi',
      payoutAmount: 3.50,
      revenueAmount: 5.00,
      countries: ['US', 'CA', 'GB', 'AU'],
      allowedTraffic: ['social', 'native', 'push', 'display'],
      restrictedTraffic: ['adult', 'incentive', 'email'],
      isTop: true
    },
    {
      id: uuidv4(),
      name: 'Royal Casino - First Deposit Bonus',
      description: 'Licensed online casino with 500+ games. 200% first deposit bonus. Requires $20+ FTD. Tier 1 GEOs only.',
      url: 'https://example.com/casino?click_id={click_id}',
      category: 'iGaming',
      vertical: 'gaming',
      payoutType: 'cpa',
      payoutAmount: 150.00,
      revenueAmount: 200.00,
      countries: ['CA', 'GB', 'NZ', 'AU', 'DE'],
      allowedTraffic: ['search', 'native', 'email', 'seo'],
      restrictedTraffic: ['social', 'display', 'push'],
      requiresApproval: true,
      isFeatured: true
    },
    {
      id: uuidv4(),
      name: 'CryptoTrade Pro Exchange',
      description: 'Leading cryptocurrency exchange platform. Pays on funded accounts with $100+ deposit. Strong LTV.',
      url: 'https://example.com/crypto?click_id={click_id}',
      category: 'Crypto Exchange',
      vertical: 'crypto',
      payoutType: 'cpa',
      payoutAmount: 300.00,
      revenueAmount: 400.00,
      countries: ['US', 'GB', 'AU', 'SG', 'DE', 'JP'],
      allowedTraffic: ['search', 'native', 'email', 'youtube', 'seo'],
      restrictedTraffic: ['incentive', 'adult', 'pop'],
      requiresApproval: true,
      isTop: true
    },
    {
      id: uuidv4(),
      name: 'ForexMaster Trading Platform',
      description: 'Professional forex/CFD trading platform. Pays on funded accounts with verified identity. High payouts.',
      url: 'https://example.com/forex?click_id={click_id}',
      category: 'Trading',
      vertical: 'finance',
      payoutType: 'cpa',
      payoutAmount: 400.00,
      revenueAmount: 500.00,
      countries: ['US', 'GB', 'AU', 'SG', 'AE'],
      allowedTraffic: ['search', 'native', 'email', 'youtube'],
      restrictedTraffic: ['incentive', 'adult', 'social', 'pop'],
      requiresApproval: true,
      isFeatured: true
    },
    {
      id: uuidv4(),
      name: 'KetoMax Weight Loss',
      description: 'Best-selling keto supplement for weight loss. Trial offer with upsells. Strong funnel with 30% rebill rate.',
      url: 'https://example.com/keto?click_id={click_id}',
      category: 'Weight Loss',
      vertical: 'nutra',
      payoutType: 'cpa',
      payoutAmount: 35.00,
      revenueAmount: 45.00,
      countries: ['US', 'CA'],
      allowedTraffic: ['native', 'email', 'search', 'seo'],
      restrictedTraffic: ['social', 'adult', 'pop'],
      isTop: true
    },
    {
      id: uuidv4(),
      name: 'CBD Relief Plus',
      description: 'Premium CBD oil for pain relief and wellness. High-quality organic ingredients. Trial with subscription.',
      url: 'https://example.com/cbd?click_id={click_id}',
      category: 'Health & Wellness',
      vertical: 'nutra',
      payoutType: 'cpa',
      payoutAmount: 42.00,
      revenueAmount: 55.00,
      countries: ['US', 'CA', 'GB'],
      allowedTraffic: ['native', 'email', 'display', 'seo'],
      restrictedTraffic: ['social', 'search', 'pop']
    },
    {
      id: uuidv4(),
      name: 'ShopSmart Cashback',
      description: 'Cashback shopping app with 10,000+ retailers. Up to 40% cashback. Simple email submit.',
      url: 'https://example.com/cashback?click_id={click_id}',
      category: 'Shopping',
      vertical: 'ecommerce',
      payoutType: 'cpl',
      payoutAmount: 2.00,
      revenueAmount: 3.00,
      countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES'],
      allowedTraffic: ['search', 'social', 'native', 'display', 'email', 'push'],
      restrictedTraffic: ['incentive', 'adult'],
      isFeatured: true
    },
    {
      id: uuidv4(),
      name: 'Win iPhone 15 Pro Max',
      description: 'High-converting sweepstakes offer. Simple email/zip submit. Fresh creative assets available.',
      url: 'https://example.com/iphone?click_id={click_id}',
      category: 'Tech Sweepstakes',
      vertical: 'sweepstakes',
      payoutType: 'cpl',
      payoutAmount: 1.50,
      revenueAmount: 2.50,
      countries: ['US', 'CA', 'GB', 'AU'],
      allowedTraffic: ['push', 'pop', 'social', 'native', 'display'],
      restrictedTraffic: ['email', 'search'],
      isFeatured: true,
      isTop: true
    },
    {
      id: uuidv4(),
      name: 'Auto Insurance Quotes',
      description: 'High-intent auto insurance lead generation. Pre-qualified leads with 90%+ contact rate.',
      url: 'https://example.com/insurance?click_id={click_id}',
      category: 'Insurance',
      vertical: 'leadgen',
      payoutType: 'cpl',
      payoutAmount: 12.00,
      revenueAmount: 18.00,
      countries: ['US'],
      allowedTraffic: ['search', 'native', 'email', 'seo'],
      restrictedTraffic: ['incentive', 'adult', 'pop']
    },
    {
      id: uuidv4(),
      name: 'BetKing Sports',
      description: 'Legal sports betting app. Available in 20+ US states. First deposit bonus up to $500.',
      url: 'https://example.com/sportsbet?click_id={click_id}',
      category: 'Sports Betting',
      vertical: 'gaming',
      payoutType: 'cpa',
      payoutAmount: 75.00,
      revenueAmount: 100.00,
      countries: ['US'],
      allowedTraffic: ['search', 'native', 'social', 'video', 'seo'],
      restrictedTraffic: ['email', 'push', 'pop'],
      requiresApproval: true,
      isTop: true
    },
    {
      id: uuidv4(),
      name: 'Kingdom Quest Mobile Game',
      description: 'Hit mobile strategy game with 50M+ downloads. High volume potential. Android & iOS.',
      url: 'https://example.com/game?click_id={click_id}',
      category: 'Mobile Gaming',
      vertical: 'gaming',
      payoutType: 'cpi',
      payoutAmount: 1.50,
      revenueAmount: 2.50,
      countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP', 'KR'],
      allowedTraffic: ['social', 'native', 'display', 'video', 'push'],
      restrictedTraffic: ['incentive', 'adult']
    },
    {
      id: uuidv4(),
      name: 'CloudHost Pro',
      description: 'Enterprise cloud hosting solution. 99.99% uptime guarantee. Pays per new business account.',
      url: 'https://example.com/hosting?click_id={click_id}',
      category: 'Web Hosting',
      vertical: 'software',
      payoutType: 'cpa',
      payoutAmount: 100.00,
      revenueAmount: 150.00,
      countries: ['US', 'CA', 'GB', 'AU', 'DE'],
      allowedTraffic: ['search', 'native', 'email', 'seo', 'youtube'],
      restrictedTraffic: ['pop', 'adult', 'incentive'],
      requiresApproval: true
    },
    {
      id: uuidv4(),
      name: 'Solar Panel Quotes',
      description: 'Residential solar panel installation leads. Homeowners only. High-value leads.',
      url: 'https://example.com/solar?click_id={click_id}',
      category: 'Home Improvement',
      vertical: 'leadgen',
      payoutType: 'cpl',
      payoutAmount: 25.00,
      revenueAmount: 40.00,
      countries: ['US'],
      allowedTraffic: ['search', 'native', 'email', 'display'],
      restrictedTraffic: ['incentive', 'adult', 'pop'],
      requiresApproval: true,
      isFeatured: true
    },
    {
      id: uuidv4(),
      name: 'Credit Card Comparison',
      description: 'Compare top credit cards and earn rewards. Simple application submit.',
      url: 'https://example.com/creditcard?click_id={click_id}',
      category: 'Credit Cards',
      vertical: 'finance',
      payoutType: 'cpl',
      payoutAmount: 35.00,
      revenueAmount: 50.00,
      countries: ['US'],
      allowedTraffic: ['search', 'native', 'email', 'seo'],
      restrictedTraffic: ['incentive', 'adult', 'pop', 'social'],
      requiresApproval: true
    }
  ];

  const offerIds: string[] = [];

  for (const offer of offers) {
    try {
      db.prepare(`
        INSERT INTO offers (
          id, name, description, url, category, vertical, payout_type, payout_amount, revenue_amount,
          countries, allowed_traffic, restricted_traffic, requires_approval, is_featured, is_top, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).run(
        offer.id,
        offer.name,
        offer.description,
        offer.url,
        offer.category,
        offer.vertical,
        offer.payoutType,
        offer.payoutAmount,
        offer.revenueAmount,
        JSON.stringify(offer.countries),
        JSON.stringify(offer.allowedTraffic),
        JSON.stringify(offer.restrictedTraffic),
        (offer as any).requiresApproval ? 1 : 0,
        (offer as any).isFeatured ? 1 : 0,
        (offer as any).isTop ? 1 : 0
      );
      offerIds.push(offer.id);
      console.log(`  ✅ ${offer.name} (${offer.vertical} - $${offer.payoutAmount} ${offer.payoutType.toUpperCase()})`);
    } catch (e) {
      console.log(`  ℹ️  ${offer.name} may already exist`);
      // Try to get existing offer ID
      const existing = db.prepare('SELECT id FROM offers WHERE name = ?').get(offer.name) as any;
      if (existing) offerIds.push(existing.id);
    }
  }

  // ===========================
  // AFFILIATE-OFFER APPROVALS
  // ===========================

  console.log('\n🔗 Setting up affiliate offer approvals...');

  // Approve demo affiliate for most offers
  for (let i = 0; i < Math.min(offerIds.length, 10); i++) {
    const offerId = offerIds[i];
    try {
      db.prepare(`
        INSERT INTO affiliate_offers (id, affiliate_id, offer_id, status)
        VALUES (?, ?, ?, 'approved')
      `).run(uuidv4(), affiliateId, offerId);
    } catch (e) {
      // Already exists
    }
  }
  console.log('  ✅ Approved demo affiliate for 10 offers');

  // ===========================
  // TRACKING LINKS
  // ===========================

  console.log('\n🔗 Creating tracking links...');

  const trackingLinks: { id: string; offerId: string; shortCode: string }[] = [];

  // Create tracking links for demo affiliate
  const linkConfigs = [
    { offerId: offerIds[0], name: 'Facebook - VPN Campaign', sub1: 'facebook', sub2: 'vpn_main' },
    { offerId: offerIds[1], name: 'TikTok - Dating', sub1: 'tiktok', sub2: 'dating_25plus' },
    { offerId: offerIds[5], name: 'Native - Keto', sub1: 'taboola', sub2: 'keto_diet' },
    { offerId: offerIds[8], name: 'Push - Sweeps', sub1: 'propellerads', sub2: 'iphone_sweeps' },
    { offerId: offerIds[7], name: 'Email - Cashback', sub1: 'email', sub2: 'cashback_promo' },
  ];

  for (const config of linkConfigs) {
    if (!config.offerId) continue;
    const linkId = uuidv4();
    const shortCode = nanoid(8);
    try {
      db.prepare(`
        INSERT INTO tracking_links (id, affiliate_id, offer_id, short_code, name, default_sub1, default_sub2, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
      `).run(linkId, affiliateId, config.offerId, shortCode, config.name, config.sub1, config.sub2);
      trackingLinks.push({ id: linkId, offerId: config.offerId, shortCode });
      console.log(`  ✅ ${config.name} (/${shortCode})`);
    } catch (e) {
      console.log(`  ℹ️  Link ${config.name} may already exist`);
    }
  }

  // ===========================
  // GENERATE SAMPLE DATA
  // ===========================

  console.log('\n📊 Generating sample clicks and conversions...');

  const countries = ['US', 'CA', 'GB', 'AU', 'DE'];
  const devices = ['desktop', 'mobile', 'tablet'];
  const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge'];
  const oses = ['Windows', 'macOS', 'iOS', 'Android'];
  const sources = ['facebook', 'google', 'taboola', 'tiktok', 'email', 'organic'];

  // Generate data for the last 30 days
  const now = new Date();
  let totalClicks = 0;
  let totalConversions = 0;

  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(0, 0, 0, 0);

    // More activity on recent days
    const activityMultiplier = Math.max(0.3, 1 - (daysAgo / 40));
    const dailyClicks = Math.floor((Math.random() * 100 + 50) * activityMultiplier);

    for (let i = 0; i < dailyClicks; i++) {
      if (trackingLinks.length === 0) break;

      const link = trackingLinks[Math.floor(Math.random() * trackingLinks.length)];
      const clickId = `clk_${nanoid(16)}`;
      const country = countries[Math.floor(Math.random() * countries.length)];
      const device = devices[Math.floor(Math.random() * devices.length)];
      const browser = browsers[Math.floor(Math.random() * browsers.length)];
      const os = oses[Math.floor(Math.random() * oses.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];

      // Random time during the day
      const clickDate = new Date(date);
      clickDate.setHours(Math.floor(Math.random() * 24));
      clickDate.setMinutes(Math.floor(Math.random() * 60));

      try {
        db.prepare(`
          INSERT INTO clicks (
            id, click_id, tracking_link_id, affiliate_id, offer_id,
            sub1, sub2, ip_address, user_agent, device_type, browser_name, os_name,
            country, country_code, is_unique, is_bot, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          clickId,
          link.id,
          affiliateId,
          link.offerId,
          source,
          `campaign_${Math.floor(Math.random() * 10)}`,
          `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
          `Mozilla/5.0 (${device})`,
          device,
          browser,
          os,
          country,
          country,
          Math.random() > 0.2 ? 1 : 0,
          Math.random() > 0.95 ? 1 : 0,
          clickDate.toISOString()
        );
        totalClicks++;

        // Generate conversion (5-15% conversion rate depending on offer)
        const offer = offers.find(o => o.id === link.offerId);
        const conversionRate = offer?.payoutType === 'cpl' ? 0.15 : 0.08;

        if (Math.random() < conversionRate) {
          const conversionDate = new Date(clickDate);
          conversionDate.setMinutes(conversionDate.getMinutes() + Math.floor(Math.random() * 60) + 5);

          const statuses = ['approved', 'approved', 'approved', 'pending', 'rejected'];
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          const payout = offer?.payoutAmount || 10;
          const revenue = offer?.revenueAmount || 15;

          db.prepare(`
            INSERT INTO conversions (
              id, click_id, affiliate_id, offer_id, status, revenue, payout,
              sub1, sub2, country, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            uuidv4(),
            clickId,
            affiliateId,
            link.offerId,
            status,
            status === 'approved' ? revenue : 0,
            status === 'approved' ? payout : 0,
            source,
            `campaign_${Math.floor(Math.random() * 10)}`,
            country,
            conversionDate.toISOString()
          );
          totalConversions++;
        }
      } catch (e) {
        // Click ID collision, skip
      }
    }
  }

  console.log(`  ✅ Generated ${totalClicks} clicks`);
  console.log(`  ✅ Generated ${totalConversions} conversions`);

  // ===========================
  // AGGREGATE DAILY STATS
  // ===========================

  console.log('\n📈 Aggregating daily statistics...');

  db.exec(`
    INSERT OR REPLACE INTO daily_stats (id, date, affiliate_id, offer_id, clicks, unique_clicks, conversions, revenue, payout, epc, conversion_rate)
    SELECT
      lower(hex(randomblob(16))),
      date(c.created_at),
      c.affiliate_id,
      c.offer_id,
      COUNT(*) as clicks,
      SUM(CASE WHEN c.is_unique = 1 THEN 1 ELSE 0 END) as unique_clicks,
      (SELECT COUNT(*) FROM conversions cv WHERE cv.affiliate_id = c.affiliate_id AND cv.offer_id = c.offer_id AND date(cv.created_at) = date(c.created_at) AND cv.status = 'approved') as conversions,
      (SELECT COALESCE(SUM(revenue), 0) FROM conversions cv WHERE cv.affiliate_id = c.affiliate_id AND cv.offer_id = c.offer_id AND date(cv.created_at) = date(c.created_at) AND cv.status = 'approved') as revenue,
      (SELECT COALESCE(SUM(payout), 0) FROM conversions cv WHERE cv.affiliate_id = c.affiliate_id AND cv.offer_id = c.offer_id AND date(cv.created_at) = date(c.created_at) AND cv.status = 'approved') as payout,
      CASE WHEN COUNT(*) > 0 THEN ROUND((SELECT COALESCE(SUM(payout), 0) FROM conversions cv WHERE cv.affiliate_id = c.affiliate_id AND cv.offer_id = c.offer_id AND date(cv.created_at) = date(c.created_at) AND cv.status = 'approved') * 1.0 / COUNT(*), 4) ELSE 0 END as epc,
      CASE WHEN COUNT(*) > 0 THEN ROUND((SELECT COUNT(*) FROM conversions cv WHERE cv.affiliate_id = c.affiliate_id AND cv.offer_id = c.offer_id AND date(cv.created_at) = date(c.created_at) AND cv.status = 'approved') * 100.0 / COUNT(*), 2) ELSE 0 END as conversion_rate
    FROM clicks c
    GROUP BY date(c.created_at), c.affiliate_id, c.offer_id
  `);

  console.log('  ✅ Daily stats aggregated');

  // ===========================
  // POSTBACK URLs
  // ===========================

  console.log('\n🔔 Setting up postback URLs...');

  try {
    db.prepare(`
      INSERT INTO postback_urls (id, affiliate_id, url, event_type, status, method)
      VALUES (?, ?, ?, 'conversion', 'active', 'GET')
    `).run(
      uuidv4(),
      affiliateId,
      'https://mytracker.com/postback?clickid={click_id}&payout={payout}&status={status}'
    );
    console.log('  ✅ Created global postback URL for demo affiliate');
  } catch (e) {
    console.log('  ℹ️  Postback URL already exists');
  }

  // ===========================
  // SUMMARY
  // ===========================

  console.log('\n' + '='.repeat(50));
  console.log('✅ DATABASE SEEDING COMPLETE!');
  console.log('='.repeat(50));

  // Get counts
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
  const offerCount = (db.prepare('SELECT COUNT(*) as count FROM offers').get() as any).count;
  const clickCount = (db.prepare('SELECT COUNT(*) as count FROM clicks').get() as any).count;
  const conversionCount = (db.prepare('SELECT COUNT(*) as count FROM conversions').get() as any).count;

  console.log(`\n📊 Database Statistics:`);
  console.log(`   Users: ${userCount}`);
  console.log(`   Offers: ${offerCount}`);
  console.log(`   Clicks: ${clickCount}`);
  console.log(`   Conversions: ${conversionCount}`);

  console.log('\n📋 Demo Accounts:');
  console.log('   ┌────────────────────────────────────────────┐');
  console.log('   │ ADMIN                                      │');
  console.log('   │ Email: admin@example.com                   │');
  console.log('   │ Password: admin123                         │');
  console.log('   ├────────────────────────────────────────────┤');
  console.log('   │ AFFILIATE                                  │');
  console.log('   │ Email: demo@example.com                    │');
  console.log('   │ Password: demo123                          │');
  console.log('   ├────────────────────────────────────────────┤');
  console.log('   │ MANAGER                                    │');
  console.log('   │ Email: sarah@example.com                   │');
  console.log('   │ Password: manager123                       │');
  console.log('   └────────────────────────────────────────────┘');

  console.log('\n🚀 Run the server with: npm run dev');
  console.log('');
}

seed().catch(console.error);
