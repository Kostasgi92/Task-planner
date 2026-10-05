import { TZDate } from '@date-fns/tz';
import { addDays, format, startOfDay } from 'date-fns';

/** Returns `timeZone` if it is a valid IANA zone, otherwise UTC. */
export function resolveTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return 'UTC';
  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return timeZone;
  } catch {
    return 'UTC';
  }
}

/** Start (inclusive) and end (exclusive) of the calendar day containing `now` in `timeZone`. */
export function dayBounds(now: Date, timeZone: string): { start: Date; end: Date } {
  const start = startOfDay(new TZDate(now.getTime(), timeZone));
  const end = addDays(start, 1);
  return { start: new Date(start.getTime()), end: new Date(end.getTime()) };
}

/** e.g. "Wednesday, 16 September" — used by the widget summary. */
export function formatWidgetDateLabel(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(now);
}

/** e.g. "Thursday, October 24" — the eyebrow above "My tasks". */
export function formatTodayEyebrow(now: Date): string {
  return now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** Human label for a deadline: "Today · 9:30 AM", "Tomorrow · …" or "Oct 5". */
export function formatDue(value: string | null, now: Date = new Date()): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const time = () => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (sameDay(date, now)) return `Today · ${time()}`;
  if (sameDay(date, tomorrow)) return `Tomorrow · ${time()}`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * ISO timestamp → value for `<input type="datetime-local">` in the browser's local time.
 * (Slicing the ISO string, as the old app did, shows UTC and shifts the time on every save.)
 */
export function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

/** `<input type="datetime-local">` value (local time) → ISO timestamp, or null when empty. */
export function fromDateTimeLocalValue(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function isOverdue(
  task: { dueAt: string | null; completed: boolean },
  now: Date = new Date(),
): boolean {
  return task.dueAt !== null && !task.completed && new Date(task.dueAt) < now;
}
