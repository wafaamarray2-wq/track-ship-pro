
import { request } from "./client";
import type {
  ActivityLogEntry,
  AtRiskShipment,
  DashboardSummary,
  StatusBreakdownItem,
} from "./types";
import { RiskLevel, ShipmentStatus } from "./types";

interface BackendDashboardSummary {
  totalShipments: number;
  activeShipments: number;
  deliveredShipments: number;
  delayedShipments: number;
  atRiskShipments: number;
  criticalShipments: number;
  unassignedShipments: number;
  failedDeliveryAttempts: number;
}

interface BackendAtRiskShipment {
  id: number;
  trackingNumber: string;
  merchantName: string;
  recipientName: string;
  currentStatus: string;
  driverName?: string | null;
  expectedDeliveryAt?: string | null;
  risk: {
    level: string;
    reason?: string | null;
  };
}

interface BackendRecentActivity {
  shipmentId: number;
  trackingNumber: string;
  status: string;
  location?: string | null;
  occurredAt: string;
  merchantName: string;
}

export const dashboardApi = {
  /** GET /api/dashboard/summary */
  async summary(): Promise<DashboardSummary> {
    const data = await request<BackendDashboardSummary>(
      "/dashboard/summary",
    );

    return {
      totalShipments: data.totalShipments,
      inTransit: data.activeShipments,
      delivered: data.deliveredShipments,
      delayed: data.delayedShipments,
      deliverySuccessRate:
        data.totalShipments === 0
          ? 0
          : Number(
              ((data.deliveredShipments / data.totalShipments) * 100).toFixed(
                1,
              ),
            ),
      volumeTrend: [],
    };
  },

  /** GET /api/dashboard/status-breakdown */
  async statusBreakdown(): Promise<StatusBreakdownItem[]> {
    const data = await request<
      Array<{
        status: string;
        count: number;
      }>
    >("/dashboard/status-breakdown");

    return data.map((item) => ({
      status: item.status as ShipmentStatus,
      count: item.count,
    }));
  },

  /** GET /api/dashboard/at-risk-shipments */
  async atRiskShipments(
    riskLevels?: RiskLevel[],
  ): Promise<AtRiskShipment[]> {
    const data = await request<BackendAtRiskShipment[]>(
      "/dashboard/at-risk-shipments?limit=10",
    );

   const mapped = data.map((shipment) => ({
  id: String(shipment.id),
  trackingNumber: shipment.trackingNumber,
  merchantName: shipment.merchantName,
  riskLevel: shipment.risk.level as RiskLevel,
  reason: shipment.risk.reason ?? "Shipment requires attention",
  hoursInactive: 0,
  expectedDeliveryDate: shipment.expectedDeliveryAt ?? "",
  lastKnownLocation: shipment.currentStatus,
}));

    if (!riskLevels?.length) {
      return mapped;
    }

    return mapped.filter((shipment) =>
      riskLevels.includes(shipment.riskLevel),
    );
  },

  /** GET /api/dashboard/recent-activity */
  async recentActivity(limit = 6): Promise<ActivityLogEntry[]> {
    const data = await request<BackendRecentActivity[]>(
      `/dashboard/recent-activity?limit=${limit}`,
    );

    return data.map((entry) => ({
      id: `${entry.shipmentId}-${entry.occurredAt}`,
      timestamp: entry.occurredAt,
      user: entry.merchantName,
      action: entry.status,
      entityType: "Shipment",
      entityId: String(entry.shipmentId),
      description: `${entry.trackingNumber} — ${entry.status}${
        entry.location ? ` at ${entry.location}` : ""
      }`,
    }));
  },
};

