import { ListTodo } from 'lucide-react';
import { Link } from 'wouter';
import { Brand } from '@/components/layout/Brand';

function PreviewRow({ widths }: { widths: string[] }) {
  const [title, ...details] = widths;
  return (
    <div className="rounded-2xl border border-border/70 p-4">
      <div className="flex items-center gap-3">
        <span className="size-6 rounded-full border-2 border-muted-foreground/40" />
        <div className={`h-3 ${title} rounded-full bg-muted`} />
      </div>
      {details.length > 0 && (
        <div className="mt-3 ml-9 flex gap-2">
          {details.map((width) => (
            <span key={width} className={`h-2 ${width} rounded-full bg-muted/70`} />
          ))}
        </div>
      )}
    </div>
  );
}

export function LandingPage() {
  return (
    <main className="tasknest-grain flex min-h-[100dvh] flex-col px-6 py-7 text-foreground sm:px-10">
      <Brand />
      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center py-16">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[.24em] text-muted-foreground">
              A calmer task space
            </p>
            <h1 className="max-w-xl font-serif text-6xl leading-[.94] tracking-[-.06em] sm:text-8xl">
              Keep your day in its place.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
              TaskNest keeps your lists, details, deadlines, and reminders together — privately, under your
              own account.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                data-testid="link-sign-up"
                className="inline-flex min-h-12 items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5"
              >
                Create your nest
              </Link>
              <Link
                href="/sign-in"
                data-testid="link-sign-in"
                className="inline-flex min-h-12 items-center rounded-xl border border-border bg-card px-5 text-sm font-bold transition hover:bg-muted"
              >
                Sign in
              </Link>
            </div>
          </div>
          <div
            aria-hidden
            className="rounded-[32px] border border-border/80 bg-card p-5 shadow-[0_22px_60px_rgba(37,37,37,.08)] sm:p-7"
          >
            <div className="mb-7 flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">
                  Your private space
                </p>
                <p className="mt-2 font-serif text-3xl tracking-[-.04em]">One list at a time.</p>
              </div>
              <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                <ListTodo size={22} />
              </span>
            </div>
            <div className="space-y-3">
              <PreviewRow widths={['w-40', 'w-56']} />
              <PreviewRow widths={['w-32', 'w-28', 'w-20']} />
              <PreviewRow widths={['w-48']} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
