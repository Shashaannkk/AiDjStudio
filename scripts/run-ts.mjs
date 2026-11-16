import { createServer } from 'vite';

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
});

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/run-ts.mjs <script-path>');
  process.exit(1);
}

try {
  await server.ssrLoadModule(file);
} catch (err) {
  console.error('Error running test script:', err);
  process.exit(1);
} finally {
  await server.close();
}
