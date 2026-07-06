import type { ComponentType } from "react";
import { NavLink } from "react-router-dom";
import { IconGrid, IconSettings, IconTag } from "./ui/icons.js";

type IconType = ComponentType<{ size?: number; className?: string }>;

const tabs: { to: string; label: string; icon: IconType }[] = [
  { to: "/dashboard", label: "Dashboard", icon: IconGrid },
  { to: "/products", label: "Products", icon: IconTag },
  { to: "/settings", label: "Settings", icon: IconSettings },
];

/**
 * Fixed mobile bottom navigation (hidden on md+, where the sidebar takes over).
 * Honors the iOS home-indicator safe area via padding-bottom.
 */
export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/10 bg-surface/90 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }: { isActive: boolean }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${
                isActive ? "text-brand" : "text-ink-faint hover:text-ink-muted"
              }`
            }
          >
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
