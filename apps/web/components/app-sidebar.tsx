"use client";

import * as React from "react";
import { useAuth } from "@/components/AuthProvider";
import type { WorkspaceOption } from "@/app/actions/identity";
import {
  BotIcon,
  CheckIcon,
  CopyIcon,
  LogOutIcon,
  MoreVerticalIcon,
  RefreshCwIcon,
  SparklesIcon,
  UserPlusIcon,
  UserRoundIcon,
  WalletIcon,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
          Activate your smart account to fund and enable delegations.
        </p>
      )}
    </div>
  );
}

// Add employee dialog — shadcn modal for email invitation
// ---------------------------------------------------------------------------

function AddEmployeeDialog({
  onInviteEmployeeByEmail,
  pendingEmployees,
}: {
  onInviteEmployeeByEmail?: (email: string) => Promise<void>;
  pendingEmployees?: { id: string; email: string; createdAt: string }[];
}) {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !onInviteEmployeeByEmail) return;
    setIsSubmitting(true);
    try {
      await onInviteEmployeeByEmail(email.trim());
      setEmail("");
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-full text-xs font-medium gap-1.5 border-dashed hover:border-solid justify-center px-2"
        >
          <UserPlusIcon className="size-3.5" />
          <span>Add employee</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add an Employee</DialogTitle>
          <DialogDescription>
            Add a team member by their work email address. They will gain access to their corporate card workspace upon signing in.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="invite-employee-email">Employee email address</Label>
            <Input
              id="invite-employee-email"
              type="email"
              placeholder="name@company.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Tip for testing: Invite a second email (e.g. personal email) and open an incognito window to view their employee card.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || !email.trim() || !onInviteEmployeeByEmail}
            >
              {isSubmitting ? "Adding..." : "Add by email"}
            </Button>
          </div>

          {pendingEmployees && pendingEmployees.length > 0 && (
            <div className="border-t border-border pt-3 mt-1">
              <p className="text-xs font-medium text-foreground mb-1.5">
                Awaiting sign in ({pendingEmployees.length})
              </p>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {pendingEmployees.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md bg-muted/60 text-muted-foreground"
                  >
                    <span className="truncate max-w-[240px] font-mono text-[11px] text-foreground">
                      {p.email}
                    </span>
                    <Badge variant="outline" className="text-[9px] h-4 text-amber-600 border-amber-300">
                      Pending
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Canvas section — employees + AI agents, each capped & scrollable
// ---------------------------------------------------------------------------

function CanvasSection({
  agents,
  employees,
  pendingEmployees,
  onAddEmployee,
  onInviteEmployeeByEmail,
  onRefreshEmployees,
  employeesRefreshing,
  onSelectAgent,
  role,
}: {
  agents: SidebarAgent[];
  employees: SidebarEmployee[];
  pendingEmployees?: { id: string; email: string; createdAt: string }[];
  onAddEmployee?: (employeeId: string) => void;
  onInviteEmployeeByEmail?: (email: string) => Promise<void>;
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
          <div className="flex flex-col gap-1.5">
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
                {pendingEmployees && pendingEmployees.length > 0 && (
                  <Badge variant="outline" className="h-4 px-1.5 text-[10px] text-amber-600 border-amber-300">
                    {pendingEmployees.length} pending
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

            {/* Add Employee action in the sidebar */}
            {onInviteEmployeeByEmail && (
              <AddEmployeeDialog
                onInviteEmployeeByEmail={onInviteEmployeeByEmail}
                pendingEmployees={pendingEmployees}
              />
            )}

            {/* Scrollable list — shows ~3 rows before scrolling */}
            {employees.length === 0 ? (
              <div className="flex items-center justify-center rounded-md border border-dashed border-border px-3 py-4">
                <p className="text-[11px] text-muted-foreground text-center">
                  No active employees yet. Click &ldquo;Add employee&rdquo; above.
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
  const auth = useAuth();

  return (
    <DropdownMenuItem onClick={() => { if (auth.status === "authenticated") void auth.disconnect(); }} className="cursor-pointer text-muted-foreground hover:text-foreground">
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
  employees,
  pendingEmployees,
  companyId,
  workspaceOptions,
  onWorkspaceChange,
  onAddEmployee,
  onInviteEmployeeByEmail,
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
  employees: SidebarEmployee[];
  pendingEmployees?: { id: string; email: string; createdAt: string }[];
  companyId: string;
  workspaceOptions: WorkspaceOption[];
  onWorkspaceChange?: (companyId: string, role: "employer" | "employee") => void;
  onAddEmployee?: (employeeId: string) => void;
  onInviteEmployeeByEmail?: (email: string) => Promise<void>;
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
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <h2 className="truncate text-base font-semibold text-foreground pr-2">
              {companyName}
            </h2>
            <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wider shrink-0">
              {role ?? "employer"}
            </Badge>
          </div>
          {workspaceOptions.length > 1 && onWorkspaceChange && (
            <div className="mt-2.5">
              <Select
                value={companyId}
                onValueChange={(nextCompanyId) => {
                  if (nextCompanyId) {
                    onWorkspaceChange(nextCompanyId, role ?? "employer");
                  }
                }}
              >
                <SelectTrigger className="h-8 w-full text-xs bg-background">
                  <SelectValue placeholder="Switch company" />
                </SelectTrigger>
                <SelectContent>
                  {workspaceOptions.map((workspace) => (
                    <SelectItem
                      key={workspace.companyId}
                      value={workspace.companyId}
                    >
                      {workspace.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {role === "employee" && employeeReferenceId && (
            <p className="mt-2 text-[11px] text-muted-foreground font-mono bg-muted/50 inline-flex px-1.5 py-0.5 rounded border border-border/50">
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

        {/* Canvas — employees + AI agents */}
        <CanvasSection
          agents={agents}
          employees={employees}
          pendingEmployees={pendingEmployees}
          onAddEmployee={onAddEmployee}
          onInviteEmployeeByEmail={onInviteEmployeeByEmail}
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
