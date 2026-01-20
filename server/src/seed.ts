import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db, { initializeDatabase } from './database/schema';

async function seed() {
  console.log('Seeding database...');

  initializeDatabase();

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

  // Create demo affiliate
  const affiliateId = uuidv4();
  const affiliatePassword = await bcrypt.hash('demo123', 10);

  try {
    db.prepare(`
      INSERT INTO users (id, email, password, first_name, last_name, company, role, status, referral_code)
      VALUES (?, ?, ?, ?, ?, ?, 'affiliate', 'active', ?)
    `).run(affiliateId, 'demo@example.com', affiliatePassword, 'Demo', 'Affiliate', 'Demo Corp', 'DEMO1234');
    console.log('Created demo affiliate: demo@example.com / demo123');
  } catch (e) {
    console.log('Demo affiliate already exists');
  }

  // Create demo offers
  const offers = [
    {
      name: 'Premium VPN Service',
      description: 'High-converting VPN offer with global appeal. Pays per sign-up.',
      url: 'https://example.com/vpn?click_id={click_id}',
      category: 'Software',
      payoutType: 'cpa',
      payoutAmount: 45.00,
      revenueAmount: 60.00,
      countries: ['US', 'CA', 'GB', 'AU', 'DE'],
      allowedTraffic: ['search', 'social', 'native', 'display'],
      restrictedTraffic: ['incentive', 'adult']
    },
    {
      name: 'Dating App Install',
      description: 'Popular dating app. Pays for mobile app installs.',
      url: 'https://example.com/dating?click_id={click_id}',
      category: 'Dating',
      payoutType: 'cpi',
      payoutAmount: 3.50,
      revenueAmount: 5.00,
      countries: ['US', 'CA', 'GB'],
      allowedTraffic: ['social', 'native', 'push'],
      restrictedTraffic: ['adult', 'incentive']
    },
    {
      name: 'Online Casino - First Deposit',
      description: 'High-paying casino offer. Requires first-time deposit.',
      url: 'https://example.com/casino?click_id={click_id}',
      category: 'Gaming',
      payoutType: 'cpa',
      payoutAmount: 150.00,
      revenueAmount: 200.00,
      countries: ['CA', 'GB', 'NZ', 'AU'],
      allowedTraffic: ['search', 'native', 'email'],
      restrictedTraffic: ['social', 'display'],
      requiresApproval: true
    },
    {
      name: 'Financial Trading Platform',
      description: 'Forex/crypto trading platform. Pays on funded accounts.',
      url: 'https://example.com/trading?click_id={click_id}',
      category: 'Finance',
      payoutType: 'cpa',
      payoutAmount: 400.00,
      revenueAmount: 500.00,
      countries: ['US', 'GB', 'AU', 'SG'],
      allowedTraffic: ['search', 'native', 'email'],
      restrictedTraffic: ['incentive', 'adult', 'social'],
      requiresApproval: true
    },
    {
      name: 'Health Supplement Trial',
      description: 'Weight loss supplement. Free trial with shipping cost.',
      url: 'https://example.com/supplement?click_id={click_id}',
      category: 'Health',
      payoutType: 'cpa',
      payoutAmount: 35.00,
      revenueAmount: 45.00,
      countries: ['US'],
      allowedTraffic: ['native', 'email', 'search'],
      restrictedTraffic: ['social', 'adult']
    },
    {
      name: 'E-commerce Cashback App',
      description: 'Cashback shopping app. Pays for new user sign-ups.',
      url: 'https://example.com/cashback?click_id={click_id}',
      category: 'Shopping',
      payoutType: 'cpl',
      payoutAmount: 2.00,
      revenueAmount: 3.00,
      countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR'],
      allowedTraffic: ['search', 'social', 'native', 'display', 'email'],
      restrictedTraffic: ['incentive']
    },
    {
      name: 'Online Education Course',
      description: 'Programming bootcamp. High ticket offer.',
      url: 'https://example.com/education?click_id={click_id}',
      category: 'Education',
      payoutType: 'cpa',
      payoutAmount: 100.00,
      revenueAmount: 150.00,
      countries: ['US', 'CA', 'GB', 'AU', 'IN'],
      allowedTraffic: ['search', 'social', 'native', 'email', 'display'],
      restrictedTraffic: ['adult']
    },
    {
      name: 'Mobile Game Install',
      description: 'Popular mobile strategy game. High volume potential.',
      url: 'https://example.com/game?click_id={click_id}',
      category: 'Gaming',
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
          id, name, description, url, category, payout_type, payout_amount, revenue_amount,
          countries, allowed_traffic, restricted_traffic, requires_approval, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).run(
        offerId,
        offer.name,
        offer.description,
        offer.url,
        offer.category,
        offer.payoutType,
        offer.payoutAmount,
        offer.revenueAmount,
        JSON.stringify(offer.countries),
        JSON.stringify(offer.allowedTraffic),
        JSON.stringify(offer.restrictedTraffic),
        (offer as any).requiresApproval ? 1 : 0
      );
      console.log(`Created offer: ${offer.name}`);
    } catch (e) {
      console.log(`Offer ${offer.name} may already exist`);
    }
  }

  console.log('\nSeeding complete!');
  console.log('\nDemo accounts:');
  console.log('  Admin: admin@example.com / admin123');
  console.log('  Affiliate: demo@example.com / demo123');
}

seed().catch(console.error);
