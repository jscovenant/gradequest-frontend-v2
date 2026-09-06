// src/pages/Admin/Fees/FeeMethodsPage.tsx
import { useEffect, useMemo, useState } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";

import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";
import { Link } from "react-router-dom";

/* =========================
   TYPES
========================= */
type StudentSearchItem = {
  id: number;
  firstname: string;
  surname: string;
  reg_no: string;
  section_id?: number | null;
  level_id?: number | null;
};

type FeeStatus = "paid" | "partial" | "unpaid";

type StudentFeeDetails = {
  student: {
    id: number;
    name: string;
    reg_no: string;
    section: string;
    class: string;
  };
  fees: Array<{
    id: number;
    fee_type_id: number;
    section_id: number;
    term_id: number;
    session_id: number;
    total_amount: number;
    amount_paid: number;
    balance: number;
    status?: FeeStatus;
    fee_type?: { id: number; name: string; amount: number };
    session?: { id: number; name: string };
    term?: { id: number; name: string };
  }>;
};

type Option = { id: number; name: string };
type FeeType = { id: number; name: string; amount: number };

/* =========================
   PAYSTACK INLINE
========================= */
declare global {
  interface Window {
    PaystackPop?: new () => {
      resumeTransaction: (
        accessCode: string,
        handlers: {
          onSuccess?: (transaction: { reference: string }) => void;
          onCancel?: () => void;
          onError?: (error: { message: string }) => void;
        }
      ) => void;
    };
  }
}

let paystackScriptPromise: Promise<void> | null = null;

function loadPaystackInline(): Promise<void> {
  if (window.PaystackPop) return Promise.resolve();
  if (paystackScriptPromise) return paystackScriptPromise;

  paystackScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v2/inline.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Paystack checkout."));
    document.body.appendChild(script);
  });

  return paystackScriptPromise;
}

/* =========================
   HELPERS
========================= */
function getErrorMessage(err: any): string {
  const status = err?.response?.status;
  const data = err?.response?.data;
  if (status === 409) return data?.message ?? data?.error ?? "This fee is already assigned.";
  if (status === 404) return data?.message ?? "Resource not found.";
  if (status === 422) return data?.message ?? "Please verify all required fields.";
  return data?.message ?? err?.message ?? "Something went wrong.";
}

function naira(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return v.toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
}

