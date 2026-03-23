// src/pages/Fees/ReceiptApprovalPage.tsx
import { useEffect, useMemo, useState } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import { jsPDF } from "jspdf";
import PageTitle from "../../../components/PageTitle";

/* =========================
   TYPES
========================= */
type Student = {
  id: number;
  firstname?: string;
  surname?: string;
  reg_no?: string;
  photo?: string | null;
};

type ReceiptItem = {
  payment_id: number; // backend maps PaymentReceipt id -> payment_id
  student: Student;
  payment_method: string;
  status: "pending" | "approved" | "rejected" | string;
  receipts: string[]; // decoded receipt_path JSON -> array
  notes?: string | null;
};

type UpdateStatusResponse = {
  message: string;
  data: {
    payment_id: number;
    student: Student;
    payment_method: string;
    status: "pending" | "approved" | "rejected" | string;
    receipts: string[];
    notes?: string | null;
  };
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
  return data?.message ?? err?.message ?? "Something went wrong.";
}

function fullName(s?: Student | null) {
  const fn = s?.firstname ?? "";
  const sn = s?.surname ?? "";
  const name = `${fn} ${sn}`.trim();
  return name || "—";
}

function statusPillClass(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "approved") return "db-pill db-pill--green";
  if (s === "rejected") return "db-pill db-pill--red";
  return "db-pill db-pill--gold";
}

/**
 * authApi.defaults.baseURL is typically like:
 *  - http://127.0.0.1:8000/api
 *  - https://domain.com/api
 * We want the PUBLIC base, without /api.
 */
function publicBaseUrl() {
  const b = String(authApi.defaults.baseURL || "").replace(/\/+$/, "");
  return b.replace(/\/api\/?$/, "");
}

/**
 * Normalize receipt path into absolute URL so React Router doesn't intercept.
 */
function normalizeReceiptUrl(raw: string) {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  let p = raw.trim();
  p = p.replace(/^\/+/, "");
  p = p.replace(/^fees\/receipts\/+/i, "");

  const idx = p.toLowerCase().indexOf("uploads/receipts/");
  if (idx > 0) p = p.slice(idx);

  return `${publicBaseUrl()}/${p}`.replace(/([^:]\/)\/+/g, "$1");
}

