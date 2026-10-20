// src/pages/Admin/Fees/StudentFeePaymentPage.tsx
import { useEffect, useMemo, useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

/* =========================
   TYPES
========================= */
type StudentInfo = {
  id: number;
  name: string;
  reg_no: string;
  section: string;
  class: string;
};

type FeeTypeRel = {
  id: number;
  name: string;
  amount: number;
  is_discountable?: boolean;
};

type TermRel = { id: number; name: string };
type SessionRel = { id: number; name: string };
type ApproverRel = { id: number; firstname: string; surname: string };

type StudentFee = {
  id: number;
  student_id: number;
  school_id: number;
  section_id: number;
  fee_type_id: number;
  term_id: number;
  session_id: number;
  gross_amount?: number;
  discount_amount?: number;
  discount_type?: "percentage" | "fixed";
  discount_rate?: number;
  discount_reason?: string;
  discount_status?: "none" | "pending" | "approved" | "rejected";
  discount_notes?: string;
  net_amount?: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  is_discountable?: boolean;

  fee_name?: string;
  feeType?: FeeTypeRel | null;
  fee_type?: FeeTypeRel | null;
  term?: TermRel | null;
  session?: SessionRel | null;
  discountApprover?: ApproverRel | null;
};

type PastArrearsItem = {
  id: number;
  fee_name: string;
  session_name: string;
  term_name: string;
  balance: number;
};

type FinancialSummary = {
  gross_total: number;
  discount_total: number;
  net_total: number;
  total_paid: number;
  current_balance: number;
  past_arrears_balance: number;
  total_due_including_arrears: number;
  has_past_arrears: boolean;
};

type FullPaymentDiscount = {
  enabled: boolean;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  discount_amount: number;
  original_balance: number;
  discounted_payable_amount: number;
  formatted_discount: string;
  message: string;
};

type InstallmentPreset = {
  label: string;
  percent: number;
  amount: number;
  original_amount?: number;
  discount_amount?: number;
  discount_applied?: boolean;
};

type InstallmentPlan = {
  enabled: boolean;
  installment_type: string;
  min_initial_percent: number;
  min_initial_amount: number;
  min_payable_now: number;
  presets: InstallmentPreset[];
  full_payment_discount?: FullPaymentDiscount | null;
  message: string;
};

export type ReceiptItemBreakdown = {
  student_fee_id?: number;
  fee_name: string;
  gross_amount: number;
  discount_amount: number;
  net_amount: number;
  amount_paid: number;
  balance: number;
};

type ReceiptData = {
  receipt_number: string;
  qr_code_token: string;
  qr_verify_url: string;
  payment_id: number;
  payment_method: string;
  amount_paid: number;
  gross_amount: number;
  discount_amount: number;
  net_amount: number;
  balance: number;
  status: string;
  reference?: string;
  payer_name?: string;
  payer_phone?: string;
  date: string;
  bursar_name: string;
  student_name: string;
  admission_no: string;
  section_name: string;
  fee_name: string;
  session_name: string;
  term_name: string;
  school_name: string;
  school_logo?: string | null;
  school_address?: string;
  school_phone?: string;
  items?: ReceiptItemBreakdown[];
};

const getFeeName = (f: StudentFee | null | undefined): string => {
  if (!f) return "School Fee";
  return f.fee_name || f.feeType?.name || f.fee_type?.name || `Fee #${f.fee_type_id}`;
};

type StudentFeeDetailsResponse = {
  student: StudentInfo;
  fees: StudentFee[];
  financial_summary?: FinancialSummary;
  past_arrears?: PastArrearsItem[];
  installment_plan?: InstallmentPlan;
  full_payment_discount?: FullPaymentDiscount | null;
};

type PayFeeResponse = {
  message: string;
  payment: any;
  receipt?: ReceiptData;
  balance: number;
  amount_paid: number;
  status: "paid" | "partial" | "unpaid" | string;
};

/* =========================
   HELPERS
========================= */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getErrorMessage(err: any): string {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (status === 422) return data?.message ?? "Validation error.";
  if (status === 404) return data?.message ?? "Not found.";
  if (status === 403) return data?.message ?? "Forbidden.";
  if (status === 400) return data?.message ?? "Bad request.";
  return data?.message ?? err?.message ?? "Something went wrong.";
}

function naira(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return v.toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  });
}

function paymentStatus(f: StudentFee) {
  const bal = Number(f.balance ?? 0);
  const net = Number(f.net_amount ?? f.total_amount ?? 0);
  if (bal <= 0) return { label: "Paid in Full", tone: "paid" as const };
  if (bal < net && Number(f.amount_paid ?? 0) > 0) return { label: "Partial Payment", tone: "partial" as const };
  return { label: "Unpaid", tone: "unpaid" as const };
}

