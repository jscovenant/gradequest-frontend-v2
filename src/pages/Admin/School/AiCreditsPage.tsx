import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";
import { getUser } from "../../../utils/token";

type AiCreditSummary = {
  allocated_credits: number;
  used_credits: number;
  remaining_credits: number;
  is_plus_active?: boolean;
  is_plus_package?: boolean;
  user_allocation?: {
    allocated_credits: number;
    used_credits: number;
    remaining_credits: number;
    is_unlimited: boolean;
  } | null;
  cycle_start?: string | null;
  cycle_end?: string | null;
  wallet_valid_from?: string | null;
  access_valid_until?: string | null;
  credits_given_with_current_plan?: number;
  current_package?: string | null;
  subscription_id?: number;
  ai_result_comment_credit_cost?: number;
  ai_cbt_question_credit_cost?: number;
  ai_lesson_plan_credit_cost?: number;
  ai_scheme_work_credit_cost?: number;
  ai_lesson_note_credit_cost?: number;
  ai_fee_collection_credit_cost?: number;
  ai_credit_unit_price?: number | string;
};

type StaffAllocation = {
  user_id: number;
  name: string;
  email: string;
  role: string;
  username: string;
  has_allocation: boolean;
  allocated_credits: number;
  used_credits: number;
  remaining_credits: number;
  is_unlimited: boolean;
  notes?: string | null;
  last_updated_at?: string | null;
};

type StaffAllocationResponse = {
  staff: StaffAllocation[];
  summary: {
    total_staff_count: number;
    allocated_staff_count: number;
    total_credits_allocated: number;
    total_credits_used_by_staff: number;
  };
};

type AiCreditQuote = {
  unit_price: number;
  quantity: number;
  total_amount: number;
  currency: string;
  wallet_balance: number;
};

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtMoney(value?: number | string | null) {
  return `NGN ${Number(value || 0).toLocaleString()}`;
}

function StatTile({ label, value, tone }: { label: string; value: string | number; tone: "primary" | "success" | "warning" | "info" }) {
  return (
    <div className={`ai-credit-tile ai-credit-tile--${tone}`}>
      <div className="ai-credit-tile-label">{label}</div>
      <div className="ai-credit-tile-value">{value}</div>
    </div>
  );
}

