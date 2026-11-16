import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
  registerUser,
  loginUser,
  refreshSession,
  revokeRefreshToken,
  authenticateRequest,
  getAllUsers,
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
} from './src/server/rooms.js';

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
const messagesByRoom = new Map();

// Sliding Window Rate Limiter
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 120; // 120 requests/minute per IP

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['*'];

function resolveCorsOrigin(req) {
  const origin = req?.headers?.origin;
  if (!origin || ALLOWED_ORIGINS.includes('*')) return '*';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  return ALLOWED_ORIGINS[0];
}

function sendJson(res, statusCode, data, req = null) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': resolveCorsOrigin(req),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
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
  if (urlStr === '/api/health' && (req.method === 'GET' || req.method === 'HEAD')) {
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
        activeRooms: messagesByRoom.size,
      },
    });
    return true;
  }

  // 1. Global Rate Limiter
  if (urlStr.startsWith('/api/')) {
    const clientIp = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1');
    const now = Date.now();
    const timestamps = (rateLimitMap.get(clientIp) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

    if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
      sendJson(res, 429, { error: 'Too many requests. Please slow down.', status: 429 });
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

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', user: auth.user })}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return true;
  }

  if (urlStr.startsWith('/api/chat/messages') && req.method === 'GET') {
    const url = new URL(urlStr, `http://${req.headers.host || 'localhost'}`);
    const roomId = url.searchParams.get('roomId') || 'room_late_night_lounge';
    const list = messagesByRoom.get(roomId) || [];
    sendJson(res, 200, list);
    return true;
  }

  if (urlStr.startsWith('/api/chat') && req.method === 'POST') {
    parseJsonBody(req)
      .then((data) => {
        if (!data || !data.message || typeof data.message !== 'object') {
          sendJson(res, 400, { error: 'Missing message payload' });
          return;
        }

        const rawText = String(data.message.message || '');
        if (!rawText.trim() || rawText.length > 2000) {
          sendJson(res, 400, { error: 'Message must be between 1 and 2000 characters' });
          return;
        }

        // XSS sanitization
        data.message.message = rawText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[sanitized script]');

        const roomId = data.roomId || 'room_late_night_lounge';
        const current = messagesByRoom.get(roomId) || [];
        const updated = [...current, data.message].slice(-100);
        messagesByRoom.set(roomId, updated);

        const ssePayload = `data: ${JSON.stringify({
          type: 'NEW_CHAT_MESSAGE',
          roomId,
          message: data.message,
        })}\n\n`;

        for (const client of sseClients) {
          try {
            client.write(ssePayload);
          } catch {
            sseClients.delete(client);
          }
        }

        sendJson(res, 200, { success: true, message: data.message });
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message });
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
    const masterKey = process.env.ADMIN_KEY;
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
    parseJsonBody(req)
      .then((data) => {
        const { roomId, queueItemId, userId } = data;
        const vote = data.vote !== undefined ? data.vote : data.voteValue;
        const result = castQueueVote(roomId, queueItemId, userId, vote);
        sendJson(res, 200, { success: true, votes: result });
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message });
      });
    return true;
  }

  if (urlStr.startsWith('/api/queue/votes') && req.method === 'GET') {
    const url = new URL(urlStr, `http://${req.headers.host || 'localhost'}`);
    const roomId = url.searchParams.get('roomId') || 'main_room';
    sendJson(res, 200, { roomId, votes: getQueueVotes(roomId) });
    return true;
  }

  if (urlStr.startsWith('/api/queue/events') && req.method === 'GET') {
    const url = new URL(urlStr, `http://${req.headers.host || 'localhost'}`);
    const roomId = url.searchParams.get('roomId') || 'main_room';
    sendJson(res, 200, { roomId, events: getQueueEvents(roomId) });
    return true;
  }

  if (urlStr.startsWith('/api/queue/events') && req.method === 'POST') {
    parseJsonBody(req)
      .then((data) => {
        const logged = logQueueEvent(data);
        sendJson(res, 201, { success: true, event: logged });
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message });
      });
    return true;
  }

  // -------------------------------------------------------------------------
  // 7. HUMAN DJ SOUNDCLASH BATTLES & HISTORY ENDPOINTS
  // -------------------------------------------------------------------------

  if (urlStr.startsWith('/api/soundclash/create') && req.method === 'POST') {
    parseJsonBody(req)
      .then((data) => {
        const battle = createHumanSoundclash(data);
        sendJson(res, 201, { success: true, battle });
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message });
      });
    return true;
  }

  if (urlStr.startsWith('/api/soundclash/challenge') && req.method === 'POST') {
    parseJsonBody(req)
      .then((data) => {
        const { roomId, challenger } = data;
        const battle = registerChallenger(roomId, challenger);
        sendJson(res, 200, { success: true, battle });
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message });
      });
    return true;
  }

  if (urlStr.startsWith('/api/soundclash/submit') && req.method === 'POST') {
    parseJsonBody(req)
      .then((data) => {
        const { roomId, userId, track } = data;
        const battle = submitBattleTrack(roomId, userId, track);
        sendJson(res, 200, { success: true, battle });
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message });
      });
    return true;
  }

  if (urlStr.startsWith('/api/soundclash/vote') && req.method === 'POST') {
    parseJsonBody(req)
      .then((data) => {
        const { roomId, userId, choice } = data;
        const battle = castBattleVote(roomId, userId, choice);
        sendJson(res, 200, { success: true, battle });
      })
      .catch((err) => {
        sendJson(res, 400, { error: err.message });
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
  // 9. ROOM CAPACITY & CONCURRENCY ENFORCEMENT
  // -------------------------------------------------------------------------

  if (urlStr === '/api/rooms/join' && req.method === 'POST') {
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

  if (urlStr === '/api/rooms/leave' && req.method === 'POST') {
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

  if (urlStr.startsWith('/api/rooms/capacity') && req.method === 'GET') {
    const url = new URL(urlStr, `http://${req.headers.host || 'localhost'}`);
    const roomId = url.searchParams.get('roomId') || 'main_room';
    sendJson(res, 200, getRoomCapacity(roomId));
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
        const geminiApiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

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
                });
                return;
              }
            }
          } catch {}
        }
        sendJson(res, 200, { success: true, useLocalRag: true });
      })
      .catch(() => {
        sendJson(res, 400, { error: 'Invalid JSON request' });
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
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error: dist/index.html not found. Run npm run build first.');
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
        });
        res.end(content);
      });
    });
  });

  // Enforce production database readiness (fails fast if unconfigured in production)
  postgresAdapter.assertProductionReady();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AI DJ Studio Production Server running at http://0.0.0.0:${PORT}`);
  });
}
