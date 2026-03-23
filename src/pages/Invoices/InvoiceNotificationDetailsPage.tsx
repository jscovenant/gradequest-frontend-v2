// src/pages/Invoices/InvoiceNotificationDetailsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import { useToast } from "../../contexts/ToastContext";
import {
  getInvoiceNotification,
  markInvoiceNotificationRead,
  type InvoiceNote,
} from "../../api/invoiceNotificationsApi";
import { authApi } from "../../utils/axios";
import PageTitle from "../../components/PageTitle";

type FeeItem = {
  fee_title?: string;
  amount?: number;
  paid?: number;
  balance?: number;
  term_id?: number | null;
  session_id?: number | null;
};

type ChildSummary = {
  student_id?: number | null;
  student_name?: string;
  items?: FeeItem[];
};

type CombinedSummary = {
  school_id?: number;
  parent_id?: number;
  parent_name?: string;
  student_count?: number;
  item_count?: number;
  total_amount?: number;
  total_paid?: number;
  total_balance?: number;
  due_date?: string | null;
  payment_url?: string | null;
  children?: ChildSummary[];
};

type BankDetails = {
  school_id?: number;
  bank_name?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  instruction?: string | null;
};

function resolveSummaryFromNote(note: InvoiceNote): CombinedSummary {
  return (note as any)?.summary ?? (note as any)?.meta?.summary ?? {};
}

