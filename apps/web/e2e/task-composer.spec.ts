// Ported from the original Replit app's e2e suite: same flows, same expectations.
import { expect, test } from '@playwright/test';
import {
  createResponseGate,
  draftKey,
  editableTask,
  expectAllTaskFields,
  fillAllTaskFields,
  type MockTask,
  mockTaskNestApi,
  mockTaskNestApiForUsers,
  openNewTask,
  parentTask,
  setTestUser,
  signOutTestUser,
  stat,
  userA,
  userB,
} from './support/mock-api';

const readStorage = (page: import('@playwright/test').Page, key: string) =>
  page.evaluate((k) => window.localStorage.getItem(k), key);

test('restores a new task draft after a session remount and clears it after retry', async ({ page }) => {
  const mutations = await mockTaskNestApi(page, [parentTask]);
  const values = {
    title: 'Prepare quarterly review',
    notes: 'Bring the latest numbers and open questions.',
    firstItem: 'Pull the report',
    secondItem: 'Draft the agenda',
  };

  await openNewTask(page);
  await fillAllTaskFields(page, values);
  await expect.poll(() => readStorage(page, draftKey(userA, 'new'))).toContain(values.title);

  await page.reload();
  await openNewTask(page);
  await expectAllTaskFields(page, values);

  await page.getByTestId('button-save-task').click();
  await expect(page.getByTestId('form-task')).toBeHidden();
  await expect.poll(() => readStorage(page, draftKey(userA, 'new'))).toBeNull();
  expect(mutations).toHaveLength(1);
  expect(mutations[0]).toMatchObject({
    method: 'POST',
    body: {
      title: values.title,
      parentId: 7,
      importance: 'high',
      bulletPoints: [values.firstItem, values.secondItem],
      notes: values.notes,
      // Local 09:30 in Europe/Athens (UTC+3 in April) is 06:30Z.
      dueAt: '2030-04-05T06:30:00.000Z',
      reminderAt: '2030-04-04T14:45:00.000Z',
    },
  });
});

test('refreshes the widget summary after completing a task from the task list', async ({ page }) => {
  await mockTaskNestApi(page, [
    { ...parentTask, id: 71, title: 'Finish the project brief' },
    { ...parentTask, id: 72, title: 'Send the project brief' },
  ]);
  await page.goto('/');

  await expect(stat(page, 'to do')).toHaveText('2');
  await expect(page.getByTestId('text-task-count')).toHaveText('2 active tasks');
  await expect(page.getByTestId('widget-toggle-71')).toBeVisible();
  await expect(page.getByTestId('widget-toggle-72')).toBeVisible();

  const widgetRefresh = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/summaries/widget'),
  );
  await page.getByTestId('button-toggle-task-71').click();
  await widgetRefresh;

  await expect(stat(page, 'to do')).toHaveText('1');
  await expect(page.getByTestId('text-task-count')).toHaveText('1 active task');
  await expect(page.getByTestId('widget-toggle-71')).toHaveCount(0);
  await expect(page.getByTestId('widget-toggle-72')).toBeVisible();
});

test('toggles individual bullet points with a touch-friendly strikethrough', async ({ page }) => {
  const mutations = await mockTaskNestApi(page, [
    {
      ...editableTask,
      id: 81,
      title: 'Prepare the launch plan',
      bulletPoints: ['Review the brief', 'Share the final version'],
      bulletPointCompleted: [false, false],
    },
  ]);
  await page.goto('/');

  const bullet = page.getByTestId('button-toggle-bullet-81-0');
  await expect(bullet).toContainText('Review the brief');
  await expect(bullet.locator('span').last()).not.toHaveClass(/line-through/);

  await bullet.click();
  await expect.poll(() => mutations.at(-1)?.body).toMatchObject({ bulletPointCompleted: [true, false] });
  await expect(bullet.locator('span').last()).toHaveClass(/line-through/);
  await expect(bullet).toHaveAttribute('aria-label', 'Mark item 1 active');

  await bullet.click();
  await expect.poll(() => mutations.at(-1)?.body).toMatchObject({ bulletPointCompleted: [false, false] });
  await expect(bullet.locator('span').last()).not.toHaveClass(/line-through/);
});

