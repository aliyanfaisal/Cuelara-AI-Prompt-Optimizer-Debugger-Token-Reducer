// Applies the blog-sync SQL migrations with the same `pg` driver the app uses.
// The database was created without Prisma Migrate history, so `prisma migrate deploy` can't be used on it.
// Safe to re-run: each step is skipped once its change exists, and all pending steps run in one transaction.
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const STEPS = [
  {
    dir: '20260921000000_blog_portfolio_sync',
    isApplied: `select 1 from information_schema.tables where table_name = 'BlogCategory'`,
  },
  {
    dir: '20260921010000_blog_card_summary',
    isApplied: `select 1 from information_schema.columns where table_name = 'BlogPost' and column_name = 'readingMinutes'`,
  },
  {
    dir: '20260924200000_cookbook_external_id',
    isApplied: `select 1 from information_schema.columns where table_name = 'CookbookPrompt' and column_name = 'externalId'`,
  },
  {
    dir: '20260924210000_pricing_and_contact',
    isApplied: `select 1 from information_schema.tables where table_name = 'ContactMessage'`,
  },
  {
    dir: '20260924220000_tool_runs',
    isApplied: `select 1 from information_schema.tables where table_name = 'ToolRun'`,
  },
  {
    dir: '20260925000000_plan_history_limit',
    isApplied: `select 1 from information_schema.columns where table_name = 'Plan' and column_name = 'historyPerTool'`,
  },
  {
    dir: '20260925100000_byok_and_single_session',
    isApplied: `select 1 from information_schema.columns where table_name = 'User' and column_name = 'activeSessionId'`,
  },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const step of STEPS) {
      if ((await client.query(step.isApplied)).rowCount > 0) {
        console.log(`skip   ${step.dir} (already applied)`);
        continue;
      }
      const sql = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'migrations', step.dir, 'migration.sql'), 'utf8');
      await client.query(sql);
      console.log(`apply  ${step.dir}`);
    }
    await client.query('COMMIT');
    console.log('Done.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed, nothing was changed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
