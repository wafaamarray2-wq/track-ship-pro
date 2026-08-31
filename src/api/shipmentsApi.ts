import { request } from "./client";
import { ShipmentStatus } from "./types";

import type {
  CreateShipmentEventRequest,
  CreateShipmentRequest,
  Paged,
  Shipment,
  ShipmentListItem,
  ShipmentQuery,
  TrackingEvent,
} from "./types";

/* =========================
   Backend response types
========================= */

interface BackendShipmentListItem {
  id: number;
  trackingNumber: string;
  referenceNumber?: string | null;

  merchantId: number;
  merchantName: string;

  recipientName: string;

  originCity: string;
  originCountry: string;

  destinationCity: string;
  destinationCountry: string;

  currentStatus: string;

  driverId?: number | null;
  driverName?: string | null;

  expectedDeliveryAt?: string | null;

  createdAt: string;
  updatedAt: string;

  risk: {
    level: string;
    reason?: string | null;
  };
}

interface BackendShipment {
  id: number;
  trackingNumber: string;
  referenceNumber?: string | null;

  merchantId: number;
  merchantCode: string;
  merchantName: string;

  driverId?: number | null;
  driverCode?: string | null;
  driverName?: string | null;

  recipientName: string;
  recipientPhone?: string | null;
  recipientEmail?: string | null;

  originAddress: string;
  originCity: string;
  originCountry: string;

  destinationAddress: string;
  destinationCity: string;
  destinationCountry: string;

  packageDescription?: string | null;
  weight?: number | null;

  currentStatus: string;

  expectedDeliveryAt?: string | null;

  createdAt: string;
  updatedAt: string;

  version: number;

  risk: {
    level: string;
    reason?: string | null;
  };
}

