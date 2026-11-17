import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { PostgresAdapter } from '../src/server/postgresAdapter.js';
import { provisionAdminUser, loginUser } from '../src/server/auth.js';
import { handleApiRequest } from '../server.mjs';

console.log('========================================================================');
console.log('PHASE 16: RENDER PRODUCTION STARTUP & PERSISTENCE VERIFICATION');
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

// ---------------------------------------------------------------------------
// 1. RECURSION PREVENTION & RECURSION ELIMINATION TESTS
// ---------------------------------------------------------------------------

await runAsyncTest('Task 1.1: Server auth module loads without RangeError even when admin env vars are present', async () => {
  const child = spawn(process.execPath, [
    '-e',
    `
      process.env.INITIAL_ADMIN_EMAIL = 'admin@example.com';
      process.env.INITIAL_ADMIN_PASSWORD = 'superSecretAdminPass123!';
      import('./src/server/auth.js').then((mod) => {
        const users = mod.getAllUsers();
        console.log('AUTH_LOAD_SUCCESS: ' + users.length);
        process.exit(0);
      }).catch((err) => {
        console.error('AUTH_LOAD_ERROR: ' + err.stack);
        process.exit(1);
      });
    `,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => { stdout += d.toString(); });
  child.stderr.on('data', (d) => { stderr += d.toString(); });

  const exitCode = await new Promise((resolve) => child.on('close', resolve));
  assert.strictEqual(exitCode, 0, `Process must exit 0 without stack overflow: ${stderr}`);
  assert.match(stdout, /AUTH_LOAD_SUCCESS/, 'Must print load success');
  assert.doesNotMatch(stderr, /RangeError: Maximum call stack size exceeded/, 'Must not overflow call stack');
});

await runAsyncTest('Task 1.2: Server auth module loads cleanly when admin env vars are omitted', async () => {
  const child = spawn(process.execPath, [
    '-e',
    `
      delete process.env.INITIAL_ADMIN_EMAIL;
      delete process.env.INITIAL_ADMIN_PASSWORD;
      import('./src/server/auth.js').then((mod) => {
        console.log('CLEAN_LOAD_SUCCESS');
        process.exit(0);
      }).catch((err) => {
        console.error('CLEAN_LOAD_ERROR: ' + err.stack);
        process.exit(1);
      });
    `,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => { stdout += d.toString(); });
  child.stderr.on('data', (d) => { stderr += d.toString(); });

  const exitCode = await new Promise((resolve) => child.on('close', resolve));
  assert.strictEqual(exitCode, 0, `Process must exit 0: ${stderr}`);
  assert.match(stdout, /CLEAN_LOAD_SUCCESS/, 'Must cleanly load');
});

runTest('Task 1.3: Operator provisioning via provisionAdminUser is idempotent and preserves hashing', () => {
  const testEmail = 'ops-admin@aidjstudio.com';
  const testPass = 'CorrectHorseBatteryStaple2026!';

  // Provisioning call 1
  const admin1 = provisionAdminUser({
    email: testEmail,
    password: testPass,
    name: 'Lead Operator',
  });
  assert.strictEqual(admin1.user.role, 'admin');
  assert.strictEqual(admin1.user.email, testEmail);

  // Authenticate to verify password was hashed with salt
  const authRes1 = loginUser({ email: testEmail, password: testPass });
  assert.strictEqual(Boolean(authRes1.accessToken), true);
  assert.strictEqual(authRes1.user.role, 'admin');

  // Provisioning call 2 (idempotent update)
  const admin2 = provisionAdminUser({
    email: testEmail,
    password: testPass,
    name: 'Lead Operator Updated',
  });
  assert.strictEqual(admin2.user.id, admin1.user.id, 'Idempotent provisioning must preserve user ID');
  assert.strictEqual(admin2.user.name, 'Lead Operator Updated');

  // Verify authentication still succeeds
  const authRes2 = loginUser({ email: testEmail, password: testPass });
  assert.strictEqual(Boolean(authRes2.accessToken), true);
  assert.strictEqual(authRes2.user.role, 'admin');
});

runTest('Task 1.4: provisionAdminUser rejects known template placeholders and weak passwords', () => {
  assert.throws(
    () => provisionAdminUser({ email: 'bad@example.com', password: 'change-me' }),
    /Admin password cannot use an insecure template placeholder/
  );
  assert.throws(
    () => provisionAdminUser({ email: 'bad@example.com', password: 'YOUR_SECURE_ADMIN_PASSWORD' }),
    /Admin password cannot use an insecure template placeholder/
  );
  assert.throws(
    () => provisionAdminUser({ email: 'bad@example.com', password: 'short' }),
    /Admin password must be at least 8 characters long/
  );
});

// ---------------------------------------------------------------------------
// 2. PRODUCTION FAIL-FAST & RENDER ENVIRONMENT ENFORCEMENT
// ---------------------------------------------------------------------------

await runAsyncTest('Task 2.1: Server aborts with exit code 1 in production if Supabase credentials are missing', async () => {
  const child = spawn(process.execPath, ['server.mjs'], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '10001',
      DATABASE_URL: '',
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
      SUPABASE_URL: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d.toString(); });

  const exitCode = await new Promise((resolve) => child.on('close', resolve));
  assert.strictEqual(exitCode, 1, 'Production startup without credentials must exit code 1');
  assert.match(stderr, /FATAL \[DATABASE_CONFIG_ERROR\]/, 'Must emit fatal database config error in production');
});

await runAsyncTest('Task 2.2: Live Server Startup Smoke Test on Render PORT 10000 with 0.0.0.0 binding', async () => {
  // 1. In-process handler verification of /api/health endpoint
  let capturedStatus = 0;
  let capturedBody = '';
  const mockReq = { url: '/api/health', method: 'GET', headers: { host: 'localhost:10000' } };
  const mockRes = {
    writeHead(status) { capturedStatus = status; },
    end(body) { capturedBody = body; },
  };
  const handled = handleApiRequest(mockReq, mockRes);
  assert.strictEqual(handled, true, '/api/health must be handled by router');
  assert.strictEqual(capturedStatus, 200, 'Health check must return 200 OK');
  const inProcessHealth = JSON.parse(capturedBody);
  assert.strictEqual(inProcessHealth.status, 'healthy');
  assert.strictEqual(inProcessHealth.version, '2.0.0');
  assert.strictEqual(typeof inProcessHealth.uptime, 'number');
  assert.strictEqual(typeof inProcessHealth.database, 'object');
  assert.strictEqual(typeof inProcessHealth.realtime, 'object');

  // 2. Child process verification of server.mjs CLI execution and port binding
  const port = 10002;
  const child = spawn(process.execPath, ['server.mjs'], {
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => { stdout += d.toString(); });
  child.stderr.on('data', (d) => { stderr += d.toString(); });

  // Wait for server to bind
  let serverReady = false;
  for (let i = 0; i < 40; i++) {
    if (stdout.includes('running at')) {
      serverReady = true;
      break;
    }
    await new Promise((res) => setTimeout(res, 100));
  }

  assert.strictEqual(serverReady, true, `Server failed to start within 4s. stdout: ${stdout}, stderr: ${stderr}`);
  assert.match(stdout, /0\.0\.0\.0:10002/, 'Server must bind to 0.0.0.0 and respect PORT variable');

  // Attempt live socket probe (if environment networking allows)
  try {
    const liveHealth = await new Promise((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        });
      });
      req.on('error', reject);
      req.setTimeout(1000, () => {
        req.destroy();
        reject(new Error('Probe timeout'));
      });
    });
    assert.strictEqual(liveHealth.statusCode, 200);
    assert.strictEqual(liveHealth.body.status, 'healthy');
  } catch (probeErr) {
    // When run inside sandbox isolation, loopback connects can encounter EACCES;
    // in-process probe and child stdout binding confirm operational health
    if (probeErr.code !== 'EACCES') {
      throw probeErr;
    }
  } finally {
    child.kill('SIGTERM');
    await new Promise((resolve) => child.on('close', resolve));
  }
});

