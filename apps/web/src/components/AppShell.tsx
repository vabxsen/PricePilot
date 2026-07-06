import type { ComponentType, ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { signOutUser, useAuth } from "../lib/auth.js";
import { BottomNav } from "./BottomNav.js";
import {
  IconChart,
  IconGrid,
  IconHeart,
  IconLogout,
  IconPlus,
  IconSettings,
  IconTag,
} from "./ui/icons.js";

type IconType = ComponentType<{ size?: number; className?: string }>;

const navItems: { to: string; label: string; icon: IconType }[] = [
  { to: "/dashboard", label: "Dashboard", icon: IconGrid },
  { to: "/charts", label: "Charts", icon: IconChart },
  { to: "/products", label: "Products", icon: IconTag },
  { to: "/wishlist", label: "Wishlist", icon: IconHeart },
  { to: "/settings", label: "Settings", icon: IconSettings },
];

function sidebarLinkClass(isActive: boolean) {
  return `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-brand/10 text-brand" : "text-ink-muted hover:bg-surface-raised hover:text-ink"
  }`;
}

/** Persistent app shell: desktop sidebar + mobile top bar, bottom nav, and add FAB. */
export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const initial = (user?.displayName ?? user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-full">
      {/* Desktop sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-border/10 bg-surface/40 max-md:hidden">
        <Link to="/" className="flex items-center gap-2 px-5 py-5 font-semibold text-ink">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand text-bg shadow-glow">
            ✈
          </span>
          <span className="text-lg tracking-tight">PricePilot</span>
        </Link>

        <div className="px-3">
          <Link
            to="/add"
            className="flex items-center justify-center gap-2 rounded-md bg-brand px-3 py-2.5 text-sm font-semibold text-bg shadow-glow transition hover:bg-brand-hover"
          >
            <IconPlus size={18} /> Track a product
          </Link>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }: { isActive: boolean }) => sidebarLinkClass(isActive)}
            >
              <Icon size={18} />
              {label}
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
              <div className="truncate text-xs text-ink-faint">View settings</div>
            </div>
          </Link>
          <button
            onClick={() => signOutUser()}
            className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-faint transition hover:bg-surface-raised hover:text-ink"
          >
            <IconLogout size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/10 bg-bg/80 px-4 py-3 backdrop-blur md:hidden">
          <Link to="/" className="flex items-center gap-2 font-semibold text-ink">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brand text-bg">✈</span>
            <span className="text-lg">PricePilot</span>
          </Link>
          <Link
            to="/settings"
            aria-label="Settings"
            className="grid h-8 w-8 place-items-center rounded-full bg-surface-raised text-sm font-semibold text-ink"
          >
            {initial}
          </Link>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-10 md:pt-8 lg:px-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  );
}
