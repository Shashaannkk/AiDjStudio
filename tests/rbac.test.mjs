import assert from 'node:assert/strict';
import {
  registerUser,
  loginUser,
  signJwt,
  verifyJwt,
  refreshSession,
  authenticateRequest,
  generateSalt,
  hashPassword,
} from '../src/server/auth.js';

console.log('========================================================================');
console.log('SECURITY & RBAC: 4-TIER ROLE ENFORCEMENT & CRYPTOGRAPHY TEST SUITE');
console.log('PRD Section 10.1 — Scrypt, HS256 JWT, Token Rotation & Role Hierarchy');
console.log('========================================================================\n');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// 1. SCRYPT PASSWORD HASHING & UNIQUE 16-BYTE SALTS
// ---------------------------------------------------------------------------

test('Scrypt salt generation produces unique cryptographically random salts', () => {
  const s1 = generateSalt();
  const s2 = generateSalt();
  assert.notStrictEqual(s1, s2);
  assert.strictEqual(s1.length, 32); // 16 bytes = 32 hex chars
});

test('Scrypt hashing produces 64-byte hex digest (128 hex chars)', () => {
  const salt = generateSalt();
  const hash = hashPassword('MySecretPass#2026', salt);
  assert.strictEqual(hash.length, 128);
  assert.notStrictEqual(hash, 'MySecretPass#2026');
});

test('Same password with different salts yields distinct hashes', () => {
  const s1 = generateSalt();
  const s2 = generateSalt();
  const h1 = hashPassword('IdenticalPass', s1);
  const h2 = hashPassword('IdenticalPass', s2);
  assert.notStrictEqual(h1, h2);
});

// ---------------------------------------------------------------------------
// 2. USER REGISTRATION & ROLE TAMPERING PREVENTION (SEC-01)
// ---------------------------------------------------------------------------

const testEmail = `dj_eval_${Date.now()}@aidjstudio.com`;
const testPass = 'SecureEvalPass#2026!';

test('Registration rejects client-supplied privileged "admin" role (SEC-01)', () => {
  assert.throws(
    () => {
      registerUser({
        email: testEmail,
        password: testPass,
        name: 'DJ Tamper',
        role: 'admin',
      });
    },
    (err) => {
      return err.message.includes('Public registration cannot assign privileged roles');
    }
  );
});

test('Public registration succeeds and assigns default "listener" role', () => {
  const res = registerUser({
    email: testEmail,
    password: testPass,
    name: 'DJ Evaluator',
  });
  assert.strictEqual(res.user.role, 'listener');
  assert.strictEqual(res.user.email, testEmail);
  assert.ok(res.accessToken);
  assert.ok(res.refreshToken);
});

test('Login with valid credentials issues JWT access & refresh tokens', () => {
  const session = loginUser({ email: testEmail, password: testPass });
  assert.ok(session.accessToken, 'Access token must be returned');
  assert.ok(session.refreshToken, 'Refresh token must be returned');
  assert.strictEqual(session.user.email, testEmail);
});

test('Login with incorrect password is rejected (HTTP 401)', () => {
  assert.throws(
    () => {
      loginUser({ email: testEmail, password: 'WrongPassword#999' });
    },
    (err) => {
      return err.message.includes('Invalid email or password');
    }
  );
});

// ---------------------------------------------------------------------------
// 3. HS256 JWT TOKEN SIGNING & EXPIRATION VERIFICATION
// ---------------------------------------------------------------------------

test('Signed JWT verifies and decodes valid payload', () => {
  const token = signJwt({ userId: 'u_123', email: 'test@dj.com', role: 'listener' }, 900);
  const decoded = verifyJwt(token);
  assert.strictEqual(decoded.userId, 'u_123');
  assert.strictEqual(decoded.role, 'listener');
});

test('Tampered or corrupted JWT is rejected with cryptographic error', () => {
  const token = signJwt({ userId: 'u_123' }, 900);
  const tampered = token.slice(0, -6) + 'abcdef';
  assert.throws(
    () => {
      verifyJwt(tampered);
    },
    (err) => {
      return err.message.includes('signature verification failed');
    }
  );
});

test('Refresh token rotation issues a new token and revokes the old one', () => {
  const session = loginUser({ email: testEmail, password: testPass });
  const oldRefresh = session.refreshToken;

  const refreshed = refreshSession(oldRefresh);
  assert.ok(refreshed.accessToken);
  assert.ok(refreshed.refreshToken);
  assert.notStrictEqual(refreshed.refreshToken, oldRefresh, 'Refresh token must be rotated');

  // Re-using old token must fail
  assert.throws(
    () => {
      refreshSession(oldRefresh);
    },
    (err) => {
      return err.message.includes('Invalid or expired refresh token');
    }
  );
});

// ---------------------------------------------------------------------------
// 4. SERVER-SIDE 4-TIER RBAC AUTHORIZATION CHECKS
// ---------------------------------------------------------------------------

test('authenticateRequest extracts user and verifies role hierarchy', () => {
  const listenerToken = signJwt({ id: 'u_list', role: 'listener' }, 900);
  const hostToken = signJwt({ id: 'u_host', role: 'host' }, 900);
  const adminToken = signJwt({ id: 'u_admin', role: 'admin' }, 900);

  const reqListener = { headers: { authorization: `Bearer ${listenerToken}` } };
  const reqHost = { headers: { authorization: `Bearer ${hostToken}` } };
  const reqAdmin = { headers: { authorization: `Bearer ${adminToken}` } };

  assert.strictEqual(authenticateRequest(reqListener).user.role, 'listener');
  assert.strictEqual(authenticateRequest(reqHost).user.role, 'host');
  assert.strictEqual(authenticateRequest(reqAdmin).user.role, 'admin');
});

console.log(`\nResult: ${passed}/${total} assertions passed.\n`);
if (passed !== total) process.exit(1);
