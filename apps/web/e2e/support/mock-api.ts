import { expect, type Page } from '@playwright/test';

export const userA = 'e2e-user';
export const userB = 'e2e-user-b';

export const draftKey = (userId: string, taskId: number | 'new', categoryId?: number) =>
  `tasknest:draft:${userId}:${taskId}:${categoryId ?? 'all'}`;

export const category = { id: 1, name: 'Personal', color: '#6e9b89', taskCount: 2, completedCount: 0 };
export const secondCategory = { id: 2, name: 'Work', color: '#7895b2', taskCount: 0, completedCount: 0 };
export const categories = [category, secondCategory];

export type MockCategory = typeof category;

export type MockTask = {
  id: number;
  categoryId: number;
  parentId: number | null;
  title: string;
  notes: string | null;
  bulletPoints: string[];
  bulletPointCompleted?: boolean[];
  importance: 'low' | 'medium' | 'high';
  dueAt: string | null;
  reminderAt: string | null;
  completed: boolean;
  createdAt: string;
  completedAt?: string | null;
};

export const parentTask: MockTask = {
  id: 7,
  categoryId: 1,
  parentId: null,
  title: 'Plan the week',
  notes: null,
  bulletPoints: [],
  importance: 'medium',
  dueAt: null,
  reminderAt: null,
  completed: false,
  createdAt: '2026-09-01T08:00:00.000Z',
};

export const editableTask: MockTask = {
  id: 42,
  categoryId: 1,
  parentId: null,
  title: 'Existing task',
  notes: 'Original note',
  bulletPoints: ['Original item'],
  importance: 'medium',
  dueAt: null,
  reminderAt: null,
  completed: false,
  createdAt: '2026-09-02T08:00:00.000Z',
};

export type Mutation = { method: string; url: string; body: Record<string, unknown> };

/** In-memory fake of the TaskNest API for a single user. Records every mutation. */
export async function mockTaskNestApi(page: Page, initialTasks: MockTask[], mockCategories = categories) {
  const tasks = structuredClone(initialTasks);
  const mutations: Mutation[] = [];

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (method === 'GET' && path.endsWith('/healthz')) return json({ status: 'ok' });
    if (method === 'GET' && path.endsWith('/categories')) return json(mockCategories);
    if (method === 'GET' && path.endsWith('/tasks')) {
      const categoryId = url.searchParams.get('categoryId');
      return json(categoryId ? tasks.filter((task) => task.categoryId === Number(categoryId)) : tasks);
    }
    if (method === 'GET' && path.endsWith('/summaries/dashboard')) {
      return json({
        activeCount: tasks.filter((task) => !task.completed).length,
        completedCount: tasks.filter((task) => task.completed).length,
        dueTodayCount: 0,
        overdueCount: 0,
        categoryCount: mockCategories.length,
      });
    }
    if (method === 'GET' && path.endsWith('/summaries/widget')) {
      const activeTasks = tasks.filter((task) => !task.completed);
      return json({
        dateLabel: 'Wednesday, 16 September',
        activeCount: activeTasks.length,
        dueTodayCount: 0,
        tasks: activeTasks.slice(0, 6),
      });
    }

    if (method === 'DELETE' && path.endsWith('/tasks/completed')) {
      mutations.push({ method, url: `${path}${url.search}`, body: {} });
      const doomed = new Set(tasks.filter((task) => task.completed).map((task) => task.id));
      for (const task of tasks) if (task.parentId && doomed.has(task.parentId)) task.parentId = null;
      tasks.splice(0, tasks.length, ...tasks.filter((task) => !doomed.has(task.id)));
      return route.fulfill({ status: 204 });
    }
    if (method === 'DELETE' && path.includes('/tasks/')) {
      mutations.push({ method, url: path, body: {} });
      const id = Number(path.split('/').at(-1));
      tasks.splice(0, tasks.length, ...tasks.filter((task) => task.id !== id && task.parentId !== id));
      return route.fulfill({ status: 204 });
    }

    if ((method === 'POST' || method === 'PATCH') && path.includes('/tasks')) {
      const body = request.postDataJSON() as Record<string, unknown>;
      mutations.push({ method, url: path, body });
      const id = method === 'POST' ? 100 : Number(path.split('/').at(-1));
      const current = tasks.find((task) => task.id === id) ?? {
        ...parentTask,
        id,
        title: '',
        notes: null,
        bulletPoints: [],
      };
      const updated = { ...current, ...body, id } as MockTask;
      if (method === 'POST') tasks.push(updated);
      else
        tasks.splice(
          tasks.findIndex((task) => task.id === id),
          1,
          updated,
        );
      return json(updated, method === 'POST' ? 201 : 200);
    }

    return route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"Not mocked"}' });
  });

  return mutations;
}

export type UserFixture = { categories: MockCategory[]; tasks: MockTask[] };

export type ResponseGate = {
  started: Promise<void>;
  markStarted: () => void;
  released: Promise<void>;
  release: () => void;
};

export function createResponseGate(): ResponseGate {
  let markStarted!: () => void;
  let release!: () => void;
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { started, markStarted, released, release };
}

export type DelayedUserResponses = {
  userId: string;
  gatedTaskCategoryId?: number;
  categories: ResponseGate;
  tasks: ResponseGate;
  dashboard: ResponseGate;
  widget?: ResponseGate;
};

