// src/pages/Settings/SchoolBankAccountsPage.tsx
import  { useEffect, useMemo, useState } from "react";
import { authApi } from "../../../utils/axios";

import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";

type SchoolBankAccount = {
  id: number;
  school_id: number;
  bank_name: string;
  bank_code?: string | null;
  account_name: string;
  account_number: string;
  currency?: string | null;
  is_active: number | boolean;
  sort_order?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const isTruthy = (v: any) => v === true || v === 1 || v === "1";

function maskAcct(acct: string) {
  const t = (acct || "").trim();
  if (t.length <= 4) return t;
  return `${"*".repeat(Math.max(0, t.length - 4))}${t.slice(-4)}`;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function fmtDateTime(val?: string | null) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SchoolBankAccountsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [items, setItems] = useState<SchoolBankAccount[]>([]);
  const [error, setError] = useState<string>("");

  // UI state
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);

  // editing
  const [editing, setEditing] = useState<SchoolBankAccount | null>(null);

  // form
  const [bankName, setBankName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState<number>(0);

  const resetForm = () => {
    setEditing(null);
    setBankName("");
    setBankCode("");
    setAccountName("");
    setAccountNumber("");
    setCurrency("NGN");
    setIsActive(true);
    setSortOrder(0);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (row: SchoolBankAccount) => {
    setEditing(row);
    setBankName(row.bank_name || "");
    setBankCode(row.bank_code || "");
    setAccountName(row.account_name || "");
    setAccountNumber(row.account_number || "");
    setCurrency(row.currency || "NGN");
    setIsActive(isTruthy(row.is_active));
    setSortOrder(Number(row.sort_order ?? 0));
    setShowForm(true);
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authApi.get<SchoolBankAccount[]>("/school/bank-accounts");
      setItems(res.data || []);
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || "Failed to load bank accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((x) => {
      const hay = [x.bank_name, x.bank_code || "", x.account_name, x.account_number, x.currency || ""]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const activeCount = useMemo(() => items.filter((x) => isTruthy(x.is_active)).length, [items]);
  const inactiveCount = useMemo(() => items.filter((x) => !isTruthy(x.is_active)).length, [items]);

  const validateForm = () => {
    const errs: string[] = [];
    if (!bankName.trim()) errs.push("Bank name is required.");
    if (!accountName.trim()) errs.push("Account name is required.");
    if (!accountNumber.trim()) errs.push("Account number is required.");

    const acc = accountNumber.trim();
    if (acc && (acc.length < 6 || acc.length > 20)) errs.push("Account number length looks invalid.");
    if (currency.trim().length < 3) errs.push("Currency is invalid.");

    if (errs.length) {
      setError(errs.join(" "));
      return false;
    }
    return true;
  };

  const save = async () => {
    setError("");
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        bank_name: bankName.trim(),
        bank_code: bankCode.trim() || null,
        account_name: accountName.trim(),
        account_number: accountNumber.trim(),
        currency: currency.trim() || "NGN",
        is_active: isActive,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      };

      if (editing?.id) {
        await authApi.put(`/school/bank-accounts/${editing.id}`, payload);
      } else {
        await authApi.post(`/school/bank-accounts`, payload);
      }

      await load();
      setShowForm(false);
      resetForm();
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || "Failed to save bank account.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: SchoolBankAccount) => {
    const ok = window.confirm(`Delete this bank account?\n\n${row.bank_name} - ${row.account_number}`);
    if (!ok) return;

    setDeletingId(row.id);
    setError("");
    try {
      await authApi.delete(`/school/bank-accounts/${row.id}`);
      await load();
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || "Failed to delete bank account.");
    } finally {
      setDeletingId(null);
    }
  };

  const quickToggleActive = async (row: SchoolBankAccount) => {
    setError("");
    try {
      await authApi.put(`/school/bank-accounts/${row.id}`, {
        is_active: !isTruthy(row.is_active),
      });
      await load();
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || "Unable to update status.");
    }
  };

  return (
    <>
      <style>{`
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
          margin: 10px 0 18px;
          border: 1px solid rgba(255,255,255,0.06);
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
          background: radial-gradient(circle, rgba(201, 168, 76, 0.10) 0%, transparent 65%);
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
        @media (min-width: 768px) { .db-hero-inner { flex-wrap: nowrap; } }

        .db-session-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #e8c97a;
          background: rgba(201, 168, 76, 0.10);
          border: 1px solid rgba(201, 168, 76, 0.22);
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
          max-width: 680px;
          margin-bottom: 18px;
        }

        .db-hero-btns { display: flex; gap: 10px; flex-wrap: wrap; }

        .db-btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 20px;
          font-family: "DM Sans", sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
          background: #c9a84c;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
          white-space: nowrap;
        }
        .db-btn-gold:hover { background: #e8c97a; transform: translateY(-1px); }
        .db-btn-gold:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        .db-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 20px;
          font-family: "DM Sans", sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.7);
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 10px;
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
          border-radius: 14px;
          padding: 20px 24px;
          min-width: 320px;
          margin-left: auto;
          align-self: flex-end;
        }
        .db-hero-stat-row { display: flex; flex-direction: column; gap: 10px; }
        .db-hero-stat-item { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .db-hero-stat-label { font-size: 12px; font-weight: 300; color: #64748b; }
        .db-hero-stat-val { font-family: "Lora", serif; font-size: 22px; font-weight: 700; color: #fff; }

        .db-panel {
          background: #fff;
          border: 1px solid #ede8e0;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(15,23,42,0.04);
          margin-bottom: 18px;
        }

        .db-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          gap: 12px;
          flex-wrap: wrap;
        }

        .db-panel-title {
          font-family: "Lora", serif;
          font-size: 16px;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0;
        }
        .db-panel-sub {
          font-size: 11.5px;
          font-weight: 300;
          color: #9a8a7a;
          margin: 0;
        }

        .db-refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 500;
          color: #7a6a5a;
          background: #f5f1eb;
          border: 1px solid #e5ddd3;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
        }
        .db-refresh-btn:hover { background: #ede8e0; }
        .db-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .db-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 800;
          padding: 6px 10px;
          border-radius: 999px;
          white-space: nowrap;
          border: 1px solid rgba(0,0,0,0.06);
        }

        .db-muted { color: #9a8a7a; }
        .db-strong { font-weight: 900; color: #1a1a2e; }

        .db-card {
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 2px 10px rgba(15,23,42,0.04);
        }

        .db-rowcard {
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 2px 10px rgba(15,23,42,0.04);
          padding: 14px;
        }

        .db-iconbox {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(0,0,0,0.06);
          background: rgba(201,168,76,0.14);
          color: #c9a84c;
          flex: 0 0 auto;
        }

        .db-mini {
          font-size: 12px;
          color: #9a8a7a;
        }

        @media (max-width: 991.98px) { .db-main { padding: 18px 14px 0; } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Bank Details" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loading && <Loader message="Loading school bank accounts..." />}

            {/* ===== HERO ===== */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Settings — Bank Transfer
                  </div>

                  <h1 className="db-greeting">
                    School <em>Bank Accounts</em>
                  </h1>

                  <p className="db-hero-sub">
                    Add one or more bank accounts to show parents for manual transfer payments. Only <b>Active</b> accounts will be visible.
                  </p>

                  <div className="db-hero-btns">
                    <button className="db-btn-gold" type="button" onClick={openCreate} disabled={loading || saving}>
                      <i className="bi bi-plus-lg" />
                      Add bank account
                    </button>

                    <button className="db-btn-outline" type="button" onClick={load} disabled={loading}>
                      <i className="bi bi-arrow-clockwise" />
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="db-hero-stat-card d-none d-md-block">
                  <div className="db-hero-stat-row">
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Total</span>
                      <span className="db-hero-stat-val">{items.length}</span>
                    </div>
                    <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Active</span>
                      <span className="db-hero-stat-val">{activeCount}</span>
                    </div>
                    <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Inactive</span>
                      <span className="db-hero-stat-val">{inactiveCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="alert alert-danger" role="alert" style={{ borderRadius: 14 }}>
                <i className="bi bi-exclamation-triangle me-2" />
                {error}
              </div>
            )}

            <div className="row g-3">
              {/* LEFT: LIST */}
              <div className="col-12 col-lg-7">
                <div className="db-panel">
                  <div className="db-panel-head">
                    <div>
                      <p className="db-panel-title">Accounts</p>
                      <p className="db-panel-sub">Search, toggle active, edit or delete.</p>
                    </div>

                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <div className="input-group" style={{ width: 340 }}>
                        <span className="input-group-text bg-white" style={{ borderRadius: "10px 0 0 10px" }}>
                          <i className="bi bi-search" />
                        </span>
                        <input
                          className="form-control"
                          placeholder="Search bank / account / number / currency..."
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          style={{ borderRadius: "0 10px 10px 0" }}
                        />
                      </div>

                      <button className="db-refresh-btn" type="button" onClick={load} disabled={loading}>
                        <i className="bi bi-arrow-clockwise" />
                        Refresh
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: 16 }}>
                    {filtered.length === 0 ? (
                      <div className="text-center py-5">
                        <div
                          className="mx-auto mb-3 d-flex align-items-center justify-content-center"
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 16,
                            background: "rgba(201,168,76,0.14)",
                            color: "#c9a84c",
                            border: "1px solid rgba(0,0,0,0.06)",
                          }}
                        >
                          <i className="bi bi-bank fs-3" />
                        </div>
                        <div className="fw-semibold" style={{ color: "#1a1a2e" }}>
                          No bank accounts found
                        </div>
                        <div className="db-muted mb-3">Add one to allow parents pay via bank transfer.</div>
                        <button className="db-btn-gold" type="button" onClick={openCreate}>
                          <i className="bi bi-plus-lg" />
                          Add bank account
                        </button>
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {filtered.map((row) => {
                          const active = isTruthy(row.is_active);

                          return (
                            <div key={row.id} className="db-rowcard">
                              <div className="d-flex justify-content-between gap-3 flex-wrap">
                                <div className="d-flex gap-12" style={{ gap: 12, minWidth: 260 }}>
                                  <div className="db-iconbox" style={{ background: active ? "rgba(34,197,94,0.14)" : "rgba(148,163,184,0.18)", color: active ? "#22c55e" : "#64748b" }}>
                                    <i className="bi bi-bank" />
                                  </div>

                                  <div>
                                    <div className="db-strong" style={{ fontWeight: 900 }}>
                                      {row.bank_name}
                                      {row.bank_code ? <span className="db-mini"> • {row.bank_code}</span> : null}
                                    </div>

                                    <div className="db-mini">
                                      Currency: <b style={{ color: "#1a1a2e" }}>{row.currency || "NGN"}</b> • Sort:{" "}
                                      <b style={{ color: "#1a1a2e" }}>{row.sort_order ?? 0}</b>
                                    </div>

                                    <div style={{ marginTop: 10 }}>
                                      <div className="db-mini">Account name</div>
                                      <div className="db-strong" style={{ fontWeight: 800 }}>{row.account_name}</div>
                                    </div>

                                    <div style={{ marginTop: 8 }}>
                                      <div className="db-mini">Account number</div>
                                      <div className="d-flex align-items-center gap-2 flex-wrap">
                                        <code style={{ fontSize: 13, padding: "4px 8px", borderRadius: 10, background: "#f5f1eb", border: "1px solid #e5ddd3" }}>
                                          {row.account_number}
                                        </code>

                                        <button
                                          type="button"
                                          className="db-refresh-btn"
                                          onClick={async () => {
                                            const ok = await copyToClipboard(row.account_number);
                                            if (!ok) alert("Failed to copy. Please copy manually.");
                                          }}
                                        >
                                          <i className="bi bi-clipboard" />
                                          Copy
                                        </button>

                                        <span className="db-mini">
                                          Masked: <code style={{ fontSize: 12 }}>{maskAcct(row.account_number)}</code>
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="ms-auto d-flex flex-column align-items-end gap-2">
                                  <span
                                    className="db-pill"
                                    style={{
                                      background: active ? "rgba(34,197,94,0.14)" : "rgba(245,158,11,0.14)",
                                      color: active ? "#22c55e" : "#f59e0b",
                                    }}
                                  >
                                    <i className={`bi ${active ? "bi-check-circle" : "bi-exclamation-circle"}`} />
                                    {active ? "ACTIVE" : "INACTIVE"}
                                  </span>

                                  <div className="d-flex gap-2 flex-wrap justify-content-end">
                                    <button
                                      type="button"
                                      className="db-refresh-btn"
                                      onClick={() => quickToggleActive(row)}
                                      disabled={loading || saving || deletingId === row.id}
                                      title="Toggle active"
                                    >
                                      <i className={`bi ${active ? "bi-pause-circle" : "bi-play-circle"}`} />
                                      {active ? "Deactivate" : "Activate"}
                                    </button>

                                    <button
                                      type="button"
                                      className="db-refresh-btn"
                                      onClick={() => openEdit(row)}
                                      disabled={loading || saving || deletingId === row.id}
                                    >
                                      <i className="bi bi-pencil-square" />
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      className="db-refresh-btn"
                                      style={{ borderColor: "rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.06)", color: "#b91c1c" }}
                                      onClick={() => remove(row)}
                                      disabled={deletingId === row.id || loading || saving}
                                    >
                                      {deletingId === row.id ? (
                                        <>
                                          <span className="spinner-border spinner-border-sm" />
                                          Deleting…
                                        </>
                                      ) : (
                                        <>
                                          <i className="bi bi-trash" />
                                          Delete
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  <div className="db-mini text-end">
                                    Updated: <b style={{ color: "#1a1a2e" }}>{fmtDateTime(row.updated_at)}</b>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="db-panel">
                  <div className="db-panel-head">
                    <div>
                      <p className="db-panel-title">Tip for parents</p>
                      <p className="db-panel-sub">Optional guidance you can show on the payment page.</p>
                    </div>
                  </div>

                  <div style={{ padding: 16 }}>
                    <div className="db-card" style={{ padding: 14, background: "#faf8f5" }}>
                      <div className="d-flex align-items-start gap-3">
                        <div className="db-iconbox" style={{ background: "rgba(34,197,94,0.14)", color: "#22c55e" }}>
                          <i className="bi bi-info-circle" />
                        </div>
                        <div>
                          <div className="db-strong">Use a clear narration</div>
                          <div className="db-muted" style={{ fontSize: 13 }}>
                            Encourage parents to include student Reg No + Term in narration, then upload receipt for approval.
                          </div>
                          <div className="db-mini" style={{ marginTop: 8 }}>
                            Example: <code>GQ-REG1234-2ndTerm-2025/2026</code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: FORM */}
              <div className="col-12 col-lg-5">
                <div className="db-panel">
                  <div className="db-panel-head">
                    <div>
                      <p className="db-panel-title">{editing ? "Edit bank account" : "Add bank account"}</p>
                      <p className="db-panel-sub">Only active accounts show to parents.</p>
                    </div>

                    <div className="d-flex gap-2 flex-wrap">
                      <button
                        type="button"
                        className="db-refresh-btn"
                        onClick={() => {
                          if (showForm) {
                            setShowForm(false);
                            resetForm();
                          } else {
                            openCreate();
                          }
                        }}
                        disabled={saving || loading}
                      >
                        {showForm ? (
                          <>
                            <i className="bi bi-x-lg" />
                            Close
                          </>
                        ) : (
                          <>
                            <i className="bi bi-plus-lg" />
                            New
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: 16 }}>
                    {!showForm ? (
                      <div className="db-muted">
                        Click <b>New</b> to add an account, or <b>Edit</b> on an existing one.
                      </div>
                    ) : (
                      <div className="row g-3">
                        <div className="col-12">
                          <label className="form-label fw-semibold small mb-1">Bank name</label>
                          <input
                            className="form-control"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            placeholder="e.g. GTBank"
                            style={{ borderRadius: 12 }}
                            disabled={saving}
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small mb-1">Bank code</label>
                          <input
                            className="form-control"
                            value={bankCode}
                            onChange={(e) => setBankCode(e.target.value)}
                            placeholder="e.g. 058"
                            style={{ borderRadius: 12 }}
                            disabled={saving}
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small mb-1">Currency</label>
                          <input
                            className="form-control"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            placeholder="NGN"
                            style={{ borderRadius: 12 }}
                            disabled={saving}
                          />
                        </div>

                        <div className="col-12">
                          <label className="form-label fw-semibold small mb-1">Account name</label>
                          <input
                            className="form-control"
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                            placeholder="Account holder name"
                            style={{ borderRadius: 12 }}
                            disabled={saving}
                          />
                        </div>

                        <div className="col-12">
                          <label className="form-label fw-semibold small mb-1">Account number</label>
                          <input
                            className="form-control"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            placeholder="e.g. 0123456789"
                            style={{ borderRadius: 12, letterSpacing: 0.7 }}
                            disabled={saving}
                          />
                          <div className="db-mini" style={{ marginTop: 6 }}>
                            Preview masked: <code>{maskAcct(accountNumber)}</code>
                          </div>
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small mb-1">Sort order</label>
                          <input
                            type="number"
                            className="form-control"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(parseInt(e.target.value || "0", 10))}
                            min={0}
                            max={1000}
                            style={{ borderRadius: 12 }}
                            disabled={saving}
                          />
                          <div className="db-mini" style={{ marginTop: 6 }}>
                            Lower values appear first.
                          </div>
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small mb-1">Status</label>
                          <div className="db-card" style={{ padding: 12, background: "#faf8f5" }}>
                            <div className="form-check form-switch m-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                id="bankAcctActiveSwitch"
                                disabled={saving}
                              />
                              <label className="form-check-label fw-semibold" htmlFor="bankAcctActiveSwitch">
                                Active (visible)
                              </label>
                            </div>
                            <div className="db-mini" style={{ marginTop: 6 }}>
                              Inactive accounts won’t show to parents.
                            </div>
                          </div>
                        </div>

                        <div className="col-12 d-flex gap-2 pt-2">
                          <button
                            type="button"
                            className="db-refresh-btn"
                            onClick={() => {
                              resetForm();
                              setShowForm(false);
                            }}
                            disabled={saving}
                          >
                            <i className="bi bi-x-circle" />
                            Cancel
                          </button>

                          <button
                            type="button"
                            className="db-btn-gold ms-auto"
                            onClick={save}
                            disabled={saving}
                            style={{ borderRadius: 12, padding: "10px 14px" }}
                          >
                            {saving ? (
                              <>
                                <span className="spinner-border spinner-border-sm" />
                                Saving…
                              </>
                            ) : (
                              <>
                                <i className="bi bi-save2" />
                                Save
                              </>
                            )}
                          </button>
                        </div>

                        {editing?.id && (
                          <div className="col-12">
                            <div className="db-mini">
                              Editing ID: <code>{editing.id}</code>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="db-panel">
                  <div className="db-panel-head">
                    <div>
                      <p className="db-panel-title">Safety note</p>
                      <p className="db-panel-sub">Avoid exposing sensitive details unnecessarily.</p>
                    </div>
                  </div>

                  <div style={{ padding: 16 }}>
                    <div className="db-card" style={{ padding: 14, background: "#faf8f5" }}>
                      <div className="db-muted" style={{ fontSize: 13 }}>
                        Only share official school accounts. If you rotate an account, deactivate the old one to prevent parents sending funds to the wrong place.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}