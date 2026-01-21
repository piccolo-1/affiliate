#!/bin/bash
set -e

# Database Backup Script
# Usage: ./scripts/backup.sh [sqlite|postgres]

DB_TYPE="${1:-sqlite}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

echo "======================================"
echo "Database Backup"
echo "======================================"
echo "Type: $DB_TYPE"
echo "Timestamp: $TIMESTAMP"
echo ""

mkdir -p "$BACKUP_DIR"

if [ "$DB_TYPE" = "sqlite" ]; then
    # SQLite backup
    SQLITE_PATH="${SQLITE_PATH:-./server/data/affiliate.db}"

    if [ -f "$SQLITE_PATH" ]; then
        BACKUP_FILE="$BACKUP_DIR/sqlite_${TIMESTAMP}.db"
        echo "Backing up SQLite database..."
        sqlite3 "$SQLITE_PATH" ".backup '$BACKUP_FILE'"

        # Compress backup
        gzip "$BACKUP_FILE"
        echo "Backup saved to: ${BACKUP_FILE}.gz"
    else
        echo "ERROR: SQLite database not found at $SQLITE_PATH"
        exit 1
    fi
else
    # PostgreSQL backup
    POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
    POSTGRES_PORT="${POSTGRES_PORT:-5432}"
    POSTGRES_USER="${POSTGRES_USER:-affiliate}"
    POSTGRES_DB="${POSTGRES_DB:-affiliate}"

    BACKUP_FILE="$BACKUP_DIR/postgres_${TIMESTAMP}.sql"
    echo "Backing up PostgreSQL database..."

    PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
        -h "$POSTGRES_HOST" \
        -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        -F c \
        -f "$BACKUP_FILE"

    # Compress backup
    gzip "$BACKUP_FILE"
    echo "Backup saved to: ${BACKUP_FILE}.gz"
fi

# Cleanup old backups
echo ""
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "*.gz" -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name "*.db" -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name "*.sql" -mtime +"$RETENTION_DAYS" -delete

echo ""
echo "Backup complete!"
echo ""

# List recent backups
echo "Recent backups:"
ls -lh "$BACKUP_DIR" | tail -10
