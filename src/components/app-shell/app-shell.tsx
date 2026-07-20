"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  BarChart3,
  Columns3,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/lib/actions/auth";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: "/candidates", label: "Кандидати", icon: Users },
  { href: "/dashboard", label: "Дашборд", icon: BarChart3 },
  { href: "/board", label: "Канбан", icon: Columns3 },
  { href: "/settings", label: "Налаштування", icon: Settings, adminOnly: true },
];

export function AppShell({
  user,
  children,
}: {
  user: { name?: string | null; email?: string | null; role: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = NAV.filter((i) => !i.adminOnly || user.role === "ADMIN");

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex sticky top-0 h-screen flex-col bg-rail text-rail-ink">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-white/5">
          <Brand />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive(item.href)
                  ? "bg-rail-active text-rail-active-ink font-medium"
                  : "text-rail-ink hover:bg-white/5 hover:text-rail-active",
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
        <UserFooter user={user} />
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-rail text-rail-ink">
        <Brand />
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="Вийти"
            className="rounded-md p-2 text-rail-ink hover:bg-white/5 hover:text-rail-active"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </form>
      </header>

      {/* Main */}
      <main className="min-w-0 pb-20 lg:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex border-t border-border bg-surface">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px]",
              isActive(item.href)
                ? "text-ink font-medium"
                : "text-ink-faint",
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-rail-active text-rail">
        <svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 4h7a4 4 0 0 1 0 8H4z" />
          <path d="M4 12l9 8" />
          <path d="M4 4v16" />
        </svg>
      </span>
      <span className="font-semibold tracking-tight text-rail-active">REX</span>
    </div>
  );
}

function UserFooter({
  user,
}: {
  user: { name?: string | null; role: string };
}) {
  return (
    <div className="border-t border-white/5 p-3">
      <div className="flex items-center gap-3 px-2 py-1.5">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-rail-active text-sm font-medium">
          {(user.name ?? "?").slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-rail-active">{user.name}</p>
          <p className="eyebrow">
            {user.role === "ADMIN" ? "Адміністратор" : "Рекрутер"}
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="Вийти"
            className="rounded-md p-2 text-rail-ink-soft hover:bg-white/5 hover:text-rail-active"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </form>
      </div>
    </div>
  );
}