// ---------------------------------------------------------------------------
// 3. POSTGRES & SUPABASE ADAPTER COMPREHENSIVE ENTITY PERSISTENCE
// ---------------------------------------------------------------------------

runTest('Task 3.1: PostgresAdapter implements all required entity methods', () => {
  const adapter = new PostgresAdapter();

  // Rooms
  assert.strictEqual(typeof adapter.listRooms, 'function');
  assert.strictEqual(typeof adapter.getRoom, 'function');
  assert.strictEqual(typeof adapter.createRoom, 'function');
  assert.strictEqual(typeof adapter.updateRoom, 'function');
  assert.strictEqual(typeof adapter.joinRoom, 'function');
  assert.strictEqual(typeof adapter.leaveRoom, 'function');
  assert.strictEqual(typeof adapter.closeRoom, 'function');

  // Playlists
  assert.strictEqual(typeof adapter.getUserPlaylists, 'function');
  assert.strictEqual(typeof adapter.createPlaylist, 'function');
  assert.strictEqual(typeof adapter.addTrackToPlaylist, 'function');
  assert.strictEqual(typeof adapter.removeTrackFromPlaylist, 'function');
  assert.strictEqual(typeof adapter.deletePlaylist, 'function');

  // Liked Songs
  assert.strictEqual(typeof adapter.getUserLikedTracks, 'function');
  assert.strictEqual(typeof adapter.toggleLikeTrack, 'function');

  // History
  assert.strictEqual(typeof adapter.getUserListeningHistory, 'function');
  assert.strictEqual(typeof adapter.recordListeningHistory, 'function');

  // Chat Messages
  assert.strictEqual(typeof adapter.getRoomMessages, 'function');
  assert.strictEqual(typeof adapter.addRoomMessage, 'function');
});

await runAsyncTest('Task 3.2: PostgresAdapter entity methods execute safely with unconfigured client', async () => {
  const adapter = new PostgresAdapter();

  // Test rooms
  const rooms = await adapter.listRooms();
  assert.strictEqual(rooms, null);
  const room = await adapter.getRoom('room_test');
  assert.strictEqual(room, null);

  // Test playlists
  const playlists = await adapter.getUserPlaylists('usr_test');
  assert.deepStrictEqual(playlists, []);

  // Test likes
  const likes = await adapter.getUserLikedTracks('usr_test');
  assert.deepStrictEqual(likes, []);

  // Test history
  const history = await adapter.getUserListeningHistory('usr_test');
  assert.deepStrictEqual(history, []);

  // Test chat
  const chat = await adapter.getRoomMessages('room_test');
  assert.deepStrictEqual(chat, []);
});

console.log(`\nPhase 16 Test Summary: ${passedTests}/${totalTests} Passed.`);
if (passedTests !== totalTests) {
  process.exit(1);
}
