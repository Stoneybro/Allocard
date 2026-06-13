"use client";

import * as React from "react";
import { useWeb3AuthDisconnect } from "@web3auth/modal/react";
import {
  BotIcon,
  CheckIcon,
  CopyIcon,
  LinkIcon,
  LogOutIcon,
  MoreVerticalIcon,
  RefreshCwIcon,
  SparklesIcon,
  UserRoundIcon,
  UserPlusIcon,
  WalletIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenu,
  SidebarSeparator,
} from "@/components/ui/sidebar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Placeholder agents
// ---------------------------------------------------------------------------

const PLACEHOLDER_AGENTS: SidebarAgent[] = [
  {
    id: "placeholder-expense-reviewer",
    name: "Expense Reviewer",
    detail: "Flags out-of-policy spend automatically",
    isPlaceholder: true,
  },
  {
    id: "placeholder-budget-guard",
    name: "Budget Guard",
    detail: "Enforces period budgets across delegations",
    isPlaceholder: true,
  },
  {
    id: "placeholder-approval-bot",
    name: "Approval Bot",
    detail: "Routes high-value spend to the right approver",
    isPlaceholder: true,
  },
];

// ---------------------------------------------------------------------------
// Smart account address — copyable, monochrome
// ---------------------------------------------------------------------------