function guessIsPdf(url: string) {
  return url.split("?")[0].toLowerCase().endsWith(".pdf");
}
function guessIsImage(url: string) {
  const u = url.split("?")[0].toLowerCase();
  return u.endsWith(".png") || u.endsWith(".jpg") || u.endsWith(".jpeg") || u.endsWith(".webp");
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

/* =========================
   PAGE
========================= */
export default function ReceiptApprovalPage() {
  const { showSuccess, showError, showWarning } = useToast();

  // layout
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // loading
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingReceipts, setLoadingReceipts] = useState(false);

  // data
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);

  // ui
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "pending" | "approved" | "rejected">("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const isBusy = (k: string) => busyKey === k;

  // modal
  const [showModal, setShowModal] = useState(false);
  const [active, setActive] = useState<ReceiptItem | null>(null);
  const [newStatus, setNewStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setLoadingPage(false), 120);
    return () => window.clearTimeout(t);
  }, []);

  async function fetchReceipts() {
    try {
      setLoadingReceipts(true);
      const res = await authApi.get<ReceiptItem[]>("/receipts");
      setReceipts(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      console.error(e);
      showError(getErrorMessage(e));
      setReceipts([]);
    } finally {
      setLoadingReceipts(false);
    }
  }

  useEffect(() => {
    void fetchReceipts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = receipts.length;
    const pending = receipts.filter((r) => (r.status || "").toLowerCase() === "pending").length;
    const approved = receipts.filter((r) => (r.status || "").toLowerCase() === "approved").length;
    const rejected = receipts.filter((r) => (r.status || "").toLowerCase() === "rejected").length;
    return { total, pending, approved, rejected };
  }, [receipts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return receipts.filter((r) => {
      const st = (r.status || "").toLowerCase();
      if (statusFilter && st !== statusFilter) return false;

      if (!q) return true;
      const hay = `${fullName(r.student)} ${r.student?.reg_no ?? ""} ${r.payment_method ?? ""} ${r.payment_id}`
        .toLowerCase()
        .trim();
      return hay.includes(q);
    });
  }, [receipts, query, statusFilter]);

  function openReview(r: ReceiptItem) {
    setActive(r);
    setNewStatus(((r.status || "pending").toLowerCase() as any) || "pending");
    setNotes(r.notes ?? "");
    setShowModal(true);
  }

  /**
   * ✅ Fix: open absolute URLs to avoid React Router "No routes matched..."
   * ✅ Fix: avoid CORS for PDFs by opening directly (no fetch)
   * For images: try fetch->convert->open; if CORS blocks, open directly.
   */
  async function openReceipt(rawPath: string) {
    const fullUrl = normalizeReceiptUrl(rawPath);
    if (!fullUrl) return;

    try {
      setBusyKey(`receipt:open:${rawPath}`);

      if (guessIsPdf(fullUrl)) {
        window.open(fullUrl, "_blank", "noopener,noreferrer");
        return;
      }

      if (guessIsImage(fullUrl)) {
        try {
          // IMPORTANT: use fetch instead of authApi here to avoid baseURL prefix surprises
          const imgRes = await fetch(fullUrl, { credentials: "include" });
          if (!imgRes.ok) throw new Error(`Failed to fetch image (${imgRes.status})`);
          const imgBlob = await imgRes.blob();
          const dataUrl = await blobToDataUrl(imgBlob);

          const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
          const pageW = doc.internal.pageSize.getWidth();
          const pageH = doc.internal.pageSize.getHeight();

          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = dataUrl;
          });

          const margin = 24;
          const maxW = pageW - margin * 2;
          const maxH = pageH - margin * 2;

          const scale = Math.min(maxW / img.width, maxH / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          const x = (pageW - w) / 2;
          const y = (pageH - h) / 2;

          const type = dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
          doc.addImage(dataUrl, type as any, x, y, w, h);

          const outBlob = doc.output("blob");
          const blobUrl = URL.createObjectURL(outBlob);
          window.open(blobUrl, "_blank", "noopener,noreferrer");
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
          return;
        } catch (e: any) {
          console.warn("Image fetch blocked (likely CORS). Falling back to direct open.", e);
          window.open(fullUrl, "_blank", "noopener,noreferrer");
          return;
        }
      }

      window.open(fullUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      console.error(e);
      showError(e?.response?.data?.message || e?.message || "Failed to open receipt.");
    } finally {
      setBusyKey(null);
    }
  }

  async function updateReceiptStatus() {
    if (!active) return;

    try {
      setBusyKey(`receipt:update:${active.payment_id}`);
      const res = await authApi.put<UpdateStatusResponse>(`/payment-status/${active.payment_id}`, {
        status: newStatus,
        notes: notes.trim() || null,
      });

      showSuccess(res.data?.message ?? "Receipt status updated.");

      setReceipts((prev) =>
        prev.map((x) =>
          x.payment_id === active.payment_id
            ? {
                ...x,
                status: res.data?.data?.status ?? newStatus,
                notes: res.data?.data?.notes ?? notes,
                receipts: res.data?.data?.receipts ?? x.receipts,
              }
            : x
        )
      );

      setShowModal(false);
      setActive(null);
      setNotes("");
    } catch (e: any) {
      console.error(e);
      showError(getErrorMessage(e));
    } finally {
      setBusyKey(null);
    }
  }

  /* =========================
     SAME TEMPLATE (INLINE CSS)
  ========================= */
  const templateCss = `
    .db-main {
      background: var(--bs-body-bg, #f5f1eb);
      min-height: 100vh;
      font-family: "DM Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      padding: 28px 28px 0;
    }

    .db-hero {
      background: #0f172a;
      border-radius: var(--bs-border-radius-lg, 16px);
      padding: 32px 36px;
      position: relative;
      overflow: hidden;
      margin-bottom: 20px;
    }
    .db-hero::before {
      content: "";
      position: absolute;
      inset: 0;
      background-image: radial-gradient(circle, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
      background-size: 24px 24px;
      pointer-events: none;
    }
    .db-hero-glow {
      position: absolute;
      top: -60px;
      right: -60px;
      width: 320px;
      height: 320px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(201, 168, 76, 0.1) 0%, transparent 65%);
      pointer-events: none;
    }
    .db-hero-glow2 {
      position: absolute;
      bottom: -40px;
      left: 30%;
      width: 200px;
      height: 200px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.07) 0%, transparent 70%);
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

    .db-session-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #e8c97a;
      background: rgba(201, 168, 76, 0.1);
      border: 1px solid rgba(201, 168, 76, 0.2);
      border-radius: 100px;
      padding: 4px 12px;
      margin-bottom: 14px;
    }
    .db-session-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
      animation: dbPulse 2s ease infinite;
    }
    @keyframes dbPulse {
      0%,100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.5); }
    }

    .db-greeting {
      font-family: "Lora", Georgia, serif;
      font-size: clamp(22px, 2.5vw, 32px);
      font-weight: 700;
      color: #fff;
      line-height: 1.1;
      margin-bottom: 8px;
    }
    .db-greeting em { font-style: italic; color: #e8c97a; }

    .db-hero-sub {
      font-size: 13.5px;
      font-weight: 300;
      color: #64748b;
      line-height: 1.65;
      max-width: 620px;
      margin-bottom: 16px;
    }

    .db-hero-btns { display: flex; gap: 10px; flex-wrap: wrap; }

    .db-btn-gold {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 10px 18px;
      font-family: "DM Sans", sans-serif;
      font-size: 13px;
      font-weight: 500;
      color: #0f172a;
      background: #c9a84c;
      border: none;
      border-radius: var(--bs-border-radius, 8px);
      cursor: pointer;
      transition: background 0.2s, transform 0.2s;
      text-decoration: none;
      white-space: nowrap;
    }
    .db-btn-gold:hover { background: #e8c97a; transform: translateY(-1px); }
    .db-btn-gold:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

    .db-btn-outline {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 10px 18px;
      font-family: "DM Sans", sans-serif;
      font-size: 13px;
      font-weight: 400;
      color: rgba(255, 255, 255, 0.7);
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: var(--bs-border-radius, 8px);
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s, color 0.2s;
      white-space: nowrap;
    }
    .db-btn-outline:hover { background: rgba(255, 255, 255, 0.06); color: #fff; border-color: rgba(255, 255, 255, 0.28); }
    .db-btn-outline:disabled { opacity: 0.55; cursor: not-allowed; }

    .db-hero-stat-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.09);
      backdrop-filter: blur(8px);
      border-radius: var(--bs-border-radius, 12px);
      padding: 20px 24px;
      min-width: 320px;
    }
    .db-hero-stat-row { display: flex; flex-direction: column; gap: 10px; }
    .db-hero-stat-item { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    .db-hero-stat-label { font-size: 12px; font-weight: 300; color: #64748b; }
    .db-hero-stat-val {
      font-family: "Lora", serif;
      font-size: 18px;
      font-weight: 700;
      color: #fff;
    }
    .db-hero-stat-sep { height: 1px; background: rgba(255, 255, 255, 0.06); }

    .db-panel {
      background: var(--bs-body-bg, #fff);
      border: 1px solid var(--bs-border-color, #ede8e0);
      border-radius: var(--bs-border-radius-lg, 14px);
      overflow: hidden;
    }
    .db-panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 20px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      gap: 12px;
      flex-wrap: wrap;
    }
    .db-panel-title-group { display: flex; align-items: center; gap: 12px; min-width: 240px; }
    .db-panel-icon {
      width: 36px;
      height: 36px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--pi, #fef3c7);
      color: var(--pc, #b45309);
      flex-shrink: 0;
    }
    .db-panel-title {
      font-family: "Lora", serif;
      font-size: 16px;
      font-weight: 700;
      color: #1a1a2e;
      margin: 0;
    }
    .db-panel-sub { font-size: 11.5px; font-weight: 300; color: #9a8a7a; margin: 0; }

    .db-table { width: 100%; border-collapse: collapse; }
    .db-table th {
      padding: 10px 16px;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #9a8a7a;
      background: #faf8f5;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      text-align: left;
      white-space: nowrap;
    }
    .db-table td {
      padding: 13px 16px;
      font-size: 13.5px;
      color: #4a4a5a;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      vertical-align: middle;
    }
    .db-table tbody tr { transition: background 0.15s; }
    .db-table tbody tr:hover { background: #faf8f5; }

    .db-skeleton {
      height: 14px;
      border-radius: 7px;
      background: linear-gradient(90deg, #f0ebe3 25%, #e8e0d5 50%, #f0ebe3 75%);
      background-size: 200% 100%;
      animation: dbSkeleton 1.4s ease infinite;
    }
    @keyframes dbSkeleton {
      from { background-position: 200% 0; }
      to { background-position: -200% 0; }
    }

    .db-pill {
      display: inline-flex;
      align-items: center;
      font-size: 12px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 999px;
      background: rgba(30, 64, 175, 0.08);
      color: #1e40af;
      border: 1px solid rgba(30, 64, 175, 0.12);
      white-space: nowrap;
    }
    .db-pill--gold {
      background: rgba(180, 83, 9, 0.08);
      color: #b45309;
      border-color: rgba(180, 83, 9, 0.14);
    }
    .db-pill--violet {
      background: rgba(124, 58, 237, 0.08);
      color: #7c3aed;
      border-color: rgba(124, 58, 237, 0.12);
    }
    .db-pill--green {
      background: rgba(6, 95, 70, 0.08);
      color: #065f46;
      border-color: rgba(6, 95, 70, 0.12);
    }
    .db-pill--red {
      background: rgba(220, 38, 38, 0.08);
      color: #b91c1c;
      border-color: rgba(220, 38, 38, 0.14);
    }

    .db-refresh-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      font-size: 12px;
      font-weight: 500;
      color: #7a6a5a;
      background: #f5f1eb;
      border: 1px solid #e5ddd3;
      border-radius: var(--bs-border-radius, 9px);
      cursor: pointer;
      transition: background 0.2s;
      white-space: nowrap;
    }
    .db-refresh-btn:hover { background: #ede8e0; }
    .db-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .db-grid2 { display: grid; grid-template-columns: 1fr 420px; gap: 18px; margin-bottom: 22px; }
    @media (max-width: 991.98px) {
      .db-grid2 { grid-template-columns: 1fr; }
      .db-main { padding: 18px 14px 0; }
      .db-hero { padding: 24px 20px; }
      .db-hero-stat-card { min-width: 0; width: 100%; }
    }
    @keyframes dbSpin { to { transform: rotate(360deg); } }
  `;

  return (
    <>
      <style>{templateCss}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Approve Receipt" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loadingPage && <Loader message="Loading receipts..." />}

            {/* HERO */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Fees • Receipt Review
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>Admin.</em>
                  </h1>

                  <p className="db-hero-sub">
                    Review uploaded payment receipts, then set status to <b>Approved</b> or <b>Rejected</b>. This decision can
                    control whether fee payments can be processed.
                  </p>

                  <div className="db-hero-btns">
                    <button
                      className="db-btn-gold"
                      onClick={fetchReceipts}
                      disabled={busyKey !== null || loadingReceipts}
                      title={busyKey ? "Busy…" : ""}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                      {loadingReceipts ? "Refreshing…" : "Refresh receipts"}
                    </button>

                    <button
                      className="db-btn-outline"
                      onClick={() => {
                        setQuery("");
                        setStatusFilter("");
                        showWarning("Filters cleared.");
                      }}
                      disabled={!query && !statusFilter}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        <path d="M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      Clear filters
                    </button>
                  </div>
                </div>

                <div className="db-hero-stat-card d-none d-md-block">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a84c" }}>
                      Quick glance
                    </span>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M2 10V6M5 10V4M8 10V7M11 10V3" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div className="db-hero-stat-row">
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Total</span>
                      <span className="db-hero-stat-val">{stats.total}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Pending</span>
                      <span className="db-hero-stat-val">{stats.pending}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Approved</span>
                      <span className="db-hero-stat-val">{stats.approved}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Rejected</span>
                      <span className="db-hero-stat-val">{stats.rejected}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* GRID */}
            <div className="db-grid2">
              {/* LEFT: Search + table */}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Filters */}
                <div className="db-panel">
                  <div className="db-panel-head">
                    <div className="db-panel-title-group">
                      <div className="db-panel-icon" style={{ "--pi": "#dbeafe", "--pc": "#1e40af" } as any}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M2.5 3.5h11M4.5 7.5h7M6.5 11.5h3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="db-panel-title">Filters</p>
                        <p className="db-panel-sub">Search by student name, reg no, method, or receipt id</p>
                      </div>
                    </div>

                    <button className="db-refresh-btn" onClick={fetchReceipts} disabled={busyKey !== null || loadingReceipts}>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 14 14"
                        fill="none"
                        style={{ animation: loadingReceipts ? "dbSpin 0.8s linear infinite" : "none" }}
                      >
                        <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                      Refresh
                    </button>
                  </div>

                  <div style={{ padding: 18 }}>
                    <div className="row g-3">
                      <div className="col-12 col-lg-4">
                        <label className="form-label fw-semibold small mb-1">Status</label>
                        <select
                          className="form-select"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as any)}
                          disabled={busyKey !== null}
                        >
                          <option value="">All status</option>
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>

                      <div className="col-12 col-lg-8">
                        <label className="form-label fw-semibold small mb-1">Search</label>
                        <input
                          className="form-control"
                          placeholder="e.g. John Doe • GQ/2026/012 • bank transfer • 102"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          disabled={busyKey !== null}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button
                        className="db-refresh-btn"
                        onClick={() => {
                          setQuery("");
                          setStatusFilter("");
                          showWarning("Filters cleared.");
                        }}
                        disabled={!query && !statusFilter}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="db-panel">
                  <div className="db-panel-head">
                    <div className="db-panel-title-group">
                      <div className="db-panel-icon" style={{ "--pi": "#fef3c7", "--pc": "#b45309" } as any}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M4 2h8v12H4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                          <path d="M6 5h4M6 8h4M6 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div>
                        <p className="db-panel-title">Receipts</p>
                        <p className="db-panel-sub">Open files, then approve/reject in the review modal</p>
                      </div>
                    </div>

                    <span className="db-pill db-pill--violet">
                      Showing {filtered.length}/{receipts.length}
                    </span>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table className="db-table">
                      <thead>
                        <tr>
                          <th style={{ width: 60 }}>#</th>
                          <th>Student</th>
                          <th style={{ width: 160 }}>Reg No</th>
                          <th style={{ width: 170 }}>Method</th>
                          <th style={{ width: 140 }}>Status</th>
                          <th style={{ width: 110 }}>Files</th>
                          <th style={{ width: 150, textAlign: "right" }}>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {loadingReceipts ? (
                          <tr>
                            <td colSpan={7} style={{ padding: 18 }}>
                              <div className="db-skeleton" style={{ width: "60%", marginBottom: 10 }} />
                              <div className="db-skeleton" style={{ width: "92%", marginBottom: 10 }} />
                              <div className="db-skeleton" style={{ width: "75%" }} />
                            </td>
                          </tr>
                        ) : filtered.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ padding: 18, textAlign: "center", color: "#9a8a7a" }}>
                              No receipts found. Try adjusting your filters.
                            </td>
                          </tr>
                        ) : (
                          filtered.map((r, idx) => (
                            <tr key={r.payment_id}>
                              <td>{idx + 1}</td>
                              <td>
                                <div style={{ fontWeight: 700, color: "#1a1a2e" }}>{fullName(r.student)}</div>
                                <div style={{ fontSize: 12, color: "#9a8a7a" }}>Receipt ID: {r.payment_id}</div>
                              </td>
                              <td style={{ color: "#6b7280" }}>{r.student?.reg_no ?? "—"}</td>
                              <td>
                                <span className="db-pill">{r.payment_method || "—"}</span>
                              </td>
                              <td>
                                <span className={statusPillClass(r.status)}>{(r.status || "pending").toUpperCase()}</span>
                              </td>
                              <td>
                                <span className="db-pill db-pill--violet">{Array.isArray(r.receipts) ? r.receipts.length : 0}</span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <button className="db-refresh-btn" onClick={() => openReview(r)} disabled={busyKey !== null}>
                                  Review
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ padding: 14, borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12, color: "#9a8a7a" }}>
                      Tip: keep <b>Pending</b> filter to process new uploads faster.
                    </div>
                    <div style={{ fontSize: 12, color: "#9a8a7a" }}>
                      PDFs open directly; images may require CORS to convert to PDF.
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Summary */}
              <div className="db-panel" style={{ height: "fit-content", position: "sticky", top: 16 }}>
                <div className="db-panel-head">
                  <div className="db-panel-title-group">
                    <div className="db-panel-icon" style={{ "--pi": "#d1fae5", "--pc": "#065f46" } as any}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 8l2.2 2.2L12 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path
                          d="M8 15A7 7 0 108 1a7 7 0 000 14z"
                          stroke="currentColor"
                          strokeWidth="1.2"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="db-panel-title">Summary</p>
                      <p className="db-panel-sub">Counts by status</p>
                    </div>
                  </div>

                  <button className="db-refresh-btn" onClick={fetchReceipts} disabled={busyKey !== null || loadingReceipts}>
                    Refresh
                  </button>
                </div>

                <div style={{ padding: 18, display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ color: "#9a8a7a", fontSize: 12 }}>Total</span>
                    <span style={{ fontFamily: "Lora, serif", fontWeight: 700, color: "#1a1a2e" }}>{stats.total}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ color: "#9a8a7a", fontSize: 12 }}>Pending</span>
                    <span style={{ fontFamily: "Lora, serif", fontWeight: 700, color: "#b45309" }}>{stats.pending}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ color: "#9a8a7a", fontSize: 12 }}>Approved</span>
                    <span style={{ fontFamily: "Lora, serif", fontWeight: 700, color: "#065f46" }}>{stats.approved}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ color: "#9a8a7a", fontSize: 12 }}>Rejected</span>
                    <span style={{ fontFamily: "Lora, serif", fontWeight: 700, color: "#b91c1c" }}>{stats.rejected}</span>
                  </div>

                  <hr style={{ opacity: 0.08 }} />

                  <div className="db-pill db-pill--gold" style={{ justifyContent: "center" }}>
                    Action: review → approve/reject → notify
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <Footer />
            </div>

            {/* =========================
                MODAL: REVIEW
            ========================= */}
            {showModal && active && (
              <div
                className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                style={{
                  background: "rgba(15, 23, 42, 0.55)",
                  backdropFilter: "blur(6px)",
                  zIndex: 1100,
                  padding: 12,
                }}
                onClick={() => (busyKey ? null : setShowModal(false))}
              >
                <div
                  className="db-panel"
                  style={{ width: "100%", maxWidth: 980, borderRadius: 16, boxShadow: "0 30px 80px rgba(0,0,0,0.35)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="db-panel-head" style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    <div className="db-panel-title-group">
                      <div className="db-panel-icon" style={{ "--pi": "#ede9fe", "--pc": "#7c3aed" } as any}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M4 2h8v12H4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                          <path d="M6 5h4M6 8h4M6 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div>
                        <p className="db-panel-title">Review receipt</p>
                        <p className="db-panel-sub">
                          {fullName(active.student)} • {active.student?.reg_no ?? "—"} • {active.payment_method}
                        </p>
                      </div>
                    </div>

                    <button
                      className="db-refresh-btn"
                      onClick={() => setShowModal(false)}
                      disabled={busyKey !== null}
                      style={{ background: "transparent" }}
                      title="Close"
                    >
                      Close
                    </button>
                  </div>

                  <div style={{ padding: 18 }}>
                    <div className="row g-3">
                      {/* files */}
                      <div className="col-12 col-lg-7">
                        <div style={{ fontWeight: 700, color: "#1a1a2e", marginBottom: 10 }}>Uploaded files</div>

                        {Array.isArray(active.receipts) && active.receipts.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {active.receipts.map((p, i) => (
                              <div
                                key={`${active.payment_id}-${i}`}
                                style={{
                                  border: "1px solid rgba(0,0,0,0.08)",
                                  borderRadius: 12,
                                  padding: 12,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 12,
                                }}
                              >
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 12, color: "#9a8a7a" }}>File</div>
                                  <div style={{ fontWeight: 600, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {p}
                                  </div>
                                </div>

                                <button className="db-refresh-btn" onClick={() => openReceipt(p)} disabled={busyKey !== null}>
                                  {isBusy(`receipt:open:${p}`) ? "Opening…" : "Open"}
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="alert alert-warning mb-0">No receipt files found on this record.</div>
                        )}

                        <div className="alert alert-info mt-3 mb-0">
                          <b>Note:</b> PDFs open directly (no CORS needed). Image-to-PDF conversion can fail if your server blocks cross-origin requests.
                        </div>
                      </div>

                      {/* decision */}
                      <div className="col-12 col-lg-5">
                        <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: 14, background: "#faf8f5" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                            <div style={{ fontWeight: 800, color: "#1a1a2e" }}>Decision</div>
                            <span className={statusPillClass(active.status)}>{(active.status || "pending").toUpperCase()}</span>
                          </div>

                          <div style={{ marginTop: 12 }}>
                            <label className="form-label fw-semibold small mb-1">Update status *</label>
                            <select className="form-select" value={newStatus} onChange={(e) => setNewStatus(e.target.value as any)} disabled={busyKey !== null}>
                              <option value="pending">Pending</option>
                              <option value="approved">Approved</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </div>

                          <div style={{ marginTop: 12 }}>
                            <label className="form-label fw-semibold small mb-1">Notes (optional)</label>
                            <textarea
                              className="form-control"
                              rows={4}
                              placeholder="e.g. bank slip unclear, please re-upload with a clear screenshot..."
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              disabled={busyKey !== null}
                            />
                            <div className="form-text">If rejected, add a clear reason so parents know what to fix.</div>
                          </div>

                          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14, flexWrap: "wrap" }}>
                            <button className="db-refresh-btn" onClick={() => setShowModal(false)} disabled={busyKey !== null}>
                              Cancel
                            </button>

                            <button
                              className="db-btn-gold"
                              onClick={updateReceiptStatus}
                              disabled={busyKey !== null}
                              style={{ borderRadius: 10, padding: "9px 14px" }}
                            >
                              {isBusy(`receipt:update:${active.payment_id}`) ? "Saving…" : "Save status"}
                            </button>
                          </div>

                          <div className="alert alert-warning mt-3 mb-0">
                            <b>Reminder:</b> Approved receipts typically unlock fee payment (your backend enforces this rule).
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

/**
 * Routes used:
 * - GET  /receipts
 * - PUT  /payment-status/{id}   body: { status: pending|approved|rejected, notes?: string }
 */