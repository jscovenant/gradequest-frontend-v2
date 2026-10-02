import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";

import TopNav from "../LayoutComponents/TopNav";
import Sidebar from "../LayoutComponents/Sidebar";
import Footer from "../LayoutComponents/Footer";
import Loader from "../ui/dashboardLoader";
import { authApi } from "../../utils/axios";
import { getUser } from "../../utils/token";
import { useToast } from "../../contexts/ToastContext";

/* ==========================================================================
   TYPES
   ========================================================================== */

type SchoolInfo = {
  id: number;
  school_name: string;
  active_edition_tier?: string | null;
  active_edition_tier_label?: string | null;
  online_payment_enabled?: boolean | number;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  created_at?: string | null;
};

type SchoolOwnerRow = {
  id: number;
  firstname: string;
  surname: string;
  name?: string;
  email: string;
  phone?: string | null;
  status: string | number;
  role: string;
  school_id?: number | null;
  student_count?: number;
  active_edition_tier?: string;
  active_edition_tier_label?: string;
  online_payment_enabled?: boolean;
  created_at?: string | null;
  school?: SchoolInfo | null;
};

type TierCounts = {
  total: number;
  standard_cbt: number;
  basic_result: number;
  annual_full_session: number;
  online_pay_enabled: number;
  online_pay_disabled: number;
};

type Paginated<T> = {
  current_page: number;
  data: T[];
  from?: number | null;
  to?: number | null;
  last_page: number;
  per_page: number;
  total: number;
  tier_counts?: TierCounts;
};

type MonthlyRevenueRow = {
  month: string;
  revenue: number;
};

type LogRow = {
  id: number;
  user_id?: number | null;
  user_name?: string | null;
  action?: string | null;
  description?: string | null;
  created_at?: string | null;
};

/* ==========================================================================
   HELPERS & FORMATTERS
   ========================================================================== */

