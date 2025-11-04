// Load environment variables FIRST before any other imports
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local' });

// Now import database modules
import { db, testConnection } from '../src/lib/db';
import { users, associations, rooms, reservations } from '../src/lib/db/schema';

async function testDatabaseConnection() {
  console.log('🔍 Testing Turso database connection...\n');

  try {
    // Test basic connection
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Failed to connect to database');
      process.exit(1);
    }

    console.log('\n📊 Testing table creation...');

    // Test querying each table
    console.log('  • Checking users table...');
    const usersResult = await db.select().from(users).limit(1);
    console.log(`    ✓ Users table exists (${usersResult.length} records)`);

    console.log('  • Checking associations table...');
    const associationsResult = await db.select().from(associations).limit(1);
    console.log(`    ✓ Associations table exists (${associationsResult.length} records)`);

    console.log('  • Checking rooms table...');
    const roomsResult = await db.select().from(rooms).limit(1);
    console.log(`    ✓ Rooms table exists (${roomsResult.length} records)`);

    console.log('  • Checking reservations table...');
    const reservationsResult = await db.select().from(reservations).limit(1);
    console.log(`    ✓ Reservations table exists (${reservationsResult.length} records)`);

    console.log('\n✅ All database tests passed successfully!');
    console.log('🎉 Your Turso database is ready to use!\n');

  } catch (error) {
    console.error('\n❌ Database test failed:', error);
    process.exit(1);
  }
}

testDatabaseConnection();
