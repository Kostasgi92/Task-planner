// Regression tests for bugs found in the original app (see docs/rebuild-plan.md §2).
import { expect, test } from '@playwright/test';
import { editableTask, type MockTask, mockTaskNestApi, parentTask, stat } from './support/mock-api';

test('editing a task keeps its deadline and reminder at the same local time', async ({ page }) => {
  const task: MockTask = {
    ...editableTask,
    dueAt: '2030-04-05T06:30:00.000Z', // 09:30 in Athens
    reminderAt: '2030-04-04T14:45:00.000Z', // 17:45 in Athens
  };
  const mutations = await mockTaskNestApi(page, [task]);
  await page.goto('/');
  await page.getByTestId('button-task-menu-42').click();
  await page.getByTestId('button-edit-task-42').click();

  await expect(page.getByTestId('input-task-due')).toHaveValue('2030-04-05T09:30');
  await expect(page.getByTestId('input-task-reminder')).toHaveValue('2030-04-04T17:45');

  await page.getByTestId('button-save-task').click();
  await expect(page.getByTestId('form-task')).toBeHidden();
  expect(mutations[0].body).toMatchObject({ dueAt: task.dueAt, reminderAt: task.reminderAt });
});

test('subtasks stay visible under their parent whatever their own state', async ({ page }) => {
  await mockTaskNestApi(page, [
    { ...parentTask, id: 1, title: 'Open parent' },
    { ...parentTask, id: 2, parentId: 1, title: 'Done child', completed: true },
    { ...parentTask, id: 3, title: 'Done parent', completed: true },
    { ...parentTask, id: 4, parentId: 3, title: 'Open child' },
  ]);
  await page.goto('/');

  await expect(page.getByTestId('task-row-1').getByTestId('task-row-2')).toContainText('Done child');
  await expect(page.getByTestId('task-row-3').getByTestId('task-row-4')).toContainText('Open child');
  await expect(page.getByText('Completed · 2')).toBeVisible();
});

test('"Clear done" asks first, then clears completed tasks', async ({ page }) => {
  const mutations = await mockTaskNestApi(page, [
    { ...parentTask, id: 1, title: 'Keep me' },
    { ...parentTask, id: 2, title: 'Finished', completed: true },
  ]);
  await page.goto('/');
  await expect(page.getByTestId('task-row-2')).toBeVisible();

  await page.getByTestId('button-clear-completed').click();
  await page.getByTestId('button-confirm-cancel').click();
  expect(mutations).toHaveLength(0);

  await page.getByTestId('button-clear-completed').click();
  await page.getByTestId('button-confirm-ok').click();
  await expect(page.getByTestId('task-row-2')).toHaveCount(0);
  await expect(page.getByTestId('task-row-1')).toBeVisible();
  expect(mutations).toEqual([{ method: 'DELETE', url: '/api/tasks/completed', body: {} }]);
  await expect(page.getByTestId('button-clear-completed')).toHaveCount(0);
});

test('deleting a task asks for confirmation and refreshes the widget', async ({ page }) => {
  const mutations = await mockTaskNestApi(page, [parentTask, editableTask]);
  await page.goto('/');
  await expect(page.getByTestId('widget-toggle-42')).toBeVisible();

  await page.getByTestId('button-task-menu-42').click();
  await page.getByTestId('button-delete-task-42').click();
  await expect(page.getByTestId('dialog-confirm')).toContainText('Delete “Existing task”?');
  await page.getByTestId('button-confirm-ok').click();

  await expect(page.getByTestId('task-row-42')).toHaveCount(0);
  await expect(page.getByTestId('widget-toggle-42')).toHaveCount(0);
  await expect(stat(page, 'to do')).toHaveText('1');
  expect(mutations).toEqual([{ method: 'DELETE', url: '/api/tasks/42', body: {} }]);
});

test('shows today’s date instead of a fixed one', async ({ page }) => {
  await mockTaskNestApi(page, [parentTask]);
  await page.goto('/');
  const today = await page.evaluate(() =>
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
  );
  await expect(page.getByText(today, { exact: true })).toBeVisible();
});

test('settings switches change what the task page shows', async ({ page }) => {
  await mockTaskNestApi(page, [{ ...parentTask, reminderAt: '2030-01-01T09:00:00.000Z' }]);
  await page.goto('/');
  await expect(page.getByLabel('Has a reminder')).toBeVisible();
  await expect(page.getByLabel('Widget preview')).toBeVisible();

  await page.getByTestId('link-settings').click();
  await page.getByTestId('switch-reminders').click();
  await page.getByTestId('switch-widget').click();
  await expect(page.getByTestId('switch-widget')).toHaveAttribute('aria-checked', 'false');

  await page.getByTestId('link-my-tasks').click();
  await expect(page.getByTestId('task-row-7')).toBeVisible();
  await expect(page.getByLabel('Has a reminder')).toHaveCount(0);
  await expect(page.getByLabel('Widget preview')).toHaveCount(0);

  await page.reload();
  await expect(page.getByTestId('task-row-7')).toBeVisible();
  await expect(page.getByLabel('Widget preview')).toHaveCount(0);
});

test('the widget on a category page only asks for that category', async ({ page }) => {
  await mockTaskNestApi(page, [parentTask]);
  const widgetRequest = page.waitForRequest(
    (request) => new URL(request.url()).pathname === '/api/summaries/widget',
  );
  await page.goto('/category/2');
  expect(new URL((await widgetRequest).url()).searchParams.get('categoryId')).toBe('2');
});

test('a failed save keeps the form open with a message', async ({ page }) => {
  await mockTaskNestApi(page, [parentTask]);
  await page.route('**/api/tasks', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' })
      : route.fallback(),
  );
  await page.goto('/');
  await page.getByTestId('button-add-task-top').click();
  await page.getByTestId('input-task-title').fill('Will fail');
  await page.getByTestId('button-save-task').click();
  await expect(page.getByTestId('text-save-error')).toBeVisible();
  await expect(page.getByTestId('form-task')).toBeVisible();
  await expect(page.getByTestId('input-task-title')).toHaveValue('Will fail');
});

test('every API request carries the browser time zone', async ({ page }) => {
  await mockTaskNestApi(page, [parentTask]);
  const request = page.waitForRequest((r) => new URL(r.url()).pathname === '/api/summaries/dashboard');
  await page.goto('/');
  expect((await request).headers()['x-timezone']).toBe('Europe/Athens');
});
