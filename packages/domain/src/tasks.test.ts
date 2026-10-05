import { describe, expect, it } from 'vitest';
import { alignBulletCompletion, buildTaskTree, normalizeBulletPoints, toggleBulletCompletion } from './tasks';

describe('bullet points', () => {
  it('drops empty items without misaligning completion flags', () => {
    expect(normalizeBulletPoints(['  a ', '', 'c'], [false, true, true])).toEqual({
      bulletPoints: ['a', 'c'],
      bulletPointCompleted: [false, true],
    });
  });

  it('pads and trims completion flags to the item count', () => {
    expect(alignBulletCompletion(['a', 'b'], [true])).toEqual([true, false]);
    expect(alignBulletCompletion(['a'], [true, true, true])).toEqual([true]);
    expect(alignBulletCompletion(['a'], undefined)).toEqual([false]);
  });

  it('toggles a single item', () => {
    expect(toggleBulletCompletion(['a', 'b'], [false, false], 0)).toEqual([true, false]);
    expect(toggleBulletCompletion(['a', 'b'], [true, false], 0)).toEqual([false, false]);
    expect(toggleBulletCompletion(['a', 'b'], undefined, 1)).toEqual([false, true]);
  });
});

describe('buildTaskTree', () => {
  const task = (id: number, parentId: number | null, completed = false) => ({
    id,
    parentId,
    completed,
  });

  it('keeps a finished subtask under its unfinished parent (was invisible before)', () => {
    const tree = buildTaskTree([task(1, null), task(2, 1, true)]);
    expect(tree.activeRoots.map((t) => t.id)).toEqual([1]);
    expect(tree.completedRoots).toEqual([]);
    expect(tree.childrenOf(1).map((t) => t.id)).toEqual([2]);
  });

  it('keeps an unfinished subtask under its finished parent', () => {
    const tree = buildTaskTree([task(1, null, true), task(2, 1)]);
    expect(tree.completedRoots.map((t) => t.id)).toEqual([1]);
    expect(tree.childrenOf(1).map((t) => t.id)).toEqual([2]);
  });

  it('treats a task whose parent is not loaded as top-level', () => {
    const tree = buildTaskTree([task(5, 99)]);
    expect(tree.activeRoots.map((t) => t.id)).toEqual([5]);
  });

  it('preserves server order', () => {
    const tree = buildTaskTree([task(3, null), task(1, null), task(2, null, true)]);
    expect(tree.activeRoots.map((t) => t.id)).toEqual([3, 1]);
    expect(tree.completedRoots.map((t) => t.id)).toEqual([2]);
  });
});
