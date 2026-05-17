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

export default db;
