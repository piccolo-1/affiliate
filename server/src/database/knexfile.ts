import type { Knex } from 'knex';
import path from 'path';

const DATABASE_TYPE = process.env.DATABASE_TYPE || 'sqlite';

const sqliteConfig: Knex.Config = {
  client: 'better-sqlite3',
  connection: {
    filename: process.env.SQLITE_PATH || path.join(__dirname, '../../data/affiliate.db')
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    extension: 'ts'
  }
};

const postgresConfig: Knex.Config = {
  client: 'pg',
  connection: process.env.DATABASE_URL || {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'affiliate',
    password: process.env.POSTGRES_PASSWORD || '',
    database: process.env.POSTGRES_DB || 'affiliate'
  },
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    extension: 'ts'
  }
};

const config: { [key: string]: Knex.Config } = {
  development: DATABASE_TYPE === 'postgres' ? postgresConfig : sqliteConfig,
  staging: postgresConfig,
  production: postgresConfig
};

export default config;

// Export the appropriate config based on NODE_ENV
const environment = process.env.NODE_ENV || 'development';
module.exports = config[environment] || config.development;
