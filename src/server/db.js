import fs from 'node:fs';
import path from 'node:path';
import { postgresAdapter, PostgresAdapter } from './postgresAdapter.js';

export { postgresAdapter, PostgresAdapter };

/**
 * Ensures all required runtime data files exist with safe empty schemas.
 * Prevents ENOENT crashes on fresh repository clones without committing runtime state to git.
 */
export function ensureRuntimeFilesExist() {
  const dir = path.resolve('data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const runtimeFiles = [
    { name: 'users.json', defaultContent: [] },
    { name: 'refresh_tokens.json', defaultContent: {} },
    { name: 'sessions.json', defaultContent: [] },
    { name: 'session_events.json', defaultContent: [] },
    { name: 'queue_votes.json', defaultContent: {} },
    { name: 'queue_events.json', defaultContent: {} },
    { name: 'soundclash_battles.json', defaultContent: {} },
    { name: 'soundclash_history.json', defaultContent: [] },
    { name: 'rooms.json', defaultContent: [] },
    { name: 'playlists.json', defaultContent: [] },
    { name: 'liked_tracks.json', defaultContent: {} },
    { name: 'listening_history.json', defaultContent: {} },
    { name: 'room_messages.json', defaultContent: {} },
  ];

  for (const { name, defaultContent } of runtimeFiles) {
    const fullPath = path.join(dir, name);
    if (!fs.existsSync(fullPath)) {
      atomicWriteJsonSync(fullPath, defaultContent);
    }
  }
}

// Automatically ensure runtime files are initialized on import
ensureRuntimeFilesExist();

/**
 * AI DJ Studio — Database & Persistence Management Subsystem (DB-01 Remediation)
 * 
 * Provides:
 * 1. Atomic, crash-resilient file persistence with cross-platform rename handling and in-memory mutex queues.
 * 2. Unified database configuration detection (PostgreSQL / Supabase / Atomic JSON).
 * 3. PostgreSQL schema integrity verification against supabase/schema.sql (18 relational tables).
 * 4. Deterministic data migration export from local storage to PostgreSQL INSERT statements.
 */

// Per-file write queue for process-level write serialization
const writeQueues = new Map();

/**
 * Safely writes JSON data to disk atomically.
 * Writes to a temporary sibling file first, then atomically renames it to target.
 * Prevents file truncation and corruption during unexpected process crashes or SIGTERM.
 */
export function atomicWriteJsonSync(filePath, data, spaces = 2) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, spaces);

  try {
    fs.writeFileSync(tmpPath, content, 'utf8');

    // Windows retry logic for rare transient rename locks
    let retries = 5;
    while (retries > 0) {
      try {
        fs.renameSync(tmpPath, filePath);
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        // Small synchronous backoff on Windows
        const waitTill = Date.now() + 15;
        while (Date.now() < waitTill) { /* spin */ }
      }
    }
  } catch (err) {
    // Clean up temporary file if write or rename failed
    if (fs.existsSync(tmpPath)) {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
    throw err;
  }
}

/**
 * Async version of atomic write with in-process FIFO serialization per file.
 */
export async function atomicWriteJson(filePath, data, spaces = 2) {
  let queue = writeQueues.get(filePath);
  if (!queue) {
    queue = Promise.resolve();
    writeQueues.set(filePath, queue);
  }

  const nextWrite = queue.then(async () => {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });

    const tmpPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, spaces);

    try {
      await fs.promises.writeFile(tmpPath, content, 'utf8');
      
      let retries = 5;
      while (retries > 0) {
        try {
          await fs.promises.rename(tmpPath, filePath);
          break;
        } catch (err) {
          retries--;
          if (retries === 0) throw err;
          await new Promise((res) => setTimeout(res, 20));
        }
      }
    } catch (err) {
      if (fs.existsSync(tmpPath)) {
        try { await fs.promises.unlink(tmpPath); } catch {}
      }
      throw err;
    }
  });

  writeQueues.set(filePath, nextWrite);
  return nextWrite;
}

/**
 * Expected 18 relational tables defined in supabase/schema.sql
 */
export const EXPECTED_SCHEMA_TABLES = [
  'profiles',
  'playlists',
  'playlist_tracks',
  'liked_songs',
  'listening_history',
  'rooms',
  'room_members',
  'room_queue',
  'room_messages',
  'reported_content',
  'tracks',
  'acoustic_features',
  'queue_votes',
  'queue_events',
  'soundclash_battles',
  'soundclash_history',
  'sessions',
  'session_events',
];

/**
 * Checks if live PostgreSQL / Supabase credentials are configured in the environment.
 */
