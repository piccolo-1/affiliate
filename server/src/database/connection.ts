import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database type based on environment
const DATABASE_TYPE = process.env.DATABASE_TYPE || 'sqlite';

let db: Database.Database;

if (DATABASE_TYPE === 'sqlite') {
  const dbPath = process.env.SQLITE_PATH
    ? path.resolve(process.env.SQLITE_PATH)
    : path.join(__dirname, '../../data/affiliate.db');

  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(dbPath);

  // Enable foreign keys and WAL mode for better performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
} else if (DATABASE_TYPE === 'postgres') {
  // For PostgreSQL, we'll use a compatibility layer
  // This allows the same API to work with both databases
  console.warn('PostgreSQL support requires pg package and Knex. Using SQLite fallback.');

  const dbPath = path.join(__dirname, '../../data/affiliate.db');
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
} else {
  throw new Error(`Unsupported DATABASE_TYPE: ${DATABASE_TYPE}`);
}

export default db;
