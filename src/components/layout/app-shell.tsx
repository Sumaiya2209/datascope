"use client";

import {
  ArrowUpRight,
  BarChart3,
  Database,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  Search,
  Settings2,
  Shield,
  X,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

const workspaceRoutes = [
  "/overview",
  "/explorer",
  "/analytics",
  "/settings",
  "/admin",
];

const primaryNavigation = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/explorer", label: "Data explorer", icon: Database },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

function isWorkspacePath(pathname: string) {
  return workspaceRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/admin/datasets")) return "Dataset management";
  if (pathname.startsWith("/admin/users")) return "User management";
  if (pathname.startsWith("/settings")) return "Preferences";
  if (pathname.startsWith("/analytics")) return "Analytics";
  if (pathname.startsWith("/explorer")) return "Data explorer";
  return "Overview";
}

function UserIdentity({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: string;
}) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">
        {initials || "U"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-slate-800">
          {name}
        </span>
        <span className="block truncate text-[10px] text-slate-500">
          {role || email}
        </span>
      </span>
    </div>
  );
}

function SidebarContent({
  pathname,
  role,
  name,
  email,
  onNavigate,
}: {
  pathname: string;
  role: string;
  name: string;
  email: string;
  onNavigate?: () => void;
}) {
  const isAdmin = role === "admin";

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[60px] items-center gap-2.5 border-b border-slate-200 px-4">
        <Link
          aria-label="DataScope home"
          className="flex size-8 items-center justify-center rounded-md bg-slate-950 text-white"
          href="/"
          onClick={onNavigate}
        >
          <Database aria-hidden="true" size={17} strokeWidth={2.2} />
        </Link>
        <Link
          className="min-w-0 flex-1 text-[14px] font-semibold tracking-tight text-slate-950"
          href="/overview"
          onClick={onNavigate}
        >
          DataScope
        </Link>
      </div>

      <div className="border-b border-slate-200 px-3 py-3">
        <div className="flex w-full items-center gap-2.5 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-left">
          <span className="flex size-7 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-600">
            <Database aria-hidden="true" size={14} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[11px] font-medium text-slate-800">
              Primary workspace
            </span>
            <span className="mt-0.5 block truncate text-[10px] text-slate-500">
              Organization
            </span>
          </span>
        </div>
      </div>

      <nav
        aria-label="Workspace navigation"
        className="flex-1 overflow-y-auto px-3 py-4"
      >
        <p className="px-2 pb-2 text-[9px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
          Workspace
        </p>
        <ul className="space-y-0.5">
          {primaryNavigation.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== "/overview" && pathname.startsWith(`${href}/`));
            return (
              <li key={href}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`flex h-9 items-center gap-2.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-slate-200/80 text-slate-950"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                  href={href}
                  onClick={onNavigate}
                >
                  <Icon aria-hidden="true" size={15} strokeWidth={1.8} />
                  <span className="flex-1">{label}</span>
                  {active && (
                    <span className="size-1.5 rounded-full bg-teal-700" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="px-2 pt-6 pb-2 text-[9px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
          Personal
        </p>
        <ul className="space-y-0.5">
          <li>
            <Link
              aria-current={
                pathname.startsWith("/settings") ? "page" : undefined
              }
              className={`flex h-9 items-center gap-2.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
                pathname.startsWith("/settings")
                  ? "bg-slate-200/80 text-slate-950"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
              href="/settings"
              onClick={onNavigate}
            >
              <Settings2 aria-hidden="true" size={15} strokeWidth={1.8} />
              Preferences
            </Link>
          </li>
        </ul>

        {isAdmin && (
          <>
            <p className="px-2 pt-6 pb-2 text-[9px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
              Administration
            </p>
            <ul className="space-y-0.5">
              {[
                { href: "/admin/datasets", label: "Datasets" },
                { href: "/admin/users", label: "Users" },
              ].map(({ href, label }) => {
                const active = pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={`flex h-9 items-center gap-2.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
                        active
                          ? "bg-slate-200/80 text-slate-950"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                      }`}
                      href={href}
                      onClick={onNavigate}
                    >
                      <Shield aria-hidden="true" size={15} strokeWidth={1.8} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center justify-between gap-2 px-1 py-2">
          <UserIdentity email={email} name={name} role={role} />
          <button
            aria-label="Sign out"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
            onClick={() => void signOut({ callbackUrl: "/" })}
            title="Sign out"
            type="button"
          >
            <LogOut aria-hidden="true" size={15} />
          </button>
        </div>
        <div className="mt-1 flex items-center gap-1.5 px-1 text-[10px] text-slate-500">
          <Shield aria-hidden="true" className="text-slate-400" size={12} />
          Role-based access
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!isWorkspacePath(pathname)) {
    return children;
  }

  const name = session?.user?.name || session?.user?.email || "Workspace user";
  const email = session?.user?.email || "";
  const role = session?.user?.role || "member";
  const title = getPageTitle(pathname);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-950">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 border-r border-slate-200 bg-slate-50 lg:block">
        <SidebarContent
          email={email}
          name={name}
          pathname={pathname}
          role={role}
        />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setMobileOpen(false)}
            type="button"
          />
          <aside className="relative z-10 h-full w-[min(84vw,280px)] border-r border-slate-200 bg-slate-50 shadow-xl">
            <button
              aria-label="Close menu"
              className="absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
              onClick={() => setMobileOpen(false)}
              type="button"
            >
              <X aria-hidden="true" size={17} />
            </button>
            <SidebarContent
              email={email}
              name={name}
              onNavigate={() => setMobileOpen(false)}
              pathname={pathname}
              role={role}
            />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[60px] shrink-0 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8 dark:bg-slate-900">
          <button
            aria-expanded={mobileOpen}
            aria-label="Open navigation menu"
            className="flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
            onClick={() => setMobileOpen(true)}
            type="button"
          >
            <Menu aria-hidden="true" size={17} />
          </button>
          <PanelLeftClose
            aria-hidden="true"
            className="hidden text-slate-400 lg:block"
            size={16}
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[13px] font-semibold text-slate-800">
              {title}
            </h1>
          </div>
          <Link
            className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 px-2.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950 sm:px-3"
            href="/explorer"
          >
            <Search aria-hidden="true" size={13} />
            <span className="hidden sm:inline">Search records</span>
            <span className="sm:hidden">Search</span>
          </Link>
          <span className="hidden h-5 w-px bg-slate-200 sm:block" />
          <span className="hidden items-center gap-1.5 text-[10px] text-slate-500 sm:inline-flex">
            Workspace
          </span>
          <Link
            aria-label="Open DataScope home"
            className="ml-1 flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            href="/"
          >
            <ArrowUpRight aria-hidden="true" size={16} />
          </Link>
        </header>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
