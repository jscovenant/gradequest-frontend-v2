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
  if (roles.length) {
    const rawRole = (user?.role || "").toLowerCase().trim();
    const isSuperAdmin = rawRole === "superadmin" || rawRole === "super-admin";
    
    // SuperAdmin has full system access
    if (!isSuperAdmin) {
      const isAdminRole = ["admin", "owner", "proprietor", "school-admin", "principal", "headteacher"].includes(rawRole);
      const isOperatorRole = rawRole === "operator";
      const isTeacherRole = rawRole === "teacher";
      const isStudentRole = rawRole === "student";
      const isParentRole = rawRole === "parent";
      const isBursarRole = rawRole === "bursar";
      const isSalesRep = ["sales-representative", "sales_representative", "salesrep"].includes(rawRole);
      const isPlatformStaff = ["platform-staff", "platform_staff", "staff"].includes(rawRole);

      const normalizedRoles = roles.map((r) => r.toLowerCase().trim());

      let roleMatches = normalizedRoles.includes(rawRole);

      if (!roleMatches && isAdminRole && normalizedRoles.includes("admin")) {
        roleMatches = true;
      }

      if (!roleMatches && isTeacherRole && normalizedRoles.includes("teacher")) {
        roleMatches = true;
      }

      if (!roleMatches && isStudentRole && normalizedRoles.includes("student")) {
        roleMatches = true;
      }

      if (!roleMatches && isParentRole && normalizedRoles.includes("parent")) {
        roleMatches = true;
      }

      if (!roleMatches && isBursarRole && normalizedRoles.includes("bursar")) {
        roleMatches = true;
      }

      if (!roleMatches && isSalesRep && (normalizedRoles.includes("sales-representative") || normalizedRoles.includes("salesrep"))) {
        roleMatches = true;
      }

      if (!roleMatches && isPlatformStaff && (normalizedRoles.includes("platform-staff") || normalizedRoles.includes("staff"))) {
        roleMatches = true;
      }

      const isProprietorOnlyRoute = 
        location.pathname.startsWith("/school/bank-account") ||
        location.pathname.startsWith("/billing") ||
        location.pathname.startsWith("/wallet") ||
        location.pathname.startsWith("/school/settings") ||
        location.pathname.startsWith("/school/operators") ||
        location.pathname.startsWith("/admin/school/operators");

      const isOperatorAllowed = isOperatorRole && normalizedRoles.includes("admin") && !isProprietorOnlyRoute;

      if (!roleMatches && !isOperatorAllowed) {
        return <Navigate to="/unauthorized" replace />;
      }
    }
  }

  if (permissions.length) {
    const rawRole = (user?.role || "").toLowerCase().trim();
    const isSuperAdmin = rawRole === "superadmin" || rawRole === "super-admin";
    if (!isSuperAdmin) {
      const userPermissions = Array.isArray(user?.super_admin_permissions) ? user.super_admin_permissions : [];
      const canAccess = userPermissions.includes("all") || permissions.some((permission) => userPermissions.includes(permission));
      if (!canAccess) return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}



