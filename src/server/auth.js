import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { atomicWriteJsonSync } from './db.js';

/**
 * AI DJ Studio — Cryptographic Authentication & Token Authority
 * Implements:
 * - Scrypt-based password hashing with cryptographic salt
 * - HS256 JWT signature creation and timing-safe verification
 * - 1-hour access token expiration enforcement
 * - Refresh token rotation (7-day lifecycle)
 * - Server-side Role-Based Access Control (RBAC)
 * - Protection against privilege escalation (SEC-01)
 * - Dynamic cryptographically strong JWT secret management (SEC-02)
 * - Secure operator admin provisioning (SEC-03)
 */

const DATA_DIR = path.resolve('data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const REFRESH_FILE = path.join(DATA_DIR, 'refresh_tokens.json');

// Safely load .env variables if not already set in environment
try {
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        if (key && !process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch {}

const INSECURE_PLACEHOLDER_SECRETS = [
  'your-secure-jwt-signing-secret-minimum-32-characters',
  'aidj-studio-dev-secret-key-change-in-production-2026',
  'change-in-production',
  'your-secure-random-admin-api-key',
  'your-secure-initial-admin-password',
];

export function isKnownPlaceholder(val) {
  if (!val) return true;
  const s = String(val).trim().toLowerCase();
  return INSECURE_PLACEHOLDER_SECRETS.some(
    (p) => s === p.toLowerCase() || s.includes('your-secure-jwt') || s.includes('change-in-production')
  );
}

/**
 * Resolves the JWT signing secret dynamically from environment.
 * Fails securely in production if missing or set to a known placeholder.
 * Generates ephemeral secret for testing if unset.
 */
export function resolveJwtSecret() {
  const secret = (process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET)?.trim();
  if (secret && secret.length >= 32) {
    if (process.env.NODE_ENV === 'production' && isKnownPlaceholder(secret)) {
      throw new Error(
        'FATAL SECURITY ERROR: JWT_SECRET environment variable is set to an insecure template placeholder. You must provide a unique, cryptographically strong secret in production.'
      );
    }
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable must be set with at least 32 characters in production.');
  }
  if (!globalThis.__AIDJ_DEV_JWT_SECRET) {
    globalThis.__AIDJ_DEV_JWT_SECRET = crypto.randomBytes(32).toString('hex');
    console.warn('[SECURITY WARNING] JWT_SECRET not set in environment. Generated ephemeral runtime secret.');
  }
  return globalThis.__AIDJ_DEV_JWT_SECRET;
}

export function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || resolveJwtSecret();
}

export const JWT_SECRET = resolveJwtSecret();

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
}

export function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

export function hashPassword(password, salt) {
  if (!password || !salt) throw new Error('Password and salt are required for hashing');
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64url');
}

export function base64UrlDecode(str) {
  return Buffer.from(str, 'base64url').toString('utf8');
}

/**
 * Signs a JWT with HS256 algorithm and explicit expiration
 */
export function signJwt(payload, expiresInSeconds = 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encHeader = base64UrlEncode(JSON.stringify(header));
  const encPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(`${encHeader}.${encPayload}`)
    .digest('base64url');

  return `${encHeader}.${encPayload}.${signature}`;
}

/**
 * Cryptographically verifies a JWT token
 */
export function verifyJwt(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token is missing or invalid');
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed token structure: must contain header, payload, and signature');
  }

  const [encHeader, encPayload, sig] = parts;
  let header;
  try {
    header = JSON.parse(base64UrlDecode(encHeader));
  } catch {
    throw new Error('Token header is not valid JSON');
  }

  if (header.alg !== 'HS256') {
    throw new Error(`Unsupported token algorithm: ${header.alg}. Only HS256 is permitted.`);
  }

  const expectedSig = crypto
    .createHmac('sha256', getJwtSecret())
    .update(`${encHeader}.${encPayload}`)
    .digest('base64url');

  const bufSig = Buffer.from(sig);
  const bufExpected = Buffer.from(expectedSig);

  if (bufSig.length !== bufExpected.length || !crypto.timingSafeEqual(bufSig, bufExpected)) {
    throw new Error('Cryptographic signature verification failed: forged or tampered token');
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encPayload));
  } catch {
    throw new Error('Token payload is not valid JSON');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token has expired');
  }

  return payload;
}

