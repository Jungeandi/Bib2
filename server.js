require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 5173;

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
  // Proxy for Anthropic API to avoid exposing the API key in the browser
  if (req.method === 'POST' && req.url === '/api/anthropic') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const key = process.env.ANTHROPIC_API_KEY;
        if (!key) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Server missing ANTHROPIC_API_KEY' }));
          return;
        }
        const https = require('https');
        const options = {
          hostname: 'api.anthropic.com',
          path: '/v1/messages',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'Content-Length': Buffer.byteLength(body)
          }
        };

        const upstreamResp = await new Promise((resolve, reject) => {
          const reqUp = https.request(options, upRes => {
            let data = '';
            upRes.on('data', d => data += d);
            upRes.on('end', () => resolve({ statusCode: upRes.statusCode, headers: upRes.headers, body: data }));
          });
          reqUp.on('error', reject);
          reqUp.write(body);
          reqUp.end();
        });

        if ((upstreamResp.statusCode || 0) >= 400) {
          console.error(`[anthropic-proxy] upstream ${upstreamResp.statusCode} body:\n${upstreamResp.body.slice(0,4000)}`);
        }
        res.writeHead(upstreamResp.statusCode || 502, { 'Content-Type': (upstreamResp.headers && upstreamResp.headers['content-type']) || 'application/json' });
        res.end(upstreamResp.body);
      } catch (e) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Simple proxy for RVK API to avoid CORS and HTML error pages reaching the client
  if (req.method === 'GET' && req.url.startsWith('/api/rvk/')) {
    const https = require('https');
    const targetPath = req.url.replace('/api/rvk/', '/api/json/');
    const options = {
      hostname: 'rvk.uni-regensburg.de',
      path: targetPath,
      method: 'GET',
      // allow any response type; RVK may reject strict application/json Accept
      headers: { 'Accept': '*/*', 'User-Agent': 'RVK-Proxy/1.0' }
    };

    console.log(`[proxy] GET https://${options.hostname}${options.path}`);

    const proxied = https.request(options, upRes => {
      let data = '';
      upRes.on('data', d => data += d);
      upRes.on('end', () => {
        // log non-OK responses to help debugging
        if ((upRes.statusCode || 0) >= 400) {
          console.error(`[proxy] upstream ${upRes.statusCode} response body:\n${data.slice(0,2000)}`);
        }
        // forward status and content-type
        res.writeHead(upRes.statusCode || 200, { 'Content-Type': upRes.headers['content-type'] || 'application/json' });
        res.end(data);
      });
    });
    proxied.on('error', e => {
      console.error('[proxy] error', e.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    });
    proxied.end();
    return;
  }

  // Serve static files. Prefer index3.html if it exists (user pasted an older copy).
  let defaultIndex = fs.existsSync(path.join(__dirname, 'index3.html')) ? '/index3.html' : '/index.html';
  let filePath = path.join(__dirname, req.url === '/' ? defaultIndex : req.url);
  if (!path.extname(filePath)) filePath += '.html';
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(content);
  });
}).listen(port, () => console.log(`Static server running on http://localhost:${port}`));

require('dotenv').config();
