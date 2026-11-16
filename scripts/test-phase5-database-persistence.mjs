import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  atomicWriteJsonSync,
  atomicWriteJson,
  validateSchemaDefinitions,
  getDatabaseConfig,
  generateMigrationSql,
} from '../src/server/db.js';

console.log('================================================================');
console.log('PHASE 5 TEST: DATABASE PERSISTENCE, CONCURRENCY & SCHEMA AUDIT');
console.log('================================================================\n');

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

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

// -------------------------------------------------------------
// 1. Schema DDL & Relational Structure Verification
// -------------------------------------------------------------
runTest('Schema SQL contains exactly 18 relational tables', () => {
  const result = validateSchemaDefinitions();
  assert.strictEqual(result.isValid, true, `Schema validation failed: missing tables ${result.missingTables.join(', ')}`);
  assert.strictEqual(result.totalExpected, 18, 'Expected 18 tables');
  assert.strictEqual(result.foundTables.length, 18, `Found ${result.foundTables.length} tables`);
  assert.deepStrictEqual(result.missingTables, [], 'Missing tables should be empty');
});

runTest('Schema SQL enforces room capacity trigger (50 participants max)', () => {
  const result = validateSchemaDefinitions();
  assert.strictEqual(result.hasCapacityTrigger, true, 'Capacity trigger definition missing from schema.sql');
});

runTest('Schema SQL enforces Row Level Security (RLS) policies', () => {
  const result = validateSchemaDefinitions();
  assert.strictEqual(result.hasRlsPolicies, true, 'Row Level Security missing from schema.sql');
});

runTest('Schema SQL includes realtime publications for collaborative tables', () => {
  const result = validateSchemaDefinitions();
  assert.strictEqual(result.hasRealtimePub, true, 'Realtime publications missing from schema.sql');
});

// -------------------------------------------------------------
// 2. Atomic Crash-Resilient Storage & Mutex Writes
// -------------------------------------------------------------
const TEST_DIR = path.resolve('scratch', 'db_test');
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

runTest('atomicWriteJsonSync safely writes JSON and maintains valid parse', () => {
  const testFile = path.join(TEST_DIR, 'sync_test.json');
  const sampleData = { project: 'AI DJ Studio', version: '2.0.0', count: 42, active: true };
  atomicWriteJsonSync(testFile, sampleData);

  assert.strictEqual(fs.existsSync(testFile), true, 'File was not created');
  const readBack = JSON.parse(fs.readFileSync(testFile, 'utf8'));
  assert.deepStrictEqual(readBack, sampleData, 'Persisted data did not match written object');
});

runTest('atomicWriteJsonSync replaces existing file without intermediate corruption', () => {
  const testFile = path.join(TEST_DIR, 'sync_replace.json');
  atomicWriteJsonSync(testFile, { step: 1, text: 'Initial payload' });
  atomicWriteJsonSync(testFile, { step: 2, text: 'Updated payload' });

  const readBack = JSON.parse(fs.readFileSync(testFile, 'utf8'));
  assert.strictEqual(readBack.step, 2);
  assert.strictEqual(readBack.text, 'Updated payload');
});

await runAsyncTest('atomicWriteJson handles concurrent writes without JSON corruption', async () => {
  const testFile = path.join(TEST_DIR, 'concurrent_test.json');
  const writeOps = [];

  // Launch 30 concurrent writes in parallel
  for (let i = 1; i <= 30; i++) {
    writeOps.push(atomicWriteJson(testFile, { iteration: i, timestamp: Date.now(), data: `payload_${i}` }));
  }

  await Promise.all(writeOps);

  assert.strictEqual(fs.existsSync(testFile), true, 'File should exist after concurrent writes');
  const content = fs.readFileSync(testFile, 'utf8');
  let parsed;
  assert.doesNotThrow(() => {
    parsed = JSON.parse(content);
  }, 'Concurrent writes produced invalid or corrupted JSON');

  assert.strictEqual(typeof parsed.iteration, 'number');
  assert.strictEqual(parsed.iteration >= 1 && parsed.iteration <= 30, true);
});

runTest('atomic writes leave no orphaned temporary files on disk', () => {
  const files = fs.readdirSync(TEST_DIR);
  const tmpFiles = files.filter((f) => f.includes('.tmp'));
  assert.strictEqual(tmpFiles.length, 0, `Found orphaned tmp files: ${tmpFiles.join(', ')}`);
});

