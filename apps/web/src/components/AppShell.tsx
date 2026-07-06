import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { signOutUser, useAuth } from "../lib/auth.js";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/add", label: "Add product" },
];

function navLinkClass(isActive: boolean) {
  return `rounded-md px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-brand/10 text-brand" : "text-ink-muted hover:bg-surface-raised hover:text-ink"
  }`;
}

/** Persistent sidebar shell for the authenticated app (Dashboard/Add/Product/Settings). */
export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const initial = (user?.displayName ?? user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border/10 bg-surface/40 max-md:hidden">
        <Link to="/" className="flex items-center gap-2 px-5 py-5 font-semibold text-ink">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand text-bg shadow-glow">
            ✈
          </span>
          <span className="text-lg tracking-tight">PricePilot</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => navLinkClass(isActive)}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border/10 p-3">
          <Link
            to="/settings"
            className="flex items-center gap-2 rounded-md px-2 py-2 transition hover:bg-surface-raised"
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-raised text-sm font-semibold text-ink">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-ink">{user?.displayName ?? user?.email}</div>
              <div className="truncate text-xs text-ink-faint">Settings</div>
            </div>
          </Link>
          <button
            onClick={() => signOutUser()}
            className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm text-ink-faint transition hover:bg-surface-raised hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border/10 px-4 py-3 md:hidden">
          <Link to="/" className="flex items-center gap-2 font-semibold text-ink">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brand text-bg">✈</span>
            <span className="text-lg">PricePilot</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? "text-brand" : "text-ink-muted")}
              >
                {item.label}
              </NavLink>
            ))}
            <NavLink
              to="/settings"
              className={({ isActive }) => (isActive ? "text-brand" : "text-ink-muted")}
            >
              Settings
            </NavLink>
            <button onClick={() => signOutUser()} className="text-ink-faint">
              Sign out
            </button>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>

        <footer className="border-t border-border/10 px-4 py-6 text-center text-sm text-ink-faint">
          PricePilot
        </footer>
      </div>
    </div>
  );
}
