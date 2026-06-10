"use client";

import * as React from "react";
import { useWeb3AuthDisconnect } from "@web3auth/modal/react";
import {
  BotIcon,
  CheckIcon,
  CopyIcon,
  LinkIcon,
  LogOutIcon,
  SparklesIcon,
  UserRoundIcon,
  WalletIcon,
} from "lucide-react";

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

function SmartAccountAddress({ label }: { label: string }) {
  const [copied, setCopied] = React.useState(false);
  const isPending = label === "Smart account pending";

  const handleCopy = async () => {
    if (isPending) return;
    await navigator.clipboard.writeText(label);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-1 px-1">
      <p className="px-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        Smart Account
      </p>
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/60 px-2.5 py-2">
        <WalletIcon className="size-3.5 shrink-0 text-foreground/50" />
        <span
          className={`min-w-0 flex-1 truncate font-mono text-xs font-medium ${
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
        <LinkIcon className="size-3.5" />
        Invite
      </SidebarGroupLabel>

      <SidebarGroupContent className="flex flex-col gap-2">
        {/* Single-line contextual hint */}
        <p className="px-1 text-[11px] text-muted-foreground">
          Send a one-time link to onboard an employee.
        </p>

        <Button
          id="create-invite-btn"
          size="sm"
          variant="outline"
          onClick={onCreateInvite}
          disabled={invitePending}
          className="w-full gap-1.5"
        >
          <LinkIcon className="size-3.5" />
          {invitePending ? "Generating…" : "Generate invite link"}
        </Button>

        {inviteLink && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/60 px-2.5 py-2">
            <p className="min-w-0 flex-1 truncate font-mono text-[10px] text-foreground">
              {inviteLink}
            </p>
            <button
              type="button"
              id="copy-invite-btn"
              aria-label={copiedInvite ? "Copied" : "Copy invite link"}
              onClick={onCopyInvite}
              disabled={!onCopyInvite}
              className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
            >
              {copiedInvite ? (
                <CheckIcon className="size-3.5" />
              ) : (
                <CopyIcon className="size-3.5" />
              )}
            </button>
          </div>
        )}

        {inviteError && (
          <p className="px-1 text-[11px] font-medium text-destructive">
            {inviteError}
          </p>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

// ---------------------------------------------------------------------------
// Canvas section — employees + AI agents, each capped & scrollable
// ---------------------------------------------------------------------------

function CanvasSection({
  agents,
  employees,
  onAddEmployee,
  onSelectAgent,
  role,
}: {
  agents: SidebarAgent[];
  employees: SidebarEmployee[];
  onAddEmployee?: (employeeId: string) => void;
  onSelectAgent?: (agentId: string) => void;
  role?: "employer" | "employee";
}) {
  const displayAgents = agents.length > 0 ? agents : PLACEHOLDER_AGENTS;
  const hasLiveAgents = agents.length > 0;

  return (
    <SidebarGroup className="flex flex-col gap-0">
      {/* Section header */}
      <SidebarGroupLabel>
        {role === "employee" ? "Your AI Agents" : "Recipients"}
      </SidebarGroupLabel>

      <SidebarGroupContent className="flex flex-col gap-4">
        {/* Hint — only shown to employers who use the canvas */}
        {role !== "employee" && (
          <p className="px-1 text-[11px] text-muted-foreground bg-muted p-2  rounded-md">
            Click or drag and drop any Recipient (Employee or AI Agent) to place it on the
            canvas
          </p>
        )}
        {role === "employee" && (
          <p className="px-1 text-[11px] text-muted-foreground bg-muted p-2 rounded-md">
            AI agents can autonomously manage and execute approved transactions on your behalf.
          </p>
        )}

        {/* ── Employees — employer only ──────────────────────────────── */}
        {role !== "employee" && (
          <div className="flex flex-col gap-1">
            {/* Sub-label row */}
            <div className="flex items-center justify-between px-1">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/70">
                <UserRoundIcon className="size-3" />
                Employees
              </span>
              {employees.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {employees.length}
                </Badge>
              )}
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
                          tooltip={`${employee.label} — click or drag`}
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
        <div className="flex flex-col gap-1">
          {/* Sub-label row */}
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

          {/* Scrollable list — capped at same height */}
          <div className="relative">
            <div className="max-h-[9.5rem] overflow-y-auto rounded-md">
              <SidebarMenu>
                {displayAgents.map((agent) => (
                  <SidebarMenuItem key={agent.id}>
                    <SidebarMenuButton
                      id={`agent-${agent.id}`}
                      tooltip={agent.isPlaceholder ? agent.detail : (role === "employee" ? `Delegate to ${agent.name}` : `Drag to canvas: ${agent.name}`)}
                      draggable={!agent.isPlaceholder && role !== "employee"}
                      className={`h-auto py-2 ${
                        agent.isPlaceholder
                          ? "cursor-default select-none opacity-50"
                          : role === "employee"
                          ? "cursor-pointer"
                          : "cursor-grab active:cursor-grabbing"
                      }`}
                      onClick={
                        !agent.isPlaceholder && role === "employee" && onSelectAgent
                          ? () => onSelectAgent(agent.id)
                          : undefined
                      }
                      onDragStart={
                        !agent.isPlaceholder && role !== "employee"
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
                    {agent.isPlaceholder && (
                      <SidebarMenuBadge className="text-[9px] text-muted-foreground/40">
                        planned
                      </SidebarMenuBadge>
                    )}
                    {!agent.isPlaceholder && role === "employee" && (
                      <SidebarMenuBadge className="text-[9px] text-primary/70">
                        delegate
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
            {/* Fade mask */}
            {displayAgents.length > 3 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 rounded-b-md bg-gradient-to-t from-sidebar to-transparent" />
            )}
          </div>
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

// ---------------------------------------------------------------------------
// Logout footer
// ---------------------------------------------------------------------------

function LogoutFooter() {
  const { disconnect } = useWeb3AuthDisconnect();

  return (
    <div className="px-2 py-2">
      <Button
        id="sidebar-logout-btn"
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        onClick={() => void disconnect()}
      >
        <LogOutIcon className="size-4" />
        Log out
      </Button>
    </div>
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
  inviteError,
  inviteLink,
  invitePending,
  onAddEmployee,
  onCopyInvite,
  onCreateInvite,
  onSelectAgent,
  role,
  smartAccountLabel,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  roleLabel: _roleLabel,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  agents: SidebarAgent[];
  companyName: string;
  copiedInvite?: boolean;
  employees: SidebarEmployee[];
  inviteError?: string | null;
  inviteLink?: string | null;
  invitePending?: boolean;
  onAddEmployee?: (employeeId: string) => void;
  onCopyInvite?: () => void;
  onCreateInvite?: () => void;
  onSelectAgent?: (agentId: string) => void;
  role?: "employer" | "employee";
  roleLabel: string;
  smartAccountLabel: string;
}) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <SidebarHeader className="gap-3 pb-4">
        <div className="px-1 pt-1">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {role === "employee" ? "Your Workspace" : "Workspace"}
          </p>
          <h2 className="mt-0.5 truncate text-base font-semibold text-foreground">
            {companyName}
          </h2>
          {role === "employee" && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">Employee</p>
          )}
        </div>
        <SmartAccountAddress label={smartAccountLabel} />
      </SidebarHeader>

      {/* ── CONTENT ────────────────────────────────────────────────────── */}
      <SidebarContent className="gap-0">

        {/* Invite — employer only */}
        {role !== "employee" && (
          <>
            <InviteSection
              copiedInvite={copiedInvite}
              inviteError={inviteError}
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
          onSelectAgent={onSelectAgent}
          role={role}
        />

      </SidebarContent>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <SidebarFooter className="border-t border-border">
        <LogoutFooter />
      </SidebarFooter>

    </Sidebar>
  );
}
