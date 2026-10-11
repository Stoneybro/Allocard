"use client";

import type { ReactNode } from "react";
import type { WorkspaceOption } from "@/app/actions/identity";
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
  companyId,
  workspaceOptions,
  onWorkspaceChange,
  employees,
  agents,
  onAddEmployee,
  onSelectAgent,
  onRefreshEmployees,
  employeesRefreshing,
  role,
  smartAccountLabel,
  smartAccountAddress,
  employeeReferenceId,
  title,
  roleLabel,
}: {
  children: ReactNode;
  companyName: string;
  companyId?: string;
  workspaceOptions?: WorkspaceOption[];
  onWorkspaceChange?: (companyId: string, role: "employer" | "employee") => void;
  employees?: SidebarEmployee[];
  agents?: SidebarAgent[];
  onAddEmployee?: (employeeId: string) => void;
  onSelectAgent?: (agentId: string) => void;
  onRefreshEmployees?: () => void;
  employeesRefreshing?: boolean;
  role?: "employer" | "employee";
  smartAccountLabel: string;
  smartAccountAddress?: string | null;
  employeeReferenceId?: string;
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
        companyId={companyId ?? ""}
        workspaceOptions={workspaceOptions ?? []}
        onWorkspaceChange={onWorkspaceChange}
        employees={employees ?? []}
        agents={agents ?? []}
        onAddEmployee={onAddEmployee}
        onSelectAgent={onSelectAgent}
        onRefreshEmployees={onRefreshEmployees}
        employeesRefreshing={employeesRefreshing}
        role={role}
        roleLabel={roleLabel}
        smartAccountLabel={smartAccountLabel}
        smartAccountAddress={smartAccountAddress}
        employeeReferenceId={employeeReferenceId}
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
