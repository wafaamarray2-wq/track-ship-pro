import { request } from "./client";
import type { Merchant, MerchantRequest, Paged } from "./types";

export interface MerchantQuery {
  search?: string | undefined;
  status?: "active" | "inactive" | "" | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

/* =========================
   Backend response types
========================= */

interface BackendMerchantListItem {
  id: number;
  merchantCode: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface BackendMerchant {
  id: number;
  merchantCode: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
}

/* =========================
   Mapping
========================= */

function mapMerchant(merchant: BackendMerchant | BackendMerchantListItem): Merchant {
  return {
    id: String(merchant.id),
    companyName: merchant.name,
    contactName: merchant.contactName ?? "",
    email: merchant.email ?? "",
    phone: merchant.phone ?? "",
    isActive: merchant.isActive,
    shipmentCount: 0,
    createdAt: merchant.createdAt,
  };
}

/* =========================
   Merchants API
========================= */

export const merchantsApi = {
  /** GET /api/merchants */
  async list(query: MerchantQuery = {}): Promise<Paged<Merchant>> {
    const data = await request<BackendMerchantListItem[]>("/merchants");

    const detailedMerchants = await Promise.all(
      data.map((merchant) => request<BackendMerchant>(`/merchants/${merchant.id}`)),
    );

    let items = detailedMerchants.map(mapMerchant);

    const search = (query.search ?? "").trim().toLowerCase();

    if (search) {
      items = items.filter((merchant) =>
        `${merchant.companyName} ${merchant.contactName} ${merchant.email}`
          .toLowerCase()
          .includes(search),
      );
    }

    if (query.status === "active") {
      items = items.filter((merchant) => merchant.isActive);
    }

    if (query.status === "inactive") {
      items = items.filter((merchant) => !merchant.isActive);
    }

    items = [...items].sort((a, b) => a.companyName.localeCompare(b.companyName));

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    return {
      items: items.slice((page - 1) * pageSize, page * pageSize),

      page,
      pageSize,

      totalCount: items.length,

      totalPages: items.length === 0 ? 0 : Math.ceil(items.length / pageSize),
    };
  },

  /** GET /api/merchants - options for selects */
  async options(): Promise<Merchant[]> {
    const data = await request<BackendMerchantListItem[]>("/merchants");
    console.log("BACKEND MERCHANTS:", data);
    return data
      .map(mapMerchant)
      .filter((merchant) => merchant.isActive)
      .sort((a, b) => a.companyName.localeCompare(b.companyName));
  },

  /** GET /api/merchants/{id} */
  async getById(id: string): Promise<Merchant> {
    const data = await request<BackendMerchant>(`/merchants/${id}`);

    return mapMerchant(data);
  },

  /** POST /api/merchants */
  async create(payload: MerchantRequest): Promise<Merchant> {
    const data = await request<BackendMerchant>("/merchants", {
      method: "POST",
      body: JSON.stringify({
        name: payload.companyName,
        contactName: payload.contactName,
        email: payload.email,
        phone: payload.phone,
        isActive: payload.isActive,
      }),
    });

    return mapMerchant(data);
  },
};
