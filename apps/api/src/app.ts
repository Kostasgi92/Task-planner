import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { AppDeps } from './lib/context';
import { logger } from './lib/logger';
import { type AuthStrategy, requireUser } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { categoriesRoutes } from './modules/categories/categories.routes';
import { healthRoutes } from './modules/health/health.routes';
import { summariesRoutes } from './modules/summaries/summaries.routes';
import { tasksRoutes } from './modules/tasks/tasks.routes';

export type CreateAppOptions = AppDeps & { auth: AuthStrategy };

export function createApp({ auth, ...deps }: CreateAppOptions): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('query parser', 'simple');

  app.use(
    pinoHttp({
      logger,
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url?.split('?')[0] }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(helmet());
  // The web app is served from the same origin, so no CORS is configured on purpose:
  // browsers will refuse cross-site reads of this API.
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();
  api.use(healthRoutes());
  api.use(...auth.middleware, requireUser(auth.resolveUserId));
  api.use(categoriesRoutes(deps));
  api.use(tasksRoutes(deps));
  api.use(summariesRoutes(deps));
  api.use(notFoundHandler);

  app.use('/api', api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
