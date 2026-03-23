import { Navigate } from "react-router-dom";
import { getToken, getUser } from "../utils/token";
import type { ReactNode } from "react";

interface RequireAuthProps {
  children: ReactNode;
  roles?: string[];
}

export default function RequireAuth({ children, roles = [] }: RequireAuthProps) {
  const token = getToken();
  const user = getUser();

  if (!token) return <Navigate to="/login" replace />;

  // Case-insensitive role check
  if (
    roles.length &&
    (!user || !roles.some((r) => r.toLowerCase() === user.role.toLowerCase()))
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
