import { loadEnv } from './config/env';
import { logger } from './lib/logger';
import { createProductionApp } from './production';

const { PORT } = loadEnv();
createProductionApp().listen(PORT, () => {
  logger.info(`TaskNest API listening on http://localhost:${PORT}`);
});