// =========================================================================
// USERS & SESSIONS PERSISTENCE
// =========================================================================

let usersCache = [];
let refreshTokensCache = {};

export function sanitizeUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatar: u.avatar,
    role: u.role,
    createdAt: u.createdAt,
  };
}

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      usersCache = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
  } catch {
    usersCache = [];
  }

  // Initial Operator Admin Provisioning (SEC-03)
  // Only provisions an admin if explicitly configured with secure non-template credentials
  if (process.env.INITIAL_ADMIN_EMAIL && process.env.INITIAL_ADMIN_PASSWORD) {
    const rawPass = process.env.INITIAL_ADMIN_PASSWORD.trim();
    if (isKnownPlaceholder(rawPass) || rawPass.length < 8) {
      console.warn('[SECURITY WARNING] INITIAL_ADMIN_PASSWORD uses an insecure template placeholder or is less than 8 characters. Auto-provisioning skipped.');
    } else {
      const cleanAdminEmail = process.env.INITIAL_ADMIN_EMAIL.trim().toLowerCase();
      const hasAdmin = usersCache.some((u) => u.email.toLowerCase() === cleanAdminEmail);
      if (!hasAdmin) {
        provisionAdminUser({
          email: cleanAdminEmail,
          password: rawPass,
          name: process.env.INITIAL_ADMIN_NAME || 'Platform Administrator',
        });
      }
    }
  }
}

function saveUsers() {
  try {
    atomicWriteJsonSync(USERS_FILE, usersCache);
  } catch (e) {
    console.error('Failed to persist users database:', e.message);
  }
}

function loadRefreshTokens() {
  try {
    if (fs.existsSync(REFRESH_FILE)) {
      refreshTokensCache = JSON.parse(fs.readFileSync(REFRESH_FILE, 'utf8'));
    }
  } catch {
    refreshTokensCache = {};
  }
}

function saveRefreshTokens() {
  try {
    atomicWriteJsonSync(REFRESH_FILE, refreshTokensCache);
  } catch {}
}

loadUsers();
loadRefreshTokens();

export function generateRefreshToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const exp = Date.now() + 7 * 86400000; // 7 days
  refreshTokensCache[token] = { userId, exp };
  saveRefreshTokens();
  return token;
}

export function revokeRefreshToken(token) {
  if (token && refreshTokensCache[token]) {
    delete refreshTokensCache[token];
    saveRefreshTokens();
    return true;
  }
  return false;
}

/**
 * Public User Registration
 * Enforces server-side least privilege (SEC-01).
 * Rejects client-supplied privileged roles (admin, moderator, host, co-dj).
 */
