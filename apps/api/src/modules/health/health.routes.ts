import { HealthCheckResponse } from '@tasknest/contracts/zod';
import { Router } from 'express';

export function healthRoutes() {
  const router = Router();
  router.get('/healthz', (_req, res) => {
    res.json(HealthCheckResponse.parse({ status: 'ok' }));
  });
  return router;
}
