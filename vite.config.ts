import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
// @ts-expect-error server.mjs is an ES module
import { handleApiRequest } from './server.mjs';

/**
 * Server API Plugin
 * Uses the exact same battle-tested backend API router from server.mjs
 * across Vite dev server and Vite preview server.
 */
function serverApiPlugin(): Plugin {
  return {
    name: 'server-api-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (handleApiRequest(req, res)) return;
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (handleApiRequest(req, res)) return;
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serverApiPlugin()],
});
