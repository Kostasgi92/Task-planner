import { createDb } from '@tasknest/db';
import { sql } from 'drizzle-orm';
import type { Request } from 'express';
import supertest from 'supertest';
import { createApp } from '../src/app';
import type { AuthStrategy } from '../src/middleware/auth';

export function testDatabaseUrl() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Point it at a disposable Postgres database (see .env.example).',
    );
  }
  return url;
}

/** Test-only auth: trusts the `x-test-user` header. Never used by the production entry points. */
export const headerAuth: AuthStrategy = {
  middleware: [],
  resolveUserId: (req: Request) => req.header('x-test-user') ?? null,
};

export const database = createDb(testDatabaseUrl(), { max: 4 });

export async function resetDatabase() {
  await database.db.execute(sql`truncate table tasks, categories restart identity cascade`);
}

export function makeClient(options: { now?: Date } = {}) {
  const app = createApp({
    db: database.db,
    auth: headerAuth,
    now: options.now ? () => options.now as Date : undefined,
  });
  const agent = supertest(app);
  return (userId: string, timeZone = 'UTC') => ({
    get: (url: string) => agent.get(url).set('x-test-user', userId).set('x-timezone', timeZone),
    post: (url: string, body?: object) =>
      agent.post(url).set('x-test-user', userId).set('x-timezone', timeZone).send(body),
    patch: (url: string, body?: object) =>
      agent.patch(url).set('x-test-user', userId).set('x-timezone', timeZone).send(body),
    delete: (url: string) => agent.delete(url).set('x-test-user', userId).set('x-timezone', timeZone),
  });
}

export type Client = ReturnType<ReturnType<typeof makeClient>>;

/** Creates a category and returns its id. */
export async function newCategory(client: Client, name = 'Work') {
  const res = await client.post('/api/categories', { name, color: '#6e9b89' }).expect(201);
  return res.body.id as number;
}

export async function newTask(client: Client, body: Record<string, unknown>) {
  const res = await client.post('/api/tasks', body);
  if (res.status !== 201) throw new Error(`createTask ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body as { id: number } & Record<string, unknown>;
}
