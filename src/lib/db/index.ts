import { drizzle } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client';
import * as schema from './schema';

// Load env vars if not already loaded (for Node.js environments)
if (typeof window === 'undefined' && !process.env.TURSO_DATABASE_URL) {
  try {
    require('dotenv').config({ path: '.env' });
    require('dotenv').config({ path: '.env.local' });
  } catch (e) {
    // dotenv might not be available in production
  }
}

// Create the libSQL client with fallback to local SQLite
export const client: Client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Create the Drizzle instance
export const db = drizzle(client, { schema });

// Test connection function
export async function testConnection() {
  try {
    const result = await client.execute('SELECT 1');
    console.log('✅ Turso database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Turso database:', error);
    return false;
  }
}
