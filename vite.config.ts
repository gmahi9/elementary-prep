import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

function questionApi() {
  return {
    name: 'question-api',
    configureServer(server: { middlewares: { use: (handler: (req: { url?: string }, res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void }, next: () => void) => void) => void } }) {
      let questions: unknown[] | null = null;
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api/grades') && !url.startsWith('/api/sections') && !url.startsWith('/api/questions')) {
          next();
          return;
        }
        const [{ handleMemoryGrades, handleMemoryQuestions, handleMemorySections }, seeds] = await Promise.all([
          import('./src/server/catalog.ts'),
          import('./scripts/lib/load-seeds.mjs'),
        ]);
        if (!questions) questions = seeds.loadSeedQuestions();
        const request = new Request(`http://127.0.0.1${url}`);
        const response = url.startsWith('/api/grades')
          ? handleMemoryGrades(questions as never)
          : url.startsWith('/api/sections')
            ? handleMemorySections(questions as never, request)
            : handleMemoryQuestions(questions as never, request);
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(await response.text());
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), questionApi()],
  build: {
    chunkSizeWarningLimit: 1600,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
