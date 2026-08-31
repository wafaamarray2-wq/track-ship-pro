import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { authApi } from "@/api/authApi";
import { UserRole, type AuthUser, type LoginRequest } from "@/api/types";

interface AuthContextValue {
  user: AuthUser | null;
  isReady: boolean;
  login: (payload: LoginRequest) => Promise<AuthUser>;
  logout: () => void;
  can: (permission: Permission) => boolean;
}

/** Frontend permission map — mirrors the roles the API will enforce later. */
export const Permission = {
  ViewDashboard: "dashboard:view",
  ViewShipments: "shipments:view",
  CreateShipment: "shipments:create",
  UpdateShipmentStatus: "shipments:update-status",
  CancelShipment: "shipments:cancel",
  ViewAtRisk: "at-risk:view",
  ViewMerchants: "merchants:view",
  ManageMerchants: "merchants:manage",
  ViewActivity: "activity:view",
  ManageSettings: "settings:manage",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.Admin]: Object.values(Permission),
  [UserRole.Operator]: [
    Permission.ViewDashboard,
    Permission.ViewShipments,
    Permission.CreateShipment,
    Permission.UpdateShipmentStatus,
    Permission.CancelShipment,
    Permission.ViewAtRisk,
    Permission.ViewMerchants,
    Permission.ViewActivity,
  ],
  [UserRole.MerchantUser]: [
    Permission.ViewDashboard,
    Permission.ViewShipments,
    Permission.CreateShipment,
    Permission.ViewAtRisk,
  ],
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

useEffect(() => {
  const initializeAuth = async () => {
    const cachedUser = authApi.getCachedUser();

    if (!cachedUser) {
      setIsReady(true);
      return;
    }

    try {
      const currentUser = await authApi.me();
      setUser(currentUser);
    } catch {
      authApi.logout();
      setUser(null);
    } finally {
      setIsReady(true);
    }
  };

  initializeAuth();
}, []);

  const login = useCallback(async (payload: LoginRequest) => {
    const response = await authApi.login(payload);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
  }, []);

  const can = useCallback(
    (permission: Permission) => (user ? ROLE_PERMISSIONS[user.role].includes(permission) : false),
    [user],
  );

  const value = useMemo(() => ({ user, isReady, login, logout, can }), [user, isReady, login, logout, can]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
