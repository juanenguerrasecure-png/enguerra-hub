import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { createApiRouter } from './server/routes/api';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for JSON & URL-encoded payloads with 50MB allowance for family media
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Mount central API routes
  app.use('/api', createApiRouter());

  // Mount Vite or static assets depending on environment
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Server] Vite middleware mounted for development mode');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[Server] Static dist files mounted for production mode');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Enguerra of NY application listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Server] Failed to start Enguerra server:', err);
  process.exit(1);
});
