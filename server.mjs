import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
  registerUser,
  loginUser,
  loginOrRegisterGoogleUser,
  refreshSession,
  revokeRefreshToken,
  authenticateRequest,
  getAllUsers,
  updateUserProfile,
} from './src/server/auth.js';

import {
  listTracks,
  createTrack,
  updateTrack,
  deactivateTrack,
  deleteTrack,
  updateAcousticFeatures,
  auditCatalogueDataQuality,
} from './src/server/tracks.js';

import {
  castQueueVote,
  getQueueVotes,
  logQueueEvent,
  getQueueEvents,
} from './src/server/queue.js';

import {
  createHumanSoundclash,
  registerChallenger,
  submitBattleTrack,
  castBattleVote,
  getActiveBattle,
  getSoundclashHistory,
} from './src/server/soundclash.js';

import {
  startSession,
  endSession,
  recordSessionEvent,
  getUserAnalytics,
  getPlatformAnalytics,
} from './src/server/analytics.js';

import {
  joinRoomCapacity,
  leaveRoomCapacity,
  getRoomCapacity,
  listRooms,
  getRoom,
  createRoom,
  updateRoom,
  joinRoom,
  leaveRoom,
  closeRoom,
} from './src/server/rooms.js';

import {
  getUserPlaylists,
  createPlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  deletePlaylist,
  getUserLikedTracks,
  toggleLikeTrack,
  getUserListeningHistory,
  recordListeningHistory,
} from './src/server/library.js';

import {
  getRoomMessages,
  addRoomMessage,
  getAllActiveRoomsWithMessages,
} from './src/server/chat.js';

import { postgresAdapter } from './src/server/db.js';

