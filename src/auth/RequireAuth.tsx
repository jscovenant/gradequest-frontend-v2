import { Navigate, useLocation } from "react-router-dom";
import { getToken, getUser } from "../utils/token";
import type { ReactNode } from "react";

interface RequireAuthProps {
  children: ReactNode;
  roles?: string[];
  permissions?: string[];
}

export default function RequireAuth({ children, roles = [], permissions = [] }: RequireAuthProps) {
  const token = getToken();
  const user = getUser();
  const location = useLocation();

  if (!token) return <Navigate to="/login" replace />;

  if (user?.must_change_password && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  // Case-insensitive role check
  if (
    roles.length &&
    (!user || !roles.some((r) => r.toLowerCase() === user.role.toLowerCase()))
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (permissions.length) {
    const userPermissions = Array.isArray(user?.super_admin_permissions) ? user.super_admin_permissions : [];
    const canAccess = userPermissions.includes("all") || permissions.some((permission) => userPermissions.includes(permission));
    if (!canAccess) return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}



