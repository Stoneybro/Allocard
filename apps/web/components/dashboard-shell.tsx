"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function DashboardShell({
  children,
  companyName,
  title,
  walletAddress,
  roleLabel,
}: {
  children: ReactNode;
  companyName: string;
  title: string;
  walletAddress: string;
  roleLabel: string;
}) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        companyName={companyName}
        walletAddress={walletAddress}
        roleLabel={roleLabel}
      />
      <SidebarInset className="h-dvh overflow-hidden">
        <SiteHeader title={title} />
        <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