export default function AiCreditsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError, showSuccess } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "staff">("overview");
  const [summary, setSummary] = useState<AiCreditSummary | null>(null);
  const [quote, setQuote] = useState<AiCreditQuote | null>(null);
  const [quantity, setQuantity] = useState(50);
  const [buying, setBuying] = useState<"wallet" | "paystack" | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUser = getUser();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super-Admin";

  // Staff Allocations State
  const [staffData, setStaffData] = useState<StaffAllocationResponse | null>(null);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<StaffAllocation | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [allocationForm, setAllocationForm] = useState({
    allocated_credits: 50,
    is_unlimited: false,
    notes: "",
  });
  const [bulkForm, setBulkForm] = useState({
    allocated_credits: 50,
    is_unlimited: false,
    selectedUserIds: [] as number[],
  });
  const [savingAllocation, setSavingAllocation] = useState(false);

  const usagePercent = useMemo(() => {
    const allocated = Number(summary?.allocated_credits || 0);
    const used = Number(summary?.used_credits || 0);
    if (allocated <= 0) return 0;
    return Math.min(100, Math.round((used / allocated) * 100));
  }, [summary]);

  const estimatedTotal = Number(quote?.total_amount || quantity * Number(summary?.ai_credit_unit_price || quote?.unit_price || 0));
  const canPayWithWallet = Number(quote?.wallet_balance || 0) >= estimatedTotal && estimatedTotal > 0;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.get<{ data: AiCreditSummary }>("/admin/ai/credits");
      setSummary(res.data?.data || null);
    } catch (err: any) {
      const message = err?.response?.data?.message || "Unable to load AI credit balance.";
      setError(message);
      showError?.(message);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    if (!isAdmin) return;
    setLoadingStaff(true);
    try {
      const res = await authApi.get<{ data: StaffAllocationResponse }>("/admin/ai/credits/staff-allocations");
      setStaffData(res.data?.data || null);
      if (res.data?.data?.staff) {
        setBulkForm((prev) => ({
          ...prev,
          selectedUserIds: res.data.data.staff.map((s) => s.user_id),
        }));
      }
    } catch (err: any) {
      console.warn("Could not load staff allocations:", err?.response?.data?.message);
    } finally {
      setLoadingStaff(false);
    }
  };

  const loadQuote = async (nextQuantity = quantity) => {
    if (!isAdmin) return;
    try {
      const res = await authApi.get<AiCreditQuote>(`/admin/ai/credits/quote?quantity=${nextQuantity}`);
      setQuote(res.data || null);
    } catch (err: any) {
      if (isAdmin) {
        showError?.(err?.response?.data?.message || "Unable to load AI credit price.");
      }
    }
  };

  const updateQuantity = (value: number) => {
    const next = Math.max(1, Math.min(1000000, Number.isFinite(value) ? value : 1));
    setQuantity(next);
    loadQuote(next);
  };

  const buyWithWallet = async () => {
    setBuying("wallet");
    try {
      const res = await authApi.post("/admin/ai/credits/buy-wallet", { quantity });
      setSummary(res.data?.credits || null);
      showSuccess?.(res.data?.message || "AI credits purchased successfully.");
      await loadQuote(quantity);
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to buy AI credits with wallet.");
    } finally {
      setBuying(null);
    }
  };

  const buyWithPaystack = async () => {
    setBuying("paystack");
    try {
      const res = await authApi.post("/admin/ai/credits/initialize-online", { quantity });
      const url = res.data?.authorization_url;
      if (!url) throw new Error("Paystack authorization URL was not returned.");
      window.location.href = url;
    } catch (err: any) {
      showError?.(err?.response?.data?.message || err?.message || "Unable to start Paystack checkout.");
      setBuying(null);
    }
  };

  const verifyReturnedPayment = async (reference: string) => {
    setVerifying(true);
    try {
      const res = await authApi.get(`/admin/ai/credits/verify/${encodeURIComponent(reference)}`);
      setSummary(res.data?.credits || null);
      showSuccess?.(res.data?.message || "Payment verified and AI credits credited.");
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("reference");
      nextParams.delete("trxref");
      setSearchParams(nextParams, { replace: true });
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Payment verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  const openAllocateModal = (staff: StaffAllocation) => {
    setSelectedStaff(staff);
    setAllocationForm({
      allocated_credits: staff.has_allocation ? staff.allocated_credits : 50,
      is_unlimited: staff.is_unlimited,
      notes: staff.notes || "",
    });
    setModalOpen(true);
  };

  const saveAllocation = async () => {
    if (!selectedStaff) return;
    setSavingAllocation(true);
    try {
      await authApi.post("/admin/ai/credits/staff-allocations", {
        user_id: selectedStaff.user_id,
        allocated_credits: allocationForm.is_unlimited ? 0 : allocationForm.allocated_credits,
        is_unlimited: allocationForm.is_unlimited,
        notes: allocationForm.notes,
      });
      showSuccess?.(`AI credit quota updated for ${selectedStaff.name}.`);
      setModalOpen(false);
      await loadStaff();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to save staff allocation.");
    } finally {
      setSavingAllocation(false);
    }
  };

  const saveBulkAllocation = async () => {
    if (bulkForm.selectedUserIds.length === 0) {
      showError?.("Please select at least one staff member.");
      return;
    }
    setSavingAllocation(true);
    try {
      const res = await authApi.post("/admin/ai/credits/staff-allocations/bulk", {
        user_ids: bulkForm.selectedUserIds,
        allocated_credits: bulkForm.is_unlimited ? 0 : bulkForm.allocated_credits,
        is_unlimited: bulkForm.is_unlimited,
      });
      showSuccess?.(res.data?.message || "Bulk AI credit allocations applied.");
      setBulkModalOpen(false);
      await loadStaff();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to apply bulk allocations.");
    } finally {
      setSavingAllocation(false);
    }
  };

  const revokeAllocation = async (staff: StaffAllocation) => {
    if (!window.confirm(`Are you sure you want to remove the credit allocation for ${staff.name}?`)) return;
    try {
      await authApi.delete(`/admin/ai/credits/staff-allocations/${staff.user_id}`);
      showSuccess?.(`Credit allocation for ${staff.name} has been removed.`);
      await loadStaff();
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to remove allocation.");
    }
  };

  useEffect(() => {
    load();
    if (isAdmin) {
      loadQuote(quantity);
      loadStaff();
    }

    const returnedRef = searchParams.get("reference") || searchParams.get("trxref");
    if (returnedRef && isAdmin) {
      verifyReturnedPayment(returnedRef);
    }
  }, [isAdmin]);

  const filteredStaff = useMemo(() => {
    if (!staffData?.staff) return [];
    if (!staffSearch.trim()) return staffData.staff;
    const q = staffSearch.toLowerCase();
    return staffData.staff.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.role.toLowerCase().includes(q));
  }, [staffData, staffSearch]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .ai-credit-page {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        }
        .ai-credit-shell { max-width: 100%; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
        .ai-credit-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          color: #fff;
          border-radius: 16px;
          padding: 22px 26px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
        }
        .ai-credit-hero-glow {
          position: absolute;
          top: -60px;
          right: -60px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.15) 0%, transparent 65%);
          pointer-events: none;
        }
        .ai-credit-hero>* { position: relative; z-index: 1; }
        .ai-credit-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #FBBF24;
          background: rgba(217, 119, 6, 0.20);
          border: 1px solid rgba(217, 119, 6, 0.35);
          border-radius: 100px;
          padding: 3px 11px;
          margin-bottom: 8px;
        }
        .ai-credit-hero h1 { font-size: 22px; font-weight: 800; margin: 0 0 4px; color: #fff; line-height: 1.2; }
        .ai-credit-hero p { margin: 0; color: #CBD5E1; font-size: 13px; line-height: 1.5; max-width: 680px; }
        .ai-credit-tabs { display: flex; gap: 10px; border-bottom: 2px solid #E2E8F0; margin-bottom: 8px; }
        .ai-credit-tab { padding: 10px 18px; font-weight: 700; font-size: 13.5px; color: #64748B; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; display: flex; align-items: center; gap: 8px; margin-bottom: -2px; transition: all 0.2s; }
        .ai-credit-tab--active { color: #0F2744; border-bottom-color: #D97706; font-weight: 800; }
        .ai-credit-card { background: #fff; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 16px rgba(15,39,68,0.03); }
        .ai-credit-pad { padding: 22px; }
        .ai-credit-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 18px; }
        .ai-credit-card-title { font-size: 16px; font-weight: 700; color: #0F2744; margin: 0 0 4px; }
        .ai-credit-muted { color: #64748B; font-size: 13px; margin: 0; }
        .ai-credit-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
        .ai-credit-tile { border-radius: 14px; padding: 16px 18px; border: 1px solid transparent; }
        .ai-credit-tile--primary { background: #F8FAFC; border-color: #E2E8F0; color: #0F2744; }
        .ai-credit-tile--success { background: #ECFDF5; border-color: #A7F3D0; color: #065F46; }
        .ai-credit-tile--warning { background: #FFFBEB; border-color: #FDE68A; color: #92400E; }
        .ai-credit-tile--info { background: #F8FAFC; border-color: #E2E8F0; color: #334155; }
        .ai-credit-tile-label { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.85; margin-bottom: 6px; }
        .ai-credit-tile-value { font-size: 26px; font-weight: 800; line-height: 1; }
        .ai-credit-progress { height: 8px; background: #E2E8F0; border-radius: 999px; overflow: hidden; }
        .ai-credit-progress-fill { height: 100%; background: linear-gradient(90deg, #D97706, #FBBF24); border-radius: 999px; transition: width 0.3s ease; }
        .ai-credit-two-col { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 20px; }
        .ai-credit-buy-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 14px; }
        .ai-credit-input { width: 100%; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px; font-size: 13.5px; font-weight: 600; color: #0F2744; background: #F8FAFC; outline: none; transition: border-color 0.2s; }
        .ai-credit-input:focus { border-color: #D97706; background: #fff; box-shadow: 0 0 0 3px rgba(217,119,6,0.12); }
        .ai-credit-btn { background: #D97706; color: #fff; border: none; border-radius: 10px; padding: 10px 18px; font-weight: 700; font-size: 13.5px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease; }
        .ai-credit-btn:hover { background: #B45309; transform: translateY(-1px); }
        .ai-credit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .ai-credit-btn-paystack { background: #0F2744; color: #fff; }
        .ai-credit-btn-paystack:hover { background: #1E3A8A; }
        .ai-credit-btn-outline { background: rgba(255,255,255,0.10); color: #fff; border: 1px solid rgba(255,255,255,0.20); border-radius: 10px; padding: 9px 16px; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; }
        .ai-credit-btn-outline:hover { background: rgba(255,255,255,0.18); color: #fff; }
        .ai-credit-btn-soft { background: #F1F5F9; color: #0F2744; border: 1px solid #E2E8F0; border-radius: 8px; padding: 6px 12px; font-size: 12.5px; font-weight: 700; cursor: pointer; }
        .ai-credit-btn-soft:hover { background: #E2E8F0; }
        .ai-credit-btn-danger { background: #FEE2E2; color: #991B1B; border: none; border-radius: 8px; padding: 6px 12px; font-size: 12.5px; font-weight: 700; cursor: pointer; }
        .ai-credit-btn-danger:hover { background: #FECACA; }
        .ai-credit-table-wrap { overflow-x: auto; width: 100%; }
        .ai-credit-table { width: 100%; border-collapse: separate; border-spacing: 0 6px; min-width: 680px; }
        .ai-credit-table th { color: #64748B; font-size: 11.5px; text-transform: uppercase; font-weight: 700; padding: 0 12px; }
        .ai-credit-table td { background: #F8FAFC; border-top: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0; padding: 12px 14px; vertical-align: middle; font-size: 13px; color: #334155; }
        .ai-credit-table td:first-child { border-left: 1px solid #E2E8F0; border-radius: 10px 0 0 10px; }
        .ai-credit-table td:last-child { border-right: 1px solid #E2E8F0; border-radius: 0 10px 10px 0; }
        .ai-credit-pill { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
        .ai-credit-pill--green { background: #DCFCE7; color: #166534; }
        .ai-credit-pill--blue { background: #EEF2FF; color: #3730A3; }
        .ai-credit-pill--amber { background: #FEF3C7; color: #92400E; }
        .ai-credit-pill--gray { background: #F1F5F9; color: #475569; }
        .ai-credit-modal-overlay { position: fixed; inset: 0; background: rgba(15,39,68,0.55); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px; }
        .ai-credit-modal { background: #fff; border-radius: 18px; width: 100%; max-width: 500px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); }
        .ai-credit-modal-head { padding: 18px 22px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; }
        .ai-credit-modal-body { padding: 22px; display: flex; flex-direction: column; gap: 16px; }
        .ai-credit-modal-foot { padding: 14px 22px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: flex-end; gap: 10px; }
        .ai-credit-tool { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 10px; }
        .ai-credit-tool-title { font-weight: 700; font-size: 14px; color: #0F2744; margin-bottom: 2px; }
        .ai-credit-tool-sub { font-size: 12px; color: #64748B; }
        .ai-credit-alert { display: flex; gap: 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 14px; font-size: 13px; color: #0F2744; }
        .ai-credit-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F1F5F9; font-size: 13px; }
        .ai-credit-label { color: #64748B; font-weight: 600; }
        .ai-credit-value { color: #0F2744; font-weight: 700; }
        @media(max-width: 991px) { .ai-credit-two-col { grid-template-columns: 1fr; } }
      `}</style>

      <PageTitle title="AI Credit Management" />
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="AI Credits" />
      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="col-md-9 col-lg-10 ms-auto db-main ai-credit-page">
            <div className="ai-credit-shell">
              <section className="ai-credit-hero db-hero">
                <div>
                  <div className="ai-credit-kicker db-session-badge">
                    <i className="bi bi-stars" />
                    <span>GradiosEdu Plus AI</span>
                  </div>
                  <h1 className="db-greeting">AI Credit Management & Staff Quotas</h1>
                  <p className="db-hero-sub">
                    Manage school AI credits and allocate credit allowances to teachers and staff to control AI usage across CBT exam questions, lesson plans, scheme of work, and result comments.
                  </p>
                </div>
                <button
                  className="ai-credit-btn-outline"
                  onClick={() => {
                    load();
                    if (isAdmin) {
                      loadQuote(quantity);
                      loadStaff();
                    }
                  }}
                  disabled={loading || verifying}
                >
                  <i className="bi bi-arrow-clockwise me-1" /> Refresh
                </button>
              </section>

              {/* GradiosEdu Plus Check Warning */}
              {summary && summary.is_plus_active === false && (
                <div className="alert alert-warning d-flex align-items-center gap-3 p-3 mb-2" style={{ borderRadius: "14px" }}>
                  <i className="bi bi-exclamation-triangle-fill fs-3 text-warning" />
                  <div>
                    <h4 className="fs-6 fw-bold mb-1">GradiosEdu Plus Package Required</h4>
                    <p className="mb-0 text-muted" style={{ fontSize: "13px" }}>
                      AI Features and credit allowances are exclusively enabled for schools on the <strong>GradiosEdu Plus</strong> plan.
                      {!isAdmin && " Please contact your school administrator to upgrade to GradiosEdu Plus."}
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation Tabs - Only for Administrators */}
              {isAdmin && (
                <div className="ai-credit-tabs">
                  <button
                    type="button"
                    className={`ai-credit-tab ${activeTab === "overview" ? "ai-credit-tab--active" : ""}`}
                    onClick={() => setActiveTab("overview")}
                  >
                    <i className="bi bi-wallet2" /> School AI Balance & Tools
                  </button>
                  <button
                    type="button"
                    className={`ai-credit-tab ${activeTab === "staff" ? "ai-credit-tab--active" : ""}`}
                    onClick={() => setActiveTab("staff")}
                  >
                    <i className="bi bi-people" /> Teacher & Staff Allocations
                    {staffData?.summary?.allocated_staff_count !== undefined && (
                      <span className="ai-credit-pill ai-credit-pill--blue">{staffData.summary.allocated_staff_count} configured</span>
                    )}
                  </button>
                </div>
              )}

              {loading ? (
                <Loader message="Loading AI credits..." />
              ) : activeTab === "overview" || !isAdmin ? (
                <div className="ai-credit-two-col">
                  {/* Left Column: Current Balance & Top-up */}
                  <section className="ai-credit-card">
                    {summary?.user_allocation && (
                      <div className="ai-credit-pad border-bottom" style={{ background: "#f0fdf4" }}>
                        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                          <div>
                            <span className="badge bg-success mb-1">Your Personal Allowance</span>
                            <h2 className="ai-credit-card-title m-0">Assigned AI Credit Quota</h2>
                            <p className="ai-credit-muted m-0">Credits allocated directly to your teacher/staff account by the administrator.</p>
                          </div>
                          {summary.user_allocation.is_unlimited ? (
                            <span className="ai-credit-pill ai-credit-pill--blue">Unlimited Pool Access</span>
                          ) : (
                            <span className="ai-credit-pill ai-credit-pill--green">
                              {summary.user_allocation.remaining_credits > 0 ? "Credits Available" : "Quota Exhausted"}
                            </span>
                          )}
                        </div>
                        <div className="ai-credit-tiles">
                          <StatTile
                            label="Your Remaining"
                            value={summary.user_allocation.is_unlimited ? "Unlimited" : summary.user_allocation.remaining_credits}
                            tone="primary"
                          />
                          <StatTile
                            label="Your Used"
                            value={summary.user_allocation.used_credits}
                            tone="warning"
                          />
                          <StatTile
                            label="Total Quota"
                            value={summary.user_allocation.is_unlimited ? "Unlimited" : summary.user_allocation.allocated_credits}
                            tone="success"
                          />
                        </div>
                      </div>
                    )}
                    <div className="ai-credit-pad">
                      <div className="ai-credit-head">
                        <div>
                          <h2 className="ai-credit-card-title">{isAdmin ? "School Central AI Pool" : "School Credit Pool"}</h2>
                          <p className="ai-credit-muted">Central credit pool available to the school.</p>
                        </div>
                      </div>

                      <div className="ai-credit-tiles">
                        <StatTile label="School Remaining" value={summary?.remaining_credits ?? 0} tone="primary" />
                        <StatTile label="School Used" value={summary?.used_credits ?? 0} tone="warning" />
                        <StatTile label="School Total" value={summary?.allocated_credits ?? 0} tone="success" />
                      </div>

                      <div className="mt-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="ai-credit-label">AI credits consumed</span>
                          <span className="ai-credit-value">{usagePercent}%</span>
                        </div>
                        <div className="ai-credit-progress">
                          <div className="ai-credit-progress-fill" style={{ width: `${usagePercent}%` }} />
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="ai-credit-row">
                          <span className="ai-credit-label">Current Package</span>
                          <span className="ai-credit-value">{summary?.current_package || "GradiosEdu Plus"}</span>
                        </div>
                        <div className="ai-credit-row">
                          <span className="ai-credit-label">AI Access Valid Until</span>
                          <span className="ai-credit-value">{fmtDate(summary?.access_valid_until || summary?.cycle_end)}</span>
                        </div>
                        {isAdmin && (
                          <div className="ai-credit-row">
                            <span className="ai-credit-label">Extra AI Credit Price</span>
                            <span className="ai-credit-value">{fmtMoney(summary?.ai_credit_unit_price)}</span>
                          </div>
                        )}
                      </div>

                      {/* Buy Extra Credits - Only for Administrators */}
                      {isAdmin && (
                        <div className="mt-4 pt-3 border-top">
                          <div className="ai-credit-head mb-2">
                            <div>
                              <h2 className="ai-credit-card-title">Buy Extra Credits</h2>
                              <p className="ai-credit-muted">Top up the school's central AI balance at standard rates.</p>
                            </div>
                          </div>
                          <div className="ai-credit-buy-grid">
                          <div>
                            <label className="ai-credit-label d-block mb-1">Credit quantity</label>
                            <input
                              className="ai-credit-input"
                              type="number"
                              min={1}
                              max={1000000}
                              value={quantity}
                              onChange={(e) => updateQuantity(Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <label className="ai-credit-label d-block mb-1">Amount to pay</label>
                            <div className="ai-credit-input" style={{ background: "#f8fafc", minHeight: 44, display: "flex", alignItems: "center" }}>
                              {fmtMoney(estimatedTotal)}
                            </div>
                          </div>
                        </div>
                        <div className="ai-credit-summary-box mb-3">
                          <div className="ai-credit-row">
                            <span className="ai-credit-label">Unit Price</span>
                            <span className="ai-credit-value">{fmtMoney(quote?.unit_price || summary?.ai_credit_unit_price)}</span>
                          </div>
                          <div className="ai-credit-row">
                            <span className="ai-credit-label">School Wallet Balance</span>
                            <span className="ai-credit-value">{fmtMoney(quote?.wallet_balance)}</span>
                          </div>
                        </div>
                        <div className="d-flex gap-2 flex-wrap">
                          <button className="ai-credit-btn" disabled={!!buying || verifying || !canPayWithWallet} onClick={buyWithWallet}>
                            <i className="bi bi-wallet2" /> {buying === "wallet" ? "Processing..." : "Pay with Wallet"}
                          </button>
                          <button className="ai-credit-btn" style={{ background: "#050008", color: "#fff" }} disabled={!!buying || verifying} onClick={buyWithPaystack}>
                            <i className="bi bi-credit-card-2-front" /> {buying === "paystack" ? "Processing..." : "Pay Online"}
                          </button>
                        </div>
                        {!canPayWithWallet && estimatedTotal > 0 && (
                          <p className="ai-credit-muted mt-2">
                            Wallet payment is disabled because your wallet balance is lower than {fmtMoney(estimatedTotal)}.
                          </p>
                        )}
                      </div>
                    )}
                    </div>
                  </section>

                  {/* Right Column: AI Tools & Standard Charges */}
                  <aside className="ai-credit-card">
                    <div className="ai-credit-pad">
                      <div className="ai-credit-head">
                        <div>
                          <h2 className="ai-credit-card-title">GradiosEdu Standard Rates</h2>
                          <p className="ai-credit-muted">Fixed credit costs per AI feature.</p>
                        </div>
                      </div>

                      <div className="ai-credit-tool">
                        <div>
                          <div className="ai-credit-tool-title">Result Comment Generator</div>
                          <div className="ai-credit-tool-sub">Cost: {summary?.ai_result_comment_credit_cost ?? 1} credit per student result</div>
                        </div>
                        <button className="ai-credit-btn-soft" onClick={() => navigate("/students/results/add")}>
                          Open <i className="bi bi-arrow-right" />
                        </button>
                      </div>

                      <div className="ai-credit-tool">
                        <div>
                          <div className="ai-credit-tool-title">CBT Question Generator</div>
                          <div className="ai-credit-tool-sub">Cost: {summary?.ai_cbt_question_credit_cost ?? 5} credits per generation</div>
                        </div>
                        <button className="ai-credit-btn-soft" onClick={() => navigate("/cbt/exams")}>
                          Open <i className="bi bi-arrow-right" />
                        </button>
                      </div>

                      <div className="ai-credit-tool">
                        <div>
                          <div className="ai-credit-tool-title">Lesson Plan Generator</div>
                          <div className="ai-credit-tool-sub">Cost: {summary?.ai_lesson_plan_credit_cost ?? 3} credits per plan</div>
                        </div>
                        <button className="ai-credit-btn-soft" onClick={() => navigate("/settings/ai-lesson-plans")}>
                          Open <i className="bi bi-arrow-right" />
                        </button>
                      </div>

                      <div className="ai-credit-tool">
                        <div>
                          <div className="ai-credit-tool-title">Scheme of Work Generator</div>
                          <div className="ai-credit-tool-sub">Cost: {summary?.ai_scheme_work_credit_cost ?? 4} credits per scheme</div>
                        </div>
                        <button className="ai-credit-btn-soft" onClick={() => navigate("/settings/ai-lesson-plans")}>
                          Open <i className="bi bi-arrow-right" />
                        </button>
                      </div>

                      <div className="ai-credit-tool">
                        <div>
                          <div className="ai-credit-tool-title">Lesson Note Generator</div>
                          <div className="ai-credit-tool-sub">Cost: {summary?.ai_lesson_note_credit_cost ?? 5} credits per note</div>
                        </div>
                        <button className="ai-credit-btn-soft" onClick={() => navigate("/settings/ai-lesson-plans")}>
                          Open <i className="bi bi-arrow-right" />
                        </button>
                      </div>

                      <div className="ai-credit-tool">
                        <div>
                          <div className="ai-credit-tool-title">Fee Collection Assistant</div>
                          <div className="ai-credit-tool-sub">Cost: {summary?.ai_fee_collection_credit_cost ?? 2} credits per analysis</div>
                        </div>
                        <button className="ai-credit-btn-soft" onClick={() => navigate("/fees/ai-collection")}>
                          Open <i className="bi bi-arrow-right" />
                        </button>
                      </div>

                      <div className="ai-credit-alert mt-3">
                        <i className="bi bi-info-circle mt-1" />
                        <div>
                          <strong>Control Tip:</strong> Switch to the <strong>Teacher & Staff Allocations</strong> tab to assign credit limits to individual teachers.
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>
              ) : (
                /* Tab 2: Staff & Teacher Allocations */
                <section className="ai-credit-card">
                  <div className="ai-credit-pad">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                      <div>
                        <h2 className="ai-credit-card-title">Staff & Teacher Credit Budgets</h2>
                        <p className="ai-credit-muted">
                          Allocate specific credit allowances to teachers. When a teacher makes an AI generation, credits are deducted from both their quota and the school balance.
                        </p>
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        <button className="ai-credit-btn" onClick={() => setBulkModalOpen(true)}>
                          <i className="bi bi-people-fill" /> Bulk Distribute Credits
                        </button>
                      </div>
                    </div>

                    {/* Quick Stats Bar */}
                    <div className="ai-credit-tiles mb-3">
                      <StatTile label="Total Staff" value={staffData?.summary?.total_staff_count ?? 0} tone="info" />
                      <StatTile label="Staff with Quotas" value={staffData?.summary?.allocated_staff_count ?? 0} tone="primary" />
                      <StatTile label="Total Credits Allocated" value={staffData?.summary?.total_credits_allocated ?? 0} tone="success" />
                      <StatTile label="Total Used by Staff" value={staffData?.summary?.total_credits_used_by_staff ?? 0} tone="warning" />
                    </div>

                    {/* Filter & Search */}
                    <div className="mb-3">
                      <input
                        className="ai-credit-input"
                        placeholder="Search teacher or staff by name, email, or role..."
                        value={staffSearch}
                        onChange={(e) => setStaffSearch(e.target.value)}
                        style={{ maxWidth: 420 }}
                      />
                    </div>

                    {loadingStaff ? (
                      <Loader message="Loading staff members..." />
                    ) : (
                      <div className="ai-credit-table-wrap">
                        <table className="ai-credit-table">
                          <thead>
                            <tr>
                              <th>Staff Member</th>
                              <th>Role</th>
                              <th>Allocated Quota</th>
                              <th>Used</th>
                              <th>Remaining Balance</th>
                              <th>Usage</th>
                              <th style={{ textAlign: "right" }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredStaff.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="text-center py-4 text-muted">
                                  No staff members found.
                                </td>
                              </tr>
                            ) : (
                              filteredStaff.map((staff) => {
                                const pct = staff.is_unlimited
                                  ? 0
                                  : staff.allocated_credits > 0
                                  ? Math.min(100, Math.round((staff.used_credits / staff.allocated_credits) * 100))
                                  : 0;

                                return (
                                  <tr key={staff.user_id}>
                                    <td>
                                      <strong>{staff.name}</strong>
                                      <br />
                                      <small className="text-muted">{staff.email || staff.username}</small>
                                    </td>
                                    <td>
                                      <span className="ai-credit-pill ai-credit-pill--gray">{staff.role}</span>
                                    </td>
                                    <td>
                                      {staff.is_unlimited ? (
                                        <span className="ai-credit-pill ai-credit-pill--blue">Unlimited Pool</span>
                                      ) : staff.has_allocation ? (
                                        <strong>{staff.allocated_credits} credits</strong>
                                      ) : (
                                        <span className="text-muted">No quota set (Shared pool)</span>
                                      )}
                                    </td>
                                    <td>
                                      <span style={{ color: "#b45309", fontWeight: 700 }}>{staff.used_credits}</span>
                                    </td>
                                    <td>
                                      {staff.is_unlimited ? (
                                        <span className="ai-credit-pill ai-credit-pill--green">Unlimited</span>
                                      ) : staff.has_allocation ? (
                                        <strong style={{ color: staff.remaining_credits > 0 ? "#15803d" : "#b91c1c" }}>
                                          {staff.remaining_credits} credits
                                        </strong>
                                      ) : (
                                        <span className="text-muted">-</span>
                                      )}
                                    </td>
                                    <td style={{ minWidth: 120 }}>
                                      {!staff.is_unlimited && staff.allocated_credits > 0 ? (
                                        <div>
                                          <small className="text-muted">{pct}%</small>
                                          <div className="ai-credit-progress" style={{ height: 6 }}>
                                            <div className="ai-credit-progress-fill" style={{ width: `${pct}%` }} />
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-muted">-</span>
                                      )}
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                      <div className="d-flex gap-2 justify-content-end">
                                        <button className="ai-credit-btn-outline" onClick={() => openAllocateModal(staff)}>
                                          <i className="bi bi-pencil-square" /> {staff.has_allocation ? "Edit Quota" : "Set Quota"}
                                        </button>
                                        {staff.has_allocation && (
                                          <button className="ai-credit-btn-danger" onClick={() => revokeAllocation(staff)} title="Reset to default">
                                            <i className="bi bi-x-circle" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Individual Allocation Modal */}
              {modalOpen && selectedStaff && (
                <div className="ai-credit-modal-overlay">
                  <div className="ai-credit-modal">
                    <div className="ai-credit-modal-head">
                      <h3 className="m-0 fs-5 fw-bold">Set AI Quota for {selectedStaff.name}</h3>
                      <button className="btn-close" onClick={() => setModalOpen(false)} />
                    </div>
                    <div className="ai-credit-modal-body">
                      <div>
                        <label className="ai-credit-label d-block mb-1">Staff Role</label>
                        <div>
                          <span className="ai-credit-pill ai-credit-pill--gray">{selectedStaff.role}</span>
                          <span className="ms-2 text-muted">{selectedStaff.email}</span>
                        </div>
                      </div>

                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="unlimitedSwitch"
                          checked={allocationForm.is_unlimited}
                          onChange={(e) => setAllocationForm({ ...allocationForm, is_unlimited: e.target.checked })}
                        />
                        <label className="form-check-label fw-bold" htmlFor="unlimitedSwitch">
                          Grant Unlimited Access (Draw directly from School Pool)
                        </label>
                      </div>

                      {!allocationForm.is_unlimited && (
                        <div>
                          <label className="ai-credit-label d-block mb-1">Allocated Credit Amount</label>
                          <input
                            className="ai-credit-input"
                            type="number"
                            min={0}
                            max={1000000}
                            value={allocationForm.allocated_credits}
                            onChange={(e) => setAllocationForm({ ...allocationForm, allocated_credits: Number(e.target.value) })}
                          />
                          <small className="text-muted d-block mt-1">
                            Current consumption by this teacher: <strong>{selectedStaff.used_credits} credits</strong>. Remaining will be{" "}
                            <strong>{Math.max(0, allocationForm.allocated_credits - selectedStaff.used_credits)} credits</strong>.
                          </small>
                        </div>
                      )}

                      <div>
                        <label className="ai-credit-label d-block mb-1">Optional Admin Note</label>
                        <input
                          className="ai-credit-input"
                          placeholder="e.g. 1st Term Lesson Plan & CBT budget"
                          value={allocationForm.notes}
                          onChange={(e) => setAllocationForm({ ...allocationForm, notes: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="ai-credit-modal-foot">
                      <button className="ai-credit-btn-soft" onClick={() => setModalOpen(false)} disabled={savingAllocation}>
                        Cancel
                      </button>
                      <button className="ai-credit-btn" onClick={saveAllocation} disabled={savingAllocation}>
                        {savingAllocation ? "Saving..." : "Save Quota"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Bulk Allocation Modal */}
              {bulkModalOpen && staffData && (
                <div className="ai-credit-modal-overlay">
                  <div className="ai-credit-modal" style={{ maxWidth: 580 }}>
                    <div className="ai-credit-modal-head">
                      <h3 className="m-0 fs-5 fw-bold">Bulk Distribute AI Credits</h3>
                      <button className="btn-close" onClick={() => setBulkModalOpen(false)} />
                    </div>
                    <div className="ai-credit-modal-body">
                      <p className="ai-credit-muted">
                        Apply a standard credit budget across all selected teachers and staff members in one click.
                      </p>

                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="bulkUnlimitedSwitch"
                          checked={bulkForm.is_unlimited}
                          onChange={(e) => setBulkForm({ ...bulkForm, is_unlimited: e.target.checked })}
                        />
                        <label className="form-check-label fw-bold" htmlFor="bulkUnlimitedSwitch">
                          Grant Unlimited Access to Selected Staff
                        </label>
                      </div>

                      {!bulkForm.is_unlimited && (
                        <div>
                          <label className="ai-credit-label d-block mb-1">Credit Allowance Per Teacher</label>
                          <input
                            className="ai-credit-input"
                            type="number"
                            min={0}
                            max={1000000}
                            value={bulkForm.allocated_credits}
                            onChange={(e) => setBulkForm({ ...bulkForm, allocated_credits: Number(e.target.value) })}
                          />
                        </div>
                      )}

                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <label className="ai-credit-label m-0">
                            Recipients ({bulkForm.selectedUserIds.length} of {staffData.staff.length} selected)
                          </label>
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0"
                            onClick={() =>
                              setBulkForm({
                                ...bulkForm,
                                selectedUserIds:
                                  bulkForm.selectedUserIds.length === staffData.staff.length
                                    ? []
                                    : staffData.staff.map((s) => s.user_id),
                              })
                            }
                          >
                            {bulkForm.selectedUserIds.length === staffData.staff.length ? "Deselect All" : "Select All"}
                          </button>
                        </div>
                        <div
                          style={{
                            maxHeight: 180,
                            overflowY: "auto",
                            border: "1px solid #e2e8f0",
                            borderRadius: 12,
                            padding: "8px 12px",
                          }}
                        >
                          {staffData.staff.map((s) => {
                            const isChecked = bulkForm.selectedUserIds.includes(s.user_id);
                            return (
                              <div key={s.user_id} className="form-check py-1">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`staff_check_${s.user_id}`}
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setBulkForm({ ...bulkForm, selectedUserIds: [...bulkForm.selectedUserIds, s.user_id] });
                                    } else {
                                      setBulkForm({
                                        ...bulkForm,
                                        selectedUserIds: bulkForm.selectedUserIds.filter((id) => id !== s.user_id),
                                      });
                                    }
                                  }}
                                />
                                <label className="form-check-label d-flex justify-content-between" htmlFor={`staff_check_${s.user_id}`}>
                                  <span>{s.name} ({s.role})</span>
                                  <small className="text-muted">{s.email}</small>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="ai-credit-modal-foot">
                      <button className="ai-credit-btn-soft" onClick={() => setBulkModalOpen(false)} disabled={savingAllocation}>
                        Cancel
                      </button>
                      <button className="ai-credit-btn" onClick={saveBulkAllocation} disabled={savingAllocation}>
                        {savingAllocation ? "Distributing..." : `Distribute to ${bulkForm.selectedUserIds.length} Staff`}
                      </button>
                    </div>
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
