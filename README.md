# AffiliateHub - Performance Marketing Network

A modern, user-friendly affiliate marketing network platform with Everflow-style tracking capabilities.

## Features

### For Affiliates
- **Dashboard** - Real-time performance overview with charts
- **Offer Marketplace** - Browse and apply to offers
- **Tracking Links** - Generate unique tracking links with sub-ID support (sub1-sub5)
- **Conversion Tracking** - View detailed conversion history
- **Reports** - Advanced analytics by date, offer, sub-ID, country, device
- **Postback URLs** - Configure server-to-server conversion notifications
- **Settings** - Manage profile and payout preferences

### For Admins
- **Network Dashboard** - Overview of revenue, payouts, profit
- **Offer Management** - Create and manage offers
- **User Management** - Manage affiliates and advertisers
- **Conversion Management** - Approve/reject conversions
- **Payout Management** - Process affiliate payments
- **Application Management** - Approve affiliate applications

### Tracking Features (Everflow-style)
- **Click Tracking** - Unique click IDs for each click
- **Sub-ID Parameters** - Support for sub1-sub5 tracking
- **Device Detection** - Device type, OS, browser tracking
- **Geo Tracking** - Country and region tracking
- **Bot Detection** - Automatic bot/crawler detection
- **Duplicate Click Detection** - 24-hour unique click window
- **Postback Support** - S2S conversion tracking via GET/POST
- **Pixel Tracking** - 1x1 GIF impression tracking

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, SQLite
- **Frontend**: React, TypeScript, TailwindCSS, Recharts
- **Authentication**: JWT tokens with HTTP-only cookies

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install all dependencies
npm run install:all

# Seed the database with demo data
cd server && npm run seed && cd ..

# Start development servers
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Demo Accounts

After seeding, you can use these accounts:

- **Admin**: admin@example.com / admin123
- **Affiliate**: demo@example.com / demo123

## API Endpoints

### Tracking

```
GET /c/{short_code}?sub1=xxx&sub2=xxx
```
Main tracking redirect. Captures click data and redirects to offer URL.

```
GET /track/pixel/{short_code}
```
Pixel/impression tracking. Returns 1x1 transparent GIF.

```
GET/POST /postback?click_id=XXX&payout=XX.XX
```
Server-to-server conversion postback.

### Postback Parameters
- `click_id` (required) - The click ID from the tracking link
- `payout` - Override payout amount
- `revenue` - Revenue amount
- `event` - Event type (default: "conversion")
- `tx_id` - Transaction ID
- `status` - Conversion status

### Affiliate Postback Placeholders
When configuring postback URLs, affiliates can use these placeholders:
- `{click_id}` - Unique click identifier
- `{conversion_id}` - Conversion identifier
- `{payout}` - Payout amount
- `{revenue}` - Revenue amount
- `{sub1}` through `{sub5}` - Sub-ID values
- `{offer_id}` - Offer identifier
- `{event}` - Event type

## Project Structure

```
affiliate/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Shared components
│   │   ├── context/       # React context (Auth)
│   │   ├── lib/           # API client
│   │   └── pages/         # Page components
│   │       └── admin/     # Admin pages
│   └── ...
├── server/                 # Express backend
│   ├── src/
│   │   ├── database/      # SQLite schema
│   │   ├── middleware/    # Auth middleware
│   │   └── routes/        # API routes
│   └── ...
└── package.json
```

## License

MIT
