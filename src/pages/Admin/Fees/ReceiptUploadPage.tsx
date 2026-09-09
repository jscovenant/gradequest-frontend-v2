import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../../../utils/axios";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

type ReceiptRow = {
  id: number;
  student_id: number;
  payment_method: "online" | "cash" | string;
  status: "pending" | "accepted" | "rejected" | "approved" | string;
  files: string[];
  created_at?: string | null;
  updated_at?: string | null;
};

type ChildOption = {
  id: number;
  name?: string;
  firstname?: string;
  surname?: string;
  reg_no?: string;
  class_name?: string;
  class?: string;
};

type MyReceiptsResponse = {
  reg_no: string;
  student?: { id: number; reg_no: string; name: string };
  receipts: ReceiptRow[];
};

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function statusBadge(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "accepted" || s === "approved") {
    return <span className="badge bg-success-subtle text-success fw-bold px-2 py-1"><i className="bi bi-check-circle-fill me-1" />Verified & Approved</span>;
  }
  if (s === "rejected") {
    return <span className="badge bg-danger-subtle text-danger fw-bold px-2 py-1"><i className="bi bi-x-circle-fill me-1" />Declined</span>;
  }
  return <span className="badge bg-warning-subtle text-warning fw-bold px-2 py-1"><i className="bi bi-clock-history me-1" />Under Bursary Review</span>;
}

function isImage(url: string) {
  const u = (url || "").toLowerCase();
  return u.endsWith(".jpg") || u.endsWith(".jpeg") || u.endsWith(".png") || u.endsWith(".webp");
}

const LAST_REGNO_KEY = "gq_receipts_last_reg_no";

