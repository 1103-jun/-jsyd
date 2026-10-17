import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApi } from './server/api.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

// 项目内 .env / .env.local 优先于系统环境变量，避免机器上遗留的同名变量覆盖本项目密钥
const env = {
  ...process.env,
  ...loadDotEnv(path.join(root, '.env')),
  ...loadDotEnv(path.join(root, '.env.local')),
};

const api = createApi(env);
const publicHost = env.PUBLIC_ORIGIN ? new URL(env.PUBLIC_ORIGIN).host : null;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.mp3': 'audio/mpeg',
};

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

async function sendFile(res, filePath, status = 200) {
  const data = await fsp.readFile(filePath);
  res.statusCode = status;
  res.setHeader('Content-Type', MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
  res.setHeader('Cache-Control', path.basename(filePath).includes('.') && filePath.includes('assets')
    ? 'public, max-age=31536000, immutable'
    : 'no-cache');
  securityHeaders(res);
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  securityHeaders(res);

  if (pathname.startsWith('/api/')) {
    // 反向代理场景下 host 与公网域名不一致时，校正后再做同源校验，避免误判
    if (req.headers.origin) {
      try {
        const originHost = new URL(req.headers.origin).host;
        const forwarded = (req.headers['x-forwarded-host'] || '').split(',')[0].trim();
        const allowed = new Set([req.headers.host, forwarded, publicHost].filter(Boolean));
        if (allowed.has(originHost)) req.headers.host = originHost;
      } catch {}
    }
    return api(req, res, () => {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: '接口不存在' }));
    });
  }

  const target = path.normalize(path.join(dist, pathname));
  if (!target.startsWith(dist)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }
  try {
    const stat = await fsp.stat(target);
    if (stat.isFile()) return sendFile(res, target);
  } catch {}
  try {
    return await sendFile(res, path.join(dist, 'index.html'), 200);
  } catch {
    res.statusCode = 500;
    res.end('dist 不存在，请先执行 npm run build');
  }
});

server.listen(port, host, () => {
  console.log(`吉时已到 running at http://${host}:${port}  (PORT=${port})`);
});
