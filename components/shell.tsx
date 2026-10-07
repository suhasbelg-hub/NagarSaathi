"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeftRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ClipboardList,
  FilePlus2,
  FileText,
  HardHat,
  LayoutDashboard,
  LogOut,
  Menu,
  RotateCcw,
  ShieldCheck,
  Users,
  X
} from "lucide-react";
import { ROLE_COPY } from "@/lib/mock-data";
import type { Role } from "@/lib/types";
import { Avatar, Button } from "@/components/ui";
import { useDemo } from "@/components/demo-store";

const NAVIGATION: Record<Role, { label: string; href: string; icon: React.ElementType; exact?: boolean }[]> = {
  citizen: [
    { label: "Overview", href: "/dashboard/citizen", icon: LayoutDashboard, exact: true },
    { label: "My grievances", href: "/dashboard/citizen/grievances", icon: FileText },
    { label: "File a grievance", href: "/dashboard/citizen/grievances/new", icon: FilePlus2 },
    { label: "My profile", href: "/dashboard/citizen/profile", icon: Users }
  ],
  staff: [
    { label: "Overview", href: "/dashboard/staff", icon: LayoutDashboard, exact: true },
    { label: "Triage queue", href: "/dashboard/staff/queue", icon: ClipboardList },
    { label: "Contractors", href: "/dashboard/staff/contractors", icon: BriefcaseBusiness },
    { label: "My profile", href: "/dashboard/staff/profile", icon: Users }
  ],
  contractor: [
    { label: "Overview", href: "/dashboard/contractor", icon: LayoutDashboard, exact: true },
    { label: "Opportunities", href: "/dashboard/contractor/opportunities", icon: BriefcaseBusiness },
    { label: "My bids", href: "/dashboard/contractor/bids", icon: FileText },
    { label: "Work orders", href: "/dashboard/contractor/work-orders", icon: ClipboardList },
    { label: "Business profile", href: "/dashboard/contractor/profile", icon: Building2 }
  ],
  admin: [
    { label: "Service health", href: "/admin", icon: Activity, exact: true },
    { label: "Verification queue", href: "/admin/contractors", icon: BadgeCheck },
    { label: "User directory", href: "/admin/users", icon: Users },
    { label: "Grievance oversight", href: "/admin/grievances", icon: FileText },
    { label: "My profile", href: "/admin/profile", icon: ShieldCheck }
  ]
};