const currentUserId = (page: Page) =>
  page.evaluate(() => window.__tasknestTestClerk?.getUserId() ?? 'e2e-user');

/** Fake API that answers per signed-in test user and can hold responses back on demand. */
export async function mockTaskNestApiForUsers(
  page: Page,
  fixtures: Record<string, UserFixture>,
  delayed?: DelayedUserResponses,
) {
  const tasksByUser = Object.fromEntries(
    Object.entries(fixtures).map(([userId, fixture]) => [userId, structuredClone(fixture.tasks)]),
  ) as Record<string, MockTask[]>;

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const userId = await currentUserId(page);
    const fixture = fixtures[userId] ?? fixtures[userA];
    const tasks = tasksByUser[userId] ?? tasksByUser[userA];
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    const gated = delayed?.userId === userId && delayed.gatedTaskCategoryId === undefined;

    if (request.method() !== 'GET') return route.fulfill({ status: 404 });
    if (path.endsWith('/healthz')) return json({ status: 'ok' });
    if (path.endsWith('/categories')) {
      if (gated && delayed) {
        delayed.categories.markStarted();
        await delayed.categories.released;
      }
      return json(fixture.categories);
    }
    if (path.endsWith('/tasks')) {
      const categoryId = url.searchParams.get('categoryId');
      if (
        delayed?.userId === userId &&
        (delayed.gatedTaskCategoryId === undefined || categoryId === String(delayed.gatedTaskCategoryId))
      ) {
        delayed.tasks.markStarted();
        await delayed.tasks.released;
      }
      return json(categoryId ? tasks.filter((task) => task.categoryId === Number(categoryId)) : tasks);
    }
    if (path.endsWith('/summaries/dashboard')) {
      if (gated && delayed) {
        delayed.dashboard.markStarted();
        await delayed.dashboard.released;
      }
      return json({
        activeCount: tasks.filter((task) => !task.completed).length,
        completedCount: tasks.filter((task) => task.completed).length,
        dueTodayCount: 0,
        overdueCount: 0,
        categoryCount: fixture.categories.length,
      });
    }
    if (path.endsWith('/summaries/widget')) {
      if (gated && delayed?.widget) {
        delayed.widget.markStarted();
        await delayed.widget.released;
      }
      return json({
        dateLabel: 'Wednesday, 16 September',
        activeCount: tasks.filter((task) => !task.completed).length,
        dueTodayCount: 0,
        tasks: tasks.filter((task) => !task.completed).slice(0, 6),
      });
    }
    return route.fulfill({ status: 404 });
  });
}

export async function openNewTask(page: Page, navigate = true) {
  if (navigate) await page.goto('/');
  await expect(page.getByTestId('button-add-task-top')).toBeVisible();
  const form = page.getByTestId('form-task');
  if (!(await form.isVisible())) await page.getByTestId('button-add-task-top').click();
  await expect(form).toBeVisible();
}

export async function setTestUser(page: Page, userId: string) {
  await page.evaluate((next) => {
    if (!window.__tasknestTestClerk) throw new Error('Test Clerk controls are unavailable');
    window.__tasknestTestClerk.setUser(next);
  }, userId);
}

export async function signOutTestUser(page: Page) {
  await page.evaluate(() => {
    if (!window.__tasknestTestClerk) throw new Error('Test Clerk controls are unavailable');
    return window.__tasknestTestClerk.signOut();
  });
  await expect(page.getByTestId('link-sign-in')).toBeVisible();
}

export type TaskFieldValues = { title: string; notes: string; firstItem: string; secondItem: string };

export async function fillAllTaskFields(page: Page, values: TaskFieldValues) {
  await page.getByTestId('input-task-title').fill(values.title);
  await page.getByTestId('select-task-parent').selectOption('7');
  await page.getByTestId('select-task-importance').selectOption('high');
  await page.getByTestId('input-task-due').fill('2030-04-05T09:30');
  await page.getByTestId('input-task-reminder').fill('2030-04-04T17:45');
  await page.getByTestId('button-add-task-item').click();
  await page.getByTestId('input-task-item-0').fill(values.firstItem);
  await page.getByTestId('button-add-task-item').click();
  await page.getByTestId('input-task-item-1').fill(values.secondItem);
  await page.getByTestId('input-task-notes').fill(values.notes);
}

export async function expectAllTaskFields(page: Page, values: TaskFieldValues) {
  await expect(page.getByTestId('input-task-title')).toHaveValue(values.title);
  await expect(page.getByTestId('select-task-parent')).toHaveValue('7');
  await expect(page.getByTestId('select-task-importance')).toHaveValue('high');
  await expect(page.getByTestId('input-task-due')).toHaveValue('2030-04-05T09:30');
  await expect(page.getByTestId('input-task-reminder')).toHaveValue('2030-04-04T17:45');
  await expect(page.getByTestId('input-task-item-0')).toHaveValue(values.firstItem);
  await expect(page.getByTestId('input-task-item-1')).toHaveValue(values.secondItem);
  await expect(page.getByTestId('input-task-notes')).toHaveValue(values.notes);
}

export const stat = (page: Page, name: string) => page.getByTestId(`stat-${name}`).locator('p').first();
