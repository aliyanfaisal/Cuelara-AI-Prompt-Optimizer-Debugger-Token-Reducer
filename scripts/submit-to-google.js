// Submits every public page to Google's Indexing API (catch-up / first-time backfill).
// Plain JavaScript on purpose: it runs on the server with `node`, where dev tools like tsx aren't installed.
//
//   node scripts/submit-to-google.js --dry-run   # list the URLs that would be sent
//   node scripts/submit-to-google.js             # submit up to 200 URLs (the default daily quota)
//   node scripts/submit-to-google.js --limit 50
//
// Reads DATABASE_URL, NEXTAUTH_URL and GOOGLE_INDEXING_CREDENTIALS (or GOOGLE_INDEXING_CLIENT_EMAIL +
// GOOGLE_INDEXING_PRIVATE_KEY) from the environment / .env, the same as the app does.
const fs = require('fs');
const crypto = require('crypto');
const { Pool } = require('pg');
require('dotenv').config();

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const PUBLISH_URL = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
const SCOPE = 'https://www.googleapis.com/auth/indexing';
const STATIC_PATHS = ['/', '/tools', '/cookbook', '/blog', '/pricing', '/about', '/contact', '/privacy', '/terms'];

const b64url = (input) => Buffer.from(input).toString('base64url');

function loadCredentials() {
  const file = (process.env.GOOGLE_INDEXING_CREDENTIALS || '').trim();
  if (file) {
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { email: json.client_email, key: json.private_key };
  }
  const email = (process.env.GOOGLE_INDEXING_CLIENT_EMAIL || '').trim();
  const key = (process.env.GOOGLE_INDEXING_PRIVATE_KEY || '').trim().replace(/^"|"$/g, '').replace(/\\n/g, '\n');
  return { email, key };
}

function signedJwt(email, key, now = Math.floor(Date.now() / 1000)) {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const signature = crypto.createSign('RSA-SHA256').update(`${header}.${claims}`).sign(key);
  return `${header}.${claims}.${b64url(signature)}`;
}

async function accessToken({ email, key }) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signedJwt(email, key) }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) throw new Error(json.error_description || `Token request failed (${res.status})`);
  return json.access_token;
}

async function collectUrls(base, limit) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const prompts = await pool.query(`select slug from "CookbookPrompt" where published = true order by "updatedAt" desc`);
    const posts = await pool.query(
      `select slug from "BlogPost" where status = 'published' and "publishedAt" <= now() order by "publishedAt" desc`
    );
    return [
      ...prompts.rows.map((r) => `${base}/prompt/${r.slug}`),
      ...posts.rows.map((r) => `${base}/blog/${r.slug}`),
      ...STATIC_PATHS.map((p) => `${base}${p}`),
    ].slice(0, limit);
  } finally {
    await pool.end();
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limitArg = process.argv.indexOf('--limit');
  const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) || 200 : 200;
  const base = (process.env.NEXTAUTH_URL || 'https://cuelara.com').replace(/\/$/, '');

  const urls = await collectUrls(base, limit);
  console.log(`${urls.length} URL(s) selected (limit ${limit}).`);

  if (dryRun) {
    urls.forEach((u) => console.log(`  ${u}`));
    return;
  }
  if (/localhost|127\.0\.0\.1/.test(base)) throw new Error(`NEXTAUTH_URL is ${base}; set it to the live site so Google gets real URLs.`);

  const creds = loadCredentials();
  if (!creds.email || !creds.key) throw new Error('Set GOOGLE_INDEXING_CREDENTIALS (or CLIENT_EMAIL + PRIVATE_KEY) first.');
  const token = await accessToken(creds);

  let failed = 0;
  for (const url of urls) {
    const res = await fetch(PUBLISH_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ url, type: 'URL_UPDATED' }),
    });
    if (res.ok) {
      console.log(`ok   ${url}`);
    } else {
      failed++;
      const body = await res.json().catch(() => ({}));
      console.log(`FAIL ${url}  ${res.status} ${(body.error && body.error.message) || res.statusText}`);
      // Permission / API-not-enabled errors repeat for every URL, so stop instead of spending the quota.
      if (res.status === 403 || res.status === 401) break;
    }
  }
  console.log(`Done: ${urls.length - failed} submitted, ${failed} failed.`);
  if (failed) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Failed:', err.message);
    process.exit(1);
  });
}

module.exports = { signedJwt };
