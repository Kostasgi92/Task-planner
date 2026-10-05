import { Link } from 'wouter';

export function NotFound() {
  return (
    <div className="mx-auto max-w-[920px] px-5 pb-28 pt-16 text-center sm:px-9">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[.24em] text-muted-foreground">404</p>
      <h1 className="font-serif text-[38px] leading-none tracking-[-.045em]">This page wandered off.</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
        The link may be old or mistyped. Your tasks are right where you left them.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
      >
        Back to my tasks
      </Link>
    </div>
  );
}
