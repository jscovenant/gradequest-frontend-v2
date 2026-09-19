import React, { useState, useEffect, useRef } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import PageTitle from "../../../components/PageTitle";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";

export default function AdmissionsManagementPage() {
  const { showSuccess, showError, showInfo, showWarning } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"applications" | "settings">("applications");
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [settings, setSettings] = useState<any>({});
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [schoolProfile, setSchoolProfile] = useState<any>(null);
  const [directFormUrl, setDirectFormUrl] = useState<string>("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Selected Candidate Drawer / Modal
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [examScoreInput, setExamScoreInput] = useState<string>("");
  const [reviewerNotesInput, setReviewerNotesInput] = useState<string>("");
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>("");
  const [showRejectBox, setShowRejectBox] = useState(false);

  // 1-Click Enrollment Modal State
  const [enrollingCandidate, setEnrollingCandidate] = useState<any>(null);
  const [enrollLevelId, setEnrollLevelId] = useState<string>("");
  const [enrollSectionId, setEnrollSectionId] = useState<string>("");
  const [enrollDepartmentId, setEnrollDepartmentId] = useState<string>("");
  const [enrollRegNo, setEnrollRegNo] = useState<string>("");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentSuccessData, setEnrollmentSuccessData] = useState<any>(null);

  // Settings Save State
  const [savingSettings, setSavingSettings] = useState(false);

  // Printable Slip Ref
  const printSlipRef = useRef<HTMLDivElement>(null);
  const [showPrintSlip, setShowPrintSlip] = useState(false);

  useEffect(() => {
    fetchApplications();
    fetchSettings();
  }, [page, statusFilter, classFilter, paymentFilter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await authApi.get("/admin/admissions/applications", {
        params: {
          search,
          status: statusFilter,
          class: classFilter,
          payment_status: paymentFilter,
          page,
        },
      });

      if (res.data.status) {
        setApplications(res.data.applications?.data || []);
        setCounts(res.data.counts || {});
        setTotalRevenue(res.data.total_revenue || 0);
        setTotalPages(res.data.applications?.last_page || 1);
      }
    } catch (err: any) {
      console.error("Error fetching applications:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await authApi.get("/admin/admissions/settings");
      if (res.data.status) {
        setSettings(res.data.settings || {});
        setClasses(res.data.classes || []);
        setSchoolProfile(res.data.school || null);
        setDirectFormUrl(res.data.direct_form_url || "");
      }
    } catch (err: any) {
      console.error("Error loading admission settings:", err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchApplications();
  };

  const openCandidateDetails = async (candidateId: number) => {
    try {
      const res = await authApi.get(`/admin/admissions/applications/${candidateId}`);
      if (res.data.status) {
        setSelectedCandidate(res.data.application);
        setClasses(res.data.classes || []);
        setSections(res.data.sections || []);
        setDepartments(res.data.departments || []);
        setExamScoreInput(res.data.application.exam_score ? String(res.data.application.exam_score) : "");
        setReviewerNotesInput(res.data.application.reviewer_notes || "");
        setRejectionReasonInput(res.data.application.rejection_reason || "");
        setShowRejectBox(false);
      }
    } catch (err: any) {
      showError?.("Could not load candidate details.");
    }
  };

  const handleUpdateStatus = async (status: "submitted" | "under_review" | "admitted" | "rejected") => {
    if (!selectedCandidate) return;
    setUpdatingStatus(true);
    try {
      const payload: any = {
        status,
        reviewer_notes: reviewerNotesInput,
      };

      if (status === "rejected") {
        payload.rejection_reason = rejectionReasonInput || "Application did not meet admission criteria.";
      }

      const res = await authApi.put(`/admin/admissions/applications/${selectedCandidate.id}/status`, payload);
      if (res.data.status) {
        showSuccess?.(`Candidate marked as ${status.toUpperCase()} successfully!`);
        setSelectedCandidate(res.data.application);
        setShowRejectBox(false);
        fetchApplications();
      }
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to update status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleOpenEnrollModal = (candidate: any) => {
    setEnrollingCandidate(candidate);
    setEnrollLevelId(candidate.level_id ? String(candidate.level_id) : (classes[0]?.id ? String(classes[0].id) : ""));
    setEnrollSectionId(sections[0]?.id ? String(sections[0].id) : "");
    setEnrollDepartmentId(candidate.department_id ? String(candidate.department_id) : "");
    setEnrollRegNo("");
    setEnrollmentSuccessData(null);
  };

  const handleExecuteEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollingCandidate || !enrollLevelId || !enrollSectionId) {
      showWarning?.("Please select Class and Section to proceed.");
      return;
    }

    setIsEnrolling(true);
    try {
      const res = await authApi.post(`/admin/admissions/applications/${enrollingCandidate.id}/enroll`, {
        level_id: Number(enrollLevelId),
        section_id: Number(enrollSectionId),
        department_id: enrollDepartmentId ? Number(enrollDepartmentId) : null,
        reg_no: enrollRegNo.trim() || undefined,
      });

      if (res.data.status) {
        showSuccess?.("Candidate successfully enrolled as an active student!");
        setEnrollmentSuccessData(res.data);
        if (selectedCandidate && selectedCandidate.id === enrollingCandidate.id) {
          setSelectedCandidate(res.data.application);
        }
        fetchApplications();
      }
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Enrollment failed. Please check registration number uniqueness.");
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await authApi.put("/admin/admissions/settings", settings);
      if (res.data.status) {
        showSuccess?.("Online admission configuration updated successfully!");
        setSettings(res.data.settings);
      }
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Failed to save admission settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePrintAdmissionSlip = () => {
    const printContent = printSlipRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=850,height=900");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Official Admission Slip - ${selectedCandidate?.application_number}</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 25px; color: #0F172A; background: #fff; }
              .slip-header { border-bottom: 2px solid #0F2744; padding-bottom: 15px; margin-bottom: 20px; }
              .slip-badge { font-size: 14px; font-weight: 800; padding: 6px 14px; border-radius: 6px; }
              @media print {
                body { padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${printContent}
            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .db-main { background: #F8FAFC; min-height: 100vh; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; padding: 24px 28px 60px; }
        .db-hero { background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%); border-radius: 18px; padding: 30px 34px; position: relative; overflow: hidden; margin: 10px 0 24px; box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15); }
        .db-hero-glow { position: absolute; top: -60px; right: -60px; width: 320px; height: 320px; border-radius: 50%; background: radial-gradient(circle, rgba(217, 119, 6, 0.15) 0%, transparent 65%); pointer-events: none; }
        .db-hero-glow2 { position: absolute; bottom: -40px; left: 30%; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(37, 99, 235, 0.10) 0%, transparent 70%); pointer-events: none; }
        .db-hero-inner { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
        .db-session-badge { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #FBBF24; background: rgba(217, 119, 6, 0.20); border: 1px solid rgba(217, 119, 6, 0.35); border-radius: 100px; padding: 4px 12px; margin-bottom: 10px; }
        .db-session-dot { width: 6px; height: 6px; border-radius: 50%; background: #10B981; }
        .db-greeting { font-size: 24px; font-weight: 800; color: #fff; line-height: 1.2; margin-bottom: 6px; }
        .db-greeting em { font-style: normal; color: #FBBF24; }
        .db-hero-sub { font-size: 13px; color: #CBD5E1; line-height: 1.5; max-width: 620px; margin-bottom: 16px; }
        .db-hero-btns { display: flex; gap: 10px; flex-wrap: wrap; }
        .db-btn-gold { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; font-size: 13px; font-weight: 700; color: #FFFFFF; background: #D97706; border: none; border-radius: 10px; cursor: pointer; transition: all 0.2s ease; text-decoration: none; }
        .db-btn-gold:hover { background: #B45309; color: #FFFFFF; transform: translateY(-1px); }
        .db-btn-outline { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; font-size: 13px; font-weight: 600; color: #FFFFFF; background: rgba(255, 255, 255, 0.10); border: 1px solid rgba(255, 255, 255, 0.20); border-radius: 10px; cursor: pointer; transition: all 0.2s ease; text-decoration: none; }
        .db-btn-outline:hover { background: rgba(255, 255, 255, 0.18); color: #fff; }
        
        .db-panel { background: #fff; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,39,68,0.03); margin-bottom: 24px; }
        .db-panel-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 22px; border-bottom: 1px solid #F1F5F9; gap: 12px; flex-wrap: wrap; background: #FFFFFF; }
        .db-panel-title { font-size: 15.5px; font-weight: 700; color: #0F2744; margin: 0; display: flex; align-items: center; gap: 8px; }
        .db-panel-sub { font-size: 12px; font-weight: 400; color: #64748B; margin: 2px 0 0; }
        
        .db-tabs-bar { display: flex; gap: 6px; border-bottom: 2px solid #E2E8F0; margin-bottom: 22px; overflow-x: auto; padding-bottom: 2px; }
        .db-tab-item { padding: 9px 18px; font-size: 13.5px; font-weight: 700; color: #64748B; border: none; background: transparent; border-bottom: 3px solid transparent; cursor: pointer; transition: all 0.2s; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
        .db-tab-item.active { color: #0F2744; border-bottom-color: #D97706; background: rgba(217, 119, 6, 0.05); border-radius: 8px 8px 0 0; }
        .db-tab-item:hover { color: #0F2744; }

        .stat-card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .stat-box { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 16px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
        .stat-box-val { font-size: 22px; font-weight: 800; color: #0F2744; margin-top: 4px; }
        .stat-box-label { font-size: 11.5px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.04em; }

        @media (max-width: 991.98px) { .db-main { padding: 18px 14px 60px; } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Online Admissions & Candidate Approval" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loading && <Loader message="Loading candidate applications & fees..." />}

            {/* HERO BANNER */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Admissions Desk & Split Settlements
                  </div>

                  <h1 className="db-greeting">
                    Online Admissions & <em>Candidate Approvals</em>
                  </h1>

                  <p className="db-hero-sub">
                    Screen candidate submissions, review entrance exam performances, approve and admit candidates, and 1-click enroll students with auto-generated parent login accounts.
                  </p>

                  <div className="db-hero-btns">
                    {directFormUrl && (
                      <a href={directFormUrl} target="_blank" rel="noreferrer" className="db-btn-gold">
                        <i className="bi bi-box-arrow-up-right"></i>
                        Open Public Admission Form
                      </a>
                    )}
                    <button className="db-btn-outline" onClick={() => { fetchApplications(); fetchSettings(); }} disabled={loading}>
                      <i className="bi bi-arrow-clockwise"></i>
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="db-hero-stat-card d-none d-lg-block" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 14, padding: "16px 20px", minWidth: 260 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#FBBF24", marginBottom: 10 }}>
                    Settlement & Revenue
                  </div>
                  <div className="d-flex flex-column gap-2 text-white">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-white-50">Total Form Revenue:</span>
                      <span className="fw-bold text-warning fs-6">₦{Number(totalRevenue || 0).toLocaleString()}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-white-50">Portal Status:</span>
                      <span className="badge bg-success bg-opacity-25 text-white">{settings.is_open ? "Active & Open" : "Closed"}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-white-50">Form Fee / Applicant:</span>
                      <span className="fw-bold text-white">₦{Number(settings.application_fee || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STAT CARDS */}
            <div className="stat-card-grid">
              <div className="stat-box">
                <div className="stat-box-label">Total Applicants</div>
                <div className="stat-box-val">{counts.all || 0}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">Under Review</div>
                <div className="stat-box-val text-primary">{counts.under_review || 0}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">Admitted Candidates</div>
                <div className="stat-box-val text-success">{counts.admitted || 0}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">Enrolled Students</div>
                <div className="stat-box-val text-warning">{counts.enrolled || 0}</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">Paid Entrance Fees</div>
                <div className="stat-box-val text-dark">₦{Number(totalRevenue || 0).toLocaleString()}</div>
              </div>
            </div>

            {/* NAVIGATION TABS */}
            <div className="db-tabs-bar">
              <button
                className={`db-tab-item ${activeTab === "applications" ? "active" : ""}`}
                onClick={() => setActiveTab("applications")}
              >
                <i className="bi bi-people"></i>
                Candidate Applications & Approvals ({counts.all || 0})
              </button>
              <button
                className={`db-tab-item ${activeTab === "settings" ? "active" : ""}`}
                onClick={() => setActiveTab("settings")}
              >
                <i className="bi bi-gear"></i>
                Admission Fees & Requirements Configuration
              </button>
            </div>

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 1: APPLICATIONS & APPROVALS */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === "applications" && (
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <h4 className="db-panel-title">
                      <i className="bi bi-people text-warning"></i> Registered Candidates Roster
                    </h4>
                    <p className="db-panel-sub">Screen applications, record entrance exam scores, approve admissions, and 1-click enroll.</p>
                  </div>

                  {/* Filters Form */}
                  <form onSubmit={handleSearchSubmit} className="d-flex gap-2 flex-wrap align-items-center">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Search candidate name, app no, phone..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ width: 230 }}
                    />
                    <select
                      className="form-select form-select-sm"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      style={{ width: 140 }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="submitted">Submitted</option>
                      <option value="under_review">Under Review</option>
                      <option value="admitted">Admitted</option>
                      <option value="enrolled">Enrolled</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <select
                      className="form-select form-select-sm"
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value)}
                      style={{ width: 140 }}
                    >
                      <option value="all">All Payments</option>
                      <option value="paid">Fee Paid ✓</option>
                      <option value="pending">Pending Payment</option>
                    </select>
                    <button type="submit" className="btn btn-warning btn-sm fw-bold">
                      <i className="bi bi-search"></i>
                    </button>
                  </form>
                </div>

                <div className="p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light small">
                        <tr>
                          <th className="ps-4">Candidate Profile</th>
                          <th>Application No</th>
                          <th>Applied Class</th>
                          <th>Parent / Guardian</th>
                          <th>Form Fee</th>
                          <th>Status</th>
                          <th className="pe-4 text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-5 text-muted">
                              <i className="bi bi-folder-x fs-2 text-muted"></i>
                              <p className="mt-2 mb-0">No registered candidate applications found.</p>
                            </td>
                          </tr>
                        ) : (
                          applications.map((app: any) => (
                            <tr key={app.id}>
                              <td className="ps-4">
                                <div className="d-flex align-items-center gap-3">
                                  <div className="rounded-circle overflow-hidden bg-light d-flex align-items-center justify-content-center border" style={{ width: 42, height: 42 }}>
                                    {app.passport_photo ? (
                                      <img src={app.passport_photo} alt="Candidate" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                      <i className="bi bi-person text-muted fs-5"></i>
                                    )}
                                  </div>
                                  <div>
                                    <div className="fw-bold text-dark">{app.surname}, {app.firstname} {app.other_names || ""}</div>
                                    <div className="text-muted small">{app.gender || "—"} • {app.dob ? new Date(app.dob).toLocaleDateString() : "—"}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="badge bg-light text-dark border font-monospace px-2 py-1">
                                  {app.application_number}
                                </span>
                              </td>
                              <td>
                                <span className="fw-bold text-dark">{app.applied_class_name || app.level?.name || "—"}</span>
                              </td>
                              <td>
                                <div className="small fw-semibold text-dark">{app.parent_name}</div>
                                <div className="small text-muted">{app.parent_phone}</div>
                              </td>
                              <td>
                                {app.payment_status === "paid" ? (
                                  <span className="badge bg-success bg-opacity-10 text-success fw-bold">
                                    <i className="bi bi-check-circle me-1"></i> Paid ₦{Number(app.payment?.school_amount || app.payment?.total_amount || settings.application_fee || 0).toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="badge bg-warning bg-opacity-10 text-warning fw-bold">
                                    <i className="bi bi-clock me-1"></i> Pending
                                  </span>
                                )}
                              </td>
                              <td>
                                {app.status === "enrolled" ? (
                                  <span className="badge bg-primary">Enrolled Student</span>
                                ) : app.status === "admitted" ? (
                                  <span className="badge bg-success">Admitted ✓</span>
                                ) : app.status === "under_review" ? (
                                  <span className="badge bg-info text-dark">Under Review</span>
                                ) : app.status === "rejected" ? (
                                  <span className="badge bg-danger">Rejected</span>
                                ) : (
                                  <span className="badge bg-secondary">Submitted</span>
                                )}
                              </td>
                              <td className="pe-4 text-end">
                                <div className="d-flex justify-content-end gap-2">
                                  <button
                                    className="btn btn-outline-dark btn-sm fw-bold"
                                    onClick={() => openCandidateDetails(app.id)}
                                  >
                                    <i className="bi bi-file-earmark-person me-1"></i> Review
                                  </button>
                                  {app.status !== "enrolled" && (
                                    <button
                                      className="btn btn-success btn-sm fw-bold"
                                      onClick={() => handleOpenEnrollModal(app)}
                                    >
                                      <i className="bi bi-person-plus-fill me-1"></i> 1-Click Enroll
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="p-3 border-top d-flex justify-content-between align-items-center">
                      <span className="text-muted small">Page {page} of {totalPages}</span>
                      <div className="d-flex gap-2">
                        <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                          Previous
                        </button>
                        <button className="btn btn-outline-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 2: ADMISSION SETTINGS & FEE CONFIGURATION */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === "settings" && (
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <h4 className="db-panel-title">
                      <i className="bi bi-gear text-warning"></i> Online Admissions & Wema Bank Fee Configuration
                    </h4>
                    <p className="db-panel-sub">Set application form fees, bank split settlements, and candidate requirements.</p>
                  </div>
                </div>

                <form onSubmit={handleSaveSettings} className="p-4">
                  <div className="row g-4">
                    <div className="col-12 col-md-6">
                      <div className="form-check form-switch p-3 border rounded-3 bg-light">
                        <input
                          className="form-check-input ms-0 me-3"
                          type="checkbox"
                          id="isOpenSwitchMain"
                          checked={!!settings.is_open}
                          onChange={(e) => setSettings((p: any) => ({ ...p, is_open: e.target.checked }))}
                        />
                        <label className="form-check-label fw-bold text-dark" htmlFor="isOpenSwitchMain">
                          Admissions Portal is Active & Accepting Applications
                        </label>
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <div className="form-check form-switch p-3 border rounded-3 bg-light">
                        <input
                          className="form-check-input ms-0 me-3"
                          type="checkbox"
                          id="requirePaymentSwitchMain"
                          checked={!!settings.require_payment}
                          onChange={(e) => setSettings((p: any) => ({ ...p, require_payment: e.target.checked }))}
                        />
                        <label className="form-check-label fw-bold text-dark" htmlFor="requirePaymentSwitchMain">
                          Require Application Fee Payment (Wema Bank Virtual Account)
                        </label>
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label fw-bold small text-dark">
                        School Application Fee (₦): <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text fw-bold bg-white">₦</span>
                        <input
                          type="number"
                          className="form-control form-control-lg fw-bold text-primary"
                          value={settings.application_fee ?? 5000}
                          onChange={(e) => setSettings((p: any) => ({ ...p, application_fee: Number(e.target.value) }))}
                          placeholder="5000"
                          min={0}
                          required
                        />
                      </div>
                      <span className="text-muted small">Amount credited directly to the school's bank account per applicant.</span>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label fw-bold small text-dark">Academic Session Label:</label>
                      <input
                        type="text"
                        className="form-control form-control-lg"
                        value={settings.admission_session_name || "2026/2027 Academic Session"}
                        onChange={(e) => setSettings((p: any) => ({ ...p, admission_session_name: e.target.value }))}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-bold small text-dark">Candidate Instructions & Guidelines:</label>
                      <textarea
                        rows={4}
                        className="form-control"
                        value={settings.instructions || ""}
                        onChange={(e) => setSettings((p: any) => ({ ...p, instructions: e.target.value }))}
                        placeholder="Provide clear guidelines on entrance examinations, document uploads, and payment verification..."
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label fw-bold small text-dark">Admissions Office Phone:</label>
                      <input
                        type="text"
                        className="form-control"
                        value={settings.contact_phone || ""}
                        onChange={(e) => setSettings((p: any) => ({ ...p, contact_phone: e.target.value }))}
                        placeholder="+234 800 000 0000"
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label fw-bold small text-dark">Admissions Office Email:</label>
                      <input
                        type="email"
                        className="form-control"
                        value={settings.contact_email || ""}
                        onChange={(e) => setSettings((p: any) => ({ ...p, contact_email: e.target.value }))}
                        placeholder="admissions@school.edu.ng"
                      />
                    </div>

                    <div className="col-12">
                      <button type="submit" className="db-btn-gold px-4" disabled={savingSettings}>
                        <i className="bi bi-check2-circle"></i>
                        {savingSettings ? "Saving Settings..." : "Save Admissions Configuration"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* CANDIDATE DOSSIER & APPROVAL MODAL */}
            {/* ══════════════════════════════════════════════════════════ */}
            {selectedCandidate && (
              <div className="modal d-block" style={{ backgroundColor: "rgba(15,39,68,0.7)", backdropFilter: "blur(4px)", zIndex: 1050 }}>
                <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                  <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                    <div className="modal-header bg-dark text-white p-3 px-4">
                      <div>
                        <h5 className="modal-title fw-bold fs-6 mb-1">
                          <i className="bi bi-file-earmark-person-fill me-2 text-warning"></i>
                          Candidate Dossier: {selectedCandidate.firstname} {selectedCandidate.surname}
                        </h5>
                        <div className="small text-white-50 font-monospace">
                          App No: {selectedCandidate.application_number}
                        </div>
                      </div>
                      <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedCandidate(null)}></button>
                    </div>

                    <div className="modal-body p-4 bg-light">
                      {/* Top Header Card */}
                      <div className="p-3 bg-white border rounded-3 d-flex align-items-center justify-content-between gap-3 mb-3 flex-wrap">
                        <div className="d-flex align-items-center gap-3">
                          <div className="rounded-3 overflow-hidden bg-light border d-flex align-items-center justify-content-center" style={{ width: 64, height: 75 }}>
                            {selectedCandidate.passport_photo ? (
                              <img src={selectedCandidate.passport_photo} alt="Candidate" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <i className="bi bi-person text-muted fs-2"></i>
                            )}
                          </div>
                          <div>
                            <h5 className="fw-bold text-dark mb-1">{selectedCandidate.firstname} {selectedCandidate.surname} {selectedCandidate.other_names || ""}</h5>
                            <div className="text-muted small">
                              Applied For: <strong className="text-dark">{selectedCandidate.applied_class_name || selectedCandidate.level?.name || "General"}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="d-flex flex-column align-items-end gap-1">
                          <div>
                            {selectedCandidate.status === "enrolled" ? (
                              <span className="badge bg-primary fs-6">Enrolled Student</span>
                            ) : selectedCandidate.status === "admitted" ? (
                              <span className="badge bg-success fs-6">Admitted ✓</span>
                            ) : selectedCandidate.status === "under_review" ? (
                              <span className="badge bg-info text-dark fs-6">Under Review</span>
                            ) : selectedCandidate.status === "rejected" ? (
                              <span className="badge bg-danger fs-6">Rejected</span>
                            ) : (
                              <span className="badge bg-secondary fs-6">Submitted</span>
                            )}
                          </div>

                          <div className="small">
                            {selectedCandidate.payment_status === "paid" ? (
                              <span className="text-success fw-bold">Fee Paid ✓</span>
                            ) : (
                              <span className="text-warning fw-bold">Fee Pending</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Candidate Bio & Details */}
                      <div className="row g-3 mb-3">
                        <div className="col-12 col-md-6">
                          <div className="p-3 bg-white border rounded-3 h-100">
                            <h6 className="fw-bold text-dark mb-2 border-bottom pb-1">
                              <i className="bi bi-person-vcard text-primary me-1"></i> Candidate Profile
                            </h6>
                            <div className="small d-flex flex-column gap-1">
                              <div><strong>Gender:</strong> {selectedCandidate.gender || "—"}</div>
                              <div><strong>Date of Birth:</strong> {selectedCandidate.dob ? new Date(selectedCandidate.dob).toLocaleDateString() : "—"}</div>
                              <div><strong>Blood Group:</strong> {selectedCandidate.blood_group || "—"}</div>
                              <div><strong>Religion:</strong> {selectedCandidate.religion || "—"}</div>
                              <div><strong>Nationality:</strong> {selectedCandidate.nationality || "Nigerian"}</div>
                              <div><strong>Home Address:</strong> {selectedCandidate.home_address || selectedCandidate.parent_address || "—"}</div>
                            </div>
                          </div>
                        </div>

                        <div className="col-12 col-md-6">
                          <div className="p-3 bg-white border rounded-3 h-100">
                            <h6 className="fw-bold text-dark mb-2 border-bottom pb-1">
                              <i className="bi bi-people text-warning me-1"></i> Parent / Guardian Profile
                            </h6>
                            <div className="small d-flex flex-column gap-1">
                              <div><strong>Parent Name:</strong> {selectedCandidate.parent_name || "—"}</div>
                              <div><strong>Relationship:</strong> {selectedCandidate.parent_relationship || "Parent"}</div>
                              <div><strong>Phone Number:</strong> {selectedCandidate.parent_phone || "—"}</div>
                              <div><strong>Email Address:</strong> {selectedCandidate.parent_email || "—"}</div>
                              <div><strong>Residential Address:</strong> {selectedCandidate.parent_address || "—"}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Reviewer Notes & Decision Box */}
                      <div className="p-3 bg-white border rounded-3 mb-3">
                        <h6 className="fw-bold text-dark mb-2">
                          <i className="bi bi-pencil-square text-success me-1"></i> Entrance Assessment & Reviewer Notes
                        </h6>

                        <div className="row g-2 mb-3">
                          <div className="col-12">
                            <label className="form-label small fw-bold text-dark mb-1">Reviewer Remarks / Interview Notes:</label>
                            <textarea
                              rows={2}
                              className="form-control form-control-sm"
                              placeholder="Add screening remarks or admission committee notes..."
                              value={reviewerNotesInput}
                              onChange={(e) => setReviewerNotesInput(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Rejection reason box if rejected */}
                        {showRejectBox && (
                          <div className="p-3 bg-danger bg-opacity-10 border border-danger rounded-3 mb-3">
                            <label className="form-label small fw-bold text-danger mb-1">Reason for Rejection:</label>
                            <input
                              type="text"
                              className="form-control form-control-sm mb-2"
                              placeholder="e.g. Did not meet minimum entrance cut-off score"
                              value={rejectionReasonInput}
                              onChange={(e) => setRejectionReasonInput(e.target.value)}
                            />
                            <div className="d-flex gap-2 justify-content-end">
                              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowRejectBox(false)}>
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm fw-bold"
                                onClick={() => handleUpdateStatus("rejected")}
                                disabled={updatingStatus}
                              >
                                Confirm Rejection
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons for Decision */}
                        <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center pt-2 border-top">
                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm fw-bold"
                              onClick={() => handleUpdateStatus("under_review")}
                              disabled={updatingStatus}
                            >
                              Mark Under Review
                            </button>
                            {!showRejectBox && selectedCandidate.status !== "rejected" && (
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm fw-bold"
                                onClick={() => setShowRejectBox(true)}
                              >
                                Reject
                              </button>
                            )}
                          </div>

                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-outline-dark btn-sm fw-bold"
                              onClick={handlePrintAdmissionSlip}
                            >
                              <i className="bi bi-printer me-1"></i> Print Admission Slip
                            </button>

                            {selectedCandidate.status !== "admitted" && selectedCandidate.status !== "enrolled" && (
                              <button
                                type="button"
                                className="btn btn-warning btn-sm fw-bold px-3 text-white"
                                onClick={() => handleUpdateStatus("admitted")}
                                disabled={updatingStatus}
                              >
                                <i className="bi bi-check2-circle me-1"></i> Approve & Admit
                              </button>
                            )}

                            {selectedCandidate.status !== "enrolled" && (
                              <button
                                type="button"
                                className="btn btn-success btn-sm fw-bold px-3"
                                onClick={() => handleOpenEnrollModal(selectedCandidate)}
                              >
                                <i className="bi bi-person-plus-fill me-1"></i> 1-Click Enroll Student
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="modal-footer p-3 bg-white">
                      <button type="button" className="btn btn-secondary btn-sm fw-bold" onClick={() => setSelectedCandidate(null)}>
                        Close Dossier
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* 1-CLICK ENROLLMENT MODAL */}
            {/* ══════════════════════════════════════════════════════════ */}
            {enrollingCandidate && (
              <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 1060 }}>
                <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                    <div className="modal-header bg-dark text-white p-3 px-4">
                      <h5 className="modal-title fw-bold fs-6">
                        <i className="bi bi-person-plus-fill me-2 text-warning"></i>
                        1-Click Candidate Enrollment
                      </h5>
                      <button type="button" className="btn-close btn-close-white" onClick={() => setEnrollingCandidate(null)}></button>
                    </div>

                    {enrollmentSuccessData ? (
                      <div className="p-4 text-center">
                        <div className="rounded-circle bg-success bg-opacity-10 text-success d-inline-flex p-3 mb-3">
                          <i className="bi bi-check-circle-fill fs-1"></i>
                        </div>
                        <h5 className="fw-bold text-dark">Student Successfully Enrolled!</h5>
                        <p className="text-muted small">The student profile and parent login account have been created on your active roster.</p>

                        <div className="bg-light p-3 rounded-3 text-start mb-3 border small">
                          <div className="mb-1"><strong>Student Name:</strong> {enrollingCandidate.firstname} {enrollingCandidate.surname}</div>
                          <div className="mb-1"><strong>Assigned Reg No / Username:</strong> <code className="fw-bold fs-6 text-primary">{enrollmentSuccessData.enrollment?.reg_no || enrollmentSuccessData.student?.reg_no}</code></div>
                          <div className="mb-1"><strong>Student Password:</strong> <code>{enrollmentSuccessData.enrollment?.student_password || "Default Password"}</code></div>
                          <hr className="my-2" />
                          <div className="mb-1"><strong>Parent Account:</strong> {enrollmentSuccessData.enrollment?.parent_name}</div>
                          <div><strong>Parent Username / Phone:</strong> <code>{enrollmentSuccessData.enrollment?.parent_phone || enrollmentSuccessData.parent_user?.phone}</code></div>
                        </div>

                        <button className="btn btn-dark w-100 fw-bold" onClick={() => setEnrollingCandidate(null)}>
                          Done & Return
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleExecuteEnrollment} className="p-4">
                        <p className="small text-muted mb-3">
                          Convert <strong>{enrollingCandidate.firstname} {enrollingCandidate.surname}</strong> into an active student on your live school database.
                        </p>

                        <div className="mb-3">
                          <label className="form-label fw-bold small text-dark">Assign Class Level: <span className="text-danger">*</span></label>
                          <select className="form-select" value={enrollLevelId} onChange={(e) => setEnrollLevelId(e.target.value)} required>
                            <option value="">-- Select Class --</option>
                            {classes.map((cls: any) => (
                              <option key={cls.id} value={cls.id}>{cls.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="mb-3">
                          <label className="form-label fw-bold small text-dark">Assign Section (Arm): <span className="text-danger">*</span></label>
                          <select className="form-select" value={enrollSectionId} onChange={(e) => setEnrollSectionId(e.target.value)} required>
                            <option value="">-- Select Section / Arm --</option>
                            {sections.map((sec: any) => (
                              <option key={sec.id} value={sec.id}>{sec.name}</option>
                            ))}
                          </select>
                        </div>

                        {departments.length > 0 && (
                          <div className="mb-3">
                            <label className="form-label fw-bold small text-dark">Department (Optional):</label>
                            <select className="form-select" value={enrollDepartmentId} onChange={(e) => setEnrollDepartmentId(e.target.value)}>
                              <option value="">-- General / No Department --</option>
                              {departments.map((dept: any) => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="mb-3">
                          <label className="form-label fw-bold small text-dark">Custom Reg No (Optional, auto-generated if blank):</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. SCH/2026/0142"
                            value={enrollRegNo}
                            onChange={(e) => setEnrollRegNo(e.target.value)}
                          />
                        </div>

                        <div className="d-flex gap-2 justify-content-end mt-4">
                          <button type="button" className="btn btn-outline-secondary" onClick={() => setEnrollingCandidate(null)}>
                            Cancel
                          </button>
                          <button type="submit" className="btn btn-success fw-bold px-4" disabled={isEnrolling}>
                            {isEnrolling ? "Enrolling..." : "Confirm & Enroll Student"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* HIDDEN PRINTABLE ADMISSION SLIP TEMPLATE */}
            {/* ══════════════════════════════════════════════════════════ */}
            <div className="d-none">
              <div ref={printSlipRef}>
                {selectedCandidate && (
                  <div style={{ maxWidth: 800, margin: "0 auto", padding: 30, border: "2px solid #0F2744", borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid #0F2744", paddingBottom: 16, marginBottom: 20 }}>
                      <div>
                        <h2 style={{ margin: 0, fontWeight: 800, color: "#0F2744", textTransform: "uppercase" }}>{schoolProfile?.school_name || "SCHOOL ACADEMY"}</h2>
                        <div style={{ fontSize: 13, color: "#475569" }}>{schoolProfile?.address || "Official Admissions Department"}</div>
                        <div style={{ fontSize: 13, color: "#475569" }}>Email: {schoolProfile?.email || "admissions@school.edu.ng"} • Phone: {schoolProfile?.phone || "+234 800 000 0000"}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#D97706" }}>OFFICIAL ADMISSION DOSSIER</div>
                        <div style={{ fontFamily: "monospace", fontSize: 13 }}>{selectedCandidate.application_number}</div>
                        <div style={{ fontSize: 11, color: "#64748B" }}>Date: {new Date().toLocaleDateString()}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
                      <div style={{ width: 100, height: 120, border: "1px solid #CBD5E1", borderRadius: 6, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC" }}>
                        {selectedCandidate.passport_photo ? (
                          <img src={selectedCandidate.passport_photo} alt="Candidate" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: 11, color: "#94A3B8" }}>Passport</span>
                        )}
                      </div>

                      <div style={{ flex: 1 }}>
                        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: "4px 0", fontWeight: 700, width: 160 }}>Candidate Name:</td>
                              <td style={{ padding: "4px 0" }}>{selectedCandidate.surname}, {selectedCandidate.firstname} {selectedCandidate.other_names || ""}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: "4px 0", fontWeight: 700 }}>Target Class:</td>
                              <td style={{ padding: "4px 0" }}>{selectedCandidate.applied_class_name || selectedCandidate.level?.name || "General"}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: "4px 0", fontWeight: 700 }}>Gender / DOB:</td>
                              <td style={{ padding: "4px 0" }}>{selectedCandidate.gender || "—"} / {selectedCandidate.dob ? new Date(selectedCandidate.dob).toLocaleDateString() : "—"}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: "4px 0", fontWeight: 700 }}>Admission Status:</td>
                              <td style={{ padding: "4px 0", fontWeight: 800, color: selectedCandidate.status === "admitted" || selectedCandidate.status === "enrolled" ? "#16A34A" : "#D97706" }}>
                                {selectedCandidate.status?.toUpperCase()}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: "4px 0", fontWeight: 700 }}>Application Fee:</td>
                              <td style={{ padding: "4px 0" }}>{selectedCandidate.payment_status === "paid" ? "VERIFIED PAID ✓" : "PENDING"}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div style={{ marginBottom: 20, padding: 12, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 12 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>Parent / Guardian Details:</div>
                      <div>Name: {selectedCandidate.parent_name} • Phone: {selectedCandidate.parent_phone}</div>
                      <div>Address: {selectedCandidate.parent_address || selectedCandidate.home_address || "—"}</div>
                    </div>

                    <div style={{ marginTop: 40, display: "flex", justifyContent: "space-between", paddingTop: 20, borderTop: "1px dashed #CBD5E1", fontSize: 12 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ width: 180, borderBottom: "1px solid #000", marginBottom: 6 }}></div>
                        <div>Registrar / Admissions Officer</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ width: 180, borderBottom: "1px solid #000", marginBottom: 6 }}></div>
                        <div>Principal / Head of School</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      <Footer />
    </>
  );
}