function SmartAccountAddress({ label, fullAddress, role }: { label: string; fullAddress?: string | null; role?: "employer" | "employee" }) {
  const [copied, setCopied] = React.useState(false);
  const isPending = label === "Smart account pending";

  const handleCopy = async () => {
    if (isPending) return;
    const textToCopy = fullAddress || label;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-1 px-1">
      <p className="px-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {role === "employee" ? "Employee Smart Account" : "Company Smart Account"}
      </p>
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/60 px-2.5 py-2">
        <WalletIcon className="size-3.5 shrink-0 text-foreground/50" />
        <span
          className={`min-w-0 flex-1 font-mono text-xs font-medium ${
            isPending ? "italic text-muted-foreground" : "text-foreground"
          }`}
        >
          {label}
        </span>
        {!isPending && (
          <button
            type="button"
            id="copy-smart-account-btn"
            aria-label={copied ? "Copied" : "Copy smart account address"}
            onClick={handleCopy}
            className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {copied ? (
              <CheckIcon className="size-3.5" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
          </button>
        )}
      </div>
      {isPending && (
        <p className="px-1 text-[10px] text-muted-foreground">
          Activate below to fund and enable delegations.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invite section
// ---------------------------------------------------------------------------

function InviteSection({
  copiedInvite,
  inviteLink,
  invitePending,
  onCopyInvite,
  onCreateInvite,
}: {
  copiedInvite?: boolean;
  inviteLink?: string | null;
  invitePending?: boolean;
  onCopyInvite?: () => void;
  onCreateInvite?: () => void;
}) {
  return (
    <div className="px-3 py-2">
      <Card className="shadow-sm border-border bg-card">
        <CardHeader className=" ">
          <CardTitle className="flex items-center gap-2 text-[13px] font-semibold text-foreground/80">
            <UserPlusIcon className="size-3.5" />
            Invite Employee
          </CardTitle>
          <CardDescription className="text-[11px] leading-snug">
            Send a one-time link to onboard a new employee to your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0 flex flex-col gap-2">
          {!inviteLink ? (
            <Button
              id="create-invite-btn"
              size="sm"
              variant="outline"
              onClick={onCreateInvite}
              disabled={invitePending}
              className="w-full gap-1.5 h-8 text-[11px]"
            >
              <LinkIcon className="size-3" />
              {invitePending ? "Generating…" : "Generate invite link"}
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-2 py-1.5 focus-within:ring-1 focus-within:ring-ring">
              <input
                readOnly
                value={inviteLink}
                className="flex-1 bg-transparent text-[11px] outline-none text-foreground min-w-0"
              />
              <button
                type="button"
                id="copy-invite-btn"
                aria-label={copiedInvite ? "Copied" : "Copy invite link"}
                onClick={onCopyInvite}
                disabled={!onCopyInvite}
                className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {copiedInvite ? (
                  <CheckIcon className="size-3.5 text-foreground" />
                ) : (
                  <CopyIcon className="size-3.5" />
                )}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Canvas section — employees + AI agents, each capped & scrollable
// ---------------------------------------------------------------------------

function CanvasSection({
  agents,
  employees,
  onAddEmployee,
  onRefreshEmployees,
  employeesRefreshing,
  onSelectAgent,
  role,
}: {
  agents: SidebarAgent[];
  employees: SidebarEmployee[];
  onAddEmployee?: (employeeId: string) => void;
  onRefreshEmployees?: () => void;
  employeesRefreshing?: boolean;
  onSelectAgent?: (agentId: string) => void;
  role?: "employer" | "employee";
}) {
  const displayAgents = agents.length > 0 ? agents : PLACEHOLDER_AGENTS;
  const hasLiveAgents = agents.length > 0;

  return (
    <SidebarGroup className="flex flex-col gap-0 pt-2">
      <SidebarGroupContent className="flex flex-col gap-4 px-2">
        {/* Hint */}
        {role !== "employee" && (
          <Alert className="py-2 px-3 bg-muted/50">
            <AlertDescription className="text-[11px] text-muted-foreground leading-snug">
              Drag and drop any employee or AI agent to the canvas to configure and activate a new delegation.
            </AlertDescription>
          </Alert>
        )}

        {/* ── Employees — employer only ──────────────────────────────── */}
        {role !== "employee" && (
          <div className="flex flex-col gap-1">
            {/* Sub-label row */}
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/70">
                <UserRoundIcon className="size-3" />
                Employees
              </span>
              <div className="flex items-center gap-1">
                {employees.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                    {employees.length}
                  </Badge>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={onRefreshEmployees}
                  disabled={!onRefreshEmployees || employeesRefreshing}
                  aria-label="Refresh employees"
                >
                  <RefreshCwIcon
                    data-icon="inline-start"
                    className={employeesRefreshing ? "animate-spin" : undefined}
                  />
                </Button>
              </div>
            </div>

            {/* Scrollable list — shows ~3 rows before scrolling */}
            {employees.length === 0 ? (
              <div className="flex items-center justify-center rounded-md border border-dashed border-border px-3 py-4">
                <p className="text-[11px] text-muted-foreground">
                  No employees yet — send an invite.
                </p>
              </div>
            ) : (
              <div className="relative">
                <div className="max-h-[9.5rem] overflow-y-auto rounded-md">
                  <SidebarMenu>
                    {employees.map((employee) => (
                      <SidebarMenuItem key={employee.id}>
                        <SidebarMenuButton
                          id={`recipient-${employee.id}`}
                          tooltip={`${employee.label} — drag to canvas`}
                          draggable
                          onClick={() => onAddEmployee?.(employee.id)}
                          onDragStart={(event) => {
                            event.dataTransfer.setData(
                              "application/allocard-employee-id",
                              employee.id,
                            );
                            event.dataTransfer.effectAllowed = "copy";
                          }}
                          className="h-auto cursor-grab py-2 active:cursor-grabbing"
                        >
                          <div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-foreground/70">
                            <UserRoundIcon className="size-3" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium leading-none">
                              {employee.label}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                              {employee.detail}
                            </p>
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </div>
                {/* Fade mask — signals overflow */}
                {employees.length > 3 && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 rounded-b-md bg-gradient-to-t from-sidebar to-transparent" />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── AI Agents ─────────────────────────────────────────────────── */}
        {role === "employee" ? (
          <>
            {/* System AI Agents */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/70">
                  <SparklesIcon className="size-3" />
                  System AI Agent
                </span>
              </div>
              <Alert className="py-2 px-3 bg-muted/50 mb-1">
                <AlertDescription className="text-[11px] text-muted-foreground leading-snug">
                  Click to open the reimbursement agent. Note: this agent cannot be dragged to the canvas.
                </AlertDescription>
              </Alert>
              <div className="relative">
                <div className="max-h-[9.5rem] overflow-y-auto rounded-md">
                  <SidebarMenu>
                    {displayAgents.filter(a => a.name === "Reimbursement Agent" || a.name.toLowerCase().includes("reimbursement")).map((agent) => (
                      <SidebarMenuItem key={agent.id}>
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <SidebarMenuButton
                              id={`agent-${agent.id}`}
                              tooltip={agent.isPlaceholder ? agent.detail : `Click to open ${agent.name}`}
                              draggable={false}
                              className={`h-auto py-2 ${
                                agent.isPlaceholder
                                  ? "cursor-default select-none opacity-50"
                                  : "cursor-pointer"
                              }`}
                              onClick={
                                !agent.isPlaceholder && onSelectAgent
                                  ? () => onSelectAgent(agent.id)
                                  : undefined
                              }
                            >
                              <div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-foreground/70">
                                <BotIcon className="size-3" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-medium leading-none">{agent.name}</p>
                                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{agent.detail}</p>
                              </div>
                            </SidebarMenuButton>
                          </HoverCardTrigger>
                          <HoverCardContent side="right" align="start" className="w-64 z-[100]">
                            <div className="flex flex-col gap-1.5">
                              <h4 className="text-sm font-semibold leading-none">{agent.name}</h4>
                              <p className="text-xs text-muted-foreground leading-relaxed">{agent.detail}</p>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </div>
              </div>
            </div>

            {/* Your AI Agents */}
            <div className="flex flex-col gap-1 mt-2">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/70">
                  <BotIcon className="size-3" />
                  Your AI Agents
                </span>
                {!hasLiveAgents && (
                  <Badge variant="outline" className="h-4 px-1.5 text-[10px]">Coming soon</Badge>
                )}
              </div>
              <Alert className="py-2 px-3 bg-muted/50 mb-1">
                <AlertDescription className="text-[11px] text-muted-foreground leading-snug">
                  Drag and drop any AI agent to the canvas to configure and activate a new delegation.
                </AlertDescription>
              </Alert>
              <div className="relative">
                <div className="max-h-[9.5rem] overflow-y-auto rounded-md">
                  <SidebarMenu>
                    {displayAgents.filter(a => a.name !== "Reimbursement Agent" && !a.name.toLowerCase().includes("reimbursement")).map((agent) => (
                      <SidebarMenuItem key={agent.id}>
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <SidebarMenuButton
                              id={`agent-${agent.id}`}
                              tooltip={agent.isPlaceholder ? agent.detail : `Drag to canvas to delegate to ${agent.name}`}
                              draggable={!agent.isPlaceholder}
                              className={`h-auto py-2 ${
                                agent.isPlaceholder
                                  ? "cursor-default select-none opacity-50"
                                  : "cursor-grab active:cursor-grabbing"
                              }`}
                              onClick={
                                !agent.isPlaceholder && onSelectAgent
                                  ? () => onSelectAgent(agent.id)
                                  : undefined
                              }
                              onDragStart={
                                !agent.isPlaceholder
                                  ? (event) => {
                                      event.dataTransfer.setData("application/allocard-agent-id", agent.id);
                                      event.dataTransfer.effectAllowed = "copy";
                                    }
                                  : undefined
                              }
                            >
                              <div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-foreground/70">
                                <BotIcon className="size-3" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-medium leading-none">{agent.name}</p>
                                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{agent.detail}</p>
                              </div>
                            </SidebarMenuButton>
                          </HoverCardTrigger>
                          <HoverCardContent side="right" align="start" className="w-64 z-[100]">
                            <div className="flex flex-col gap-1.5">
                              <h4 className="text-sm font-semibold leading-none">{agent.name}</h4>
                              <p className="text-xs text-muted-foreground leading-relaxed">{agent.detail}</p>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                        {agent.isPlaceholder && (
                          <SidebarMenuBadge className="text-[9px] text-muted-foreground/40">planned</SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between px-1">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/70">
                <SparklesIcon className="size-3" />
                AI Agents
              </span>
              {!hasLiveAgents && (
                <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                  Coming soon
                </Badge>
              )}
            </div>

            <div className="relative">
              <div className="max-h-[9.5rem] overflow-y-auto rounded-md">
                <SidebarMenu>
                  {displayAgents.map((agent) => (
                    <SidebarMenuItem key={agent.id}>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <SidebarMenuButton
                            id={`agent-${agent.id}`}
                            tooltip={agent.isPlaceholder ? agent.detail : `Drag to canvas: ${agent.name}`}
                            draggable={!agent.isPlaceholder}
                            className={`h-auto py-2 ${
                              agent.isPlaceholder
                                ? "cursor-default select-none opacity-50"
                                : "cursor-grab active:cursor-grabbing"
                            }`}
                            onDragStart={
                              !agent.isPlaceholder
                                ? (event) => {
                                    event.dataTransfer.setData(
                                      "application/allocard-agent-id",
                                      agent.id,
                                    );
                                    event.dataTransfer.effectAllowed = "copy";
                                  }
                                : undefined
                            }
                          >
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-foreground/70">
                              <BotIcon className="size-3" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium leading-none">
                                {agent.name}
                              </p>
                              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                                {agent.detail}
                              </p>
                            </div>
                          </SidebarMenuButton>
                        </HoverCardTrigger>
                        <HoverCardContent side="right" align="start" className="w-64 z-[100]">
                          <div className="flex flex-col gap-1.5">
                            <h4 className="text-sm font-semibold leading-none">{agent.name}</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">{agent.detail}</p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                      {agent.isPlaceholder && (
                        <SidebarMenuBadge className="text-[9px] text-muted-foreground/40">
                          planned
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </div>
              {displayAgents.length > 3 && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 rounded-b-md bg-gradient-to-t from-sidebar to-transparent" />
              )}
            </div>
          </div>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

// ---------------------------------------------------------------------------
// Logout footer
// ---------------------------------------------------------------------------

function LogoutMenuItem() {
  const { disconnect } = useWeb3AuthDisconnect();

  return (
    <DropdownMenuItem onClick={() => void disconnect()} className="cursor-pointer text-muted-foreground hover:text-foreground">
      <LogOutIcon className="mr-2 h-4 w-4" />
      <span>Log out</span>
    </DropdownMenuItem>
  );
}

// ---------------------------------------------------------------------------
// Root AppSidebar
// ---------------------------------------------------------------------------

export function AppSidebar({
  agents,
  companyName,
  copiedInvite,
  employees,
  inviteLink,
  invitePending,
  onAddEmployee,
  onCopyInvite,
  onCreateInvite,
  onRefreshEmployees,
  employeesRefreshing,
  onSelectAgent,
  role,
  smartAccountLabel,
  smartAccountAddress,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  roleLabel: _roleLabel,
  employeeReferenceId,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  agents: SidebarAgent[];
  companyName: string;
  copiedInvite?: boolean;
  employees: SidebarEmployee[];
  inviteLink?: string | null;
  invitePending?: boolean;
  onAddEmployee?: (employeeId: string) => void;
  onCopyInvite?: () => void;
  onCreateInvite?: () => void;
  onRefreshEmployees?: () => void;
  employeesRefreshing?: boolean;
  onSelectAgent?: (agentId: string) => void;
  role?: "employer" | "employee";
  roleLabel: string;
  smartAccountLabel: string;
  smartAccountAddress?: string | null;
  employeeReferenceId?: string;
}) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <SidebarHeader className="pb-4 pt-4 px-3 gap-3 relative">
        <div className="absolute right-3 top-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVerticalIcon className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <LogoutMenuItem />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="px-1 mt-1">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Workspace
          </p>
          <h2 className="mt-0.5 truncate text-base font-semibold text-foreground pr-6">
            {companyName}
          </h2>
          {role === "employee" && employeeReferenceId && (
            <p className="mt-1 text-[11px] text-muted-foreground font-mono bg-muted/50 inline-flex px-1.5 py-0.5 rounded border border-border/50">
              {employeeReferenceId}
            </p>
          )}
        </div>

        <SmartAccountAddress 
          label={smartAccountLabel} 
          fullAddress={smartAccountAddress} 
          role={role}
        />
      </SidebarHeader>

      {/* ── CONTENT ────────────────────────────────────────────────────── */}
      <SidebarContent className="gap-0">

        {/* Invite — employer only */}
        {role !== "employee" && (
          <>
            <InviteSection
              copiedInvite={copiedInvite}
              inviteLink={inviteLink}
              invitePending={invitePending}
              onCopyInvite={onCopyInvite}
              onCreateInvite={onCreateInvite}
            />
            <SidebarSeparator />
          </>
        )}

        {/* Canvas — employees + AI agents */}
        <CanvasSection
          agents={agents}
          employees={employees}
          onAddEmployee={onAddEmployee}
          onRefreshEmployees={onRefreshEmployees}
          employeesRefreshing={employeesRefreshing}
          onSelectAgent={onSelectAgent}
          role={role}
        />

      </SidebarContent>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <SidebarFooter>
        {/* Footer content removed */}
      </SidebarFooter>

    </Sidebar>
  );
}
