// backend/db.js - Database connection using Knex
import knex from 'knex';

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:Kushith%40123@db.hwtdgogvvzrsqfqekihx.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
  },
  searchPath: ['knex', 'public'],
});

// Auto-initialize schema to ensure the password column exists
async function initializeSchema() {
  try {
    const hasPassword = await db.schema.hasColumn('users', 'password');
    if (!hasPassword) {
      await db.schema.alterTable('users', (table) => {
        table.string('password', 255);
      });
      console.log('Schema: Successfully added "password" column to "users" table.');
    }
  } catch (error) {
    console.warn('Schema Warning: Could not auto-add "password" column, it may already exist or DB is currently offline:', error.message);
  }
}

// Run schema setup
initializeSchema();

export default db;