function money(v?: number | null, currency = "₦") {
  const n = Number(v ?? 0);
  return `${currency}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date?: string | null) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function getInvoiceNotificationBankDetails(noteId: number): Promise<BankDetails> {
  const res = await authApi.get(`/invoice-notifications/${noteId}/bank-details`);
  return res?.data?.data ?? {};
}

export default function InvoiceNotificationDetailsPage() {
  const { id } = useParams();
  const noteId = Number(id);
  const { showError, showSuccess } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<InvoiceNote | null>(null);

  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);

  const summary = useMemo(() => (note ? resolveSummaryFromNote(note) : null), [note]);
  const children = useMemo(() => summary?.children ?? [], [summary]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getInvoiceNotification(noteId);
      setNote(data);

      try {
        await markInvoiceNotificationRead(noteId);
      } catch {}
    } catch (e) {
      console.error(e);
      showError?.("Failed to load invoice notification.");
      setNote(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!noteId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  useEffect(() => {
    if (!bankModalOpen) return;

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBankModalOpen(false);
    };

    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [bankModalOpen]);

  const openPaymentModal = async () => {
    if (!noteId) {
      showError?.("Invalid notification.");
      return;
    }

    setBankLoading(true);
    try {
      const data = await getInvoiceNotificationBankDetails(noteId);
      setBankDetails(data);
      setBankModalOpen(true);
    } catch (e) {
      console.error(e);
      showError?.("Failed to load school bank details.");
    } finally {
      setBankLoading(false);
    }
  };

  const copyText = async (value?: string | null, label = "Value") => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      showSuccess?.(`${label} copied.`);
    } catch {
      showError?.(`Failed to copy ${label.toLowerCase()}.`);
    }
  };

  const totalAmount = summary?.total_amount ?? 0;
  const totalPaid = summary?.total_paid ?? 0;
  const totalBalance = summary?.total_balance ?? 0;
  const studentCount = summary?.student_count ?? children.length ?? 0;
  const itemCount =
    summary?.item_count ??
    children.reduce((acc, child) => acc + (child.items?.length ?? 0), 0);

  return (
    <>
      <TopNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        title="Fee Reminder Details"
      />
  <PageTitle title="Invoice Details" />
      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main
            className="col-md-9 col-lg-10 ms-auto"
            style={{ padding: 24, background: "#f5f1eb", minHeight: "100vh" }}
          >
            {loading && <Loader message="Loading reminder..." />}

            {!loading && !note ? (
              <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
                <div className="card-body">
                  <div className="fw-bold mb-2">Notification not found.</div>
                  <Link to="/invoice-notifications" className="btn btn-outline-secondary">
                    <i className="bi bi-arrow-left me-1" /> Back
                  </Link>
                </div>
              </div>
            ) : null}

            {!loading && note && summary ? (
              <>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                  <div>
                    <div className="text-muted" style={{ fontSize: 13 }}>
                      {(note as any)?.time || (note as any)?.created_at || ""}
                    </div>
                    <h4 className="mb-1 fw-bold" style={{ color: "#1e293b" }}>
                      {(note as any)?.message || "Outstanding fees reminder"}
                    </h4>
                    <div className="text-muted" style={{ fontSize: 14 }}>
                      Parent: {summary.parent_name || "Parent/Guardian"}
                    </div>
                  </div>

                  <div className="d-flex gap-2 flex-wrap">
                    <Link to="/invoice-notifications" className="btn btn-light">
                      <i className="bi bi-arrow-left me-1" /> Back
                    </Link>

                    <button
                      className="btn btn-success"
                      onClick={openPaymentModal}
                      disabled={bankLoading}
                    >
                      <i className="bi bi-credit-card me-1" />
                      {bankLoading ? "Loading..." : "Pay now"}
                    </button>
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-12 col-md-6 col-xl-3">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                      <div className="card-body">
                        <div className="text-muted" style={{ fontSize: 12 }}>Total Amount</div>
                        <div className="fw-bold fs-5">{money(totalAmount)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-6 col-xl-3">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                      <div className="card-body">
                        <div className="text-muted" style={{ fontSize: 12 }}>Total Paid</div>
                        <div className="fw-bold fs-5 text-primary">{money(totalPaid)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-6 col-xl-3">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                      <div className="card-body">
                        <div className="text-muted" style={{ fontSize: 12 }}>
                          Outstanding Balance
                        </div>
                        <div className="fw-bold fs-5 text-danger">{money(totalBalance)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-6 col-xl-3">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                      <div className="card-body">
                        <div className="text-muted" style={{ fontSize: 12 }}>Due Date</div>
                        <div className="fw-bold fs-6">{formatDate(summary.due_date)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 14 }}>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-12 col-md-4">
                        <div className="text-muted" style={{ fontSize: 12 }}>Students</div>
                        <div className="fw-semibold">{studentCount}</div>
                      </div>

                      <div className="col-12 col-md-4">
                        <div className="text-muted" style={{ fontSize: 12 }}>Fee Items</div>
                        <div className="fw-semibold">{itemCount}</div>
                      </div>

                     
                    </div>

                    <div className="mt-3 d-flex gap-2 flex-wrap">
                      <button
                        className="btn btn-primary"
                        onClick={openPaymentModal}
                        disabled={bankLoading}
                      >
                        <i className="bi bi-credit-card me-1" />
                        {bankLoading ? "Loading..." : "Proceed to payment"}
                      </button>

                      <button
                        className="btn btn-outline-secondary"
                        onClick={load}
                        disabled={loading}
                      >
                        <i className="bi bi-arrow-clockwise me-1" />
                        Refresh
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
                  <div className="card-header bg-white border-0 pb-0" style={{ borderRadius: 14 }}>
                    <h5 className="mb-0 fw-bold" style={{ color: "#1e293b" }}>
                      Fee Breakdown by Student
                    </h5>
                  </div>

                  <div className="card-body">
                    {children.length === 0 ? (
                      <div className="text-muted">No fee items were found in this reminder.</div>
                    ) : (
                      <div className="d-flex flex-column gap-4">
                        {children.map((child, idx) => (
                          <div
                            key={`${child.student_id ?? "student"}-${idx}`}
                            className="border rounded-3"
                            style={{ borderColor: "#e2e8f0", overflow: "hidden" }}
                          >
                            <div
                              className="px-3 py-2 fw-semibold"
                              style={{ background: "#f8fafc", color: "#0f172a" }}
                            >
                              {child.student_name || "Student"}
                            </div>

                            <div className="table-responsive">
                              <table className="table align-middle mb-0">
                                <thead style={{ background: "#fcfcfd" }}>
                                  <tr>
                                    <th style={{ minWidth: 180 }}>Fee Type</th>
                                    <th style={{ minWidth: 120 }}>Amount</th>
                                    <th style={{ minWidth: 120 }}>Paid</th>
                                    <th style={{ minWidth: 140 }}>Balance</th>
                                    <th style={{ minWidth: 100 }}>Term</th>
                                    <th style={{ minWidth: 100 }}>Session</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(child.items ?? []).length === 0 ? (
                                    <tr>
                                      <td colSpan={6} className="text-muted text-center py-4">
                                        No fee items for this student.
                                      </td>
                                    </tr>
                                  ) : (
                                    (child.items ?? []).map((item, itemIdx) => (
                                      <tr key={`${child.student_id ?? idx}-${itemIdx}`}>
                                        <td className="fw-semibold">{item.fee_title || "Fee"}</td>
                                        <td>{money(item.amount)}</td>
                                        <td>{money(item.paid)}</td>
                                        <td className="fw-bold text-danger">
                                          {money(item.balance)}
                                        </td>
                                        <td>{item.term_id ?? "—"}</td>
                                        <td>{item.session_id ?? "—"}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}

            <div className="mt-auto pt-3">
              <Footer />
            </div>
          </main>
        </div>
      </div>

      {bankModalOpen && (
        <>
          <div
            onClick={() => setBankModalOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.55)",
              zIndex: 1050,
            }}
          />

          <div
            style={{
              position: "fixed",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              zIndex: 1060,
            }}
          >
            <div
              className="card border-0 shadow-lg"
              style={{
                width: "100%",
                maxWidth: 620,
                borderRadius: 18,
                overflow: "hidden",
                background: "#fff",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  background: "linear-gradient(135deg, #0d6efd 0%, #198754 100%)",
                  color: "#fff",
                  padding: "18px 20px",
                }}
              >
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div>
                    <h5 className="mb-1 fw-bold">School Bank Details</h5>
                    <div style={{ fontSize: 13, opacity: 0.95 }}>
                      Make your transfer using the bank information below.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-light"
                    onClick={() => setBankModalOpen(false)}
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>

              <div className="card-body" style={{ padding: 20 }}>
                {!bankDetails ? (
                  <div className="text-muted">No bank details available.</div>
                ) : (
                  <>
                    <div className="row g-3">
                      <div className="col-12">
                        <div
                          className="border rounded-3 p-3"
                          style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
                        >
                          <div className="text-muted mb-1" style={{ fontSize: 12 }}>
                            Bank Name
                          </div>
                          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                            <div className="fw-semibold fs-6">
                              {bankDetails.bank_name || "—"}
                            </div>
                            <button
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => copyText(bankDetails.bank_name, "Bank name")}
                              disabled={!bankDetails.bank_name}
                            >
                              <i className="bi bi-copy me-1" />
                              Copy
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-md-6">
                        <div
                          className="border rounded-3 p-3 h-100"
                          style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
                        >
                          <div className="text-muted mb-1" style={{ fontSize: 12 }}>
                            Account Name
                          </div>
                          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                            <div className="fw-semibold">{bankDetails.account_name || "—"}</div>
                            <button
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => copyText(bankDetails.account_name, "Account name")}
                              disabled={!bankDetails.account_name}
                            >
                              <i className="bi bi-copy me-1" />
                              Copy
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-md-6">
                        <div
                          className="border rounded-3 p-3 h-100"
                          style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
                        >
                          <div className="text-muted mb-1" style={{ fontSize: 12 }}>
                            Account Number
                          </div>
                          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                            <div className="fw-bold fs-5" style={{ letterSpacing: 1 }}>
                              {bankDetails.account_number || "—"}
                            </div>
                            <button
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() =>
                                copyText(bankDetails.account_number, "Account number")
                              }
                              disabled={!bankDetails.account_number}
                            >
                              <i className="bi bi-copy me-1" />
                              Copy
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="col-12">
                        <div
                          className="rounded-3 p-3"
                          style={{
                            background: "#fff7ed",
                            border: "1px solid #fed7aa",
                            borderLeft: "4px solid #f97316",
                          }}
                        >
                          <div className="fw-bold mb-2" style={{ color: "#9a3412" }}>
                            Important Instruction
                          </div>
                          <div style={{ color: "#9a3412", lineHeight: 1.7 }}>
                            {bankDetails.instruction ||
                              "After making payment, please upload your payment receipt so the school can verify and update your payment record."}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-end gap-2 flex-wrap mt-4">
                      <button
                        className="btn btn-outline-secondary"
                        onClick={() => setBankModalOpen(false)}
                      >
                        Close
                      </button>

                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setBankModalOpen(false);
                          showSuccess?.(
                            "Use the bank details to make payment and upload your receipt afterward."
                          );
                        }}
                      >
                        <i className="bi bi-check-circle me-1" />
                        I understand
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}