test('restores new task drafts only within their category', async ({ page }) => {
  await mockTaskNestApi(page, [parentTask]);

  await page.goto('/category/1');
  await openNewTask(page, false);
  await page.getByTestId('input-task-title').fill('Personal category draft');
  await expect.poll(() => readStorage(page, draftKey(userA, 'new', 1))).toContain('Personal category draft');

  await page.reload();
  await openNewTask(page, false);
  await expect(page.getByTestId('input-task-title')).toHaveValue('Personal category draft');

  await page.goto('/category/2');
  await openNewTask(page, false);
  await expect(page.getByTestId('input-task-title')).toHaveValue('');
  await expect(page.getByTestId('select-task-category')).toHaveValue('2');
});

test('shows an empty state and safe navigation for an invalid category URL', async ({ page }) => {
  await mockTaskNestApi(page, [parentTask]);
  await page.goto('/category/999');

  await expect(page.getByRole('heading', { name: 'Category not found.' })).toBeVisible();
  await expect(page.getByTestId('category-not-found')).toContainText('This category cannot be found.');
  await expect(page.getByTestId('button-add-task-top')).toHaveCount(0);

  await page.getByTestId('link-back-to-tasks').click();
  await expect(page.getByTestId('button-add-task-top')).toBeVisible();
});

test('discards a new task draft when cancelled and reopens empty', async ({ page }) => {
  await mockTaskNestApi(page, [parentTask]);
  const values = {
    title: 'Discard this unfinished task',
    notes: 'This draft should not come back.',
    firstItem: 'Temporary item',
    secondItem: 'Another temporary item',
  };

  await openNewTask(page);
  await fillAllTaskFields(page, values);
  await expect.poll(() => readStorage(page, draftKey(userA, 'new'))).toContain(values.title);

  await page.getByTestId('button-cancel-task').click();
  await expect(page.getByTestId('form-task')).toBeHidden();
  await expect.poll(() => readStorage(page, draftKey(userA, 'new'))).toBeNull();

  await page.getByTestId('button-add-task-top').click();
  await expect(page.getByTestId('form-task')).toBeVisible();
  await expect(page.getByTestId('input-task-title')).toHaveValue('');
  await expect(page.getByTestId('input-task-notes')).toHaveValue('');
  await expect(page.getByTestId('input-task-item-0')).toHaveCount(0);
});

test('restores an edit draft after a session remount and clears it after retry', async ({ page }) => {
  const mutations = await mockTaskNestApi(page, [parentTask, editableTask]);
  const values = {
    title: 'Refine the quarterly review',
    notes: 'Add the decisions from the planning session.',
    firstItem: 'Pull the updated report',
    secondItem: 'Draft the revised agenda',
  };

  await page.goto('/');
  await page.getByTestId('button-task-menu-42').click();
  await page.getByTestId('button-edit-task-42').click();
  await expect(page.getByTestId('form-task')).toBeVisible();
  await fillAllTaskFields(page, values);

  await page.reload();
  await page.getByTestId('button-task-menu-42').click();
  await page.getByTestId('button-edit-task-42').click();
  await expectAllTaskFields(page, values);

  await page.getByTestId('button-save-task').click();
  await expect(page.getByTestId('form-task')).toBeHidden();
  await expect.poll(() => readStorage(page, draftKey(userA, 42))).toBeNull();
  expect(mutations).toHaveLength(1);
  expect(mutations[0]).toMatchObject({
    method: 'PATCH',
    url: '/api/tasks/42',
    body: {
      title: values.title,
      parentId: 7,
      importance: 'high',
      bulletPoints: [values.firstItem, values.secondItem],
      notes: values.notes,
    },
  });
});

