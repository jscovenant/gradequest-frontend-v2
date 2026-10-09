import { FormEvent, useEffect, useMemo, useState } from "react";
import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import PageTitle from "../../components/PageTitle";
import { useToast } from "../../contexts/ToastContext";
import { authApi } from "../../utils/axios";
import { getUser } from "../../utils/token";

interface PermissionItem {
  key: string;
  label: string;
  description: string;
  icon: string;
  color: string;
}

interface PermissionCategory {
  category: string;
  permissions: PermissionItem[];
}

interface RoleOption {
  key: string;
  label: string;
  category: string;
  color: string;
}

interface SchoolOption {
  id: number;
  school_name: string;
}

interface UserItem {
  id: number;
  firstname?: string;
  surname?: string;
  name: string;
  email: string;
  phone?: string;
  reg_no?: string;
  role: string;
  normalized_role: string;
  school_id?: number | null;
  school_name?: string;
  is_platform_staff: boolean;
  status: number;
  super_admin_type?: string;
  super_admin_type_label?: string;
  permissions: string[];
  created_at?: string;
}

interface Counts {
  total_users: number;
  platform_staff: number;
  school_admins: number;
  teachers: number;
  active_users: number;
  suspended_users: number;
}

const emptyNewUserForm = {
  firstname: "",
  surname: "",
  email: "",
  phone: "",
  role: "Platform-Staff",
  school_id: "",
  status: true,
  permissions: ["dashboard", "support"] as string[],
};

