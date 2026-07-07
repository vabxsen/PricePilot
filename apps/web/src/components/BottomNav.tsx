import type { ComponentType } from "react";
import { NavLink } from "react-router-dom";
import { IconChart, IconGrid, IconHeart, IconSettings, IconTag } from "./ui/icons.js";

type IconType = ComponentType<{ size?: number; className?: string }>;

const tabs: { to: string; label: string; icon: IconType }[] = [
  { to: "/dashboard", label: "Dashboard", icon: IconGrid },
  { to: "/charts", label: "Charts", icon: IconChart },
  { to: "/products", label: "Products", icon: IconTag },
  { to: "/wishlist", label: "Wishlist", icon: IconHeart },
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
            className="group relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium"
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full transition-all duration-300 ${
                    isActive
                      ? "scale-100 bg-brand/15 text-brand"
                      : "scale-90 text-ink-faint group-hover:text-ink-muted"
                  }`}
                >
                  <Icon size={16} />
                </span>
                <span
                  className={`transition-colors duration-200 ${
                    isActive ? "text-brand" : "text-ink-faint group-hover:text-ink-muted"
                  }`}
                >
                  {label}
                </span>
                <span
                  className={`absolute bottom-0 h-0.5 w-0.5 rounded-full bg-brand transition-all duration-300 ${
                    isActive ? "scale-100 opacity-100" : "scale-0 opacity-0"
                  }`}
                />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
