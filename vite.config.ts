import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * Real-Time Multi-Browser & Incognito Chat Server Middleware
 * Handles Server-Sent Events (SSE) and message broadcasting across different browsers,
 * incognito tabs, and pages on localhost.
 */
function realTimeChatPlugin(): Plugin {
  const sseClients = new Set<ServerResponse>();
  const messagesByRoom = new Map<string, any[]>();

  return {
    name: 'realtime-chat-server',
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next) => {
        const urlStr = req.url || '';

        // 1. Server-Sent Events live stream
        if (urlStr.startsWith('/api/chat/stream')) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          });
          res.write(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`);
          sseClients.add(res);

          req.on('close', () => {
            sseClients.delete(res);
          });
          return;
        }

        // 2. Fetch recent room messages
        if (urlStr.startsWith('/api/chat/messages') && req.method === 'GET') {
          const url = new URL(urlStr, `http://${req.headers.host || 'localhost'}`);
          const roomId = url.searchParams.get('roomId') || 'room_late_night_lounge';
          const list = messagesByRoom.get(roomId) || [];
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify(list));
          return;
        }

        // 3. Post a new chat message
        if (urlStr.startsWith('/api/chat') && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const roomId = data.roomId || 'room_late_night_lounge';
              const current = messagesByRoom.get(roomId) || [];
              const updated = [...current, data.message].slice(-100);
              messagesByRoom.set(roomId, updated);

              // Broadcast to all SSE subscribers across ANY browser/incognito
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

              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(JSON.stringify({ success: true, message: data.message }));
            } catch {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid JSON body' }));
            }
          });
          return;
        }

        // 4. iTunes & Apple Music live song search endpoint
        if (urlStr.startsWith('/api/music/itunes') && req.method === 'GET') {
          const url = new URL(urlStr, `http://${req.headers.host || 'localhost'}`);
          const term = url.searchParams.get('term') || '';
          if (!term) {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ results: [] }));
            return;
          }

          fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=25`)
            .then((r) => r.json())
            .then((data) => {
              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(JSON.stringify(data));
            })
            .catch(() => {
              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(JSON.stringify({ results: [] }));
            });
          return;
        }

        // 5. Audius live trending tracks endpoint
        if (urlStr.startsWith('/api/music/audius/trending') && req.method === 'GET') {
          fetch('https://discoveryprovider.audius.co/v1/tracks/trending?app_name=AIDJStudio&limit=25')
            .then((r) => r.json())
            .then((data) => {
              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(JSON.stringify(data));
            })
            .catch(() => {
              res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ data: [] }));
            });
          return;
        }

        // 6. Audius live track search endpoint
        if (urlStr.startsWith('/api/music/audius/search') && req.method === 'GET') {
          const url = new URL(urlStr, `http://${req.headers.host || 'localhost'}`);
          const query = url.searchParams.get('query') || '';
          if (!query) {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ data: [] }));
            return;
          }
          fetch(`https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=AIDJStudio&limit=25`)
            .then((r) => r.json())
            .then((data) => {
              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(JSON.stringify(data));
            })
            .catch(() => {
              res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ data: [] }));
            });
          return;
        }

        // 7. Internet Archive audio search endpoint
        if (urlStr.startsWith('/api/music/archive') && req.method === 'GET') {
          const url = new URL(urlStr, `http://${req.headers.host || 'localhost'}`);
          const q = url.searchParams.get('q') || 'electronic';
          fetch(`https://archive.org/advancedsearch.php?q=mediatype:audio+AND+format:%22VBR+MP3%22+AND+${encodeURIComponent(q)}&fl[]=identifier,title,creator,year,downloads,description&sort[]=downloads+desc&rows=25&page=1&output=json`)
            .then((r) => r.json())
            .then((data) => {
              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(JSON.stringify(data));
            })
            .catch(() => {
              res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ response: { docs: [] } }));
            });
          return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), realTimeChatPlugin()],
})
