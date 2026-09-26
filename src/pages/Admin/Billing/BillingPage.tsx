// src/pages/Subscriptions/BillingPage.tsx
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

type Plan = {
  id: number | null;
  name: string;
  price?: number | null;
  price_per_student?: number | null;
  active_students?: number | null;
  current_amount?: number | null;
  billing_interval?: string | null;
  duration_in_days?: number | null;
};

type PaymentRow = {
  id: number;
  reference: string;
  amount: number;
  status: string;
  channel?: string | null;
  card_type?: string | null;
  last4?: string | null;
  starts_at?: string | null;
  created_at?: string | null;
  plan?: Plan | null;
};

type ClearanceStudent = {
  id: number;
  firstname: string;
  surname: string;
  reg_no: string;
  class_id: number;
  class_name: string;
  status: string;
  is_term_cleared: boolean;
  is_session_cleared: boolean;
  paid_terms_count: number;
  total_terms_count: number;
  covered_at?: string | null;
  grace_until?: string | null;
};

type ClassItem = {
  id: number;
  name: string;
};

type ModalStudentItem = {
  id: number;
  firstname: string;
  surname: string;
  reg_no: string;
  class_name: string;
  cost: number;
};

function fmtNaira(n: number) {
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(n);
  } catch {
    return `₦${Number(n || 0).toLocaleString()}`;
  }
}

