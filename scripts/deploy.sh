#!/bin/bash
set -e

# Affiliate Network Deployment Script
# Usage: ./scripts/deploy.sh [sqlite|postgres]

DB_TYPE="${1:-sqlite}"
DOMAIN="${DOMAIN:-your-domain.com}"

echo "======================================"
echo "Affiliate Network Deployment"
echo "======================================"
echo "Database: $DB_TYPE"
echo "Domain: $DOMAIN"
echo ""

# Check for required environment variables
if [ -z "$JWT_SECRET" ]; then
    echo "ERROR: JWT_SECRET environment variable is required"
    echo "Generate one with: openssl rand -hex 64"
    exit 1
fi

if [ -z "$CSRF_SECRET" ]; then
    echo "ERROR: CSRF_SECRET environment variable is required"
    echo "Generate one with: openssl rand -hex 32"
    exit 1
fi

if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
    echo "WARNING: ADMIN_EMAIL and ADMIN_PASSWORD not set"
    echo "You won't be able to create an admin account automatically"
fi

# Create required directories
echo "Creating directories..."
mkdir -p nginx/ssl certbot/conf certbot/www

# Update nginx config with actual domain
echo "Configuring nginx for domain: $DOMAIN"
sed -i "s/your-domain.com/$DOMAIN/g" nginx/nginx.conf

# Build and start services
if [ "$DB_TYPE" = "sqlite" ]; then
    echo "Starting with SQLite configuration..."
    docker-compose -f docker-compose.sqlite.yml build
    docker-compose -f docker-compose.sqlite.yml up -d
else
    echo "Starting with PostgreSQL configuration..."
    if [ -z "$POSTGRES_PASSWORD" ]; then
        echo "ERROR: POSTGRES_PASSWORD is required for PostgreSQL"
        exit 1
    fi
    docker-compose build
    docker-compose up -d
fi

echo ""
echo "======================================"
echo "Deployment started!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Configure SSL certificate:"
echo "   docker-compose run --rm certbot certonly --webroot -w /var/www/certbot -d $DOMAIN"
echo ""
echo "2. Restart nginx after SSL setup:"
echo "   docker-compose restart nginx"
echo ""
echo "3. Seed the database (first time only):"
echo "   docker-compose exec app npm run seed"
echo ""
echo "4. View logs:"
echo "   docker-compose logs -f app"
echo ""
echo "Your application will be available at:"
echo "  https://$DOMAIN"
echo ""
