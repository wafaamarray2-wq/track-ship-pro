import { request } from "./client";

export interface Driver {
  id: number;
  driverCode: string;
  fullName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  vehicleType: string;
  vehiclePlateNumber: string;
  isActive: boolean;
  deliveryCompanyId?: number | null;
}

export interface CreateDriverPayload {
  fullName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  vehicleType: string;
  vehiclePlateNumber: string;
}

export interface UpdateDriverPayload {
  fullName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  vehicleType: string;
  vehiclePlateNumber: string;
}

export const driversApi = {
  async list(): Promise<Driver[]> {
    return request<Driver[]>("/drivers");
  },

  async getById(id: number): Promise<Driver> {
    return request<Driver>(`/drivers/${id}`);
  },

  async create(payload: CreateDriverPayload): Promise<Driver> {
    return request<Driver>("/drivers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(id: number, payload: UpdateDriverPayload): Promise<Driver> {
    return request<Driver>(`/drivers/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async activate(id: number): Promise<Driver> {
    return request<Driver>(`/drivers/${id}/activate`, {
      method: "PATCH",
    });
  },

  async deactivate(id: number): Promise<Driver> {
    return request<Driver>(`/drivers/${id}/deactivate`, {
      method: "PATCH",
    });
  },

  async assignDeliveryCompany(id: number, deliveryCompanyId: number): Promise<Driver> {
    return request<Driver>(`/drivers/${id}/delivery-company`, {
      method: "PATCH",
      body: JSON.stringify({
        deliveryCompanyId,
      }),
    });
  },
};