function fmtDate(val?: string | null) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function badgeTone(status: string) {
  const s = (status || "").toLowerCase();
  if (s.includes("success") || s.includes("paid")) return { bg: "rgba(34,197,94,0.14)", fg: "#15803d", text: status };
  if (s.includes("pending")) return { bg: "rgba(245,158,11,0.16)", fg: "#b45309", text: status };
  if (s.includes("fail") || s.includes("error")) return { bg: "rgba(239,68,68,0.14)", fg: "#dc2626", text: status };
  if (s.includes("cancel")) return { bg: "rgba(148,163,184,0.14)", fg: "#64748b", text: status };
  return { bg: "rgba(0,0,0,0.05)", fg: "#475569", text: status || "Unknown" };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export default function BillingPage() {
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Billing & Clearance summaries
  const [clearanceSummary, setClearanceSummary] = useState<{
    total_students: number;
    cleared_count: number;
    pending_count: number;
    terms_count: number;
    fee_per_student: number;
    term_clearance_fee: number;
    session_clearance_fee: number;
    wallet_balance: number;
    session_id?: number | null;
    term_id?: number | null;
  } | null>(null);

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selective Student Roster state
  const [rosterStudents, setRosterStudents] = useState<ClearanceStudent[]>([]);
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [classFilter, setClassFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("unpaid");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [rosterPage, setRosterPage] = useState<number>(1);
  const [rosterTotal, setRosterTotal] = useState<number>(0);
  const [rosterLastPage, setRosterLastPage] = useState<number>(1);
  const [clearanceScope, setClearanceScope] = useState<"term" | "session">("term");
  const [clearingSingleId, setClearingSingleId] = useState<number | null>(null);

  // Clearance Modal state
  const [clearanceModal, setClearanceModal] = useState<{
    isOpen: boolean;
    mode: "selected" | "term" | "session" | "single";
    title: string;
    subtitle: string;
    sessionId?: number | null;
    termId?: number | null;
    studentsList: ModalStudentItem[];
    studentCount: number;
    feePerStudent: number;
    totalFee: number;
    walletBalance: number;
    invoiceId?: number | null;
    invoiceNo?: string | null;
    virtualAccount?: {
      bank_name: string;
      account_number: string;
      account_name: string;
      reference: string;
      amount: number;
      error?: string | null;
    } | null;
    loadingOnline: boolean;
    initiatingPaystack: boolean;
    activeTab: "wallet" | "paystack" | "wema_transfer";
  }>({
    isOpen: false,
    mode: "selected",
    title: "",
    subtitle: "",
    studentsList: [],
    studentCount: 0,
    feePerStudent: 500,
    totalFee: 0,
    walletBalance: 0,
    loadingOnline: false,
    initiatingPaystack: false,
    activeTab: "paystack",
  });

  const [modalCopied, setModalCopied] = useState(false);
  const [modalProcessingWallet, setModalProcessingWallet] = useState(false);
  const [verifyingWema, setVerifyingWema] = useState(false);

  const loadBillingData = async (showToast = false) => {
    setLoading(true);
    try {
      const [subscriptionRes, clearanceRes] = await Promise.all([
        authApi.get("/subscription/billing"),
        authApi.get("/school/clearance/summary"),
      ]);
      setPayments(subscriptionRes.data?.payments || []);
      setClearanceSummary(clearanceRes.data || null);
      if (showToast) showSuccess?.("Billing data refreshed.");
    } catch (err: any) {
      console.error(err);
      showError?.(err?.response?.data?.message || "Failed to load billing records.");
    } finally {
      setLoading(false);
    }
  };

  const loadRoster = async (targetPage = 1, currentClass = classFilter, currentStatus = statusFilter, currentSearch = searchFilter) => {
    setLoadingRoster(true);
    try {
      const res = await authApi.get("/school/clearance/students-list", {
        params: {
          session_id: clearanceSummary?.session_id,
          term_id: clearanceSummary?.term_id,
          class_id: currentClass || undefined,
          status: currentStatus,
          search: currentSearch || undefined,
          page: targetPage,
          per_page: 25,
        },
      });
      setRosterStudents(res.data?.students || []);
      setClassesList(res.data?.classes || []);
      setRosterTotal(res.data?.pagination?.total || 0);
      setRosterLastPage(res.data?.pagination?.last_page || 1);
      setRosterPage(res.data?.pagination?.current_page || 1);
    } catch (err: any) {
      console.warn("Failed to load clearance roster:", err);
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  // Listen for Paystack redirect callback reference to auto-verify clearance
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference") || params.get("trxref");

    if (ref) {
      const verifyPaystackReturn = async () => {
        try {
          const res = await authApi.get(`/school/clearance/verify-paystack/${ref}`);
          if (res.data?.success) {
            showSuccess?.(res.data?.message || "Payment verified successfully! Clearance updated.");
          } else {
            showError?.(res.data?.message || "Payment verification could not be completed.");
          }
        } catch (err: any) {
          console.warn("Verify paystack return error:", err);
        } finally {
          window.history.replaceState({}, document.title, window.location.pathname);
          await Promise.all([loadBillingData(false), loadRoster(1)]);
        }
      };

      verifyPaystackReturn();
    }
  }, []);

  useEffect(() => {
    loadRoster(1, classFilter, statusFilter, searchFilter);
  }, [clearanceSummary?.session_id, clearanceSummary?.term_id, classFilter, statusFilter]);

  // Search debounce
  const searchTimeoutRef = useRef<any>(null);
  const handleSearchChange = (val: string) => {
    setSearchFilter(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      loadRoster(1, classFilter, statusFilter, val);
    }, 450);
  };

  const feePerStudent = Number(clearanceSummary?.fee_per_student || 500);
  const termsCount = Number(clearanceSummary?.terms_count || 3);
  const costPerSelectedStudent = clearanceScope === "session" ? feePerStudent * termsCount : feePerStudent;
  const totalSelectivePayable = selectedStudentIds.length * costPerSelectedStudent;
  const currentWalletBalance = Number(clearanceSummary?.wallet_balance || 0);
  const hasSufficientWallet = currentWalletBalance >= totalSelectivePayable;

  const toggleStudent = (id: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const isAllPageSelected =
    rosterStudents.length > 0 &&
    rosterStudents.every((s) => selectedStudentIds.includes(s.id));

  const toggleSelectPage = () => {
    if (isAllPageSelected) {
      const pageIds = rosterStudents.map((s) => s.id);
      setSelectedStudentIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      const pageIds = rosterStudents.map((s) => s.id);
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const selectAllUnpaidOnPage = () => {
    const unpaidIds = rosterStudents
      .filter((s) => (clearanceScope === "session" ? !s.is_session_cleared : !s.is_term_cleared))
      .map((s) => s.id);
    setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...unpaidIds])));
  };

  // Fetch Wema Bank dedicated virtual account for current modal scope
  const fetchWemaVirtualAccount = async (modalData?: typeof clearanceModal) => {
    const data = modalData || clearanceModal;
    if (!data.sessionId) return;
    setClearanceModal((prev) => ({ ...prev, loadingOnline: true }));
    try {
      const studentIds = (data.mode === "selected" || data.mode === "single")
        ? data.studentsList.map((s) => s.id)
        : undefined;

      const res = await authApi.post("/school/clearance/initiate-online", {
        type: data.mode,
        session_id: data.sessionId,
        term_id: clearanceScope === "term" ? data.termId : null,
        student_ids: studentIds,
        is_full_session: clearanceScope === "session" || data.mode === "session",
      });

      if (res.data?.success) {
        setClearanceModal((prev) => ({
          ...prev,
          invoiceId: res.data.invoice?.id,
          invoiceNo: res.data.invoice?.invoice_no,
          virtualAccount: res.data.virtual_account,
          loadingOnline: false,
        }));
      } else {
        setClearanceModal((prev) => ({ ...prev, loadingOnline: false }));
      }
    } catch (err: any) {
      console.warn("Failed to generate Wema virtual account:", err);
      setClearanceModal((prev) => ({ ...prev, loadingOnline: false }));
    }
  };

  // Open Checkout Modal for Selected Students
  const openSelectedClearanceModal = () => {
    if (selectedStudentIds.length === 0) {
      showError?.("Please select at least one student to clear.");
      return;
    }

    const selectedList: ModalStudentItem[] = selectedStudentIds.map((id) => {
      const found = rosterStudents.find((s) => s.id === id);
      return {
        id,
        firstname: found?.firstname || "Student",
        surname: found?.surname || `#${id}`,
        reg_no: found?.reg_no || "—",
        class_name: found?.class_name || "Class",
        cost: costPerSelectedStudent,
      };
    });

    const defaultTab = currentWalletBalance >= totalSelectivePayable ? "wallet" : "paystack";

    const modalObj = {
      isOpen: true,
      mode: "selected" as const,
      title: `Clear ${selectedStudentIds.length} Selected Student${selectedStudentIds.length > 1 ? "s" : ""}`,
      subtitle: `Confirm student list and payment method for ${clearanceScope === "session" ? `Full Session (${termsCount} Terms)` : "Current Active Term"}.`,
      sessionId: clearanceSummary?.session_id,
      termId: clearanceScope === "term" ? clearanceSummary?.term_id : null,
      studentsList: selectedList,
      studentCount: selectedStudentIds.length,
      feePerStudent: costPerSelectedStudent,
      totalFee: totalSelectivePayable,
      walletBalance: currentWalletBalance,
      loadingOnline: false,
      initiatingPaystack: false,
      activeTab: defaultTab,
      virtualAccount: null,
      invoiceId: null,
      invoiceNo: null,
    };

    setClearanceModal(modalObj);
    fetchWemaVirtualAccount(modalObj);
  };

  // Open Checkout Modal for Single Student
  const openSingleClearanceModal = (student: ClearanceStudent) => {
    const cost = costPerSelectedStudent;
    const defaultTab = currentWalletBalance >= cost ? "wallet" : "paystack";

    const modalObj = {
      isOpen: true,
      mode: "single" as const,
      title: `Clear ${student.firstname} ${student.surname}`,
      subtitle: `Clear ${student.firstname} (${student.reg_no || "Student"} - ${student.class_name}) for ${clearanceScope === "session" ? `Full Session (${termsCount} Terms)` : "Current Active Term"}.`,
      sessionId: clearanceSummary?.session_id,
      termId: clearanceScope === "term" ? clearanceSummary?.term_id : null,
      studentsList: [
        {
          id: student.id,
          firstname: student.firstname,
          surname: student.surname,
          reg_no: student.reg_no || "—",
          class_name: student.class_name,
          cost: cost,
        },
      ],
      studentCount: 1,
      feePerStudent: cost,
      totalFee: cost,
      walletBalance: currentWalletBalance,
      loadingOnline: false,
      initiatingPaystack: false,
      activeTab: defaultTab,
      virtualAccount: null,
      invoiceId: null,
      invoiceNo: null,
    };

    setClearanceModal(modalObj);
    fetchWemaVirtualAccount(modalObj);
  };

  // Open Modal for Whole School Current Term
  const openTermClearanceModal = async () => {
    if (!clearanceSummary?.session_id || !clearanceSummary?.term_id) {
      showError?.("Current academic period is not active.");
      return;
    }
    const fee = Number(clearanceSummary.term_clearance_fee || 0);
    const count = Number(clearanceSummary.pending_count || 0);
    if (count === 0) {
      showSuccess?.("All active students are already cleared for the current term.");
      return;
    }

    const defaultTab = (clearanceSummary.wallet_balance || 0) >= fee ? "wallet" : "paystack";

    // Preview roster students that are unpaid
    const previewList: ModalStudentItem[] = rosterStudents
      .filter((s) => !s.is_term_cleared)
      .map((s) => ({
        id: s.id,
        firstname: s.firstname,
        surname: s.surname,
        reg_no: s.reg_no || "—",
        class_name: s.class_name,
        cost: feePerStudent,
      }));

    const modalObj = {
      isOpen: true,
      mode: "term" as const,
      title: "Clear Whole School — Current Term",
      subtitle: `Clear all ${count} unpaid student(s) for the current active term.`,
      sessionId: clearanceSummary.session_id,
      termId: clearanceSummary.term_id,
      studentsList: previewList,
      studentCount: count,
      feePerStudent: feePerStudent,
      totalFee: fee,
      walletBalance: Number(clearanceSummary.wallet_balance || 0),
      loadingOnline: false,
      initiatingPaystack: false,
      activeTab: defaultTab,
      virtualAccount: null,
      invoiceId: null,
      invoiceNo: null,
    };

    setClearanceModal(modalObj);
    fetchWemaVirtualAccount(modalObj);
  };

  // Open Modal for Full Academic Session
  const openSessionClearanceModal = async () => {
    if (!clearanceSummary?.session_id) {
      showError?.("Current academic session is not active.");
      return;
    }
    const totalFee = Number(clearanceSummary.session_clearance_fee || 0);
    const totalStudents = Number(clearanceSummary.total_students || 0);
    if (totalStudents === 0) {
      showError?.("No active students found in this school.");
      return;
    }

    const defaultTab = (clearanceSummary.wallet_balance || 0) >= totalFee ? "wallet" : "paystack";

    const previewList: ModalStudentItem[] = rosterStudents.map((s) => ({
      id: s.id,
      firstname: s.firstname,
      surname: s.surname,
      reg_no: s.reg_no || "—",
      class_name: s.class_name,
      cost: feePerStudent * termsCount,
    }));

    const modalObj = {
      isOpen: true,
      mode: "session" as const,
      title: `Clear Full Academic Session (${termsCount} Terms Upfront)`,
      subtitle: `Clear all ${totalStudents} active students across all ${termsCount} terms for the entire academic session.`,
      sessionId: clearanceSummary.session_id,
      termId: null,
      studentsList: previewList,
      studentCount: totalStudents,
      feePerStudent: feePerStudent * termsCount,
      totalFee: totalFee,
      walletBalance: Number(clearanceSummary.wallet_balance || 0),
      loadingOnline: false,
      initiatingPaystack: false,
      activeTab: defaultTab,
      virtualAccount: null,
      invoiceId: null,
      invoiceNo: null,
    };

    setClearanceModal(modalObj);
    fetchWemaVirtualAccount(modalObj);
  };

  // Initiate Paystack Checkout from Modal
  const handlePaystackCheckout = async () => {
    if (!clearanceModal.sessionId) {
      showError?.("Academic session not specified.");
      return;
    }

    setClearanceModal((prev) => ({ ...prev, initiatingPaystack: true }));

    try {
      const studentIds = (clearanceModal.mode === "selected" || clearanceModal.mode === "single")
        ? clearanceModal.studentsList.map((s) => s.id)
        : undefined;

      const res = await authApi.post("/school/clearance/initiate-paystack", {
        type: clearanceModal.mode,
        session_id: clearanceModal.sessionId,
        term_id: clearanceScope === "term" ? clearanceModal.termId : null,
        student_ids: studentIds,
        is_full_session: clearanceScope === "session" || clearanceModal.mode === "session",
        callback_url: window.location.origin + window.location.pathname,
      });

      if (res.data?.success && res.data?.authorization_url) {
        window.location.href = res.data.authorization_url;
      } else {
        showError?.(res.data?.message || "Could not initialize Paystack checkout.");
        setClearanceModal((prev) => ({ ...prev, initiatingPaystack: false }));
      }
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Paystack initialization failed.");
      setClearanceModal((prev) => ({ ...prev, initiatingPaystack: false }));
    }
  };

  // Verify Wema Direct Virtual Account Bank Transfer
  const handleVerifyWemaTransfer = async (silent = false) => {
    const ref = clearanceModal.virtualAccount?.reference;
    if (!ref) return;

    if (!silent) setVerifyingWema(true);
    try {
      const res = await authApi.get(`/school/clearance/verify-wema/${ref}`);
      if (res.data?.success) {
        showSuccess?.(res.data.message || `₦${fmtNaira(res.data.total_fee || clearanceModal.totalFee)} payment confirmed! Student clearance activated.`);
        setClearanceModal((prev) => ({ ...prev, isOpen: false }));
        setSelectedStudentIds([]);
        loadBillingData();
        loadRoster();
      } else if (!silent) {
        showError?.(res.data?.message || "Transfer is still in bank settlement transit. Please click again in a moment.");
      }
    } catch (err: any) {
      if (!silent) {
        showError?.(err?.response?.data?.message || "Could not verify transfer yet.");
      }
    } finally {
      if (!silent) setVerifyingWema(false);
    }
  };

  // Auto-poll Wema bank transfer status while on Wema tab
  useEffect(() => {
    if (!clearanceModal.isOpen || clearanceModal.activeTab !== "wema_transfer" || !clearanceModal.virtualAccount?.reference) {
      return;
    }

    const interval = setInterval(() => {
      handleVerifyWemaTransfer(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [clearanceModal.isOpen, clearanceModal.activeTab, clearanceModal.virtualAccount?.reference]);

  // Perform Wallet Debit Clearance from Modal
  const handleModalWalletClearance = async () => {
    if (!clearanceModal.sessionId) {
      showError?.("Academic session not specified.");
      return;
    }

    if (clearanceModal.walletBalance < clearanceModal.totalFee) {
      showError?.(`Insufficient wallet balance. Total fee is ${fmtNaira(clearanceModal.totalFee)}, but your balance is ${fmtNaira(clearanceModal.walletBalance)}.`);
      return;
    }

    setModalProcessingWallet(true);
    try {
      let res;
      if (clearanceModal.mode === "selected" || clearanceModal.mode === "single") {
        const ids = clearanceModal.studentsList.map((s) => s.id);
        res = await authApi.post("/school/clearance/clear-selected", {
          student_ids: ids,
          session_id: clearanceModal.sessionId,
          term_id: clearanceScope === "term" ? clearanceModal.termId : null,
          is_full_session: clearanceScope === "session",
        });
      } else if (clearanceModal.mode === "session") {
        res = await authApi.post("/school/clearance/clear-school-session", {
          session_id: clearanceModal.sessionId,
        });
      } else {
        res = await authApi.post("/school/clearance/clear-school-term", {
          session_id: clearanceModal.sessionId,
          term_id: clearanceModal.termId,
        });
      }

      showSuccess?.(res.data?.message || "Clearance completed successfully!");
      setSelectedStudentIds([]);
      setClearanceModal((prev) => ({ ...prev, isOpen: false }));
      await Promise.all([loadBillingData(false), loadRoster(rosterPage)]);
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Clearance from wallet failed.");
    } finally {
      setModalProcessingWallet(false);
    }
  };

  const copyModalAccount = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setModalCopied(true);
      showSuccess?.("Account number copied!");
      setTimeout(() => setModalCopied(false), 2500);
    } catch {
      showError?.("Could not copy automatically. Please copy manually.");
    }
  };

  // Poll for direct Wema Bank transfer confirmation
  useEffect(() => {
    if (!clearanceModal.isOpen || !clearanceModal.invoiceId) return;

    const poll = setInterval(async () => {
      try {
        const res = await authApi.get(`/school/billing/invoices/${clearanceModal.invoiceId}/payment`);
        if (Number(res.data?.invoice?.balance || 0) <= 0 || res.data?.invoice?.status === "paid") {
          showSuccess?.("Bank transfer payment confirmed! Student clearance updated.");
          setSelectedStudentIds([]);
          setClearanceModal((prev) => ({ ...prev, isOpen: false }));
          await Promise.all([loadBillingData(false), loadRoster(rosterPage)]);
          clearInterval(poll);
        }
      } catch {
        // silent
      }
    }, 12000);

    return () => clearInterval(poll);
  }, [clearanceModal.isOpen, clearanceModal.invoiceId, showSuccess, rosterPage]);

  // Payment history filter & pagination
  const filteredPayments = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return payments;
    return payments.filter((p) => {
      return (
        (p.reference || "").toLowerCase().includes(s) ||
        (p.plan?.name || "").toLowerCase().includes(s) ||
        (p.status || "").toLowerCase().includes(s) ||
        (p.channel || "").toLowerCase().includes(s)
      );
    });
  }, [payments, q]);

  useEffect(() => {
    setPage(1);
  }, [q, pageSize]);

  const totalItems = filteredPayments.length;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalItems / pageSize)), [totalItems, pageSize]);
  const safePage = useMemo(() => clamp(page, 1, totalPages), [page, totalPages]);

  const pagedPayments = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, safePage, pageSize]);

  const pageNumbers = useMemo(() => {
    const windowSize = 2;
    const start = Math.max(1, safePage - windowSize);
    const end = Math.min(totalPages, safePage + windowSize);
    const nums: number[] = [];
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }, [safePage, totalPages]);

  const quickTotals = useMemo(() => {
    const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const successCount = payments.filter((p) => (p.status || "").toLowerCase().includes("success")).length;
    const lastPayment = payments.length ? payments[0] : null;
    return {
      totalPaid,
      successCount,
      lastPaymentDate: fmtDate(lastPayment?.created_at || lastPayment?.starts_at),
    };
  }, [payments]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        .db-main {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: 24px 28px 40px;
        }

        .db-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 32px 36px;
          position: relative;
          overflow: hidden;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
        }
        .db-hero-glow {
          position: absolute;
          top: -60px;
          right: -60px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.15) 0%, transparent 65%);
          pointer-events: none;
        }
        .db-hero-glow2 {
          position: absolute;
          bottom: -40px;
          left: 25%;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.10) 0%, transparent 70%);
          pointer-events: none;
        }
        .db-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
          flex-wrap: wrap;
        }
        @media (min-width: 768px) { .db-hero-inner { flex-wrap: nowrap; } }

        .db-session-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #FBBF24;
          background: rgba(217, 119, 6, 0.20);
          border: 1px solid rgba(217, 119, 6, 0.35);
          border-radius: 100px;
          padding: 4px 12px;
          margin-bottom: 12px;
        }
        .db-session-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          animation: dbPulse 2s ease infinite;
        }
        @keyframes dbPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.5); }
        }

        .db-greeting {
          font-size: 26px;
          font-weight: 800;
          color: #fff;
          line-height: 1.1;
          margin-bottom: 8px;
        }
        .db-greeting em { font-style: normal; color: #FBBF24; }

        .db-hero-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.6;
          max-width: 580px;
          margin-bottom: 18px;
        }

        .db-hero-btns { display: flex; gap: 10px; flex-wrap: wrap; }

        .db-btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 700;
          color: #FFFFFF;
          background: #D97706;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .db-btn-gold:hover { background: #B45309; transform: translateY(-1px); color: #FFFFFF; }
        .db-btn-gold:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        .db-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 600;
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.10);
          border: 1px solid rgba(255, 255, 255, 0.20);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .db-btn-outline:hover { background: rgba(255, 255, 255, 0.18); color: #fff; }
        .db-btn-outline:disabled { opacity: 0.55; cursor: not-allowed; }

        .db-hero-stat-card {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(8px);
          border-radius: 14px;
          padding: 18px 20px;
          min-width: 270px;
          margin-left: auto;
          align-self: flex-end;
        }
        .db-hero-stat-row { display: flex; flex-direction: column; gap: 10px; }
        .db-hero-stat-item { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .db-hero-stat-label { font-size: 12px; font-weight: 400; color: #CBD5E1; }
        .db-hero-stat-val { font-size: 16px; font-weight: 800; color: #FBBF24; }
        .db-hero-stat-sep { height: 1px; background: rgba(255, 255, 255, 0.08); }

        /* KPI Stat Cards */
        .db-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (max-width: 1199px) { .db-stats-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 576px) { .db-stats-grid { grid-template-columns: 1fr; } }

        .db-stat-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(15, 39, 68, 0.03);
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .db-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(15, 39, 68, 0.06);
          border-color: #CBD5E1;
        }
        .db-stat-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          margin-bottom: 12px;
        }

        .db-panel {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(15, 39, 68, 0.03);
          margin-bottom: 24px;
        }

        .db-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          border-bottom: 1px solid #F1F5F9;
          gap: 12px;
          flex-wrap: wrap;
        }

        .db-panel-title {
          font-size: 16.5px;
          font-weight: 800;
          color: #0F2744;
          margin: 0 0 2px;
        }

        .db-panel-sub {
          font-size: 12.5px;
          color: #64748B;
          margin: 0;
        }

        .db-refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          font-size: 12.5px;
          font-weight: 600;
          color: #0F2744;
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .db-refresh-btn:hover { background: #E2E8F0; }
        .db-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .db-pill {
          display: inline-flex;
          align-items: center;
          font-size: 11.5px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          white-space: nowrap;
        }

        .db-muted { color: #64748B; }
        .db-strong { font-weight: 700; color: #0F2744; }

        .db-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .db-table th {
          padding: 12px 18px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #64748B;
          background: #F8FAFC;
          border-bottom: 1px solid #E2E8F0;
          text-align: left;
          white-space: nowrap;
        }
        .db-table td {
          padding: 14px 18px;
          font-size: 13px;
          color: #334155;
          border-bottom: 1px solid #E2E8F0;
          vertical-align: middle;
        }
        .db-table tbody tr:last-child td { border-bottom: none; }
        .db-table tbody tr:hover { background: #F8FAFC; }

        .db-search {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 8px 14px;
          min-width: 240px;
        }
        .db-search input { border: none; outline: none; width: 100%; font-size: 13px; color: #0F2744; }

        @media (max-width: 991.98px) { .db-main { padding: 18px 14px 40px; } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Billing & Student Clearance" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loading && <Loader message="Loading billing records..." />}

            {/* ===== HERO BANNER ===== */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Fee Clearance & Platform Billing
                  </div>

                  <h1 className="db-greeting">
                    Student Clearance <em>&amp;</em> Billing
                  </h1>

                  <p className="db-hero-sub">
                    Manage per-student fee clearances, fund your school wallet for instant batch payments, and review transaction history.
                  </p>

                  <div className="db-hero-btns">
                    <button className="db-btn-gold" onClick={() => navigate("/wallet")} disabled={loading}>
                      <i className="bi bi-wallet2" />
                      Top Up School Wallet
                    </button>

                    <button className="db-btn-outline" onClick={() => navigate("/students")} disabled={loading}>
                      <i className="bi bi-people" />
                      Student Roster
                    </button>

                    <button className="db-btn-outline" onClick={() => loadBillingData(true)} disabled={loading}>
                      <i className="bi bi-arrow-clockwise" />
                      Refresh Data
                    </button>
                  </div>
                </div>

                {/* Right Hero Stat Card */}
                <div className="db-hero-stat-card d-none d-lg-block">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#FBBF24" }}>
                      Clearance Overview
                    </span>
                    <i className="bi bi-shield-check" style={{ color: "#CBD5E1", fontSize: 14 }} />
                  </div>

                  <div className="db-hero-stat-row">
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Pricing Model</span>
                      <span className="db-hero-stat-val" style={{ fontSize: 12.5, color: "#FFFFFF" }}>
                        Free Core (Pay-As-You-Go)
                      </span>
                    </div>

                    <div className="db-hero-stat-sep" />

                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Fee / Student</span>
                      <span className="db-hero-stat-val">
                        {fmtNaira(feePerStudent)}
                      </span>
                    </div>

                    <div className="db-hero-stat-sep" />

                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Current Wallet</span>
                      <span className="db-hero-stat-val" style={{ color: "#10B981" }}>
                        {fmtNaira(currentWalletBalance)}
                      </span>
                    </div>

                    <div className="db-hero-stat-sep" />

                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Cleared / Total</span>
                      <span className="db-hero-stat-val">
                        {clearanceSummary?.cleared_count || 0} / {clearanceSummary?.total_students || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== 4 KPI METRIC CARDS ===== */}
            <div className="db-stats-grid">
              {/* CARD 1: Wallet Balance */}
              <div className="db-stat-card">
                <div>
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="db-muted" style={{ fontSize: 12.5, fontWeight: 600 }}>School Wallet Balance</span>
                    <div className="db-stat-icon-wrap" style={{ background: "rgba(217, 119, 6, 0.12)", color: "#D97706" }}>
                      <i className="bi bi-wallet2" />
                    </div>
                  </div>
                  <div className="db-strong" style={{ fontSize: 24, fontWeight: 800, color: "#D97706", marginTop: 4 }}>
                    {fmtNaira(currentWalletBalance)}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-top d-flex justify-content-between align-items-center">
                  <span style={{ fontSize: 11.5, color: "#64748B" }}>Available for instant debit</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-decoration-none p-0 fw-bold"
                    style={{ fontSize: 12, color: "#D97706" }}
                    onClick={() => navigate("/wallet")}
                  >
                    Top Up &rarr;
                  </button>
                </div>
              </div>

              {/* CARD 2: Total Active Students */}
              <div className="db-stat-card">
                <div>
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="db-muted" style={{ fontSize: 12.5, fontWeight: 600 }}>Total Active Students</span>
                    <div className="db-stat-icon-wrap" style={{ background: "rgba(37, 99, 235, 0.12)", color: "#2563EB" }}>
                      <i className="bi bi-people-fill" />
                    </div>
                  </div>
                  <div className="db-strong" style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>
                    {Number(clearanceSummary?.total_students || 0).toLocaleString()}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-top d-flex justify-content-between align-items-center">
                  <span style={{ fontSize: 11.5, color: "#64748B" }}>Enrolled across all classes</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-decoration-none p-0 fw-bold"
                    style={{ fontSize: 12, color: "#2563EB" }}
                    onClick={() => navigate("/students")}
                  >
                    View &rarr;
                  </button>
                </div>
              </div>

              {/* CARD 3: Cleared Students */}
              <div className="db-stat-card">
                <div>
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="db-muted" style={{ fontSize: 12.5, fontWeight: 600 }}>Cleared Students (Active Term)</span>
                    <div className="db-stat-icon-wrap" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10B981" }}>
                      <i className="bi bi-check-circle-fill" />
                    </div>
                  </div>
                  <div className="db-strong" style={{ fontSize: 24, fontWeight: 800, color: "#10B981", marginTop: 4 }}>
                    {Number(clearanceSummary?.cleared_count || 0).toLocaleString()}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-top d-flex justify-content-between align-items-center">
                  <span style={{ fontSize: 11.5, color: "#64748B" }}>
                    {clearanceSummary?.total_students ? Math.round(((clearanceSummary.cleared_count || 0) / clearanceSummary.total_students) * 100) : 0}% coverage this term
                  </span>
                  <span className="badge bg-success-subtle text-success fw-bold" style={{ fontSize: 11 }}>Active</span>
                </div>
              </div>

              {/* CARD 4: Pending Clearance */}
              <div className="db-stat-card">
                <div>
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="db-muted" style={{ fontSize: 12.5, fontWeight: 600 }}>Pending Clearance</span>
                    <div className="db-stat-icon-wrap" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#F59E0B" }}>
                      <i className="bi bi-hourglass-split" />
                    </div>
                  </div>
                  <div className="db-strong" style={{ fontSize: 24, fontWeight: 800, color: "#D97706", marginTop: 4 }}>
                    {Number(clearanceSummary?.pending_count || 0).toLocaleString()}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-top d-flex justify-content-between align-items-center">
                  <span style={{ fontSize: 11.5, color: "#64748B" }}>
                    Total payable: {fmtNaira(Number(clearanceSummary?.term_clearance_fee || 0))}
                  </span>
                  <a href="#clearance-roster-section" className="text-decoration-none fw-bold" style={{ fontSize: 12, color: "#D97706" }}>
                    Clear &darr;
                  </a>
                </div>
              </div>
            </div>

            {/* ===== WHOLE SCHOOL BULK CLEARANCE OPTIONS ===== */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-lg-6">
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: 16,
                    padding: 22,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 4px 12px rgba(15, 39, 68, 0.03)",
                  }}
                >
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: "rgba(37, 99, 235, 0.1)",
                            color: "#2563EB",
                            display: "grid",
                            placeItems: "center",
                            fontSize: 18,
                          }}
                        >
                          <i className="bi bi-calendar2-check-fill" />
                        </div>
                        <div className="db-strong" style={{ fontSize: 16 }}>Clear Whole School (Current Term)</div>
                      </div>
                      <span className="db-pill" style={{ background: "#EFF6FF", color: "#1D4ED8", fontWeight: 800 }}>
                        {fmtNaira(feePerStudent)} / student
                      </span>
                    </div>

                    <p className="db-muted" style={{ fontSize: 13, margin: "8px 0 14px", lineHeight: 1.5 }}>
                      Instantly clear all <strong>{clearanceSummary?.pending_count || 0} unpaid student(s)</strong> for the current active term using your <strong>School Wallet</strong> or <strong>Direct Bank Transfer</strong>.
                    </p>
                  </div>

                  <div className="pt-3 border-top d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <div>
                      <div className="db-muted" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700 }}>Total Term Clearance</div>
                      <div className="db-strong" style={{ fontSize: 18, color: "#2563EB" }}>
                        {fmtNaira(Number(clearanceSummary?.term_clearance_fee || 0))}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="db-btn-gold"
                      style={{ padding: "10px 20px", fontSize: 13 }}
                      onClick={openTermClearanceModal}
                      disabled={(clearanceSummary?.pending_count || 0) === 0}
                    >
                      <i className="bi bi-check2-all" />
                      Clear Whole School ({fmtNaira(Number(clearanceSummary?.term_clearance_fee || 0))})
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: 16,
                    padding: 22,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 4px 12px rgba(15, 39, 68, 0.03)",
                  }}
                >
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: "rgba(16, 185, 129, 0.1)",
                            color: "#10B981",
                            display: "grid",
                            placeItems: "center",
                            fontSize: 18,
                          }}
                        >
                          <i className="bi bi-award-fill" />
                        </div>
                        <div className="db-strong" style={{ fontSize: 16 }}>Clear Full Academic Session (3 Terms Upfront)</div>
                      </div>
                      <span className="db-pill" style={{ background: "#ECFDF5", color: "#047857", fontWeight: 800 }}>
                        {fmtNaira(feePerStudent * termsCount)} / full year
                      </span>
                    </div>

                    <p className="db-muted" style={{ fontSize: 13, margin: "8px 0 14px", lineHeight: 1.5 }}>
                      Clear all <strong>{clearanceSummary?.total_students || 0} active students</strong> across all {termsCount} terms for the entire academic session upfront. No interruptions all year.
                    </p>
                  </div>

                  <div className="pt-3 border-top d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <div>
                      <div className="db-muted" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700 }}>Total Full Session Fee</div>
                      <div className="db-strong" style={{ fontSize: 18, color: "#10B981" }}>
                        {fmtNaira(Number(clearanceSummary?.session_clearance_fee || 0))}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="db-btn-outline"
                      style={{ padding: "10px 20px", fontSize: 13, background: "#10B981", borderColor: "#10B981", color: "#FFFFFF" }}
                      onClick={openSessionClearanceModal}
                      disabled={(clearanceSummary?.total_students || 0) === 0}
                    >
                      <i className="bi bi-stars" />
                      Clear Full Session ({fmtNaira(Number(clearanceSummary?.session_clearance_fee || 0))})
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== SELECTIVE STUDENT CLEARANCE & ROSTER TABLE ===== */}
            <div className="db-panel" id="clearance-roster-section">
              <div className="db-panel-head">
                <div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <p className="db-panel-title">Selective Student Clearance &amp; Batch Settlement</p>
                    <span
                      style={{
                        background: "#FEF3C7",
                        color: "#92400E",
                        fontSize: 11,
                        fontWeight: 800,
                        padding: "3px 9px",
                        borderRadius: 999,
                        border: "1px solid #FDE68A",
                      }}
                    >
                      <i className="bi bi-wallet2 me-1" /> Pay From School Wallet
                    </span>
                  </div>
                  <p className="db-panel-sub">
                    Select students who have paid school fees to clear their platform charges individually or in bulk.
                  </p>
                </div>

                {/* Scope Switcher: Term vs Session */}
                <div
                  style={{
                    display: "flex",
                    background: "#F1F5F9",
                    borderRadius: 12,
                    padding: 4,
                    gap: 4,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    style={{
                      border: "none",
                      background: clearanceScope === "term" ? "#FFFFFF" : "transparent",
                      color: clearanceScope === "term" ? "#0F2744" : "#64748B",
                      fontWeight: 800,
                      fontSize: 12,
                      padding: "8px 14px",
                      borderRadius: 9,
                      boxShadow: clearanceScope === "term" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                    onClick={() => setClearanceScope("term")}
                  >
                    <i className="bi bi-calendar-event" />
                    Current Term ({fmtNaira(feePerStudent)}/student)
                  </button>
                  <button
                    type="button"
                    style={{
                      border: "none",
                      background: clearanceScope === "session" ? "#0F2744" : "transparent",
                      color: clearanceScope === "session" ? "#FBBF24" : "#64748B",
                      fontWeight: 800,
                      fontSize: 12,
                      padding: "8px 14px",
                      borderRadius: 9,
                      boxShadow: clearanceScope === "session" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                    onClick={() => setClearanceScope("session")}
                  >
                    <i className="bi bi-award-fill" />
                    Full Academic Session ({termsCount} Terms @ {fmtNaira(feePerStudent * termsCount)}/student)
                  </button>
                </div>
              </div>

              {/* Selection Bar */}
              <div
                style={{
                  padding: "14px 24px",
                  background: selectedStudentIds.length > 0 ? "linear-gradient(135deg, #0A192F 0%, #0F2744 100%)" : "#F8FAFC",
                  borderBottom: "1px solid #E2E8F0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                  color: selectedStudentIds.length > 0 ? "#FFFFFF" : "#0F2744",
                  transition: "all 0.3s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <span
                    style={{
                      background: selectedStudentIds.length > 0 ? "rgba(251, 191, 36, 0.2)" : "#E2E8F0",
                      color: selectedStudentIds.length > 0 ? "#FBBF24" : "#475569",
                      fontWeight: 800,
                      fontSize: 13,
                      padding: "5px 12px",
                      borderRadius: 999,
                      border: selectedStudentIds.length > 0 ? "1px solid rgba(251, 191, 36, 0.4)" : "none",
                    }}
                  >
                    {selectedStudentIds.length} Student{selectedStudentIds.length !== 1 ? "s" : ""} Selected
                  </span>

                  <div style={{ fontSize: 13 }}>
                    <span style={{ opacity: 0.75 }}>Scope: </span>
                    <strong style={{ color: selectedStudentIds.length > 0 ? "#CBD5E1" : "#334155" }}>
                      {clearanceScope === "session" ? `Full Session (${termsCount} terms)` : "Active Term"}
                    </strong>
                  </div>

                  <div style={{ fontSize: 13 }}>
                    <span style={{ opacity: 0.75 }}>Payable: </span>
                    <strong style={{ fontSize: 16, color: selectedStudentIds.length > 0 ? "#FBBF24" : "#0F2744" }}>
                      {fmtNaira(totalSelectivePayable)}
                    </strong>
                  </div>

                  <div style={{ fontSize: 13 }}>
                    <span style={{ opacity: 0.75 }}>School Wallet: </span>
                    <strong style={{ fontSize: 14, color: hasSufficientWallet ? "#22c55e" : "#ef4444" }}>
                      {fmtNaira(currentWalletBalance)}
                    </strong>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {selectedStudentIds.length > 0 ? (
                    <>
                      <button
                        type="button"
                        className="db-refresh-btn"
                        style={{ fontSize: 12, padding: "7px 12px" }}
                        onClick={() => setSelectedStudentIds([])}
                      >
                        Clear Selection
                      </button>

                      <button
                        type="button"
                        className="db-btn-gold"
                        style={{ padding: "9px 18px", fontSize: 13 }}
                        onClick={openSelectedClearanceModal}
                      >
                        <i className="bi bi-cart-check me-1" />
                        Review &amp; Clear Selected ({fmtNaira(totalSelectivePayable)})
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="db-refresh-btn"
                      style={{ fontSize: 12.5 }}
                      onClick={selectAllUnpaidOnPage}
                      disabled={loadingRoster || rosterStudents.length === 0}
                    >
                      <i className="bi bi-check2-square me-1" />
                      Select All Unpaid on Page
                    </button>
                  )}
                </div>
              </div>

              {/* Filters & Search Toolbar */}
              <div style={{ padding: "14px 24px", borderBottom: "1px solid #E2E8F0", background: "#FFFFFF" }}>
                <div className="row g-2 align-items-center">
                  <div className="col-12 col-md-4 col-lg-3">
                    <select
                      className="form-select"
                      style={{ fontSize: 13, borderRadius: 10, borderColor: "#E2E8F0" }}
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                    >
                      <option value="">All Classes</option>
                      {classesList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12 col-md-4 col-lg-3">
                    <select
                      className="form-select"
                      style={{ fontSize: 13, borderRadius: 10, borderColor: "#E2E8F0" }}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="unpaid">Unpaid / Pending Clearance Only</option>
                      <option value="all">All Students (Paid &amp; Unpaid)</option>
                      <option value="paid">Paid / Cleared Only</option>
                    </select>
                  </div>

                  <div className="col-12 col-md-4 col-lg-4">
                    <div className="db-search" style={{ minWidth: "100%", padding: "7px 12px" }}>
                      <i className="bi bi-search" style={{ color: "#94a3b8" }} />
                      <input
                        placeholder="Search student name or reg no…"
                        value={searchFilter}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") loadRoster(1, classFilter, statusFilter, searchFilter);
                        }}
                      />
                      {searchFilter && (
                        <button
                          type="button"
                          style={{ border: "none", background: "none", color: "#94a3b8", cursor: "pointer" }}
                          onClick={() => {
                            setSearchFilter("");
                            loadRoster(1, classFilter, statusFilter, "");
                          }}
                        >
                          <i className="bi bi-x-circle-fill" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="col-12 col-lg-2 text-end">
                    <button
                      type="button"
                      className="db-refresh-btn w-100 justify-content-center"
                      onClick={() => loadRoster(rosterPage, classFilter, statusFilter, searchFilter)}
                      disabled={loadingRoster}
                    >
                      <i className="bi bi-arrow-clockwise me-1" />
                      {loadingRoster ? "Filtering…" : "Refresh Roster"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Roster Table */}
              <div style={{ overflowX: "auto" }}>
                <table className="db-table">
                  <thead>
                    <tr>
                      <th style={{ width: 44, textAlign: "center" }}>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          style={{ cursor: "pointer", width: 16, height: 16 }}
                          checked={isAllPageSelected}
                          onChange={toggleSelectPage}
                          disabled={rosterStudents.length === 0}
                        />
                      </th>
                      <th>Student Info</th>
                      <th>Class</th>
                      <th>
                        {clearanceScope === "term" ? "Active Term Clearance" : "Session Status"}
                      </th>
                      <th>Academic Session Progress</th>
                      <th style={{ textAlign: "right" }}>Single Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loadingRoster ? (
                      <tr>
                        <td colSpan={6} style={{ padding: 40, textAlign: "center" }}>
                          <span className="spinner-border spinner-border-sm text-primary me-2" />
                          <span className="db-muted" style={{ fontSize: 13 }}>Loading students roster…</span>
                        </td>
                      </tr>
                    ) : rosterStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: 46, textAlign: "center", color: "#94a3b8" }}>
                          <i className="bi bi-people" style={{ fontSize: 32, display: "block", marginBottom: 8, color: "#cbd5e1" }} />
                          <div style={{ fontWeight: 800, color: "#1e293b", fontSize: 14 }}>No students found</div>
                          <div style={{ fontSize: 12.5, marginTop: 4 }}>
                            {statusFilter === "unpaid"
                              ? "All students in this filter are already cleared!"
                              : "Try adjusting your class filter or search keyword."}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rosterStudents.map((s) => {
                        const isSelected = selectedStudentIds.includes(s.id);
                        const isScopeCleared = clearanceScope === "session" ? s.is_session_cleared : s.is_term_cleared;

                        return (
                          <tr
                            key={s.id}
                            style={{
                              background: isSelected ? "rgba(217, 119, 6, 0.05)" : undefined,
                              transition: "background 0.15s ease",
                            }}
                          >
                            <td style={{ textAlign: "center" }}>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                style={{ cursor: "pointer", width: 16, height: 16 }}
                                checked={isSelected}
                                onChange={() => toggleStudent(s.id)}
                              />
                            </td>

                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: "50%",
                                    background: isScopeCleared ? "rgba(34,197,94,0.12)" : "rgba(217,119,6,0.12)",
                                    color: isScopeCleared ? "#15803D" : "#92400E",
                                    display: "grid",
                                    placeItems: "center",
                                    fontSize: 12.5,
                                    fontWeight: 800,
                                    flexShrink: 0,
                                  }}
                                >
                                  {s.surname ? s.surname.charAt(0).toUpperCase() : "S"}
                                </div>
                                <div>
                                  <div className="db-strong" style={{ fontSize: 13.5 }}>
                                    {s.surname} {s.firstname}
                                  </div>
                                  <div className="db-muted" style={{ fontSize: 11.5 }}>
                                    <code style={{ color: "#475569" }}>{s.reg_no || "No Reg No"}</code>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td>
                              <span
                                style={{
                                  background: "#F1F5F9",
                                  color: "#334155",
                                  padding: "4px 10px",
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
                                {s.class_name}
                              </span>
                            </td>

                            <td>
                              {s.is_term_cleared ? (
                                <span className="db-pill" style={{ background: "rgba(34,197,94,0.14)", color: "#15803D" }}>
                                  <i className="bi bi-check-circle-fill me-1" /> Term Cleared (Paid)
                                </span>
                              ) : (
                                <span className="db-pill" style={{ background: "rgba(245,158,11,0.16)", color: "#B45309" }}>
                                  <i className="bi bi-exclamation-circle-fill me-1" /> Pending Clearance
                                </span>
                              )}
                            </td>

                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: s.is_session_cleared ? "#15803D" : "#64748B" }}>
                                  {s.paid_terms_count} / {s.total_terms_count} Terms
                                </div>
                                {s.is_session_cleared && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 800,
                                      background: "rgba(34,197,94,0.14)",
                                      color: "#15803D",
                                      padding: "2px 6px",
                                      borderRadius: 4,
                                    }}
                                  >
                                    FULL YEAR
                                  </span>
                                )}
                              </div>
                              <div style={{ width: 100, height: 5, background: "#E2E8F0", borderRadius: 999, marginTop: 4, overflow: "hidden" }}>
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${s.total_terms_count > 0 ? (s.paid_terms_count / s.total_terms_count) * 100 : 0}%`,
                                    background: s.is_session_cleared ? "#16a34a" : "#d97706",
                                  }}
                                />
                              </div>
                            </td>

                            <td style={{ textAlign: "right" }}>
                              {isScopeCleared ? (
                                <span className="text-success fw-bold" style={{ fontSize: 12 }}>
                                  <i className="bi bi-check2-all me-1" /> Cleared
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-dark fw-bold"
                                  style={{
                                    fontSize: 11.5,
                                    borderRadius: 8,
                                    padding: "4px 10px",
                                    borderColor: "#CBD5E1",
                                  }}
                                  onClick={() => openSingleClearanceModal(s)}
                                  disabled={clearingSingleId === s.id}
                                >
                                  <i className="bi bi-wallet2 me-1" />
                                  Clear ({fmtNaira(costPerSelectedStudent)})
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Roster Pagination */}
              <div
                style={{
                  padding: "12px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  borderTop: "1px solid #E2E8F0",
                  background: "#F8FAFC",
                }}
              >
                <div className="db-muted" style={{ fontSize: 12.5 }}>
                  Total: <b>{rosterTotal}</b> students matching filter
                  {selectedStudentIds.length > 0 && (
                    <span className="ms-2 text-warning fw-bold">
                      • {selectedStudentIds.length} selected ({fmtNaira(totalSelectivePayable)})
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    className="db-refresh-btn"
                    style={{ padding: "6px 12px", fontSize: 12 }}
                    disabled={rosterPage <= 1 || loadingRoster}
                    onClick={() => {
                      const prev = Math.max(1, rosterPage - 1);
                      setRosterPage(prev);
                      loadRoster(prev, classFilter, statusFilter, searchFilter);
                    }}
                  >
                    <i className="bi bi-chevron-left me-1" /> Prev
                  </button>

                  <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
                    Page {rosterPage} of {rosterLastPage}
                  </span>

                  <button
                    type="button"
                    className="db-refresh-btn"
                    style={{ padding: "6px 12px", fontSize: 12 }}
                    disabled={rosterPage >= rosterLastPage || loadingRoster}
                    onClick={() => {
                      const next = Math.min(rosterLastPage, rosterPage + 1);
                      setRosterPage(next);
                      loadRoster(next, classFilter, statusFilter, searchFilter);
                    }}
                  >
                    Next <i className="bi bi-chevron-right ms-1" />
                  </button>
                </div>
              </div>
            </div>

            {/* ===== PAYMENT & SETTLEMENT HISTORY (COLLAPSIBLE) ===== */}
            <div className="db-panel" style={{ transition: "all 0.2s ease" }}>
              <div
                className="db-panel-head"
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => setHistoryOpen((prev) => !prev)}
              >
                <div className="d-flex align-items-center gap-2">
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "rgba(15, 39, 68, 0.06)",
                      color: "#0F2744",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 16,
                    }}
                  >
                    <i className="bi bi-receipt-cutoff" />
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <p className="db-panel-title mb-0">Payment &amp; Clearance History</p>
                      <span className="badge" style={{ background: "#F1F5F9", color: "#475569", fontSize: 11, fontWeight: 700 }}>
                        {payments.length} record{payments.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="db-panel-sub mb-0">Review past school fee clearance settlements, receipts, and Paystack transactions.</p>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="db-refresh-btn"
                    style={{
                      background: historyOpen ? "#F1F5F9" : "#FFFFFF",
                      borderColor: "#CBD5E1",
                      fontWeight: 700,
                      fontSize: 12.5,
                      padding: "7px 14px",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setHistoryOpen((prev) => !prev);
                    }}
                  >
                    {historyOpen ? (
                      <>
                        <i className="bi bi-chevron-up me-1" /> Collapse History
                      </>
                    ) : (
                      <>
                        <i className="bi bi-chevron-down me-1" /> View History ({payments.length})
                      </>
                    )}
                  </button>
                </div>
              </div>

              {historyOpen && (
                <>
                  <div style={{ padding: "14px 20px", background: "#F8FAFC", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div className="db-search" style={{ maxWidth: 360 }}>
                      <i className="bi bi-search" style={{ color: "#94a3b8" }} />
                      <input
                        placeholder="Search by reference, status, channel…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                      />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <select
                        className="form-select"
                        style={{ width: 130, borderRadius: 10, borderColor: "#E2E8F0", fontSize: 12.5 }}
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                      >
                        {[5, 10, 20, 50].map((n) => (
                          <option key={n} value={n}>
                            {n} / page
                          </option>
                        ))}
                      </select>

                      <button className="db-refresh-btn" onClick={() => loadBillingData(true)} disabled={loading}>
                        <i className="bi bi-arrow-clockwise" />
                        Refresh
                      </button>
                    </div>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table className="db-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Description / Plan</th>
                          <th>Amount</th>
                          <th>Channel</th>
                          <th>Reference</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {pagedPayments.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
                              <div style={{ fontWeight: 800, color: "#1e293b" }}>No payment records found</div>
                              <div style={{ fontSize: 12.5, marginTop: 4 }}>Completed settlements will appear here.</div>
                            </td>
                          </tr>
                        ) : (
                          pagedPayments.map((p) => {
                            const t = badgeTone(p.status);
                            return (
                              <tr key={p.id}>
                                <td className="db-muted">{fmtDate(p.created_at || p.starts_at)}</td>
                                <td>
                                  <div className="db-strong">{p.plan?.name || "Fee Clearance"}</div>
                                  {p.card_type && (
                                    <div className="db-muted" style={{ fontSize: 11.5 }}>
                                      {p.card_type} •••• {p.last4 || "" }
                                    </div>
                                  )}
                                </td>
                                <td className="db-strong">{fmtNaira(Number(p.amount || 0))}</td>
                                <td style={{ textTransform: "capitalize" }}>{p.channel || "Online Transfer"}</td>
                                <td>
                                  <code style={{ fontSize: 12, color: "#0F2744" }}>{p.reference}</code>
                                </td>
                                <td>
                                  <span className="db-pill" style={{ background: t.bg, color: t.fg }}>
                                    {t.text}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* History Pagination */}
                  <div style={{ padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", borderTop: "1px solid #E2E8F0" }}>
                    <div className="db-muted" style={{ fontSize: 12.5 }}>
                      Showing <b>{totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1}</b>–<b>{Math.min(safePage * pageSize, totalItems)}</b> of <b>{totalItems}</b>
                      <span className="ms-2">•</span>
                      <span className="ms-2">Total Paid: <b>{fmtNaira(quickTotals.totalPaid)}</b></span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <button
                        className="db-refresh-btn"
                        disabled={safePage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        <i className="bi bi-chevron-left" /> Prev
                      </button>

                      {pageNumbers.map((n) => (
                        <button
                          key={n}
                          className="db-refresh-btn"
                          onClick={() => setPage(n)}
                          style={{
                            background: n === safePage ? "#D97706" : undefined,
                            color: n === safePage ? "#FFFFFF" : undefined,
                            borderColor: n === safePage ? "#D97706" : undefined,
                            fontWeight: n === safePage ? 800 : 500,
                            minWidth: 36,
                            justifyContent: "center",
                          }}
                        >
                          {n}
                        </button>
                      ))}

                      <button
                        className="db-refresh-btn"
                        disabled={safePage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        Next <i className="bi bi-chevron-right" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-auto">
              <Footer />
            </div>
          </main>
        </div>
      </div>

      {/* ===== CLEARANCE CONFIRMATION & CHECKOUT MODAL ===== */}
      {clearanceModal.isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(10, 25, 47, 0.8)",
            backdropFilter: "blur(6px)",
          }}
          onClick={() => setClearanceModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 20,
              maxWidth: 620,
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "22px 26px",
                background: "linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%)",
                color: "#FFFFFF",
                borderRadius: "20px 20px 0 0",
                position: "relative",
              }}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <span
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontWeight: 800,
                      color: "#FBBF24",
                    }}
                  >
                    Clearance Checkout &amp; Review
                  </span>
                  <h3 style={{ fontSize: 20, fontWeight: 900, margin: "4px 0 0", color: "#FFFFFF" }}>
                    {clearanceModal.title}
                  </h3>
                  <p style={{ fontSize: 13, color: "#CBD5E1", margin: "4px 0 0", lineHeight: 1.4 }}>
                    {clearanceModal.subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "none",
                    color: "#FFFFFF",
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                    fontSize: 15,
                  }}
                  onClick={() => setClearanceModal((prev) => ({ ...prev, isOpen: false }))}
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              {/* Scope Summary Box */}
              <div
                style={{
                  marginTop: 16,
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 12,
                  padding: "10px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                    Student Count &amp; Rate
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 800 }}>
                    {clearanceModal.studentCount.toLocaleString()} student{clearanceModal.studentCount !== 1 ? "s" : ""} × {fmtNaira(clearanceModal.feePerStudent)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                    Total Amount Due
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#FBBF24" }}>
                    {fmtNaira(clearanceModal.totalFee)}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 26px" }}>
              {/* STUDENT LIST BREAKDOWN / PREVIEW (Explicit Specification) */}
              <div style={{ marginBottom: 18 }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="db-strong" style={{ fontSize: 13.5 }}>
                    <i className="bi bi-person-lines-fill me-1 text-primary" />
                    Students Being Cleared ({clearanceModal.studentCount})
                  </span>
                  <span className="db-muted" style={{ fontSize: 11.5 }}>
                    {clearanceScope === "session" ? `${termsCount} Terms / Student` : "Current Active Term"}
                  </span>
                </div>

                <div
                  style={{
                    maxHeight: 160,
                    overflowY: "auto",
                    border: "1px solid #E2E8F0",
                    borderRadius: 12,
                    background: "#F8FAFC",
                    padding: "6px 10px",
                  }}
                >
                  {clearanceModal.studentsList.length === 0 ? (
                    <div className="text-center py-3 text-muted small">
                      All {clearanceModal.studentCount} active students in the school will receive clearance.
                    </div>
                  ) : (
                    clearanceModal.studentsList.map((st, idx) => (
                      <div
                        key={st.id || idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "6px 8px",
                          borderBottom: idx < clearanceModal.studentsList.length - 1 ? "1px solid #E2E8F0" : "none",
                          fontSize: 12.5,
                        }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <span style={{ width: 18, color: "#94A3B8", fontSize: 11, fontWeight: 700 }}>{idx + 1}.</span>
                          <div>
                            <strong style={{ color: "#0F2744" }}>{st.surname} {st.firstname}</strong>
                            <span className="db-muted ms-2">({st.reg_no || "Student"})</span>
                          </div>
                        </div>

                        <div className="d-flex align-items-center gap-3">
                          <span className="badge bg-secondary-subtle text-secondary-emphasis" style={{ fontSize: 11 }}>
                            {st.class_name}
                          </span>
                          <strong style={{ color: "#D97706", fontSize: 12.5 }}>
                            {fmtNaira(st.cost || clearanceModal.feePerStudent)}
                          </strong>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Payment Tab Selector */}
              <div
                style={{
                  display: "flex",
                  background: "#F1F5F9",
                  borderRadius: 14,
                  padding: 4,
                  gap: 4,
                  marginBottom: 18,
                }}
              >
                <button
                  type="button"
                  style={{
                    flex: 1,
                    border: "none",
                    background: clearanceModal.activeTab === "wallet" ? "#FFFFFF" : "transparent",
                    color: clearanceModal.activeTab === "wallet" ? "#0F2744" : "#64748B",
                    fontWeight: 800,
                    fontSize: 12.5,
                    padding: "10px 8px",
                    borderRadius: 10,
                    boxShadow: clearanceModal.activeTab === "wallet" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "all .15s",
                  }}
                  onClick={() => setClearanceModal((prev) => ({ ...prev, activeTab: "wallet" }))}
                >
                  <i className="bi bi-wallet2 text-warning" />
                  School Wallet
                </button>

                <button
                  type="button"
                  style={{
                    flex: 1.2,
                    border: "none",
                    background: clearanceModal.activeTab === "paystack" ? "#FFFFFF" : "transparent",
                    color: clearanceModal.activeTab === "paystack" ? "#0F2744" : "#64748B",
                    fontWeight: 800,
                    fontSize: 12.5,
                    padding: "10px 8px",
                    borderRadius: 10,
                    boxShadow: clearanceModal.activeTab === "paystack" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "all .15s",
                  }}
                  onClick={() => setClearanceModal((prev) => ({ ...prev, activeTab: "paystack" }))}
                >
                  <i className="bi bi-credit-card-2-front text-success" />
                  Pay with Paystack
                </button>

                <button
                  type="button"
                  style={{
                    flex: 1,
                    border: "none",
                    background: clearanceModal.activeTab === "wema_transfer" ? "#FFFFFF" : "transparent",
                    color: clearanceModal.activeTab === "wema_transfer" ? "#0F2744" : "#64748B",
                    fontWeight: 800,
                    fontSize: 12.5,
                    padding: "10px 8px",
                    borderRadius: 10,
                    boxShadow: clearanceModal.activeTab === "wema_transfer" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "all .15s",
                  }}
                  onClick={() => {
                    setClearanceModal((prev) => ({ ...prev, activeTab: "wema_transfer" }));
                    if (!clearanceModal.virtualAccount && !clearanceModal.loadingOnline) {
                      fetchWemaVirtualAccount();
                    }
                  }}
                >
                  <i className="bi bi-bank text-primary" />
                  Direct Wema
                </button>
              </div>

              {/* TAB 1: SCHOOL WALLET */}
              {clearanceModal.activeTab === "wallet" && (
                <div style={{ background: "#FFFDF8", border: "1.5px solid #FDE68A", borderRadius: 16, padding: 18 }}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span
                      style={{
                        background: clearanceModal.walletBalance >= clearanceModal.totalFee ? "#15803D" : "#B45309",
                        color: "#FFFFFF",
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      <i className={`bi ${clearanceModal.walletBalance >= clearanceModal.totalFee ? "bi-check-circle-fill" : "bi-exclamation-triangle-fill"} me-1`} />
                      {clearanceModal.walletBalance >= clearanceModal.totalFee ? "SUFFICIENT WALLET BALANCE" : "INSUFFICIENT WALLET BALANCE"}
                    </span>
                    <span style={{ fontSize: 11.5, color: "#64748B", fontWeight: 700 }}>Instant 1-Click Clearance</span>
                  </div>

                  <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span style={{ fontSize: 13, color: "#64748B" }}>School Wallet Balance</span>
                      <strong style={{ fontSize: 18, color: clearanceModal.walletBalance >= clearanceModal.totalFee ? "#15803D" : "#B45309" }}>
                        {fmtNaira(clearanceModal.walletBalance)}
                      </strong>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span style={{ fontSize: 13, color: "#64748B" }}>Total Clearance Required</span>
                      <strong style={{ fontSize: 16, color: "#0F2744" }}>{fmtNaira(clearanceModal.totalFee)}</strong>
                    </div>
                    {clearanceModal.walletBalance < clearanceModal.totalFee && (
                      <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                        <span className="text-danger" style={{ fontSize: 12, fontWeight: 700 }}>Required Top-Up</span>
                        <strong className="text-danger" style={{ fontSize: 14 }}>
                          {fmtNaira(clearanceModal.totalFee - clearanceModal.walletBalance)}
                        </strong>
                      </div>
                    )}
                  </div>

                  {clearanceModal.walletBalance >= clearanceModal.totalFee ? (
                    <button
                      type="button"
                      className="db-btn-gold"
                      style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 13.5 }}
                      onClick={handleModalWalletClearance}
                      disabled={modalProcessingWallet}
                    >
                      {modalProcessingWallet ? (
                        <><span className="spinner-border spinner-border-sm me-2" /> Debiting Wallet &amp; Applying Clearance…</>
                      ) : (
                        <><i className="bi bi-wallet2 me-1" /> Debit Wallet &amp; Clear {clearanceModal.studentCount} Student{clearanceModal.studentCount !== 1 ? "s" : ""} ({fmtNaira(clearanceModal.totalFee)})</>
                      )}
                    </button>
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      <button
                        type="button"
                        className="btn btn-success w-100 fw-bold py-2"
                        style={{ borderRadius: 12, fontSize: 13 }}
                        onClick={() => setClearanceModal((prev) => ({ ...prev, activeTab: "paystack" }))}
                      >
                        <i className="bi bi-credit-card me-1" /> Pay via Paystack (Cards / Bank Transfer / USSD)
                      </button>
                      <button
                        type="button"
                        className="btn btn-warning w-100 fw-bold py-2"
                        style={{ borderRadius: 12, fontSize: 13 }}
                        onClick={() => navigate("/wallet")}
                      >
                        <i className="bi bi-plus-circle me-1" /> Top Up School Wallet ({fmtNaira(clearanceModal.totalFee - clearanceModal.walletBalance)} deficit)
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PAYSTACK CHECKOUT */}
              {clearanceModal.activeTab === "paystack" && (
                <div
                  style={{
                    background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)",
                    border: "1.5px solid #86EFAC",
                    borderRadius: 16,
                    padding: 18,
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span
                      style={{
                        background: "#15803D",
                        color: "#FFFFFF",
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 10.5,
                        fontWeight: 800,
                      }}
                    >
                      <i className="bi bi-shield-check me-1" /> OFFICIAL PAYSTACK CHECKOUT
                    </span>
                    <span style={{ fontSize: 11.5, color: "#166534", fontWeight: 700 }}>Cards • Bank Transfer • USSD</span>
                  </div>

                  <p style={{ fontSize: 12.5, color: "#14532D", margin: "8px 0 12px", lineHeight: 1.4 }}>
                    Pay securely using Paystack. You can pay with your ATM Card (Mastercard/Visa/Verve), a dedicated dynamic virtual bank transfer account with instant name lookup, or your mobile bank USSD code.
                  </p>

                  <div style={{ background: "#FFFFFF", border: "1px solid #BBF7D0", borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span style={{ fontSize: 13, color: "#4B5563" }}>Students to Clear</span>
                      <strong style={{ fontSize: 13.5, color: "#111827" }}>
                        {clearanceModal.studentCount.toLocaleString()} student{clearanceModal.studentCount !== 1 ? "s" : ""}
                      </strong>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span style={{ fontSize: 13, color: "#4B5563" }}>Rate per Student</span>
                      <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>
                        {fmtNaira(clearanceModal.feePerStudent)}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Total Payable</span>
                      <strong style={{ fontSize: 19, color: "#15803D" }}>{fmtNaira(clearanceModal.totalFee)}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-success w-100 fw-bold py-3"
                    style={{
                      borderRadius: 12,
                      fontSize: 14,
                      background: "#16A34A",
                      borderColor: "#16A34A",
                      boxShadow: "0 4px 12px rgba(22, 163, 74, 0.25)",
                    }}
                    onClick={handlePaystackCheckout}
                    disabled={clearanceModal.initiatingPaystack}
                  >
                    {clearanceModal.initiatingPaystack ? (
                      <><span className="spinner-border spinner-border-sm me-2" /> Connecting to Paystack…</>
                    ) : (
                      <><i className="bi bi-credit-card me-2" /> Proceed to Paystack Checkout ({fmtNaira(clearanceModal.totalFee)})</>
                    )}
                  </button>

                  <div className="text-center mt-2" style={{ fontSize: 11, color: "#166534" }}>
                    <i className="bi bi-lock-fill me-1" /> 256-bit SSL encrypted • Instant automated clearance
                  </div>
                </div>
              )}

              {/* TAB 3: DIRECT WEMA TRANSFER */}
              {clearanceModal.activeTab === "wema_transfer" && (
                <div
                  style={{
                    background: "linear-gradient(135deg, #FFFDF8 0%, #FEF3C7 100%)",
                    border: "1.5px solid #FDE68A",
                    borderRadius: 16,
                    padding: 18,
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <span
                      style={{
                        background: "#92400E",
                        color: "#FFFFFF",
                        padding: "4px 9px",
                        borderRadius: 999,
                        fontSize: 10.5,
                        fontWeight: 800,
                      }}
                    >
                      <i className="bi bi-lightning-charge-fill me-1" /> WEMA BANK DIRECT
                    </span>
                    <span style={{ fontSize: 11.5, color: "#78350F", fontWeight: 700 }}>NIP Transfer</span>
                  </div>

                  <p style={{ fontSize: 13, color: "#78350F", margin: "10px 0 0", lineHeight: 1.4 }}>
                    Transfer exactly <strong>{fmtNaira(clearanceModal.totalFee)}</strong> to the dedicated Wema Bank account:
                  </p>

                  {clearanceModal.loadingOnline ? (
                    <div className="text-center py-4">
                      <span className="spinner-border text-warning" />
                      <div className="db-muted mt-2" style={{ fontSize: 12 }}>Generating dedicated virtual account…</div>
                    </div>
                  ) : clearanceModal.virtualAccount?.account_number ? (
                    <>
                      <div
                        style={{
                          fontFamily: "monospace",
                          fontSize: 25,
                          fontWeight: 900,
                          letterSpacing: 2,
                          color: "#0F2744",
                          background: "#FFFFFF",
                          border: "1.5px dashed #D97706",
                          padding: "10px 14px",
                          borderRadius: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          margin: "12px 0",
                        }}
                      >
                        <span>{clearanceModal.virtualAccount.account_number}</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-dark"
                          style={{ borderRadius: 8, fontSize: 12, fontWeight: 700 }}
                          onClick={() => copyModalAccount(clearanceModal.virtualAccount?.account_number || "")}
                        >
                          <i className={`bi ${modalCopied ? "bi-check2" : "bi-clipboard"}`} /> {modalCopied ? "Copied" : "Copy"}
                        </button>
                      </div>

                      <div style={{ fontSize: 12.5, display: "flex" , flexDirection: "column", gap: 6 }}>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Bank Name:</span>
                          <strong style={{ color: "#0F2744" }}>{clearanceModal.virtualAccount.bank_name || "Wema Bank"}</strong>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Account Name:</span>
                          <strong style={{ color: "#0F2744", textAlign: "right" }}>{clearanceModal.virtualAccount.account_name || "Samaritan Technologies"}</strong>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Payable Amount:</span>
                          <strong style={{ color: "#B45309" }}>{fmtNaira(clearanceModal.totalFee)}</strong>
                        </div>
                      </div>

                      <div
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid #E2E8F0",
                          borderRadius: 10,
                          padding: "8px 12px",
                          marginTop: 12,
                          fontSize: 11.5,
                          color: "#475569",
                          textAlign: "center",
                        }}
                      >
                        <i className="bi bi-arrow-repeat spin me-1 text-warning" />
                        Listening for incoming bank transfer. Clearance activates automatically upon settlement.
                      </div>

                      <div className="mt-3">
                        <button
                          type="button"
                          className="btn btn-warning fw-bold w-100 py-2 text-dark shadow-sm d-flex align-items-center justify-content-center gap-2"
                          style={{ borderRadius: 10, fontSize: 13 }}
                          onClick={() => handleVerifyWemaTransfer(false)}
                          disabled={verifyingWema}
                        >
                          {verifyingWema ? (
                            <>
                              <span className="spinner-border spinner-border-sm" />
                              Verifying Bank Settlement…
                            </>
                          ) : (
                            <>
                              <i className="bi bi-shield-check" /> I Have Transferred — Verify Now
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-muted small mb-3">
                        <i className="bi bi-info-circle-fill me-1 text-primary" />
                        Direct Wema virtual account is being routed. You can pay instantly using Paystack (cards, dynamic bank transfer, USSD).
                      </div>
                      <div className="d-flex gap-2 justify-content-center">
                        <button
                          type="button"
                          className="btn btn-success fw-bold"
                          style={{ borderRadius: 9, fontSize: 12.5 }}
                          onClick={() => setClearanceModal((prev) => ({ ...prev, activeTab: "paystack" }))}
                        >
                          <i className="bi bi-credit-card me-1" /> Use Paystack (Recommended)
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-dark fw-bold"
                          style={{ borderRadius: 9, fontSize: 12.5 }}
                          onClick={() => fetchWemaVirtualAccount()}
                        >
                          <i className="bi bi-arrow-clockwise me-1" /> Retry Wema Account
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "12px 26px 20px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="db-refresh-btn"
                style={{ fontSize: 12.5 }}
                onClick={() => setClearanceModal((prev) => ({ ...prev, isOpen: false }))}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