test('discards an edit draft when cancelled and reopens persisted values', async ({ page }) => {
  await mockTaskNestApi(page, [parentTask, editableTask]);
  const values = {
    title: 'Discard this unfinished edit',
    notes: 'These changes should not come back.',
    firstItem: 'Temporary updated item',
    secondItem: 'Another temporary item',
  };

  await page.goto('/');
  await page.getByTestId('button-task-menu-42').click();
  await page.getByTestId('button-edit-task-42').click();
  await fillAllTaskFields(page, values);
  await expect.poll(() => readStorage(page, draftKey(userA, 42))).toContain(values.title);

  await page.getByTestId('button-cancel-task').click();
  await expect(page.getByTestId('form-task')).toBeHidden();
  await expect.poll(() => readStorage(page, draftKey(userA, 42))).toBeNull();

  await page.getByTestId('button-task-menu-42').click();
  await page.getByTestId('button-edit-task-42').click();
  await expect(page.getByTestId('input-task-title')).toHaveValue(editableTask.title);
  await expect(page.getByTestId('select-task-parent')).toHaveValue('');
  await expect(page.getByTestId('select-task-importance')).toHaveValue(editableTask.importance);
  await expect(page.getByTestId('input-task-due')).toHaveValue('');
  await expect(page.getByTestId('input-task-reminder')).toHaveValue('');
  await expect(page.getByTestId('input-task-item-0')).toHaveValue(editableTask.bulletPoints[0]);
  await expect(page.getByTestId('input-task-item-1')).toHaveCount(0);
  await expect(page.getByTestId('input-task-notes')).toHaveValue(editableTask.notes ?? '');
});

test('keeps new and edit drafts isolated across a sign-out and account switch', async ({ page, context }) => {
  await mockTaskNestApi(page, [parentTask, editableTask]);
  const editPage = await context.newPage();
  await mockTaskNestApi(editPage, [parentTask, editableTask]);
  const switchPage = await context.newPage();
  await mockTaskNestApi(switchPage, [parentTask, editableTask]);

  const newValues = {
    title: 'User A unfinished task',
    notes: 'Only User A should see this new task draft.',
    firstItem: 'User A new item',
    secondItem: 'User A second new item',
  };
  const editValues = {
    title: 'User A unfinished edit',
    notes: 'Only User A should see this edit draft.',
    firstItem: 'User A edit item',
    secondItem: 'User A second edit item',
  };

  await openNewTask(page);
  await fillAllTaskFields(page, newValues);
  await expect.poll(() => readStorage(page, draftKey(userA, 'new'))).toContain(newValues.title);

  await editPage.goto('/');
  await editPage.getByTestId('button-task-menu-42').click();
  await editPage.getByTestId('button-edit-task-42').click();
  await fillAllTaskFields(editPage, editValues);
  await expect.poll(() => readStorage(editPage, draftKey(userA, 42))).toContain(editValues.title);

  await signOutTestUser(page);
  await signOutTestUser(editPage);

  await switchPage.goto('/');
  await switchPage.getByTestId('button-sign-out').click();
  await expect(switchPage.getByTestId('link-sign-in')).toBeVisible();
  await setTestUser(switchPage, userB);
  await expect(switchPage.getByTestId('button-add-task-top')).toBeVisible();

  await openNewTask(switchPage, false);
  await expect(switchPage.getByTestId('input-task-title')).toHaveValue('');
  await expect(switchPage.getByTestId('input-task-notes')).toHaveValue('');
  await expect(switchPage.getByTestId('input-task-item-0')).toHaveCount(0);
  await switchPage.getByTestId('button-cancel-task').click();

  await switchPage.getByTestId('button-task-menu-42').click();
  await switchPage.getByTestId('button-edit-task-42').click();
  await expect(switchPage.getByTestId('input-task-title')).toHaveValue(editableTask.title);
  await expect(switchPage.getByTestId('input-task-notes')).toHaveValue(editableTask.notes ?? '');
  await expect(switchPage.getByTestId('input-task-item-0')).toHaveValue(editableTask.bulletPoints[0]);
  await switchPage.getByTestId('button-cancel-task').click();

  await switchPage.getByTestId('button-sign-out').click();
  await expect(switchPage.getByTestId('link-sign-in')).toBeVisible();
  await setTestUser(switchPage, userA);
  await expect(switchPage.getByTestId('button-add-task-top')).toBeVisible();

  await setTestUser(page, userA);
  await expect(page.getByTestId('button-add-task-top')).toBeVisible();
  await openNewTask(page, false);
  await expectAllTaskFields(page, newValues);

  await setTestUser(editPage, userA);
  await expect(editPage.getByTestId('button-add-task-top')).toBeVisible();
  await editPage.getByTestId('button-task-menu-42').click();
  await editPage.getByTestId('button-edit-task-42').click();
  await expectAllTaskFields(editPage, editValues);
});

