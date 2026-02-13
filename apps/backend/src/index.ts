import { env } from './config/env';
import { createApp } from './app';

const app = createApp();

console.log(`Server running on http://localhost:${env.PORT}`);

export default {
  port: env.PORT,
  fetch: app.fetch,
};
