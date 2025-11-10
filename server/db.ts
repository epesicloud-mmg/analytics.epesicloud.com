import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure for Replit environment - use standard PostgreSQL driver instead of Neon serverless
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: false // Disable SSL for Replit's internal database
};

export const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });