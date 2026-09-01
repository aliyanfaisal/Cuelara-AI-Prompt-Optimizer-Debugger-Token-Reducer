const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  console.log('Running migration...');
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE "CookbookCategory" 
      ADD COLUMN "parentId" TEXT;
      
      ALTER TABLE "CookbookCategory"
      ADD CONSTRAINT "CookbookCategory_parentId_fkey" 
      FOREIGN KEY ("parentId") REFERENCES "CookbookCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    `);
    console.log('Migration successful');
  } catch (err) {
    if (err.message.includes('already exists') || err.message.includes('multiple primary keys')) {
      console.log('Migration already applied or partial failure:', err.message);
    } else {
      console.error('Migration failed:', err);
    }
  } finally {
    client.release();
    pool.end();
  }
}

main();
