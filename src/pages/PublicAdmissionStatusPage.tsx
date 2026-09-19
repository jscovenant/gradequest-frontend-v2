import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../utils/api";

const toast = {
  success: (msg: string) => console.log("SUCCESS:", msg),
  error: (msg: string) => alert(msg),
  warning: (msg: string) => alert(msg),
  info: (msg: string) => alert(msg),
};

export default function PublicAdmissionStatusPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("query") || "";
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      toast.warning("Please enter your application number or parent phone number.");
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const res = await api.post("/public/admissions/track", { query: query.trim() });
      if (res.data.status) {
        setResults(res.data.applications || []);
      } else {
        setResults([]);
      }
    } catch (err: any) {
      setResults([]);
      toast.info(err?.response?.data?.message || "No admission file found matching this reference.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 bg-light py-5" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
      <div className="container" style={{ maxWidth: 760 }}>
        
        <div className="text-center mb-4">
          <div className="rounded-circle bg-primary bg-opacity-10 text-primary d-inline-flex p-3 fs-3 mb-2">
            <i className="bi bi-search"></i>
          </div>
          <h3 className="fw-extrabold text-dark mb-1">Track Online Admission Status</h3>
          <p className="text-muted small">
            Enter your Application Reference Number (e.g. <code>ADM-2026-0042</code>) or registered Parent Phone Number.
          </p>
        </div>

        {/* Search Card */}
        <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
          <form onSubmit={handleTrack}>
            <div className="input-group input-group-lg shadow-sm rounded-3 overflow-hidden">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0 border-end-0 ps-0 font-monospace"
                placeholder="e.g. ADM-2026-00124 or 08012345678"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="submit" disabled={loading} className="btn btn-primary px-4 fw-bold">
                {loading ? "Tracking..." : "Check Status"}
              </button>
            </div>
          </form>
        </div>

        {/* Search Results */}
        {searched && (
          <div className="space-y-3">
            {results.length === 0 ? (
              <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white">
                <div className="display-6 text-muted mb-2"><i className="bi bi-file-earmark-x"></i></div>
                <h6 className="fw-bold text-dark">No Application Found</h6>
                <p className="text-muted small mb-0">
                  Please verify the application reference number or phone number and try again.
                </p>
              </div>
            ) : (
              results.map((app) => (
                <div key={app.id} className="card border-0 shadow-sm rounded-4 p-4 mb-3 bg-white">
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 border-bottom pb-3">
                    <div>
                      <div className="text-muted small">School: <strong>{app.school?.school_name}</strong></div>
                      <h5 className="fw-bold text-dark mb-0">{app.firstname} {app.surname}</h5>
                    </div>
                    <div>
                      <span className="badge bg-light text-dark border font-monospace me-2">{app.application_number}</span>
                      {app.status === "enrolled" && <span className="badge bg-info bg-opacity-10 text-info">Enrolled (Student)</span>}
                      {app.status === "admitted" && <span className="badge bg-success bg-opacity-10 text-success">Admitted</span>}
                      {app.status === "under_review" && <span className="badge bg-warning bg-opacity-10 text-warning">Under Review</span>}
                      {app.status === "submitted" && <span className="badge bg-secondary bg-opacity-10 text-secondary">Submitted</span>}
                      {app.status === "rejected" && <span className="badge bg-danger bg-opacity-10 text-danger">Rejected</span>}
                    </div>
                  </div>

                  <div className="row g-2 small text-muted mb-3">
                    <div className="col-md-6"><strong>Applied Class:</strong> {app.applied_class_name}</div>
                    <div className="col-md-6"><strong>Parent Contact:</strong> {app.parent_phone}</div>
                    <div className="col-md-6"><strong>Wema Payment Status:</strong> {app.payment_status === "paid" ? "Paid & Verified" : "Pending Payment"}</div>
                    <div className="col-md-6"><strong>Application Date:</strong> {new Date(app.created_at).toLocaleDateString()}</div>
                  </div>

                  {app.assigned_reg_no && (
                    <div className="p-3 bg-success bg-opacity-10 rounded-3 border border-success border-opacity-25 mb-3 text-success">
                      <strong>Assigned Student Registration Number:</strong> <span className="font-monospace fw-bold">{app.assigned_reg_no}</span>
                    </div>
                  )}

                  <div className="d-flex justify-content-end">
                    <Link to={`/school/${app.school_id}/admission`} className="btn btn-sm btn-outline-primary fw-semibold">
                      View Admission Portal
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="text-center mt-4">
          <Link to="/" className="text-muted small text-decoration-none">
            ← Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
