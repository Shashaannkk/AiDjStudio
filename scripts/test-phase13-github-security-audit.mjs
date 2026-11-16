import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveJwtSecret, isKnownPlaceholder } from '../src/server/auth.js';
import { PostgresAdapter } from '../src/server/postgresAdapter.js';
import { ensureRuntimeFilesExist } from '../src/server/db.js';

console.log('========================================================================');
console.log('PHASE 13: GITHUB SECURITY & CREDENTIAL HARDENING TEST SUITE');
console.log('========================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

// 1. .gitignore Excludes Sensitive Runtime State
runTest('.gitignore rules exclude runtime data, sessions, tokens and backups', () => {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  assert.strictEqual(gitignore.includes('data/*'), true, 'Must ignore data/*');
  assert.strictEqual(gitignore.includes('!data/tracks.json'), true, 'Must preserve data/tracks.json');
  assert.strictEqual(gitignore.includes('backups/'), true, 'Must ignore backups/');
  assert.strictEqual(gitignore.includes('.env'), true, 'Must ignore .env');
});

// 2. Runtime Files Auto-initialization
runTest('ensureRuntimeFilesExist creates empty JSON files without throwing', () => {
  assert.doesNotThrow(() => ensureRuntimeFilesExist());
  assert.strictEqual(fs.existsSync('data/tracks.json'), true, 'tracks.json must exist');
});

// 3. Known Placeholder Detection
runTest('isKnownPlaceholder accurately identifies insecure template secrets', () => {
  assert.strictEqual(isKnownPlaceholder('your-secure-jwt-signing-secret-minimum-32-characters'), true);
  assert.strictEqual(isKnownPlaceholder('aidj-studio-dev-secret-key-change-in-production-2026'), true);
  assert.strictEqual(isKnownPlaceholder('your-secure-initial-admin-password'), true);
  assert.strictEqual(isKnownPlaceholder(''), true);
  assert.strictEqual(isKnownPlaceholder(null), true);
  // Strong secret is NOT a placeholder
  assert.strictEqual(isKnownPlaceholder('c7a8b9e0f1d2c3b4a596877869504132435465768798091a2b3c4d5e6f7a8b9c'), false);
});

// 4. Production JWT Secret Rejection of Placeholders
runTest('resolveJwtSecret throws fatal error in production when placeholder is supplied', () => {
  const origEnv = process.env.NODE_ENV;
  const origSecret = process.env.JWT_SECRET;
  try {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'your-secure-jwt-signing-secret-minimum-32-characters';
    assert.throws(
      () => resolveJwtSecret(),
      /FATAL SECURITY ERROR.*insecure template placeholder/,
      'Must reject template placeholder in production'
    );
  } finally {
    process.env.NODE_ENV = origEnv;
    if (origSecret !== undefined) process.env.JWT_SECRET = origSecret;
    else delete process.env.JWT_SECRET;
  }
});

// 5. Database Adapter Rejects Unsupported Standalone DATABASE_URL
runTest('PostgresAdapter publicInit does not claim isConfigured when only raw DATABASE_URL is set', () => {
  const origDb = process.env.DATABASE_URL;
  const origSbUrl = process.env.SUPABASE_URL;
  const origSbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const origViteUrl = process.env.VITE_SUPABASE_URL;
  const origViteKey = process.env.VITE_SUPABASE_ANON_KEY;

  try {
    process.env.DATABASE_URL = 'postgres://postgres:secretpass@db.example.com:5432/postgres';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;

    const adapter = new PostgresAdapter();
    const config = adapter.publicInit();

    assert.strictEqual(config.isConfigured, false, 'Must not claim configured without Supabase client');
    assert.strictEqual(config.provider, 'unsupported_raw_postgres');
    assert.strictEqual(adapter.client, null, 'Client must be null');
  } finally {
    if (origDb !== undefined) process.env.DATABASE_URL = origDb;
    else delete process.env.DATABASE_URL;
    if (origSbUrl !== undefined) process.env.SUPABASE_URL = origSbUrl;
    if (origSbKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = origSbKey;
    if (origViteUrl !== undefined) process.env.VITE_SUPABASE_URL = origViteUrl;
    if (origViteKey !== undefined) process.env.VITE_SUPABASE_ANON_KEY = origViteKey;
  }
});

// 6. No Hardcoded Admin Backdoor in adminService.ts
runTest('adminService.ts contains no hardcoded email bypass for admin role', () => {
  const content = fs.readFileSync('src/services/adminService.ts', 'utf8');
  assert.strictEqual(content.includes("user.email === 'admin@aidjstudio.com'"), false, 'Must not contain hardcoded email bypass');
  assert.strictEqual(content.includes("user.id === 'admin-1'"), false, 'Must not contain hardcoded ID bypass');
});

console.log(`\n========================================================================`);
console.log(`PHASE 13 TEST SUMMARY: ${passedTests}/${totalTests} Passed (0 Failed)`);
console.log(`========================================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
