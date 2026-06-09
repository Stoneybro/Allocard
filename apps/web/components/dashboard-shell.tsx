"use client";

import type { ReactNode } from "react";
import {
  AppSidebar,
  type SidebarAgent,
  type SidebarEmployee,
} from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function DashboardShell({
  children,
  companyName,
  copiedInvite,
  eoaPending,
  employees,
  agents,
  inviteError,
  inviteLink,
  invitePending,
  onAddEmployee,
  onAddEoa,
  onCopyInvite,
  onCreateInvite,
  smartAccountLabel,
  title,
  roleLabel,
}: {
  children: ReactNode;
  companyName: string;
  copiedInvite?: boolean;
  eoaPending?: boolean;
  employees?: SidebarEmployee[];
  agents?: SidebarAgent[];
  inviteError?: string | null;
  inviteLink?: string | null;
  invitePending?: boolean;
  onAddEmployee?: (employeeId: string) => void;
  onAddEoa?: (input: { address: string; label: string }) => void;
  onCopyInvite?: () => void;
  onCreateInvite?: () => void;
  smartAccountLabel: string;
  title: string;
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
        copiedInvite={copiedInvite}
        eoaPending={eoaPending}
        employees={employees ?? []}
        agents={agents ?? []}
        inviteError={inviteError}
        inviteLink={inviteLink}
        invitePending={invitePending}
        onAddEmployee={onAddEmployee}
        onAddEoa={onAddEoa}
        onCopyInvite={onCopyInvite}
        onCreateInvite={onCreateInvite}
        roleLabel={roleLabel}
        smartAccountLabel={smartAccountLabel}
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
