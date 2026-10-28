import { defineConfig, loadEnv } from 'vite';
import { createApi } from './server/api.js';

export function providerEnv(mode, cwd = process.cwd()) {
  // Vite's loadEnv preserves existing process variables. For local development,
  // prefer the project's .env.local key over a different key inherited from the shell.
  const inheritedQwenKey = process.env.DASHSCOPE_API_KEY;
  let localEnv;
  try {
    delete process.env.DASHSCOPE_API_KEY;
    localEnv = loadEnv(mode, cwd, '');
  } finally {
    if (inheritedQwenKey === undefined) delete process.env.DASHSCOPE_API_KEY;
    else process.env.DASHSCOPE_API_KEY = inheritedQwenKey;
  }
  return { ...process.env, ...localEnv };
}

export default defineConfig(({ mode }) => {
  const env = providerEnv(mode);
  const middleware = createApi(env);
  return { plugins: [{ name: 'local-provider-api',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  }] };
});
