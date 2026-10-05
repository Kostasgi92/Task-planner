import {
  ClearCompletedTasksQueryParams,
  CreateTaskBody,
  CreateTaskResponse,
  DeleteTaskParams,
  ListTasksQueryParams,
  ListTasksResponse,
  UpdateTaskBody,
  UpdateTaskParams,
  UpdateTaskResponse,
} from '@tasknest/contracts/zod';
import { Router } from 'express';
import { type AppDeps, inUserScope } from '../../lib/context';
import { parseInput } from '../../lib/validate';
import { toTaskDto } from './tasks.mapper';
import { tasksService as service } from './tasks.service';

export function tasksRoutes(deps: AppDeps) {
  const router = Router();

  router.get('/tasks', async (req, res) => {
    const query = parseInput(ListTasksQueryParams, req.query);
    const tasks = await inUserScope(deps, req, (scope) => service.list(scope, query));
    res.json(ListTasksResponse.parse(tasks.map(toTaskDto)));
  });

  router.post('/tasks', async (req, res) => {
    const body = parseInput(CreateTaskBody, req.body);
    const task = await inUserScope(deps, req, (scope) => service.create(scope, body));
    res.status(201).json(CreateTaskResponse.parse(toTaskDto(task)));
  });

  // Must be registered before `/tasks/:id`, otherwise "completed" is taken for an id
  // (this ordering bug made "Clear done" fail with 400 in the old app).
  router.delete('/tasks/completed', async (req, res) => {
    const { categoryId } = parseInput(ClearCompletedTasksQueryParams, req.query);
    await inUserScope(deps, req, (scope) => service.clearCompleted(scope, categoryId));
    res.sendStatus(204);
  });

  router.patch('/tasks/:id', async (req, res) => {
    const { id } = parseInput(UpdateTaskParams, req.params);
    const body = parseInput(UpdateTaskBody, req.body);
    const task = await inUserScope(deps, req, (scope) => service.update(scope, id, body));
    res.json(UpdateTaskResponse.parse(toTaskDto(task)));
  });

  router.delete('/tasks/:id', async (req, res) => {
    const { id } = parseInput(DeleteTaskParams, req.params);
    await inUserScope(deps, req, (scope) => service.remove(scope, id));
    res.sendStatus(204);
  });

  return router;
}
