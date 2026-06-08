"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  BotIcon,
  CircleHelpIcon,
  CommandIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  LinkIcon,
  Settings2Icon,
  UsersIcon,
} from "lucide-react"

function getData({
  roleLabel,
  walletAddress,
}: {
  roleLabel: string
  walletAddress: string
}) {
  return {
    user: {
      name: roleLabel,
      walletAddress,
      avatar: "/avatars/allocard.jpg",
    },
    navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: (
        <LayoutDashboardIcon
        />
      ),
    },
    {
      title: "Employees",
      url: "#",
      icon: (
        <UsersIcon
        />
      ),
    },
    {
      title: "Invites",
      url: "#",
      icon: (
        <LinkIcon
        />
      ),
    },
    {
      title: "Agents",
      url: "#",
      icon: (
        <BotIcon
        />
      ),
    },
    {
      title: "Master Card",
      url: "#",
      icon: (
        <CreditCardIcon
        />
      ),
    },
  ],
    navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: (
        <Settings2Icon
        />
      ),
    },
    {
      title: "Get Help",
      url: "#",
      icon: (
        <CircleHelpIcon
        />
      ),
    },
  ],
  }
}

export function AppSidebar({
  companyName,
  walletAddress,
  roleLabel,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  companyName: string
  walletAddress: string
  roleLabel: string
}) {
  const data = getData({ roleLabel, walletAddress })

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
                <CommandIcon className="size-5!" />
                <span className="text-base font-semibold">{companyName}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
