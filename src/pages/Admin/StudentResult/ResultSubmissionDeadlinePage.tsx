import { useEffect, useMemo, useState } from "react";
import { authApi } from "../../../utils/axios";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";

type BatchRow = {
  id: number;
  school_id: number;
  class_id: number;
  class_name?: string | null;
  term: string;
  session: string;
  status: "draft" | "computed" | "approved" | "published";
  submission_deadline?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type BatchListResponse = {
  data: BatchRow[];
};

type DeadlineResponse = {
  message: string;
  data: {
    batch_id: number;
    class_id: number;
    submission_deadline: string;
    monitor_id: number;
  };
};

function fmtDate(value?: string | null) {
  if (!value) return "Not set";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function deadlineMeta(deadline?: string | null) {
  if (!deadline) {
    return {
      label: "No deadline",
      color: "var(--bs-secondary, rgb(255,200,87))",
      bg: "rgba(255,200,87,0.12)",
      border: "rgba(255,200,87,0.22)",
    };
  }

  const now = new Date();
  const dd = new Date(deadline);
  const diffMs = dd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: "Overdue",
      color: "var(--bs-danger, rgb(239,68,68))",
      bg: "rgba(239,68,68,0.10)",
      border: "rgba(239,68,68,0.20)",
    };
  }

  if (diffDays <= 3) {
    return {
      label: "Due soon",
      color: "var(--bs-warning, rgb(245,158,11))",
      bg: "rgba(245,158,11,0.12)",
      border: "rgba(245,158,11,0.22)",
    };
  }

  return {
    label: "Scheduled",
    color: "var(--bs-success, rgb(34,197,94))",
    bg: "rgba(34,197,94,0.10)",
    border: "rgba(34,197,94,0.18)",
  };
}

function batchStatusMeta(status: BatchRow["status"]) {
  if (status === "published") {
    return {
      color: "var(--bs-success, rgb(34,197,94))",
      bg: "rgba(34,197,94,0.10)",
    };
  }
  if (status === "approved") {
    return {
      color: "var(--bs-info, rgb(59,130,246))",
      bg: "rgba(59,130,246,0.10)",
    };
  }
  if (status === "computed") {
    return {
      color: "var(--bs-warning, rgb(245,158,11))",
      bg: "rgba(245,158,11,0.10)",
    };
  }
  return {
    color: "var(--bs-primary, rgb(211,0,176))",
    bg: "rgba(211,0,176,0.08)",
  };
}

export default function ResultSubmissionDeadlinePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [termFilter, setTermFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchRow | null>(null);
  const [deadlineInput, setDeadlineInput] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchBatches = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await authApi.get<BatchListResponse>("/admin/result-batches", {
        params: {
          status: statusFilter || undefined,
          term: termFilter || undefined,
          session: sessionFilter || undefined,
        },
      });

      setBatches(res.data.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to load result batches.");
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [statusFilter, termFilter, sessionFilter]);

  const filteredBatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return batches;

    return batches.filter((b) => {
      const text = [
        b.class_name,
        b.term,
        b.session,
        b.status,
        String(b.id),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(q);
    });
  }, [batches, query]);

  const terms = useMemo(
    () => Array.from(new Set(batches.map((b) => b.term).filter(Boolean))),
    [batches]
  );

  const sessions = useMemo(
    () => Array.from(new Set(batches.map((b) => b.session).filter(Boolean))),
    [batches]
  );

  const openDeadlineModal = (batch: BatchRow) => {
    setSelectedBatch(batch);
    setDeadlineInput(batch.submission_deadline ? batch.submission_deadline.slice(0, 10) : "");
    setModalOpen(true);
    setSuccessMsg(null);
  };

  const closeDeadlineModal = () => {
    if (saving) return;
    setModalOpen(false);
    setSelectedBatch(null);
    setDeadlineInput("");
  };

  const submitDeadline = async () => {
    if (!selectedBatch || !deadlineInput) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await authApi.post<DeadlineResponse>(
        `/admin/result-batches/${selectedBatch.id}/set-deadline`,
        {
          submission_deadline: deadlineInput,
        }
      );

      setSuccessMsg(res.data.message || "Deadline updated successfully.");

      setBatches((prev) =>
        prev.map((b) =>
          b.id === selectedBatch.id
            ? { ...b, submission_deadline: res.data.data.submission_deadline }
            : b
        )
      );

      setSelectedBatch((prev) =>
        prev ? { ...prev, submission_deadline: res.data.data.submission_deadline } : prev
      );

      setTimeout(() => {
        setModalOpen(false);
      }, 700);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to update submission deadline.");
    } finally {
      setSaving(false);
    }
  };

  const totalWithDeadline = batches.filter((b) => !!b.submission_deadline).length;
  const totalWithoutDeadline = batches.filter((b) => !b.submission_deadline).length;
  const totalPublished = batches.filter((b) => b.status === "published").length;
  const totalDraft = batches.filter((b) => b.status === "draft").length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;700&display=swap');

        :root {
          --rd-light: var(--bs-light, #fcf8f8);
          --rd-dark: var(--bs-dark, #050008);
          --rd-accent: var(--bs-secondary, rgb(255,200,87));
          --rd-primary: var(--bs-primary, rgb(211,0,176));
          --rd-success: var(--bs-success, rgb(34,197,94));
          --rd-danger: var(--bs-danger, rgb(239,68,68));
          --rd-border: var(--bs-border-color, #ede8e0);
          --rd-radius: var(--bs-border-radius-lg, 14px);
        }

        .rd-main {
          background: var(--rd-light);
          min-height: 100vh;
          font-family: 'DM Sans', sans-serif;
          padding: 28px 28px 0;
        }

        .rd-hero {
          background: var(--rd-dark);
          color: #fff;
          border-radius: var(--rd-radius);
          padding: 30px 34px;
          position: relative;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .rd-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
        }

        .rd-hero-glow {
          position: absolute;
          width: 320px;
          height: 320px;
          top: -70px;
          right: -70px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,200,87,0.10) 0%, transparent 68%);
        }

        .rd-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }

        .rd-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--rd-accent);
          background: rgba(255,200,87,0.10);
          border: 1px solid rgba(255,200,87,0.22);
          border-radius: 999px;
          padding: 5px 12px;
          margin-bottom: 14px;
        }

        .rd-kicker-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--rd-success);
        }

        .rd-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(24px, 2.6vw, 34px);
          line-height: 1.08;
          margin: 0 0 8px;
        }

        .rd-title em {
          color: var(--rd-primary);
          font-style: italic;
        }

        .rd-sub {
          color: rgba(255,255,255,0.45);
          font-size: 13.5px;
          max-width: 520px;
          line-height: 1.7;
          margin: 0;
        }

        .rd-hero-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: var(--rd-radius);
          padding: 18px 20px;
          min-width: 250px;
          backdrop-filter: blur(10px);
        }

        .rd-hero-card-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .rd-hero-card-row + .rd-hero-card-row {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        .rd-hero-label {
          font-size: 12px;
          color: rgba(255,255,255,0.38);
        }

        .rd-hero-value {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          color: var(--rd-accent);
          font-weight: 700;
        }

        .rd-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        @media (max-width: 1199.98px) {
          .rd-stats { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 575.98px) {
          .rd-stats { grid-template-columns: 1fr; }
        }

        .rd-stat {
          background: #fff;
          border: 1px solid var(--rd-border);
          border-radius: var(--rd-radius);
          padding: 22px;
        }

        .rd-stat-label {
          font-size: 12px;
          color: #9a8a7a;
          margin-bottom: 8px;
        }

        .rd-stat-value {
          font-family: 'Playfair Display', serif;
          font-size: 30px;
          line-height: 1;
          color: var(--rd-dark);
        }

        .rd-stat-sub {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(0,0,0,0.06);
          font-size: 12px;
          color: #9a8a7a;
        }

        .rd-panel {
          background: #fff;
          border: 1px solid var(--rd-border);
          border-radius: var(--rd-radius);
          overflow: hidden;
          margin-bottom: 24px;
        }

        .rd-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 20px 22px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          flex-wrap: wrap;
        }

        .rd-panel-title {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          color: var(--rd-dark);
          margin: 0;
        }

        .rd-panel-sub {
          font-size: 12px;
          color: #9a8a7a;
          margin: 2px 0 0;
        }

        .rd-toolbar {
          display: grid;
          grid-template-columns: 1.2fr repeat(3, .7fr) auto;
          gap: 12px;
          padding: 18px 22px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          background: rgba(252,248,248,0.85);
        }

        @media (max-width: 991.98px) {
          .rd-toolbar {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 575.98px) {
          .rd-toolbar {
            grid-template-columns: 1fr;
          }
        }

        .rd-input,
        .rd-select {
          width: 100%;
          border: 1px solid var(--rd-border);
          border-radius: 10px;
          padding: 11px 12px;
          font-size: 13px;
          color: var(--rd-dark);
          background: #fff;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
        }

        .rd-input:focus,
        .rd-select:focus {
          border-color: rgba(255,200,87,0.55);
          box-shadow: 0 0 0 4px rgba(255,200,87,0.10);
        }

        .rd-btn,
        .rd-btn-outline {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border-radius: 10px;
          padding: 11px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all .2s ease;
          text-decoration: none;
          white-space: nowrap;
        }

        .rd-btn {
          border: none;
          background: var(--rd-accent);
          color: var(--rd-dark);
        }

        .rd-btn:hover {
          background: #ffe0a0;
          transform: translateY(-1px);
        }

        .rd-btn-outline {
          border: 1px solid var(--rd-border);
          background: #fff;
          color: #7a6a5a;
        }

        .rd-btn-outline:hover {
          background: #f7f3ed;
        }

        .rd-table-wrap {
          overflow: auto;
        }

        .rd-table {
          width: 100%;
          border-collapse: collapse;
        }

        .rd-table th {
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .09em;
          color: #9a8a7a;
          padding: 12px 16px;
          background: var(--rd-light);
          border-bottom: 1px solid rgba(0,0,0,0.06);
          white-space: nowrap;
        }

        .rd-table td {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          font-size: 13px;
          color: #50485a;
          vertical-align: middle;
        }

        .rd-table tbody tr:hover {
          background: rgba(252,248,248,0.7);
        }

        .rd-class {
          font-weight: 700;
          color: var(--rd-dark);
        }

        .rd-muted {
          color: #9a8a7a;
          font-size: 12px;
        }

        .rd-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 5px 10px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .rd-deadline-box {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--dd-border);
          background: var(--dd-bg);
          color: var(--dd-color);
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 600;
        }

        .rd-action-link {
          border: none;
          background: transparent;
          color: var(--rd-primary);
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
        }

        .rd-action-link:hover {
          text-decoration: underline;
        }

        .rd-empty {
          padding: 44px 20px;
          text-align: center;
          color: #9a8a7a;
          font-size: 13px;
        }

        .rd-error {
          margin: 0 22px 18px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          border: 1px solid rgba(239,68,68,0.20);
          background: rgba(239,68,68,0.06);
          color: var(--rd-danger);
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 13px;
        }

        .rd-success {
          margin: 0 22px 18px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          border: 1px solid rgba(34,197,94,0.20);
          background: rgba(34,197,94,0.06);
          color: var(--rd-success);
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 13px;
        }

        .rd-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(5,0,8,0.45);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1060;
        }

        .rd-modal {
          width: 100%;
          max-width: 520px;
          background: #fff;
          border: 1px solid var(--rd-border);
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0,0,0,0.18);
        }

        .rd-modal-head {
          padding: 20px 22px 16px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }

        .rd-modal-title {
          margin: 0;
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          color: var(--rd-dark);
        }

        .rd-modal-sub {
          margin: 6px 0 0;
          font-size: 13px;
          color: #8f7f70;
        }

        .rd-modal-body {
          padding: 20px 22px;
        }

        .rd-field {
          margin-bottom: 16px;
        }

        .rd-label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: #7a6a5a;
          margin-bottom: 8px;
          letter-spacing: .04em;
          text-transform: uppercase;
        }

        .rd-meta-card {
          border: 1px solid var(--rd-border);
          background: var(--rd-light);
          border-radius: 12px;
          padding: 14px;
          margin-bottom: 16px;
        }

        .rd-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .rd-meta-item small {
          display: block;
          font-size: 11px;
          color: #9a8a7a;
          text-transform: uppercase;
          letter-spacing: .08em;
          margin-bottom: 4px;
        }

        .rd-meta-item strong {
          font-size: 13px;
          color: var(--rd-dark);
        }

        .rd-modal-foot {
          padding: 16px 22px 20px;
          border-top: 1px solid rgba(0,0,0,0.06);
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .rd-skeleton {
          height: 14px;
          border-radius: 7px;
          background: linear-gradient(90deg, #f0ebe3 25%, #e8e0d5 50%, #f0ebe3 75%);
          background-size: 200% 100%;
          animation: rdSkeleton 1.4s ease infinite;
        }

        @keyframes rdSkeleton {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Result Submission Deadlines" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto rd-main">
            {loading && <Loader message="Loading result batches…" />}

            <div className="rd-hero">
              <div className="rd-hero-glow" aria-hidden="true" />
              <div className="rd-hero-inner">
                <div>
                  <div className="rd-kicker">
                    <span className="rd-kicker-dot" />
                    Result Monitoring
                  </div>

                  <h1 className="rd-title">
                    Set submission <em>deadlines</em> for result batches.
                  </h1>

                  <p className="rd-sub">
                    Give each class batch a clear deadline so your monitoring engine can detect incomplete uploads,
                    warn the academic team, and surface overdue result submissions before publication.
                  </p>
                </div>

                <div className="rd-hero-card">
                  <div className="rd-hero-card-row">
                    <span className="rd-hero-label">Batches with deadline</span>
                    <span className="rd-hero-value">{totalWithDeadline}</span>
                  </div>
                  <div className="rd-hero-card-row">
                    <span className="rd-hero-label">No deadline yet</span>
                    <span className="rd-hero-value">{totalWithoutDeadline}</span>
                  </div>
                  <div className="rd-hero-card-row">
                    <span className="rd-hero-label">Published batches</span>
                    <span className="rd-hero-value">{totalPublished}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rd-stats">
              <div className="rd-stat">
                <div className="rd-stat-label">Total Batches</div>
                <div className="rd-stat-value">{batches.length}</div>
                <div className="rd-stat-sub">All fetched result batches</div>
              </div>

              <div className="rd-stat">
                <div className="rd-stat-label">Draft</div>
                <div className="rd-stat-value">{totalDraft}</div>
                <div className="rd-stat-sub">Still open for entry</div>
              </div>

              <div className="rd-stat">
                <div className="rd-stat-label">With Deadline</div>
                <div className="rd-stat-value">{totalWithDeadline}</div>
                <div className="rd-stat-sub">Ready for monitoring</div>
              </div>

              <div className="rd-stat">
                <div className="rd-stat-label">Without Deadline</div>
                <div className="rd-stat-value">{totalWithoutDeadline}</div>
                <div className="rd-stat-sub">Needs admin action</div>
              </div>
            </div>

            <div className="rd-panel">
              <div className="rd-panel-head">
                <div>
                  <h2 className="rd-panel-title">Result Batch Deadlines</h2>
                  <p className="rd-panel-sub">Search, filter, and assign submission deadlines batch by batch.</p>
                </div>

                <button className="rd-btn-outline" onClick={fetchBatches}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Refresh
                </button>
              </div>

              <div className="rd-toolbar">
                <input
                  className="rd-input"
                  placeholder="Search by class, session, term, batch ID..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />

                <select
                  className="rd-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="computed">Computed</option>
                  <option value="approved">Approved</option>
                  <option value="published">Published</option>
                </select>

                <select
                  className="rd-select"
                  value={termFilter}
                  onChange={(e) => setTermFilter(e.target.value)}
                >
                  <option value="">All terms</option>
                  {terms.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                <select
                  className="rd-select"
                  value={sessionFilter}
                  onChange={(e) => setSessionFilter(e.target.value)}
                >
                  <option value="">All sessions</option>
                  {sessions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <button
                  className="rd-btn-outline"
                  onClick={() => {
                    setQuery("");
                    setStatusFilter("");
                    setTermFilter("");
                    setSessionFilter("");
                  }}
                >
                  Reset
                </button>
              </div>

              {error && (
                <div className="rd-error">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="rd-table-wrap">
                <table className="rd-table">
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Session / Term</th>
                      <th>Status</th>
                      <th>Deadline</th>
                      <th>Updated</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i}>
                          <td><div className="rd-skeleton" style={{ width: 120 }} /></td>
                          <td><div className="rd-skeleton" style={{ width: 140 }} /></td>
                          <td><div className="rd-skeleton" style={{ width: 80 }} /></td>
                          <td><div className="rd-skeleton" style={{ width: 120 }} /></td>
                          <td><div className="rd-skeleton" style={{ width: 100 }} /></td>
                          <td><div className="rd-skeleton" style={{ width: 70 }} /></td>
                        </tr>
                      ))
                    ) : filteredBatches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="rd-empty">
                          No result batches found for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredBatches.map((batch) => {
                        const dmeta = deadlineMeta(batch.submission_deadline);
                        const smeta = batchStatusMeta(batch.status);

                        return (
                          <tr key={batch.id}>
                            <td>
                              <div className="rd-class">{batch.class_name || `Class ${batch.class_id}`}</div>
                              <div className="rd-muted">Batch #{batch.id}</div>
                            </td>

                            <td>
                              <div>{batch.session}</div>
                              <div className="rd-muted">{batch.term}</div>
                            </td>

                            <td>
                              <span
                                className="rd-pill"
                                style={{
                                  color: smeta.color,
                                  background: smeta.bg,
                                }}
                              >
                                {batch.status}
                              </span>
                            </td>

                            <td>
                              <span
                                className="rd-deadline-box"
                                style={
                                  {
                                    "--dd-color": dmeta.color,
                                    "--dd-bg": dmeta.bg,
                                    "--dd-border": dmeta.border,
                                  } as React.CSSProperties
                                }
                              >
                                {fmtDate(batch.submission_deadline)}
                              </span>
                              <div className="rd-muted" style={{ marginTop: 6 }}>
                                {dmeta.label}
                              </div>
                            </td>

                            <td>
                              <div>{fmtDate(batch.updated_at)}</div>
                            </td>

                            <td style={{ textAlign: "right" }}>
                              <button
                                className="rd-action-link"
                                onClick={() => openDeadlineModal(batch)}
                              >
                                {batch.submission_deadline ? "Edit deadline" : "Set deadline"}
                              </button>
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
          </main>
        </div>
      </div>

      {modalOpen && selectedBatch && (
        <div className="rd-modal-backdrop" onClick={closeDeadlineModal}>
          <div className="rd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rd-modal-head">
              <h3 className="rd-modal-title">Set submission deadline</h3>
              <p className="rd-modal-sub">
                This deadline will be used by the monitoring engine to track incomplete result uploads.
              </p>
            </div>

            <div className="rd-modal-body">
              {error && (
                <div className="rd-error" style={{ margin: "0 0 16px" }}>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="rd-success" style={{ margin: "0 0 16px" }}>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M5 8.5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {successMsg}
                </div>
              )}

              <div className="rd-meta-card">
                <div className="rd-meta-grid">
                  <div className="rd-meta-item">
                    <small>Class</small>
                    <strong>{selectedBatch.class_name || `Class ${selectedBatch.class_id}`}</strong>
                  </div>
                  <div className="rd-meta-item">
                    <small>Batch</small>
                    <strong>#{selectedBatch.id}</strong>
                  </div>
                  <div className="rd-meta-item">
                    <small>Session</small>
                    <strong>{selectedBatch.session}</strong>
                  </div>
                  <div className="rd-meta-item">
                    <small>Term</small>
                    <strong>{selectedBatch.term}</strong>
                  </div>
                </div>
              </div>

              <div className="rd-field">
                <label className="rd-label">Submission deadline</label>
                <input
                  type="date"
                  className="rd-input"
                  value={deadlineInput}
                  onChange={(e) => setDeadlineInput(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                />
              </div>
            </div>

            <div className="rd-modal-foot">
              <button className="rd-btn-outline" onClick={closeDeadlineModal} disabled={saving}>
                Cancel
              </button>

              <button
                className="rd-btn"
                onClick={submitDeadline}
                disabled={saving || !deadlineInput}
              >
                {saving ? "Saving..." : selectedBatch.submission_deadline ? "Update deadline" : "Set deadline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}