/* =========================
   PAGE COMPONENT
========================= */
export default function FeeMethodsPage() {
  const { showSuccess, showError, showWarning } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);

  // Dropdown options
  const [sections, setSections] = useState<Option[]>([]);
  const [sessions, setSessions] = useState<Option[]>([]);
  const [terms, setTerms] = useState<Option[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Student search
  const [regNo, setRegNo] = useState("");
  const [searchingStudent, setSearchingStudent] = useState(false);
  const [studentPick, setStudentPick] = useState<StudentSearchItem | null>(null);

  // Fee context
  const [sectionId, setSectionId] = useState<number | "">("");
  const [sessionId, setSessionId] = useState<number | "">("");
  const [termId, setTermId] = useState<number | "">("");

  // Fee types to assign
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [loadingFeeTypes, setLoadingFeeTypes] = useState(false);
  const [selectedFeeTypeIds, setSelectedFeeTypeIds] = useState<Record<number, boolean>>({});

  // Student fee details & ledger
  const [details, setDetails] = useState<StudentFeeDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Online collection modal
  const [collectTarget, setCollectTarget] = useState<{ id: number; label: string; balance: number } | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectEmail, setCollectEmail] = useState("");
  const [collecting, setCollecting] = useState(false);
  const [collectError, setCollectError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setLoadingPage(false), 80);
    return () => window.clearTimeout(t);
  }, []);

  /* =========================
     LOAD METADATA
  ========================= */
  useEffect(() => {
    let mounted = true;

    async function fetchMetadata() {
      try {
        setLoadingMeta(true);
        const [secRes, sesRes, termRes] = await Promise.all([
          authApi.get("/sections"),
          authApi.get("/facademic-sessions"),
          authApi.get("/fterms"),
        ]);

        if (!mounted) return;

        const rawSec = secRes.data?.data ?? secRes.data ?? [];
        const secArr: Option[] = Array.isArray(rawSec) ? rawSec.map((s: any) => ({ id: s.id, name: s.name })) : [];
        setSections(secArr);

        const rawSes = sesRes.data?.data ?? sesRes.data ?? [];
        const sesArr: Option[] = (Array.isArray(rawSes) ? rawSes : []).map((s: any) => ({
          id: s.id,
          name: s.name ?? s.session ?? s.title ?? "",
        }));
        setSessions(sesArr);
        if (sesArr.length > 0 && !sessionId) {
          setSessionId(sesArr[0].id);
        }

        const rawTerms = termRes.data?.data ?? termRes.data ?? [];
        const termArr: Option[] = (Array.isArray(rawTerms) ? rawTerms : []).map((t: any) => ({
          id: t.id,
          name: t.name ?? t.term ?? "",
        }));
        setTerms(termArr);
        if (termArr.length > 0 && !termId) {
          setTermId(termArr[0].id);
        }
      } catch (e: any) {
        console.error(e);
        showError(getErrorMessage(e) || "Failed to load fee configuration options.");
      } finally {
        if (mounted) setLoadingMeta(false);
      }
    }

    fetchMetadata();
    return () => {
      mounted = false;
    };
  }, []);

  /* =========================
     STUDENT SEARCH
  ========================= */
  async function searchStudentByReg() {
    const q = regNo.trim();
    if (!q) return showWarning("Please enter a student admission or registration number.");

    try {
      setSearchingStudent(true);
      const res = await authApi.get("/students/search", { params: { query: q } });
      const list = res.data?.data ?? res.data ?? [];
      const arr: StudentSearchItem[] = Array.isArray(list) ? list : [];

      const exact = arr.find((s) => (s.reg_no ?? "").toLowerCase() === q.toLowerCase());
      const pick = exact ?? arr[0];

      if (!pick) {
        setStudentPick(null);
        setDetails(null);
        return showError("No student found matching that registration number.");
      }

      setStudentPick(pick);
      if (pick.section_id) {
        setSectionId(pick.section_id);
      }

      showSuccess(`Found student: ${pick.firstname} ${pick.surname}`);

      // Auto load fees & ledger
      await loadStudentFeeDetailsDirect(pick.reg_no);
    } catch (e: any) {
      console.error(e);
      showError(getErrorMessage(e) || "Failed to search student.");
    } finally {
      setSearchingStudent(false);
    }
  }

  /* =========================
     AUTO FETCH FEE TYPES
  ========================= */
  useEffect(() => {
    if (studentPick?.id && sectionId && sessionId && termId) {
      void fetchFeeTypesForStudent(studentPick.id, Number(sectionId), Number(sessionId), Number(termId));
    }
  }, [studentPick?.id, sectionId, sessionId, termId]);

  async function fetchFeeTypesForStudent(sId: number, secId: number, sesId: number, tId: number) {
    try {
      setLoadingFeeTypes(true);
      setSelectedFeeTypeIds({});

      const res = await authApi.post("/fees/fetch-types", {
        student_id: sId,
        section_id: secId,
        session_id: sesId,
        term_id: tId,
      });

      const ft: FeeType[] = Array.isArray(res.data?.fee_types) ? res.data.fee_types : [];
      setFeeTypes(ft);
    } catch (e: any) {
      console.error(e);
      setFeeTypes([]);
    } finally {
      setLoadingFeeTypes(false);
    }
  }

  /* =========================
     ASSIGN FEES
  ========================= */
  const selectedFeeIds = useMemo(
    () => Object.entries(selectedFeeTypeIds).filter(([_, v]) => v).map(([k]) => Number(k)),
    [selectedFeeTypeIds]
  );

  const totalSelectedAmount = useMemo(() => {
    if (!feeTypes.length) return 0;
    const map = new Map<number, FeeType>(feeTypes.map((f) => [f.id, f]));
    return selectedFeeIds.reduce((sum, id) => sum + (map.get(id)?.amount ?? 0), 0);
  }, [selectedFeeIds, feeTypes]);

  function toggleFee(id: number) {
    setSelectedFeeTypeIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function selectAllFees() {
    const next: Record<number, boolean> = {};
    feeTypes.forEach((f) => (next[f.id] = true));
    setSelectedFeeTypeIds(next);
  }

  function clearFeeSelection() {
    setSelectedFeeTypeIds({});
  }

  async function assignFees() {
    if (!studentPick?.id) return showError("Please search and select a student first.");
    if (!sectionId || !sessionId || !termId) return showError("Please select Section, Session, and Term.");
    if (selectedFeeIds.length === 0) return showError("Select at least one fee type to assign.");

    try {
      setBusyKey("fees:assign");
      const res = await authApi.post("/fees/assign", {
        student_id: studentPick.id,
        section_id: Number(sectionId),
        session_id: Number(sessionId),
        term_id: Number(termId),
        fee_type_ids: selectedFeeIds,
      });

      showSuccess(res.data?.message ?? "Fee(s) assigned successfully.");
      await loadStudentFeeDetailsDirect(studentPick.reg_no);
      clearFeeSelection();
    } catch (e: any) {
      console.error(e);
      showError(getErrorMessage(e));
    } finally {
      setBusyKey(null);
    }
  }

  /* =========================
     STUDENT FEE DETAILS / LEDGER
  ========================= */
  async function loadStudentFeeDetailsDirect(targetRegNo: string) {
    if (!targetRegNo.trim()) return;

    try {
      setLoadingDetails(true);
      const res = await authApi.get<StudentFeeDetails>("/fees/student/details", {
        params: {
          reg_no: targetRegNo.trim(),
          session_id: sessionId || undefined,
          term_id: termId || undefined,
        },
      });
      setDetails(res.data);
    } catch (e: any) {
      console.error(e);
      setDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  }

  async function removeAssignedFee(studentFeeId: number) {
    const ok = window.confirm("Are you sure you want to remove this fee assignment? (Paid fees cannot be removed)");
    if (!ok) return;

    try {
      setBusyKey(`fees:remove:${studentFeeId}`);
      const res = await authApi.delete(`/student-fees/${studentFeeId}`);
      showSuccess(res.data?.message ?? "Fee assignment removed.");
      if (studentPick?.reg_no) {
        await loadStudentFeeDetailsDirect(studentPick.reg_no);
      }
    } catch (e: any) {
      console.error(e);
      showError(getErrorMessage(e));
    } finally {
      setBusyKey(null);
    }
  }

  /* =========================
     ONLINE PAYMENT MODAL
  ========================= */
  function openCollectModal(fee: StudentFeeDetails["fees"][number]) {
    setCollectTarget({
      id: fee.id,
      label: fee.fee_type?.name ?? `Fee #${fee.id}`,
      balance: fee.balance,
    });
    setCollectAmount(String(fee.balance));
    setCollectEmail("");
    setCollectError(null);
  }

  function closeCollectModal() {
    if (collecting) return;
    setCollectTarget(null);
  }

  async function handleCollectPayment() {
    if (!collectTarget) return;

    const amount = Number(collectAmount);
    if (!amount || amount < 100) {
      setCollectError("Enter an amount of at least ₦100.");
      return;
    }
    if (amount > collectTarget.balance) {
      setCollectError(`Amount cannot exceed outstanding balance of ${naira(collectTarget.balance)}.`);
      return;
    }
    if (!collectEmail.trim()) {
      setCollectError("Enter the parent or payer email address for receipt.");
      return;
    }

    setCollectError(null);
    setCollecting(true);

    try {
      const { data } = await authApi.post("/fees/online/initialize", {
        student_fee_id: collectTarget.id,
        amount,
        email: collectEmail.trim(),
      });

      await loadPaystackInline();
      setCollectTarget(null);

      const popup = new window.PaystackPop!();
      popup.resumeTransaction(data.access_code, {
        onSuccess: async (transaction) => {
          try {
            await authApi.get(`/fees/online/verify/${transaction.reference}`);
            showSuccess("Payment completed successfully!");
          } catch {
            showWarning("Payment processed. Updating records...");
          } finally {
            setCollecting(false);
            if (studentPick?.reg_no) {
              await loadStudentFeeDetailsDirect(studentPick.reg_no);
            }
          }
        },
        onCancel: () => {
          setCollecting(false);
          showWarning("Payment was cancelled.");
        },
        onError: (err) => {
          setCollecting(false);
          showError(err?.message || "Payment could not be completed.");
        },
      });
    } catch (e: any) {
      console.error(e);
      setCollecting(false);
      setCollectError(getErrorMessage(e));
    }
  }

  /* =========================
     DERIVED LEDGER STATS
  ========================= */
  const ledgerTotals = useMemo(() => {
    const fees = details?.fees ?? [];
    const totalAmount = fees.reduce((a, f) => a + Number(f.total_amount ?? 0), 0);
    const totalPaid = fees.reduce((a, f) => a + Number(f.amount_paid ?? 0), 0);
    const totalBal = fees.reduce((a, f) => a + Number(f.balance ?? 0), 0);
    const percent = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;
    return { totalAmount, totalPaid, totalBal, count: fees.length, percent };
  }, [details]);

  return (
    <>
      <PageTitle title="Fee Assignments & Allocations" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .fa-main {
          min-height: 100vh;
          background: #F8FAFC;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: calc(var(--gq-topnav-height, 66px) + 20px) 24px 48px;
          overflow-x: hidden;
          box-sizing: border-box;
        }
        @media(max-width: 767.98px) {
          .fa-main { padding: calc(var(--gq-topnav-height, 66px) + 12px) 12px 36px; }
        }
        .fa-shell { max-width: 1280px; margin: 0 auto; width: 100%; }
        
        /* Hero Banner */
        .fa-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 28px 32px;
          color: #fff;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
          margin-bottom: 22px;
        }
        @media(max-width: 767.98px) {
          .fa-hero { padding: 20px 16px; border-radius: 14px; }
        }
        .fa-hero-glow {
          position: absolute;
          top: -60px;
          right: -60px;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.15) 0%, transparent 65%);
          pointer-events: none;
        }
        .fa-hero h1 { font-size: 24px; font-weight: 800; margin: 0 0 6px; color: #fff; }
        @media(max-width: 767.98px) { .fa-hero h1 { font-size: 19px; } }
        .fa-hero p { margin: 0; color: #CBD5E1; font-size: 13.5px; max-width: 680px; line-height: 1.55; }
        .fa-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #FBBF24;
          background: rgba(217, 119, 6, 0.20);
          border: 1px solid rgba(217, 119, 6, 0.35);
          border-radius: 100px;
          padding: 4px 10px;
          margin-bottom: 10px;
        }
        .fa-hero-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
        .fa-btn-gold {
          background: #D97706;
          color: #fff;
          font-weight: 700;
          font-size: 13px;
          padding: 8px 16px;
          border-radius: 10px;
          border: none;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .fa-btn-gold:hover { background: #B45309; color: #fff; transform: translateY(-1px); }
        .fa-btn-soft {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          font-weight: 600;
          font-size: 13px;
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          cursor: pointer;
        }
        .fa-btn-soft:hover { background: rgba(255, 255, 255, 0.20); color: #fff; }

        /* Main Workspace Grid */
        .fa-grid {
          display: grid;
          grid-template-columns: 460px minmax(0, 1fr);
          gap: 20px;
          align-items: start;
        }
        @media(max-width: 1024px) {
          .fa-grid { grid-template-columns: 1fr; }
        }

        /* Panels */
        .fa-card {
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(15, 39, 68, 0.03);
          overflow: hidden;
          margin-bottom: 18px;
        }
        .fa-card-head {
          padding: 16px 20px;
          border-bottom: 1px solid #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: #fff;
        }
        .fa-card-title {
          font-size: 15px;
          font-weight: 800;
          color: #0F2744;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .fa-card-body { padding: 18px 20px; }
        @media(max-width: 767.98px) {
          .fa-card-body { padding: 14px 14px; }
        }

        /* Step numbers */
        .fa-step-badge {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #0F2744;
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        /* Inputs & Dropdowns */
        .fa-label {
          display: block;
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: #475569;
          margin-bottom: 6px;
        }
        .fa-input, .fa-select {
          width: 100%;
          border: 1px solid #CBD5E1;
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 13.5px;
          font-weight: 600;
          color: #0F2744;
          background: #F8FAFC;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .fa-input:focus, .fa-select:focus {
          border-color: #D97706;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.12);
        }

        /* Student Identity Card */
        .fa-student-card {
          background: linear-gradient(135deg, #F8FAFC 0%, #EEF2F6 100%);
          border: 1px solid #CBD5E1;
          border-radius: 12px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 12px;
        }
        .fa-student-avatar {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: #0F2744;
          color: #FBBF24;
          font-weight: 800;
          font-size: 16px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .fa-student-info h4 { font-size: 14.5px; font-weight: 800; margin: 0 0 2px; color: #0F2744; }
        .fa-student-info p { font-size: 12px; color: #64748B; margin: 0; }

        /* Fee Checklist */
        .fa-fee-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 11px 14px;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          margin-bottom: 8px;
          background: #fff;
          cursor: pointer;
          transition: all 0.15s;
        }
        .fa-fee-item:hover { border-color: #CBD5E1; background: #F8FAFC; }
        .fa-fee-item.selected {
          border-color: #D97706;
          background: #FFFBEB;
        }
        .fa-fee-info strong { display: block; font-size: 13.5px; color: #0F2744; }
        .fa-fee-info span { font-size: 12px; color: #64748B; }
        .fa-fee-amount { font-size: 14px; font-weight: 800; color: #0F2744; }

        /* Ledger Summary Tiles */
        .fa-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        @media(max-width: 640px) {
          .fa-stat-grid { grid-template-columns: 1fr; gap: 8px; }
        }
        .fa-stat-tile {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 14px;
        }
        .fa-stat-tile span { display: block; font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; }
        .fa-stat-tile strong { display: block; font-size: 18px; font-weight: 800; color: #0F2744; margin-top: 4px; }
        .fa-stat-tile.bal strong { color: #DC2626; }
        .fa-stat-tile.paid strong { color: #16A34A; }

        /* Status Pills */
        .fa-pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          text-transform: capitalize;
        }
        .fa-pill-paid { background: #DCFCE7; color: #166534; }
        .fa-pill-partial { background: #FEF3C7; color: #92400E; }
        .fa-pill-unpaid { background: #FEE2E2; color: #991B1B; }

        /* Ledger Table */
        .fa-table-wrap {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          margin-top: 10px;
        }
        .fa-table {
          width: 100%;
          min-width: 640px;
          border-collapse: collapse;
          font-size: 13px;
        }
        .fa-table th {
          background: #F8FAFC;
          color: #475569;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.03em;
          padding: 11px 14px;
          border-bottom: 1px solid #E2E8F0;
          text-align: left;
        }
        .fa-table td {
          padding: 12px 14px;
          border-bottom: 1px solid #F1F5F9;
          vertical-align: middle;
          color: #334155;
        }
        .fa-table tr:last-child td { border-bottom: none; }
        .fa-table tr:hover td { background: #F8FAFC; }

        /* Actions */
        .fa-action-btn {
          border: 1px solid #E2E8F0;
          background: #fff;
          color: #0F2744;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .fa-action-btn:hover { background: #F1F5F9; border-color: #CBD5E1; }
        .fa-action-btn.pay {
          background: #0F2744;
          color: #fff;
          border-color: #0F2744;
        }
        .fa-action-btn.pay:hover { background: #1E3A8A; }
        .fa-action-btn.del { color: #DC2626; }
        .fa-action-btn.del:hover { background: #FEE2E2; border-color: #FECACA; }

        /* Modal */
        .fa-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 39, 68, 0.6);
          backdrop-filter: blur(4px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .fa-modal {
          background: #fff;
          border-radius: 16px;
          width: min(480px, 100%);
          box-shadow: 0 20px 60px rgba(15, 39, 68, 0.2);
          overflow: hidden;
        }
        .fa-modal-head {
          padding: 16px 20px;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .fa-modal-head h3 { font-size: 16px; font-weight: 800; margin: 0; color: #0F2744; }
        .fa-modal-body { padding: 20px; }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Fee Assignments & Allocations" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          
          <main className="col-md-9 col-lg-10 ms-auto db-main fa-main">
            {loadingPage && <Loader message="Loading Fee Management..." />}

            <div className="fa-shell">
              {/* Header Hero */}
              <section className="fa-hero">
                <div className="fa-hero-glow" />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <span className="fa-badge">
                    <i className="bi bi-shield-check me-1" /> Student Fee Management
                  </span>
                  <h1>Fee Assignments & Allocations</h1>
                  <p>
                    Assign termly tuition, levies, and school fees to students, inspect live financial ledgers, and collect instant payments.
                  </p>
                  <div className="fa-hero-actions">
                    <Link to="/fees/structure" className="fa-btn-soft">
                      <i className="bi bi-gear me-1" /> Configure Fee Structures
                    </Link>
                    <Link to="/fees/payments" className="fa-btn-soft">
                      <i className="bi bi-wallet2 me-1" /> View All Student Payments
                    </Link>
                  </div>
                </div>
              </section>

              {/* Workspace Grid */}
              <div className="fa-grid">
                {/* LEFT: Assignment Studio */}
                <div>
                  {/* Step 1: Student Lookup */}
                  <div className="fa-card">
                    <div className="fa-card-head">
                      <div className="fa-card-title">
                        <span className="fa-step-badge">1</span> Student Lookup
                      </div>
                      {studentPick && (
                        <button
                          className="btn btn-sm btn-link text-muted p-0 text-decoration-none"
                          onClick={() => {
                            setStudentPick(null);
                            setDetails(null);
                            setRegNo("");
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="fa-card-body">
                      <label className="fa-label">Admission / Reg Number</label>
                      <div className="d-flex gap-2">
                        <input
                          className="fa-input"
                          placeholder="e.g. GQ/2026/001"
                          value={regNo}
                          onChange={(e) => setRegNo(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && searchStudentByReg()}
                        />
                        <button
                          className="fa-btn-gold"
                          onClick={searchStudentByReg}
                          disabled={searchingStudent || !regNo.trim()}
                        >
                          {searchingStudent ? "Finding..." : "Find"}
                        </button>
                      </div>

                      {studentPick && (
                        <div className="fa-student-card">
                          <div className="fa-student-avatar">
                            {studentPick.firstname?.charAt(0) || "S"}
                          </div>
                          <div className="fa-student-info">
                            <h4>{studentPick.firstname} {studentPick.surname}</h4>
                            <p>Reg No: <strong>{studentPick.reg_no}</strong></p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Academic Period & Section */}
                  <div className="fa-card">
                    <div className="fa-card-head">
                      <div className="fa-card-title">
                        <span className="fa-step-badge">2</span> Billing Period
                      </div>
                    </div>
                    <div className="fa-card-body">
                      <div className="row g-2">
                        <div className="col-12 col-sm-6">
                          <label className="fa-label">Academic Session</label>
                          <select
                            className="fa-select"
                            value={sessionId}
                            onChange={(e) => setSessionId(e.target.value ? Number(e.target.value) : "")}
                          >
                            <option value="">Select Session</option>
                            {sessions.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-12 col-sm-6">
                          <label className="fa-label">Term</label>
                          <select
                            className="fa-select"
                            value={termId}
                            onChange={(e) => setTermId(e.target.value ? Number(e.target.value) : "")}
                          >
                            <option value="">Select Term</option>
                            {terms.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-12">
                          <label className="fa-label">Class Section</label>
                          <select
                            className="fa-select"
                            value={sectionId}
                            onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : "")}
                          >
                            <option value="">Select Section / Class</option>
                            {sections.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Applicable Fee Types Checklist */}
                  <div className="fa-card">
                    <div className="fa-card-head">
                      <div className="fa-card-title">
                        <span className="fa-step-badge">3</span> Select & Assign Fees
                      </div>
                      {feeTypes.length > 0 && (
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-outline-secondary py-0 px-2" onClick={selectAllFees}>
                            All
                          </button>
                          <button className="btn btn-sm btn-outline-secondary py-0 px-2" onClick={clearFeeSelection}>
                            None
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="fa-card-body">
                      {loadingFeeTypes ? (
                        <div className="text-center py-4 text-muted">
                          <div className="spinner-border spinner-border-sm me-2" /> Loading fee types...
                        </div>
                      ) : !studentPick ? (
                        <div className="text-center py-4 text-muted" style={{ fontSize: 13 }}>
                          Search and select a student above to view applicable fee types.
                        </div>
                      ) : feeTypes.length === 0 ? (
                        <div className="text-center py-4 text-muted" style={{ fontSize: 13 }}>
                          No fee types configured for this section and period.
                        </div>
                      ) : (
                        <div>
                          {feeTypes.map((f) => {
                            const isSelected = !!selectedFeeTypeIds[f.id];
                            return (
                              <div
                                key={f.id}
                                className={`fa-fee-item ${isSelected ? "selected" : ""}`}
                                onClick={() => toggleFee(f.id)}
                              >
                                <div className="d-flex align-items-center gap-2">
                                  <input
                                    type="checkbox"
                                    className="form-check-input mt-0"
                                    checked={isSelected}
                                    onChange={() => toggleFee(f.id)}
                                  />
                                  <div className="fa-fee-info">
                                    <strong>{f.name}</strong>
                                  </div>
                                </div>
                                <div className="fa-fee-amount">{naira(f.amount)}</div>
                              </div>
                            );
                          })}

                          {selectedFeeIds.length > 0 && (
                            <div className="mt-3 p-3 bg-light rounded-3 d-flex justify-content-between align-items-center">
                              <div>
                                <small className="text-muted d-block">Selected {selectedFeeIds.length} fee(s)</small>
                                <strong className="text-primary fs-6">{naira(totalSelectedAmount)}</strong>
                              </div>
                              <button
                                className="fa-btn-gold"
                                onClick={assignFees}
                                disabled={busyKey === "fees:assign"}
                              >
                                {busyKey === "fees:assign" ? "Assigning..." : "Assign to Student"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT: Live Student Fee Ledger */}
                <div>
                  <div className="fa-card">
                    <div className="fa-card-head">
                      <div className="fa-card-title">
                        <i className="bi bi-journal-check text-primary" /> Student Financial Ledger
                      </div>
                      {details?.student && (
                        <span className="badge bg-light text-dark border">
                          {details.student.class || details.student.section || "Student"}
                        </span>
                      )}
                    </div>
                    <div className="fa-card-body">
                      {loadingDetails ? (
                        <div className="text-center py-5 text-muted">
                          <div className="spinner-border spinner-border-sm me-2" /> Loading student ledger...
                        </div>
                      ) : !details ? (
                        <div className="text-center py-5 text-muted">
                          <i className="bi bi-search display-6 d-block mb-2 text-secondary opacity-50" />
                          <h6 className="fw-bold text-dark">No Student Selected</h6>
                          <p className="small text-muted mb-0">Search a student by registration number on the left to inspect their fees and payments.</p>
                        </div>
                      ) : (
                        <div>
                          {/* Top 3 Summary Tiles */}
                          <div className="fa-stat-grid">
                            <div className="fa-stat-tile">
                              <span>Total Assigned</span>
                              <strong>{naira(ledgerTotals.totalAmount)}</strong>
                            </div>
                            <div className="fa-stat-tile paid">
                              <span>Total Paid</span>
                              <strong>{naira(ledgerTotals.totalPaid)}</strong>
                            </div>
                            <div className="fa-stat-tile bal">
                              <span>Outstanding</span>
                              <strong>{naira(ledgerTotals.totalBal)}</strong>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-4">
                            <div className="d-flex justify-content-between small text-muted mb-1 font-monospace">
                              <span>Payment Progress</span>
                              <span>{ledgerTotals.percent}%</span>
                            </div>
                            <div className="progress" style={{ height: 8, borderRadius: 4 }}>
                              <div
                                className={`progress-bar ${ledgerTotals.percent === 100 ? "bg-success" : "bg-warning"}`}
                                style={{ width: `${ledgerTotals.percent}%` }}
                              />
                            </div>
                          </div>

                          {/* Assigned Fee Table */}
                          <h6 className="fw-bold text-dark mb-2">Assigned Fee Items</h6>
                          {details.fees.length === 0 ? (
                            <div className="p-4 bg-light rounded-3 text-center text-muted small">
                              No fees assigned for this student yet. Use Step 3 to assign fees.
                            </div>
                          ) : (
                            <div className="fa-table-wrap">
                              <table className="fa-table">
                                <thead>
                                  <tr>
                                    <th>Fee Item</th>
                                    <th>Total</th>
                                    <th>Paid</th>
                                    <th>Balance</th>
                                    <th>Status</th>
                                    <th className="text-end">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {details.fees.map((f) => (
                                    <tr key={f.id}>
                                      <td>
                                        <strong>{f.fee_type?.name || `Fee #${f.fee_type_id}`}</strong>
                                        <div className="small text-muted">{f.session?.name} • {f.term?.name}</div>
                                      </td>
                                      <td>{naira(f.total_amount)}</td>
                                      <td className="text-success fw-bold">{naira(f.amount_paid)}</td>
                                      <td className={f.balance > 0 ? "text-danger fw-bold" : "text-muted"}>
                                        {naira(f.balance)}
                                      </td>
                                      <td>
                                        <span className={`fa-pill fa-pill-${f.status || (f.balance === 0 ? "paid" : "unpaid")}`}>
                                          {f.status || (f.balance === 0 ? "paid" : "unpaid")}
                                        </span>
                                      </td>
                                      <td className="text-end">
                                        <div className="d-inline-flex gap-2">
                                          {f.balance > 0 && (
                                            <button
                                              className="fa-action-btn pay"
                                              onClick={() => openCollectModal(f)}
                                              title="Collect payment online via Paystack"
                                            >
                                              <i className="bi bi-credit-card" /> Pay
                                            </button>
                                          )}
                                          {f.amount_paid === 0 && (
                                            <button
                                              className="fa-action-btn del"
                                              onClick={() => removeAssignedFee(f.id)}
                                              disabled={busyKey === `fees:remove:${f.id}`}
                                              title="Remove assigned fee"
                                            >
                                              <i className="bi bi-trash" />
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Footer />
          </main>
        </div>
      </div>

      {/* Online Payment Modal */}
      {collectTarget && (
        <div className="fa-modal-backdrop" onClick={closeCollectModal}>
          <div className="fa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fa-modal-head">
              <h3>Collect Fee Payment</h3>
              <button className="btn-close" onClick={closeCollectModal} disabled={collecting} />
            </div>
            <div className="fa-modal-body">
              <div className="p-3 bg-light rounded-3 mb-3">
                <small className="text-muted d-block">Fee Item</small>
                <strong className="fs-6 text-dark">{collectTarget.label}</strong>
                <div className="d-flex justify-content-between mt-2 pt-2 border-top">
                  <span className="small text-muted">Outstanding Balance</span>
                  <span className="fw-bold text-danger">{naira(collectTarget.balance)}</span>
                </div>
              </div>

              {collectError && (
                <div className="alert alert-danger py-2 small mb-3">
                  {collectError}
                </div>
              )}

              <div className="mb-3">
                <label className="fa-label">Amount to Collect (₦)</label>
                <input
                  type="number"
                  className="fa-input"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  placeholder="Enter amount"
                  disabled={collecting}
                />
              </div>

              <div className="mb-4">
                <label className="fa-label">Payer / Parent Email (for receipt)</label>
                <input
                  type="email"
                  className="fa-input"
                  value={collectEmail}
                  onChange={(e) => setCollectEmail(e.target.value)}
                  placeholder="parent@example.com"
                  disabled={collecting}
                />
              </div>

              <div className="d-grid">
                <button
                  className="fa-btn-gold justify-content-center py-2 fs-6"
                  onClick={handleCollectPayment}
                  disabled={collecting}
                >
                  {collecting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" /> Initializing Paystack...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-credit-card me-2" /> Make Payment with Paystack
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