test('drops an open edit composer when the active account changes directly', async ({ page }) => {
  await mockTaskNestApi(page, [parentTask, editableTask]);
  await page.goto('/');
  await page.getByTestId('button-task-menu-42').click();
  await page.getByTestId('button-edit-task-42').click();
  await page.getByTestId('input-task-title').fill('User A private edit');
  await expect.poll(() => readStorage(page, draftKey(userA, 42))).toContain('User A private edit');

  await setTestUser(page, userB);

  await expect(page.getByTestId('form-task')).toBeHidden();
  await expect.poll(() => readStorage(page, draftKey(userB, 42))).toBeNull();
  await page.getByTestId('button-task-menu-42').click();
  await page.getByTestId('button-edit-task-42').click();
  await expect(page.getByTestId('input-task-title')).toHaveValue(editableTask.title);
  await expect(page.getByTestId('input-task-notes')).toHaveValue(editableTask.notes ?? '');
  await expect(page.getByTestId('input-task-item-0')).toHaveValue(editableTask.bulletPoints[0]);
});

test('does not reuse task data or summaries after switching accounts', async ({ page }) => {
  const userATask: MockTask = { ...parentTask, id: 101, categoryId: 11, title: 'User A planning task' };
  const userACompletedTask: MockTask = {
    ...editableTask,
    id: 102,
    categoryId: 11,
    title: 'User A completed task',
    completed: true,
  };
  const userBTask: MockTask = { ...parentTask, id: 201, categoryId: 21, title: 'User B launch task' };
  const delayed = {
    userId: userB,
    categories: createResponseGate(),
    tasks: createResponseGate(),
    dashboard: createResponseGate(),
    widget: createResponseGate(),
  };
  await mockTaskNestApiForUsers(
    page,
    {
      [userA]: {
        categories: [{ id: 11, name: 'User A projects', color: '#6e9b89', taskCount: 2, completedCount: 1 }],
        tasks: [userATask, userACompletedTask],
      },
      [userB]: {
        categories: [{ id: 21, name: 'User B projects', color: '#d17e62', taskCount: 1, completedCount: 0 }],
        tasks: [userBTask],
      },
    },
    delayed,
  );
  await page.goto('/');

  await expect(page.getByTestId('task-row-101')).toContainText('User A planning task');
  await expect(page.getByTestId('link-category-11')).toContainText('User A projects');
  await expect(stat(page, 'to do')).toHaveText('1');
  await expect(stat(page, 'done')).toHaveText('1');

  await signOutTestUser(page);
  await setTestUser(page, userB);

  await Promise.all(
    [delayed.categories, delayed.tasks, delayed.dashboard, delayed.widget].map((g) => g.started),
  );
  await expect(page.getByTestId('loading-tasks')).toBeVisible();
  await expect(page.getByTestId('task-row-101')).toHaveCount(0);
  await expect(page.getByText('User A planning task')).toHaveCount(0);
  await expect(page.getByTestId('widget-toggle-101')).toHaveCount(0);
  await expect(page.getByTestId('loading-widget')).toBeVisible();
  await expect(page.getByTestId('link-category-11')).toHaveCount(0);
  await expect(stat(page, 'to do')).toHaveText('0');
  await expect(stat(page, 'done')).toHaveText('0');

  delayed.tasks.release();
  await expect(page.getByTestId('loading-tasks')).toBeVisible();
  await expect(page.getByTestId('task-row-101')).toHaveCount(0);

  delayed.categories.release();
  await expect(page.getByTestId('task-row-201')).toBeVisible();
  await expect(page.getByTestId('link-category-21')).toContainText('User B projects');
  await expect(page.getByTestId('widget-toggle-201')).toHaveCount(0);
  await expect(stat(page, 'to do')).toHaveText('1');
  await expect(stat(page, 'done')).toHaveText('0');

  delayed.dashboard.release();
  delayed.widget.release();
  await expect(page.getByTestId('task-row-201')).toContainText('User B launch task');
  await expect(page.getByTestId('widget-toggle-201')).toHaveCount(1);
  await expect(page.getByTestId('widget-toggle-101')).toHaveCount(0);
  await expect(page.getByTestId('loading-widget')).toHaveCount(0);
  await expect(page.getByText('User A planning task')).toHaveCount(0);
  await expect(page.getByTestId('link-category-11')).toHaveCount(0);

  await signOutTestUser(page);
  await setTestUser(page, userA);

  await expect(page.getByTestId('task-row-101')).toContainText('User A planning task');
  await expect(page.getByTestId('link-category-11')).toContainText('User A projects');
  await expect(page.getByText('User B launch task')).toHaveCount(0);
  await expect(page.getByTestId('link-category-21')).toHaveCount(0);
  await expect(stat(page, 'to do')).toHaveText('1');
  await expect(stat(page, 'done')).toHaveText('1');
  await expect(page.getByTestId('widget-toggle-101')).toBeVisible();
  await expect(page.getByTestId('widget-toggle-201')).toHaveCount(0);
});

