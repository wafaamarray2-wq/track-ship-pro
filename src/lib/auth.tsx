import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
  // Dashboard
  ViewDashboard: "dashboard:view",

  // Shipments
  ViewShipments: "shipments:view",
  CreateShipment: "shipments:create",
  UpdateShipmentStatus: "shipments:update-status",

  // At-Risk
  ViewAtRisk: "at-risk:view",

  // Merchants
  ViewMerchants: "merchants:view",
  ManageMerchants: "merchants:manage",

  // Drivers
  ViewDrivers: "drivers:view",
  ManageDrivers: "drivers:manage",
  AssignDriver: "drivers:assign",
  ViewDeliveryCompanies: "delivery-companies:view",
  // Shipment operations
  ViewShipmentTimeline: "shipments:timeline:view",
  ManageDeliveryAttempts: "shipments:delivery-attempts",
  ManageProofOfDelivery: "shipments:proof-of-delivery",

  // Activity
  ViewActivity: "activity:view",

  // Settings
  ManageSettings: "settings:manage",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.Admin]: Object.values(Permission),

  [UserRole.Operator]: [
    // Dashboard
    Permission.ViewDashboard,

    // Shipments
    Permission.ViewShipments,
    Permission.CreateShipment,
    Permission.UpdateShipmentStatus,
    Permission.ViewShipmentTimeline,

    // At-Risk
    Permission.ViewAtRisk,

    // Merchants
    Permission.ViewMerchants,
    Permission.ManageMerchants,

    // Drivers
    Permission.ViewDrivers,
    Permission.ManageDrivers,
    Permission.AssignDriver,

    // Delivery operations
    Permission.ManageDeliveryAttempts,
    Permission.ManageProofOfDelivery,

    // Activity
    Permission.ViewActivity,
  ],

  [UserRole.MerchantUser]: [
    // Dashboard
    Permission.ViewDashboard,

    // Own shipments
    Permission.ViewShipments,
    Permission.CreateShipment,
    Permission.ViewShipmentTimeline,

    // At-Risk
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

  const value = useMemo(
    () => ({ user, isReady, login, logout, can }),
    [user, isReady, login, logout, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
