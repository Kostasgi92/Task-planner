import type { Importance } from '@tasknest/domain';
import { readJson, removeKey, removeKeysWithPrefix, writeJson } from '@/lib/storage';

/** Everything the task form holds, kept so a refresh or app switch doesn't lose typing. */
export type TaskComposerDraft = {
  title: string;
  categoryId: string;
  notes: string;
  bulletPoints: string[];
  bulletPointCompleted: boolean[];
  importance: Importance;
  dueAt: string;
  reminderAt: string;
  parentId: string;
};

// Keys are per user, so drafts never cross accounts on a shared device.
export function draftKey(userId: string | null | undefined, taskId?: number, categoryId?: number) {
  if (!userId) return null;
  return `tasknest:draft:${userId}:${taskId ?? 'new'}:${categoryId ?? 'all'}`;
}

export const readDraft = (key: string | null) => readJson<Partial<TaskComposerDraft>>('local', key);
export const writeDraft = (key: string | null, draft: TaskComposerDraft) => writeJson('local', key, draft);
export const removeDraft = (key: string | null) => removeKey('local', key);

/** Remembers (per tab) that the "new task" form was open, to reopen it after a reload. */
type OpenState = { mode: 'new' };

export function openStateKey(userId: string | null | undefined, categoryId?: number) {
  if (!userId) return null;
  return `tasknest:composer-open:${userId}:${categoryId ?? 'all'}`;
}

export const readOpenState = (key: string | null) => readJson<OpenState>('session', key);
export const writeOpenState = (key: string | null) => writeJson('session', key, { mode: 'new' });
export const removeOpenState = (key: string | null) => removeKey('session', key);

export const clearAllOpenStates = () => removeKeysWithPrefix('session', 'tasknest:composer-open:');
export const clearOpenStatesForUser = (userId: string) =>
  removeKeysWithPrefix('session', `tasknest:composer-open:${userId}:`);