export default function UserRolesPermissionsPage() {
  const { showError, showSuccess } = useToast();
  const currentUser = getUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states
  const [users, setUsers] = useState<UserItem[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<PermissionCategory[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [counts, setCounts] = useState<Counts>({
    total_users: 0,
    platform_staff: 0,
    school_admins: 0,
    teachers: 0,
    active_users: 0,
    suspended_users: 0,
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [perPage, setPerPage] = useState(15);

  // Filter states
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Interaction loading states
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [togglingPermKey, setTogglingPermKey] = useState<string | null>(null);
  const [sendingLoginId, setSendingLoginId] = useState<number | null>(null);

  // Modals & Drawers
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<UserItem | null>(null);
  const [isPermDrawerOpen, setIsPermDrawerOpen] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState(emptyNewUserForm);
  const [savingNewUser, setSavingNewUser] = useState(false);
  const [createdTempPassword, setCreatedTempPassword] = useState<{ email: string; pass: string } | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Load users list
  async function fetchUsers(page = currentPage) {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        per_page: perPage,
      };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (roleFilter) params.role = roleFilter;
      if (schoolFilter) params.school_id = schoolFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await authApi.get("/superadmin/users-permissions", { params });
      const resData = res.data?.data;
      const meta = res.data?.meta;

      if (resData) {
        setUsers(Array.isArray(resData.data) ? resData.data : []);
        setCurrentPage(resData.current_page || 1);
        setLastPage(resData.last_page || 1);
        setTotalRecords(resData.total || 0);
      }

      if (meta) {
        if (Array.isArray(meta.available_permissions)) setAvailablePermissions(meta.available_permissions);
        if (Array.isArray(meta.available_roles)) setAvailableRoles(meta.available_roles);
        if (Array.isArray(meta.schools)) setSchools(meta.schools);
        if (meta.counts) setCounts(meta.counts);
      }
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to load user access directory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage, perPage, debouncedSearch, roleFilter, schoolFilter, statusFilter]);

  // Flattened permissions for lookup
  const allPermissionsMap = useMemo(() => {
    const map = new Map<string, PermissionItem>();
    availablePermissions.forEach((cat) => {
      cat.permissions.forEach((perm) => {
        map.set(perm.key, perm);
      });
    });
    return map;
  }, [availablePermissions]);

  // 1. Toggle Active / Suspended Status
  async function handleToggleStatus(user: UserItem) {
    if (currentUser?.id && Number(currentUser.id) === Number(user.id)) {
      showError("You cannot suspend your own administrator account.");
      return;
    }

    const newStatus = user.status ? 0 : 1;
    const statusLabel = newStatus ? "Activated" : "Suspended";

    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
    );
    if (selectedUserForPerms?.id === user.id) {
      setSelectedUserForPerms((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    setUpdatingUserId(user.id);
    try {
      const res = await authApi.patch(`/superadmin/users-permissions/${user.id}/status`, {
        status: newStatus,
      });
      showSuccess(res.data?.message || `${user.name} is now ${statusLabel}.`);
      setCounts((prev) => ({
        ...prev,
        active_users: newStatus ? prev.active_users + 1 : Math.max(0, prev.active_users - 1),
        suspended_users: !newStatus ? prev.suspended_users + 1 : Math.max(0, prev.suspended_users - 1),
      }));
    } catch (e: any) {
      // Revert optimistic update
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: user.status } : u))
      );
      if (selectedUserForPerms?.id === user.id) {
        setSelectedUserForPerms((prev) => (prev ? { ...prev, status: user.status } : null));
      }
      showError(e?.response?.data?.message || "Failed to update account status.");
    } finally {
      setUpdatingUserId(null);
    }
  }

  // 2. Change Role on the fly
  async function handleRoleChange(user: UserItem, newRole: string) {
    if (user.role === newRole) return;

    if (user.role?.toLowerCase().includes("super") && !newRole.toLowerCase().includes("super")) {
      const confirmed = window.confirm(
        `Are you sure you want to change ${user.name}'s role from Super Admin to '${newRole}'? This may restrict their platform authority.`
      );
      if (!confirmed) return;
    }

    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
    );
    if (selectedUserForPerms?.id === user.id) {
      setSelectedUserForPerms((prev) => (prev ? { ...prev, role: newRole } : null));
    }

    setUpdatingUserId(user.id);
    try {
      const res = await authApi.patch(`/superadmin/users-permissions/${user.id}/role`, {
        role: newRole,
      });
      showSuccess(res.data?.message || `Role updated to '${newRole}'.`);
      if (res.data?.user?.permissions) {
        const updatedPerms = res.data.user.permissions;
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, permissions: updatedPerms } : u))
        );
        if (selectedUserForPerms?.id === user.id) {
          setSelectedUserForPerms((prev) => (prev ? { ...prev, permissions: updatedPerms } : null));
        }
      }
    } catch (e: any) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: user.role } : u))
      );
      if (selectedUserForPerms?.id === user.id) {
        setSelectedUserForPerms((prev) => (prev ? { ...prev, role: user.role } : null));
      }
      showError(e?.response?.data?.message || "Failed to change user role.");
    } finally {
      setUpdatingUserId(null);
    }
  }

  // 3. Toggle a single permission on or off for a user
  async function handleToggleSinglePermission(permissionKey: string) {
    if (!selectedUserForPerms) return;

    const user = selectedUserForPerms;
    const isCurrentlyActive = (user.permissions || []).includes(permissionKey);
    const nextEnabled = !isCurrentlyActive;

    const updatedPermissions = nextEnabled
      ? Array.from(new Set([...(user.permissions || []), permissionKey]))
      : (user.permissions || []).filter((p) => p !== permissionKey);

    // Optimistic update
    setSelectedUserForPerms({
      ...user,
      permissions: updatedPermissions,
    });
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, permissions: updatedPermissions } : u))
    );

    setTogglingPermKey(permissionKey);
    try {
      const res = await authApi.patch(
        `/superadmin/users-permissions/${user.id}/toggle-permission`,
        {
          permission: permissionKey,
          enabled: nextEnabled,
        }
      );
      showSuccess(
        res.data?.message ||
          `Permission '${allPermissionsMap.get(permissionKey)?.label || permissionKey}' ${nextEnabled ? "enabled" : "revoked"}.`
      );
      if (res.data?.permissions) {
        const finalPerms = res.data.permissions;
        setSelectedUserForPerms((prev) => (prev ? { ...prev, permissions: finalPerms } : null));
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, permissions: finalPerms } : u))
        );
      }
    } catch (e: any) {
      // Revert optimistic update
      setSelectedUserForPerms({
        ...user,
        permissions: user.permissions,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, permissions: user.permissions } : u))
      );
      showError(e?.response?.data?.message || "Failed to update permission toggle.");
    } finally {
      setTogglingPermKey(null);
    }
  }

  // 4. Batch Apply Permission Presets
  async function applyPresetPermissions(presetKeys: string[], presetName: string) {
    if (!selectedUserForPerms) return;
    const user = selectedUserForPerms;

    setTogglingPermKey("batch");
    try {
      const res = await authApi.patch(
        `/superadmin/users-permissions/${user.id}/permissions`,
        { permissions: presetKeys }
      );
      showSuccess(res.data?.message || `${presetName} applied successfully.`);
      const newPerms = res.data?.permissions || presetKeys;
      setSelectedUserForPerms({ ...user, permissions: newPerms });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, permissions: newPerms } : u))
      );
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to apply permission preset.");
    } finally {
      setTogglingPermKey(null);
    }
  }

  // 5. Send or Reset Temporary Login Credentials
  async function handleSendLogin(user: UserItem) {
    const ok = window.confirm(
      `Generate a new secure temporary password and dispatch login instructions to ${user.email}?`
    );
    if (!ok) return;

    setSendingLoginId(user.id);
    try {
      const res = await authApi.post(`/superadmin/users-permissions/${user.id}/send-login`);
      showSuccess(res.data?.message || "Login credentials dispatched successfully.");
      if (res.data?.default_password) {
        setCreatedTempPassword({
          email: user.email,
          pass: res.data.default_password,
        });
      }
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to dispatch login details.");
    } finally {
      setSendingLoginId(null);
    }
  }

  // 6. Create New User
  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    setSavingNewUser(true);
    setCreatedTempPassword(null);
    try {
      const payload = {
        firstname: newUserForm.firstname.trim(),
        surname: newUserForm.surname.trim(),
        email: newUserForm.email.trim(),
        phone: newUserForm.phone.trim(),
        role: newUserForm.role,
        school_id: newUserForm.school_id ? Number(newUserForm.school_id) : null,
        status: newUserForm.status ? 1 : 0,
        permissions: newUserForm.permissions,
      };

      const res = await authApi.post("/superadmin/users-permissions", payload);
      showSuccess(res.data?.message || "User account created successfully.");

      if (res.data?.default_password) {
        setCreatedTempPassword({
          email: newUserForm.email,
          pass: res.data.default_password,
        });
      }

      setNewUserForm(emptyNewUserForm);
      setShowAddUserModal(false);
      await fetchUsers(1);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to create user account.");
    } finally {
      setSavingNewUser(false);
    }
  }

  // Quick stats card click handler to quickly filter
  function handleStatCardClick(type: string) {
    if (type === "all") {
      setRoleFilter("");
      setSchoolFilter("");
      setStatusFilter("all");
    } else if (type === "platform_staff") {
      setRoleFilter("platform_staff");
    } else if (type === "school_admins") {
      setRoleFilter("school_admins");
    } else if (type === "teachers") {
      setRoleFilter("teachers");
    } else if (type === "active") {
      setStatusFilter("1");
    } else if (type === "suspended") {
      setStatusFilter("0");
    }
    setCurrentPage(1);
  }

  const roleBadgeStyle = (role: string) => {
    const r = (role || "").toLowerCase().replace(/[\s-_]/g, "");
    if (r.includes("superadmin")) return { bg: "#0f172a", text: "#f8fafc", border: "#334155" };
    if (r.includes("platformstaff")) return { bg: "#312e81", text: "#e0e7ff", border: "#4338ca" };
    if (r.includes("proprietor") || r.includes("principal") || r.includes("admin")) return { bg: "#064e3b", text: "#a7f3d0", border: "#059669" };
    if (r.includes("operator")) return { bg: "#78350f", text: "#fef3c7", border: "#b45309" };
    if (r.includes("bursar")) return { bg: "#831843", text: "#fce7f3", border: "#db2777" };
    if (r.includes("teacher")) return { bg: "#065f46", text: "#d1fae5", border: "#10b981" };
    if (r.includes("sales")) return { bg: "#1e3a8a", text: "#dbeafe", border: "#3b82f6" };
    if (r.includes("parent")) return { bg: "#4c1d95", text: "#ede9fe", border: "#8b5cf6" };
    return { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" };
  };

  return (
    <>
      <style>{`
        .urp-main {
          min-height: 100vh;
          background: #f8fafc;
          margin-left: 280px;
          width: calc(100% - 280px);
          padding: 96px 26px 36px;
          transition: all 0.25s ease;
        }
        .urp-shell {
          max-width: 1440px;
          margin: 0 auto;
        }
        .urp-hero {
          background: linear-gradient(135deg, #0A192F 0%, #172554 45%, #0F2744 100%);
          color: #ffffff;
          border-radius: 20px;
          padding: 30px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          box-shadow: 0 15px 35px rgba(10, 25, 47, 0.25);
          position: relative;
          overflow: hidden;
        }
        .urp-hero::before {
          content: "";
          position: absolute;
          top: -40px;
          right: -40px;
          width: 220px;
          height: 220px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%);
          pointer-events: none;
        }
        .urp-hero-eyebrow {
          color: #f59e0b;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .urp-hero h1 {
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 900;
          margin: 8px 0 10px;
          font-size: clamp(26px, 3.5vw, 38px);
          letter-spacing: -0.02em;
        }
        .urp-hero p {
          margin: 0;
          color: rgba(255, 255, 255, 0.82);
          max-width: 820px;
          line-height: 1.65;
          font-size: 14.5px;
        }
        .urp-hero-actions {
          display: flex;
          gap: 12px;
          flex-shrink: 0;
          flex-wrap: wrap;
        }
        .urp-hero-btn {
          border: 0;
          border-radius: 12px;
          padding: 11px 18px;
          font-weight: 800;
          font-size: 13.5px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .urp-hero-btn-primary {
          background: #2563eb;
          color: #fff;
          box-shadow: 0 6px 18px rgba(37, 99, 235, 0.4);
        }
        .urp-hero-btn-primary:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }
        .urp-hero-btn-glass {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .urp-hero-btn-glass:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        /* KPI STATS CARDS */
        .urp-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 14px;
          margin-top: 20px;
        }
        .urp-stat-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px 18px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
          transition: all 0.2s ease;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .urp-stat-card:hover {
          border-color: #93c5fd;
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.08);
          transform: translateY(-2px);
        }
        .urp-stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        .urp-stat-val {
          font-size: 22px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.1;
        }
        .urp-stat-label {
          font-size: 11.5px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 3px;
        }

        /* FILTER BAR */
        .urp-filter-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 18px 20px;
          margin-top: 20px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
        }
        .urp-filter-grid {
          display: grid;
          grid-template-columns: 2fr 1.2fr 1.4fr 1.1fr auto;
          gap: 12px;
          align-items: center;
        }
        .urp-input-wrap {
          position: relative;
        }
        .urp-input-wrap i {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 14px;
        }
        .urp-input-wrap input {
          width: 100%;
          height: 42px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 0 12px 0 36px;
          font-size: 13.5px;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .urp-input-wrap input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .urp-select {
          height: 42px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 0 12px;
          font-size: 13.5px;
          outline: none;
          background: #fff;
          color: #334155;
          font-weight: 600;
          width: 100%;
        }
        .urp-select:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        /* TABLE SECTION */
        .urp-table-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          margin-top: 20px;
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.04);
          overflow: hidden;
        }
        .urp-table-header {
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fafafa;
        }
        .urp-table-title {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .urp-table-badge {
          background: #e2e8f0;
          color: #334155;
          font-size: 12px;
          font-weight: 800;
          border-radius: 999px;
          padding: 2px 8px;
        }
        .urp-table-wrap {
          overflow-x: auto;
        }
        .urp-table {
          width: 100%;
          min-width: 980px;
          border-collapse: separate;
          border-spacing: 0;
        }
        .urp-table th {
          background: #f8fafc;
          color: #475569;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 14px 16px;
          border-bottom: 1px solid #e2e8f0;
          text-align: left;
        }
        .urp-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .urp-table tr:hover td {
          background: #f8fafc;
        }

        /* USER IDENTITY CELL */
        .urp-user-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .urp-avatar {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: #0f172a;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 14px;
          flex-shrink: 0;
        }
        .urp-user-name {
          font-weight: 800;
          color: #0f172a;
          font-size: 14px;
          line-height: 1.2;
        }
        .urp-user-sub {
          color: #64748b;
          font-size: 12px;
          margin-top: 2px;
        }

        /* PILLS & BADGES */
        .urp-role-select {
          font-size: 12.5px;
          font-weight: 700;
          border-radius: 8px;
          padding: 6px 10px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          outline: none;
          cursor: pointer;
        }
        .urp-school-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f1f5f9;
          color: #334155;
          font-size: 12px;
          font-weight: 700;
          border-radius: 8px;
          padding: 4px 9px;
          border: 1px solid #e2e8f0;
          max-width: 220px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* INTERACTIVE TOGGLE SWITCH (iOS STYLE) */
        .urp-toggle {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          user-select: none;
        }
        .urp-toggle-track {
          width: 44px;
          height: 24px;
          background: #cbd5e1;
          border-radius: 999px;
          position: relative;
          transition: background 0.25s ease;
          display: inline-block;
          flex-shrink: 0;
        }
        .urp-toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .urp-toggle.active .urp-toggle-track {
          background: #10b981;
        }
        .urp-toggle.active .urp-toggle-thumb {
          transform: translateX(20px);
        }
        .urp-toggle-text {
          font-size: 12px;
          font-weight: 800;
          color: #475569;
        }
        .urp-toggle.active .urp-toggle-text {
          color: #047857;
        }

        /* PERMISSIONS SUMMARY BUBBLES */
        .urp-perm-summary {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .urp-perm-badge {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          font-size: 11px;
          font-weight: 800;
          border-radius: 999px;
          padding: 3px 9px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .urp-perm-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #2563eb;
        }

        /* ACTION BUTTONS */
        .urp-action-btn {
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #334155;
          border-radius: 9px;
          padding: 7px 12px;
          font-size: 12.5px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .urp-action-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        .urp-action-btn-primary {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
        }
        .urp-action-btn-primary:hover {
          background: #1d4ed8;
          border-color: #1d4ed8;
        }
        .urp-action-btn-mail {
          background: #ecfeff;
          color: #0e7490;
          border-color: #a5f3fc;
        }
        .urp-action-btn-mail:hover {
          background: #cffafe;
        }

        /* PAGINATION */
        .urp-pagination {
          padding: 16px 20px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fafafa;
        }
        .urp-page-btn {
          border: 1px solid #cbd5e1;
          background: #fff;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12.5px;
          font-weight: 700;
          color: #334155;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .urp-page-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        /* SLIDE OVER DRAWER / MODAL FOR PERMISSIONS */
        .urp-drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          z-index: 1050;
          display: flex;
          justify-content: flex-end;
          animation: fadeIn 0.2s ease;
        }
        .urp-drawer {
          width: 100%;
          max-width: 620px;
          background: #ffffff;
          height: 100%;
          box-shadow: -10px 0 35px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .urp-drawer-head {
          padding: 22px 24px;
          border-bottom: 1px solid #e2e8f0;
          background: linear-gradient(135deg, #0A192F 0%, #1E293B 100%);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .urp-drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 22px 24px;
        }
        .urp-drawer-foot {
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        /* PRESET BUTTONS */
        .urp-preset-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 22px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
        }
        .urp-preset-chip {
          border: 1px solid #cbd5e1;
          background: #fff;
          border-radius: 8px;
          padding: 5px 11px;
          font-size: 11.5px;
          font-weight: 800;
          color: #334155;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: all 0.15s ease;
        }
        .urp-preset-chip:hover {
          border-color: #2563eb;
          color: #2563eb;
          background: #eff6ff;
        }

        /* CATEGORY SECTION IN DRAWER */
        .urp-perm-category {
          margin-bottom: 22px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
        }
        .urp-perm-cat-head {
          padding: 12px 16px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #475569;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .urp-perm-item {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          transition: background 0.15s ease;
        }
        .urp-perm-item:last-child {
          border-bottom: none;
        }
        .urp-perm-item:hover {
          background: #fafafa;
        }
        .urp-perm-meta {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          flex: 1;
        }
        .urp-perm-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
        .urp-perm-title {
          font-size: 13.5px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 2px;
        }
        .urp-perm-desc {
          font-size: 12px;
          color: #64748b;
          line-height: 1.4;
          margin: 0;
        }

        /* ADD USER MODAL */
        .urp-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          z-index: 1060;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }
        .urp-modal {
          background: #ffffff;
          border-radius: 20px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        @media (max-width: 1199px) {
          .urp-main {
            margin-left: 0;
            width: 100%;
            padding: 92px 16px 32px;
          }
          .urp-hero {
            flex-direction: column;
            align-items: flex-start;
          }
          .urp-filter-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="User Roles & Permissions" />
      <PageTitle title="User Roles & Permissions" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="urp-main">
            {loading && <Loader message="Loading User Access Directory..." />}

            <div className="urp-shell">
              {/* HERO SECTION */}
              <section className="urp-hero">
                <div>
                  <div className="urp-hero-eyebrow">
                    <i className="bi bi-shield-lock-fill" /> Master Access Control &amp; Delegation
                  </div>
                  <h1>User Roles &amp; Permissions</h1>
                  <p>
                    Inspect registered users across the entire platform, adjust roles in real time, and use interactive toggle switches to enable or revoke granular feature permissions instantly.
                  </p>
                </div>
                <div className="urp-hero-actions">
                  <button
                    className="urp-hero-btn urp-hero-btn-primary"
                    onClick={() => {
                      setCreatedTempPassword(null);
                      setShowAddUserModal(true);
                    }}
                  >
                    <i className="bi bi-person-plus-fill" /> Add New User
                  </button>
                  <button className="urp-hero-btn urp-hero-btn-glass" onClick={() => fetchUsers(currentPage)}>
                    <i className="bi bi-arrow-repeat" /> Refresh Data
                  </button>
                </div>
              </section>

              {/* TEMP PASSWORD ALERT BANNER */}
              {createdTempPassword && (
                <div
                  className="alert mt-3 d-flex align-items-center justify-content-between flex-wrap gap-2"
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #86efac",
                    borderRadius: 14,
                    color: "#166534",
                    padding: "16px 20px",
                  }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "#22c55e",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                      }}
                    >
                      <i className="bi bi-key-fill" />
                    </div>
                    <div>
                      <div className="fw-bold fs-6">Login Credentials Generated!</div>
                      <div className="small">
                        Temporary login password for <strong>{createdTempPassword.email}</strong> is:{" "}
                        <code
                          style={{
                            background: "#dcfce7",
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontWeight: 800,
                            color: "#15803d",
                            fontSize: 14,
                          }}
                        >
                          {createdTempPassword.pass}
                        </code>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-success fw-bold px-3"
                      style={{ borderRadius: 8 }}
                      onClick={() => {
                        navigator.clipboard.writeText(createdTempPassword.pass);
                        showSuccess("Password copied to clipboard!");
                      }}
                    >
                      <i className="bi bi-clipboard me-1" /> Copy Password
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      style={{ borderRadius: 8 }}
                      onClick={() => setCreatedTempPassword(null)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* METRIC KPI CARDS */}
              <section className="urp-stats-grid">
                <div className="urp-stat-card" onClick={() => handleStatCardClick("all")} title="Click to view all platform users">
                  <div className="urp-stat-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
                    <i className="bi bi-people-fill" />
                  </div>
                  <div>
                    <div className="urp-stat-val">{counts.total_users.toLocaleString()}</div>
                    <div className="urp-stat-label">Total Users</div>
                  </div>
                </div>

                <div className="urp-stat-card" onClick={() => handleStatCardClick("platform_staff")} title="Click to filter Platform Staff">
                  <div className="urp-stat-icon" style={{ background: "#eef2ff", color: "#4f46e5" }}>
                    <i className="bi bi-shield-check" />
                  </div>
                  <div>
                    <div className="urp-stat-val">{counts.platform_staff.toLocaleString()}</div>
                    <div className="urp-stat-label">Platform Staff</div>
                  </div>
                </div>

                <div className="urp-stat-card" onClick={() => handleStatCardClick("school_admins")} title="Click to filter School Admins">
                  <div className="urp-stat-icon" style={{ background: "#fffbeb", color: "#d97706" }}>
                    <i className="bi bi-buildings" />
                  </div>
                  <div>
                    <div className="urp-stat-val">{counts.school_admins.toLocaleString()}</div>
                    <div className="urp-stat-label">School Admins</div>
                  </div>
                </div>

                <div className="urp-stat-card" onClick={() => handleStatCardClick("teachers")} title="Click to filter Teachers">
                  <div className="urp-stat-icon" style={{ background: "#ecfdf5", color: "#059669" }}>
                    <i className="bi bi-mortarboard-fill" />
                  </div>
                  <div>
                    <div className="urp-stat-val">{counts.teachers.toLocaleString()}</div>
                    <div className="urp-stat-label">Teachers</div>
                  </div>
                </div>

                <div className="urp-stat-card" onClick={() => handleStatCardClick("active")} title="Click to filter Active users">
                  <div className="urp-stat-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>
                    <i className="bi bi-check-circle-fill" />
                  </div>
                  <div>
                    <div className="urp-stat-val">{counts.active_users.toLocaleString()}</div>
                    <div className="urp-stat-label">Active</div>
                  </div>
                </div>

                <div className="urp-stat-card" onClick={() => handleStatCardClick("suspended")} title="Click to filter Suspended users">
                  <div className="urp-stat-icon" style={{ background: "#fef2f2", color: "#dc2626" }}>
                    <i className="bi bi-slash-circle-fill" />
                  </div>
                  <div>
                    <div className="urp-stat-val">{counts.suspended_users.toLocaleString()}</div>
                    <div className="urp-stat-label">Suspended</div>
                  </div>
                </div>
              </section>

              {/* FILTER CONTROLS */}
              <section className="urp-filter-card">
                <div className="urp-filter-grid">
                  {/* Search */}
                  <div className="urp-input-wrap">
                    <i className="bi bi-search" />
                    <input
                      type="text"
                      placeholder="Search by name, email, phone, reg no..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  {/* Role filter */}
                  <div>
                    <select
                      className="urp-select"
                      value={roleFilter}
                      onChange={(e) => {
                        setRoleFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="">All Roles</option>
                      <option value="superadmin">Super Admin (Owner)</option>
                      <option value="platform_staff">Platform Staff</option>
                      <option value="school_admins">School Admins (All)</option>
                      <option value="proprietor">Proprietor / Owner</option>
                      <option value="principal">Principal / Head Teacher</option>
                      <option value="operator">School Operator</option>
                      <option value="bursar">Bursar / Accountant</option>
                      <option value="teachers">Teachers (All)</option>
                      <option value="teacher">Teacher</option>
                      <option value="class_teacher">Class Teacher</option>
                      <option value="parent">Parent</option>
                      <option value="student">Student</option>
                      <option value="sales-representative">Sales Representative</option>
                    </select>
                  </div>

                  {/* School filter */}
                  <div>
                    <select
                      className="urp-select"
                      value={schoolFilter}
                      onChange={(e) => {
                        setSchoolFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="">All Schools / Tenants</option>
                      <option value="platform">Platform HQ (No School)</option>
                      {schools.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.school_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status filter */}
                  <div>
                    <select
                      className="urp-select"
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="1">Active Only</option>
                      <option value="0">Suspended Only</option>
                    </select>
                  </div>

                  {/* Reset Filters */}
                  <div>
                    <button
                      className="urp-action-btn"
                      onClick={() => {
                        setSearch("");
                        setRoleFilter("");
                        setSchoolFilter("");
                        setStatusFilter("all");
                        setCurrentPage(1);
                      }}
                      title="Clear all filters"
                    >
                      <i className="bi bi-x-circle" /> Reset
                    </button>
                  </div>
                </div>
              </section>

              {/* USERS DIRECTORY TABLE */}
              <section className="urp-table-card">
                <div className="urp-table-header">
                  <div className="d-flex align-items-center gap-3">
                    <h2 className="urp-table-title">
                      <i className="bi bi-person-lines-fill text-primary" /> Users Access &amp; Permissions Directory
                    </h2>
                    <span className="urp-table-badge">{totalRecords.toLocaleString()} Users Found</span>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <span className="small text-muted fw-bold">Rows:</span>
                    <select
                      className="urp-select"
                      style={{ height: 32, width: 75, padding: "0 6px", fontSize: 12 }}
                      value={perPage}
                      onChange={(e) => {
                        setPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="urp-table-wrap">
                  <table className="urp-table">
                    <thead>
                      <tr>
                        <th>User Identity</th>
                        <th>Institution / Tenant</th>
                        <th>Assigned Role</th>
                        <th>Status</th>
                        <th>Permissions Summary</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: "50px 20px" }}>
                            <div className="text-muted">
                              <i className="bi bi-person-slash fs-1 d-block mb-2 text-secondary" />
                              <div className="fw-bold fs-6">No users matched your search criteria</div>
                              <div className="small">Try adjusting search filters or clear parameters</div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => {
                          const badge = roleBadgeStyle(user.role);
                          const isSelf = currentUser?.id && Number(currentUser.id) === Number(user.id);
                          const activePermCount = (user.permissions || []).length;

                          return (
                            <tr key={user.id}>
                              {/* 1. User Identity */}
                              <td>
                                <div className="urp-user-cell">
                                  <div
                                    className="urp-avatar"
                                    style={{
                                      background: badge.bg,
                                      color: badge.text,
                                      border: `1px solid ${badge.border}`,
                                    }}
                                  >
                                    {(user.firstname?.[0] || user.name?.[0] || "U").toUpperCase()}
                                    {(user.surname?.[0] || "").toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="urp-user-name">
                                      {user.name}{" "}
                                      {isSelf && (
                                        <span className="badge bg-primary-subtle text-primary border ms-1" style={{ fontSize: 10 }}>
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <div className="urp-user-sub">{user.email}</div>
                                    {(user.phone || user.reg_no) && (
                                      <div className="urp-user-sub" style={{ fontSize: 11, color: "#94a3b8" }}>
                                        {user.phone && <span>{user.phone}</span>}
                                        {user.phone && user.reg_no && <span> • </span>}
                                        {user.reg_no && <span>ID: {user.reg_no}</span>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* 2. School Tenant */}
                              <td>
                                <div className="urp-school-pill" title={user.school_name}>
                                  <i className="bi bi-building text-secondary" />
                                  <span>{user.school_name || "Platform HQ"}</span>
                                </div>
                              </td>

                              {/* 3. Role Selector (Instant Change) */}
                              <td>
                                <select
                                  className="urp-role-select"
                                  value={user.role}
                                  disabled={updatingUserId === user.id}
                                  onChange={(e) => handleRoleChange(user, e.target.value)}
                                  style={{
                                    borderColor: badge.border,
                                    background: "#fcfdfe",
                                  }}
                                  title="Change user role on the fly"
                                >
                                  {availableRoles.length > 0 ? (
                                    availableRoles.map((r) => (
                                      <option key={r.key} value={r.key}>
                                        {r.label} ({r.category})
                                      </option>
                                    ))
                                  ) : (
                                    <>
                                      <option value="Super-Admin">Super Admin (Owner)</option>
                                      <option value="Platform-Staff">Platform Staff</option>
                                      <option value="proprietor">Proprietor / School Owner</option>
                                      <option value="principal">Principal / Head Teacher</option>
                                      <option value="operator">School Operator</option>
                                      <option value="bursar">Bursar / Accountant</option>
                                      <option value="teacher">Teacher</option>
                                      <option value="class_teacher">Class Teacher</option>
                                      <option value="subject_teacher">Subject Teacher</option>
                                      <option value="Parent">Parent</option>
                                      <option value="Student">Student</option>
                                      <option value="Sales-Representative">Sales Representative</option>
                                    </>
                                  )}
                                </select>
                              </td>

                              {/* 4. Active/Suspended Interactive Toggle */}
                              <td>
                                <div
                                  className={`urp-toggle ${user.status ? "active" : ""}`}
                                  onClick={() => handleToggleStatus(user)}
                                  title={
                                    isSelf
                                      ? "You cannot suspend your own account"
                                      : user.status
                                      ? "Click to suspend account access"
                                      : "Click to reinstate account access"
                                  }
                                  style={{ opacity: isSelf ? 0.6 : 1 }}
                                >
                                  <span className="urp-toggle-track">
                                    <span className="urp-toggle-thumb" />
                                  </span>
                                  <span className="urp-toggle-text">
                                    {user.status ? "Active" : "Suspended"}
                                  </span>
                                </div>
                              </td>

                              {/* 5. Permissions Summary Badges */}
                              <td>
                                <div className="urp-perm-summary">
                                  <span
                                    className="urp-perm-badge"
                                    style={{
                                      background: activePermCount > 0 ? "#eff6ff" : "#f1f5f9",
                                      color: activePermCount > 0 ? "#1d4ed8" : "#64748b",
                                      borderColor: activePermCount > 0 ? "#bfdbfe" : "#e2e8f0",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => {
                                      setSelectedUserForPerms(user);
                                      setIsPermDrawerOpen(true);
                                    }}
                                    title="Click to view and toggle permissions"
                                  >
                                    <span className="urp-perm-dot" style={{ background: activePermCount > 0 ? "#2563eb" : "#94a3b8" }} />
                                    {activePermCount} Active
                                  </span>

                                  {/* Preview up to 2 specific badges */}
                                  {(user.permissions || []).slice(0, 2).map((pkey) => {
                                    const pMeta = allPermissionsMap.get(pkey);
                                    return (
                                      <span
                                        key={pkey}
                                        className="badge bg-light text-dark border"
                                        style={{ fontSize: 10, padding: "3px 6px" }}
                                        title={pMeta?.description || pkey}
                                      >
                                        {pMeta?.label?.split("&")?.[0]?.trim() || pkey}
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>

                              {/* 6. Action Buttons */}
                              <td style={{ textAlign: "right" }}>
                                <div className="d-flex justify-content-end gap-2">
                                  <button
                                    className="urp-action-btn urp-action-btn-primary"
                                    onClick={() => {
                                      setSelectedUserForPerms(user);
                                      setIsPermDrawerOpen(true);
                                    }}
                                    title="Open interactive permission toggles"
                                  >
                                    <i className="bi bi-toggles" /> Toggle Permissions
                                  </button>

                                  <button
                                    className="urp-action-btn urp-action-btn-mail"
                                    disabled={sendingLoginId === user.id}
                                    onClick={() => handleSendLogin(user)}
                                    title="Send temporary login details"
                                  >
                                    <i className="bi bi-key" />
                                    {sendingLoginId === user.id ? "Sending..." : "Reset"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION BAR */}
                <div className="urp-pagination">
                  <div className="small text-muted">
                    Showing <strong>{users.length > 0 ? (currentPage - 1) * perPage + 1 : 0}</strong> to{" "}
                    <strong>{Math.min(currentPage * perPage, totalRecords)}</strong> of{" "}
                    <strong>{totalRecords.toLocaleString()}</strong> users
                  </div>

                  <div className="d-flex gap-2 align-items-center">
                    <button
                      className="urp-page-btn"
                      disabled={currentPage <= 1 || loading}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <i className="bi bi-chevron-left" /> Previous
                    </button>
                    <span className="small fw-bold px-2">
                      Page {currentPage} of {Math.max(1, lastPage)}
                    </span>
                    <button
                      className="urp-page-btn"
                      disabled={currentPage >= lastPage || loading}
                      onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
                    >
                      Next <i className="bi bi-chevron-right" />
                    </button>
                  </div>
                </div>
              </section>

              {/* SLIDE-OVER DRAWER: INTERACTIVE PERMISSIONS TOGGLE CENTER */}
              {isPermDrawerOpen && selectedUserForPerms && (
                <div
                  className="urp-drawer-overlay"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setIsPermDrawerOpen(false);
                  }}
                >
                  <div className="urp-drawer">
                    {/* Drawer Header */}
                    <div className="urp-drawer-head">
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className="badge bg-warning text-dark fw-bold" style={{ fontSize: 10 }}>
                            {selectedUserForPerms.role}
                          </span>
                          <span className="small text-white-50">{selectedUserForPerms.school_name || "Platform HQ"}</span>
                        </div>
                        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
                          {selectedUserForPerms.name}
                        </h3>
                        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
                          {selectedUserForPerms.email}
                        </div>
                      </div>
                      <button
                        className="btn btn-sm btn-outline-light rounded-circle"
                        style={{ width: 34, height: 34, padding: 0 }}
                        onClick={() => setIsPermDrawerOpen(false)}
                      >
                        <i className="bi bi-x-lg" />
                      </button>
                    </div>

                    {/* Drawer Body */}
                    <div className="urp-drawer-body">
                      {/* Presets Toolbar */}
                      <div className="small fw-bold text-muted mb-2 text-uppercase" style={{ letterSpacing: "0.08em" }}>
                        Quick Presets
                      </div>
                      <div className="urp-preset-grid">
                        <button
                          className="urp-preset-chip"
                          onClick={() => {
                            const allKeys = Array.from(allPermissionsMap.keys());
                            applyPresetPermissions(allKeys, "Full Platform Access");
                          }}
                        >
                          <i className="bi bi-stars text-warning" /> Full Access
                        </button>
                        <button
                          className="urp-preset-chip"
                          onClick={() => {
                            applyPresetPermissions(["dashboard", "finance", "billing"], "Finance Preset");
                          }}
                        >
                          <i className="bi bi-cash-coin text-success" /> Finance Specialist
                        </button>
                        <button
                          className="urp-preset-chip"
                          onClick={() => {
                            applyPresetPermissions(["support", "schools", "twilio_whatsapp", "cbt_management"], "Support Preset");
                          }}
                        >
                          <i className="bi bi-headset text-info" /> Support Agent
                        </button>
                        <button
                          className="urp-preset-chip"
                          onClick={() => {
                            applyPresetPermissions(["schools", "staff", "domains", "cbt_management", "settings"], "Operations Preset");
                          }}
                        >
                          <i className="bi bi-gear text-primary" /> Operations Manager
                        </button>
                        <button
                          className="urp-preset-chip"
                          onClick={() => {
                            applyPresetPermissions(["marketing", "content", "sales"], "Growth & Content Preset");
                          }}
                        >
                          <i className="bi bi-megaphone text-danger" /> Marketing &amp; Growth
                        </button>
                        <button
                          className="urp-preset-chip text-danger"
                          onClick={() => {
                            applyPresetPermissions([], "Clear All Permissions");
                          }}
                        >
                          <i className="bi bi-trash" /> Clear All
                        </button>
                      </div>

                      {/* Categorized Permissions Grid with Live Toggles */}
                      {availablePermissions.map((category) => {
                        const activeInCategory = category.permissions.filter((p) =>
                          (selectedUserForPerms.permissions || []).includes(p.key)
                        ).length;

                        return (
                          <div key={category.category} className="urp-perm-category">
                            <div className="urp-perm-cat-head">
                              <span>{category.category}</span>
                              <span className="badge bg-secondary-subtle text-dark">
                                {activeInCategory} of {category.permissions.length} Enabled
                              </span>
                            </div>

                            {category.permissions.map((perm) => {
                              const isEnabled = (selectedUserForPerms.permissions || []).includes(perm.key);
                              const isToggling = togglingPermKey === perm.key;

                              return (
                                <div key={perm.key} className="urp-perm-item">
                                  <div className="urp-perm-meta">
                                    <div
                                      className="urp-perm-icon"
                                      style={{
                                        background: isEnabled ? `${perm.color}15` : "#f1f5f9",
                                        color: isEnabled ? perm.color : "#94a3b8",
                                      }}
                                    >
                                      <i className={`bi ${perm.icon}`} />
                                    </div>
                                    <div>
                                      <div className="urp-perm-title">
                                        {perm.label}
                                        {isEnabled && (
                                          <span
                                            className="badge ms-2"
                                            style={{
                                              background: "#dcfce7",
                                              color: "#15803d",
                                              fontSize: 10,
                                              padding: "2px 6px",
                                            }}
                                          >
                                            Active
                                          </span>
                                        )}
                                      </div>
                                      <p className="urp-perm-desc">{perm.description}</p>
                                    </div>
                                  </div>

                                  {/* Interactive Toggle Switch */}
                                  <div>
                                    <div
                                      className={`urp-toggle ${isEnabled ? "active" : ""}`}
                                      onClick={() => !isToggling && handleToggleSinglePermission(perm.key)}
                                      style={{ opacity: isToggling ? 0.5 : 1 }}
                                      title={isEnabled ? "Click to disable permission" : "Click to enable permission"}
                                    >
                                      <span className="urp-toggle-track">
                                        <span className="urp-toggle-thumb" />
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>

                    {/* Drawer Footer */}
                    <div className="urp-drawer-foot">
                      <div className="small text-muted">
                        Total Permissions Enabled:{" "}
                        <strong className="text-primary fs-6">
                          {(selectedUserForPerms.permissions || []).length}
                        </strong>
                      </div>
                      <button
                        className="btn btn-primary fw-bold px-4"
                        style={{ borderRadius: 10 }}
                        onClick={() => setIsPermDrawerOpen(false)}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL: CREATE NEW USER */}
              {showAddUserModal && (
                <div
                  className="urp-modal-overlay"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setShowAddUserModal(false);
                  }}
                >
                  <div className="urp-modal">
                    <div className="modal-header p-3 px-4 border-bottom bg-light">
                      <h5 className="modal-title fw-bold" style={{ color: "#0f172a" }}>
                        <i className="bi bi-person-plus-fill text-primary me-2" />
                        Create New User &amp; Assign Permissions
                      </h5>
                      <button
                        type="button"
                        className="btn-close"
                        onClick={() => setShowAddUserModal(false)}
                      />
                    </div>

                    <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
                      <div className="modal-body p-4" style={{ overflowY: "auto" }}>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label small fw-bold text-uppercase">First Name</label>
                            <input
                              className="form-control"
                              value={newUserForm.firstname}
                              onChange={(e) => setNewUserForm({ ...newUserForm, firstname: e.target.value })}
                              required
                            />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label small fw-bold text-uppercase">Surname</label>
                            <input
                              className="form-control"
                              value={newUserForm.surname}
                              onChange={(e) => setNewUserForm({ ...newUserForm, surname: e.target.value })}
                            />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label small fw-bold text-uppercase">Email Address</label>
                            <input
                              type="email"
                              className="form-control"
                              value={newUserForm.email}
                              onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                              required
                            />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label small fw-bold text-uppercase">Phone Number</label>
                            <input
                              type="tel"
                              className="form-control"
                              value={newUserForm.phone}
                              onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                            />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label small fw-bold text-uppercase">Assigned Role</label>
                            <select
                              className="form-select"
                              value={newUserForm.role}
                              onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                              required
                            >
                              {availableRoles.map((r) => (
                                <option key={r.key} value={r.key}>
                                  {r.label} ({r.category})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="col-md-6">
                            <label className="form-label small fw-bold text-uppercase">Institution Tenant</label>
                            <select
                              className="form-select"
                              value={newUserForm.school_id}
                              onChange={(e) => setNewUserForm({ ...newUserForm, school_id: e.target.value })}
                            >
                              <option value="">Platform HQ (No School Tenant)</option>
                              {schools.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.school_name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Initial Permissions Toggles */}
                        <div className="mt-4">
                          <label className="form-label small fw-bold text-uppercase d-flex justify-content-between">
                            <span>Initial Permissions</span>
                            <span className="text-muted fw-normal">
                              {newUserForm.permissions.length} selected
                            </span>
                          </label>

                          <div
                            style={{
                              maxHeight: 200,
                              overflowY: "auto",
                              border: "1px solid #e2e8f0",
                              borderRadius: 10,
                              padding: 10,
                              background: "#f8fafc",
                            }}
                          >
                            {availablePermissions.flatMap((c) => c.permissions).map((perm) => {
                              const checked = newUserForm.permissions.includes(perm.key);
                              return (
                                <div
                                  key={perm.key}
                                  className="form-check py-1 d-flex align-items-center justify-content-between"
                                  style={{ cursor: "pointer" }}
                                  onClick={() => {
                                    setNewUserForm((prev) => ({
                                      ...prev,
                                      permissions: checked
                                        ? prev.permissions.filter((k) => k !== perm.key)
                                        : [...prev.permissions, perm.key],
                                    }));
                                  }}
                                >
                                  <div>
                                    <input
                                      type="checkbox"
                                      className="form-check-input me-2"
                                      checked={checked}
                                      onChange={() => {}}
                                    />
                                    <label className="form-check-label fw-bold small text-dark">
                                      {perm.label}
                                    </label>
                                  </div>
                                  <span className="small text-muted" style={{ fontSize: 11 }}>
                                    {perm.key}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="modal-footer p-3 bg-light border-top d-flex justify-content-between">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowAddUserModal(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary fw-bold px-4"
                          disabled={savingNewUser}
                        >
                          {savingNewUser ? "Creating Account..." : "Create User Account"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
