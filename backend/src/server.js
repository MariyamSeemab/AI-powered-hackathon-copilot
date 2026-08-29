/**
 * Local development server. Runs the same Express app used in Lambda.
 */
import { createApp } from './app.js';
import { initStore } from './lib/store.js';
import { logger } from './lib/logger.js';

const PORT = process.env.PORT || 4000;

async function main() {
  await initStore();
  const app = createApp();
  app.listen(PORT, () => {
    logger.info('server.started', { port: PORT, url: `http://localhost:${PORT}` });
    // Human-friendly line for the dev terminal.
    console.log(`\n  Hackathon Copilot API  ->  http://localhost:${PORT}\n`);
  });
}

main().catch((err) => {
  logger.error('server.fatal', { message: err.message });
  process.exit(1);
});
