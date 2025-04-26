import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

// Initialize Drizzle ORM with connection pool
export const db = drizzle(pool);

// Health check function to verify DB connection
export async function checkDatabaseConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    return result.rows[0] ? true : false;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}