export function Brand({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return <Link href="/" className={`brand ${compact ? "brand-compact" : ""} ${light ? "brand-light" : ""}`} aria-label="NagarSaathi home">
    <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
    <span className="brand-wordmark"><strong>NagarSaathi</strong>{!compact ? <small>Companion for Civic Change</small> : null}</span>
  </Link>;
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return <div className="public-shell">
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <header className="public-header">
      <div className="public-header-inner"><Brand />
        <nav aria-label="Public navigation" className="public-nav">
          <Link href="/login" className="public-login">Log in</Link>
          <Link href="/register" className="button button-primary button-md">Create an account</Link>
        </nav>
      </div>
    </header>
    <main id="main-content" className="public-main" tabIndex={-1}>{children}</main>
    <footer className="public-footer">
      <div className="public-footer-inner"><Brand compact />
        <p>Clear updates. Accountable civic service.</p>
        <span>NagarSaathi Municipal Civic Platform · Connected to Supabase</span>
      </div>
    </footer>
  </div>;
}

export function AppShell({ role, userName, title, children }: { role: Role; userName: string; title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { connection, clearSession } = useDemo();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileSheetRef = useRef<HTMLElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const nav = NAVIGATION[role];

  useEffect(() => {
    if (!mobileOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const sheet = mobileSheetRef.current;
    const focusable = () => Array.from(sheet?.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])") ?? []);
    window.setTimeout(() => focusable()[0]?.focus(), 0);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMobileOpen(false); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      previouslyFocused?.focus();
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointer = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", handlePointer);
    return () => window.removeEventListener("mousedown", handlePointer);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const timer = window.setTimeout(() => menuRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [menuOpen]);

  useEffect(() => setMobileOpen(false), [pathname]);

  const profileHref = role === "admin" ? "/admin/profile" : `/dashboard/${role}/profile`;
  const handleSignOut = () => {
    clearSession();
    setMenuOpen(false);
    router.push("/login");
  };

  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <aside className="desktop-sidebar" aria-label={`${ROLE_COPY[role].label} navigation`}>
      <div className="sidebar-brand"><Brand compact /></div>
      <div className="sidebar-context"><span className="context-label">WORKSPACE</span><div className="context-row"><span className="role-dot" aria-hidden="true" />{ROLE_COPY[role].label}</div></div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        <p className="nav-section-label">WORKSPACE</p>
        {nav.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return <Link href={item.href} key={item.href} className={`nav-link ${active ? "nav-link-active" : ""}`} aria-current={active ? "page" : undefined}>
            <Icon size={18} strokeWidth={1.9} aria-hidden="true" /><span>{item.label}</span>
          </Link>;
        })}
      </nav>
      {role === "contractor" ? <Link href="/dashboard/contractor/onboarding" className="sidebar-onboarding"><HardHat size={16} />Verification & onboarding</Link> : null}
      <div className="sidebar-spacer" />
      <div className="sidebar-note"><div className="sidebar-note-title"><ShieldCheck size={15} /> Secure Portal</div><p>Connected to Supabase PostgreSQL database with Row Level Security.</p></div>
      <div className="sidebar-footer"><span className="connection-dot" />Supabase Live Database</div>
    </aside>

    <div className="app-main-column">
      <header className="topbar">
        <button type="button" ref={mobileTriggerRef} className="icon-button mobile-menu-trigger" aria-label="Open navigation" aria-haspopup="dialog" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
        <div className="topbar-title"><span className="topbar-title-kicker">{ROLE_COPY[role].label} workspace</span><span className="topbar-title-main">{title}</span></div>
        <div className="topbar-actions">
          <div className="connection-pill connection-live" aria-label="Connected to live database">
            <span className="connection-dot" aria-hidden="true" /><span>Live DB</span>
          </div>
          <div className="user-menu-wrap" ref={menuRef}>
            <button type="button" ref={userMenuTriggerRef} className="user-menu-trigger" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
              <Avatar name={userName} size="sm" /><span className="user-menu-name">{userName}</span><ChevronDown size={15} aria-hidden="true" className={menuOpen ? "rotate-icon" : ""} />
            </button>
            {menuOpen ? <div className="user-menu" role="menu" aria-label="Account menu" onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
              const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[role='menuitem']"));
              const index = items.indexOf(document.activeElement as HTMLElement);
              if (event.key === "Escape") { event.preventDefault(); setMenuOpen(false); userMenuTriggerRef.current?.focus(); }
              else if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); const direction = event.key === "ArrowDown" ? 1 : -1; items[(index + direction + items.length) % items.length]?.focus(); }
              else if (event.key === "Home") { event.preventDefault(); items[0]?.focus(); }
              else if (event.key === "End") { event.preventDefault(); items[items.length - 1]?.focus(); }
            }}>
              <div className="user-menu-info"><strong>{userName}</strong><span>{ROLE_COPY[role].label}</span></div>
              <Link href={profileHref} role="menuitem" onClick={() => setMenuOpen(false)}>My profile</Link>
              <button type="button" role="menuitem" className="menu-signout" onClick={handleSignOut}><LogOut size={15} /> Sign out</button>
            </div> : null}
          </div>
        </div>
      </header>

      <main id="main-content" className="page-content" tabIndex={-1}>{children}</main>
    </div>

    {mobileOpen ? <div className="mobile-nav-layer">
      <button className="mobile-nav-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
      <section ref={mobileSheetRef} className="mobile-nav-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-nav-title">
        <div className="mobile-sheet-handle" aria-hidden="true" />
        <div className="mobile-sheet-head"><div><Brand compact /><p id="mobile-nav-title">{ROLE_COPY[role].label} workspace</p></div><button type="button" className="icon-button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={19} /></button></div>
        <nav aria-label="Mobile main navigation" className="mobile-sheet-links">
          {nav.map((item) => {
            const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} className={`nav-link mobile-nav-link ${active ? "nav-link-active" : ""}`} aria-current={active ? "page" : undefined} onClick={() => setMobileOpen(false)}><Icon size={19} /><span>{item.label}</span></Link>;
          })}
          {role === "contractor" ? <Link href="/dashboard/contractor/onboarding" className={`nav-link mobile-nav-link ${pathname.includes("onboarding") ? "nav-link-active" : ""}`} onClick={() => setMobileOpen(false)}><HardHat size={19} /><span>Verification & onboarding</span></Link> : null}
        </nav>
      </section>
    </div> : null}
  </div>;
}

export function titleForPath(path: string) {
  if (path === "/dashboard/citizen") return "Overview";
  if (path === "/dashboard/citizen/grievances") return "My grievances";
  if (path.endsWith("/grievances/new")) return "File a grievance";
  if (path.includes("/dashboard/citizen/grievances/")) return "Grievance details";
  if (path === "/dashboard/staff") return "Operations overview";
  if (path.endsWith("/staff/queue") || path === "/dashboard/staff/grievances") return "Triage queue";
  if (path.includes("/dashboard/staff/grievances/")) return "Grievance workbench";
  if (path.endsWith("/staff/contractors")) return "Approved contractors";
  if (path === "/dashboard/contractor") return "Overview";
  if (path.includes("/opportunities/") && path !== "/dashboard/contractor/opportunities") return "Opportunity details";
  if (path.endsWith("/contractor/opportunities")) return "Opportunities";
  if (path.endsWith("/contractor/bids")) return "My bids";
  if (path.endsWith("/contractor/work-orders")) return "Work orders";
  if (path.includes("/contractor/work-orders/")) return "Work order details";
  if (path.endsWith("/contractor/onboarding")) return "Verification & onboarding";
  if (path === "/admin") return "Service health";
  if (path === "/admin/contractors") return "Contractor verification";
  if (path === "/admin/users") return "User directory";
  if (path === "/admin/grievances") return "Grievance oversight";
  if (path.endsWith("/profile")) return "Profile";
  return "NagarSaathi";
}
