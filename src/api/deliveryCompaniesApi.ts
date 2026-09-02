import { request } from "./client";

export interface DeliveryCompany {
  id: number;
  companyCode: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateDeliveryCompanyPayload {
  name: string;
  email: string;
  phone: string;
}

export const deliveryCompaniesApi = {
  async list(): Promise<DeliveryCompany[]> {
    return request<DeliveryCompany[]>("/delivery-companies");
  },

  async getById(id: number): Promise<DeliveryCompany> {
    return request<DeliveryCompany>(`/delivery-companies/${id}`);
  },

  async create(payload: CreateDeliveryCompanyPayload): Promise<DeliveryCompany> {
    return request<DeliveryCompany>("/delivery-companies", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