function fmtNaira(val: number) {
  return "₦" + Number(val || 0).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(val?: string | null) {
  if (!val) return "—";
  const d = new Date(val);
  return Number.isNaN(d.getTime())
    ? val
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function personName(u?: { firstname?: string; surname?: string; name?: string; email?: string } | null) {
  if (!u) return "—";
  const full = `${u.firstname || ""} ${u.surname || ""}`.trim();
  return full || u.name || u.email || "—";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "SP";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

function getTierBadgeInfo(tier?: string | null) {
  const t = (tier || "").toLowerCase();
  if (t === "basic_result") {
    return {
      label: "Basic Result Edition",
      className: "sa-tier-basic",
      icon: "bi-file-earmark-text",
    };
  }
  if (t === "annual_full_session") {
    return {
      label: "Annual Full Session",
      className: "sa-tier-annual",
      icon: "bi-calendar-check",
    };
  }
  return {
    label: "Standard CBT & AI",
    className: "sa-tier-standard",
    icon: "bi-cpu",
  };
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export default function SuperAdminDashboard() {
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Revenue & Students
  const [revenueRows, setRevenueRows] = useState<MonthlyRevenueRow[]>([]);
  const [activeStudentsCount, setActiveStudentsCount] = useState<number>(0);

  // School Owners / Schools Listing
  const [schoolsData, setSchoolsData] = useState<Paginated<SchoolOwnerRow> | null>(null);
  const [schoolsPage, setSchoolsPage] = useState(1);
  const [schoolsPerPage, setSchoolsPerPage] = useState(10);
  const [schoolsSearch, setSchoolsSearch] = useState("");
  const [schoolsTier, setSchoolsTier] = useState<string>("all");
  const [schoolsOnlinePay, setSchoolsOnlinePay] = useState<string>("all");
  const [schoolsStatus, setSchoolsStatus] = useState<string>("all");
  const [togglingAdminId, setTogglingAdminId] = useState<number | null>(null);

  // Activity Logs
  const [logs, setLogs] = useState<Paginated<LogRow> | null>(null);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(10);
  const [selectedLogs, setSelectedLogs] = useState<number[]>([]);
  const [deletingLogs, setDeletingLogs] = useState(false);

  // Platform Maintenance State
  const [maintenanceState, setMaintenanceState] = useState<{
    is_active: boolean;
    is_scheduled?: boolean;
    is_in_effect?: boolean;
    start_time?: string | null;
    end_time?: string | null;
    message: string;
  }>({
    is_active: false,
    is_scheduled: false,
    is_in_effect: false,
    start_time: null,
    end_time: null,
    message: "We are working harder to make things better, please hold on...",
  });
  const [maintenanceUpdating, setMaintenanceUpdating] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"immediate" | "scheduled">("immediate");
  const [customMaintenanceMsg, setCustomMaintenanceMsg] = useState("We are working harder to make things better, please hold on...");
  const [scheduledStartTime, setScheduledStartTime] = useState("");
  const [sendEmailNotification, setSendEmailNotification] = useState(true);

  // Split Gateway & SaaS Metrics
  const [platformTechFeesEarned, setPlatformTechFeesEarned] = useState<number>(0);
  const [platformGmv, setPlatformGmv] = useState<number>(0);
  const [gatewaySplitHealth, setGatewaySplitHealth] = useState<{
    total_schools: number;
    split_ready_schools: number;
    online_payment_enabled_schools: number;
    split_health_percentage: number;
  } | null>(null);

  // 3-Step Multi-Tenant School Onboarding State
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardStep, setOnboardStep] = useState<1 | 2 | 3>(1);
  const [onboardingSubmitting, setOnboardingSubmitting] = useState(false);
  const [onboardSuccessResult, setOnboardSuccessResult] = useState<any>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Onboard Form Data
  const [onboardForm, setOnboardForm] = useState({
    // Step 1: Identity & Branding
    school_name: "",
    school_code: "",
    category: "all_through",
    school_subdomain: "",
    custom_domain: "",
    primary_color: "#0F2744",
    secondary_color: "#D97706",
    address: "",
    phone: "",
    email: "",
    logoFile: null as File | null,
    stampFile: null as File | null,

    // Step 2: Financial Gateway Split
    bank_name: "",
    bank_code: "",
    account_number: "",
    account_name: "",
    paystack_subaccount_code: "",
    flutterwave_subaccount_code: "",
    monnify_subaccount_code: "",
    tech_royalty_fee: 500,
    platform_fee_bearer: "school",
    bank_charge_bearer: "parent",
    active_payment_gateway: "paystack",
    online_payment_enabled: true,
    active_edition_tier: "standard_cbt",

    // Step 3: Lead Admin Provisioning
    lead_admin_role: "proprietor",
    admin_firstname: "",
    admin_surname: "",
    admin_email: "",
    admin_phone: "",
    admin_password: "",
  });

  // Chart Ref
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    document.title = "Super Admin Dashboard - SchoolProfit";
  }, []);

  // Tier Counts Summary
  const tierCounts: TierCounts = useMemo(() => {
    if (schoolsData?.tier_counts) {
      return schoolsData.tier_counts;
    }
    const list = schoolsData?.data || [];
    return {
      total: schoolsData?.total || list.length,
      standard_cbt: list.filter((s) => (s.school?.active_edition_tier || "standard_cbt") === "standard_cbt").length,
      basic_result: list.filter((s) => s.school?.active_edition_tier === "basic_result").length,
      annual_full_session: list.filter((s) => s.school?.active_edition_tier === "annual_full_session").length,
      online_pay_enabled: list.filter((s) => s.school?.online_payment_enabled !== false && s.school?.online_payment_enabled !== 0).length,
      online_pay_disabled: list.filter((s) => s.school?.online_payment_enabled === false || s.school?.online_payment_enabled === 0).length,
    };
  }, [schoolsData]);

  const ytdRevenue = useMemo(() => revenueRows.reduce((sum, r) => sum + Number(r.revenue || 0), 0), [revenueRows]);
  const logIds = useMemo(() => (logs?.data || []).map((l) => l.id), [logs]);
  const allLogsSelected = logIds.length > 0 && logIds.every((id) => selectedLogs.includes(id));

  /* ==========================================================================
     API FETCHERS
     ========================================================================== */

  async function fetchMaintenance() {
    try {
      const res = await authApi.get("/superadmin/maintenance-mode/status");
      if (res.data?.status) {
        setMaintenanceState(res.data.status);
        if (res.data.status.message) setCustomMaintenanceMsg(res.data.status.message);
        if (res.data.status.start_time) setScheduledStartTime(res.data.status.start_time);
        if (res.data.status.end_time) setScheduledEndTime(res.data.status.end_time);
        if (res.data.status.is_scheduled) setScheduleMode("scheduled");
      }
    } catch {
      /* ignore */
    }
  }

  async function handleToggleMaintenance(targetActive: boolean, isScheduled = false) {
    setMaintenanceUpdating(true);
    try {
      const res = await authApi.post("/superadmin/maintenance-mode/toggle", {
        is_active: targetActive,
        is_scheduled: isScheduled,
        start_time: isScheduled && scheduledStartTime ? scheduledStartTime : undefined,
        end_time: isScheduled && scheduledEndTime ? scheduledEndTime : undefined,
        message: customMaintenanceMsg.trim() || undefined,
        send_email_notification: targetActive || isScheduled ? sendEmailNotification : false,
      });
      setMaintenanceState(res.data.status);
      setShowMaintenanceModal(false);
      showSuccess(res.data.message || (targetActive ? "Maintenance mode activated." : "Platform restored online."));
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to update maintenance mode.");
    } finally {
      setMaintenanceUpdating(false);
    }
  }

  async function fetchRevenue() {
    try {
      const res = await authApi.get("/monthly-revenue-stats");
      setRevenueRows(Array.isArray(res.data?.data) ? res.data.data : []);
      if (res.data?.total_active_students !== undefined) {
        setActiveStudentsCount(Number(res.data.total_active_students));
      }
      if (res.data?.tech_fees_earned !== undefined) {
        setPlatformTechFeesEarned(Number(res.data.tech_fees_earned));
      }
      if (res.data?.gmv !== undefined) {
        setPlatformGmv(Number(res.data.gmv));
      }
      if (res.data?.gateway_split_health) {
        setGatewaySplitHealth(res.data.gateway_split_health);
      }
    } catch {
      /* ignore */
    }
  }

  function generateRandomPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setOnboardForm((prev) => ({ ...prev, admin_password: pass }));
  }

  async function handleCompleteOnboarding(e: React.FormEvent) {
    e.preventDefault();
    if (!onboardForm.school_name.trim()) {
      showError("Please enter the legal name of the school.");
      setOnboardStep(1);
      return;
    }
    if (!onboardForm.admin_firstname.trim() || !onboardForm.admin_surname.trim() || !onboardForm.admin_email.trim() || !onboardForm.admin_phone.trim()) {
      showError("Please fill in all lead administrator contact information.");
      setOnboardStep(3);
      return;
    }

    setOnboardingSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("school_name", onboardForm.school_name.trim());
      if (onboardForm.school_code) fd.append("school_code", onboardForm.school_code.trim());
      if (onboardForm.category) fd.append("category", onboardForm.category);
      if (onboardForm.school_subdomain) fd.append("school_subdomain", onboardForm.school_subdomain.trim());
      if (onboardForm.custom_domain) fd.append("custom_domain", onboardForm.custom_domain.trim());
      fd.append("primary_color", onboardForm.primary_color);
      fd.append("secondary_color", onboardForm.secondary_color);
      if (onboardForm.address) fd.append("address", onboardForm.address);
      if (onboardForm.phone) fd.append("phone", onboardForm.phone);
      if (onboardForm.email) fd.append("email", onboardForm.email);

      if (onboardForm.logoFile) fd.append("logo", onboardForm.logoFile);
      if (onboardForm.stampFile) fd.append("stamp", onboardForm.stampFile);

      if (onboardForm.bank_name) fd.append("bank_name", onboardForm.bank_name);
      if (onboardForm.bank_code) fd.append("bank_code", onboardForm.bank_code);
      if (onboardForm.account_number) fd.append("account_number", onboardForm.account_number);
      if (onboardForm.account_name) fd.append("account_name", onboardForm.account_name);
      if (onboardForm.paystack_subaccount_code) fd.append("paystack_subaccount_code", onboardForm.paystack_subaccount_code);
      if (onboardForm.flutterwave_subaccount_code) fd.append("flutterwave_subaccount_code", onboardForm.flutterwave_subaccount_code);
      if (onboardForm.monnify_subaccount_code) fd.append("monnify_subaccount_code", onboardForm.monnify_subaccount_code);
      fd.append("tech_royalty_fee", String(onboardForm.tech_royalty_fee));
      fd.append("platform_fee_bearer", onboardForm.platform_fee_bearer);
      fd.append("bank_charge_bearer", onboardForm.bank_charge_bearer);
      fd.append("active_payment_gateway", onboardForm.active_payment_gateway);
      fd.append("online_payment_enabled", onboardForm.online_payment_enabled ? "1" : "0");
      fd.append("active_edition_tier", onboardForm.active_edition_tier);

      fd.append("lead_admin_role", onboardForm.lead_admin_role);
      fd.append("admin_firstname", onboardForm.admin_firstname.trim());
      fd.append("admin_surname", onboardForm.admin_surname.trim());
      fd.append("admin_email", onboardForm.admin_email.trim());
      fd.append("admin_phone", onboardForm.admin_phone.trim());
      if (onboardForm.admin_password) fd.append("admin_password", onboardForm.admin_password);

      const res = await authApi.post("/superadmin/schools/onboard", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setOnboardSuccessResult(res.data);
      showSuccess(res.data?.message || "School tenant onboarded successfully!");
      await Promise.all([fetchSchools(1, schoolsPerPage), fetchRevenue()]);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to onboard school. Please check your inputs.");
    } finally {
      setOnboardingSubmitting(false);
    }
  }

  async function fetchSchools(page = schoolsPage, perPage = schoolsPerPage) {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("perPage", String(perPage));
    if (schoolsSearch.trim()) p.set("search", schoolsSearch.trim());
    if (schoolsTier && schoolsTier !== "all") p.set("tier", schoolsTier);
    if (schoolsOnlinePay && schoolsOnlinePay !== "all") p.set("online_payment", schoolsOnlinePay);
    if (schoolsStatus && schoolsStatus !== "all") p.set("status", schoolsStatus);

    const res = await authApi.get(`/admin-users?${p.toString()}`);
    setSchoolsData(res.data || null);
  }

  const [bulkTogglingAll, setBulkTogglingAll] = useState(false);

  async function bulkToggleAllSchoolsOnlinePayment(enable: boolean) {
    const actionWord = enable ? "ENABLE" : "DISABLE";
    const promptText = enable
      ? `Are you sure you want to ENABLE Online Fee Payment for ALL registered schools on the platform?\n\nParents and students across all registered schools will be allowed to make fee payments online via payment gateways on /pay-fees.`
      : `Are you sure you want to DISABLE Online Fee Payment for ALL registered schools on the platform?\n\nOnline fee payment attempts on /pay-fees will be REJECTED platform-wide.`;

    if (!window.confirm(promptText)) {
      return;
    }

    setBulkTogglingAll(true);
    try {
      const res = await authApi.post("/superadmin/schools/bulk-toggle-online-payment", {
        enabled: enable,
      });
      showSuccess(res.data?.message || `Online payment ${actionWord.toLowerCase()}d for all registered schools.`);
      
      // Update schoolsData locally immediately
      setSchoolsData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((item) => ({
            ...item,
            online_payment_enabled: enable,
            school: item.school ? { ...item.school, online_payment_enabled: enable } : null,
          })),
        };
      });

      // Reload schools list to update table and tierCounts
      await fetchSchools(schoolsPage, schoolsPerPage);
    } catch (err: any) {
      showError(err?.response?.data?.message || `Failed to ${actionWord.toLowerCase()} online payment for all schools.`);
    } finally {
      setBulkTogglingAll(false);
    }
  }

  async function toggleSchoolOnlinePayment(adminRow: SchoolOwnerRow) {
    if (!adminRow.id) return;
    const isCurrentlyOn = adminRow.school?.online_payment_enabled !== false && (adminRow.school?.online_payment_enabled as any) !== 0;
    const nextState = !isCurrentlyOn;
    const schoolName = adminRow.school?.school_name || personName(adminRow) + "'s School";

    const promptText = nextState
      ? `Enable online fee payments for ${schoolName}?\n\nParents and students will be allowed to make fee payments online via Wema/ALATPay on /pay-fees.`
      : `Switch OFF online fee payments for ${schoolName}?\n\nThe platform will REJECT all fee payment attempts on /pay-fees for this school and notify parents to contact school bursary.`;

    if (!window.confirm(promptText)) {
      return;
    }

    setTogglingAdminId(adminRow.id);
    try {
      const res = await authApi.patch(`/admin-users/${adminRow.id}/toggle-online-payment`, {
        enabled: nextState,
      });
      showSuccess(res.data?.message || `Online payment ${nextState ? "enabled" : "disabled"} successfully.`);
      
      // Update locally
      setSchoolsData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((item) => {
            if (item.id === adminRow.id) {
              return {
                ...item,
                online_payment_enabled: nextState,
                school: item.school ? { ...item.school, online_payment_enabled: nextState } : null,
              };
            }
            return item;
          }),
        };
      });
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to update online payment switch.");
    } finally {
      setTogglingAdminId(null);
    }
  }

  async function fetchLogs(page = logsPage, perPage = logsPerPage) {
    try {
      const p = new URLSearchParams();
      p.set("page", String(page));
      p.set("per_page", String(perPage));
      const res = await authApi.get(`/platform-logs?${p.toString()}`);
      setLogs(res.data || null);
    } catch {
      /* ignore */
    }
  }

  async function refreshDashboard(toast = false) {
    setLoading(true);
    try {
      await Promise.all([
        fetchMaintenance(),
        fetchRevenue(),
        fetchSchools(schoolsPage, schoolsPerPage),
        fetchLogs(logsPage, logsPerPage),
      ]);
      if (toast) showSuccess("Command center refreshed.");
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to load Super Admin dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshDashboard(false);
  }, []);

  useEffect(() => {
    fetchSchools(schoolsPage, schoolsPerPage).catch(() => {});
  }, [schoolsPage, schoolsPerPage]);

  useEffect(() => {
    fetchLogs(logsPage, logsPerPage).catch(() => {});
  }, [logsPage, logsPerPage]);

  // Chart Rendering
  useEffect(() => {
    if (!chartRef.current) return;
    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    chartInstance.current?.destroy();
    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: revenueRows.map((r) => r.month),
        datasets: [
          {
            label: "Monthly Revenue (₦)",
            data: revenueRows.map((r) => Number(r.revenue || 0)),
            backgroundColor: "rgba(15, 39, 68, 0.85)",
            hoverBackgroundColor: "rgba(217, 119, 6, 0.95)",
            borderRadius: 8,
            barThickness: 28,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => fmtNaira(Number(item.raw || 0)),
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#64748b", font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(226, 232, 240, 0.6)" },
            ticks: { color: "#64748b", font: { size: 11 } },
          },
        },
      },
    });

    return () => chartInstance.current?.destroy();
  }, [revenueRows]);

  function applyFilters() {
    setSchoolsPage(1);
    fetchSchools(1, schoolsPerPage)
      .then(() => showSuccess("Schools list filtered."))
      .catch(() => showError("Failed to apply filters."));
  }

  function reloadLogs() {
    setLogsPage(1);
    fetchLogs(1, logsPerPage)
      .then(() => showSuccess("Activity logs reloaded."))
      .catch(() => showError("Failed to reload activity logs."));
  }

  function toggleLog(id: number) {
    setSelectedLogs((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function toggleAllLogs() {
    setSelectedLogs((cur) => (allLogsSelected ? cur.filter((id) => !logIds.includes(id)) : Array.from(new Set([...cur, ...logIds]))));
  }

  async function deleteSelectedLogs() {
    if (!selectedLogs.length) return;
    if (!window.confirm(`Delete ${selectedLogs.length} selected activity log(s)?`)) return;
    setDeletingLogs(true);
    try {
      await authApi.post("/platform-logs/delete-multiple", { ids: selectedLogs });
      setSelectedLogs([]);
      showSuccess("Selected logs deleted.");
      await fetchLogs();
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to delete selected logs.");
    } finally {
      setDeletingLogs(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        :root {
          --sa-bg: #F8FAFC;
          --sa-panel: #ffffff;
          --sa-ink: #0F2744;
          --sa-muted: #64748B;
          --sa-border: #E2E8F0;
          --sa-gold: #D97706;
          --sa-primary: #0F2744;
          --sa-green: #10B981;
          --sa-blue: #2563EB;
          --sa-red: #EF4444;
        }
        .sa-main {
          min-height: 100vh;
          background: #F8FAFC;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          margin-left: 280px;
          width: calc(100% - 280px);
          max-width: calc(100% - 280px);
          padding: 96px 28px 32px;
          transition: margin .2s, width .2s;
        }
        .sa-shell { max-width: 1480px; margin: 0 auto; }
        .sa-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 24px;
          align-items: end;
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 20px;
          padding: 32px;
          color: #fff;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
        }
        .sa-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #FBBF24;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .sa-title { font-size: clamp(28px, 3.5vw, 42px); font-weight: 800; line-height: 1.1; margin: 0 0 10px; }
        .sa-sub { max-width: 760px; color: #CBD5E1; line-height: 1.6; font-size: 14px; margin: 0; }
        .sa-hero-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
        .sa-btn {
          border: 0;
          border-radius: 10px;
          min-height: 40px;
          padding: 9px 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
          transition: all .2s ease;
        }
        .sa-btn:disabled { opacity: .55; cursor: not-allowed; }
        .sa-btn-gold { background: #D97706; color: #fff; }
        .sa-btn-gold:hover { background: #B45309; color: #fff; }
        .sa-btn-dark { background: #0F2744; color: #fff; }
        .sa-btn-soft { background: #fff; color: #0F2744; border: 1px solid #E2E8F0; }
        .sa-btn-soft:hover { background: #F8FAFC; border-color: #CBD5E1; }
        .sa-btn-light { background: rgba(255, 255, 255, .12); color: #fff; border: 1px solid rgba(255, 255, 255, .2); }
        .sa-btn-light:hover { background: rgba(255, 255, 255, .2); }
        
        .sa-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin: 20px 0;
        }
        .sa-metric {
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 16px rgba(15, 39, 68, 0.03);
          transition: all .2s ease;
        }
        .sa-metric:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(15, 39, 68, 0.06);
          border-color: #CBD5E1;
        }
        .sa-metric-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .sa-metric-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          background: rgba(15, 39, 68, .08);
          color: #0F2744;
        }
        .tone-gold .sa-metric-icon { background: rgba(217, 119, 6, .12); color: #D97706; }
        .tone-blue .sa-metric-icon { background: rgba(37, 99, 235, .12); color: #2563EB; }
        .tone-teal .sa-metric-icon { background: rgba(14, 165, 233, .12); color: #0284C7; }
        .tone-green .sa-metric-icon { background: rgba(16, 185, 129, .12); color: #10B981; }
        .tone-red .sa-metric-icon { background: rgba(239, 68, 68, .12); color: #EF4444; }
        .sa-metric p { font-size: 12px; color: #64748B; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; margin: 0 0 6px; }
        .sa-metric h3 { font-size: clamp(22px, 2.4vw, 28px); font-weight: 800; color: #0F2744; margin: 0; }
        .sa-metric small { font-size: 12px; color: #94A3B8; }

        .sa-grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(320px, .65fr); gap: 20px; margin-bottom: 20px; }
        .sa-panel {
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 18px;
          box-shadow: 0 4px 16px rgba(15, 39, 68, 0.03);
          overflow: hidden;
          margin-bottom: 20px;
        }
        .sa-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 20px 24px;
          border-bottom: 1px solid #F1F5F9;
        }
        .sa-panel-head h2 { color: #0F2744; font-weight: 800; font-size: 18px; margin: 0; }
        .sa-panel-head p { font-size: 12.5px; color: #64748B; margin: 3px 0 0; }
        .sa-chart { height: 310px; padding: 20px 24px 24px; }
        .sa-filters {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding: 14px 24px;
          border-bottom: 1px solid #F1F5F9;
          background: #F8FAFC;
        }
        .sa-input, .sa-select {
          height: 38px;
          border: 1px solid #E2E8F0;
          background: #fff;
          border-radius: 10px;
          padding: 0 12px;
          color: #0F2744;
          font-size: 13px;
          outline: 0;
        }
        .sa-table-wrap { overflow-x: auto; }
        .sa-table { width: 100%; min-width: 920px; border-collapse: collapse; }
        .sa-table th {
          background: #F8FAFC;
          color: #64748B;
          text-transform: uppercase;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .06em;
          padding: 12px 16px;
          border-bottom: 1px solid #E2E8F0;
        }
        .sa-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #F1F5F9;
          font-size: 13.5px;
          color: #334155;
          vertical-align: middle;
        }
        .sa-table tr:hover td { background: #F8FAFC; }
        .sa-name-cell { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .sa-avatar {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, #0F2744, #1E3A8A);
          color: #fff;
          font-size: 13px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .sa-main-text { font-weight: 800; color: #0F2744; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; }
        .sa-sub-text { font-size: 12px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px; }
        
        .sa-tier-standard {
          background: #EFF6FF;
          color: #1D4ED8;
          border: 1px solid #BFDBFE;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
        }
        .sa-tier-basic {
          background: #F0FDFA;
          color: #0F766E;
          border: 1px solid #99F6E4;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
        }
        .sa-tier-annual {
          background: #FEF3C7;
          color: #92400E;
          border: 1px solid #FDE68A;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
        }

        .sa-pay-btn-on {
          background: #D1FAE5;
          color: #065F46;
          border: 1px solid #A7F3D0;
          border-radius: 999px;
          padding: 5px 12px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: all .2s ease;
        }
        .sa-pay-btn-on:hover { background: #A7F3D0; }
        .sa-pay-btn-off {
          background: #FEE2E2;
          color: #991B1B;
          border: 1px solid #FECACA;
          border-radius: 999px;
          padding: 5px 12px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: all .2s ease;
        }
        .sa-pay-btn-off:hover { background: #FECACA; }

        .sa-pager {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 24px;
          color: #64748B;
          font-size: 12.5px;
          background: #fff;
          border-top: 1px solid #F1F5F9;
        }
        .sa-pager > div { display: flex; align-items: center; gap: 8px; }
        .sa-pager select, .sa-pager button {
          height: 34px;
          border: 1px solid #E2E8F0;
          background: #fff;
          border-radius: 8px;
          padding: 0 10px;
          color: #0F2744;
        }
        .sa-pager button:disabled { opacity: .45; }

        .sa-empty {
          padding: 40px 20px;
          text-align: center;
          color: #64748B;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .sa-empty i { font-size: 32px; color: #CBD5E1; }

        .sa-health { display: grid; gap: 12px; padding: 20px 24px; }
        .sa-health-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px 16px;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          background: #F8FAFC;
        }
        .sa-health-main { display: flex; align-items: center; gap: 10px; }
        .sa-health-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          border: 1px solid #E2E8F0;
          color: #0F2744;
        }
        .sa-health-title { font-weight: 800; color: #0F2744; font-size: 13.5px; margin: 0; }
        .sa-health-sub { font-size: 12px; color: #64748B; margin: 2px 0 0; }
        .sa-health-value { font-weight: 800; color: #0F2744; font-size: 18px; }

        .sa-log-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 14px 24px;
          border-bottom: 1px solid #F1F5F9;
          background: #F8FAFC;
        }
        .sa-log-select { display: flex; align-items: center; gap: 8px; color: #64748B; font-size: 12.5px; font-weight: 700; }

        @media (max-width: 1199px) {
          .sa-main { margin-left: 0; width: 100%; max-width: 100%; padding: 92px 16px 28px; }
          .sa-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .sa-grid { grid-template-columns: 1fr; }
          .sa-hero { grid-template-columns: 1fr; }
          .sa-hero-actions { justify-content: flex-start; }
        }
        @media (max-width: 640px) {
          .sa-main { padding-left: 12px; padding-right: 12px; }
          .sa-metrics { grid-template-columns: 1fr; }
          .sa-hero { padding: 22px; }
          .sa-panel-head, .sa-filters, .sa-log-toolbar, .sa-pager { align-items: flex-start; flex-direction: column; }
          .sa-btn, .sa-input, .sa-select { width: 100%; }
          .sa-pager > div { width: 100%; justify-content: space-between; }
          .sa-chart { height: 260px; }
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Platform Command Center" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="sa-main">
            {loading && <Loader message="Loading Super Admin command center..." />}

            <div className="sa-shell">
              {/* Top Hero */}
              <section className="sa-hero">
                <div>
                  <div className="sa-eyebrow">
                    <i className="bi bi-shield-lock" /> SchoolProfit Super Admin
                  </div>
                  <h1 className="sa-title">Platform Command Center</h1>
                  <p className="sa-sub">
                    Overview of registered school accounts, active pricing tier editions, online payment switch controls, and platform revenue.
                  </p>
                </div>
                <div className="sa-hero-actions">
                  <button
                    className="sa-btn sa-btn-gold"
                    style={{ fontWeight: 800, boxShadow: "0 4px 14px rgba(217,119,6,0.3)" }}
                    onClick={() => {
                      setOnboardStep(1);
                      setOnboardSuccessResult(null);
                      if (!onboardForm.admin_password) generateRandomPassword();
                      setShowOnboardModal(true);
                    }}
                  >
                    <i className="bi bi-plus-circle-fill" /> Onboard School
                  </button>
                  <button className="sa-btn sa-btn-light" onClick={() => refreshDashboard(true)}>
                    <i className="bi bi-arrow-repeat" /> Refresh
                  </button>
                  <button className="sa-btn sa-btn-soft" onClick={() => navigate("/superadmin/billing-policy")}>
                    <i className="bi bi-sliders" /> Gateway Split Engine
                  </button>
                  <button className="sa-btn sa-btn-soft" onClick={() => navigate("/superadmin/subscribers")}>
                    <i className="bi bi-buildings" /> School Tenants Registry
                  </button>
                </div>
              </section>

              {/* Platform Maintenance Mode Alert / Banner */}
              <section
                style={{
                  background: maintenanceState.is_active || maintenanceState.is_in_effect
                    ? "linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #991b1b 100%)"
                    : maintenanceState.is_scheduled
                    ? "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)"
                    : "#ffffff",
                  color: maintenanceState.is_active || maintenanceState.is_in_effect || maintenanceState.is_scheduled ? "#ffffff" : "#0f172a",
                  border: maintenanceState.is_active || maintenanceState.is_in_effect
                    ? "2px solid #ef4444"
                    : maintenanceState.is_scheduled
                    ? "2px solid #6366f1"
                    : "1px solid #E2E8F0",
                  borderRadius: 18,
                  padding: "18px 24px",
                  marginTop: 18,
                  marginBottom: 18,
                  boxShadow: "0 4px 16px rgba(15,39,68,0.04)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: maintenanceState.is_active || maintenanceState.is_in_effect
                        ? "rgba(239, 68, 68, 0.25)"
                        : maintenanceState.is_scheduled
                        ? "rgba(99, 102, 241, 0.25)"
                        : "#F1F5F9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      color: maintenanceState.is_active || maintenanceState.is_in_effect ? "#fca5a5" : maintenanceState.is_scheduled ? "#a5b4fc" : "#0F2744",
                    }}
                  >
                    <i className={`bi ${maintenanceState.is_active || maintenanceState.is_in_effect ? "bi-cone-striped" : maintenanceState.is_scheduled ? "bi-clock-history" : "bi-shield-check"}`} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>
                      {maintenanceState.is_active || maintenanceState.is_in_effect
                        ? "Platform Maintenance Mode is Active"
                        : maintenanceState.is_scheduled
                        ? "Platform Maintenance Scheduled"
                        : "Platform Operational Status: Normal (Online)"}
                    </h4>
                    <p style={{ margin: "2px 0 0", fontSize: 12.5, opacity: 0.85 }}>
                      {maintenanceState.is_active || maintenanceState.is_in_effect
                        ? "Platform is currently closed to users. Only Super Admins can access portals."
                        : maintenanceState.is_scheduled
                        ? `Scheduled: ${fmtDate(maintenanceState.start_time)} to ${fmtDate(maintenanceState.end_time)}`
                        : "All SchoolProfit portals, results, CBT, and payment channels are running normally."}
                    </p>
                  </div>
                </div>
                <div>
                  <button
                    className={`sa-btn ${maintenanceState.is_active || maintenanceState.is_in_effect ? "sa-btn-light" : "sa-btn-soft"}`}
                    onClick={() => setShowMaintenanceModal(true)}
                  >
                    <i className="bi bi-gear" /> Configure Maintenance
                  </button>
                </div>
              </section>

              {/* Primary SaaS Metrics Grid */}
              <div className="sa-metrics">
                <div className="sa-metric tone-blue">
                  <div className="sa-metric-top">
                    <span className="sa-metric-icon"><i className="bi bi-buildings" /></span>
                    <i className="bi bi-arrow-up-right sa-metric-arrow" />
                  </div>
                  <p>Total Schools Onboarded</p>
                  <h3>{tierCounts.total}</h3>
                  <small>Isolated school tenants</small>
                </div>

                <div className="sa-metric tone-gold">
                  <div className="sa-metric-top">
                    <span className="sa-metric-icon"><i className="bi bi-people" /></span>
                    <i className="bi bi-arrow-up-right sa-metric-arrow" />
                  </div>
                  <p>Total Students Under Management</p>
                  <h3>{activeStudentsCount.toLocaleString()}</h3>
                  <small>Active enrolled population</small>
                </div>

                <div className="sa-metric tone-green">
                  <div className="sa-metric-top">
                    <span className="sa-metric-icon"><i className="bi bi-cash-stack" /></span>
                    <i className="bi bi-arrow-up-right sa-metric-arrow" />
                  </div>
                  <p>Platform Tech Fees Earned</p>
                  <h3>{fmtNaira(platformTechFeesEarned || ytdRevenue)}</h3>
                  <small>Automated split royalty revenue</small>
                </div>

                <div className="sa-metric tone-teal">
                  <div className="sa-metric-top">
                    <span className="sa-metric-icon"><i className="bi bi-shield-check" /></span>
                    <i className="bi bi-arrow-up-right sa-metric-arrow" />
                  </div>
                  <p>Gateway Split Health</p>
                  <h3>{gatewaySplitHealth?.split_health_percentage ?? 100}%</h3>
                  <small>{tierCounts.online_pay_enabled} online • {gatewaySplitHealth?.split_ready_schools ?? tierCounts.total} subaccount ready</small>
                </div>
              </div>

              {/* Revenue & Health Row */}
              <div className="sa-grid">
                <div className="sa-panel">
                  <div className="sa-panel-head">
                    <div>
                      <h2>Platform Revenue Performance</h2>
                      <p>Monthly gross collections across online fee payments and platform charges.</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#64748B" }}>YTD Total</span>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#0F2744" }}>{fmtNaira(ytdRevenue)}</div>
                    </div>
                  </div>
                  <div className="sa-chart">
                    <canvas ref={chartRef} />
                  </div>
                </div>

                <div className="sa-panel">
                  <div className="sa-panel-head">
                    <div>
                      <h2>Edition Tier Distribution</h2>
                      <p>Active schools by SchoolProfit pricing edition.</p>
                    </div>
                  </div>
                  <div className="sa-health">
                    <div className="sa-health-row">
                      <div className="sa-health-main">
                        <div className="sa-health-icon" style={{ background: "#EFF6FF", color: "#1D4ED8" }}>
                          <i className="bi bi-cpu" />
                        </div>
                        <div>
                          <p className="sa-health-title">Standard CBT &amp; AI</p>
                          <p className="sa-health-sub">CBT, AI Notes &amp; QR Attendance</p>
                        </div>
                      </div>
                      <div className="sa-health-value" style={{ color: "#1D4ED8" }}>{tierCounts.standard_cbt}</div>
                    </div>

                    <div className="sa-health-row">
                      <div className="sa-health-main">
                        <div className="sa-health-icon" style={{ background: "#F0FDFA", color: "#0F766E" }}>
                          <i className="bi bi-file-earmark-text" />
                        </div>
                        <div>
                          <p className="sa-health-title">Basic Result Edition</p>
                          <p className="sa-health-sub">Report Cards, Broadsheet &amp; Tuition</p>
                        </div>
                      </div>
                      <div className="sa-health-value" style={{ color: "#0F766E" }}>{tierCounts.basic_result}</div>
                    </div>

                    <div className="sa-health-row">
                      <div className="sa-health-main">
                        <div className="sa-health-icon" style={{ background: "#FEF3C7", color: "#92400E" }}>
                          <i className="bi bi-calendar-check" />
                        </div>
                        <div>
                          <p className="sa-health-title">Annual Full Session</p>
                          <p className="sa-health-sub">All-inclusive 3-term coverage</p>
                        </div>
                      </div>
                      <div className="sa-health-value" style={{ color: "#92400E" }}>{tierCounts.annual_full_session}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PRIMARY PANEL: REGISTERED SCHOOLS & SCHOOL OWNERS */}
              <div className="sa-panel">
                <div className="sa-panel-head" style={{ flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <h2>Registered Schools &amp; School Owners</h2>
                    <p>Manage school administrators, active pricing edition tiers, and 1-click Online Fee Payment switches.</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {/* Platform-Wide Bulk Online Pay Switch for ALL Registered Schools */}
                    <div style={{ display: "inline-flex", alignItems: "center", background: "#F1F5F9", borderRadius: 10, padding: "3px 5px", border: "1px solid #CBD5E1", gap: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#334155", padding: "0 4px", textTransform: "uppercase", letterSpacing: "0.03em", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <i className="bi bi-globe2" style={{ color: "#2563EB" }} /> All Schools:
                      </span>
                      <button
                        type="button"
                        className="sa-btn"
                        style={{
                          background: "#10B981",
                          color: "#fff",
                          padding: "5px 11px",
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: 7,
                          border: "none",
                          cursor: bulkTogglingAll ? "not-allowed" : "pointer",
                          opacity: bulkTogglingAll ? 0.7 : 1,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4
                        }}
                        onClick={() => bulkToggleAllSchoolsOnlinePayment(true)}
                        disabled={bulkTogglingAll}
                        title="Enable Online Fee Payments for ALL registered schools platform-wide"
                      >
                        {bulkTogglingAll ? <span className="spinner-border spinner-border-sm" style={{ width: 10, height: 10 }} /> : <i className="bi bi-check-circle-fill" />}
                        Enable All
                      </button>
                      <button
                        type="button"
                        className="sa-btn"
                        style={{
                          background: "#EF4444",
                          color: "#fff",
                          padding: "5px 11px",
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: 7,
                          border: "none",
                          cursor: bulkTogglingAll ? "not-allowed" : "pointer",
                          opacity: bulkTogglingAll ? 0.7 : 1,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4
                        }}
                        onClick={() => bulkToggleAllSchoolsOnlinePayment(false)}
                        disabled={bulkTogglingAll}
                        title="Disable Online Fee Payments for ALL registered schools platform-wide"
                      >
                        {bulkTogglingAll ? <span className="spinner-border spinner-border-sm" style={{ width: 10, height: 10 }} /> : <i className="bi bi-x-circle-fill" />}
                        Disable All
                      </button>
                    </div>

                    <button className="sa-btn sa-btn-soft" onClick={applyFilters}>
                      <i className="bi bi-funnel" /> Apply Filters
                    </button>
                  </div>
                </div>

                {/* Filter Toolbar */}
                <div className="sa-filters">
                  {/* Pricing Edition Filter */}
                  <select
                    className="sa-select"
                    value={schoolsTier}
                    onChange={(e) => setSchoolsTier(e.target.value)}
                    style={{ minWidth: 200 }}
                  >
                    <option value="all">All Pricing Editions</option>
                    <option value="standard_cbt">Standard CBT &amp; AI</option>
                    <option value="basic_result">Basic Result Edition</option>
                    <option value="annual_full_session">Annual Full Session Tier</option>
                  </select>

                  {/* Online Payment Switch Filter */}
                  <select
                    className="sa-select"
                    value={schoolsOnlinePay}
                    onChange={(e) => setSchoolsOnlinePay(e.target.value)}
                    style={{ minWidth: 190 }}
                  >
                    <option value="all">All Online Pay Status</option>
                    <option value="1">🟢 Online Pay Enabled</option>
                    <option value="0">🔴 Online Pay Disabled (Rejected)</option>
                  </select>

                  {/* Account Status */}
                  <select
                    className="sa-select"
                    value={schoolsStatus}
                    onChange={(e) => setSchoolsStatus(e.target.value)}
                    style={{ minWidth: 130 }}
                  >
                    <option value="all">All Status</option>
                    <option value="1">Active</option>
                    <option value="0">Suspended</option>
                  </select>

                  {/* Search Box */}
                  <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
                    <input
                      className="sa-input"
                      style={{ width: "100%", paddingLeft: 34 }}
                      placeholder="Search school name, owner, email or phone..."
                      value={schoolsSearch}
                      onChange={(e) => setSchoolsSearch(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }}
                    />
                    <i className="bi bi-search" style={{ position: "absolute", left: 12, top: 11, color: "#94A3B8" }} />
                  </div>

                  <button className="sa-btn sa-btn-dark" onClick={applyFilters}>
                    <i className="bi bi-search" /> Filter
                  </button>
                </div>

                {/* Table */}
                <div className="sa-table-wrap">
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>School &amp; Owner</th>
                        <th>Contact</th>
                        <th>Pricing Edition Tier</th>
                        <th>Students</th>
                        <th>Online Fee Pay</th>
                        <th>Status</th>
                        <th style={{ width: 130 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!schoolsData?.data || schoolsData.data.length === 0 ? (
                        <tr>
                          <td colSpan={7}>
                            <div className="sa-empty">
                              <i className="bi bi-buildings" />
                              <div style={{ fontWeight: 700, color: "#0F2744" }}>No schools found matching your search.</div>
                              <small>Try clearing your search terms or filters.</small>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        schoolsData.data.map((row) => {
                          const ownerName = personName(row);
                          const schoolName = row.school?.school_name || "School Not Linked";
                          const tierInfo = getTierBadgeInfo(row.school?.active_edition_tier);
                          const isOnlinePay = row.school?.online_payment_enabled !== false && (row.school?.online_payment_enabled as any) !== 0;
                          const isSuspended = String(row.status) === "0";
                          const isToggling = togglingAdminId === row.id;

                          return (
                            <tr key={row.id}>
                              <td>
                                <div className="sa-name-cell">
                                  <div className="sa-avatar">{initials(schoolName)}</div>
                                  <div>
                                    <div className="sa-main-text" title={schoolName}>
                                      {schoolName}
                                    </div>
                                    <div className="sa-sub-text">
                                      Owner: <b style={{ color: "#0F2744" }}>{ownerName}</b> • Joined {fmtDate(row.created_at)}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td>
                                <div>
                                  <div className="sa-main-text" style={{ fontSize: 13 }}>{row.email || "—"}</div>
                                  <div className="sa-sub-text">{row.phone || row.school?.phone || "No phone"}</div>
                                </div>
                              </td>

                              <td>
                                <span className={tierInfo.className}>
                                  <i className={`bi ${tierInfo.icon}`} /> {tierInfo.label}
                                </span>
                              </td>

                              <td>
                                <span style={{ fontWeight: 700, color: "#0F2744" }}>
                                  {(row.student_count || 0).toLocaleString()}
                                </span>{" "}
                                <small style={{ color: "#64748B" }}>students</small>
                              </td>

                              <td>
                                <button
                                  type="button"
                                  className={isOnlinePay ? "sa-pay-btn-on" : "sa-pay-btn-off"}
                                  onClick={() => toggleSchoolOnlinePayment(row)}
                                  disabled={isToggling}
                                  title={isOnlinePay ? "Click to switch OFF online fee payments (system will reject parent payments)" : "Click to ENABLE online fee payments"}
                                >
                                  {isToggling ? (
                                    <span className="spinner-border spinner-border-sm" style={{ width: 11, height: 11 }} />
                                  ) : (
                                    <i className={`bi ${isOnlinePay ? "bi-check-circle-fill" : "bi-slash-circle-fill"}`} />
                                  )}
                                  {isOnlinePay ? "🟢 Enabled" : "🔴 Disabled (Rejecting)"}
                                </button>
                              </td>

                              <td>
                                <span className={`badge ${isSuspended ? "bg-danger" : "bg-success"}`} style={{ borderRadius: 999, padding: "5px 10px", fontSize: 11 }}>
                                  {isSuspended ? "Suspended" : "Active"}
                                </span>
                              </td>

                              <td>
                                <button
                                  className="sa-btn sa-btn-soft"
                                  style={{ padding: "5px 12px", fontSize: 12 }}
                                  onClick={() => navigate(`/admin-users/view/${row.id}`)}
                                >
                                  <i className="bi bi-gear" /> Manage
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {schoolsData && schoolsData.last_page > 1 && (
                  <div className="sa-pager">
                    <div>
                      Showing {schoolsData.from ?? 0} - {schoolsData.to ?? 0} of {schoolsData.total} schools
                    </div>
                    <div>
                      <select
                        value={schoolsPerPage}
                        onChange={(e) => {
                          setSchoolsPerPage(Number(e.target.value));
                          setSchoolsPage(1);
                        }}
                      >
                        {[10, 20, 30, 50].map((n) => (
                          <option key={n} value={n}>{n} / page</option>
                        ))}
                      </select>
                      <button
                        disabled={schoolsPage <= 1}
                        onClick={() => setSchoolsPage((p) => Math.max(1, p - 1))}
                      >
                        <i className="bi bi-chevron-left" />
                      </button>
                      <span>
                        Page <b>{schoolsPage}</b> / {schoolsData.last_page}
                      </span>
                      <button
                        disabled={schoolsPage >= schoolsData.last_page}
                        onClick={() => setSchoolsPage((p) => Math.min(schoolsData.last_page, p + 1))}
                      >
                        <i className="bi bi-chevron-right" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Platform Activity Logs */}
              <div className="sa-panel">
                <div className="sa-panel-head">
                  <div>
                    <h2>Platform Activity Audit Trail</h2>
                    <p>Real-time audit log of administrative actions, billing changes, and school access updates.</p>
                  </div>
                  <div>
                    <button className="sa-btn sa-btn-soft" onClick={reloadLogs}>
                      <i className="bi bi-arrow-repeat" /> Reload Logs
                    </button>
                  </div>
                </div>

                <div className="sa-log-toolbar">
                  <label className="sa-log-select">
                    <input type="checkbox" checked={allLogsSelected} onChange={toggleAllLogs} /> Select all on this page
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="sa-btn sa-btn-soft"
                      disabled={!selectedLogs.length || deletingLogs}
                      onClick={() => setSelectedLogs([])}
                    >
                      Clear
                    </button>
                    <button
                      className="sa-btn sa-btn-dark"
                      disabled={!selectedLogs.length || deletingLogs}
                      onClick={deleteSelectedLogs}
                    >
                      <i className="bi bi-trash3" /> {deletingLogs ? "Deleting..." : `Delete ${selectedLogs.length || ""}`}
                    </button>
                  </div>
                </div>

                <div className="sa-table-wrap">
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th style={{ width: 44 }}></th>
                        <th>When</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!logs?.data || logs.data.length === 0 ? (
                        <tr>
                          <td colSpan={5}>
                            <div className="sa-empty">
                              <i className="bi bi-journal-check" />
                              <div>No activity logs found.</div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        logs.data.map((l) => (
                          <tr key={l.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedLogs.includes(l.id)}
                                onChange={() => toggleLog(l.id)}
                              />
                            </td>
                            <td>{fmtDate(l.created_at)}</td>
                            <td>
                              <span style={{ fontWeight: 700, color: "#0F2744" }}>{l.user_name || "System"}</span>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark" style={{ borderRadius: 999, border: "1px solid #E2E8F0" }}>
                                {l.action || "Activity"}
                              </span>
                            </td>
                            <td>
                              <span className="sa-sub-text">{l.description || "—"}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {logs && logs.last_page > 1 && (
                  <div className="sa-pager">
                    <div>
                      Showing {logs.from ?? 0} - {logs.to ?? 0} of {logs.total} logs
                    </div>
                    <div>
                      <button
                        disabled={logsPage <= 1}
                        onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                      >
                        <i className="bi bi-chevron-left" />
                      </button>
                      <span>
                        Page <b>{logsPage}</b> / {logs.last_page}
                      </span>
                      <button
                        disabled={logsPage >= logs.last_page}
                        onClick={() => setLogsPage((p) => Math.min(logs.last_page, p + 1))}
                      >
                        <i className="bi bi-chevron-right" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Maintenance Modal */}
              {showMaintenanceModal && (
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    background: "rgba(15,23,42,0.65)",
                    backdropFilter: "blur(6px)",
                    zIndex: 9999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 20,
                  }}
                >
                  <div
                    style={{
                      background: "#ffffff",
                      borderRadius: 20,
                      maxWidth: 560,
                      width: "100%",
                      padding: "28px 32px",
                      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0F2744" }}>
                        Configure Platform Maintenance
                      </h3>
                      <button
                        style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: "#64748B" }}
                        onClick={() => setShowMaintenanceModal(false)}
                      >
                        &times;
                      </button>
                    </div>

                    <p style={{ color: "#64748B", fontSize: 13.5, lineHeight: 1.5, marginTop: 0 }}>
                      When maintenance mode is active, portal access is restricted to Super Admins only. Regular users will see your custom notice banner.
                    </p>

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F2744", marginBottom: 6 }}>
                        Maintenance Notice Message
                      </label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={customMaintenanceMsg}
                        onChange={(e) => setCustomMaintenanceMsg(e.target.value)}
                        style={{ borderRadius: 10, fontSize: 13 }}
                      />
                    </div>

                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
                      <button
                        className="sa-btn sa-btn-soft"
                        onClick={() => setShowMaintenanceModal(false)}
                        disabled={maintenanceUpdating}
                      >
                        Cancel
                      </button>

                      {maintenanceState.is_active || maintenanceState.is_in_effect ? (
                        <button
                          className="sa-btn sa-btn-gold"
                          onClick={() => handleToggleMaintenance(false)}
                          disabled={maintenanceUpdating}
                        >
                          <i className="bi bi-power" /> Restore Platform Online
                        </button>
                      ) : (
                        <button
                          className="sa-btn"
                          style={{ background: "#DC2626", color: "#fff" }}
                          onClick={() => handleToggleMaintenance(true)}
                          disabled={maintenanceUpdating}
                        >
                          <i className="bi bi-cone-striped" /> Activate Maintenance Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────────────
                  3-STEP MULTI-TENANT SCHOOL ONBOARDING WIZARD MODAL
                  ─────────────────────────────────────────────────────────────────── */}
              {showOnboardModal && (
                <div
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 1060,
                    background: "rgba(15, 39, 68, 0.72)",
                    backdropFilter: "blur(6px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 16,
                    overflowY: "auto",
                  }}
                >
                  <div
                    style={{
                      background: "#ffffff",
                      borderRadius: 22,
                      maxWidth: 720,
                      width: "100%",
                      padding: "32px 36px",
                      boxShadow: "0 25px 50px -12px rgba(15, 39, 68, 0.35)",
                      maxHeight: "92vh",
                      overflowY: "auto",
                      border: "1px solid #E2E8F0",
                    }}
                  >
                    {/* Modal Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                      <div>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#D97706", letterSpacing: "0.08em", marginBottom: 4 }}>
                          <i className="bi bi-rocket-takeoff-fill" /> Multi-Tenant Provisioning Engine
                        </div>
                        <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F2744" }}>
                          Onboard School Tenant
                        </h3>
                        <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 13 }}>
                          Register an isolated school tenant, setup payment gateway split rules, and provision the school owner.
                        </p>
                      </div>
                      <button
                        style={{ border: "none", background: "#F1F5F9", width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", color: "#64748B" }}
                        onClick={() => setShowOnboardModal(false)}
                      >
                        &times;
                      </button>
                    </div>

                    {/* SUCCESS VIEW */}
                    {onboardSuccessResult ? (
                      <div>
                        <div
                          style={{
                            background: "#ECFDF5",
                            border: "1px solid #A7F3D0",
                            borderRadius: 16,
                            padding: 24,
                            textAlign: "center",
                            marginBottom: 20,
                          }}
                        >
                          <div
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: "50%",
                              background: "#10B981",
                              color: "#fff",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 26,
                              marginBottom: 12,
                            }}
                          >
                            <i className="bi bi-check-lg" />
                          </div>
                          <h4 style={{ margin: 0, fontWeight: 800, color: "#065F46", fontSize: 18 }}>
                            School Tenant Onboarded Successfully!
                          </h4>
                          <p style={{ margin: "6px 0 0", color: "#047857", fontSize: 13.5 }}>
                            {onboardSuccessResult.school?.school_name} has been provisioned on the platform.
                          </p>
                        </div>

                        {/* Summary details card */}
                        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 14, padding: 18, marginBottom: 20 }}>
                          <h5 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 800, color: "#0F2744", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            School & Administrator Sign-In Credentials
                          </h5>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                            <div>
                              <strong style={{ color: "#64748B", display: "block", fontSize: 11 }}>Portal Subdomain</strong>
                              <span style={{ color: "#0F2744", fontWeight: 700 }}>
                                https://{onboardSuccessResult.school?.school_subdomain}.schoolprofit.ng
                              </span>
                            </div>
                            <div>
                              <strong style={{ color: "#64748B", display: "block", fontSize: 11 }}>Assigned Role</strong>
                              <span style={{ color: "#0F2744", fontWeight: 700, textTransform: "capitalize" }}>
                                {onboardSuccessResult.lead_admin?.role || "Proprietor"}
                              </span>
                            </div>
                            <div>
                              <strong style={{ color: "#64748B", display: "block", fontSize: 11 }}>Sign-In Email</strong>
                              <span style={{ color: "#0F2744", fontWeight: 700 }}>
                                {onboardSuccessResult.lead_admin?.email}
                              </span>
                            </div>
                            <div>
                              <strong style={{ color: "#64748B", display: "block", fontSize: 11 }}>Temporary Password</strong>
                              <span style={{ color: "#D97706", fontWeight: 800, background: "#FEF3C7", padding: "2px 8px", borderRadius: 6 }}>
                                {onboardSuccessResult.lead_admin?.temporary_password}
                              </span>
                            </div>
                            <div>
                              <strong style={{ color: "#64748B", display: "block", fontSize: 11 }}>Paystack Subaccount</strong>
                              <span style={{ color: "#0F2744", fontWeight: 700 }}>
                                {onboardSuccessResult.split_gateway?.subaccount_code || "Will auto-create on first charge"}
                              </span>
                            </div>
                            <div>
                              <strong style={{ color: "#64748B", display: "block", fontSize: 11 }}>Technology Royalty Fee</strong>
                              <span style={{ color: "#10B981", fontWeight: 700 }}>
                                {fmtNaira(onboardSuccessResult.split_gateway?.tech_royalty_fee || 500)} / term fee payment
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="sa-btn sa-btn-gold"
                            onClick={() => {
                              const text = `School: ${onboardSuccessResult.school?.school_name}\nPortal: https://${onboardSuccessResult.school?.school_subdomain}.schoolprofit.ng\nEmail: ${onboardSuccessResult.lead_admin?.email}\nPassword: ${onboardSuccessResult.lead_admin?.temporary_password}\nRole: ${onboardSuccessResult.lead_admin?.role}`;
                              navigator.clipboard.writeText(text);
                              setCopiedCredentials(true);
                              setTimeout(() => setCopiedCredentials(false), 2500);
                            }}
                          >
                            <i className={`bi ${copiedCredentials ? "bi-check-all" : "bi-clipboard"}`} />
                            {copiedCredentials ? "Credentials Copied!" : "Copy Sign-in Details"}
                          </button>
                          <button
                            type="button"
                            className="sa-btn sa-btn-dark"
                            onClick={() => {
                              setShowOnboardModal(false);
                              setOnboardSuccessResult(null);
                            }}
                          >
                            Done & View in Registry
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* WIZARD FORM */
                      <form onSubmit={handleCompleteOnboarding}>
                        {/* Step Navigation Pills */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 24 }}>
                          <button
                            type="button"
                            onClick={() => setOnboardStep(1)}
                            style={{
                              padding: "10px 12px",
                              borderRadius: 12,
                              border: onboardStep === 1 ? "2px solid #0F2744" : "1px solid #E2E8F0",
                              background: onboardStep === 1 ? "#0F2744" : "#F8FAFC",
                              color: onboardStep === 1 ? "#fff" : "#64748B",
                              fontSize: 12.5,
                              fontWeight: 700,
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <span style={{ opacity: 0.7, marginRight: 6 }}>Step 1:</span>
                            School Identity
                          </button>

                          <button
                            type="button"
                            onClick={() => setOnboardStep(2)}
                            style={{
                              padding: "10px 12px",
                              borderRadius: 12,
                              border: onboardStep === 2 ? "2px solid #0F2744" : "1px solid #E2E8F0",
                              background: onboardStep === 2 ? "#0F2744" : "#F8FAFC",
                              color: onboardStep === 2 ? "#fff" : "#64748B",
                              fontSize: 12.5,
                              fontWeight: 700,
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <span style={{ opacity: 0.7, marginRight: 6 }}>Step 2:</span>
                            Gateway Split
                          </button>

                          <button
                            type="button"
                            onClick={() => setOnboardStep(3)}
                            style={{
                              padding: "10px 12px",
                              borderRadius: 12,
                              border: onboardStep === 3 ? "2px solid #0F2744" : "1px solid #E2E8F0",
                              background: onboardStep === 3 ? "#0F2744" : "#F8FAFC",
                              color: onboardStep === 3 ? "#fff" : "#64748B",
                              fontSize: 12.5,
                              fontWeight: 700,
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <span style={{ opacity: 0.7, marginRight: 6 }}>Step 3:</span>
                            Lead Admin
                          </button>
                        </div>

                        {/* STEP 1: SCHOOL IDENTITY & BRANDING */}
                        {onboardStep === 1 && (
                          <div style={{ display: "grid", gap: 14 }}>
                            <div>
                              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F2744", marginBottom: 5 }}>
                                School Legal Name <span style={{ color: "#EF4444" }}>*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                required
                                placeholder="e.g. St. Jude Premier Academy"
                                value={onboardForm.school_name}
                                onChange={(e) => setOnboardForm({ ...onboardForm, school_name: e.target.value })}
                                style={{ borderRadius: 10, fontSize: 13.5 }}
                              />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <div>
                                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F2744", marginBottom: 5 }}>
                                  School Code / Prefix
                                </label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="e.g. SJPA"
                                  value={onboardForm.school_code}
                                  onChange={(e) => setOnboardForm({ ...onboardForm, school_code: e.target.value.toUpperCase() })}
                                  style={{ borderRadius: 10, fontSize: 13.5 }}
                                />
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F2744", marginBottom: 5 }}>
                                  Category
                                </label>
                                <select
                                  className="form-select"
                                  value={onboardForm.category}
                                  onChange={(e) => setOnboardForm({ ...onboardForm, category: e.target.value })}
                                  style={{ borderRadius: 10, fontSize: 13.5 }}
                                >
                                  <option value="all_through">All-Through (Nursery - Senior Sec)</option>
                                  <option value="primary">Primary School Only</option>
                                  <option value="nursery">Nursery & Pre-School Only</option>
                                  <option value="junior_secondary">Junior Secondary Only</option>
                                  <option value="senior_secondary">Senior Secondary Only</option>
                                </select>
                              </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <div>
                                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F2744", marginBottom: 5 }}>
                                  Subdomain
                                </label>
                                <div className="input-group">
                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder="stjude"
                                    value={onboardForm.school_subdomain}
                                    onChange={(e) => setOnboardForm({ ...onboardForm, school_subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, "") })}
                                    style={{ borderTopLeftRadius: 10, borderBottomLeftRadius: 10, fontSize: 13 }}
                                  />
                                  <span className="input-group-text" style={{ fontSize: 12, color: "#64748B" }}>
                                    .schoolprofit.ng
                                  </span>
                                </div>
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F2744", marginBottom: 5 }}>
                                  Custom Domain (Optional)
                                </label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="e.g. stjudeschool.com.ng"
                                  value={onboardForm.custom_domain}
                                  onChange={(e) => setOnboardForm({ ...onboardForm, custom_domain: e.target.value })}
                                  style={{ borderRadius: 10, fontSize: 13 }}
                                />
                              </div>
                            </div>

                            {/* Brand Colors with live preview */}
                            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 14, padding: 14 }}>
                              <label style={{ display: "block", fontSize: 12.5, fontWeight: 800, color: "#0F2744", marginBottom: 8 }}>
                                Dynamic Brand Colors (Portal & Report Cards)
                              </label>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 14, alignItems: "center" }}>
                                <div>
                                  <small style={{ color: "#64748B", display: "block", marginBottom: 4, fontWeight: 600 }}>Primary Color</small>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <input
                                      type="color"
                                      value={onboardForm.primary_color}
                                      onChange={(e) => setOnboardForm({ ...onboardForm, primary_color: e.target.value })}
                                      style={{ width: 36, height: 36, border: "none", borderRadius: 8, cursor: "pointer" }}
                                    />
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      value={onboardForm.primary_color}
                                      onChange={(e) => setOnboardForm({ ...onboardForm, primary_color: e.target.value })}
                                      style={{ width: 85, fontSize: 12, fontWeight: 700 }}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <small style={{ color: "#64748B", display: "block", marginBottom: 4, fontWeight: 600 }}>Secondary Color</small>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <input
                                      type="color"
                                      value={onboardForm.secondary_color}
                                      onChange={(e) => setOnboardForm({ ...onboardForm, secondary_color: e.target.value })}
                                      style={{ width: 36, height: 36, border: "none", borderRadius: 8, cursor: "pointer" }}
                                    />
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      value={onboardForm.secondary_color}
                                      onChange={(e) => setOnboardForm({ ...onboardForm, secondary_color: e.target.value })}
                                      style={{ width: 85, fontSize: 12, fontWeight: 700 }}
                                    />
                                  </div>
                                </div>

                                {/* Dynamic Preview Badge */}
                                <div
                                  style={{
                                    background: onboardForm.primary_color,
                                    border: `2px solid ${onboardForm.secondary_color}`,
                                    borderRadius: 10,
                                    padding: "8px 14px",
                                    color: "#fff",
                                    textAlign: "center",
                                  }}
                                >
                                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Brand Preview</div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: onboardForm.secondary_color }}>
                                    {onboardForm.school_name ? onboardForm.school_name.slice(0, 16) : "School Portal"}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Logos & Stamp */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <div>
                                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F2744", marginBottom: 5 }}>
                                  School Crest / Logo
                                </label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="form-control form-control-sm"
                                  onChange={(e) => setOnboardForm({ ...onboardForm, logoFile: e.target.files?.[0] || null })}
                                  style={{ borderRadius: 8, fontSize: 12 }}
                                />
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F2744", marginBottom: 5 }}>
                                  Official Stamp / Signature
                                </label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="form-control form-control-sm"
                                  onChange={(e) => setOnboardForm({ ...onboardForm, stampFile: e.target.files?.[0] || null })}
                                  style={{ borderRadius: 8, fontSize: 12 }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* STEP 2: FINANCIAL GATEWAY SPLIT */}
                        {onboardStep === 2 && (
                          <div style={{ display: "grid", gap: 14 }}>
                            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "12px 16px", color: "#1E3A8A", fontSize: 12.5 }}>
                              <i className="bi bi-info-circle-fill me-1" />
                              <strong>Zero Cash-Holding Architecture:</strong> 100% of school tuition routes directly into the School Owner's bank subaccount. The platform technology royalty fee is automatically deducted at checkout and routed to the School Profit corporate account.
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <div>
                                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F2744", marginBottom: 5 }}>
                                  Settlement Bank Name
                                </label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="e.g. Access Bank / GTBank"
                                  value={onboardForm.bank_name}
                                  onChange={(e) => setOnboardForm({ ...onboardForm, bank_name: e.target.value })}
                                  style={{ borderRadius: 10, fontSize: 13 }}
                                />
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F2744", marginBottom: 5 }}>
                                  Bank Code (Optional)
                                </label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="e.g. 058 (GTBank)"
                                  value={onboardForm.bank_code}
                                  onChange={(e) => setOnboardForm({ ...onboardForm, bank_code: e.target.value })}
                                  style={{ borderRadius: 10, fontSize: 13 }}
                                />
                              </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <div>
                                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F2744", marginBottom: 5 }}>
                                  Account Number
                                </label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="10-digit NUBAN"
                                  value={onboardForm.account_number}
                                  onChange={(e) => setOnboardForm({ ...onboardForm, account_number: e.target.value })}
                                  style={{ borderRadius: 10, fontSize: 13 }}
                                />
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F2744", marginBottom: 5 }}>
                                  Account Name
                                </label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="Beneficiary Account Name"
                                  value={onboardForm.account_name}
                                  onChange={(e) => setOnboardForm({ ...onboardForm, account_name: e.target.value })}
                                  style={{ borderRadius: 10, fontSize: 13 }}
                                />
                              </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <div>
                                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F2744", marginBottom: 5 }}>
                                  Paystack Subaccount Code
                                </label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="e.g. ACCT_xxxx (or leave blank to auto-create)"
                                  value={onboardForm.paystack_subaccount_code}
                                  onChange={(e) => setOnboardForm({ ...onboardForm, paystack_subaccount_code: e.target.value })}
                                  style={{ borderRadius: 10, fontSize: 13 }}
                                />
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F2744", marginBottom: 5 }}>
                                  Technology Royalty Fee (₦)
                                </label>
                                <input
                                  type="number"
                                  className="form-control"
                                  value={onboardForm.tech_royalty_fee}
                                  onChange={(e) => setOnboardForm({ ...onboardForm, tech_royalty_fee: Number(e.target.value) })}
                                  style={{ borderRadius: 10, fontSize: 13 }}
                                />
                                <small style={{ color: "#64748B", fontSize: 11 }}>
                                  Per termly fee payment routed to School Profit.
                                </small>
                              </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <div>
                                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F2744", marginBottom: 5 }}>
                                  Technology Fee Bearer
                                </label>
                                <select
                                  className="form-select"
                                  value={onboardForm.platform_fee_bearer}
                                  onChange={(e) => setOnboardForm({ ...onboardForm, platform_fee_bearer: e.target.value })}
                                  style={{ borderRadius: 10, fontSize: 13 }}
                                >
                                  <option value="school">School Absorbs (Tuition Net)</option>
                                  <option value="parent">Parent Pays (Checkout Surcharge)</option>
                                </select>
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F2744", marginBottom: 5 }}>
                                  Edition Pricing Tier
                                </label>
                                <select
                                  className="form-select"
                                  value={onboardForm.active_edition_tier}
                                  onChange={(e) => setOnboardForm({ ...onboardForm, active_edition_tier: e.target.value })}
                                  style={{ borderRadius: 10, fontSize: 13 }}
                                >
                                  <option value="standard_cbt">Standard CBT & AI (₦500 / term)</option>
                                  <option value="basic_result">Basic Result Edition (₦300 / term)</option>
                                  <option value="annual_full_session">Annual Full Session License</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* STEP 3: LEAD ADMINISTRATOR PROVISIONING */}
                        {onboardStep === 3 && (
                          <div style={{ display: "grid", gap: 14 }}>
                            <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 12, padding: "12px 16px", color: "#92400E", fontSize: 12.5 }}>
                              <i className="bi bi-shield-lock-fill me-1" />
                              <strong>Lead Institutional Account:</strong> This user will receive full ownership credentials. They will be prompted to set a permanent private password on their first login.
                            </div>

                            <div>
                              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F2744", marginBottom: 5 }}>
                                Lead Administrator Role <span style={{ color: "#EF4444" }}>*</span>
                              </label>
                              <select
                                className="form-select"
                                value={onboardForm.lead_admin_role}
                                onChange={(e) => setOnboardForm({ ...onboardForm, lead_admin_role: e.target.value })}
                                style={{ borderRadius: 10, fontSize: 13.5 }}
                              >
                                <option value="proprietor">School Proprietor / Owner (role: proprietor)</option>
                                <option value="principal">Principal / Head Teacher (role: principal)</option>
                              </select>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <div>
                                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F2744", marginBottom: 5 }}>
                                  First Name <span style={{ color: "#EF4444" }}>*</span>
                                </label>
                                <input
                                  type="text"
                                  className="form-control"
                                  required
                                  placeholder="e.g. Adebayo"
                                  value={onboardForm.admin_firstname}
                                  onChange={(e) => setOnboardForm({ ...onboardForm, admin_firstname: e.target.value })}
                                  style={{ borderRadius: 10, fontSize: 13 }}
                                />
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F2744", marginBottom: 5 }}>
                                  Surname <span style={{ color: "#EF4444" }}>*</span>
                                </label>
                                <input
                                  type="text"
                                  className="form-control"
                                  required
                                  placeholder="e.g. Adeleke"
                                  value={onboardForm.admin_surname}
                                  onChange={(e) => setOnboardForm({ ...onboardForm, admin_surname: e.target.value })}
                                  style={{ borderRadius: 10, fontSize: 13 }}
                                />
                              </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <div>
                                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F2744", marginBottom: 5 }}>
                                  Official Email Address <span style={{ color: "#EF4444" }}>*</span>
                                </label>
                                <input
                                  type="email"
                                  className="form-control"
                                  required
                                  placeholder="proprietor@stjudeschool.com.ng"
                                  value={onboardForm.admin_email}
                                  onChange={(e) => setOnboardForm({ ...onboardForm, admin_email: e.target.value })}
                                  style={{ borderRadius: 10, fontSize: 13 }}
                                />
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F2744", marginBottom: 5 }}>
                                  Phone Number <span style={{ color: "#EF4444" }}>*</span>
                                </label>
                                <input
                                  type="tel"
                                  className="form-control"
                                  required
                                  placeholder="08031234567"
                                  value={onboardForm.admin_phone}
                                  onChange={(e) => setOnboardForm({ ...onboardForm, admin_phone: e.target.value })}
                                  style={{ borderRadius: 10, fontSize: 13 }}
                                />
                              </div>
                            </div>

                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                                <label style={{ fontSize: 12.5, fontWeight: 700, color: "#0F2744", margin: 0 }}>
                                  Temporary Sign-In Password
                                </label>
                                <button
                                  type="button"
                                  onClick={generateRandomPassword}
                                  style={{ border: "none", background: "none", color: "#D97706", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                                >
                                  <i className="bi bi-shuffle me-1" /> Generate Secure Password
                                </button>
                              </div>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Temporary password"
                                value={onboardForm.admin_password}
                                onChange={(e) => setOnboardForm({ ...onboardForm, admin_password: e.target.value })}
                                style={{ borderRadius: 10, fontSize: 13, fontFamily: "monospace" }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Modal Action Buttons */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, paddingTop: 16, borderTop: "1px solid #E2E8F0" }}>
                          {onboardStep > 1 ? (
                            <button
                              type="button"
                              className="sa-btn sa-btn-soft"
                              onClick={() => setOnboardStep((prev) => (prev - 1) as 1 | 2)}
                            >
                              <i className="bi bi-arrow-left" /> Back
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="sa-btn sa-btn-soft"
                              onClick={() => setShowOnboardModal(false)}
                            >
                              Cancel
                            </button>
                          )}

                          <div style={{ display: "flex", gap: 10 }}>
                            {onboardStep < 3 ? (
                              <button
                                type="button"
                                className="sa-btn sa-btn-gold"
                                onClick={() => {
                                  if (onboardStep === 1 && !onboardForm.school_name.trim()) {
                                    showError("Please enter the school legal name.");
                                    return;
                                  }
                                  setOnboardStep((prev) => (prev + 1) as 2 | 3);
                                }}
                              >
                                Next Step <i className="bi bi-arrow-right" />
                              </button>
                            ) : (
                              <button
                                type="submit"
                                className="sa-btn sa-btn-gold"
                                disabled={onboardingSubmitting}
                                style={{ fontWeight: 800 }}
                              >
                                {onboardingSubmitting ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                                    Provisioning School Tenant...
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-check2-circle" /> Complete School Onboarding
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-auto">
                <Footer />
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