export default function ReceiptUploadPage() {
  const navigate = useNavigate();
  const q = useQuery();
  const { showSuccess, showError, showInfo } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const initialRegNo = q.get("reg_no") || localStorage.getItem(LAST_REGNO_KEY) || "";
  const [regNo, setRegNo] = useState<string>(initialRegNo);

  const [children, setChildren] = useState<ChildOption[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">("online");
  const [amount, setAmount] = useState<string>("");

  const [files, setFiles] = useState<File[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [studentName, setStudentName] = useState<string>("");

  // Load parent's children to populate selector
  useEffect(() => {
    authApi
      .get("/parent/children")
      .then((res) => {
        const list = res.data?.children || [];
        setChildren(list);
        if (!regNo && list.length > 0) {
          const firstReg = list[0].reg_no;
          if (firstReg) setRegNo(firstReg);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = useMemo(() => {
    return !!regNo.trim() && files.length > 0 && !uploading;
  }, [regNo, files.length, uploading]);

  const loadReceipts = async (rn?: string) => {
    const v = (rn ?? regNo).trim();
    if (!v) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.get<MyReceiptsResponse>(`/my-receipts?reg_no=${encodeURIComponent(v)}`);
      setReceipts(res.data?.receipts || []);
      setStudentName(res.data?.student?.name || "");
    } catch (e: any) {
      console.error(e);
      showError(e?.response?.data?.message || "Failed to load receipts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const v = regNo.trim();
    if (v) {
      localStorage.setItem(LAST_REGNO_KEY, v);
      const params = new URLSearchParams(window.location.search);
      if (params.get("reg_no") !== v) {
        params.set("reg_no", v);
        navigate({ search: params.toString() }, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regNo]);

  useEffect(() => {
    loadReceipts(regNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regNo]);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;

    const tooBig = list.find((f) => f.size > 5 * 1024 * 1024);
    if (tooBig) {
      showError("One of the files is larger than 5MB. Please upload a smaller document.");
      return;
    }

    setFiles(list);
  };

  const removePicked = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (!canSubmit) return;

    const rn = regNo.trim();
    if (!rn) {
      showError("Student Admission / Reg No is required.");
      return;
    }

    const fd = new FormData();
    fd.append("reg_no", rn);
    fd.append("payment_method", paymentMethod);
    if (amount.trim()) fd.append("amount", amount.trim());
    files.forEach((f) => fd.append("receipts[]", f));

    setUploading(true);
    try {
      await authApi.post("/upload-receipts", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showSuccess("Receipt uploaded successfully. The school bursary will review and confirm.");
      setFiles([]);
      setAmount("");
      await loadReceipts(rn);
    } catch (e: any) {
      console.error(e);
      showError(e?.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        .p-up-main {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: calc(66px + 24px) 28px 40px !important;
        }

        @media (max-width: 767.98px) {
          .p-up-main {
            padding: calc(66px + 16px) 14px 36px !important;
          }
          .p-up-hero {
            padding: 20px 18px !important;
            border-radius: 14px !important;
            margin-bottom: 16px !important;
          }
          .p-up-title {
            font-size: 20px !important;
          }
          .p-up-sub {
            font-size: 12.5px !important;
          }
        }

        .p-up-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 32px 36px;
          color: #FFFFFF;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
          position: relative;
          overflow: hidden;
        }

        .p-up-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        .p-up-hero-glow {
          position: absolute;
          top: -40px;
          right: -40px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.2) 0%, transparent 65%);
          pointer-events: none;
        }

        .p-up-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }

        .p-up-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
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

        .p-up-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 6px #10B981;
        }

        .p-up-title {
          font-size: 26px;
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.1;
          margin-bottom: 8px;
        }

        .p-up-title em {
          font-style: normal;
          color: #FBBF24;
        }

        .p-up-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.6;
          max-width: 620px;
          margin-bottom: 0;
        }

        .p-card {
          background: #FFFFFF;
          border: 1px solid rgba(15, 39, 68, 0.08);
          border-radius: 18px;
          box-shadow: 0 4px 20px rgba(15, 39, 68, 0.06);
          overflow: hidden;
        }

        .p-card-head {
          padding: 18px 24px;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Upload Payment Receipt - SchoolProfit" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto gq-app-main p-up-main d-flex flex-column min-vh-100">
            {loading && <Loader message="Loading receipts..." />}

            {/* ── Signature Hero ── */}
            <div className="p-up-hero">
              <div className="p-up-hero-glow" />
              <div className="p-up-hero-inner">
                <div>
                  <div className="p-up-badge">
                    <span className="p-up-dot" />
                    Parent Portal · Bursary Clearance
                  </div>
                  <h1 className="p-up-title">
                    Upload Payment Receipt {studentName ? <span>— <em>{studentName}</em></span> : ""}
                  </h1>
                  <p className="p-up-sub">
                    Upload proof of direct bank transfer, deposit slip, or electronic receipt for school review and clearance.
                  </p>
                </div>

                <div className="d-flex gap-2 flex-wrap">
                  <button
                    type="button"
                    className="btn btn-outline-light rounded-pill px-4 fw-bold"
                    onClick={() => navigate("/parent/children")}
                  >
                    <i className="bi bi-arrow-left me-1" />
                    My Children
                  </button>

                  <button
                    type="button"
                    className="btn btn-warning rounded-pill px-4 fw-bold"
                    style={{ color: "#0F2744", background: "#FBBF24" }}
                    onClick={() => {
                      showInfo("Refreshing receipt history...");
                      loadReceipts();
                    }}
                  >
                    <i className="bi bi-arrow-clockwise me-1" />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            <div className="row g-4 mb-5">
              {/* ── Upload Form ── */}
              <div className="col-lg-5">
                <div className="p-card">
                  <div className="p-card-head">
                    <div>
                      <h2 className="fs-6 fw-bold mb-0 text-dark">
                        <i className="bi bi-cloud-arrow-up-fill me-2 text-primary" />
                        Submit New Proof of Payment
                      </h2>
                      <small className="text-muted">Accepted formats: JPG, PNG, PDF (Max 5MB)</small>
                    </div>
                  </div>

                  <div className="p-4">
                    {/* Child Quick Selector if available */}
                    {children.length > 0 && (
                      <div className="mb-3">
                        <label className="form-label fw-bold small text-muted text-uppercase">
                          Select Child / Ward
                        </label>
                        <select
                          className="form-select rounded-3 py-2"
                          value={regNo}
                          onChange={(e) => setRegNo(e.target.value)}
                        >
                          <option value="">-- Choose student --</option>
                          {children.map((c) => (
                            <option key={c.id} value={c.reg_no || ""}>
                              {c.name || `${c.surname || ""} ${c.firstname || ""}`.trim()} ({c.reg_no || "No Reg No"})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label fw-bold small text-muted text-uppercase">
                        Student Admission / Reg No
                      </label>
                      <input
                        className="form-control rounded-3 py-2"
                        value={regNo}
                        onChange={(e) => setRegNo(e.target.value)}
                        placeholder="e.g. REG/2026/001"
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold small text-muted text-uppercase">
                        Payment Channel / Method
                      </label>
                      <select
                        className="form-select rounded-3 py-2"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                      >
                        <option value="online">Bank Transfer / Electronic Deposit</option>
                        <option value="cash">Direct Bank Teller Deposit / Cash</option>
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold small text-muted text-uppercase">
                        Amount Paid (₦) <span className="text-muted fw-normal">(optional)</span>
                      </label>
                      <input
                        type="number"
                        className="form-control rounded-3 py-2"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="e.g. 50000"
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold small text-muted text-uppercase">
                        Attach Receipt Evidence <span className="text-danger">*</span>
                      </label>
                      <input
                        className="form-control rounded-3 py-2"
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={onPickFiles}
                      />
                    </div>

                    {files.length > 0 && (
                      <div className="p-3 rounded-3 mb-3 bg-light border">
                        <div className="fw-bold small text-dark mb-2">
                          Attached Files ({files.length}):
                        </div>
                        <div className="d-flex flex-column gap-2">
                          {files.map((f, idx) => (
                            <div key={idx} className="d-flex align-items-center justify-content-between bg-white p-2 rounded border">
                              <div className="small">
                                <div className="fw-bold text-truncate" style={{ maxWidth: 220 }}>{f.name}</div>
                                <div className="text-muted" style={{ fontSize: "11px" }}>
                                  {(f.size / (1024 * 1024)).toFixed(2)} MB
                                </div>
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger rounded-pill px-2 py-0"
                                onClick={() => removePicked(idx)}
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="d-flex gap-2 pt-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary rounded-pill px-3"
                        onClick={() => {
                          setFiles([]);
                          setAmount("");
                        }}
                        disabled={uploading}
                      >
                        Clear
                      </button>

                      <button
                        type="button"
                        className="btn btn-primary rounded-pill px-4 fw-bold ms-auto"
                        onClick={submit}
                        disabled={!canSubmit}
                      >
                        {uploading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Uploading Proof...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-cloud-arrow-up-fill me-1" />
                            Submit Receipt
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Uploaded Receipts List ── */}
              <div className="col-lg-7">
                <div className="p-card">
                  <div className="p-card-head">
                    <div>
                      <h2 className="fs-6 fw-bold mb-0 text-dark">
                        <i className="bi bi-clock-history me-2 text-primary" />
                        Receipt Submissions & Verification History
                      </h2>
                      <small className="text-muted">Track clearance reviews from school bursary</small>
                    </div>
                    <span className="badge bg-primary rounded-pill px-3 py-1">
                      {receipts.length} submission{receipts.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="p-4">
                    {receipts.length === 0 ? (
                      <div className="text-center py-5 text-muted">
                        <i className="bi bi-receipt-cutoff fs-1 d-block mb-2 text-secondary" />
                        No receipts uploaded yet for this student.
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {receipts.map((r) => (
                          <div
                            key={r.id}
                            className="p-3 border rounded-4 bg-light"
                          >
                            <div className="d-flex flex-wrap justify-content-between gap-2 align-items-center mb-2">
                              <div>
                                <div className="fw-bold text-dark fs-6">
                                  Receipt #{r.id}
                                </div>
                                <div className="text-muted small">
                                  Channel: <strong>{String(r.payment_method).toUpperCase()}</strong> • Submitted:{" "}
                                  {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                                </div>
                              </div>

                              <div>{statusBadge(r.status)}</div>
                            </div>

                            <div className="row g-2 mt-2">
                              {r.files?.map((url, idx) => (
                                <div className="col-sm-6" key={idx}>
                                  <div className="p-2 bg-white rounded-3 border">
                                    {isImage(url) ? (
                                      <a href={url} target="_blank" rel="noreferrer" className="d-block text-decoration-none">
                                        <img
                                          src={url}
                                          alt="receipt attachment"
                                          className="w-100 rounded-2 object-fit-cover"
                                          style={{ height: 140 }}
                                        />
                                        <small className="text-muted d-block mt-1 text-center">Click to view full image</small>
                                      </a>
                                    ) : (
                                      <div className="d-flex align-items-center justify-content-between p-2">
                                        <div className="d-flex align-items-center gap-2">
                                          <i className="bi bi-file-earmark-pdf fs-3 text-danger" />
                                          <div className="small fw-bold">PDF Document</div>
                                        </div>
                                        <a
                                          className="btn btn-sm btn-outline-dark rounded-pill px-3"
                                          href={url}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          View PDF
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}