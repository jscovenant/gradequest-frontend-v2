// src/pages/Parents/ReceiptUploadPage.tsx
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
  if (s === "accepted" || s === "approved") return "bg-success";
  if (s === "rejected") return "bg-danger";
  return "bg-warning text-dark";
}

function isImage(url: string) {
  const u = (url || "").toLowerCase();
  return u.endsWith(".jpg") || u.endsWith(".jpeg") || u.endsWith(".png");
}

const LAST_REGNO_KEY = "gq_receipts_last_reg_no";

export default function ReceiptUploadPage() {
  const navigate = useNavigate();
  const q = useQuery();
  const { showSuccess, showError, showInfo } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // ✅ reg_no persisted via URL ?reg_no= and localStorage fallback
  const initialRegNo = q.get("reg_no") || localStorage.getItem(LAST_REGNO_KEY) || "";
  const [regNo, setRegNo] = useState<string>(initialRegNo);

  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">("online");
  const [termId, setTermId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  const [files, setFiles] = useState<File[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [studentName, setStudentName] = useState<string>("");

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
      // do not wipe list
    } finally {
      setLoading(false);
    }
  };

  // ✅ keep URL + localStorage synced
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

  // ✅ reload whenever regNo changes
  useEffect(() => {
    loadReceipts(regNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regNo]);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;

    const tooBig = list.find((f) => f.size > 5 * 1024 * 1024);
    if (tooBig) {
      showError("One of the files is larger than 5MB. Please reduce it.");
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
      showError("Student Reg No is required.");
      return;
    }

    const fd = new FormData();
    fd.append("reg_no", rn);
    fd.append("payment_method", paymentMethod);

    if (termId.trim()) fd.append("term_id", termId.trim());
    if (sessionId.trim()) fd.append("session_id", sessionId.trim());
    if (amount.trim()) fd.append("amount", amount.trim());

    files.forEach((f) => fd.append("receipts[]", f));

    setUploading(true);
    try {
      await authApi.post("/upload-receipts", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showSuccess("Receipts uploaded successfully. Status: Pending");
      setFiles([]);
      setAmount("");
      setTermId("");
      setSessionId("");

      await loadReceipts(rn);
    } catch (e: any) {
      console.error(e);
      showError(e?.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Upload Reciept" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main
            className="col-md-9 col-lg-10 ms-auto px-4 d-flex flex-column min-vh-100"
            style={{ backgroundColor: "#f8f9fa" }}
          >
            {loading && <Loader message="Loading receipts..." />}

            {/* Header */}
            <div
              className="mt-4 p-4"
              style={{
                background: "linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)",
                borderRadius: 16,
                boxShadow: "0 10px 30px rgba(14, 165, 233, 0.2)",
              }}
            >
              <div className="d-flex flex-wrap justify-content-between align-items-center">
                <div>
                  <span
                    className="badge px-3 py-2 mb-2"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.2)",
                      color: "#fff",
                      borderRadius: 20,
                      fontSize: "0.75rem",
                      fontWeight: 500,
                    }}
                  >
                    <i className="bi bi-upload me-1" />
                    Receipts
                  </span>

                  <h3 className="fw-bold text-white mb-1">
                    Upload Payment Receipt {studentName ? `— ${studentName}` : ""}
                  </h3>
                  <p className="text-white mb-0" style={{ opacity: 0.9 }}>
                    Upload JPG/PNG/PDF evidence after payment. Admin will review and update status.
                  </p>
                </div>

                <div className="d-flex gap-2 mt-3 mt-md-0">
                  <button className="btn btn-light" style={{ borderRadius: 10 }} onClick={() => navigate(-1)}>
                    <i className="bi bi-arrow-left me-2" />
                    Back
                  </button>

                  <button
                    className="btn btn-dark"
                    style={{ borderRadius: 10 }}
                    onClick={() => {
                      showInfo("Refreshing...");
                      loadReceipts();
                    }}
                  >
                    <i className="bi bi-arrow-clockwise me-2" />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            <div className="row g-4 mt-1 mb-5">
              {/* Upload form */}
              <div className="col-lg-5">
                <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <h6 className="fw-semibold mb-0" style={{ color: "#1e293b" }}>
                          Upload Receipt
                        </h6>
                        <small className="text-muted">Max 5MB per file • JPG/PNG/PDF</small>
                      </div>
                    </div>

                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label">Student Reg No</label>
                        <input
                          className="form-control"
                          style={{ borderRadius: 10 }}
                          value={regNo}
                          onChange={(e) => setRegNo(e.target.value)}
                          placeholder="e.g. REG/2026/001"
                        />
                        <small className="text-muted">
                          Saved automatically and kept on refresh.
                        </small>
                      </div>

                      <div className="col-12">
                        <label className="form-label">Payment Method</label>
                        <select
                          className="form-select"
                          style={{ borderRadius: 10 }}
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as any)}
                        >
                          <option value="online">Online / Transfer</option>
                          <option value="cash">Cash</option>
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Term ID (optional)</label>
                        <input
                          className="form-control"
                          style={{ borderRadius: 10 }}
                          value={termId}
                          onChange={(e) => setTermId(e.target.value)}
                          placeholder="e.g. 2"
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Session ID (optional)</label>
                        <input
                          className="form-control"
                          style={{ borderRadius: 10 }}
                          value={sessionId}
                          onChange={(e) => setSessionId(e.target.value)}
                          placeholder="e.g. 5"
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label">Amount (optional)</label>
                        <input
                          className="form-control"
                          style={{ borderRadius: 10 }}
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="e.g. 25000"
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label">Receipt Files</label>
                        <input
                          className="form-control"
                          style={{ borderRadius: 10 }}
                          type="file"
                          multiple
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={onPickFiles}
                        />
                      </div>

                      <div className="col-12">
                        {files.length === 0 ? (
                          <div className="text-muted small">No files selected yet.</div>
                        ) : (
                          <div className="p-3 rounded-3" style={{ background: "#f8fafc", border: "1px solid #eef2f7" }}>
                            <div className="fw-semibold mb-2" style={{ color: "#0f172a" }}>
                              Selected Files ({files.length})
                            </div>

                            <div className="d-flex flex-column gap-2">
                              {files.map((f, idx) => (
                                <div key={idx} className="d-flex align-items-center justify-content-between">
                                  <div className="small">
                                    <div className="fw-semibold">{f.name}</div>
                                    <div className="text-muted">
                                      {(f.size / (1024 * 1024)).toFixed(2)} MB
                                    </div>
                                  </div>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    style={{ borderRadius: 10 }}
                                    type="button"
                                    onClick={() => removePicked(idx)}
                                  >
                                    <i className="bi bi-x-lg me-1" />
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="col-12 d-flex gap-2">
                        <button
                          className="btn btn-outline-secondary"
                          style={{ borderRadius: 10 }}
                          type="button"
                          onClick={() => {
                            setFiles([]);
                            setAmount("");
                            setTermId("");
                            setSessionId("");
                          }}
                          disabled={uploading}
                        >
                          Reset
                        </button>

                        <button
                          className="btn btn-primary ms-auto"
                          style={{ borderRadius: 10 }}
                          type="button"
                          onClick={submit}
                          disabled={!canSubmit}
                        >
                          {uploading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-cloud-arrow-up me-2" />
                              Upload
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <small className="text-muted d-block mt-3">
                  Endpoints: <code>POST /upload-receipts</code> • <code>GET /my-receipts?reg_no=...</code>
                </small>
              </div>

              {/* Uploaded list */}
              <div className="col-lg-7">
                <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <h6 className="fw-semibold mb-0" style={{ color: "#1e293b" }}>
                          Uploaded Receipts
                        </h6>
                        <small className="text-muted">Track status (Pending / Accepted / Rejected).</small>
                      </div>
                      <span className="badge bg-primary">{receipts.length} records</span>
                    </div>

                    {receipts.length === 0 ? (
                      <div className="text-muted text-center py-5">No receipts yet for this Reg No.</div>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {receipts.map((r) => (
                          <div
                            key={r.id}
                            className="p-3"
                            style={{
                              border: "1px solid #eef2f7",
                              borderRadius: 14,
                              background: "#ffffff",
                              boxShadow: "0 2px 10px rgba(15,23,42,0.04)",
                            }}
                          >
                            <div className="d-flex flex-wrap justify-content-between gap-2 align-items-center">
                              <div>
                                <div className="fw-semibold" style={{ color: "#0f172a" }}>
                                  Receipt #{r.id}
                                </div>
                                <div className="text-muted small">
                                  Method: {String(r.payment_method).toUpperCase()} • Uploaded:{" "}
                                  {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                                </div>
                              </div>

                              <span className={`badge ${statusBadge(r.status)}`}>
                                {String(r.status).toUpperCase()}
                              </span>
                            </div>

                            <hr className="my-3" />

                            <div className="row g-2">
                              {r.files?.map((url, idx) => (
                                <div className="col-12 col-md-6" key={idx}>
                                  <div
                                    className="p-2"
                                    style={{
                                      borderRadius: 12,
                                      border: "1px solid #eef2f7",
                                      background: "#f8fafc",
                                    }}
                                  >
                                    {isImage(url) ? (
                                      <a href={url} target="_blank" rel="noreferrer">
                                        <img
                                          src={url}
                                          alt="receipt"
                                          style={{
                                            width: "100%",
                                            height: 160,
                                            objectFit: "cover",
                                            borderRadius: 10,
                                          }}
                                        />
                                      </a>
                                    ) : (
                                      <div className="d-flex align-items-center justify-content-between">
                                        <div className="d-flex align-items-center gap-2">
                                          <i className="bi bi-file-earmark-pdf fs-4 text-danger" />
                                          <div>
                                            <div className="fw-semibold">Receipt PDF</div>
                                            <div className="text-muted small">Click to open</div>
                                          </div>
                                        </div>

                                        <a className="btn btn-sm btn-outline-dark" style={{ borderRadius: 10 }} href={url} target="_blank" rel="noreferrer">
                                          View
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="text-muted small mt-2">
                              If rejected, please re-upload a clearer receipt or correct Reg No.
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <small className="text-muted d-block mt-3">
                  Tip: Open directly: <code>/parent/upload-receipt?reg_no=REG123</code>
                </small>
              </div>
            </div>

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}