/* =========================
   COMPONENT
========================= */
export default function StudentFeePaymentPage() {
  const { showSuccess, showError, showWarning } = useToast();
  const receiptPrintRef = useRef<HTMLDivElement | null>(null);

  // layout
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // loading
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // query inputs
  const [regNo, setRegNo] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const [termId, setTermId] = useState<string>("");

  // sessions / terms dropdown
  const [sessions, setSessions] = useState<{ id: number; name: string }[]>([]);
  const [terms, setTerms] = useState<{ id: number; name: string }[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // fetched student data
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [pastArrears, setPastArrears] = useState<PastArrearsItem[]>([]);
  const [showArrearsDetails, setShowArrearsDetails] = useState(false);
  const [installmentPlan, setInstallmentPlan] = useState<InstallmentPlan | null>(null);
  const [fullDiscount, setFullDiscount] = useState<FullPaymentDiscount | null>(null);

  // UI state
  const [filter, setFilter] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const isBusy = (k: string) => busyKey === k;

  // Pay Modal State
  const [showPay, setShowPay] = useState(false);
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);
  const [payFeeId, setPayFeeId] = useState<number | null>(null);
  const [payMethod, setPayMethod] = useState<string>("Bank Transfer");
  const [payAmount, setPayAmount] = useState<string>("");
  const [payerName, setPayerName] = useState<string>("");
  const [payerPhone, setPayerPhone] = useState<string>("");
  const [payReference, setPayReference] = useState<string>("");
  const [applyFullDiscount, setApplyFullDiscount] = useState(false);

  // Concession / Discount Modal State
  const [showConcessionModal, setShowConcessionModal] = useState(false);
  const [concessionFee, setConcessionFee] = useState<StudentFee | null>(null);
  const [concessionType, setConcessionType] = useState<"percentage" | "fixed">("percentage");
  const [concessionValue, setConcessionValue] = useState<string>("");
  const [concessionReason, setConcessionReason] = useState<string>("Staff Child Concession (50%)");
  const [concessionNotes, setConcessionNotes] = useState<string>("");
  const [submittingConcession, setSubmittingConcession] = useState(false);

  // Official Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);

  // Consolidated / Pay All Fees Modal State
  const [showPayAll, setShowPayAll] = useState(false);
  const [payAllAmount, setPayAllAmount] = useState<string>("");
  const [payAllMethod, setPayAllMethod] = useState<string>("Bank Transfer");
  const [payAllReference, setPayAllReference] = useState<string>("");
  const [payAllPayerName, setPayAllPayerName] = useState<string>("");
  const [payAllPayerPhone, setPayAllPayerPhone] = useState<string>("");
  const [useCustomAllocation, setUseCustomAllocation] = useState(false);
  const [customAllocations, setCustomAllocations] = useState<Record<number, string>>({});

  useEffect(() => {
    const t = window.setTimeout(() => setLoadingPage(false), 100);
    return () => window.clearTimeout(t);
  }, []);

  // Load Sessions and Terms
  useEffect(() => {
    let mounted = true;
    async function bootMeta() {
      try {
        setLoadingMeta(true);
        const [sesRes, termRes] = await Promise.all([
          authApi.get("/facademic-sessions"),
          authApi.get("/fterms"),
        ]);
        if (!mounted) return;
        const rawSes = sesRes.data?.data ?? sesRes.data ?? [];
        setSessions(
          (Array.isArray(rawSes) ? rawSes : []).map((s: any) => ({
            id: s.id,
            name: s.name ?? s.session ?? s.title ?? "",
          }))
        );
        const rawTerms = termRes.data?.data ?? termRes.data ?? [];
        setTerms(
          (Array.isArray(rawTerms) ? rawTerms : []).map((t: any) => ({
            id: t.id,
            name: t.name ?? t.term ?? "",
          }))
        );
      } catch {
        // fallback
      } finally {
        if (mounted) setLoadingMeta(false);
      }
    }
    bootMeta();
    return () => {
      mounted = false;
    };
  }, []);

  /* =========================
     FETCH DETAILS
  ========================= */
  async function fetchStudentFees() {
    const rn = regNo.trim();
    if (!rn) return showWarning("Enter student registration number.");

    try {
      setLoadingDetails(true);
      const res = await authApi.get<StudentFeeDetailsResponse>("/fees/student/details", {
        params: {
          reg_no: rn,
          session_id: sessionId || undefined,
          term_id: termId || undefined,
        },
      });

      setStudent(res.data?.student ?? null);
      setFees(Array.isArray(res.data?.fees) ? res.data.fees : []);
      setFinancialSummary(res.data?.financial_summary ?? null);
      setPastArrears(Array.isArray(res.data?.past_arrears) ? res.data.past_arrears : []);
      setInstallmentPlan(res.data?.installment_plan ?? null);
      setFullDiscount(
        res.data?.full_payment_discount ?? res.data?.installment_plan?.full_payment_discount ?? null
      );
      showSuccess("Student financial record loaded.");
    } catch (e: any) {
      console.error(e);
      setStudent(null);
      setFees([]);
      setFinancialSummary(null);
      setPastArrears([]);
      setInstallmentPlan(null);
      setFullDiscount(null);
      showError(getErrorMessage(e));
    } finally {
      setLoadingDetails(false);
    }
  }

  /* =========================
     PAY FLOW
  ========================= */
  function openPayModal(f: StudentFee) {
    if (!f?.id) return;
    setSelectedFee(f);
    setPayFeeId(f.id);
    setPayMethod("Bank Transfer");
    setApplyFullDiscount(false);
    setPayReference("");
    setPayerName("");
    setPayerPhone("");
    setPayAmount(String(Math.max(0, Number(f.balance ?? 0))));
    setShowPay(true);
  }

  async function submitPayment() {
    if (!payFeeId) return;
    const method = payMethod.trim();
    if (!method) return showError("Select or enter payment method (e.g. Bank Transfer).");

    const amountNum = Number(payAmount);
    if (Number.isNaN(amountNum) || amountNum <= 0) return showError("Enter a valid payment amount.");

    try {
      setBusyKey(`fee:pay:${payFeeId}`);
      const res = await authApi.post<PayFeeResponse>("/fees/pay", {
        student_fee_id: payFeeId,
        amount: amountNum,
        payment_method: method,
        reference: payReference.trim() || undefined,
        payer_name: payerName.trim() || undefined,
        payer_phone: payerPhone.trim() || undefined,
        apply_full_discount: applyFullDiscount,
      });

      showSuccess(res.data?.message ?? "Payment recorded successfully!");
      setShowPay(false);

      // Open official serialized receipt modal if receipt data returned
      if (res.data?.receipt) {
        setActiveReceipt(res.data.receipt);
        setShowReceiptModal(true);
      }

      await fetchStudentFees();
    } catch (e: any) {
      console.error(e);
      showError(getErrorMessage(e));
    } finally {
      setBusyKey(null);
    }
  }

  /* =========================
     CONCESSION FLOW
  ========================= */
  function openConcessionModal(f: StudentFee) {
    if (!f?.id) return;
    setConcessionFee(f);
    setConcessionType(f.discount_type || "percentage");
    setConcessionValue(f.discount_amount ? String(f.discount_rate || f.discount_amount) : "50");
    setConcessionReason(f.discount_reason || "Staff Child Concession (50%)");
    setConcessionNotes(f.discount_notes || "");
    setShowConcessionModal(true);
  }

  async function submitConcession() {
    if (!concessionFee) return;
    const val = Number(concessionValue);
    if (Number.isNaN(val) || val <= 0) {
      return showError("Enter a valid discount rate or fixed amount.");
    }
    if (concessionType === "percentage" && val > 100) {
      return showError("Percentage discount cannot exceed 100%.");
    }

    setSubmittingConcession(true);
    try {
      const res = await authApi.post("/fees/concessions/apply", {
        student_fee_id: concessionFee.id,
        discount_type: concessionType,
        discount_value: val,
        discount_reason: concessionReason,
        discount_notes: concessionNotes.trim() || undefined,
      });

      showSuccess(res.data?.message || "Concession applied successfully!");
      setShowConcessionModal(false);
      await fetchStudentFees();
    } catch (e: any) {
      showError(getErrorMessage(e));
    } finally {
      setSubmittingConcession(false);
    }
  }

  /* Concession Live Calculator */
  const concessionCalc = useMemo(() => {
    if (!concessionFee) return { gross: 0, discount: 0, net: 0, balance: 0 };
    const gross = Number(concessionFee.gross_amount || concessionFee.total_amount || 0);
    const paid = Number(concessionFee.amount_paid || 0);
    const val = Number(concessionValue || 0);

    let discount = 0;
    if (concessionType === "percentage") {
      discount = Math.min(gross, Math.round(((gross * Math.min(100, val)) / 100) * 100) / 100);
    } else {
      discount = Math.min(gross, val);
    }
    const net = Math.max(0, gross - discount);
    const balance = Math.max(0, net - paid);
    return { gross, discount, net, balance };
  }, [concessionFee, concessionType, concessionValue]);

  const filteredFees = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return fees;

    return fees.filter((f) => {
      const name = getFeeName(f).toLowerCase();
      const term = (f.term?.name ?? "").toLowerCase();
      const ses = (f.session?.name ?? "").toLowerCase();
      const status = paymentStatus(f).label.toLowerCase();
      return `${name} ${term} ${ses} ${status} ${f.total_amount} ${f.amount_paid} ${f.balance}`.includes(q);
    });
  }, [fees, filter]);

  // Unpaid fees & total balance for Pay All (Consolidated Payment)
  const unpaidFees = useMemo(() => {
    return fees.filter((f) => Number(f.balance || 0) > 0);
  }, [fees]);

  const totalUnpaidBalance = useMemo(() => {
    return unpaidFees.reduce((sum, f) => sum + Number(f.balance || 0), 0);
  }, [unpaidFees]);

  const computedAllocations = useMemo(() => {
    if (useCustomAllocation) {
      const allocMap: Record<number, number> = {};
      unpaidFees.forEach((f) => {
        allocMap[f.id] = Number(customAllocations[f.id] || 0);
      });
      return allocMap;
    }

    const allocMap: Record<number, number> = {};
    let remaining = Number(payAllAmount || 0);
    unpaidFees.forEach((f) => {
      if (remaining <= 0) {
        allocMap[f.id] = 0;
      } else {
        const take = Math.min(remaining, Number(f.balance || 0));
        allocMap[f.id] = take;
        remaining -= take;
      }
    });
    return allocMap;
  }, [useCustomAllocation, customAllocations, payAllAmount, unpaidFees]);

  const openPayAllModal = () => {
    if (unpaidFees.length === 0) return;
    setPayAllAmount(String(totalUnpaidBalance));
    setPayAllMethod("Bank Transfer");
    setPayAllReference("");
    setPayAllPayerName(student ? student.name : "");
    setPayAllPayerPhone("");
    setUseCustomAllocation(false);

    const initialAlloc: Record<number, string> = {};
    unpaidFees.forEach((f) => {
      initialAlloc[f.id] = String(f.balance);
    });
    setCustomAllocations(initialAlloc);
    setShowPayAll(true);
  };

  const handlePayAllSubmit = async () => {
    if (!student) return;
    const amt = Number(payAllAmount || 0);
    if (amt <= 0) {
      showError("Please enter a valid payment amount greater than zero.");
      return;
    }
    if (amt > totalUnpaidBalance + 0.05) {
      showError(`Payment amount cannot exceed total outstanding balance of ${naira(totalUnpaidBalance)}.`);
      return;
    }

    let itemsPayload: Array<{ student_fee_id: number; amount: number }> | undefined = undefined;
    if (useCustomAllocation) {
      const sumAlloc = Object.values(customAllocations).reduce((acc, v) => acc + Number(v || 0), 0);
      if (Math.abs(sumAlloc - amt) > 0.05) {
        showError(`The sum of item allocations (${naira(sumAlloc)}) must equal total payment amount (${naira(amt)}).`);
        return;
      }
      itemsPayload = Object.entries(customAllocations)
        .filter(([_, v]) => Number(v) > 0)
        .map(([id, v]) => ({ student_fee_id: Number(id), amount: Number(v) }));
    }

    try {
      setBusyKey("fee:pay-bulk");
      const res = await authApi.post<PayFeeResponse>("/fees/pay-bulk", {
        student_id: student.id,
        amount: amt,
        payment_method: payAllMethod,
        reference: payAllReference.trim() || undefined,
        payer_name: payAllPayerName.trim() || undefined,
        payer_phone: payAllPayerPhone.trim() || undefined,
        items: itemsPayload,
      });

      showSuccess(res.data?.message ?? "Consolidated payment recorded successfully!");
      setShowPayAll(false);

      if (res.data?.receipt) {
        setActiveReceipt(res.data.receipt);
        setShowReceiptModal(true);
      }

      await fetchStudentFees();
    } catch (e: any) {
      console.error(e);
      showError(getErrorMessage(e));
    } finally {
      setBusyKey(null);
    }
  };

  const canSearch = !!regNo.trim() && busyKey === null && !loadingDetails;

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        :root {
          --sp-navy: #0f2744;
          --sp-gold: #d97706;
          --sp-border: #e2e8f0;
          --sp-light: #f8fafc;
        }

        .sp-fee-page-main {
          background: #f8fafc;
          min-height: 100vh;
          padding-top: calc(var(--gq-topnav-height, 66px) + 24px) !important;
          padding-bottom: 54px !important;
        }
        @media (min-width: 768px) {
          .sp-fee-page-main {
            padding-left: 28px !important;
            padding-right: 28px !important;
            width: calc(100% - var(--gq-sidebar-width, 280px)) !important;
            max-width: calc(100% - var(--gq-sidebar-width, 280px)) !important;
            margin-left: auto !important;
          }
          .gq-sidebar-collapsed .sp-fee-page-main {
            width: calc(100% - var(--gq-sidebar-collapsed-width, 86px)) !important;
            max-width: calc(100% - var(--gq-sidebar-collapsed-width, 86px)) !important;
          }
        }
        @media (max-width: 767.98px) {
          .sp-fee-page-main {
            width: 100% !important;
            max-width: 100% !important;
            padding-top: calc(var(--gq-topnav-height, 66px) + 16px) !important;
            padding-left: 14px !important;
            padding-right: 14px !important;
          }
        }

        /* Hero */
        .sp-hero {
          background: linear-gradient(135deg, #0f2744 0%, #1e3a5f 60%, #172554 100%);
          border-radius: 16px;
          padding: 28px 32px;
          position: relative;
          overflow: hidden;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
        }
        .sp-hero-glow {
          position: absolute;
          top: -60px; right: -60px;
          width: 320px; height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.18) 0%, transparent 65%);
          pointer-events: none;
        }
        .sp-hero-inner {
          position: relative; z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          flex-wrap: wrap;
        }
        .sp-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #FBBF24;
          background: rgba(217, 119, 6, 0.22);
          border: 1px solid rgba(217, 119, 6, 0.40);
          border-radius: 100px;
          padding: 4px 12px;
          margin-bottom: 12px;
        }
        .sp-dot-pulse {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          animation: spPulse 2s ease infinite;
        }
        @keyframes spPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.4); }
        }

        /* Past Arrears Alert Banner */
        .sp-arrears-banner {
          background: #fef2f2;
          border: 1.5px solid #fecaca;
          border-radius: 14px;
          padding: 16px 20px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.05);
        }
        .sp-arrears-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          background: #fee2e2;
          color: #dc2626;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0;
        }

        /* Nigerian Standard 5 Student Summary Cards */
        .sp-student-summary-bar {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
          margin-bottom: 22px;
        }
        @media (max-width: 1200px) { .sp-student-summary-bar { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 600px)  { .sp-student-summary-bar { grid-template-columns: 1fr; } }

        .sp-sum-card {
          background: #fff;
          border: 1px solid var(--sp-border);
          border-radius: 12px;
          padding: 16px 18px;
          position: relative;
        }
        .sp-sum-card-lbl { font-size: 11.5px; font-weight: 600; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.03em; }
        .sp-sum-card-val { font-size: 18px; font-weight: 800; color: #0f172a; line-height: 1.2; }

        /* Panels */
        .sp-card-panel {
          background: #fff;
          border: 1px solid var(--sp-border);
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 22px;
        }
        .sp-card-head {
          padding: 18px 22px;
          border-bottom: 1px solid var(--sp-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        /* Buttons */
        .sp-gold-btn {
          background: #d97706;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          padding: 8px 18px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all .15s ease;
        }
        .sp-gold-btn:hover { background: #b45309; }
        .sp-gold-btn:disabled { opacity: .5; cursor: not-allowed; }

        .sp-outline-btn {
          background: #fff;
          color: #334155;
          font-size: 12.5px;
          font-weight: 600;
          border: 1px solid var(--sp-border);
          border-radius: 8px;
          padding: 6px 14px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all .15s ease;
        }
        .sp-outline-btn:hover { background: #f8fafc; border-color: #cbd5e1; }

        /* Table */
        .sp-table { width: 100%; border-collapse: collapse; }
        .sp-table th {
          padding: 12px 16px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #64748b;
          background: #f8fafc;
          border-bottom: 1px solid var(--sp-border);
          text-align: left;
          white-space: nowrap;
        }
        .sp-table td {
          padding: 14px 16px;
          font-size: 13px;
          color: #1e293b;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .sp-table tbody tr:hover { background: #f8fafc; }

        .sp-tag {
          font-size: 11.5px;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: 20px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .sp-tag--green  { background: rgba(34,197,94,0.10); color: #15803d; }
        .sp-tag--amber  { background: rgba(245,158,11,0.10); color: #b45309; }
        .sp-tag--violet { background: rgba(124,58,237,0.08); color: #6d28d9; }
        .sp-tag--blue   { background: rgba(37,99,235,0.08); color: #1d4ed8; }
        .sp-tag--red    { background: rgba(220,38,38,0.10); color: #b91c1c; }

        /* Modal Overlays */
        .sp-modal-mask {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.70);
          backdrop-filter: blur(4px);
          z-index: 1050;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          overflow-y: auto;
        }
        .sp-modal-content {
          background: #fff;
          border-radius: 16px;
          width: 100%;
          max-width: 620px;
          max-height: 92vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          border: 1px solid var(--sp-border);
        }

        /* PRINT STYLES FOR OFFICIAL RECEIPT */
        @media print {
          body * {
            visibility: hidden;
          }
          #schoolprofit-printable-receipt, #schoolprofit-printable-receipt * {
            visibility: visible;
          }
          #schoolprofit-printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
            box-shadow: none !important;
            border: 1px solid #ddd !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Student Fee Collection & Receipts — SchoolProfit" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto gq-app-main db-main sp-fee-page-main d-flex flex-column min-vh-100">
            {loadingPage && <Loader message="Loading SchoolProfit fee payment desk…" />}

            {/* HERO */}
            <div className="sp-hero">
              <div className="sp-hero-glow" aria-hidden="true" />
              <div className="sp-hero-inner">
                <div>
                  <div className="sp-badge-pill">
                    <span className="sp-dot-pulse" />
                    SchoolProfit • Nigerian Educational Finance Standard
                  </div>

                  <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
                    {getGreeting()}, <em>Bursar.</em>
                  </h1>

                  <p style={{ fontSize: 13.5, color: "#cbd5e1", maxWidth: 640, lineHeight: 1.6, marginBottom: 0 }}>
                    Lookup student fees by <strong>Registration Number</strong> to record offline fee collections, grant standard concessions (Staff Child, Sibling, Scholarship), and issue official serialized receipts with instant QR code verification.
                  </p>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <span
                    style={{
                      background: "rgba(255,255,255,0.12)",
                      color: "#fff",
                      borderRadius: 100,
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    🔒 Double-Entry Integrity Active
                  </span>
                </div>
              </div>
            </div>

            {/* LOOKUP PANEL */}
            <div className="sp-card-panel">
              <div className="sp-card-head">
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                    Student Fee Lookup
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Search by Admission Number to access financial ledger
                  </div>
                </div>

                {student && (
                  <button
                    type="button"
                    className="sp-outline-btn"
                    onClick={() => {
                      setStudent(null);
                      setFees([]);
                      setFinancialSummary(null);
                      setPastArrears([]);
                      setRegNo("");
                      setFilter("");
                    }}
                  >
                    ✕ Clear Student
                  </button>
                )}
              </div>

              <div style={{ padding: "20px" }}>
                <div className="row g-3 align-items-end">
                  <div className="col-12 col-md-4">
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6, display: "block" }}>
                      Student Reg Number *
                    </label>
                    <input
                      className="form-control"
                      style={{ fontWeight: 700, borderColor: "#cbd5e1" }}
                      placeholder="e.g. GQ/2026/012 or SAM/004"
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && canSearch) fetchStudentFees();
                      }}
                      disabled={loadingDetails}
                    />
                  </div>

                  <div className="col-12 col-md-3">
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6, display: "block" }}>
                      Session (Optional)
                    </label>
                    <select
                      className="form-select"
                      style={{ borderColor: "#cbd5e1" }}
                      value={sessionId}
                      onChange={(e) => setSessionId(e.target.value)}
                      disabled={loadingDetails || loadingMeta}
                    >
                      <option value="">All Sessions</option>
                      {sessions.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12 col-md-3">
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6, display: "block" }}>
                      Term (Optional)
                    </label>
                    <select
                      className="form-select"
                      style={{ borderColor: "#cbd5e1" }}
                      value={termId}
                      onChange={(e) => setTermId(e.target.value)}
                      disabled={loadingDetails || loadingMeta}
                    >
                      <option value="">All Terms</option>
                      {terms.map((t) => (
                        <option key={t.id} value={String(t.id)}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12 col-md-2">
                    <button
                      type="button"
                      className="sp-gold-btn w-100"
                      style={{ height: 38, justifyContent: "center" }}
                      onClick={fetchStudentFees}
                      disabled={!canSearch}
                    >
                      {loadingDetails ? "Fetching…" : "Fetch Ledger"}
                    </button>
                  </div>
                </div>

                {fees.length > 0 && (
                  <div className="mt-3 pt-3 border-top d-flex gap-2">
                    <input
                      className="form-control form-control-sm"
                      style={{ maxWidth: 360 }}
                      placeholder="Filter listed fee items by name or status…"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    />
                    {filter && (
                      <button
                        type="button"
                        className="sp-outline-btn"
                        style={{ padding: "4px 10px", fontSize: 12 }}
                        onClick={() => setFilter("")}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* PAST ARREARS ROLL-FORWARD ALERT */}
            {financialSummary?.has_past_arrears && (
              <div className="sp-arrears-banner">
                <div className="d-flex align-items-center gap-3">
                  <div className="sp-arrears-icon">⚠️</div>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: "#991b1b" }}>
                      Unsettled Past Debt Carried Forward: {naira(financialSummary.past_arrears_balance)}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#7f1d1d" }}>
                      In accordance with standard Nigerian educational accounting rules, past debt carries forward into the active term.
                      Total liability including past arrears is <strong>{naira(financialSummary.total_due_including_arrears)}</strong>.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="sp-outline-btn"
                  style={{ borderColor: "#f87171", color: "#b91c1c", fontWeight: 700 }}
                  onClick={() => setShowArrearsDetails(!showArrearsDetails)}
                >
                  {showArrearsDetails ? "Hide Arrears Details ▲" : `View Arrears Breakdown (${pastArrears.length}) ▼`}
                </button>
              </div>
            )}

            {/* EXPANDABLE PAST ARREARS BREAKDOWN TABLE */}
            {showArrearsDetails && pastArrears.length > 0 && (
              <div className="sp-card-panel border-danger mb-4" style={{ borderColor: "#fecaca" }}>
                <div className="sp-card-head" style={{ background: "#fff5f5" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#991b1b" }}>
                    Past Arrears Debt Items (Previous Sessions / Terms)
                  </div>
                  <span className="sp-tag sp-tag--red">Carry-Forward Debt</span>
                </div>
                <div className="overflow-auto">
                  <table className="sp-table">
                    <thead>
                      <tr>
                        <th>Fee Item</th>
                        <th>Past Session</th>
                        <th>Past Term</th>
                        <th style={{ textAlign: "right" }}>Outstanding Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastArrears.map((p) => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>{p.fee_name}</td>
                          <td>
                            <span className="sp-tag sp-tag--amber">{p.session_name}</span>
                          </td>
                          <td>
                            <span className="sp-tag sp-tag--violet">{p.term_name}</span>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "#dc2626" }}>
                            {naira(p.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* STUDENT SUMMARY BAR */}
            {student && financialSummary && (
              <div className="sp-student-summary-bar">
                {/* 1. Student Identity */}
                <div className="sp-sum-card" style={{ borderLeft: "4px solid #0f2744" }}>
                  <div className="sp-sum-card-lbl">Student Details</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{student.name}</div>
                  <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                    {student.reg_no} • {student.section} ({student.class})
                  </div>
                </div>

                {/* 2. Gross Tuition */}
                <div className="sp-sum-card" style={{ borderLeft: "4px solid #d97706" }}>
                  <div className="sp-sum-card-lbl">Gross Tuition & Fees</div>
                  <div className="sp-sum-card-val">{naira(financialSummary.gross_total)}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Standard published amount</div>
                </div>

                {/* 3. Approved Concessions */}
                <div className="sp-sum-card" style={{ borderLeft: "4px solid #7c3aed" }}>
                  <div className="sp-sum-card-lbl">Approved Concessions</div>
                  <div className="sp-sum-card-val" style={{ color: "#7c3aed" }}>
                    -{naira(financialSummary.discount_total)}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Staff child & sibling relief</div>
                </div>

                {/* 4. Total Cash Paid */}
                <div className="sp-sum-card" style={{ borderLeft: "4px solid #16a34a" }}>
                  <div className="sp-sum-card-lbl">Total Cash Realized</div>
                  <div className="sp-sum-card-val" style={{ color: "#16a34a" }}>
                    {naira(financialSummary.total_paid)}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Actual bank/cash receipts</div>
                </div>

                {/* 5. Total Balance Due */}
                <div className="sp-sum-card" style={{ borderLeft: "4px solid #dc2626" }}>
                  <div className="sp-sum-card-lbl">Current Outstanding</div>
                  <div className="sp-sum-card-val" style={{ color: financialSummary.current_balance > 0 ? "#dc2626" : "#16a34a" }}>
                    {naira(financialSummary.current_balance)}
                  </div>
                  {financialSummary.has_past_arrears && (
                    <div style={{ fontSize: 11, color: "#b91c1c", fontWeight: 600, marginTop: 2 }}>
                      +{naira(financialSummary.past_arrears_balance)} past arrears
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* FEES DATA TABLE */}
            <div className="sp-card-panel">
              <div className="sp-card-head">
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                    Assigned Fee Schedule
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {student ? `${filteredFees.length} fee items for ${student.name}` : "Enter registration number to view schedule"}
                  </div>
                </div>

                {student && (
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {unpaidFees.length > 0 && totalUnpaidBalance > 0 && (
                      <button
                        type="button"
                        className="sp-gold-btn"
                        onClick={openPayAllModal}
                        style={{
                          background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                          color: "#fff",
                          fontWeight: 700,
                          padding: "8px 16px",
                          boxShadow: "0 4px 12px rgba(22, 163, 74, 0.25)",
                        }}
                      >
                        💳 Pay All Fees at Once ({naira(totalUnpaidBalance)})
                      </button>
                    )}
                    <button
                      type="button"
                      className="sp-outline-btn"
                      onClick={fetchStudentFees}
                      disabled={loadingDetails}
                    >
                      Refresh Records
                    </button>
                  </div>
                )}
              </div>

              <div className="overflow-auto">
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Fee Item</th>
                      <th style={{ textAlign: "right" }}>Gross Fee</th>
                      <th style={{ textAlign: "right" }}>Concession / Relief</th>
                      <th style={{ textAlign: "right" }}>Net Payable</th>
                      <th style={{ textAlign: "right" }}>Cash Paid</th>
                      <th style={{ textAlign: "right" }}>Balance</th>
                      <th>Session & Term</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right", minWidth: 200 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!student ? (
                      <tr>
                        <td colSpan={10} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                          Enter Student Registration Number above to load fees.
                        </td>
                      </tr>
                    ) : loadingDetails ? (
                      <tr>
                        <td colSpan={10} style={{ padding: "20px" }}>
                          <div style={{ height: 16, background: "#f1f5f9", borderRadius: 4, marginBottom: 8 }} />
                          <div style={{ height: 16, background: "#f1f5f9", borderRadius: 4 }} />
                        </td>
                      </tr>
                    ) : filteredFees.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                          No fee structures assigned for this query.
                        </td>
                      </tr>
                    ) : (
                      filteredFees.map((f, idx) => {
                        const st = paymentStatus(f);
                        const isFullyPaid = st.tone === "paid";
                        const isDiscountable = (f.feeType?.is_discountable ?? f.fee_type?.is_discountable ?? f.is_discountable) !== false;
                        const hasConcession = Number(f.discount_amount || 0) > 0;
                        const grossVal = Number(f.gross_amount || f.total_amount || 0);
                        const netVal = Number(f.net_amount || f.total_amount || 0);

                        return (
                          <tr key={f.id}>
                            <td>{idx + 1}</td>
                            <td>
                              <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                                {getFeeName(f)}
                              </div>
                              {!isDiscountable && (
                                <span className="sp-tag sp-tag--amber" style={{ fontSize: "10.5px" }}>
                                  Compulsory / Non-Discountable
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 600 }}>{naira(grossVal)}</td>
                            <td style={{ textAlign: "right" }}>
                              {hasConcession ? (
                                <div>
                                  <span className="sp-tag sp-tag--violet">
                                    -{naira(f.discount_amount)}
                                  </span>
                                  <div style={{ fontSize: "11px", color: "#7c3aed" }}>
                                    {f.discount_reason || `${f.discount_rate}% concession`}
                                    {f.discount_status === "pending" && " (Pending Approval)"}
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: "#94a3b8", fontSize: "12px" }}>—</span>
                              )}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                              {naira(netVal)}
                            </td>
                            <td style={{ textAlign: "right", color: "#16a34a", fontWeight: 600 }}>
                              {naira(f.amount_paid)}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 800, color: f.balance > 0 ? "#dc2626" : "#16a34a" }}>
                              {naira(f.balance)}
                            </td>
                            <td>
                              <div style={{ fontSize: "12px", color: "#475569" }}>
                                {f.session?.name} • {f.term?.name}
                              </div>
                            </td>
                            <td>
                              <span className={`sp-tag ${st.tone === "paid" ? "sp-tag--green" : st.tone === "partial" ? "sp-tag--amber" : "sp-tag--red"}`}>
                                {st.label}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div className="d-flex justify-content-end gap-2 flex-wrap">
                                {/* Concession Button */}
                                {isDiscountable && !isFullyPaid && (
                                  <button
                                    type="button"
                                    className="sp-outline-btn"
                                    style={{ fontSize: "11.5px", padding: "4px 10px" }}
                                    onClick={() => openConcessionModal(f)}
                                    title="Grant Staff Child, Sibling, or Need Concession"
                                  >
                                    {hasConcession ? "Edit Concession" : "+ Concession"}
                                  </button>
                                )}

                                {/* Pay Button */}
                                <button
                                  type="button"
                                  className="sp-gold-btn"
                                  style={{
                                    fontSize: "11.5px",
                                    padding: "5px 14px",
                                    background: isFullyPaid ? "#f1f5f9" : "#d97706",
                                    color: isFullyPaid ? "#94a3b8" : "#fff",
                                  }}
                                  onClick={() => openPayModal(f)}
                                  disabled={isFullyPaid || isBusy(`fee:pay:${f.id}`)}
                                >
                                  {isFullyPaid ? "Settled ✓" : `Pay Fee`}
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
            </div>

            <Footer />

            {/* =========================================================
                MODAL: APPLY CONCESSION / DISCOUNT
            ========================================================= */}
            {showConcessionModal && concessionFee && (
              <div className="sp-modal-mask" onClick={() => (submittingConcession ? null : setShowConcessionModal(false))}>
                <div className="sp-modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="sp-card-head">
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                        Apply Fee Concession / Scholarship
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {getFeeName(concessionFee)} • Student: {student?.name}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowConcessionModal(false)}
                      disabled={submittingConcession}
                    />
                  </div>

                  <div style={{ padding: "20px" }}>
                    {/* Presets */}
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 8, display: "block" }}>
                      Standard Concession Presets
                    </label>
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {[
                        { label: "Staff Child (50%)", type: "percentage" as const, val: "50", reason: "Staff Child Concession (50%)" },
                        { label: "Sibling Discount (15%)", type: "percentage" as const, val: "15", reason: "Sibling Discount (15%)" },
                        { label: "Full Scholarship (100%)", type: "percentage" as const, val: "100", reason: "Full Merit / Need Scholarship (100%)" },
                        { label: "Quarter Relief (25%)", type: "percentage" as const, val: "25", reason: "Board Fee Concession (25%)" },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          className="sp-outline-btn"
                          style={{
                            fontSize: "11.5px",
                            padding: "5px 10px",
                            background: concessionReason === preset.reason ? "#ede9fe" : "#fff",
                            borderColor: concessionReason === preset.reason ? "#7c3aed" : "#e2e8f0",
                            color: concessionReason === preset.reason ? "#6d28d9" : "#334155",
                          }}
                          onClick={() => {
                            setConcessionType(preset.type);
                            setConcessionValue(preset.val);
                            setConcessionReason(preset.reason);
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-6">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4, display: "block" }}>
                          Discount Type
                        </label>
                        <select
                          className="form-select"
                          value={concessionType}
                          onChange={(e) => setConcessionType(e.target.value as any)}
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed Amount (₦)</option>
                        </select>
                      </div>

                      <div className="col-6">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4, display: "block" }}>
                          {concessionType === "percentage" ? "Percentage Rate (%)" : "Fixed Amount (₦)"}
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          value={concessionValue}
                          onChange={(e) => setConcessionValue(e.target.value)}
                          placeholder={concessionType === "percentage" ? "e.g. 50" : "e.g. 25000"}
                          min={1}
                          max={concessionType === "percentage" ? 100 : concessionCalc.gross}
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4, display: "block" }}>
                        Concession Reason / Category *
                      </label>
                      <input
                        className="form-control"
                        value={concessionReason}
                        onChange={(e) => setConcessionReason(e.target.value)}
                        placeholder="e.g. Staff Child Concession (50%) or Hardship Relief"
                      />
                    </div>

                    <div className="mb-3">
                      <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4, display: "block" }}>
                        Notes / Proprietor Approval Reference
                      </label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={concessionNotes}
                        onChange={(e) => setConcessionNotes(e.target.value)}
                        placeholder="e.g. Approved by Director for 2026/2027 Academic Session"
                      />
                    </div>

                    {/* Live Accounting Preview */}
                    <div
                      style={{
                        background: "#f8fafc",
                        border: "1.5px solid #e2e8f0",
                        borderRadius: 12,
                        padding: "14px 16px",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                        Double-Entry Reconciliation Preview:
                      </div>
                      <div className="d-flex justify-content-between mb-1" style={{ fontSize: 12.5 }}>
                        <span style={{ color: "#64748b" }}>Gross Published Tuition:</span>
                        <strong>{naira(concessionCalc.gross)}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1" style={{ fontSize: 12.5 }}>
                        <span style={{ color: "#7c3aed" }}>Concession Deduction:</span>
                        <strong style={{ color: "#7c3aed" }}>-{naira(concessionCalc.discount)}</strong>
                      </div>
                      <div className="d-flex justify-content-between pt-2 border-top mb-1" style={{ fontSize: 13, fontWeight: 700 }}>
                        <span>New Net Payable:</span>
                        <span style={{ color: "#0f172a" }}>{naira(concessionCalc.net)}</span>
                      </div>
                      <div className="d-flex justify-content-between" style={{ fontSize: 12.5 }}>
                        <span style={{ color: "#64748b" }}>New Remaining Balance:</span>
                        <strong style={{ color: "#dc2626" }}>{naira(concessionCalc.balance)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="sp-card-head" style={{ background: "#f8fafc", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="sp-outline-btn"
                      onClick={() => setShowConcessionModal(false)}
                      disabled={submittingConcession}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="sp-gold-btn"
                      onClick={submitConcession}
                      disabled={submittingConcession}
                    >
                      {submittingConcession ? "Applying Concession…" : "Confirm & Save Concession"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                MODAL: RECORD PAYMENT
            ========================================================= */}
            {showPay && selectedFee && (
              <div className="sp-modal-mask" onClick={() => (busyKey ? null : setShowPay(false))}>
                <div className="sp-modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="sp-card-head">
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                        Record Fee Collection
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {getFeeName(selectedFee)} • Student: {student?.name}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowPay(false)}
                      disabled={busyKey !== null}
                    />
                  </div>

                  <div style={{ padding: "20px" }}>
                    {/* Method Selector */}
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6, display: "block" }}>
                      Payment Channel / Method *
                    </label>
                    <div className="d-flex gap-2 mb-3 flex-wrap">
                      {["Bank Transfer", "Cash", "POS", "Cheque", "Online / Paystack"].map((m) => (
                        <button
                          key={m}
                          type="button"
                          className="sp-outline-btn"
                          style={{
                            fontSize: "12px",
                            padding: "6px 14px",
                            background: payMethod === m ? "#0f2744" : "#fff",
                            color: payMethod === m ? "#fff" : "#334155",
                            borderColor: payMethod === m ? "#0f2744" : "#cbd5e1",
                          }}
                          onClick={() => setPayMethod(m)}
                        >
                          {m}
                        </button>
                      ))}
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-12 col-md-6">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4, display: "block" }}>
                          Amount To Collect (₦) *
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          style={{ fontWeight: 700, fontSize: 15 }}
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          max={selectedFee.balance}
                          min={1}
                        />
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                          Remaining fee balance: <strong>{naira(selectedFee.balance)}</strong>
                        </div>
                      </div>

                      <div className="col-12 col-md-6">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4, display: "block" }}>
                          Transaction Reference (Optional)
                        </label>
                        <input
                          className="form-control"
                          placeholder="e.g. GTB/TRF/9812903"
                          value={payReference}
                          onChange={(e) => setPayReference(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-12 col-md-6">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4, display: "block" }}>
                          Payer Name (Parent / Guardian)
                        </label>
                        <input
                          className="form-control"
                          placeholder="e.g. Mr. & Mrs. Okon"
                          value={payerName}
                          onChange={(e) => setPayerName(e.target.value)}
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4, display: "block" }}>
                          Payer Phone Number
                        </label>
                        <input
                          className="form-control"
                          placeholder="e.g. 08031234567"
                          value={payerPhone}
                          onChange={(e) => setPayerPhone(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="sp-card-head" style={{ background: "#f8fafc", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="sp-outline-btn"
                      onClick={() => setShowPay(false)}
                      disabled={busyKey !== null}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="sp-gold-btn"
                      onClick={submitPayment}
                      disabled={busyKey !== null}
                    >
                      {isBusy(`fee:pay:${payFeeId}`) ? "Logging Payment…" : "Record Payment & Generate Official Receipt"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                MODAL: CONSOLIDATED / PAY ALL FEES AT ONCE
            ========================================================= */}
            {showPayAll && student && (
              <div className="sp-modal-mask" onClick={() => (busyKey ? null : setShowPayAll(false))}>
                <div className="sp-modal-content" style={{ maxWidth: 740 }} onClick={(e) => e.stopPropagation()}>
                  <div className="sp-card-head" style={{ background: "linear-gradient(135deg, #0f2744 0%, #1e3a5f 100%)", color: "#fff" }}>
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <span style={{ fontSize: 18 }}>💳</span>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
                          Pay All Fees at Once (Consolidated Settlement)
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                        Student: <strong style={{ color: "#fff" }}>{student.name}</strong> ({student.reg_no}) • {student.class} • {student.section}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      onClick={() => setShowPayAll(false)}
                      disabled={busyKey !== null}
                    />
                  </div>

                  <div style={{ padding: "22px" }}>
                    {/* Top Balance Summary Banner */}
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "1.5px solid #bbf7d0",
                        borderRadius: 12,
                        padding: "14px 18px",
                        marginBottom: 20,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Total Current Outstanding ({unpaidFees.length} Fee Items)
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#15803d" }}>
                          {naira(totalUnpaidBalance)}
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="sp-outline-btn"
                          style={{ fontSize: 12, borderColor: "#86efac", background: "#fff", color: "#15803d", fontWeight: 700 }}
                          onClick={() => {
                            setPayAllAmount(String(totalUnpaidBalance));
                            setUseCustomAllocation(false);
                          }}
                        >
                          ✓ Full Balance ({naira(totalUnpaidBalance)})
                        </button>
                        {totalUnpaidBalance > 2000 && (
                          <button
                            type="button"
                            className="sp-outline-btn"
                            style={{ fontSize: 12, borderColor: "#cbd5e1" }}
                            onClick={() => {
                              setPayAllAmount(String(Math.round(totalUnpaidBalance / 2)));
                              setUseCustomAllocation(false);
                            }}
                          >
                            50% Part-Payment ({naira(Math.round(totalUnpaidBalance / 2))})
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Amount & Method Form */}
                    <div className="row g-3 mb-3">
                      <div className="col-12 col-md-6">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4, display: "block" }}>
                          Total Amount to Collect Now (₦) *
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          style={{ fontWeight: 800, fontSize: 17, color: "#0f2744" }}
                          placeholder="e.g. 25000"
                          value={payAllAmount}
                          onChange={(e) => {
                            setPayAllAmount(e.target.value);
                            setUseCustomAllocation(false);
                          }}
                          max={totalUnpaidBalance}
                          min={1}
                        />
                        <small className="text-muted d-block mt-1">
                          Max balance: {naira(totalUnpaidBalance)}
                        </small>
                      </div>

                      <div className="col-12 col-md-6">
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4, display: "block" }}>
                          Payment Channel *
                        </label>
                        <select
                          className="form-select"
                          style={{ fontWeight: 600 }}
                          value={payAllMethod}
                          onChange={(e) => setPayAllMethod(e.target.value)}
                        >
                          <option value="Bank Transfer">Bank Transfer (Direct / Instant)</option>
                          <option value="Cash">Cash (Physical Cashier Receipt)</option>
                          <option value="POS">POS Terminal / Debit Card</option>
                          <option value="Cheque">Bank Cheque / Draft</option>
                          <option value="Online / Paystack">Online / Paystack Split</option>
                        </select>
                        <small className="text-muted d-block mt-1">
                          Select the authentic channel used by the parent
                        </small>
                      </div>
                    </div>

                    {/* Allocation Mode Tabs */}
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", margin: 0 }}>
                        Fee Allocation Breakdown:
                      </label>
                      <div className="d-flex gap-1" style={{ background: "#f1f5f9", padding: 3, borderRadius: 8 }}>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: 6,
                            background: !useCustomAllocation ? "#fff" : "transparent",
                            color: !useCustomAllocation ? "#0f2744" : "#64748b",
                            boxShadow: !useCustomAllocation ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                            border: "none",
                          }}
                          onClick={() => setUseCustomAllocation(false)}
                        >
                          ⚡ Smart Auto-Allocate
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: 6,
                            background: useCustomAllocation ? "#fff" : "transparent",
                            color: useCustomAllocation ? "#0f2744" : "#64748b",
                            boxShadow: useCustomAllocation ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                            border: "none",
                          }}
                          onClick={() => {
                            setUseCustomAllocation(true);
                            const sync: Record<number, string> = {};
                            unpaidFees.forEach((f) => {
                              sync[f.id] = String(computedAllocations[f.id] ?? 0);
                            });
                            setCustomAllocations(sync);
                          }}
                        >
                          ✏️ Custom Allocation
                        </button>
                      </div>
                    </div>

                    {/* Interactive Allocation Preview Table */}
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", marginBottom: 18 }}>
                      <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                            <th style={{ padding: "8px 12px", textAlign: "left" }}>Fee Item</th>
                            <th style={{ padding: "8px 12px", textAlign: "right" }}>Current Due</th>
                            <th style={{ padding: "8px 12px", textAlign: "right", width: useCustomAllocation ? 140 : 120 }}>
                              This Payment
                            </th>
                            <th style={{ padding: "8px 12px", textAlign: "right" }}>Remaining</th>
                            <th style={{ padding: "8px 12px", textAlign: "center", width: 90 }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unpaidFees.map((f) => {
                            const bal = Number(f.balance || 0);
                            const alloc = useCustomAllocation
                              ? Number(customAllocations[f.id] || 0)
                              : (computedAllocations[f.id] ?? 0);
                            const rem = Math.max(0, bal - alloc);
                            const isPaid = rem <= 0 && alloc > 0;

                            return (
                              <tr key={f.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "10px 12px" }}>
                                  <strong style={{ color: "#0f172a" }}>{getFeeName(f)}</strong>
                                  <div style={{ fontSize: 11, color: "#64748b" }}>
                                    Net: {naira(f.net_amount || f.total_amount)}
                                  </div>
                                </td>
                                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>
                                  {naira(bal)}
                                </td>
                                <td style={{ padding: "10px 12px", textAlign: "right" }}>
                                  {useCustomAllocation ? (
                                    <input
                                      type="number"
                                      className="form-control form-control-sm text-end"
                                      style={{ fontWeight: 700, color: "#15803d" }}
                                      value={customAllocations[f.id] ?? ""}
                                      max={bal}
                                      min={0}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setCustomAllocations((prev) => ({
                                          ...prev,
                                          [f.id]: v,
                                        }));
                                      }}
                                    />
                                  ) : (
                                    <span style={{ fontWeight: 800, color: alloc > 0 ? "#15803d" : "#94a3b8" }}>
                                      {naira(alloc)}
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: rem > 0 ? "#dc2626" : "#16a34a" }}>
                                  {naira(rem)}
                                </td>
                                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                  <span
                                    className={`sp-tag ${isPaid ? "sp-tag--green" : alloc > 0 ? "sp-tag--amber" : "sp-tag--red"}`}
                                    style={{ fontSize: 10.5 }}
                                  >
                                    {isPaid ? "Settled ✓" : alloc > 0 ? "Partial" : "Pending"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Payer Information */}
                    <div className="row g-2 mb-2">
                      <div className="col-12 col-md-4">
                        <label style={{ fontSize: 11.5, fontWeight: 700, color: "#475569", marginBottom: 3, display: "block" }}>
                          Payer Name (Parent / Guardian)
                        </label>
                        <input
                          className="form-control form-control-sm"
                          value={payAllPayerName}
                          onChange={(e) => setPayAllPayerName(e.target.value)}
                          placeholder="e.g. Mr. S. Adigun"
                        />
                      </div>
                      <div className="col-12 col-md-4">
                        <label style={{ fontSize: 11.5, fontWeight: 700, color: "#475569", marginBottom: 3, display: "block" }}>
                          Payer Phone Number
                        </label>
                        <input
                          className="form-control form-control-sm"
                          value={payAllPayerPhone}
                          onChange={(e) => setPayAllPayerPhone(e.target.value)}
                          placeholder="e.g. 08012345678"
                        />
                      </div>
                      <div className="col-12 col-md-4">
                        <label style={{ fontSize: 11.5, fontWeight: 700, color: "#475569", marginBottom: 3, display: "block" }}>
                          Transaction / Teller Ref (Optional)
                        </label>
                        <input
                          className="form-control form-control-sm"
                          value={payAllReference}
                          onChange={(e) => setPayAllReference(e.target.value)}
                          placeholder="e.g. GTB/TRF/..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="sp-card-head" style={{ background: "#f8fafc", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 13 }}>
                      Total Collection:{" "}
                      <strong style={{ fontSize: 16, color: "#15803d" }}>
                        {naira(Number(payAllAmount || 0))}
                      </strong>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="sp-outline-btn"
                        onClick={() => setShowPayAll(false)}
                        disabled={busyKey !== null}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="sp-gold-btn"
                        style={{
                          background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                          color: "#fff",
                          fontWeight: 700,
                        }}
                        onClick={handlePayAllSubmit}
                        disabled={busyKey !== null || Number(payAllAmount || 0) <= 0}
                      >
                        {busyKey === "fee:pay-bulk" ? "Processing Consolidated Settlement…" : `Confirm Consolidated Payment (${naira(Number(payAllAmount || 0))})`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                MODAL: OFFICIAL SERIALIZED SCHOOLPROFIT RECEIPT
            ========================================================= */}
            {showReceiptModal && activeReceipt && (
              <div className="sp-modal-mask" onClick={() => setShowReceiptModal(false)}>
                <div
                  className="sp-modal-content"
                  style={{ maxWidth: 660, padding: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* PRINTABLE RECEIPT CONTAINER */}
                  <div
                    id="schoolprofit-printable-receipt"
                    ref={receiptPrintRef}
                    style={{
                      background: "#ffffff",
                      padding: "32px",
                      position: "relative",
                      color: "#0f172a",
                      fontFamily: "system-ui, -apple-system, sans-serif",
                    }}
                  >
                    {/* Header: School Letterhead */}
                    <div style={{ textAlign: "center", borderBottom: "2px solid #0f2744", paddingBottom: 16, marginBottom: 20 }}>
                      {activeReceipt.school_logo && (
                        <img
                          src={activeReceipt.school_logo}
                          alt="School Logo"
                          style={{ maxHeight: 60, marginBottom: 8 }}
                        />
                      )}
                      <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px", color: "#0f2744", textTransform: "uppercase" }}>
                        {activeReceipt.school_name}
                      </h2>
                      {activeReceipt.school_address && (
                        <div style={{ fontSize: 12, color: "#475569" }}>{activeReceipt.school_address}</div>
                      )}
                      {activeReceipt.school_phone && (
                        <div style={{ fontSize: 12, color: "#475569" }}>Phone: {activeReceipt.school_phone}</div>
                      )}
                      <div
                        style={{
                          marginTop: 10,
                          display: "inline-block",
                          padding: "3px 14px",
                          borderRadius: 20,
                          background: "#0f2744",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        Official School Receipt
                      </div>
                    </div>

                    {/* Receipt Meta & QR Code Grid */}
                    <div className="d-flex justify-content-between align-items-start gap-4 mb-4">
                      <div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>Receipt Serial Number:</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#d97706", fontFamily: "monospace" }}>
                          {activeReceipt.receipt_number}
                        </div>

                        <div className="mt-2" style={{ fontSize: 12, color: "#64748b" }}>
                          Date & Time: <strong>{activeReceipt.date}</strong>
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          Payment Channel: <strong>{activeReceipt.payment_method}</strong>
                        </div>
                        {activeReceipt.reference && (
                          <div style={{ fontSize: 12, color: "#64748b" }}>
                            Ref: <strong>{activeReceipt.reference}</strong>
                          </div>
                        )}
                      </div>

                      {/* Tamper-Proof QR Code */}
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            padding: 6,
                            background: "#fff",
                            border: "1.5px solid #cbd5e1",
                            borderRadius: 8,
                            display: "inline-block",
                          }}
                        >
                          <QRCodeSVG 
                            value={
                              activeReceipt.qr_verify_url && activeReceipt.qr_verify_url.startsWith("http") && activeReceipt.qr_verify_url.includes(window.location.host)
                                ? activeReceipt.qr_verify_url
                                : `${window.location.origin}/receipt/verify/${activeReceipt.qr_code_token || activeReceipt.receipt_number}`
                            } 
                            size={90} 
                            level="M" 
                          />
                        </div>
                        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
                          Scan to Verify Seal
                        </div>
                      </div>
                    </div>

                    {/* Student & Payer Info */}
                    <div
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: 10,
                        padding: "12px 16px",
                        marginBottom: 20,
                      }}
                    >
                      <div className="row g-2" style={{ fontSize: 12.5 }}>
                        <div className="col-6">
                          <span style={{ color: "#64748b" }}>Student Name:</span>{" "}
                          <strong>{activeReceipt.student_name}</strong>
                        </div>
                        <div className="col-6">
                          <span style={{ color: "#64748b" }}>Admission / Reg No:</span>{" "}
                          <strong>{activeReceipt.admission_no}</strong>
                        </div>
                        <div className="col-6">
                          <span style={{ color: "#64748b" }}>Section:</span>{" "}
                          <strong>{activeReceipt.section_name}</strong>
                        </div>
                        <div className="col-6">
                          <span style={{ color: "#64748b" }}>Academic Period:</span>{" "}
                          <strong>{activeReceipt.session_name} • {activeReceipt.term_name}</strong>
                        </div>
                        {activeReceipt.payer_name && (
                          <div className="col-12 border-top pt-2 mt-2">
                            <span style={{ color: "#64748b" }}>Received From (Payer):</span>{" "}
                            <strong>{activeReceipt.payer_name}</strong>
                            {activeReceipt.payer_phone && ` (${activeReceipt.payer_phone})`}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Breakdown Ledger Table */}
                    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                          <th style={{ padding: "8px 10px", textAlign: "left" }}>Description</th>
                          <th style={{ padding: "8px 10px", textAlign: "right" }}>Gross</th>
                          <th style={{ padding: "8px 10px", textAlign: "right" }}>Concession</th>
                          <th style={{ padding: "8px 10px", textAlign: "right" }}>Net Payable</th>
                          <th style={{ padding: "8px 10px", textAlign: "right" }}>Amount Received</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeReceipt.items && activeReceipt.items.length > 0 ? (
                          activeReceipt.items.map((it, idx) => (
                            <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                              <td style={{ padding: "10px", fontWeight: 600 }}>{it.fee_name}</td>
                              <td style={{ padding: "10px", textAlign: "right" }}>{naira(it.gross_amount)}</td>
                              <td style={{ padding: "10px", textAlign: "right", color: "#7c3aed" }}>
                                {it.discount_amount > 0 ? `-${naira(it.discount_amount)}` : "—"}
                              </td>
                              <td style={{ padding: "10px", textAlign: "right", fontWeight: 700 }}>
                                {naira(it.net_amount)}
                              </td>
                              <td style={{ padding: "10px", textAlign: "right", fontWeight: 800, color: "#16a34a" }}>
                                {naira(it.amount_paid)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "10px", fontWeight: 600 }}>{activeReceipt.fee_name}</td>
                            <td style={{ padding: "10px", textAlign: "right" }}>{naira(activeReceipt.gross_amount)}</td>
                            <td style={{ padding: "10px", textAlign: "right", color: "#7c3aed" }}>
                              {activeReceipt.discount_amount > 0 ? `-${naira(activeReceipt.discount_amount)}` : "—"}
                            </td>
                            <td style={{ padding: "10px", textAlign: "right", fontWeight: 700 }}>
                              {naira(activeReceipt.net_amount)}
                            </td>
                            <td style={{ padding: "10px", textAlign: "right", fontWeight: 800, color: "#16a34a" }}>
                              {naira(activeReceipt.amount_paid)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Summary Totals & Balance */}
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
                      <div style={{ width: 280, fontSize: 13 }}>
                        <div className="d-flex justify-content-between mb-1">
                          <span style={{ color: "#64748b" }}>Amount Received:</span>
                          <strong style={{ color: "#16a34a", fontSize: 15 }}>{naira(activeReceipt.amount_paid)}</strong>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span style={{ color: "#64748b" }}>Remaining Balance:</span>
                          <strong style={{ color: activeReceipt.balance > 0 ? "#dc2626" : "#16a34a" }}>
                            {naira(activeReceipt.balance)}
                          </strong>
                        </div>
                        <div
                          style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            background: activeReceipt.balance <= 0 ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                            color: activeReceipt.balance <= 0 ? "#15803d" : "#b45309",
                            fontSize: 12,
                            fontWeight: 700,
                            textAlign: "center",
                          }}
                        >
                          Status: {activeReceipt.status.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    {/* Sign-off & Watermark */}
                    <div className="d-flex justify-content-between align-items-end pt-3 border-top" style={{ fontSize: 12 }}>
                      <div>
                        <div style={{ color: "#64748b" }}>Received By (Bursar):</div>
                        <strong style={{ fontSize: 13, color: "#0f172a" }}>{activeReceipt.bursar_name}</strong>
                        <div style={{ height: 1, width: 140, background: "#cbd5e1", marginTop: 18 }} />
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>Authorized School Cashier</div>
                      </div>

                      <div style={{ textAlign: "right", color: "#94a3b8", fontSize: 11 }}>
                        <div>SchoolProfit Financial Cloud System</div>
                        <div>Official Tamper-Proof Electronic Receipt</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar (Excluded from print) */}
                  <div className="no-print sp-card-head" style={{ background: "#f8fafc", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>
                      Serial: {activeReceipt.receipt_number}
                    </span>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="sp-gold-btn"
                        onClick={handlePrintReceipt}
                      >
                        🖨️ Print Official Receipt
                      </button>
                      <button
                        type="button"
                        className="sp-outline-btn"
                        onClick={() => setShowReceiptModal(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-auto pt-4 no-print">
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}