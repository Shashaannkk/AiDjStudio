import assert from 'node:assert/strict';
import { PostgresAdapter } from '../src/server/postgresAdapter.js';
import { handleApiRequest } from '../server.mjs';

console.log('========================================================================');
console.log('PHASE 10: POSTGRESQL & SUPABASE INTEGRATION TEST SUITE');
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
// 1. Adapter Instantiation & Configuration Detection
// -------------------------------------------------------------
runTest('PostgresAdapter initializes with default unconfigured detection', () => {
  const adapter = new PostgresAdapter();
  const config = adapter.publicInit();
  assert.strictEqual(typeof config.isConfigured, 'boolean');
  assert.strictEqual(['supabase_postgres', 'unsupported_raw_postgres', 'local_json'].includes(config.provider), true);
});

runTest('PostgresAdapter detects Supabase credentials when supplied', () => {
  const origUrl = process.env.VITE_SUPABASE_URL;
  const origKey = process.env.VITE_SUPABASE_ANON_KEY;
  try {
    process.env.VITE_SUPABASE_URL = 'https://prodtest123.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_test_anon_key_for_adapter';
    
    const adapter = new PostgresAdapter();
    const config = adapter.publicInit();
    assert.strictEqual(config.isConfigured, true);
    assert.strictEqual(config.provider, 'supabase_postgres');
    assert.strictEqual(config.supabaseUrl, 'https://prodtest123.supabase.co');
    assert.strictEqual(Boolean(adapter.client), true);
  } finally {
    if (origUrl !== undefined) process.env.VITE_SUPABASE_URL = origUrl;
    else delete process.env.VITE_SUPABASE_URL;
    if (origKey !== undefined) process.env.VITE_SUPABASE_ANON_KEY = origKey;
    else delete process.env.VITE_SUPABASE_ANON_KEY;
  }
});

runTest('PostgresAdapter rejects claiming configured status when raw DATABASE_URL is supplied alone without Supabase API credentials', () => {
  const origDbUrl = process.env.DATABASE_URL;
  const origSbUrl = process.env.VITE_SUPABASE_URL;
  const origSbKey = process.env.VITE_SUPABASE_ANON_KEY;
  try {
    process.env.DATABASE_URL = 'postgres://djuser:securepass@db.example.com:5432/aidj_db';
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const adapter = new PostgresAdapter();
    const config = adapter.publicInit();
    assert.strictEqual(config.isConfigured, false, 'Must not claim configured if client cannot be initialized');
    assert.strictEqual(config.provider, 'unsupported_raw_postgres');
    assert.strictEqual(adapter.client, null, 'Client must remain null');
  } finally {
    if (origDbUrl !== undefined) process.env.DATABASE_URL = origDbUrl;
    else delete process.env.DATABASE_URL;
    if (origSbUrl !== undefined) process.env.VITE_SUPABASE_URL = origSbUrl;
    if (origSbKey !== undefined) process.env.VITE_SUPABASE_ANON_KEY = origSbKey;
  }
});

// -------------------------------------------------------------
// 2. Production Fail-Fast Enforcement (No Silent Fallback in Prod)
// -------------------------------------------------------------
runTest('PostgresAdapter throws fatal error in production when credentials missing', () => {
  const origEnv = process.env.NODE_ENV;
  const origDb = process.env.DATABASE_URL;
  const origSbUrl = process.env.VITE_SUPABASE_URL;
  const origSbKey = process.env.VITE_SUPABASE_ANON_KEY;

  try {
    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_URL;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;

    const adapter = new PostgresAdapter();
    assert.throws(
      () => adapter.assertProductionReady(),
      /FATAL \[DATABASE_CONFIG_ERROR\]/,
      'Must throw fatal error if database is not configured in production'
    );
  } finally {
    process.env.NODE_ENV = origEnv;
    if (origDb) process.env.DATABASE_URL = origDb;
    if (origSbUrl) process.env.VITE_SUPABASE_URL = origSbUrl;
    if (origSbKey) process.env.VITE_SUPABASE_ANON_KEY = origSbKey;
  }
});

runTest('PostgresAdapter permits launch in development mode with local fallback notice', () => {
  const origEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'development';
    const adapter = new PostgresAdapter();
    assert.doesNotThrow(() => adapter.assertProductionReady());
  } finally {
    process.env.NODE_ENV = origEnv;
  }
});

// -------------------------------------------------------------
// 3. Health Check Endpoint (/api/health)
// -------------------------------------------------------------
await runAsyncTest('/api/health endpoint returns 200 with operational telemetry', async () => {
  let capturedStatus = 0;
  let capturedHeaders = {};
  let capturedBody = '';

  const mockReq = {
    url: '/api/health',
    method: 'GET',
    headers: { host: 'localhost:3000' },
  };

  const mockRes = {
    writeHead(status, headers) {
      capturedStatus = status;
      capturedHeaders = headers;
    },
    end(body) {
      capturedBody = body;
    },
  };

  const handled = handleApiRequest(mockReq, mockRes);
  assert.strictEqual(handled, true, '/api/health must be handled by API router');
  assert.strictEqual(capturedStatus, 200, 'Health check must return HTTP 200');
  assert.strictEqual(capturedHeaders['Content-Type'], 'application/json');

  const json = JSON.parse(capturedBody);
  assert.strictEqual(json.status, 'healthy');
  assert.strictEqual(json.version, '2.0.0');
  assert.strictEqual(typeof json.uptime, 'number');
  assert.strictEqual(typeof json.database, 'object');
  assert.strictEqual(typeof json.database.configured, 'boolean');
  assert.strictEqual(typeof json.realtime, 'object');
});

// -------------------------------------------------------------
// 4. Ping Handling & Connection Status Telemetry
// -------------------------------------------------------------
await runAsyncTest('ping() safely reports unconfigured state when offline', async () => {
  const adapter = new PostgresAdapter();
  const pingResult = await adapter.ping();
  assert.strictEqual(pingResult.connected, false);
  assert.strictEqual(typeof pingResult.provider, 'string');
});

runTest('getStatus() returns comprehensive operational metadata', () => {
  const adapter = new PostgresAdapter();
  const status = adapter.getStatus();
  assert.strictEqual(typeof status.configured, 'boolean');
  assert.strictEqual(typeof status.provider, 'string');
  assert.strictEqual(typeof status.connected, 'boolean');
  assert.strictEqual(typeof status.mode, 'string');
});

console.log(`\nPhase 10 Test Summary: ${passedTests}/${totalTests} Passed.`);
if (passedTests !== totalTests) {
  process.exit(1);
}
