import { describe, expect, it } from 'vitest';
import {
  dayBounds,
  formatWidgetDateLabel,
  fromDateTimeLocalValue,
  isOverdue,
  resolveTimeZone,
  toDateTimeLocalValue,
} from './dates';

describe('resolveTimeZone', () => {
  it('accepts valid IANA zones and falls back to UTC', () => {
    expect(resolveTimeZone('Europe/Athens')).toBe('Europe/Athens');
    expect(resolveTimeZone('Not/AZone')).toBe('UTC');
    expect(resolveTimeZone(undefined)).toBe('UTC');
    expect(resolveTimeZone('')).toBe('UTC');
  });
});

describe('dayBounds', () => {
  it('uses the user time zone, not the server one', () => {
    // 23:30 UTC on Oct 4 is already 02:30 on Oct 5 in Athens (UTC+3, summer time).
    const now = new Date('2026-10-04T23:30:00Z');
    const athens = dayBounds(now, 'Europe/Athens');
    expect(athens.start.toISOString()).toBe('2026-10-04T21:00:00.000Z');
    expect(athens.end.toISOString()).toBe('2026-10-05T21:00:00.000Z');

    const utc = dayBounds(now, 'UTC');
    expect(utc.start.toISOString()).toBe('2026-10-04T00:00:00.000Z');
  });

  it('handles days that are 23 hours long (DST change)', () => {
    const { start, end } = dayBounds(new Date('2026-03-29T12:00:00Z'), 'Europe/Athens');
    expect(end.getTime() - start.getTime()).toBe(23 * 60 * 60 * 1000);
  });
});

describe('formatWidgetDateLabel', () => {
  it('formats in the given zone', () => {
    const label = formatWidgetDateLabel(new Date('2026-09-15T22:30:00Z'), 'Europe/Athens');
    expect(label).toMatch(/^Wednesday,? 16 September$/);
  });
});

describe('datetime-local conversion', () => {
  it('round-trips without shifting the time', () => {
    const local = '2030-04-05T09:30';
    const iso = fromDateTimeLocalValue(local);
    expect(iso).not.toBeNull();
    expect(toDateTimeLocalValue(iso)).toBe(local);
    // Saving again must not drift.
    expect(toDateTimeLocalValue(fromDateTimeLocalValue(toDateTimeLocalValue(iso)))).toBe(local);
  });

  it('treats empty values as no date', () => {
    expect(fromDateTimeLocalValue('')).toBeNull();
    expect(toDateTimeLocalValue(null)).toBe('');
  });
});

describe('isOverdue', () => {
  const now = new Date('2026-10-05T12:00:00Z');
  it('is true only for unfinished tasks past their deadline', () => {
    expect(isOverdue({ dueAt: '2026-10-05T11:00:00Z', completed: false }, now)).toBe(true);
    expect(isOverdue({ dueAt: '2026-10-05T11:00:00Z', completed: true }, now)).toBe(false);
    expect(isOverdue({ dueAt: '2026-10-05T13:00:00Z', completed: false }, now)).toBe(false);
    expect(isOverdue({ dueAt: null, completed: false }, now)).toBe(false);
  });
});
