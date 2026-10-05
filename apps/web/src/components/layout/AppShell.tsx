import { Home, Menu, Plus, Settings, Sparkles } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useCategories, useHealth } from '@/app/api';
import { cx } from '@/lib/cn';
import { AccountMenu } from './AccountMenu';
import { Brand } from './Brand';
import { BottomNav, CategoryDot, NavItem } from './Nav';

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: health } = useHealth();
  const { data: categories = [] } = useCategories();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="tasknest-grain min-h-[100dvh] text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-sidebar px-5 py-7 text-sidebar-foreground lg:flex">
        <Brand />
        <nav className="mt-12" aria-label="Workspace">
          <p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[.24em] text-sidebar-foreground/45">
            Workspace
          </p>
          <NavItem
            href="/"
            active={location === '/'}
            icon={<Home size={17} />}
            label="My tasks"
            testId="link-my-tasks"
          />
          <NavItem
            href="/settings"
            active={location === '/settings'}
            icon={<Settings size={17} />}
            label="Settings"
            testId="link-settings"
          />
        </nav>
        <nav className="mt-10" aria-label="Categories">
          <div className="mb-3 flex items-center justify-between px-3">
            <p className="font-mono text-[10px] uppercase tracking-[.24em] text-sidebar-foreground/45">
              Categories
            </p>
            <Link
              href="/settings"
              data-testid="link-add-category"
              aria-label="Add category"
              className="text-sidebar-foreground/50 transition hover:text-sidebar-primary"
            >
              <Plus size={15} />
            </Link>
          </div>
          <div className="space-y-1">
            {categories.slice(0, 6).map((category) => (
              <NavItem
                key={category.id}
                href={`/category/${category.id}`}
                active={location === `/category/${category.id}`}
                icon={<CategoryDot color={category.color} />}
                label={category.name}
                suffix={`${category.taskCount - category.completedCount}`}
                testId={`link-category-${category.id}`}
              />
            ))}
            {!categories.length && (
              <p className="px-3 text-xs leading-5 text-sidebar-foreground/45">
                Your categories will live here.
              </p>
            )}
          </div>
        </nav>
        <div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-4">
          <div className="mb-3 flex items-center gap-2 text-sidebar-primary">
            <Sparkles size={15} />
            <span className="font-mono text-[10px] uppercase tracking-widest">Ready when you are</span>
          </div>
          <p className="text-sm leading-5 text-sidebar-foreground/70">A small list is still a good list.</p>
        </div>
        <div
          data-testid="status-health"
          className="mt-4 flex items-center gap-2 px-3 text-[10px] text-sidebar-foreground/40"
        >
          <span
            className={cx(
              'size-1.5 rounded-full',
              health?.status === 'ok' ? 'bg-emerald-400' : 'bg-sidebar-foreground/30',
            )}
          />{' '}
          {health?.status === 'ok' ? 'Synced' : 'Checking sync'}
        </div>
      </aside>

      <main className="min-h-[100dvh] lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[70px] items-center justify-between border-b border-border/60 bg-background/90 px-5 backdrop-blur-md sm:px-9">
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="button-open-menu"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
              className="grid size-10 place-items-center rounded-full border border-border lg:hidden"
            >
              <Menu size={18} />
            </button>
            <div className="lg:hidden">
              <Brand compact />
            </div>
            <div className="hidden font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground sm:block">
              Personal task space
            </div>
          </div>
          <AccountMenu />
        </header>

        {menuOpen && (
          // biome-ignore lint/a11y/noStaticElementInteractions: backdrop; Escape also closes it
          // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop; Escape also closes it
          <div className="fixed inset-0 z-20 bg-sidebar/30 lg:hidden" onClick={closeMenu}>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: stops backdrop clicks */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: stops backdrop clicks */}
            <div
              className="min-h-full w-[280px] bg-sidebar px-5 py-7 text-sidebar-foreground"
              onClick={(event) => event.stopPropagation()}
            >
              <Brand />
              <div className="mt-12">
                <NavItem
                  href="/"
                  active={location === '/'}
                  icon={<Home size={17} />}
                  label="My tasks"
                  testId="mobile-link-home"
                  onNavigate={closeMenu}
                />
                <NavItem
                  href="/settings"
                  active={location === '/settings'}
                  icon={<Settings size={17} />}
                  label="Settings"
                  testId="mobile-link-settings"
                  onNavigate={closeMenu}
                />
              </div>
              <p className="mb-3 mt-10 px-3 font-mono text-[10px] uppercase tracking-[.24em] text-sidebar-foreground/45">
                Categories
              </p>
              {categories.map((category) => (
                <NavItem
                  key={category.id}
                  href={`/category/${category.id}`}
                  active={location === `/category/${category.id}`}
                  icon={<CategoryDot color={category.color} />}
                  label={category.name}
                  testId={`mobile-link-category-${category.id}`}
                  onNavigate={closeMenu}
                />
              ))}
            </div>
          </div>
        )}
        {children}
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 flex h-[76px] items-center justify-around border-t border-border/70 bg-card/95 px-8 backdrop-blur-lg lg:hidden">
        <BottomNav
          href="/"
          active={location === '/'}
          icon={<Home size={19} />}
          label="Tasks"
          testId="bottom-nav-tasks"
        />
        <BottomNav
          href="/settings"
          active={location === '/settings'}
          icon={<Settings size={19} />}
          label="Settings"
          testId="bottom-nav-settings"
        />
      </nav>
    </div>
  );
}
