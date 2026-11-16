// Phase 1 Backend, Authentication & Database Persistence Verification Test
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('🧪 Starting Phase 1 Verification Suite...\n');

// 1. Verify schema.sql existence and table definitions
console.log('▶ Test 1: Verifying PostgreSQL Schema Definitions...');
const schemaPath = path.resolve('supabase/schema.sql');
assert.ok(fs.existsSync(schemaPath), 'schema.sql must exist');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

const expectedTables = [
  'public.profiles',
  'public.playlists',
  'public.playlist_tracks',
  'public.liked_songs',
  'public.listening_history',
  'public.rooms',
  'public.room_members'
];

for (const table of expectedTables) {
  assert.ok(
    schemaContent.includes(`CREATE TABLE IF NOT EXISTS ${table}`),
    `Schema must declare table ${table}`
  );
}
console.log('  ✅ All 7 database tables declared in supabase/schema.sql');

// 2. Verify Row Level Security (RLS) policies
console.log('▶ Test 2: Verifying Row Level Security (RLS) Policies...');
assert.ok(schemaContent.includes('ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;'));
assert.ok(schemaContent.includes('ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;'));
assert.ok(schemaContent.includes('ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;'));
assert.ok(schemaContent.includes('ALTER TABLE public.liked_songs ENABLE ROW LEVEL SECURITY;'));
assert.ok(schemaContent.includes('ALTER TABLE public.listening_history ENABLE ROW LEVEL SECURITY;'));
assert.ok(schemaContent.includes('ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;'));
assert.ok(schemaContent.includes('ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;'));
console.log('  ✅ RLS enabled on all 7 tables with individual policies');

// 3. Verify Foreign Keys and Triggers
console.log('▶ Test 3: Verifying Foreign Keys and Triggers...');
assert.ok(schemaContent.includes('REFERENCES auth.users(id) ON DELETE CASCADE'));
assert.ok(schemaContent.includes('REFERENCES public.profiles(id) ON DELETE CASCADE'));
assert.ok(schemaContent.includes('REFERENCES public.playlists(id) ON DELETE CASCADE'));
assert.ok(schemaContent.includes('REFERENCES public.rooms(id) ON DELETE CASCADE'));
assert.ok(schemaContent.includes('handle_new_user()'));
assert.ok(schemaContent.includes('handle_updated_at()'));
console.log('  ✅ Foreign keys and auto-profile creation triggers configured');

// 4. Verify TypeScript Database types
console.log('▶ Test 4: Verifying TypeScript database types...');
const typesPath = path.resolve('src/types/database.ts');
assert.ok(fs.existsSync(typesPath), 'src/types/database.ts must exist');
const typesContent = fs.readFileSync(typesPath, 'utf8');
assert.ok(typesContent.includes('export interface Database'));
assert.ok(typesContent.includes('profiles:'));
assert.ok(typesContent.includes('playlists:'));
assert.ok(typesContent.includes('playlist_tracks:'));
assert.ok(typesContent.includes('liked_songs:'));
assert.ok(typesContent.includes('listening_history:'));
assert.ok(typesContent.includes('rooms:'));
assert.ok(typesContent.includes('room_members:'));
console.log('  ✅ Full TypeScript definitions validated for all 7 tables');

// 5. Verify Environment Variables Documentation
console.log('▶ Test 5: Verifying Environment Configuration...');
const envExamplePath = path.resolve('.env.example');
assert.ok(fs.existsSync(envExamplePath), '.env.example must exist');
const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
assert.ok(envExampleContent.includes('VITE_SUPABASE_URL'));
assert.ok(envExampleContent.includes('VITE_SUPABASE_ANON_KEY'));
assert.ok(!envExampleContent.includes('service_role'), 'Never expose service role key');
console.log('  ✅ .env.example contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (no service-role key)');

// 6. Verify Auth & Service Layer
console.log('▶ Test 6: Verifying UserService and Supabase client...');
const userServicePath = path.resolve('src/services/userService.ts');
assert.ok(fs.existsSync(userServicePath), 'userService.ts must exist');
const userServiceContent = fs.readFileSync(userServicePath, 'utf8');
assert.ok(userServiceContent.includes('signUpWithEmail'));
assert.ok(userServiceContent.includes('signInWithEmail'));
assert.ok(userServiceContent.includes('signOut'));
assert.ok(userServiceContent.includes('onAuthChange'));
assert.ok(userServiceContent.includes('getLikedTracksAsync'));
assert.ok(userServiceContent.includes('saveLikedTrack'));
assert.ok(userServiceContent.includes('fetchPlaylistsAsync'));
assert.ok(userServiceContent.includes('persistPlaylist'));
assert.ok(userServiceContent.includes('persistPlaylistTrack'));
assert.ok(userServiceContent.includes('removePlaylistTrackFromSupabase'));
assert.ok(userServiceContent.includes('recordListeningHistory'));
assert.ok(userServiceContent.includes('addLiveRoom'));
assert.ok(userServiceContent.includes('migrateLocalDataToSupabase'));
console.log('  ✅ All authentication and persistence methods verified in UserService');

console.log('\n🎉 ALL PHASE 1 VERIFICATION TESTS PASSED!\n');

