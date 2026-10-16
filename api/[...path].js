import { createApi } from '../server/api.js';

const middleware = createApi(process.env);

export default async function handler(req, res) {
  // Vercel may have parsed JSON before invoking the Node.js handler.
  // The shared API accepts the native stream in development or a parsed body here.
  return middleware(req, res, () => {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: '接口不存在' }));
  });
}