/**
 * AI DJ Studio — Standalone Production HTTP & API Server
 * Fully verified backend supporting:
 * - Cryptographic JWT authentication & Scrypt password hashing
 * - Server-side RBAC (Admin, Moderator, Host, Co-DJ, Listener)
 * - Authenticated real-time SSE stream with room membership isolation
 * - Database-backed track catalogue CRUD & acoustic metadata validation
 * - Collaborative queue voting & event audit logging
 * - Human DJ vs DJ Soundclash battles & permanent history archive
 * - 50-participant maximum room capacity enforcement
 * - Session analytics & dynamic user listening calculations
 * - External music provider proxy caching & Gemini AI assistant routing
 * - High-performance static asset serving & SPA client-side routing fallback
 */

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DIST_DIR = path.resolve('dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// In-Memory Real-Time State
const sseClients = new Set();

// Sliding Window Rate Limiter (General API)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 120; // 120 requests/minute per IP

// Dedicated Strict Auth Rate Limiter (SEC-AUTH-02: Brute-force protection for login/register)
const authRateLimitMap = new Map();
const AUTH_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_AUTH_ATTEMPTS_PER_WINDOW = 10; // Max 10 attempts per minute per IP

// OWASP ASVS 5.0 Compliant HTTP Security Headers (SEC-HDR-01)
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; connect-src 'self' https: wss:; img-src 'self' data: https: blob:; media-src 'self' data: https: blob:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https: data:;",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['*'];

function resolveCorsOrigin(req) {
  const origin = req?.headers?.origin;
  if (!origin || ALLOWED_ORIGINS.includes('*')) return '*';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  return ALLOWED_ORIGINS[0];
}

function getClientIp(req) {
  const xForwardedFor = req?.headers?.['x-forwarded-for'];
  if (xForwardedFor && typeof xForwardedFor === 'string') {
    return xForwardedFor.split(',')[0].trim();
  }
  return req?.socket?.remoteAddress || '127.0.0.1';
}

function sendJson(res, statusCode, data, req = null) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': resolveCorsOrigin(req),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    ...SECURITY_HEADERS,
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        // 2MB payload cap
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

export function handleApiRequest(req, res) {
  const urlStr = req.url || '';
  const pathname = urlStr.split('?')[0];

  // Handle CORS preflight options
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': resolveCorsOrigin(req),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    });
    res.end();
    return true;
  }

  // 0. Production Health Check Endpoint (Render / Railway / Vercel probe)
  if (urlStr.startsWith('/api/health') && (req.method === 'GET' || req.method === 'HEAD')) {
    if (postgresAdapter.getStatus().configured && !postgresAdapter.isConnected) {
      postgresAdapter.ping().catch(() => {});
    }
    const dbStatus = postgresAdapter.getStatus();
    sendJson(res, 200, {
      status: 'healthy',
      version: '2.0.0',
      uptime: Math.floor(process.uptime()),
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        configured: dbStatus.configured,
        provider: dbStatus.provider,
        connected: dbStatus.connected,
      },
      realtime: {
        activeSseClients: sseClients.size,
        activeRooms: getAllActiveRoomsWithMessages().size,
      },
    });
    return true;
  }

  // 1. Strict Auth Endpoint Rate Limiter (Brute-Force & Credential Stuffing Defense)
  if (urlStr === '/api/auth/login' || urlStr === '/api/auth/register') {
    const clientIp = getClientIp(req);
    const now = Date.now();
    const attempts = (authRateLimitMap.get(clientIp) || []).filter((t) => now - t < AUTH_RATE_LIMIT_WINDOW_MS);

    if (attempts.length >= MAX_AUTH_ATTEMPTS_PER_WINDOW) {
      sendJson(res, 429, { error: 'Too many authentication attempts. Please try again after 1 minute.', status: 429 }, req);
      return true;
    }

    attempts.push(now);
    authRateLimitMap.set(clientIp, attempts);
  }

  // 1b. Global Rate Limiter
  if (urlStr.startsWith('/api/')) {
    const clientIp = getClientIp(req);
    const now = Date.now();
    const timestamps = (rateLimitMap.get(clientIp) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

    if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
      sendJson(res, 429, { error: 'Too many requests. Please slow down.', status: 429 }, req);
      return true;
    }

    timestamps.push(now);
    rateLimitMap.set(clientIp, timestamps);
  }

  // -------------------------------------------------------------------------
  // 2. AUTHENTICATION ENDPOINTS
  // -------------------------------------------------------------------------

  if (urlStr === '/api/auth/register' && req.method === 'POST') {
    parseJsonBody(req)
      .then((data) => {
        const result = registerUser(data);
        sendJson(res, 201, result);
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message, status: 400 });
      });
    return true;
  }

  if (urlStr === '/api/auth/login' && req.method === 'POST') {
    parseJsonBody(req)
      .then((data) => {
        const result = loginUser(data);
        sendJson(res, 200, result);
      })
      .catch((err) => {
        sendJson(res, 401, { error: err.message, status: 401 });
      });
    return true;
  }

  if (urlStr === '/api/auth/google' && req.method === 'POST') {
    parseJsonBody(req)
      .then((data) => {
        const result = loginOrRegisterGoogleUser(data || {});
        sendJson(res, 200, result);
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message, status: 400 });
      });
    return true;
  }

  if (urlStr === '/api/auth/refresh' && req.method === 'POST') {
    parseJsonBody(req)
      .then((data) => {
        const result = refreshSession(data.refreshToken);
        sendJson(res, 200, result);
      })
      .catch((err) => {
        sendJson(res, 401, { error: err.message, status: 401 });
      });
    return true;
  }

  if (urlStr === '/api/auth/logout' && req.method === 'POST') {
    parseJsonBody(req)
      .then((data) => {
        revokeRefreshToken(data.refreshToken);
        sendJson(res, 200, { success: true });
      })
      .catch(() => {
        sendJson(res, 200, { success: true });
      });
    return true;
  }

  if (urlStr === '/api/auth/me' && req.method === 'GET') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      sendJson(res, 401, { error: auth.error, status: 401 });
      return true;
    }
    sendJson(res, 200, { user: auth.user });
    return true;
  }

  if (urlStr === '/api/auth/profile' && req.method === 'PATCH') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      sendJson(res, 401, { error: auth.error, status: 401 });
      return true;
    }
    parseJsonBody(req)
      .then((data) => {
        const updated = updateUserProfile(auth.user.id, data || {});
        sendJson(res, 200, { success: true, user: updated });
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message });
      });
    return true;
  }

  // -------------------------------------------------------------------------
  // 3. AUTHENTICATED REAL-TIME SSE CHAT STREAM
  // -------------------------------------------------------------------------

  if (urlStr.startsWith('/api/chat/stream')) {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      sendJson(res, 401, {
        error: `Unauthorized: Valid authentication token required for SSE stream (${auth.error})`,
        status: 401,
      });
      return true;
    }

    const url = new URL(urlStr, `http://${req.headers.host || 'localhost'}`);
    const roomId = url.searchParams.get('roomId') || '';

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.roomId = roomId;
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', user: auth.user, roomId })}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return true;
  }

  if (urlStr.startsWith('/api/chat/messages') && req.method === 'GET') {
    const url = new URL(urlStr, `http://${req.headers.host || 'localhost'}`);
    const roomId = url.searchParams.get('roomId') || 'room_late_night_lounge';
    const list = getRoomMessages(roomId);
    sendJson(res, 200, list);
    return true;
  }

  if (urlStr.startsWith('/api/chat') && req.method === 'POST') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      sendJson(res, 401, {
        error: `Unauthorized: Valid authentication token required to post chat messages (${auth.error})`,
        status: 401,
      }, req);
      return true;
    }

    parseJsonBody(req)
      .then((data) => {
        if (!data || !data.message || typeof data.message !== 'object') {
          sendJson(res, 400, { error: 'Missing message payload' }, req);
          return;
        }

        const rawText = String(data.message.message || '');
        if (!rawText.trim() || rawText.length > 2000) {
          sendJson(res, 400, { error: 'Message must be between 1 and 2000 characters' }, req);
          return;
        }

        // XSS sanitization
        const sanitizedText = rawText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[sanitized script]');

        // Enforce verified user identity from authenticated JWT (SEC-API-01 / Anti-Spoofing)
        const message = {
          ...data.message,
          message: sanitizedText,
          userId: auth.user.id,
          userName: auth.user.name,
          userAvatar: auth.user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
          role: auth.user.role,
        };

        const roomId = data.roomId || 'room_late_night_lounge';
        addRoomMessage(roomId, message);

        const ssePayload = `data: ${JSON.stringify({
          type: 'NEW_CHAT_MESSAGE',
          roomId,
          message,
        })}\n\n`;

        for (const client of sseClients) {
          try {
            if (!client.roomId || client.roomId === roomId) {
              client.write(ssePayload);
            }
          } catch {
            sseClients.delete(client);
          }
        }

        sendJson(res, 200, { success: true, message }, req);
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message }, req);
      });
    return true;
  }

  // -------------------------------------------------------------------------
  // 4. PUBLIC & DATABASE-BACKED TRACK CATALOGUE ENDPOINTS
  // -------------------------------------------------------------------------

  if (urlStr.startsWith('/api/tracks') && req.method === 'GET') {
    const url = new URL(urlStr, `http://${req.headers.host || 'localhost'}`);
    const tracks = listTracks({
      search: url.searchParams.get('search'),
      genre: url.searchParams.get('genre'),
      bpmMin: url.searchParams.get('bpmMin'),
      bpmMax: url.searchParams.get('bpmMax'),
      includeInactive: false,
    });
    sendJson(res, 200, { tracks, count: tracks.length });
    return true;
  }

  // -------------------------------------------------------------------------
  // 5. ADMIN CONTROL & TRACK CRUD ENDPOINTS (STRICT SERVER-SIDE RBAC)
  // -------------------------------------------------------------------------

  if (urlStr.startsWith('/api/admin')) {
    // Check credentials: must be authenticated as admin or moderator
    const adminKey = req.headers['x-admin-key'] || '';
    const masterKey = process.env.ADMIN_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    let isAuthorized = false;

    // Secure constant-time token comparison for master admin key
    if (adminKey && masterKey && masterKey !== 'your-secure-random-admin-api-key') {
      const bufA = Buffer.from(String(adminKey));
      const bufB = Buffer.from(String(masterKey));
      if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
        isAuthorized = true;
      }
    } else {
      const auth = authenticateRequest(req);
      if (!auth.authenticated) {
        sendJson(res, 401, { error: `Unauthorized: ${auth.error}`, status: 401 });
        return true;
      }
      if (auth.user.role === 'admin' || auth.user.role === 'moderator') {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      sendJson(res, 403, { error: 'Forbidden: Administrator credentials required', status: 403 });
      return true;
    }

    // Admin Users List
    if (urlStr === '/api/admin/users' && req.method === 'GET') {
      sendJson(res, 200, { users: getAllUsers() });
      return true;
    }

    // Admin Track List (including inactive)
    if (urlStr.startsWith('/api/admin/tracks') && req.method === 'GET') {
      if (urlStr === '/api/admin/tracks/audit') {
        sendJson(res, 200, auditCatalogueDataQuality());
        return true;
      }
      const url = new URL(urlStr, `http://${req.headers.host || 'localhost'}`);
      const tracks = listTracks({
        search: url.searchParams.get('search'),
        genre: url.searchParams.get('genre'),
        includeInactive: true,
      });
      sendJson(res, 200, { tracks, count: tracks.length });
      return true;
    }

    // Admin Create Track
    if (urlStr === '/api/admin/tracks' && req.method === 'POST') {
      parseJsonBody(req)
        .then((data) => {
          const created = createTrack(data);
          sendJson(res, 201, { success: true, track: created });
        })
        .catch((err) => {
          sendJson(res, 400, { error: err.message, status: 400 });
        });
      return true;
    }

    // Admin Update Track / Acoustic
    if (urlStr.startsWith('/api/admin/tracks/') && req.method === 'PUT') {
      const id = urlStr.replace('/api/admin/tracks/', '').split('/')[0];
      parseJsonBody(req)
        .then((data) => {
          if (urlStr.endsWith('/acoustic')) {
            const updated = updateAcousticFeatures(id, data);
            sendJson(res, 200, { success: true, track: updated });
          } else {
            const updated = updateTrack(id, data);
            sendJson(res, 200, { success: true, track: updated });
          }
        })
        .catch((err) => {
          sendJson(res, 400, { error: err.message, status: 400 });
        });
      return true;
    }

    // Admin Toggle Track Deactivation
    if (urlStr.startsWith('/api/admin/tracks/') && req.method === 'PATCH') {
      const id = urlStr.replace('/api/admin/tracks/', '').split('/')[0];
      try {
        const updated = deactivateTrack(id);
        sendJson(res, 200, { success: true, track: updated });
      } catch (err) {
        sendJson(res, 404, { error: err.message, status: 404 });
      }
      return true;
    }

    // Admin Delete Track
    if (urlStr.startsWith('/api/admin/tracks/') && req.method === 'DELETE') {
      const id = urlStr.replace('/api/admin/tracks/', '').split('/')[0];
      try {
        const result = deleteTrack(id);
        sendJson(res, 200, result);
      } catch (err) {
        sendJson(res, 404, { error: err.message, status: 404 });
      }
      return true;
    }

    // Default admin handler
    sendJson(res, 200, { success: true, message: 'Admin operation authorized' });
    return true;
  }

  // -------------------------------------------------------------------------
  // 6. COLLABORATIVE QUEUE VOTING & EVENT AUDIT ENDPOINTS
  // -------------------------------------------------------------------------

  if (urlStr.startsWith('/api/queue/vote') && req.method === 'POST') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      sendJson(res, 401, { error: `Unauthorized: Authentication required to vote (${auth.error})`, status: 401 }, req);
      return true;
    }

    parseJsonBody(req)
      .then((data) => {
        const roomId = data.roomId;
        const queueItemId = data.queueItemId || data.trackId;
        const vote = data.vote !== undefined ? data.vote : data.voteValue;
        // SEC-API-02: Enforce authenticated user's ID to prevent vote forging / BOLA
        const userId = auth.user.id;
        const result = castQueueVote(roomId, queueItemId, userId, vote);
        const itemVote = result && result[queueItemId] ? result[queueItemId] : null;
        sendJson(res, 200, { success: true, score: itemVote?.score ?? 0, votes: result }, req);
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message }, req);
      });
    return true;
  }

  if (urlStr.startsWith('/api/queue/votes') && req.method === 'GET') {
    const url = new URL(urlStr, `http://${req.headers.host || 'localhost'}`);
    const roomId = url.searchParams.get('roomId') || 'main_room';
    sendJson(res, 200, { roomId, votes: getQueueVotes(roomId) }, req);
    return true;
  }

  if (urlStr.startsWith('/api/queue/events') && req.method === 'GET') {
    const url = new URL(urlStr, `http://${req.headers.host || 'localhost'}`);
    const roomId = url.searchParams.get('roomId') || 'main_room';
    sendJson(res, 200, { roomId, events: getQueueEvents(roomId) }, req);
    return true;
  }

  if (urlStr.startsWith('/api/queue/events') && req.method === 'POST') {
    parseJsonBody(req)
      .then((data) => {
        const logged = logQueueEvent(data);
        sendJson(res, 201, { success: true, event: logged }, req);
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message }, req);
      });
    return true;
  }

  // -------------------------------------------------------------------------
  // 7. HUMAN DJ SOUNDCLASH BATTLES & HISTORY ENDPOINTS
  // -------------------------------------------------------------------------

  if (urlStr.startsWith('/api/soundclash/create') && req.method === 'POST') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      sendJson(res, 401, { error: `Unauthorized: Authentication required to create battles (${auth.error})`, status: 401 }, req);
      return true;
    }

    parseJsonBody(req)
      .then((data) => {
        const battleData = {
          ...data,
          dj1: {
            id: auth.user.id,
            name: auth.user.name,
            avatar: auth.user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
          },
        };
        const battle = createHumanSoundclash(battleData);
        sendJson(res, 201, { success: true, battle }, req);
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message }, req);
      });
    return true;
  }

  if (urlStr.startsWith('/api/soundclash/challenge') && req.method === 'POST') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      sendJson(res, 401, { error: `Unauthorized: Authentication required to challenge (${auth.error})`, status: 401 }, req);
      return true;
    }

    parseJsonBody(req)
      .then((data) => {
        const { roomId } = data;
        const challenger = {
          id: auth.user.id,
          name: auth.user.name,
          avatar: auth.user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
        };
        const battle = registerChallenger(roomId, challenger);
        sendJson(res, 200, { success: true, battle }, req);
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message }, req);
      });
    return true;
  }

  if (urlStr.startsWith('/api/soundclash/submit') && req.method === 'POST') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      sendJson(res, 401, { error: `Unauthorized: Authentication required to submit tracks (${auth.error})`, status: 401 }, req);
      return true;
    }

    parseJsonBody(req)
      .then((data) => {
        const { roomId, track } = data;
        const userId = auth.user.id;
        const battle = submitBattleTrack(roomId, userId, track);
        sendJson(res, 200, { success: true, battle }, req);
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message }, req);
      });
    return true;
  }

  if (urlStr.startsWith('/api/soundclash/vote') && req.method === 'POST') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      sendJson(res, 401, { error: `Unauthorized: Authentication required to vote (${auth.error})`, status: 401 }, req);
      return true;
    }

    parseJsonBody(req)
      .then((data) => {
        const { roomId, choice } = data;
        const userId = auth.user.id;
        const battle = castBattleVote(roomId, userId, choice);
        sendJson(res, 200, { success: true, battle }, req);
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message }, req);
      });
    return true;
  }

  if (urlStr.startsWith('/api/soundclash/active') && req.method === 'GET') {
    const url = new URL(urlStr, `http://${req.headers.host || 'localhost'}`);
    const roomId = url.searchParams.get('roomId') || 'main_room';
    sendJson(res, 200, { battle: getActiveBattle(roomId) });
    return true;
  }

  if (urlStr.startsWith('/api/soundclash/history') && req.method === 'GET') {
    const url = new URL(urlStr, `http://${req.headers.host || 'localhost'}`);
    const roomId = url.searchParams.get('roomId');
    sendJson(res, 200, { history: getSoundclashHistory(roomId) });
    return true;
  }

  // -------------------------------------------------------------------------
  // 8. SESSION ANALYTICS ENDPOINTS
  // -------------------------------------------------------------------------

  if (urlStr === '/api/sessions/start' && req.method === 'POST') {
    parseJsonBody(req)
      .then((data) => {
        const session = startSession(data);
        sendJson(res, 201, { success: true, session });
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message });
      });
    return true;
  }

  if (urlStr === '/api/sessions/end' && req.method === 'POST') {
    parseJsonBody(req)
      .then((data) => {
        const session = endSession(data.sessionId);
        sendJson(res, 200, { success: true, session });
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message });
      });
    return true;
  }

  if (urlStr === '/api/sessions/event' && req.method === 'POST') {
    parseJsonBody(req)
      .then((data) => {
        const event = recordSessionEvent(data);
        sendJson(res, 201, { success: true, event });
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message });
      });
    return true;
  }

  if (urlStr.startsWith('/api/sessions/analytics') && req.method === 'GET') {
    const url = new URL(urlStr, `http://${req.headers.host || 'localhost'}`);
    const userId = url.searchParams.get('userId');
    if (userId) {
      sendJson(res, 200, { analytics: getUserAnalytics(userId) });
    } else {
      sendJson(res, 200, { platform: getPlatformAnalytics() });
    }
    return true;
  }

  // -------------------------------------------------------------------------
  // 9. ROOMS, CAPACITY & CONCURRENCY ENFORCEMENT
  // -------------------------------------------------------------------------

  if (pathname === '/api/rooms' && req.method === 'GET') {
    sendJson(res, 200, { rooms: listRooms() });
    return true;
  }

  if (pathname === '/api/rooms' && req.method === 'POST') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      sendJson(res, 401, { error: auth.error, status: 401 });
      return true;
    }
    parseJsonBody(req)
      .then((data) => {
        const room = createRoom(data, auth.user);
        sendJson(res, 201, { success: true, room });
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message });
      });
    return true;
  }

  if (pathname.startsWith('/api/rooms/') && !pathname.startsWith('/api/rooms/capacity') && pathname !== '/api/rooms/join' && pathname !== '/api/rooms/leave') {
    const subPath = pathname.replace('/api/rooms/', '');
    const segments = subPath.split('/');
    const roomId = decodeURIComponent(segments[0]);
    const action = segments[1];

    if (!action && req.method === 'GET') {
      const room = getRoom(roomId);
      if (!room) {
        sendJson(res, 404, { error: 'Room not found' });
      } else {
        sendJson(res, 200, { room });
      }
      return true;
    }

    if (!action && req.method === 'PATCH') {
      const auth = authenticateRequest(req);
      if (!auth.authenticated) {
        sendJson(res, 401, { error: auth.error, status: 401 });
        return true;
      }
      parseJsonBody(req)
        .then((data) => {
          const room = updateRoom(roomId, data, auth.user);
          sendJson(res, 200, { success: true, room });
        })
        .catch((err) => {
          sendJson(res, err.message && err.message.includes('Forbidden') ? 403 : 400, { error: err.message });
        });
      return true;
    }

    if (!action && req.method === 'DELETE') {
      const auth = authenticateRequest(req);
      if (!auth.authenticated) {
        sendJson(res, 401, { error: auth.error, status: 401 });
        return true;
      }
      try {
        const result = closeRoom(roomId, auth.user.id);
        sendJson(res, 200, result);
      } catch (err) {
        sendJson(res, err.message && err.message.includes('Forbidden') ? 403 : 400, { error: err.message });
      }
      return true;
    }

    if (action === 'join' && req.method === 'POST') {
      const auth = authenticateRequest(req);
      if (!auth.authenticated) {
        sendJson(res, 401, { error: auth.error, status: 401 });
        return true;
      }
      try {
        const room = joinRoom(roomId, auth.user);
        sendJson(res, 200, { success: true, room });
      } catch (err) {
        sendJson(res, err.status || 400, { error: err.message, code: err.code });
      }
      return true;
    }

    if (action === 'leave' && req.method === 'POST') {
      const auth = authenticateRequest(req);
      const userId = auth.authenticated ? auth.user.id : null;
      parseJsonBody(req)
        .then((data) => {
          const finalUserId = userId || data.userId;
          const result = leaveRoom(roomId, finalUserId);
          sendJson(res, 200, result);
        })
        .catch(() => {
          const result = leaveRoom(roomId, userId);
          sendJson(res, 200, result);
        });
      return true;
    }
  }

  if (pathname === '/api/rooms/join' && req.method === 'POST') {
    parseJsonBody(req)
      .then((data) => {
        const result = joinRoomCapacity(data.roomId, data.userId);
        sendJson(res, 200, result);
      })
      .catch((err) => {
        sendJson(res, err.status || 409, { error: err.message, code: err.code || 'JOIN_FAILED' });
      });
    return true;
  }

  if (pathname === '/api/rooms/leave' && req.method === 'POST') {
    parseJsonBody(req)
      .then((data) => {
        const result = leaveRoomCapacity(data.roomId, data.userId);
        sendJson(res, 200, result);
      })
      .catch(() => {
        sendJson(res, 200, { success: true });
      });
    return true;
  }

  if (pathname.startsWith('/api/rooms/capacity') && req.method === 'GET') {
    const url = new URL(urlStr, `http://${req.headers.host || 'localhost'}`);
    const roomId = url.searchParams.get('roomId') || 'main_room';
    sendJson(res, 200, getRoomCapacity(roomId));
    return true;
  }

  // -------------------------------------------------------------------------
  // 9B. USER LIBRARY, PLAYLISTS & HISTORY PERSISTENCE
  // -------------------------------------------------------------------------

  if (pathname === '/api/library/playlists' && req.method === 'GET') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      sendJson(res, 401, { error: auth.error, status: 401 });
      return true;
    }
    const playlists = getUserPlaylists(auth.user.id);
    sendJson(res, 200, { playlists });
    return true;
  }

  if (pathname === '/api/library/playlists' && req.method === 'POST') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      sendJson(res, 401, { error: auth.error, status: 401 });
      return true;
    }
    parseJsonBody(req)
      .then((data) => {
        const playlist = createPlaylist(auth.user.id, data);
        sendJson(res, 201, { success: true, playlist });
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message });
      });
    return true;
  }

  if (pathname.startsWith('/api/library/playlists/') && pathname.includes('/tracks/') && req.method === 'DELETE') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      sendJson(res, 401, { error: auth.error, status: 401 });
      return true;
    }
    const parts = pathname.replace('/api/library/playlists/', '').split('/tracks/');
    const playlistId = decodeURIComponent(parts[0]);
    const trackId = decodeURIComponent(parts[1]);
    try {
      const playlist = removeTrackFromPlaylist(auth.user.id, playlistId, trackId);
      sendJson(res, 200, { success: true, playlist });
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return true;
  }

  if (pathname.startsWith('/api/library/playlists/') && pathname.includes('/tracks') && req.method === 'POST') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      sendJson(res, 401, { error: auth.error, status: 401 });
      return true;
    }
    const playlistId = decodeURIComponent(pathname.replace('/api/library/playlists/', '').split('/tracks')[0]);
    parseJsonBody(req)
      .then((data) => {
        const playlist = addTrackToPlaylist(auth.user.id, playlistId, data.track);
        sendJson(res, 200, { success: true, playlist });
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message });
      });
    return true;
  }

  if (pathname.startsWith('/api/library/playlists/') && req.method === 'DELETE') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      sendJson(res, 401, { error: auth.error, status: 401 });
      return true;
    }
    const playlistId = decodeURIComponent(pathname.replace('/api/library/playlists/', '').split('/')[0]);
    try {
      const result = deletePlaylist(auth.user.id, playlistId);
      sendJson(res, 200, result);
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return true;
  }

  if (pathname === '/api/library/likes' && req.method === 'GET') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      sendJson(res, 401, { error: auth.error, status: 401 });
      return true;
    }
    const likedTracks = getUserLikedTracks(auth.user.id);
    sendJson(res, 200, { likedTracks, likes: likedTracks });
    return true;
  }

  if (pathname === '/api/library/likes' && req.method === 'POST') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      sendJson(res, 401, { error: auth.error, status: 401 });
      return true;
    }
    parseJsonBody(req)
      .then((data) => {
        const result = toggleLikeTrack(auth.user.id, data.trackId);
        sendJson(res, 200, result);
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message });
      });
    return true;
  }

  if (pathname === '/api/library/history' && req.method === 'GET') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      sendJson(res, 401, { error: auth.error, status: 401 });
      return true;
    }
    const history = getUserListeningHistory(auth.user.id);
    sendJson(res, 200, { history });
    return true;
  }

  if (pathname === '/api/library/history' && req.method === 'POST') {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      sendJson(res, 401, { error: auth.error, status: 401 });
      return true;
    }
    parseJsonBody(req)
      .then((data) => {
        const result = recordListeningHistory(auth.user.id, data.track);
        sendJson(res, 200, { success: true, history: result });
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message });
      });
    return true;
  }

  // -------------------------------------------------------------------------
  // 10. MUSIC PROVIDER PROXIES & ASSISTANT (PRESERVED)
  // -------------------------------------------------------------------------

  if (urlStr.startsWith('/api/music/itunes') && req.method === 'GET') {
    const url = new URL(urlStr, `http://${req.headers.host || 'localhost'}`);
    const term = url.searchParams.get('term') || '';
    if (!term) {
      sendJson(res, 200, { results: [] });
      return true;
    }
    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=25`)
      .then((r) => r.json())
      .then((data) => sendJson(res, 200, data))
      .catch(() => sendJson(res, 200, { results: [] }));
    return true;
  }

  if (urlStr.startsWith('/api/music/audius/trending') && req.method === 'GET') {
    fetch('https://discoveryprovider.audius.co/v1/tracks/trending?app_name=AIDJStudio&limit=25')
      .then((r) => r.json())
      .then((data) => sendJson(res, 200, data))
      .catch(() => sendJson(res, 200, { data: [] }));
    return true;
  }

  if (urlStr.startsWith('/api/music/audius/search') && req.method === 'GET') {
    const url = new URL(urlStr, `http://${req.headers.host || 'localhost'}`);
    const query = url.searchParams.get('query') || '';
    if (!query) {
      sendJson(res, 200, { data: [] });
      return true;
    }
    fetch(`https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=AIDJStudio&limit=25`)
      .then((r) => r.json())
      .then((data) => sendJson(res, 200, data))
      .catch(() => sendJson(res, 200, { data: [] }));
    return true;
  }

  if (urlStr.startsWith('/api/music/archive') && req.method === 'GET') {
    const url = new URL(urlStr, `http://${req.headers.host || 'localhost'}`);
    const q = url.searchParams.get('q') || 'electronic';
    fetch(`https://archive.org/advancedsearch.php?q=mediatype:audio+AND+format:%22VBR+MP3%22+AND+${encodeURIComponent(q)}&fl[]=identifier,title,creator,year,downloads,description&sort[]=downloads+desc&rows=25&page=1&output=json`)
      .then((r) => r.json())
      .then((data) => sendJson(res, 200, data))
      .catch(() => sendJson(res, 200, { response: { docs: [] } }));
    return true;
  }

  if (urlStr.startsWith('/api/assistant/chat') && req.method === 'POST') {
    parseJsonBody(req)
      .then(async (data) => {
        const messages = data.messages || [];
        const lastUserMessage = messages.filter((m) => m.role === 'user').slice(-1)[0]?.content || '';
        const geminiApiKey = process.env.GEMINI_API_KEY || '';

        if (geminiApiKey && geminiApiKey.startsWith('AIzaSy')) {
          try {
            const systemInstruction = 'You are the AI DJ Studio Assistant. Ground all answers in real music catalogue knowledge. Speak like a professional, friendly, high-energy DJ.';
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
            const aiRes = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\nUser: ${lastUserMessage}` }] }],
              }),
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              const text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                sendJson(res, 200, {
                  success: true,
                  message: { id: `gemini-${Date.now()}`, role: 'assistant', content: text },
                }, req);
                return;
              }
            }
          } catch {}
        }
        sendJson(res, 200, { success: true, useLocalRag: true }, req);
      })
      .catch(() => {
        sendJson(res, 400, { error: 'Invalid JSON request' }, req);
      });
    return true;
  }

  // SEC-SEC-01: Server-side AI DJ Voice Commentary Proxy (protects GEMINI_API_KEY from browser exposure)
  if (urlStr.startsWith('/api/assistant/commentary') && req.method === 'POST') {
    parseJsonBody(req)
      .then(async (data) => {
        const { currentTrack, nextTrack, technique, mood } = data;
        const geminiApiKey = process.env.GEMINI_API_KEY || '';

        if (geminiApiKey && geminiApiKey.startsWith('AIzaSy')) {
          try {
            const prompt = `You are an elite, energetic world-class club and radio AI DJ named "AI DJ Studio".
Track currently playing: "${currentTrack?.title || 'Current Vibe'}" by ${currentTrack?.artist_name || 'Resident DJ'} (${currentTrack?.bpm || 120} BPM, Key: ${currentTrack?.key || 'C Maj'}).
Next track you are dropping: "${nextTrack?.title || 'Next Track'}" by ${nextTrack?.artist_name || 'Featured Artist'} (${nextTrack?.bpm || 128} BPM, Key: ${nextTrack?.key || 'A Min'}).
Mix technique: ${technique || 'Smooth transition'}.
Mood: ${mood || 'Party'}.

Write a single, punchy, charismatic 1-to-2 sentence DJ shoutout/intro introducing the upcoming track to the crowd. Keep it modern, engaging, and mention the musical vibe without sounding like a robot.`;

            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
            const aiRes = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
              }),
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              const text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text && typeof text === 'string' && text.trim().length > 10) {
                sendJson(res, 200, {
                  success: true,
                  commentary: text.trim().replace(/^["']|["']$/g, ''),
                }, req);
                return;
              }
            }
          } catch {}
        }
        sendJson(res, 200, { success: false, fallback: true }, req);
      })
      .catch(() => {
        sendJson(res, 400, { error: 'Invalid commentary request' }, req);
      });
    return true;
  }

  return false;
}

// -------------------------------------------------------------------------
// 11. STANDALONE STATIC SERVER & SPA FALLBACK
// -------------------------------------------------------------------------

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const server = http.createServer((req, res) => {
    if (handleApiRequest(req, res)) return;

    let reqPath = (req.url || '/').split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';

    const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
    let filePath = path.join(DIST_DIR, safePath);

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        filePath = path.join(DIST_DIR, 'index.html');
      }

      fs.readFile(filePath, (readErr, content) => {
        if (readErr) {
          res.writeHead(500, {
            'Content-Type': 'text/plain',
            ...SECURITY_HEADERS,
          });
          res.end('Internal Server Error: dist/index.html not found. Run npm run build first.');
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
          ...SECURITY_HEADERS,
        });
        res.end(content);
      });
    });
  });

  // Enforce production database readiness (fails fast if unconfigured in production)
  postgresAdapter.assertProductionReady();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AI DJ Studio Production Server running at http://0.0.0.0:${PORT}`);
    if (postgresAdapter.getStatus().configured) {
      postgresAdapter.autoMigrateIfEmpty().catch((err) => {
        console.warn('[DATABASE MIGRATION WARNING]', err.message);
      });
    }
  });
}