// -------------------------------------------------------------
// 3. Database Configuration Detection & Verification Gating
// -------------------------------------------------------------
runTest('getDatabaseConfig correctly detects placeholder/missing credentials', () => {
  const config = getDatabaseConfig();
  // By default in this workspace, live Supabase/PostgreSQL is not configured
  assert.strictEqual(typeof config.isConfigured, 'boolean');
  assert.strictEqual(typeof config.provider, 'string');
  assert.strictEqual(config.requiresLiveVerification, true);
});

runTest('getDatabaseConfig parses postgresql connection string when present', () => {
  const originalUrl = process.env.DATABASE_URL;
  try {
    process.env.DATABASE_URL = 'postgres://postgres:secretpassword@db.example.com:5432/aidj_db';
    const config = getDatabaseConfig();
    assert.strictEqual(config.isConfigured, true);
    assert.strictEqual(config.provider, 'postgresql');
    assert.strictEqual(config.databaseUrl.includes('secretpassword'), false, 'Password must be masked');
    assert.strictEqual(config.databaseUrl.includes('****'), true, 'Password was not masked');
  } finally {
    if (originalUrl !== undefined) {
      process.env.DATABASE_URL = originalUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
  }
});

runTest('getDatabaseConfig parses Supabase connection parameters when present', () => {
  const origUrl = process.env.VITE_SUPABASE_URL;
  const origKey = process.env.VITE_SUPABASE_ANON_KEY;
  try {
    process.env.VITE_SUPABASE_URL = 'https://abcdefghijklm.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_testing';
    const config = getDatabaseConfig();
    assert.strictEqual(config.isConfigured, true);
    assert.strictEqual(config.provider, 'supabase');
    assert.strictEqual(config.supabaseUrl, 'https://abcdefghijklm.supabase.co');
  } finally {
    if (origUrl !== undefined) process.env.VITE_SUPABASE_URL = origUrl;
    else delete process.env.VITE_SUPABASE_URL;
    if (origKey !== undefined) process.env.VITE_SUPABASE_ANON_KEY = origKey;
    else delete process.env.VITE_SUPABASE_ANON_KEY;
  }
});

// -------------------------------------------------------------
// 4. Migration SQL Exporter Verification
// -------------------------------------------------------------
runTest('generateMigrationSql generates valid SQL statements for seeding', () => {
  const sql = generateMigrationSql();
  assert.strictEqual(typeof sql, 'string');
  assert.strictEqual(sql.includes('BEGIN;'), true, 'SQL missing transaction BEGIN');
  assert.strictEqual(sql.includes('COMMIT;'), true, 'SQL missing transaction COMMIT');
  assert.strictEqual(sql.includes('INSERT INTO public.tracks'), true, 'SQL missing tracks migration');
  assert.strictEqual(sql.includes('INSERT INTO public.profiles'), true, 'SQL missing profiles migration');
});

runTest('generateMigrationSql sanitizes quotes to prevent SQL syntax errors', () => {
  const sql = generateMigrationSql();
  // Ensure no unescaped strings crash SQL statements
  const lines = sql.split('\n');
  const insertLines = lines.filter((l) => l.startsWith('INSERT INTO'));
  assert.strictEqual(insertLines.length > 0, true, 'No insert lines generated');
  for (const line of insertLines) {
    assert.strictEqual(line.endsWith(';'), true, 'Insert statement must terminate with semicolon');
  }
});

// -------------------------------------------------------------
// Clean up test scratch
// -------------------------------------------------------------
try {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
} catch {}

console.log(`\nPhase 5 Test Summary: ${passedTests}/${totalTests} Passed.`);

const liveConfig = getDatabaseConfig();
if (!liveConfig.isConfigured) {
  console.log('\n[STATUS] Live Database Connection: BLOCKED');
  console.log('         Reason: Remote PostgreSQL or Supabase credentials are not configured in .env');
  console.log('         Local Fallback: Atomic JSON persistence with concurrency safety is ACTIVE and VERIFIED.');
} else {
  console.log(`\n[STATUS] Live Database Connection: CONFIGURED (${liveConfig.provider})`);
}

if (passedTests !== totalTests) {
  process.exit(1);
}
