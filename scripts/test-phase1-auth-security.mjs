import {
  registerUser,
  loginUser,
  signJwt,
  verifyJwt,
  refreshSession,
  revokeRefreshToken,
  authenticateRequest,
  generateSalt,
  hashPassword,
  provisionAdminUser,
} from '../src/server/auth.js';
import crypto from 'node:crypto';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

console.log('--- AI DJ STUDIO: PHASE 1 AUTHENTICATION & SECURITY TESTS ---');

async function runTests() {
  // TEST 1: Password Hashing & Salt (REQ-002)
  console.log('\nTest Suite 1: Scrypt Hashing & Crypto Salt');
  const salt1 = generateSalt();
  const salt2 = generateSalt();
  assert(salt1 !== salt2, 'generateSalt produces cryptographically random salts');

  const hash1 = hashPassword('TestPassword123!', salt1);
  const hash2 = hashPassword('TestPassword123!', salt2);
  assert(hash1 !== 'TestPassword123!', 'Password is never stored in plaintext');
  assert(hash1 !== hash2, 'Identical passwords produce different hashes with different salts');
  assert(hash1.length === 128, 'Scrypt hash produces 64-byte hex string (128 chars)');

  // TEST 2: User Registration & Role Enforcement (SEC-01, REQ-001)
  console.log('\nTest Suite 2: User Registration & Role Enforcement (SEC-01)');
  const testEmail = `test_dj_${Date.now()}@aidjstudio.com`;

  // Invalid email
  try {
    registerUser({ email: 'invalid-email', password: 'password123', name: 'DJ Tester' });
    assert(false, 'Should reject invalid email');
  } catch (err) {
    assert(err.message.includes('Valid email address is required'), 'Rejects invalid email format');
  }

  // Short password
  try {
    registerUser({ email: testEmail, password: '123', name: 'DJ Tester' });
    assert(false, 'Should reject short password');
  } catch (err) {
    assert(err.message.includes('at least 6 characters'), 'Rejects password shorter than 6 characters');
  }

  // SEC-01 Negative Test: Attempting admin role escalation via public registration
  try {
    registerUser({ email: `attacker_${Date.now()}@test.com`, password: 'Password123!', name: 'Attacker', role: 'admin' });
    assert(false, 'Should reject registration with admin role');
  } catch (err) {
    assert(err.message.includes('cannot assign privileged roles'), 'SEC-01: Rejects public registration with role=admin');
  }

  // SEC-01 Negative Test: Attempting host / co-dj role escalation via public registration
  try {
    registerUser({ email: `attacker_host_${Date.now()}@test.com`, password: 'Password123!', name: 'Attacker', role: 'host' });
    assert(false, 'Should reject registration with host role');
  } catch (err) {
    assert(err.message.includes('cannot assign privileged roles'), 'SEC-01: Rejects public registration with role=host');
  }

  try {
    registerUser({ email: `attacker_codj_${Date.now()}@test.com`, password: 'Password123!', name: 'Attacker', role: 'co-dj' });
    assert(false, 'Should reject registration with co-dj role');
  } catch (err) {
    assert(err.message.includes('cannot assign privileged roles'), 'SEC-01: Rejects public registration with role=co-dj');
  }

  // Successful public registration defaults to listener
  const regResult = registerUser({
    email: testEmail,
    password: 'Password123!',
    name: 'DJ Test Pioneer',
  });
  assert(Boolean(regResult.user && regResult.user.id), 'Successfully registers new user');
  assert(regResult.user.email === testEmail, 'User email matches input');
  assert(regResult.user.role === 'listener', 'Assigns least-privileged listener role server-side');
  assert(Boolean(regResult.accessToken), 'Returns HS256 access token on registration');
  assert(Boolean(regResult.refreshToken), 'Returns 7-day refresh token on registration');

  // Duplicate email rejection
  try {
    registerUser({ email: testEmail, password: 'Password123!', name: 'Duplicate DJ' });
    assert(false, 'Should reject duplicate email');
  } catch (err) {
    assert(err.message.includes('already exists'), 'Rejects duplicate registration attempt');
  }

  // TEST 3: User Login (REQ-001, REQ-002)
  console.log('\nTest Suite 3: User Login & Credential Verification');
  
  // Wrong password rejection
  try {
    loginUser({ email: testEmail, password: 'WrongPassword!' });
    assert(false, 'Should reject wrong password');
  } catch (err) {
    assert(err.message.includes('Invalid email or password'), 'Constant-time verification rejects invalid password');
  }

  // Non-existent user rejection
  try {
    loginUser({ email: 'ghost_non_existent@aidjstudio.com', password: 'Password123!' });
    assert(false, 'Should reject non-existent user');
  } catch (err) {
    assert(err.message.includes('Invalid email or password'), 'Rejects non-existent email');
  }

  // Successful login
  const loginResult = loginUser({ email: testEmail, password: 'Password123!' });
  assert(loginResult.user.id === regResult.user.id, 'Authenticates valid credentials');
  assert(Boolean(loginResult.accessToken), 'Generates valid access token on login');
  assert(Boolean(loginResult.refreshToken), 'Generates valid refresh token on login');

  // TEST 4: JWT Token Structure, Expiration & Cryptographic Verification (SEC-02, REQ-003)
  console.log('\nTest Suite 4: JWT Verification & Tamper Resistance (SEC-02)');
  const tokenPayload = { sub: loginResult.user.id, email: loginResult.user.email, role: loginResult.user.role };
  const validToken = signJwt(tokenPayload, 3600);
  const verified = verifyJwt(validToken);
  assert(verified.sub === loginResult.user.id, 'Decodes and verifies valid JWT payload');
  assert(verified.exp > Math.floor(Date.now() / 1000), 'Token contains valid future expiration timestamp');

  // Tampered payload rejection
  const parts = validToken.split('.');
  const forgedPayload = Buffer.from(JSON.stringify({ ...tokenPayload, role: 'admin' })).toString('base64url');
  const forgedToken = `${parts[0]}.${forgedPayload}.${parts[2]}`;
  try {
    verifyJwt(forgedToken);
    assert(false, 'Should reject tampered token');
  } catch (err) {
    assert(err.message.includes('Cryptographic signature verification failed'), 'Rejects token with modified payload (anti-forgery)');
  }

  // Forged signature with wrong secret
  const foreignSignature = crypto
    .createHmac('sha256', 'completely-wrong-foreign-secret-key-1234567890')
    .update(`${parts[0]}.${parts[1]}`)
    .digest('base64url');
  const forgedSecretToken = `${parts[0]}.${parts[1]}.${foreignSignature}`;
  try {
    verifyJwt(forgedSecretToken);
    assert(false, 'Should reject token signed with foreign secret');
  } catch (err) {
    assert(err.message.includes('Cryptographic signature verification failed'), 'SEC-02: Rejects token signed with foreign secret');
  }

  // Expired token rejection
  const expiredToken = signJwt(tokenPayload, -10); // Expired 10 seconds ago
  try {
    verifyJwt(expiredToken);
    assert(false, 'Should reject expired token');
  } catch (err) {
    assert(err.message.includes('Token has expired'), 'Rejects expired token');
  }

  // TEST 5: Refresh Token Lifecycle (REQ-003)
  console.log('\nTest Suite 5: Refresh Token Rotation');
  const refreshed = refreshSession(loginResult.refreshToken);
  assert(Boolean(refreshed.accessToken), 'Refreshes session with valid refresh token');
  
  // Revocation
  revokeRefreshToken(loginResult.refreshToken);
  try {
    refreshSession(loginResult.refreshToken);
    assert(false, 'Should reject revoked refresh token');
  } catch (err) {
    assert(err.message.includes('Invalid or expired refresh token'), 'Rejects revoked refresh token');
  }

  // TEST 6: Operator Admin Provisioning & RBAC (SEC-03, REQ-004)
  console.log('\nTest Suite 6: Operator Admin Provisioning & RBAC (SEC-03)');
  const adminEmail = `operator_admin_${Date.now()}@aidjstudio.com`;
  const adminPass = 'OperatorMasterSecurePass2026!';

  // Provision admin via secure authorized mechanism
  const provisionResult = provisionAdminUser({
    email: adminEmail,
    password: adminPass,
    name: 'Authorized Lead Admin',
  });
  assert(provisionResult.user.role === 'admin', 'SEC-03: provisionAdminUser creates admin role');
  assert(provisionResult.user.email === adminEmail, 'SEC-03: provisionAdminUser sets correct email');

  // Verify login for provisioned admin
  const adminLogin = loginUser({ email: adminEmail, password: adminPass });
  assert(adminLogin.user.role === 'admin', 'Provisioned admin can authenticate successfully');

  const adminReq = {
    headers: { authorization: `Bearer ${adminLogin.accessToken}` },
  };
  const adminAuth = authenticateRequest(adminReq);
  assert(adminAuth.authenticated === true, 'authenticateRequest accepts valid Bearer token');
  assert(adminAuth.user.role === 'admin', 'Admin request verified with admin role');

  const unauthReq = { headers: {} };
  const unauthResult = authenticateRequest(unauthReq);
  assert(unauthResult.authenticated === false && unauthResult.status === 401, 'Unauthenticated request returns 401');

  console.log(`\n========================================`);
  console.log(`PHASE 1 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Unhandled test execution error:', e);
  process.exit(1);
});
