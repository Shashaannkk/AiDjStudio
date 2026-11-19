import { handleApiRequest } from '../server.mjs';
import { postgresAdapter } from '../src/server/postgresAdapter.js';

let pingedOnce = false;

/**
 * AI DJ Studio — Vercel Serverless Function API Handler
 * 
 * Routes all `/api/*` HTTP requests on Vercel directly through the
 * high-performance standalone API engine from `server.mjs`.
 */
export default async function handler(req, res) {
  try {
    if (!pingedOnce && postgresAdapter.getStatus().configured) {
      pingedOnce = true;
      await postgresAdapter.ping().catch(() => {});
    }

    const handled = handleApiRequest(req, res);
    if (!handled) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'API route not found', status: 404 }));
    }
  } catch (err) {
    console.error('[VERCEL API ERROR]', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal Server Error', message: err.message }));
    }
  }
}
