"use client";

import React, { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, FileQuestion } from "lucide-react";
import type { Role } from "@/lib/types";
import { useDemo } from "@/components/demo-store";
import { AppShell, PublicShell, titleForPath } from "@/components/shell";
import { PublicPage } from "@/components/public-pages";
import { CitizenDashboard, CitizenGrievanceDetail, CitizenGrievanceList, NewGrievanceForm, ProfileScreen } from "@/components/citizen-screens";
import { StaffDashboard, StaffQueue, StaffWorkbench, StaffContractorDirectory } from "@/components/staff-screens";
import { ContractorDashboard, ContractorOnboarding, ContractorOpportunities, ContractorOpportunityDetail, ContractorBids, ContractorWorkOrders, ContractorWorkOrderDetail } from "@/components/contractor-screens";
import { AdminDashboard, AdminContractorVerification, AdminUsers, AdminGrievances, AdminProfile } from "@/components/admin-screens";
import { Skeleton } from "@/components/ui";

const homeForRole: Record<Role, string> = {
  citizen: "/dashboard/citizen",
  staff: "/dashboard/staff",
  contractor: "/dashboard/contractor",
  admin: "/admin"
};

function requiredRole(pathname: string): Role | null {
  if (pathname.startsWith("/dashboard/citizen/")) return "citizen";
  if (pathname.startsWith("/dashboard/staff/")) return "staff";
  if (pathname.startsWith("/dashboard/contractor/")) return "contractor";
  if (pathname.startsWith("/admin/")) return "admin";
  if (["/dashboard/citizen", "/dashboard/staff", "/dashboard/contractor", "/admin"].includes(pathname)) {
    if (pathname === "/dashboard/citizen") return "citizen";
    if (pathname === "/dashboard/staff") return "staff";
    if (pathname === "/dashboard/contractor") return "contractor";
    return "admin";
  }
  return null;
}

function isPublicRoute(pathname: string) {
  return ["/", "/login", "/register", "/verify", "/forgot-password", "/reset-password", "/thank-you", "/404"].includes(pathname);
}

function AppLoading() {
  return <div className="app-loading"><span className="brand-mark" aria-hidden="true"><span /><span /><span /></span><span className="app-loading-copy">Loading NagarSaathi demo</span><Skeleton className="app-loading-line" /></div>;
}

function ProtectedNotFound({ role }: { role: Role }) {
  return <div className="protected-not-found"><div className="not-found-symbol"><FileQuestion size={25} /></div><p className="eyebrow">Page not found</p><h1 tabIndex={-1}>That page isn’t available.</h1><p>The link may be out of date or not part of this role’s workspace.</p><Link className="button button-outline button-md" href={homeForRole[role]}><ArrowLeft size={15} />Back to your workspace</Link></div>;
}

