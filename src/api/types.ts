// Shared typed models / enums for the TrackFlow API layer.
// These mirror the contracts of the future ASP.NET Core REST API.

export const ShipmentStatus = {
  Created: "Created",
  PickedUp: "Picked Up",
  AtOriginFacility: "At Origin Facility",
  InTransit: "In Transit",
  AtDestinationFacility: "At Destination Facility",
  OutForDelivery: "Out for Delivery",
  Delivered: "Delivered",
  DeliveryFailed: "Delivery Failed",
  OnHold: "On Hold",
  ReturnedToSender: "Returned to Sender",
  Cancelled: "Cancelled",
  Lost: "Lost",
} as const;

export type ShipmentStatus = (typeof ShipmentStatus)[keyof typeof ShipmentStatus];

export const SHIPMENT_STATUSES: ShipmentStatus[] = Object.values(ShipmentStatus);

export const RiskLevel = {
  Normal: "Normal",
  AtRisk: "At Risk",
  Delayed: "Delayed",
  Critical: "Critical",
} as const;

export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

export const RISK_LEVELS: RiskLevel[] = Object.values(RiskLevel);

export const UserRole = {
  Admin: "Admin",
  Operator: "Operator",
  MerchantUser: "MerchantUser",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  merchantId?: string | undefined;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean | undefined;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface Merchant {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  isActive: boolean;
  shipmentCount: number;
  createdAt: string;
}

export interface MerchantRequest {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  isActive: boolean;
}

export interface Address {
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Recipient {
  name: string;
  phone: string;
  email: string;
}

export interface PackageInfo {
  description: string;
  weightKg: number;
  referenceNumber?: string | undefined;
}

export interface TrackingEvent {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  location: string;
  occurredAt: string;
  notes?: string | undefined;
  createdBy: string;
  source: "Operator" | "Scanner" | "System" | "Carrier";
}

export interface ShipmentIntelligence {
  riskLevel: RiskLevel;
  summary: string;
  factors: Array<{ label: string; value: string }>;
  hoursSinceLastMovement: number;
  expectedDeliveryVarianceHours: number;
  failedDeliveryAttempts: number;
  currentFacility: string;
}

export interface ShipmentListItem {
  id: string;
  trackingNumber: string;
  merchantId: string;
  merchantName: string;
  recipientName: string;
  originCity: string;
  destinationCity: string;
  status: ShipmentStatus;
  expectedDeliveryDate: string;
  riskLevel: RiskLevel;
  driverId?: string;
  driverName?: string;
  lastUpdatedAt: string;
}

export interface Shipment extends ShipmentListItem {
  recipient: Recipient;
  origin: Address;
  destination: Address;
  package: PackageInfo;
  notes?: string | undefined;
  createdAt: string;
  createdBy: string;
  updatedBy: string;
  events: TrackingEvent[];
  intelligence: ShipmentIntelligence;
}

export interface CreateShipmentRequest {
  merchantId: string;
  recipient: Recipient;
  package: PackageInfo;
  origin: Address;
  destination: Address;
  expectedDeliveryDate: string;
  notes?: string | undefined;
}

export interface CreateShipmentEventRequest {
  status: ShipmentStatus;
  location: string;
  notes?: string | undefined;
  occurredAt: string;
}

export type ShipmentSortField =
  "lastUpdatedAt" | "expectedDeliveryDate" | "trackingNumber" | "status";

export interface ShipmentQuery {
  search?: string | undefined;
  status?: ShipmentStatus | "" | undefined;
  merchantId?: string | undefined;
  riskLevel?: RiskLevel | "" | undefined;
  fromDate?: string | undefined;
  toDate?: string | undefined;
  sortBy?: ShipmentSortField | undefined;
  sortDir?: "asc" | "desc" | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface DashboardSummary {
  totalShipments: number;
  inTransit: number;
  delivered: number;
  delayed: number;
  deliverySuccessRate: number;
  volumeTrend: Array<{ date: string; shipments: number; delivered: number }>;
}

export interface StatusBreakdownItem {
  status: ShipmentStatus;
  count: number;
}

export interface AtRiskShipment {
  id: string;
  trackingNumber: string;
  merchantName: string;
  riskLevel: RiskLevel;
  reason: string;
  hoursInactive: number;
  expectedDeliveryDate: string;
  lastKnownLocation: string;
}

export interface PublicTrackingEvent {
  status: ShipmentStatus;
  location: string;
  occurredAt: string;
}

export interface PublicTrackingResult {
  trackingNumber: string;
  status: ShipmentStatus;
  expectedDeliveryDate: string;
  originCity: string;
  destinationCity: string;
  events: PublicTrackingEvent[];
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
}

export interface ActivityQuery {
  user?: string | undefined;
  action?: string | undefined;
  entityType?: string | undefined;
  fromDate?: string | undefined;
  toDate?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}