export function registerUser({ email, password, name, role }, options = {}) {
  if (!email || !email.includes('@')) {
    throw new Error('Valid email address is required');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  // SEC-01: Rejection of unprivileged role escalation attempts
  if (role && role !== 'listener') {
    if (!options.isPrivilegedProvisioning) {
      throw new Error('Public registration cannot assign privileged roles. All new accounts default to listener.');
    }
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = (name || cleanEmail.split('@')[0] || 'DJ User').trim();

  loadUsers();
  if (usersCache.some((u) => u.email.toLowerCase() === cleanEmail)) {
    throw new Error('An account with this email address already exists');
  }

  const assignedRole = (options.isPrivilegedProvisioning && role) ? role : 'listener';
  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  const user = {
    id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    email: cleanEmail,
    passwordHash,
    salt,
    name: cleanName,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
    role: assignedRole,
    createdAt: Date.now(),
  };

  usersCache.push(user);
  saveUsers();

  const tokenPayload = {
    sub: user.id,
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
  };

  const accessToken = signJwt(tokenPayload, 3600);
  const refreshToken = generateRefreshToken(user.id);

  return { user: sanitizeUser(user), accessToken, refreshToken, expiresIn: 3600 };
}

/**
 * Provision an Administrator Account
 * Only invoked by explicit operator tooling (scripts/provision-admin.mjs) or server startup with credentials.
 */
export function provisionAdminUser({ email, password, name = 'Platform Administrator' }) {
  if (!email || !email.includes('@')) {
    throw new Error('Valid email address is required for admin provisioning');
  }
  if (!password || password.length < 8) {
    throw new Error('Admin password must be at least 8 characters long');
  }

  loadUsers();
  const cleanEmail = email.trim().toLowerCase();
  let existingIndex = usersCache.findIndex((u) => u.email.toLowerCase() === cleanEmail);

  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);

  if (existingIndex >= 0) {
    usersCache[existingIndex].passwordHash = passwordHash;
    usersCache[existingIndex].salt = salt;
    usersCache[existingIndex].role = 'admin';
    if (name) usersCache[existingIndex].name = name;
    usersCache[existingIndex].updatedAt = Date.now();
    saveUsers();
    return { user: sanitizeUser(usersCache[existingIndex]), action: 'updated' };
  } else {
    const adminUser = {
      id: `usr_admin_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      email: cleanEmail,
      passwordHash,
      salt,
      name,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      role: 'admin',
      createdAt: Date.now(),
    };
    usersCache.push(adminUser);
    saveUsers();
    return { user: sanitizeUser(adminUser), action: 'created' };
  }
}

export function loginUser({ email, password }) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const cleanEmail = email.trim().toLowerCase();
  loadUsers();
  const user = usersCache.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const calculatedHash = hashPassword(password, user.salt);
  const bufCalc = Buffer.from(calculatedHash);
  const bufStored = Buffer.from(user.passwordHash);

  if (bufCalc.length !== bufStored.length || !crypto.timingSafeEqual(bufCalc, bufStored)) {
    throw new Error('Invalid email or password');
  }

  const tokenPayload = {
    sub: user.id,
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
  };

  const accessToken = signJwt(tokenPayload, 3600);
  const refreshToken = generateRefreshToken(user.id);

  return { user: sanitizeUser(user), accessToken, refreshToken, expiresIn: 3600 };
}

export function refreshSession(refreshToken) {
  if (!refreshToken || !refreshTokensCache[refreshToken]) {
    throw new Error('Invalid or expired refresh token');
  }

  const session = refreshTokensCache[refreshToken];
  if (session.exp < Date.now()) {
    delete refreshTokensCache[refreshToken];
    saveRefreshTokens();
    throw new Error('Refresh token has expired. Please log in again.');
  }

  loadUsers();
  const user = usersCache.find((u) => u.id === session.userId);
  if (!user) {
    throw new Error('User account not found');
  }

  // Refresh Token Rotation (RTR - RFC 6749 & OWASP ASVS 5.0)
  // Invalidate consumed refresh token immediately upon single use
  delete refreshTokensCache[refreshToken];

  // Issue new rotated refresh token
  const newRefreshToken = generateRefreshToken(user.id);
  saveRefreshTokens();

  const tokenPayload = {
    sub: user.id,
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
  };

  const newAccessToken = signJwt(tokenPayload, 3600);
  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: 3600,
    user: sanitizeUser(user),
  };
}

export function getUserById(id) {
  loadUsers();
  const user = usersCache.find((u) => u.id === id);
  return sanitizeUser(user);
}

export function updateUserProfile(userId, { name, avatar }) {
  loadUsers();
  const idx = usersCache.findIndex((u) => u.id === userId);
  if (idx < 0) {
    throw new Error('User not found');
  }
  if (name && typeof name === 'string' && name.trim()) {
    usersCache[idx].name = name.trim();
  }
  if (avatar && typeof avatar === 'string' && avatar.trim()) {
    usersCache[idx].avatar = avatar.trim();
  }
  usersCache[idx].updatedAt = Date.now();
  saveUsers();
  return sanitizeUser(usersCache[idx]);
}

export function getAllUsers() {
  loadUsers();
  return usersCache.map(sanitizeUser);
}

/**
 * Extracts and cryptographically verifies JWT from incoming HTTP request
 */
export function authenticateRequest(req) {
  let token = null;

  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token && req.url) {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      token = url.searchParams.get('token');
    } catch {}
  }

  if (!token) {
    return {
      authenticated: false,
      error: 'Authorization header with Bearer token is required',
      status: 401,
    };
  }

  try {
    const payload = verifyJwt(token);
    return {
      authenticated: true,
      user: payload,
    };
  } catch (err) {
    return {
      authenticated: false,
      error: err.message,
      status: 401,
    };
  }
}
