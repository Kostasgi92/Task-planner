import {
  GetDashboardSummaryResponse,
  GetWidgetSummaryQueryParams,
  GetWidgetSummaryResponse,
} from '@tasknest/contracts/zod';
import { Router } from 'express';
import { type AppDeps, inUserScope } from '../../lib/context';
import { parseInput } from '../../lib/validate';
import { summariesService as service } from './summaries.service';

export function summariesRoutes(deps: AppDeps) {
  const router = Router();

  router.get('/summaries/dashboard', async (req, res) => {
    const summary = await inUserScope(deps, req, (scope) => service.dashboard(scope));
    res.json(GetDashboardSummaryResponse.parse(summary));
  });

  router.get('/summaries/widget', async (req, res) => {
    const { categoryId } = parseInput(GetWidgetSummaryQueryParams, req.query);
    const summary = await inUserScope(deps, req, (scope) => service.widget(scope, categoryId));
    res.json(GetWidgetSummaryResponse.parse(summary));
  });

  return router;
}
