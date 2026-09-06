import React, { useEffect, useMemo, useState } from "react";
import { authApi } from "../../../utils/axios";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

interface SchoolOperator {
  id: number;
  firstname: string;
  surname: string;
  email: string;
  phone?: string | null;
  operator_title?: string | null;
  role?: string;
  status: number;
  last_login_at?: string | null;
  created_at?: string | null;
}

export default function SchoolOperatorsPage() {
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // List state
  const [operators, setOperators] = useState<SchoolOperator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newOp, setNewOp] = useState({
    firstname: "",
    surname: "",
    email: "",
    phone: "",
    operator_title: "Desk Officer / Portal Operator",
  });
  const [createdPasswordModal, setCreatedPasswordModal] = useState<{ name: string; email: string; pass: string } | null>(null);

  // Edit Modal state
  const [editingOp, setEditingOp] = useState<SchoolOperator | null>(null);
  const [editForm, setEditForm] = useState({
    firstname: "",
    surname: "",
    phone: "",
    operator_title: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Password reset modal state
  const [resetPassOp, setResetPassOp] = useState<SchoolOperator | null>(null);
  const [resetPassResult, setResetPassResult] = useState<string | null>(null);
  const [resettingPass, setResettingPass] = useState(false);

  const loadOperators = async () => {
    setLoading(true);
    try {
      const res = await authApi.get("/school/operators");
      setOperators(res.data.operators || []);
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to load school operators.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperators();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return operators;
    return operators.filter(
      (op) =>
        op.firstname.toLowerCase().includes(q) ||
        op.surname.toLowerCase().includes(q) ||
        op.email.toLowerCase().includes(q) ||
        (op.phone && op.phone.includes(q)) ||
        (op.operator_title && op.operator_title.toLowerCase().includes(q))
    );
  }, [operators, search]);

  const activeCount = useMemo(() => operators.filter((o) => o.status === 1).length, [operators]);
  const inactiveCount = useMemo(() => operators.filter((o) => o.status === 0).length, [operators]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOp.firstname.trim() || !newOp.surname.trim() || !newOp.email.trim()) {
      showToast("Firstname, surname, and email are required.", "error");
      return;
    }
    setCreating(true);
    try {
      const res = await authApi.post("/school/operators", newOp);
      showToast(res.data.message || "Operator registered successfully!", "success");
      setShowCreateModal(false);
      setCreatedPasswordModal({
        name: `${newOp.firstname} ${newOp.surname}`,
        email: newOp.email,
        pass: res.data.temporary_password,
      });
      setNewOp({
        firstname: "",
        surname: "",
        email: "",
        phone: "",
        operator_title: "Desk Officer / Portal Operator",
      });
      loadOperators();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to register operator.", "error");
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (op: SchoolOperator) => {
    setEditingOp(op);
    setEditForm({
      firstname: op.firstname,
      surname: op.surname,
      phone: op.phone || "",
      operator_title: op.operator_title || "Desk Officer",
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOp) return;
    setSavingEdit(true);
    try {
      const res = await authApi.put(`/school/operators/${editingOp.id}`, editForm);
      showToast(res.data.message || "Operator updated successfully.", "success");
      setEditingOp(null);
      loadOperators();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to update operator.", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleStatus = async (op: SchoolOperator) => {
    const willDeactivate = op.status === 1;
    const confirmMsg = willDeactivate
      ? `Deactivate operator ${op.firstname} ${op.surname}?\n\nThey will be logged out immediately across all devices.`
      : `Activate operator ${op.firstname} ${op.surname}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await authApi.patch(`/school/operators/${op.id}/toggle-status`);
      showToast(res.data.message || "Operator status updated.", "success");
      loadOperators();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to update status.", "error");
    }
  };

  const handleResetPassword = async (op: SchoolOperator) => {
    setResetPassOp(op);
    setResetPassResult(null);
    setResettingPass(true);
    try {
      const res = await authApi.post(`/school/operators/${op.id}/reset-password`);
      setResetPassResult(res.data.temporary_password);
      showToast(res.data.message || "Password reset successfully.", "success");
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to reset password.", "error");
      setResetPassOp(null);
    } finally {
      setResettingPass(false);
    }
  };

  const handleDelete = async (op: SchoolOperator) => {
    if (!window.confirm(`Permanently delete operator ${op.firstname} ${op.surname}?\n\nThis action cannot be undone.`)) {
      return;
    }
    try {
      const res = await authApi.delete(`/school/operators/${op.id}`);
      showToast(res.data.message || "Operator removed.", "success");
      loadOperators();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to delete operator.", "error");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!", "success");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .db-main {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: 24px 28px 0;
        }
        .db-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 32px 36px;
          position: relative;
          overflow: hidden;
          margin: 10px 0 24px;
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
          left: 30%;
          width: 200px;
          height: 200px;
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
          display: inline-block;
        }
        .db-hero-title {
          font-size: 26px;
          font-weight: 800;
          color: #fff;
          margin: 0 0 6px;
          line-height: 1.2;
        }
        .db-hero-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          margin: 0;
          max-width: 620px;
          line-height: 1.6;
        }
        .db-btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #D97706;
          color: #FFFFFF;
          font-size: 13.5px;
          font-weight: 700;
          border: none;
          border-radius: 10px;
          padding: 9px 18px;
          cursor: pointer;
          transition: all .2s ease;
        }
        .db-btn-gold:hover {
          background: #B45309;
          transform: translateY(-1px);
          color: #FFFFFF;
        }
          padding: 12px 20px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          text-decoration: none;
        }
        .db-btn-gold:hover {
          background: #e8c97a;
          color: #0f172a;
          transform: translateY(-1px);
        }
        .gq-stat-badge {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          padding: 6px 14px;
          color: #fff;
          font-size: 12.5px;
        }
        .gq-card {
          background: #fff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          overflow: hidden;
        }
        .gq-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #f1f5f9;
          color: #475569;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }
        @media (max-width: 991.98px) {
          .db-main { padding: 18px 14px 0; }
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="School Operators & Delegated Managers | GradiosEdu" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto px-3 px-md-4 db-main">
            {loading && <Loader message="Loading school operators..." />}

            {/* HERO */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />
              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    School Management — Safe Delegation
                  </div>
                  <h1 className="db-hero-title">School Operators & Portal Managers</h1>
                  <p className="db-hero-sub">
                    Assign secretaries, IT teachers, and desk clerks to register students, upload results, and manage CBT exams—without exposing your proprietor master credentials or bank accounts.
                  </p>
                  <div className="d-flex gap-2 flex-wrap mt-3">
                    <div className="gq-stat-badge">
                      Total Operators: <strong className="text-warning">{operators.length}</strong>
                    </div>
                    <div className="gq-stat-badge">
                      Active: <strong className="text-success">{activeCount}</strong>
                    </div>
                    {inactiveCount > 0 && (
                      <div className="gq-stat-badge">
                        Deactivated: <strong className="text-danger">{inactiveCount}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <button className="db-btn-gold" onClick={() => setShowCreateModal(true)}>
                    <i className="bi bi-person-plus-fill" />
                    + Add School Operator
                  </button>
                </div>
              </div>
            </div>

            {/* TABLE CARD */}
            <div className="gq-card p-3 p-md-4 mb-4">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <div className="input-group" style={{ maxWidth: 360 }}>
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-search text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 ps-0"
                    placeholder="Search operator name, email, role..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <button className="btn btn-outline-secondary btn-sm" onClick={loadOperators} disabled={loading}>
                  <i className="bi bi-arrow-clockwise me-1" />
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="text-center py-5">
                  <p className="text-muted small mt-2">Loading school operators...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-people text-muted" style={{ fontSize: 42 }} />
                  <h6 className="fw-bold mt-2 text-dark">No School Operators Added Yet</h6>
                  <p className="text-muted small" style={{ maxWidth: 450, margin: "0 auto 16px" }}>
                    Create dedicated logins for your desk officers and computer operators to manage school operations safely.
                  </p>
                  <button className="db-btn-gold" onClick={() => setShowCreateModal(true)}>
                    <i className="bi bi-person-plus-fill" /> Add First Operator
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light small text-uppercase" style={{ fontSize: 11, letterSpacing: "0.5px" }}>
                      <tr>
                        <th>Operator</th>
                        <th>Role Title</th>
                        <th>Contact Details</th>
                        <th>Status</th>
                        <th>Registered</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((op) => (
                        <tr key={op.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="gq-avatar">
                                {op.firstname.charAt(0)}
                                {op.surname.charAt(0)}
                              </div>
                              <div>
                                <div className="fw-bold text-dark">
                                  {op.firstname} {op.surname}
                                </div>
                                <small className="text-muted">{op.email}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border px-2 py-1">
                              {op.operator_title || "Desk Officer"}
                            </span>
                          </td>
                          <td>
                            <div className="small text-dark">{op.phone || "—"}</div>
                            {op.last_login_at && (
                              <small className="text-muted" style={{ fontSize: 11 }}>
                                Last login: {new Date(op.last_login_at).toLocaleDateString()}
                              </small>
                            )}
                          </td>
                          <td>
                            {op.status === 1 ? (
                              <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                                ● Active
                              </span>
                            ) : (
                              <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">
                                ● Deactivated
                              </span>
                            )}
                          </td>
                          <td className="small text-muted">
                            {op.created_at ? new Date(op.created_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="text-end">
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-outline-primary"
                                title="Edit details"
                                onClick={() => openEdit(op)}
                              >
                                <i className="bi bi-pencil" />
                              </button>
                              <button
                                className="btn btn-outline-secondary"
                                title="Reset password"
                                onClick={() => handleResetPassword(op)}
                              >
                                <i className="bi bi-key" />
                              </button>
                              <button
                                className={`btn ${op.status === 1 ? "btn-outline-warning" : "btn-outline-success"}`}
                                title={op.status === 1 ? "Deactivate operator" : "Activate operator"}
                                onClick={() => handleToggleStatus(op)}
                              >
                                <i className={`bi ${op.status === 1 ? "bi-pause-circle" : "bi-play-circle"}`} />
                              </button>
                              <button
                                className="btn btn-outline-danger"
                                title="Delete operator"
                                onClick={() => handleDelete(op)}
                              >
                                <i className="bi bi-trash" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SAFETY NOTICE */}
            <div className="alert alert-info py-3 px-4 d-flex align-items-start gap-3 mb-4" style={{ borderRadius: 12 }}>
              <i className="bi bi-shield-lock-fill text-info fs-4 mt-1" />
              <div>
                <strong>Proprietor Security Guard:</strong>
                <br />
                Operators have access to student records, results, attendance, CBT, and AI lesson planners. They are strictly blocked from viewing or editing School Bank Accounts, subscriptions, finances, or school ownership.
              </div>
            </div>

            <div className="mt-auto">
              <Footer />
            </div>
          </main>
        </div>
      </div>

      {/* CREATE OPERATOR MODAL */}
      {showCreateModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: 16, overflow: "hidden" }}>
              <div className="modal-header bg-dark text-white p-3 border-0">
                <h5 className="modal-title fs-6 fw-bold text-white d-flex align-items-center gap-2 m-0">
                  <i className="bi bi-person-plus-fill text-warning" />
                  Add School Operator / Manager
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCreateModal(false)} />
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body p-4">
                  <p className="text-muted small mb-3">
                    Register an assistant, secretary, or IT operator. A temporary login password will be generated and emailed to them.
                  </p>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold small">First Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={newOp.firstname}
                        onChange={(e) => setNewOp({ ...newOp, firstname: e.target.value })}
                        placeholder="e.g. John"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold small">Surname *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={newOp.surname}
                        onChange={(e) => setNewOp({ ...newOp, surname: e.target.value })}
                        placeholder="e.g. Doe"
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold small">Login Email Address *</label>
                      <input
                        type="email"
                        className="form-control"
                        required
                        value={newOp.email}
                        onChange={(e) => setNewOp({ ...newOp, email: e.target.value })}
                        placeholder="operator@school.edu or gmail.com"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold small">Phone Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newOp.phone}
                        onChange={(e) => setNewOp({ ...newOp, phone: e.target.value })}
                        placeholder="08012345678"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold small">Role / Job Title</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newOp.operator_title}
                        onChange={(e) => setNewOp({ ...newOp, operator_title: e.target.value })}
                        placeholder="e.g. Desk Officer / ICT Coordinator"
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light p-3">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="db-btn-gold btn-sm" disabled={creating}>
                    {creating ? "Creating..." : "Create Operator Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CREATED CREDENTIALS MODAL */}
      {createdPasswordModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 440 }}>
            <div className="modal-content" style={{ borderRadius: 16, overflow: "hidden" }}>
              <div className="modal-header bg-success text-white p-3 border-0">
                <h5 className="modal-title fs-6 fw-bold text-white d-flex align-items-center gap-2 m-0">
                  <i className="bi bi-check-circle-fill" /> Operator Created Successfully
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setCreatedPasswordModal(null)} />
              </div>
              <div className="modal-body p-4 text-center">
                <p className="small text-muted mb-3">
                  The account for <strong>{createdPasswordModal.name}</strong> is active. An email has been sent to{" "}
                  <code>{createdPasswordModal.email}</code>.
                </p>
                <div className="p-3 bg-light rounded-3 border text-start mb-3">
                  <div className="small text-muted">Email:</div>
                  <div className="fw-bold text-dark">{createdPasswordModal.email}</div>
                  <div className="small text-muted mt-2">Temporary Password:</div>
                  <div className="d-flex justify-content-between align-items-center">
                    <code className="fs-5 fw-bold text-primary">{createdPasswordModal.pass}</code>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => copyToClipboard(createdPasswordModal.pass)}>
                      <i className="bi bi-clipboard me-1" /> Copy
                    </button>
                  </div>
                </div>
                <button className="btn btn-primary w-100" onClick={() => setCreatedPasswordModal(null)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT OPERATOR MODAL */}
      {editingOp && (
        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: 16, overflow: "hidden" }}>
              <div className="modal-header bg-dark text-white p-3 border-0">
                <h5 className="modal-title fs-6 fw-bold text-white d-flex align-items-center gap-2 m-0">
                  <i className="bi bi-pencil-fill text-warning" />
                  Edit School Operator
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setEditingOp(null)} />
              </div>
              <form onSubmit={handleUpdate}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold small">First Name</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={editForm.firstname}
                        onChange={(e) => setEditForm({ ...editForm, firstname: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold small">Surname</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={editForm.surname}
                        onChange={(e) => setEditForm({ ...editForm, surname: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold small">Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold small">Role Title</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.operator_title}
                        onChange={(e) => setEditForm({ ...editForm, operator_title: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light p-3">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingOp(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="db-btn-gold btn-sm" disabled={savingEdit}>
                    {savingEdit ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD RESET RESULT MODAL */}
      {resetPassOp && resetPassResult && (
        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 420 }}>
            <div className="modal-content" style={{ borderRadius: 16, overflow: "hidden" }}>
              <div className="modal-header bg-dark text-white p-3 border-0">
                <h5 className="modal-title fs-6 fw-bold text-white d-flex align-items-center gap-2 m-0">
                  <i className="bi bi-key-fill text-warning" /> New Operator Password
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setResetPassOp(null)} />
              </div>
              <div className="modal-body p-4 text-center">
                <p className="small text-muted mb-3">
                  Password reset for <strong>{resetPassOp.firstname} {resetPassOp.surname}</strong> (<code>{resetPassOp.email}</code>).
                </p>
                <div className="p-3 bg-light rounded-3 border d-flex justify-content-between align-items-center mb-3">
                  <code className="fs-4 fw-bold text-primary">{resetPassResult}</code>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => copyToClipboard(resetPassResult)}>
                    <i className="bi bi-clipboard me-1" /> Copy
                  </button>
                </div>
                <button className="btn btn-primary w-100" onClick={() => setResetPassOp(null)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
