// backend/db.js - Database connection supporting PostgreSQL, MySQL, and SQLite fallback
import knex from 'knex';
import dotenv from 'dotenv';
import dns from 'dns';
import { promisify } from 'util';

dotenv.config();

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:Kushith%40123@db.hwtdgogvvzrsqfqekihx.supabase.co:5432/postgres";

// Determine if connection is MySQL or PostgreSQL
const isMySQL = dbUrl.startsWith('mysql:') || dbUrl.includes('mysql') || process.env.DB_CLIENT === 'mysql';

console.log(`Initial client configuration: ${isMySQL === true ? 'mysql2' : 'pg'}`);

const pgOrMySqlDb = knex({
  client: isMySQL ? 'mysql2' : 'pg',
  connection: isMySQL ? dbUrl : {
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  },
  searchPath: isMySQL ? undefined : ['knex', 'public'],
});

const sqliteDb = knex({
  client: 'better-sqlite3',
  connection: {
    filename: './mydb.sqlite'
  },
  useNullAsDefault: true
});

let activeDb = pgOrMySqlDb;

const db = new Proxy(function() {
  return activeDb.apply(null, arguments);
}, {
  get(target, prop) {
    if (prop === 'isFallback') {
      return activeDb === sqliteDb;
    }
    if (prop === 'client') {
      return activeDb.client;
    }
    const val = activeDb[prop];
    if (typeof val === 'function') {
      return val.bind(activeDb);
    }
    return val;
  },
  set(target, prop, value) {
    activeDb[prop] = value;
    return true;
  }
});

// Auto-initialize schema and test connection
async function initializeSchema() {
  try {
    console.log('Testing primary database connection...');
    
    let host = '';
    try {
      const urlObj = new URL(dbUrl);
      host = urlObj.hostname;
    } catch (_) {
      const match = dbUrl.match(/@([^:/]+)/);
      if (match) host = match[1];
    }
    
    if (host) {
      const lookup = promisify(dns.lookup);
      await lookup(host);
    }

    // Try a quick status call to verify credentials
    await pgOrMySqlDb.raw('SELECT 1');
    console.log('Successfully connected to primary cloud database.');
  } catch (err) {
    console.warn(`Primary cloud database is offline or unreachable (${err.message}). Activating local SQLite database fallback.`);
    activeDb = sqliteDb;
  }

  try {
    const hasUsersTable = await db.schema.hasTable('users');
    if (!hasUsersTable) {
      console.log('Schema: Creating users table...');
      await db.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('firebase_uid', 255).unique().notNullable();
        table.string('name', 255);
        table.string('email', 255);
        table.string('photo_url', 500);
        table.string('password', 255);
        table.timestamps(true, true);
      });
    } else {
      const hasPassword = await db.schema.hasColumn('users', 'password');
      if (!hasPassword) {
        await db.schema.alterTable('users', (table) => {
          table.string('password', 255);
        });
        console.log('Schema: Successfully added "password" column to "users" table.');
      }
    }

    const hasActivitiesTable = await db.schema.hasTable('activities');
    if (!hasActivitiesTable) {
      console.log('Schema: Creating activities table...');
      await db.schema.createTable('activities', (table) => {
        table.increments('id').primary();
        table.integer('user_id').unsigned().references('id').inTable('users');
        table.float('distance').defaultTo(0);
        table.float('electricity').defaultTo(0);
        table.float('fuel').defaultTo(0);
        table.float('waste').defaultTo(0);
        table.string('vehicle_type', 50);
        table.string('fuel_type', 50);
        table.timestamps(true, true);
      });
    }

    const hasEmissionsTable = await db.schema.hasTable('emissions');
    if (!hasEmissionsTable) {
      console.log('Schema: Creating emissions table...');
      await db.schema.createTable('emissions', (table) => {
        table.increments('id').primary();
        table.integer('activity_id').unsigned().references('id').inTable('activities');
        table.float('transport_co2').defaultTo(0);
        table.float('electricity_co2').defaultTo(0);
        table.float('fuel_co2').defaultTo(0);
        table.float('waste_co2').defaultTo(0);
        table.float('total_co2').defaultTo(0);
        table.string('emission_level', 50);
        table.string('eco_status', 100);
        table.float('comparison_percentage').defaultTo(0);
        table.string('trend_status', 50);
        table.integer('eco_score').defaultTo(100);
        table.timestamps(true, true);
      });
    } else {
      const hasEmissionLevel = await db.schema.hasColumn('emissions', 'emission_level');
      if (!hasEmissionLevel) {
        await db.schema.alterTable('emissions', (table) => {
          table.string('emission_level', 50);
          table.string('eco_status', 100);
          table.float('comparison_percentage').defaultTo(0);
          table.string('trend_status', 50);
          table.integer('eco_score').defaultTo(100);
        });
        console.log('Schema: Successfully added analytics columns to "emissions" table.');
      }
    }
    console.log('Database schema initialization completed.');
  } catch (error) {
    console.warn('Schema Warning: Could not auto-initialize tables or columns:', error.message);
  }
}

// Run schema setup automatically
initializeSchema();

export default db;
