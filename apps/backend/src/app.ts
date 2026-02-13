import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { errorHandler } from './middleware/error-handler';
import { healthApi } from './modules/health/health.api';
import { authApi } from './modules/auth/auth.api';
import { itemsApi } from './modules/items/items.api';

export function createApp() {
  const app = new Hono();

  // Global middleware
  app.use('*', logger());
  app.use('*', cors());
  app.use('*', errorHandler);

  // Routes
  app.route('/api/health', healthApi);
  app.route('/api/auth', authApi);
  app.route('/api/items', itemsApi);

  return app;
}
