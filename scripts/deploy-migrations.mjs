import { postgresAdapter } from '../src/server/db.js';

console.log('========================================================================');
console.log('AI DJ STUDIO — AUTOMATED DATABASE MIGRATION RUNNER');
console.log('========================================================================\n');

async function runDeployMigrations() {
  const config = postgresAdapter.publicInit();

  if (!config.isConfigured) {
    console.warn('[MIGRATION SKIPPED] No remote PostgreSQL or Supabase credentials detected in environment.');
    console.warn('Set DATABASE_URL or VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to run live migrations.');
    console.log('[LOCAL PERSISTENCE] Crash-resilient atomic storage is active.');
    return { status: 'skipped', reason: 'unconfigured' };
  }

  console.log(`Connecting to ${config.provider}...`);
  const ping = await postgresAdapter.ping();

  if (!ping.connected) {
    console.error(`[MIGRATION FAILED] Could not connect to database: ${ping.error || ping.reason}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return { status: 'failed', error: ping.error };
  }

  console.log(`✓ Connected successfully. Round-trip latency: ${ping.latencyMs}ms`);

  console.log('Checking database table population & running auto-migration...');
  const result = await postgresAdapter.autoMigrateIfEmpty();
  console.log('Migration Result:', result);

  return { status: 'success', latencyMs: ping.latencyMs, result };
}

runDeployMigrations().then((res) => {
  console.log('\nMigration execution completed with status:', res.status);
});