export function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)?.trim();
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)?.trim();

  const isPostgresConfigured = Boolean(
    databaseUrl &&
    !databaseUrl.includes('placeholder') &&
    databaseUrl.startsWith('postgres')
  );

  const isSupabaseConfigured = Boolean(
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project.supabase.co') &&
    supabaseKey.length > 20
  );

  return {
    isConfigured: isPostgresConfigured || isSupabaseConfigured,
    provider: isPostgresConfigured ? 'postgresql' : isSupabaseConfigured ? 'supabase' : 'local_json',
    databaseUrl: isPostgresConfigured ? databaseUrl.replace(/:[^:@]+@/, ':****@') : undefined,
    supabaseUrl: isSupabaseConfigured ? supabaseUrl : undefined,
    requiresLiveVerification: true,
  };
}

/**
 * Validates supabase/schema.sql against expected tables and constraints.
 */
export function validateSchemaDefinitions(schemaPath = path.resolve('supabase', 'schema.sql')) {
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at: ${schemaPath}`);
  }

  const sqlContent = fs.readFileSync(schemaPath, 'utf8');
  const missingTables = [];
  const foundTables = [];

  for (const table of EXPECTED_SCHEMA_TABLES) {
    const tableRegex = new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:public\\.)?${table}\\b`, 'i');
    if (tableRegex.test(sqlContent)) {
      foundTables.push(table);
    } else {
      missingTables.push(table);
    }
  }

  const hasCapacityTrigger = /check_room_capacity/i.test(sqlContent);
  const hasRlsPolicies = /ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(sqlContent);
  const hasRealtimePub = /ALTER\s+PUBLICATION\s+supabase_realtime/i.test(sqlContent);

  return {
    isValid: missingTables.length === 0 && hasCapacityTrigger && hasRlsPolicies,
    totalExpected: EXPECTED_SCHEMA_TABLES.length,
    foundTables,
    missingTables,
    hasCapacityTrigger,
    hasRlsPolicies,
    hasRealtimePub,
  };
}

/**
 * Generates initial SQL migration INSERT statements from local JSON data files.
 */
export function generateMigrationSql(dataDir = path.resolve('data')) {
  const statements = ['-- AI DJ STUDIO MIGRATION DATA EXPORT', 'BEGIN;'];

  // Migrate users to profiles
  const usersPath = path.join(dataDir, 'users.json');
  if (fs.existsSync(usersPath)) {
    try {
      const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
      for (const u of users) {
        const id = u.id?.replace(/'/g, "''");
        const email = u.email?.replace(/'/g, "''");
        const name = (u.name || u.display_name || 'DJ').replace(/'/g, "''");
        const role = ['listener', 'co-dj', 'host', 'admin'].includes(u.role) ? u.role : 'listener';
        statements.push(
          `INSERT INTO public.profiles (id, email, display_name, role) VALUES ('${id}', '${email}', '${name}', '${role}') ON CONFLICT (id) DO NOTHING;`
        );
      }
    } catch {}
  }

  // Migrate tracks
  const tracksPath = path.join(dataDir, 'tracks.json');
  if (fs.existsSync(tracksPath)) {
    try {
      const tracks = JSON.parse(fs.readFileSync(tracksPath, 'utf8'));
      for (const t of tracks) {
        const id = t.id?.replace(/'/g, "''");
        const title = (t.title || 'Untitled').replace(/'/g, "''");
        const artist = (t.artist_name || 'Unknown').replace(/'/g, "''");
        const album = (t.album_name || '').replace(/'/g, "''");
        const duration = Number(t.duration) || 180;
        const bpm = Number(t.bpm) || 120;
        const key = (t.key || '8A').replace(/'/g, "''");
        const energy = Number(t.energy) || 75;
        const genre = (t.genre || 'Electronic').replace(/'/g, "''");
        const audio = (t.audio || t.audioUrl || '').replace(/'/g, "''");
        const image = (t.image || t.imageUrl || '').replace(/'/g, "''");
        const provider = (t.provider || 'catalog').replace(/'/g, "''");

        statements.push(
          `INSERT INTO public.tracks (id, title, artist_name, album_name, duration_sec, bpm, musical_key, energy, genre, audio_url, image_url, provider) VALUES ('${id}', '${title}', '${artist}', '${album}', ${duration}, ${bpm}, '${key}', ${energy}, '${genre}', '${audio}', '${image}', '${provider}') ON CONFLICT (id) DO NOTHING;`
        );
      }
    } catch {}
  }

  statements.push('COMMIT;');
  return statements.join('\n');
}