interface BackendPagedShipments {
  items: BackendShipmentListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface BackendShipmentEvent {
  id: number;
  status: string;
  location?: string | null;
  notes?: string | null;
  occurredAt: string;
  createdAt: string;
  source: string;
  createdByUserId?: number | null;
}

/* =========================
   Mapping helpers
========================= */

function mapRiskLevel(level: string) {
  return level as Shipment["riskLevel"];
}

function mapShipmentListItem(shipment: BackendShipmentListItem): ShipmentListItem {
  return {
    id: String(shipment.id),

    trackingNumber: shipment.trackingNumber,

    merchantId: String(shipment.merchantId),

    merchantName: shipment.merchantName,
    driverId: shipment.driverId ? String(shipment.driverId) : undefined,

    driverName: shipment.driverName ?? undefined,

    recipientName: shipment.recipientName,

    originCity: `${shipment.originCity}, ${shipment.originCountry}`,

    destinationCity: `${shipment.destinationCity}, ${shipment.destinationCountry}`,

    status: shipment.currentStatus as ShipmentStatus,

    expectedDeliveryDate: shipment.expectedDeliveryAt ?? "",

    riskLevel: mapRiskLevel(shipment.risk.level),

    lastUpdatedAt: shipment.updatedAt,
  };
}

function mapTrackingEvent(event: BackendShipmentEvent, shipmentId: string): TrackingEvent {
  return {
    id: String(event.id),

    shipmentId,

    status: event.status as ShipmentStatus,

    location: event.location ?? "",

    occurredAt: event.occurredAt,

    notes: event.notes ?? undefined,

    createdBy: event.createdByUserId ? String(event.createdByUserId) : "",

    source: event.source as TrackingEvent["source"],
  };
}

function mapShipment(shipment: BackendShipment): Shipment {
  const id = String(shipment.id);

  return {
    id,

    trackingNumber: shipment.trackingNumber,

    merchantId: String(shipment.merchantId),

    merchantName: shipment.merchantName,

    recipientName: shipment.recipientName,

    originCity: `${shipment.originCity}, ${shipment.originCountry}`,

    destinationCity: `${shipment.destinationCity}, ${shipment.destinationCountry}`,

    status: shipment.currentStatus as ShipmentStatus,

    expectedDeliveryDate: shipment.expectedDeliveryAt ?? "",

    riskLevel: mapRiskLevel(shipment.risk.level),

    lastUpdatedAt: shipment.updatedAt,

    recipient: {
      name: shipment.recipientName,
      phone: shipment.recipientPhone ?? "",
      email: shipment.recipientEmail ?? "",
    },

    origin: {
      line1: shipment.originAddress,
      city: shipment.originCity,
      state: "",
      postalCode: "",
      country: shipment.originCountry,
    },

    destination: {
      line1: shipment.destinationAddress,
      city: shipment.destinationCity,
      state: "",
      postalCode: "",
      country: shipment.destinationCountry,
    },

    package: {
      description: shipment.packageDescription ?? "",
      weightKg: shipment.weight ?? 0,
    },

    createdAt: shipment.createdAt,

    createdBy: "",

    updatedBy: "",

    events: [],

    intelligence: {
      riskLevel: mapRiskLevel(shipment.risk.level),

      summary: shipment.risk.reason ?? "",

      factors: [],

      hoursSinceLastMovement: 0,

      expectedDeliveryVarianceHours: 0,

      failedDeliveryAttempts: 0,

      currentFacility: "",
    },
  };
}

function mapStatusToBackend(status: ShipmentStatus): number {
  switch (status) {
    case ShipmentStatus.Created:
      return 1;

    case ShipmentStatus.PickedUp:
      return 3;

    case ShipmentStatus.OnHold:
      return 10;

    case ShipmentStatus.Cancelled:
      return 12;

    case ShipmentStatus.Lost:
      return 13;

    case ShipmentStatus.Delivered:
      return 8;

    case ShipmentStatus.DeliveryFailed:
      return 9;

    case ShipmentStatus.ReturnedToSender:
      return 11;

    case ShipmentStatus.AtOriginFacility:
      return 4;

    case ShipmentStatus.InTransit:
      return 5;

    case ShipmentStatus.AtDestinationFacility:
      return 6;

    case ShipmentStatus.OutForDelivery:
      return 7;

    default:
      throw new Error(`Unsupported shipment status: ${status}`);
  }
}

/* =========================
   Shipments API
========================= */

export const shipmentsApi = {
  /* GET /api/shipments */

  async list(query: ShipmentQuery = {}): Promise<Paged<ShipmentListItem>> {
    const params = new URLSearchParams();

    if (query.search) {
      params.set("Search", query.search);
    }

    if (query.status) {
      params.set("Status", query.status);
    }

    if (query.merchantId) {
      params.set("MerchantId", query.merchantId);
    }

    if (query.fromDate) {
      params.set("FromDate", query.fromDate);
    }

    if (query.toDate) {
      params.set("ToDate", query.toDate);
    }

    params.set("Page", String(query.page ?? 1));

    params.set("PageSize", String(query.pageSize ?? 10));

    const queryString = params.toString();

    const data = await request<BackendPagedShipments>(
      `/shipments${queryString ? `?${queryString}` : ""}`,
    );
    console.log("SHIPMENTS FROM BACKEND:", data);
    console.log("FIRST SHIPMENT:", data.items[0]);
    return {
      items: data.items.map(mapShipmentListItem),

      page: data.page,

      pageSize: data.pageSize,

      totalCount: data.totalCount,

      totalPages: data.totalPages,
    };
  },

  /* GET /api/shipments/{id} */

  async getById(id: string): Promise<Shipment> {
    const data = await request<BackendShipment>(`/shipments/${id}`);

    return mapShipment(data);
  },

  /* POST /api/shipments */

  async create(payload: CreateShipmentRequest): Promise<Shipment> {
    const backendPayload = {
      merchantId: Number(payload.merchantId),

      recipientName: payload.recipient.name,

      recipientPhone: payload.recipient.phone,

      recipientEmail: payload.recipient.email,

      originAddress: payload.origin.line1,

      originCity: payload.origin.city,

      originCountry: payload.origin.country,

      destinationAddress: payload.destination.line1,

      destinationCity: payload.destination.city,

      destinationCountry: payload.destination.country,

      packageDescription: payload.package.description,

      weight: payload.package.weightKg,

      expectedDeliveryAt: payload.expectedDeliveryDate,

      referenceNumber: payload.package.referenceNumber,

      notes: payload.notes,
    };

    console.log("BACKEND PAYLOAD:", backendPayload);
    const data = await request<BackendShipment>("/shipments", {
      method: "POST",

      body: JSON.stringify(backendPayload),
    });

    return mapShipment(data);
  },

  /* PATCH /api/shipments/{id}/status */

  async addEvent(id: string, payload: CreateShipmentEventRequest): Promise<Shipment> {
    const data = await request<BackendShipment>(`/shipments/${id}/status`, {
      method: "PATCH",

      body: JSON.stringify({
        status: mapStatusToBackend(payload.status),

        location: payload.location,

        notes: payload.notes,

        occurredAt: payload.occurredAt,
      }),
    });

    return mapShipment(data);
  },

  /* PATCH /api/shipments/{id}/status */

  async updateStatus(id: string, payload: CreateShipmentEventRequest): Promise<Shipment> {
    const data = await request<BackendShipment>(`/shipments/${id}/status`, {
      method: "PATCH",

      body: JSON.stringify({
        status: mapStatusToBackend(payload.status),

        location: payload.location,

        notes: payload.notes,

        occurredAt: payload.occurredAt,
      }),
    });

    return mapShipment(data);
  },

  /* GET /api/shipments/{id}/timeline */

  async getTimeline(id: string): Promise<TrackingEvent[]> {
    const data = await request<BackendShipmentEvent[]>(`/shipments/${id}/timeline`);

    return data.map((event) => mapTrackingEvent(event, id));
  },

  /* PATCH /api/shipments/{id}/assign-driver */

  async assignDriver(id: string, driverId: string): Promise<Shipment> {
    const data = await request<BackendShipment>(`/shipments/${id}/assign-driver`, {
      method: "PATCH",

      body: JSON.stringify({
        driverId: Number(driverId),
      }),
    });

    return mapShipment(data);
  },
};
