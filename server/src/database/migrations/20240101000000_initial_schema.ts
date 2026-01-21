import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Users table
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary();
    table.string('email').unique().notNullable();
    table.string('password').notNullable();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('company');
    table.enum('role', ['affiliate', 'advertiser', 'manager', 'admin']).defaultTo('affiliate');
    table.enum('status', ['pending', 'active', 'suspended']).defaultTo('pending');
    table.string('referral_code').unique();
    table.uuid('referred_by').references('id').inTable('users');
    table.uuid('manager_id').references('id').inTable('users');
    table.string('payout_method').defaultTo('paypal');
    table.text('payout_details');
    table.decimal('minimum_payout', 10, 2).defaultTo(50.00);
    table.string('skype');
    table.string('telegram');
    table.string('phone');
    table.text('notes');
    table.timestamps(true, true);
  });

  // Offers table
  await knex.schema.createTable('offers', (table) => {
    table.uuid('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.text('url').notNullable();
    table.text('preview_url');
    table.text('thumbnail_url');
    table.uuid('advertiser_id').references('id').inTable('users');
    table.string('category');
    table.enum('vertical', ['nutra', 'gaming', 'finance', 'dating', 'ecommerce', 'crypto', 'sweepstakes', 'leadgen', 'software', 'other']).defaultTo('other');
    table.enum('payout_type', ['cpa', 'cpl', 'cpc', 'cpm', 'cpi', 'revshare']).defaultTo('cpa');
    table.decimal('payout_amount', 10, 2).notNullable().defaultTo(0);
    table.decimal('revenue_amount', 10, 2).notNullable().defaultTo(0);
    table.integer('conversion_cap');
    table.integer('daily_cap');
    table.integer('monthly_cap');
    table.json('countries');
    table.json('allowed_traffic');
    table.json('restricted_traffic');
    table.enum('status', ['active', 'paused', 'expired', 'pending']).defaultTo('active');
    table.boolean('requires_approval').defaultTo(false);
    table.string('tracking_domain');
    table.boolean('is_featured').defaultTo(false);
    table.boolean('is_top').defaultTo(false);
    table.timestamps(true, true);
  });

  // Affiliate-Offer assignments
  await knex.schema.createTable('affiliate_offers', (table) => {
    table.uuid('id').primary();
    table.uuid('affiliate_id').notNullable().references('id').inTable('users');
    table.uuid('offer_id').notNullable().references('id').inTable('offers');
    table.enum('status', ['pending', 'approved', 'rejected', 'suspended']).defaultTo('pending');
    table.decimal('custom_payout', 10, 2);
    table.text('custom_tracking_link');
    table.timestamps(true, true);
    table.unique(['affiliate_id', 'offer_id']);
  });

  // Tracking links
  await knex.schema.createTable('tracking_links', (table) => {
    table.uuid('id').primary();
    table.uuid('affiliate_id').notNullable().references('id').inTable('users');
    table.uuid('offer_id').notNullable().references('id').inTable('offers');
    table.string('short_code').unique().notNullable();
    table.string('name');
    table.string('default_sub1');
    table.string('default_sub2');
    table.string('default_sub3');
    table.string('default_sub4');
    table.string('default_sub5');
    table.string('redirect_type').defaultTo('302');
    table.enum('status', ['active', 'paused', 'deleted']).defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Clicks table
  await knex.schema.createTable('clicks', (table) => {
    table.uuid('id').primary();
    table.string('click_id').unique().notNullable();
    table.uuid('tracking_link_id').references('id').inTable('tracking_links');
    table.uuid('affiliate_id').notNullable().references('id').inTable('users');
    table.uuid('offer_id').notNullable().references('id').inTable('offers');
    table.string('sub1');
    table.string('sub2');
    table.string('sub3');
    table.string('sub4');
    table.string('sub5');
    table.string('ip_address');
    table.text('user_agent');
    table.string('device_type');
    table.string('device_brand');
    table.string('device_model');
    table.string('os_name');
    table.string('os_version');
    table.string('browser_name');
    table.string('browser_version');
    table.string('country');
    table.string('country_code');
    table.string('region');
    table.string('city');
    table.text('referrer');
    table.string('referrer_domain');
    table.text('landing_page');
    table.string('utm_source');
    table.string('utm_medium');
    table.string('utm_campaign');
    table.string('utm_content');
    table.string('utm_term');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.boolean('is_unique').defaultTo(true);
    table.boolean('is_bot').defaultTo(false);
    table.decimal('fraud_score', 5, 2).defaultTo(0);

    // Indexes for performance
    table.index('affiliate_id');
    table.index('offer_id');
    table.index('created_at');
    table.index('click_id');
  });

  // Conversions table
  await knex.schema.createTable('conversions', (table) => {
    table.uuid('id').primary();
    table.string('click_id').references('click_id').inTable('clicks');
    table.uuid('affiliate_id').notNullable().references('id').inTable('users');
    table.uuid('offer_id').notNullable().references('id').inTable('offers');
    table.string('conversion_id');
    table.string('event_type').defaultTo('conversion');
    table.enum('status', ['pending', 'approved', 'rejected', 'reversed']).defaultTo('pending');
    table.decimal('revenue', 10, 2).defaultTo(0);
    table.decimal('payout', 10, 2).defaultTo(0);
    table.decimal('sale_amount', 10, 2);
    table.string('currency').defaultTo('USD');
    table.string('sub1');
    table.string('sub2');
    table.string('sub3');
    table.string('sub4');
    table.string('sub5');
    table.string('ip_address');
    table.text('user_agent');
    table.string('country');
    table.string('transaction_id');
    table.string('advertiser_ref');
    table.text('notes');
    table.text('rejection_reason');
    table.timestamps(true, true);

    // Indexes
    table.index('affiliate_id');
    table.index('offer_id');
    table.index('click_id');
    table.index('created_at');
  });

  // Payouts table
  await knex.schema.createTable('payouts', (table) => {
    table.uuid('id').primary();
    table.uuid('affiliate_id').notNullable().references('id').inTable('users');
    table.decimal('amount', 10, 2).notNullable();
    table.string('currency').defaultTo('USD');
    table.enum('status', ['pending', 'processing', 'completed', 'failed', 'cancelled']).defaultTo('pending');
    table.string('payment_method');
    table.text('payment_details');
    table.string('transaction_id');
    table.date('period_start');
    table.date('period_end');
    table.text('notes');
    table.uuid('processed_by').references('id').inTable('users');
    table.timestamp('processed_at');
    table.timestamps(true, true);
  });

  // Postback URLs
  await knex.schema.createTable('postback_urls', (table) => {
    table.uuid('id').primary();
    table.uuid('affiliate_id').notNullable().references('id').inTable('users');
    table.uuid('offer_id').references('id').inTable('offers');
    table.text('url').notNullable();
    table.string('event_type').defaultTo('conversion');
    table.enum('status', ['active', 'paused']).defaultTo('active');
    table.enum('method', ['GET', 'POST']).defaultTo('GET');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Postback logs
  await knex.schema.createTable('postback_logs', (table) => {
    table.uuid('id').primary();
    table.uuid('postback_url_id').references('id').inTable('postback_urls');
    table.uuid('conversion_id').references('id').inTable('conversions');
    table.text('request_url');
    table.text('request_body');
    table.integer('response_code');
    table.text('response_body');
    table.boolean('success').defaultTo(false);
    table.text('error_message');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Daily stats
  await knex.schema.createTable('daily_stats', (table) => {
    table.uuid('id').primary();
    table.date('date').notNullable();
    table.uuid('affiliate_id').references('id').inTable('users');
    table.uuid('offer_id').references('id').inTable('offers');
    table.integer('clicks').defaultTo(0);
    table.integer('unique_clicks').defaultTo(0);
    table.integer('conversions').defaultTo(0);
    table.decimal('revenue', 10, 2).defaultTo(0);
    table.decimal('payout', 10, 2).defaultTo(0);
    table.decimal('epc', 10, 4).defaultTo(0);
    table.decimal('conversion_rate', 5, 2).defaultTo(0);
    table.timestamps(true, true);
    table.unique(['date', 'affiliate_id', 'offer_id']);

    // Index for date queries
    table.index('date');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order due to foreign keys
  await knex.schema.dropTableIfExists('daily_stats');
  await knex.schema.dropTableIfExists('postback_logs');
  await knex.schema.dropTableIfExists('postback_urls');
  await knex.schema.dropTableIfExists('payouts');
  await knex.schema.dropTableIfExists('conversions');
  await knex.schema.dropTableIfExists('clicks');
  await knex.schema.dropTableIfExists('tracking_links');
  await knex.schema.dropTableIfExists('affiliate_offers');
  await knex.schema.dropTableIfExists('offers');
  await knex.schema.dropTableIfExists('users');
}