test('keeps the active account isolated after switching again before a response settles', async ({
  page,
}) => {
  const delayed = {
    userId: userB,
    categories: createResponseGate(),
    tasks: createResponseGate(),
    dashboard: createResponseGate(),
    widget: createResponseGate(),
  };
  await mockTaskNestApiForUsers(
    page,
    {
      [userA]: {
        categories: [
          { id: 51, name: 'User A current projects', color: '#6e9b89', taskCount: 2, completedCount: 1 },
        ],
        tasks: [
          { ...parentTask, id: 501, categoryId: 51, title: 'User A current task' },
          { ...editableTask, id: 502, categoryId: 51, title: 'User A finished task', completed: true },
        ],
      },
      [userB]: {
        categories: [
          { id: 61, name: 'User B abandoned projects', color: '#d17e62', taskCount: 2, completedCount: 0 },
        ],
        tasks: [
          { ...parentTask, id: 601, categoryId: 61, title: 'User B abandoned task' },
          { ...parentTask, id: 602, categoryId: 61, title: 'User B second abandoned task' },
        ],
      },
    },
    delayed,
  );
  await page.goto('/');
  await expect(page.getByTestId('task-row-501')).toBeVisible();
  await expect(page.getByTestId('widget-toggle-501')).toBeVisible();

  await signOutTestUser(page);
  await setTestUser(page, userB);
  await Promise.all(
    [delayed.categories, delayed.tasks, delayed.dashboard, delayed.widget].map((g) => g.started),
  );

  await signOutTestUser(page);
  await setTestUser(page, userA);
  await expect(page.getByTestId('task-row-501')).toContainText('User A current task');
  await expect(page.getByTestId('link-category-51')).toContainText('User A current projects');
  await expect(stat(page, 'to do')).toHaveText('1');
  await expect(stat(page, 'done')).toHaveText('1');

  delayed.tasks.release();
  delayed.categories.release();
  delayed.dashboard.release();
  delayed.widget.release();

  await expect(page.getByTestId('task-row-601')).toHaveCount(0);
  await expect(page.getByTestId('task-row-602')).toHaveCount(0);
  await expect(page.getByText('User B abandoned task')).toHaveCount(0);
  await expect(page.getByTestId('link-category-61')).toHaveCount(0);
  await expect(stat(page, 'to do')).toHaveText('1');
  await expect(stat(page, 'done')).toHaveText('1');
  await expect(page.getByTestId('widget-toggle-501')).toBeVisible();
  await expect(page.getByTestId('widget-toggle-601')).toHaveCount(0);
});