export default function AppRouter() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { ready, role, currentUser, contractorProfile } = useDemo();
  const protectedRole = useMemo(() => requiredRole(pathname), [pathname]);

  useEffect(() => {
    const title = titleForPath(pathname);
    document.title = `${title} · NagarSaathi`;
  }, [pathname]);

  useEffect(() => {
    if (!ready) return;
    const isPublic = isPublicRoute(pathname);
    const protectedPath = pathname.startsWith("/dashboard/") || pathname.startsWith("/admin");
    if (protectedPath && !currentUser) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (protectedPath && role && !protectedRole) {
      router.replace(homeForRole[role]);
      return;
    }
    if (protectedRole && role && protectedRole !== role) {
      router.replace(homeForRole[role]);
      return;
    }
    if (role && (pathname === "/login" || pathname === "/register")) {
      const allowDemoPicker = pathname === "/login" && new URLSearchParams(window.location.search).get("demo") === "1";
      if (!allowDemoPicker) router.replace(homeForRole[role]);
      return;
    }
    if (role === "contractor" && !contractorProfile && pathname === "/dashboard/contractor") {
      router.replace("/dashboard/contractor/onboarding");
      return;
    }
    if (role === "contractor" && pathname.startsWith("/dashboard/contractor/") && contractorProfile?.status !== "approved") {
      const allowed = ["/dashboard/contractor/onboarding", "/dashboard/contractor/profile"];
      if (!allowed.includes(pathname)) router.replace("/dashboard/contractor/onboarding");
    }
    if (!isPublic && !protectedPath) return;
  }, [ready, currentUser, role, protectedRole, pathname, router, contractorProfile?.status]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      const heading = document.querySelector<HTMLElement>("#main-content h1, .public-main h1");
      if (heading) {
        if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    }, 30);
    return () => window.clearTimeout(timer);
  }, [pathname, ready]);

  if (!ready && (pathname.startsWith("/dashboard/") || pathname.startsWith("/admin"))) return <AppLoading />;
  const protectedPath = pathname.startsWith("/dashboard/") || pathname.startsWith("/admin");
  if (isPublicRoute(pathname) || !protectedPath) return <PublicShell><PublicPage /></PublicShell>;
  if (!protectedRole || !currentUser || protectedRole !== role) return <AppLoading />;
  const pageTitle = titleForPath(pathname);
  return <AppShell role={protectedRole} userName={currentUser.name} title={pageTitle}>
    <RolePage role={protectedRole} pathname={pathname} />
  </AppShell>;
}

function RolePage({ role, pathname }: { role: Role; pathname: string }) {
  if (role === "citizen") {
    if (pathname === "/dashboard/citizen") return <CitizenDashboard />;
    if (pathname === "/dashboard/citizen/grievances") return <CitizenGrievanceList />;
    if (pathname === "/dashboard/citizen/grievances/new") return <NewGrievanceForm />;
    const detail = pathname.match(/^\/dashboard\/citizen\/grievances\/([^/]+)$/);
    if (detail) return <CitizenGrievanceDetail id={decodeURIComponent(detail[1])} />;
    if (pathname === "/dashboard/citizen/profile") return <ProfileScreen role="citizen" />;
  }
  if (role === "staff") {
    if (pathname === "/dashboard/staff") return <StaffDashboard />;
    if (pathname === "/dashboard/staff/queue" || pathname === "/dashboard/staff/grievances") return <StaffQueue />;
    const detail = pathname.match(/^\/dashboard\/staff\/grievances\/([^/]+)$/);
    if (detail) return <StaffWorkbench id={decodeURIComponent(detail[1])} />;
    if (pathname === "/dashboard/staff/contractors") return <StaffContractorDirectory />;
    if (pathname === "/dashboard/staff/profile") return <ProfileScreen role="staff" />;
  }
  if (role === "contractor") {
    if (pathname === "/dashboard/contractor") return <ContractorDashboard />;
    if (pathname === "/dashboard/contractor/onboarding") return <ContractorOnboarding />;
    if (pathname === "/dashboard/contractor/opportunities") return <ContractorOpportunities />;
    const opportunity = pathname.match(/^\/dashboard\/contractor\/opportunities\/([^/]+)$/);
    if (opportunity) return <ContractorOpportunityDetail id={decodeURIComponent(opportunity[1])} />;
    if (pathname === "/dashboard/contractor/bids") return <ContractorBids />;
    if (pathname === "/dashboard/contractor/work-orders") return <ContractorWorkOrders />;
    const workOrder = pathname.match(/^\/dashboard\/contractor\/work-orders\/([^/]+)$/);
    if (workOrder) return <ContractorWorkOrderDetail id={decodeURIComponent(workOrder[1])} />;
    if (pathname === "/dashboard/contractor/profile") return <ProfileScreen role="contractor" />;
  }
  if (role === "admin") {
    if (pathname === "/admin") return <AdminDashboard />;
    if (pathname === "/admin/contractors") return <AdminContractorVerification />;
    if (pathname === "/admin/users") return <AdminUsers />;
    if (pathname === "/admin/grievances") return <AdminGrievances />;
    if (pathname === "/admin/profile") return <AdminProfile />;
  }
  return <ProtectedNotFound role={role} />;
}
