#!/bin/bash
set -e

# Database Restore Script
# Usage: ./scripts/restore.sh <backup_file> [sqlite|postgres]

BACKUP_FILE="$1"
DB_TYPE="${2:-sqlite}"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./scripts/restore.sh <backup_file> [sqlite|postgres]"
    echo ""
    echo "Available backups:"
    ls -lh ./backups/ 2>/dev/null || echo "No backups found"
    exit 1
fi

echo "======================================"
echo "Database Restore"
echo "======================================"
echo "Backup file: $BACKUP_FILE"
echo "Type: $DB_TYPE"
echo ""

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Handle compressed files
TEMP_FILE=""
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "Decompressing backup..."
    TEMP_FILE="/tmp/restore_$(date +%s)"
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    BACKUP_FILE="$TEMP_FILE"
fi

echo ""
echo "WARNING: This will overwrite the current database!"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    [ -n "$TEMP_FILE" ] && rm -f "$TEMP_FILE"
    exit 0
fi

if [ "$DB_TYPE" = "sqlite" ]; then
    SQLITE_PATH="${SQLITE_PATH:-./server/data/affiliate.db}"

    # Create backup of current database
    if [ -f "$SQLITE_PATH" ]; then
        echo "Creating backup of current database..."
        cp "$SQLITE_PATH" "${SQLITE_PATH}.pre-restore-$(date +%s)"
    fi

    echo "Restoring SQLite database..."
    cp "$BACKUP_FILE" "$SQLITE_PATH"
    echo "Restore complete!"
else
    POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
    POSTGRES_PORT="${POSTGRES_PORT:-5432}"
    POSTGRES_USER="${POSTGRES_USER:-affiliate}"
    POSTGRES_DB="${POSTGRES_DB:-affiliate}"

    echo "Restoring PostgreSQL database..."
    PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
        -h "$POSTGRES_HOST" \
        -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        -c \
        "$BACKUP_FILE"

    echo "Restore complete!"
fi

# Cleanup temp file
[ -n "$TEMP_FILE" ] && rm -f "$TEMP_FILE"

echo ""
echo "Database restored successfully!"
echo "Please restart the application to apply changes."
