import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from './database/connection';
import { initializeDatabase } from './database/schema';

const isProduction = process.env.NODE_ENV === 'production';

async function seed() {
  console.log('Seeding database...');

  initializeDatabase();

  // In production, only create admin if ADMIN_EMAIL and ADMIN_PASSWORD are set
  if (isProduction) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.log('⚠️  Production mode: Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables to create admin user');
      console.log('Skipping demo data seeding in production mode.');
      return;
    }

    const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
    if (!existingAdmin) {
      const adminId = uuidv4();
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      db.prepare(`
        INSERT INTO users (id, email, password, first_name, last_name, role, status, referral_code)
        VALUES (?, ?, ?, ?, ?, 'admin', 'active', ?)
      `).run(adminId, adminEmail, hashedPassword, 'Admin', 'User', 'ADMIN' + Math.random().toString(36).substring(2, 6).toUpperCase());
      console.log(`✅ Created admin user: ${adminEmail}`);
    } else {
      console.log('Admin user already exists');
    }

    console.log('\n✅ Production seeding complete!');
    return;
  }

  // Development mode - create demo accounts
  console.log('🔧 Development mode - creating demo accounts...');

  // Create admin user
  const adminId = uuidv4();
  const adminPassword = await bcrypt.hash('admin123', 10);

  try {
    db.prepare(`
      INSERT INTO users (id, email, password, first_name, last_name, role, status, referral_code)
      VALUES (?, ?, ?, ?, ?, 'admin', 'active', ?)
    `).run(adminId, 'admin@example.com', adminPassword, 'Admin', 'User', 'ADMIN001');
    console.log('Created admin user: admin@example.com / admin123');
  } catch (e) {
    console.log('Admin user already exists');
  }

  // Create demo manager
  const managerId = uuidv4();
  const managerPassword = await bcrypt.hash('manager123', 10);

  try {
    db.prepare(`
      INSERT INTO users (id, email, password, first_name, last_name, role, status, referral_code, skype, telegram)
      VALUES (?, ?, ?, ?, ?, 'manager', 'active', ?, ?, ?)
    `).run(managerId, 'manager@example.com', managerPassword, 'Sarah', 'Johnson', 'MGR001', 'live:sarah.manager', '@sarah_manager');
    console.log('Created demo manager: manager@example.com / manager123');
  } catch (e) {
    console.log('Demo manager already exists');
  }

  // Create second manager
  const manager2Id = uuidv4();
  try {
    db.prepare(`
      INSERT INTO users (id, email, password, first_name, last_name, role, status, referral_code, skype, telegram)
      VALUES (?, ?, ?, ?, ?, 'manager', 'active', ?, ?, ?)
    `).run(manager2Id, 'mike@example.com', managerPassword, 'Mike', 'Williams', 'MGR002', 'live:mike.manager', '@mike_manager');
    console.log('Created second manager: mike@example.com / manager123');
  } catch (e) {
    console.log('Second manager already exists');
  }

  // Create demo affiliate (assigned to Sarah)
  const affiliateId = uuidv4();
  const affiliatePassword = await bcrypt.hash('demo123', 10);

  try {
    db.prepare(`
      INSERT INTO users (id, email, password, first_name, last_name, company, role, status, referral_code, manager_id)
      VALUES (?, ?, ?, ?, ?, ?, 'affiliate', 'active', ?, ?)
    `).run(affiliateId, 'demo@example.com', affiliatePassword, 'Demo', 'Affiliate', 'Demo Corp', 'DEMO1234', managerId);
    console.log('Created demo affiliate: demo@example.com / demo123');
  } catch (e) {
    console.log('Demo affiliate already exists');
  }

  // Create demo offers with verticals
  const offers = [
    {
      name: 'Premium VPN Service',
      description: 'High-converting VPN offer with global appeal. Pays per sign-up. Strong brand recognition and excellent conversion rates on search and social traffic.',
      url: 'https://example.com/vpn?click_id={click_id}',
      category: 'Software',
      vertical: 'software',
      payoutType: 'cpa',
      payoutAmount: 45.00,
      revenueAmount: 60.00,
      countries: ['US', 'CA', 'GB', 'AU', 'DE'],
      allowedTraffic: ['search', 'social', 'native', 'display'],
      restrictedTraffic: ['incentive', 'adult'],
      isFeatured: true
    },
    {
      name: 'Dating App Install - iOS',
      description: 'Premium dating app for singles. High engagement rates. Pays for mobile app installs with strong retention.',
      url: 'https://example.com/dating?click_id={click_id}',
      category: 'Dating',
      vertical: 'dating',
      payoutType: 'cpi',
      payoutAmount: 3.50,
      revenueAmount: 5.00,
      countries: ['US', 'CA', 'GB'],
      allowedTraffic: ['social', 'native', 'push'],
      restrictedTraffic: ['adult', 'incentive'],
      isTop: true
    },
    {
      name: 'Online Casino - First Deposit',
      description: 'Licensed online casino with slots, poker, and table games. High-paying casino offer. Requires first-time deposit of $20+.',
      url: 'https://example.com/casino?click_id={click_id}',
      category: 'Casino',
      vertical: 'gaming',
      payoutType: 'cpa',
      payoutAmount: 150.00,
      revenueAmount: 200.00,
      countries: ['CA', 'GB', 'NZ', 'AU'],
      allowedTraffic: ['search', 'native', 'email'],
      restrictedTraffic: ['social', 'display'],
      requiresApproval: true,
      isFeatured: true
    },
    {
      name: 'Crypto Trading Platform',
      description: 'Leading cryptocurrency exchange. Pays on funded accounts with $100+ deposit. High lifetime value.',
      url: 'https://example.com/crypto?click_id={click_id}',
      category: 'Cryptocurrency',
      vertical: 'crypto',
      payoutType: 'cpa',
      payoutAmount: 300.00,
      revenueAmount: 400.00,
      countries: ['US', 'GB', 'AU', 'SG', 'DE'],
      allowedTraffic: ['search', 'native', 'email', 'youtube'],
      restrictedTraffic: ['incentive', 'adult'],
      requiresApproval: true,
      isTop: true
    },
    {
      name: 'Forex Trading Platform',
      description: 'Forex/CFD trading platform. Pays on funded accounts with verified identity.',
      url: 'https://example.com/trading?click_id={click_id}',
      category: 'Finance',
      vertical: 'finance',
      payoutType: 'cpa',
      payoutAmount: 400.00,
      revenueAmount: 500.00,
      countries: ['US', 'GB', 'AU', 'SG'],
      allowedTraffic: ['search', 'native', 'email'],
      restrictedTraffic: ['incentive', 'adult', 'social'],
      requiresApproval: true
    },
    {
      name: 'Keto Diet Supplement',
      description: 'Best-selling keto weight loss supplement. Free trial + shipping. Excellent funnel with upsells.',
      url: 'https://example.com/keto?click_id={click_id}',
      category: 'Weight Loss',
      vertical: 'nutra',
      payoutType: 'cpa',
      payoutAmount: 35.00,
      revenueAmount: 45.00,
      countries: ['US'],
      allowedTraffic: ['native', 'email', 'search'],
      restrictedTraffic: ['social', 'adult'],
      isTop: true
    },
    {
      name: 'CBD Oil Supplement',
      description: 'Premium CBD oil for pain relief and anxiety. Trial offer with recurring billing.',
      url: 'https://example.com/cbd?click_id={click_id}',
      category: 'Health',
      vertical: 'nutra',
      payoutType: 'cpa',
      payoutAmount: 42.00,
      revenueAmount: 55.00,
      countries: ['US', 'CA'],
      allowedTraffic: ['native', 'email', 'display'],
      restrictedTraffic: ['social', 'search']
    },
    {
      name: 'E-commerce Cashback App',
      description: 'Cashback shopping app with 5000+ retailers. Pays for new user sign-ups.',
      url: 'https://example.com/cashback?click_id={click_id}',
      category: 'Shopping',
      vertical: 'ecommerce',
      payoutType: 'cpl',
      payoutAmount: 2.00,
      revenueAmount: 3.00,
      countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR'],
      allowedTraffic: ['search', 'social', 'native', 'display', 'email'],
      restrictedTraffic: ['incentive']
    },
    {
      name: 'iPhone 15 Sweepstakes',
      description: 'Win a free iPhone 15 Pro Max! Email submit sweepstakes with high conversion.',
      url: 'https://example.com/iphone?click_id={click_id}',
      category: 'Sweepstakes',
      vertical: 'sweepstakes',
      payoutType: 'cpl',
      payoutAmount: 1.50,
      revenueAmount: 2.50,
      countries: ['US', 'CA', 'GB', 'AU'],
      allowedTraffic: ['push', 'pop', 'social', 'native'],
      restrictedTraffic: ['email', 'search'],
      isFeatured: true
    },
    {
      name: 'Insurance Quote Lead',
      description: 'Auto insurance quote lead gen. High intent users seeking insurance quotes.',
      url: 'https://example.com/insurance?click_id={click_id}',
      category: 'Insurance',
      vertical: 'leadgen',
      payoutType: 'cpl',
      payoutAmount: 12.00,
      revenueAmount: 18.00,
      countries: ['US'],
      allowedTraffic: ['search', 'native', 'email'],
      restrictedTraffic: ['incentive', 'adult']
    },
    {
      name: 'Sports Betting App',
      description: 'Legal sports betting app. Pays on first deposit of $10+. Available in licensed states.',
      url: 'https://example.com/sportsbet?click_id={click_id}',
      category: 'Sports Betting',
      vertical: 'gaming',
      payoutType: 'cpa',
      payoutAmount: 75.00,
      revenueAmount: 100.00,
      countries: ['US'],
      allowedTraffic: ['search', 'native', 'social', 'video'],
      restrictedTraffic: ['email', 'push'],
      requiresApproval: true,
      isTop: true
    },
    {
      name: 'Mobile Game Install',
      description: 'Popular mobile strategy game. High volume potential with excellent retention rates.',
      url: 'https://example.com/game?click_id={click_id}',
      category: 'Gaming',
      vertical: 'gaming',
      payoutType: 'cpi',
      payoutAmount: 1.50,
      revenueAmount: 2.50,
      countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP'],
      allowedTraffic: ['social', 'native', 'display', 'video'],
      restrictedTraffic: ['incentive']
    }
  ];

  for (const offer of offers) {
    const offerId = uuidv4();
    try {
      db.prepare(`
        INSERT INTO offers (
          id, name, description, url, category, vertical, payout_type, payout_amount, revenue_amount,
          countries, allowed_traffic, restricted_traffic, requires_approval, is_featured, is_top, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).run(
        offerId,
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
      console.log(`Created offer: ${offer.name} (${offer.vertical})`);
    } catch (e) {
      console.log(`Offer ${offer.name} may already exist`);
    }
  }

  console.log('\n✅ Development seeding complete!');
  console.log('\n📋 Demo accounts (DEVELOPMENT ONLY):');
  console.log('  Admin: admin@example.com / admin123');
  console.log('  Manager: manager@example.com / manager123');
  console.log('  Affiliate: demo@example.com / demo123');
  console.log('\n⚠️  WARNING: These credentials should NEVER be used in production!');
}

seed().catch(console.error);