test('keeps category task data isolated when switching accounts', async ({ page }) => {
  const categoryId = 31;
  const delayed = {
    userId: userB,
    categories: createResponseGate(),
    tasks: createResponseGate(),
    dashboard: createResponseGate(),
  };
  await mockTaskNestApiForUsers(
    page,
    {
      [userA]: {
        categories: [
          { id: categoryId, name: 'User A focus', color: '#6e9b89', taskCount: 1, completedCount: 0 },
        ],
        tasks: [{ ...parentTask, id: 301, categoryId, title: 'User A category task' }],
      },
      [userB]: {
        categories: [
          { id: categoryId, name: 'User B focus', color: '#d17e62', taskCount: 1, completedCount: 0 },
        ],
        tasks: [{ ...parentTask, id: 401, categoryId, title: 'User B category task' }],
      },
    },
    delayed,
  );
  await page.goto(`/category/${categoryId}`);
  await expect(page.getByTestId('task-row-301')).toContainText('User A category task');
  await expect(page.getByRole('heading', { name: 'User A focus' })).toBeVisible();

  await signOutTestUser(page);
  await setTestUser(page, userB);
  await Promise.all([delayed.categories, delayed.tasks, delayed.dashboard].map((g) => g.started));

  await expect(page.getByTestId('loading-tasks')).toBeVisible();
  await expect(page.getByText('User A category task')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'User A focus' })).toHaveCount(0);

  delayed.tasks.release();
  delayed.categories.release();
  delayed.dashboard.release();

  await expect(page.getByTestId('task-row-401')).toContainText('User B category task');
  await expect(page.getByRole('heading', { name: 'User B focus' })).toBeVisible();
  await expect(page.getByText('User A category task')).toHaveCount(0);

  await signOutTestUser(page);
  await setTestUser(page, userA);

  await expect(page.getByTestId('task-row-301')).toContainText('User A category task');
  await expect(page.getByRole('heading', { name: 'User A focus' })).toBeVisible();
  await expect(page.getByText('User B category task')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'User B focus' })).toHaveCount(0);
});

test('keeps the second category visible when the first category response resolves late', async ({ page }) => {
  const first = { id: 71, name: 'Personal focus', color: '#6e9b89', taskCount: 1, completedCount: 0 };
  const second = { id: 72, name: 'Work focus', color: '#d17e62', taskCount: 1, completedCount: 0 };
  const firstTask: MockTask = {
    ...parentTask,
    id: 701,
    categoryId: first.id,
    title: 'Personal delayed task',
  };
  const secondTask: MockTask = { ...parentTask, id: 702, categoryId: second.id, title: 'Work current task' };
  const delayed = {
    userId: userA,
    gatedTaskCategoryId: first.id,
    categories: createResponseGate(),
    tasks: createResponseGate(),
    dashboard: createResponseGate(),
  };
  await mockTaskNestApiForUsers(
    page,
    { [userA]: { categories: [first, second], tasks: [firstTask, secondTask] } },
    delayed,
  );

  await page.goto(`/category/${first.id}`);
  await delayed.tasks.started;
  await expect(page.getByRole('heading', { name: first.name })).toBeVisible();

  await page.goto(`/category/${second.id}`);
  await expect(page.getByRole('heading', { name: second.name })).toBeVisible();
  await expect(page.getByTestId(`task-row-${secondTask.id}`)).toContainText(secondTask.title);
  await expect(page.getByTestId(`task-row-${firstTask.id}`)).toHaveCount(0);

  delayed.tasks.release();
  await expect(page.getByRole('heading', { name: second.name })).toBeVisible();
  await expect(page.getByTestId(`task-row-${firstTask.id}`)).toHaveCount(0);
});
