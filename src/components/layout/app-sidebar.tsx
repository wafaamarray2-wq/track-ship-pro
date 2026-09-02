import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  LayoutDashboard,
  Package,
  Settings,
  Store,
  Truck,
  Users,
} from "lucide-react";

import { Permission, useAuth } from "@/lib/auth";
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
  useSidebar,
} from "@/components/ui/sidebar";

interface NavItem {
  title: string;
  to: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
  exact?: boolean;
}

const OPERATIONS: NavItem[] = [
  {
    title: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
    permission: Permission.ViewDashboard,
  },
  { title: "Shipments", to: "/shipments", icon: Package, permission: Permission.ViewShipments },
  {
    title: "At-Risk Shipments",
    to: "/at-risk",
    icon: AlertTriangle,
    permission: Permission.ViewAtRisk,
  },
];

const NETWORK: NavItem[] = [
  { title: "Merchants", to: "/merchants", icon: Store, permission: Permission.ViewMerchants },
  { title: "Delivery Companies", to: "/delivery-companies", icon: Truck, permission: Permission.ViewDeliveryCompanies },
  { title: "Drivers", to: "/drivers", icon: Users, permission: Permission.ViewDrivers },
  { title: "Activity Log", to: "/activity", icon: Activity, permission: Permission.ViewActivity },
  { title: "Settings", to: "/settings", icon: Settings, permission: Permission.ManageSettings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { can } = useAuth();
  const pathname = useRouterState({ select: (router) => router.location.pathname });

  const isActive = (item: NavItem) => pathname === item.to || pathname.startsWith(`${item.to}/`);

  const renderGroup = (label: string, items: NavItem[]) => {
    const visible = items.filter((item) => can(item.permission));
    if (visible.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((item) => (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton asChild isActive={isActive(item)} tooltip={item.title}>
                  <Link to={item.to} className="flex items-center gap-2">
                    <item.icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2.5 px-1.5 py-1.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <Truck className="size-4" aria-hidden="true" />
          </span>
          {!collapsed ? (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">TrackFlow</span>
              <span className="block truncate text-xs text-muted-foreground">
                Shipment intelligence
              </span>
            </span>
          ) : null}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Operations", OPERATIONS)}
        {renderGroup("Network", NETWORK)}
      </SidebarContent>
      <SidebarFooter>
        {!collapsed ? (
          <Link
            to="/track"
            className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Public tracking page →
          </Link>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
