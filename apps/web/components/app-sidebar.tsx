"use client";

import * as React from "react";
import {
  BotIcon,
  Building2Icon,
  CopyIcon,
  LinkIcon,
  PlusIcon,
  UserRoundIcon,
  WalletCardsIcon,
} from "lucide-react";

import { NavUser } from "@/components/nav-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

export type SidebarEmployee = {
  id: string;
  label: string;
  detail: string;
};

export type SidebarAgent = {
  id: string;
  name: string;
  detail: string;
  isPlaceholder?: boolean;
};

function EmptySidebarItem({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-sidebar-border px-3 py-2 text-xs text-muted-foreground">
      {label}
    </div>
  );
}

function InvitePanel({
  copiedInvite,
  inviteError,
  inviteLink,
  invitePending,
  onCopyInvite,
  onCreateInvite,
}: {
  copiedInvite?: boolean;
  inviteError?: string | null;
  inviteLink?: string | null;
  invitePending?: boolean;
  onCopyInvite?: () => void;
  onCreateInvite?: () => void;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <LinkIcon />
        Invite
      </SidebarGroupLabel>
      <SidebarGroupContent className="flex flex-col gap-3">
        <Button onClick={onCreateInvite} disabled={invitePending} size="sm">
          <PlusIcon data-icon="inline-start" />
          {invitePending ? "Creating..." : "Create invite"}
        </Button>
        {inviteLink ? (
          <div className="flex flex-col gap-2 rounded-md border border-sidebar-border bg-background/70 p-2">
            <p className="break-all font-mono text-xs text-muted-foreground">
              {inviteLink}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onCopyInvite}
              disabled={!onCopyInvite}
            >
              <CopyIcon data-icon="inline-start" />
              {copiedInvite ? "Copied" : "Copy link"}
            </Button>
          </div>
        ) : null}
        {inviteError ? (
          <p className="text-xs font-medium text-destructive">{inviteError}</p>
        ) : null}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function EmployeeList({
  employees,
  onAddEmployee,
}: {
  employees: SidebarEmployee[];
  onAddEmployee?: (employeeId: string) => void;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <UserRoundIcon />
        Employees
      </SidebarGroupLabel>
      <SidebarGroupContent>
        {employees.length === 0 ? (
          <EmptySidebarItem label="No employees have accepted an invite yet." />
        ) : (
          <SidebarMenu>
            {employees.map((employee) => (
              <SidebarMenuItem key={employee.id}>
                <SidebarMenuButton
                  tooltip={employee.label}
                  draggable
                  onClick={() => onAddEmployee?.(employee.id)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData(
                      "application/allocard-employee-id",
                      employee.id,
                    );
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                >
                  <UserRoundIcon />
                  <span>{employee.label}</span>
                </SidebarMenuButton>
                <div className="px-2 pb-2 text-xs text-muted-foreground">
                  {employee.detail}
                </div>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function EoaDelegationPanel({
  eoaPending,
  onAddEoa,
}: {
  eoaPending?: boolean;
  onAddEoa?: (input: { address: string; label: string }) => void;
}) {
  const [address, setAddress] = React.useState("");
  const [label, setLabel] = React.useState("");

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <WalletCardsIcon />
        External address
      </SidebarGroupLabel>
      <SidebarGroupContent className="flex flex-col gap-2">
        <Input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="0x..."
        />
        <Input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Label"
        />
        <Button
          size="sm"
          onClick={() => {
            onAddEoa?.({ address, label });
            setAddress("");
            setLabel("");
          }}
          disabled={eoaPending || !address.trim()}
        >
          <PlusIcon data-icon="inline-start" />
          {eoaPending ? "Adding..." : "Add address"}
        </Button>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function AgentList({ agents }: { agents: SidebarAgent[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <BotIcon />
        AI agents
      </SidebarGroupLabel>
      <SidebarGroupContent>
        {agents.length === 0 ? (
          <EmptySidebarItem label="Agent creation is not wired yet." />
        ) : (
          <SidebarMenu>
            {agents.map((agent) => (
              <SidebarMenuItem key={agent.id}>
                <SidebarMenuButton tooltip={agent.name}>
                  <BotIcon />
                  <span>{agent.name}</span>
                </SidebarMenuButton>
                <div className="flex items-center justify-between gap-2 px-2 pb-2 text-xs text-muted-foreground">
                  <span className="truncate">{agent.detail}</span>
                  {agent.isPlaceholder ? (
                    <Badge variant="outline">Demo</Badge>
                  ) : null}
                </div>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar({
  agents,
  companyName,
  copiedInvite,
  eoaPending,
  employees,
  inviteError,
  inviteLink,
  invitePending,
  onAddEmployee,
  onAddEoa,
  onCopyInvite,
  onCreateInvite,
  roleLabel,
  smartAccountLabel,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  agents: SidebarAgent[];
  companyName: string;
  copiedInvite?: boolean;
  eoaPending?: boolean;
  employees: SidebarEmployee[];
  inviteError?: string | null;
  inviteLink?: string | null;
  invitePending?: boolean;
  onAddEmployee?: (employeeId: string) => void;
  onAddEoa?: (input: { address: string; label: string }) => void;
  onCopyInvite?: () => void;
  onCreateInvite?: () => void;
  roleLabel: string;
  smartAccountLabel: string;
}) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <Building2Icon />
                <span className="text-base font-semibold">{companyName}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-2 rounded-md border border-sidebar-border px-2 py-2 text-xs text-muted-foreground">
          <WalletCardsIcon />
          <span className="truncate">{smartAccountLabel}</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <InvitePanel
          copiedInvite={copiedInvite}
          inviteError={inviteError}
          inviteLink={inviteLink}
          invitePending={invitePending}
          onCopyInvite={onCopyInvite}
          onCreateInvite={onCreateInvite}
        />
        <SidebarSeparator />
        <EmployeeList employees={employees} onAddEmployee={onAddEmployee} />
        <EoaDelegationPanel eoaPending={eoaPending} onAddEoa={onAddEoa} />
        {agents.length > 0 ? <AgentList agents={agents} /> : null}
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: roleLabel,
            smartAccountLabel,
            avatar: "/avatars/allocard.jpg",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
