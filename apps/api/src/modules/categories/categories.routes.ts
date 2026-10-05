import {
  CreateCategoryBody,
  CreateCategoryResponse,
  DeleteCategoryParams,
  ListCategoriesResponse,
  UpdateCategoryBody,
  UpdateCategoryParams,
  UpdateCategoryResponse,
} from '@tasknest/contracts/zod';
import { Router } from 'express';
import { type AppDeps, inUserScope } from '../../lib/context';
import { parseInput } from '../../lib/validate';
import { categoriesService as service } from './categories.service';

export function categoriesRoutes(deps: AppDeps) {
  const router = Router();

  router.get('/categories', async (req, res) => {
    const categories = await inUserScope(deps, req, (scope) => service.list(scope));
    res.json(ListCategoriesResponse.parse(categories));
  });

  router.post('/categories', async (req, res) => {
    const body = parseInput(CreateCategoryBody, req.body);
    if (!body.name.trim()) {
      res.status(400).json({ error: 'name: Name is required' });
      return;
    }
    const category = await inUserScope(deps, req, (scope) => service.create(scope, body));
    res.status(201).json(CreateCategoryResponse.parse(category));
  });

  router.patch('/categories/:id', async (req, res) => {
    const { id } = parseInput(UpdateCategoryParams, req.params);
    const body = parseInput(UpdateCategoryBody, req.body);
    if (body.name !== undefined && !body.name.trim()) {
      res.status(400).json({ error: 'name: Name is required' });
      return;
    }
    const category = await inUserScope(deps, req, (scope) => service.update(scope, id, body));
    res.json(UpdateCategoryResponse.parse(category));
  });

  router.delete('/categories/:id', async (req, res) => {
    const { id } = parseInput(DeleteCategoryParams, req.params);
    await inUserScope(deps, req, (scope) => service.remove(scope, id));
    res.sendStatus(204);
  });

  return router;
}
