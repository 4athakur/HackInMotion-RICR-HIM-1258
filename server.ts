import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';

import { requireAuth } from './src/middleware/auth.ts';
import apiRouter from './src/routes/index.ts';

const PORT = 3000;

async function startServer() {
  const app = express();
  
  app.use(cors());
  app.use(express.json());

  // API Routes
  app.use('/api', requireAuth, apiRouter);
  
  // Healthcheck (no auth required)
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Support React Router HTML fallback
    // Express 5.x uses *all or * but express static handles files. For SPA fallback:
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();