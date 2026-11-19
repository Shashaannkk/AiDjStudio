import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

/**
 * Server API Plugin
 * Uses the exact same battle-tested backend API router from server.mjs
 * across Vite dev server and Vite preview server.
 */
function serverApiPlugin(): Plugin {
  return {
    name: 'server-api-middleware',
    async configureServer(server) {
      // @ts-expect-error server.mjs is an ES module
      const { handleApiRequest } = await import('./server.mjs');
      server.middlewares.use(async (req, res, next) => {
        try {
          if (await handleApiRequest(req, res)) return;
        } catch (e) {
          console.error('[API MIDDLEWARE ERROR]', e);
        }
        next();
      });
    },
    async configurePreviewServer(server) {
      // @ts-expect-error server.mjs is an ES module
      const { handleApiRequest } = await import('./server.mjs');
      server.middlewares.use(async (req, res, next) => {
        try {
          if (await handleApiRequest(req, res)) return;
        } catch (e) {
          console.error('[API MIDDLEWARE ERROR]', e);
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serverApiPlugin()],
  envPrefix: ['VITE_', 'NEXT_PUBLIC_', 'SUPABASE_'],
});
