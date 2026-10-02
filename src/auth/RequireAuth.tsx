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
    const normRole = (user?.normalized_role || user?.role || "").toLowerCase().replace(/[\s-]/g, "_");
    const isSuperAdmin = rawRole === "superadmin" || rawRole === "super-admin" || normRole === "super_admin";
    
    // SuperAdmin has full system access
    if (!isSuperAdmin) {
      const isAdminRole = ["admin", "owner", "proprietor", "school_admin", "school-admin", "principal", "headteacher"].includes(normRole) || ["admin", "owner", "proprietor", "school-admin", "principal", "headteacher"].includes(rawRole);
      const isOperatorRole = normRole === "operator" || rawRole === "operator";
      const isTeacherRole = ["teacher", "class_teacher", "class-teacher", "subject_teacher", "subject-teacher"].includes(normRole) || ["teacher", "class_teacher", "class-teacher", "subject_teacher", "subject-teacher"].includes(rawRole);
      const isStudentRole = ["student", "pupil"].includes(normRole) || ["student", "pupil"].includes(rawRole);
      const isParentRole = ["parent", "guardian"].includes(normRole) || ["parent", "guardian"].includes(rawRole);
      const isBursarRole = ["bursar", "accountant"].includes(normRole) || ["bursar", "accountant"].includes(rawRole);
      const isSalesRep = ["sales-representative", "sales_representative", "salesrep"].includes(normRole) || ["sales-representative", "sales_representative", "salesrep"].includes(rawRole);
      const isPlatformStaff = ["platform-staff", "platform_staff", "staff"].includes(normRole) || ["platform-staff", "platform_staff", "staff"].includes(rawRole);

      const normalizedRoles = roles.map((r) => r.toLowerCase().trim().replace(/[\s-]/g, "_"));

      let roleMatches = normalizedRoles.includes(normRole) || normalizedRoles.includes(rawRole);

      if (!roleMatches && isAdminRole && (normalizedRoles.includes("admin") || normalizedRoles.includes("proprietor"))) {
        roleMatches = true;
      }

      if (!roleMatches && isTeacherRole && (normalizedRoles.includes("teacher") || normalizedRoles.includes("class_teacher") || normalizedRoles.includes("subject_teacher"))) {
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

      if (!roleMatches && isSalesRep && (normalizedRoles.includes("sales_representative") || normalizedRoles.includes("salesrep"))) {
        roleMatches = true;
      }

      if (!roleMatches && isPlatformStaff && (normalizedRoles.includes("platform_staff") || normalizedRoles.includes("staff"))) {
        roleMatches = true;
      }

      const isProprietorOnlyRoute = 
        location.pathname.startsWith("/school/bank-account") ||
        location.pathname.startsWith("/billing") ||
        location.pathname.startsWith("/wallet") ||
        location.pathname.startsWith("/school/settings") ||
        location.pathname.startsWith("/school/operators") ||
        location.pathname.startsWith("/admin/school/operators") ||
        location.pathname.startsWith("/admin/school/domain-and-website") ||
        location.pathname.startsWith("/settings/whatsapp") ||
        location.pathname.startsWith("/bursar");

      const isPrincipalRole = normRole === "principal" || rawRole === "principal" || normRole === "headteacher" || normRole === "head_teacher";

      // Strictly deny Principal and Operator from accessing Proprietor-Only financial & platform ownership routes
      if ((isPrincipalRole || isOperatorRole) && isProprietorOnlyRoute) {
        return <Navigate to="/unauthorized" replace />;
      }

      // Strictly deny Operator from accessing Principal/Proprietor Executive Academic routes
      const isOperatorRestrictedRoute =
        isProprietorOnlyRoute ||
        location.pathname.startsWith("/teachers") ||
        location.pathname.startsWith("/teacher-subjects") ||
        location.pathname.startsWith("/attendance/logs") ||
        location.pathname.startsWith("/attendance/settings") ||
        location.pathname.startsWith("/grading-scale") ||
        location.pathname.startsWith("/academics/calendar") ||
        location.pathname.startsWith("/results/deadlines");

      if (isOperatorRole && isOperatorRestrictedRoute) {
        return <Navigate to="/unauthorized" replace />;
      }

      const isOperatorAllowed = isOperatorRole && normalizedRoles.includes("admin") && !isOperatorRestrictedRoute;

      if (!roleMatches && !isOperatorAllowed) {
        return <Navigate to="/unauthorized" replace />;
      }
    }
  }

  if (permissions.length) {
    const rawRole = (user?.role || "").toLowerCase().trim();
    const normRole = (user?.normalized_role || user?.role || "").toLowerCase().replace(/[\s-]/g, "_");
    const isSuperAdmin = rawRole === "superadmin" || rawRole === "super-admin" || normRole === "super_admin";
    if (!isSuperAdmin) {
      const userPermissions = Array.isArray(user?.super_admin_permissions) ? user.super_admin_permissions : [];
      const canAccess = userPermissions.includes("all") || permissions.some((permission) => userPermissions.includes(permission));
      if (!canAccess) return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}



