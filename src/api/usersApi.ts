import { request } from "./client";

export interface CreateMerchantUserPayload {
  merchantId: number;
  fullName: string;
  email: string;
  password: string;
}

export interface MerchantUser {
  id: number;
  merchantId: number;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
}

export const usersApi = {
  /** POST /api/users/merchant */
  async createMerchantUser(payload: CreateMerchantUserPayload): Promise<MerchantUser> {
    return request<MerchantUser>("/users/merchant", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
