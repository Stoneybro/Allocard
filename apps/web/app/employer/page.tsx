import { AppSidebar } from "@/components/app-sidebar"
import { DashboardFlowCanvas } from "@/components/dashboard-flow-canvas"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function Page() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="h-dvh overflow-hidden">
        <SiteHeader />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="@container/main flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden py-4 md:gap-6 md:py-6">
              <SectionCards />
              <div className="min-h-0 flex-1 px-4 lg:px-6">
                <DashboardFlowCanvas />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
