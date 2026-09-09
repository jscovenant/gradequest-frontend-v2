import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { authApi } from "../../utils/axios";
import TopNav from "../LayoutComponents/TopNav";
import Sidebar from "../LayoutComponents/Sidebar";
import Footer from "../LayoutComponents/Footer";
import Loader from "../ui/dashboardLoader";
import { useNavigate } from "react-router-dom";
import PageTitle from "../PageTitle";
import { getUser } from "../../utils/token";

interface StatCard { title: string; value: string | number; icon: string; }
type PerformancePoint = { term: string; average: number };
type TopStudent = { admission_no: string; name: string; class: string; score: number };
type TopStudentsResponse = { data: TopStudent[]; total: number; session_used: string; term_used: string };

type AlertItem = {
  id: number; type: string; severity: "low" | "medium" | "high"; status: string;
  title: string; message: string;
  class_id?: number | null; class_name?: string | null;
  subject_id?: number | null; subject_name?: string | null;
  student_id?: number | null; student_name?: string | null;
  created_at?: string | null;
};

type SubmissionMonitor = {
  id: number; batch_id: number; class_id: number; class_name: string;
  teacher_id?: number | null; teacher_name?: string | null;
  expected_students_count: number; completed_students_count: number; pending_students_count: number;
  status: "pending" | "partial" | "complete" | "overdue";
  submission_deadline?: string | null; last_scanned_at?: string | null;
};

type AlertSummaryResponse = {
  data: AlertItem[];
  submission_monitors: SubmissionMonitor[];
  counts: { open_total: number; high: number; medium: number; low: number; submission_open_total: number; submission_overdue_total: number };
};

type BillingDashboardResponse = {
  package?: {
    name?: string | null;
  } | null;
  revenue_model?: string | null;
};

type ResultBatchStatus = "draft" | "computed" | "approved" | "published" | string;

type ReviewBatch = {
  id: number;
  class_id: number;
  class_name: string;
  term: string;
  session: string;
  status: ResultBatchStatus;
  updated_at?: string | null;
  review?: {
    total_students: number;
    completed_students: number;
    missing_students_count: number;
    open_alerts: number;
    open_high_alerts: number;
    can_approve: boolean;
    can_publish: boolean;
    simple_status: string;
  };
};

type ReviewBatchResponse = { data: ReviewBatch[] };

const STAT_META = [
  { color: "#10B981", bg: "rgba(16, 185, 129, 0.12)", label: "enrolled" },
  { color: "#2563EB", bg: "rgba(37, 99, 235, 0.12)", label: "active staff" },
  { color: "#7C3AED", bg: "rgba(124, 58, 237, 0.12)", label: "registered" },
  { color: "#D97706", bg: "rgba(217, 119, 6, 0.12)", label: "completion" },
];

const QUICK_ACTIONS = [
  { label:"Search & Edit Result", desc:"Lookup student by Reg No", color:"#D97706", bg:"rgba(217, 119, 6, 0.12)", path:"/results/student-editor",
    icon:<i className="bi bi-pencil-square" /> },
  { label:"Register Student", desc:"Enroll a new student", color:"#10B981", bg:"rgba(16, 185, 129, 0.12)", path:"/students/register",
    icon:<i className="bi bi-person-plus-fill" /> },
  { label:"Upload Results", desc:"Record continuous assessment", color:"#D97706", bg:"rgba(217, 119, 6, 0.12)", path:"/students/results/add",
    icon:<i className="bi bi-cloud-arrow-up-fill" /> },
  { label:"Generate PINs", desc:"Create result scratch cards", color:"#2563EB", bg:"rgba(37, 99, 235, 0.12)", path:"/results/pins",
    icon:<i className="bi bi-key-fill" /> },
  { label:"School Settings", desc:"Profile & academic setup", color:"#EF4444", bg:"rgba(239, 68, 68, 0.12)", path:"/school/settings",
    icon:<i className="bi bi-gear-fill" /> },
  { label:"Master Broadsheet", desc:"Class & subject sheets", color:"#6366F1", bg:"rgba(99, 102, 241, 0.12)", path:"/results/review",
    icon:<i className="bi bi-file-earmark-spreadsheet-fill" /> },
];

function getGreeting() { const h = new Date().getHours(); if(h<12)return"Good morning"; if(h<17)return"Good afternoon"; return"Good evening"; }

function formatRelativeTime(d?: string|null): string { if(!d)return""; const diff=Date.now()-new Date(d).getTime(); const m=Math.floor(diff/60000); if(m<1)return"just now"; if(m<60)return`${m}m ago`; const h=Math.floor(m/60); if(h<24)return`${h}h ago`; return`${Math.floor(h/24)}d ago`; }

function resultStatusLabel(status?: ResultBatchStatus) {
  const s = String(status || "").toLowerCase();
  if (s === "draft") return "In Progress";
  if (s === "computed") return "Ready for Review";
  if (s === "approved") return "Approved";
  if (s === "published") return "Published";
  return "Needs Review";
}

function resultStatusTone(status?: ResultBatchStatus) {
  const s = String(status || "").toLowerCase();
  if (s === "published") return "published";
  if (s === "approved") return "approved";
  if (s === "computed") return "computed";
  return "draft";
}

function ResultReviewQueue({ batches, loading, busyId, error, onRefresh, onApprove, onPublish, onReopen, onOpenBroadsheet }: {
  batches: ReviewBatch[]; loading: boolean; busyId: number | null; error: string | null;
  onRefresh:()=>void; onApprove:(batch:ReviewBatch)=>void; onPublish:(batch:ReviewBatch)=>void; onReopen:(batch:ReviewBatch)=>void; onOpenBroadsheet:(batch:ReviewBatch)=>void;
}) {
  const waiting = batches.filter((b) => String(b.status).toLowerCase() !== "published").length;

  return (
    <div className="rrq-panel">
      <div className="rrq-head">
        <div className="rrq-title-wrap">
          <div className="rrq-icon"><i className="bi bi-clipboard-check-fill" /></div>
          <div>
            <h2 className="rrq-title">Results Approval Queue</h2>
            <p className="rrq-sub">Class result batches submitted by teachers awaiting administrative verification.</p>
          </div>
        </div>
        <div className="rrq-head-actions">
          <span className="rrq-count">{waiting} waiting</span>
          <button className="db-refresh-btn" onClick={onRefresh} disabled={loading}>
            <i className={`bi bi-arrow-clockwise ${loading ? "rrq-spin" : ""}`} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="rrq-body">
        {loading && batches.length === 0 ? (
          [0,1,2].map((i) => (
            <div className="rrq-card" key={i}>
              <div className="rm-skel rm-skel--title" style={{width:"40%"}}/>
              <div className="rm-skel rm-skel--sub mt-2" style={{width:"70%"}}/>
              <div className="rm-skel mt-3" style={{width:"100%",height:8}}/>
            </div>
          ))
        ) : batches.length === 0 ? (
          <div className="rrq-empty">
            <i className="bi bi-check2-circle text-success" />
            <div>
              <p>No results currently pending review.</p>
              <span>Submitted score batches from class teachers will automatically appear here.</span>
            </div>
          </div>
        ) : (
          batches.map((batch) => {
            const review = batch.review;
            const total = Number(review?.total_students || 0);
            const done = Number(review?.completed_students || 0);
            const progress = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
            const tone = resultStatusTone(batch.status);
            const busy = busyId === batch.id;
            const status = String(batch.status).toLowerCase();
            const canApprove = Boolean(review?.can_approve && status !== "approved" && status !== "published");
            const canPublish = Boolean(review?.can_publish && status !== "published");

            return (
              <div className="rrq-card" key={batch.id}>
                <div className="rrq-card-top">
                  <div>
                    <div className="rrq-class">{batch.class_name}</div>
                    <div className="rrq-meta">{batch.term} · {batch.session} · {formatRelativeTime(batch.updated_at)}</div>
                  </div>
                  <span className={`rrq-badge rrq-badge--${tone}`}>{resultStatusLabel(batch.status)}</span>
                </div>
                <p className="rrq-status-text">{review?.simple_status || "Open batch to verify scores and compute broadsheet."}</p>
                <div className="rrq-progress-row"><span>{done}/{total} students complete</span><span>{progress}%</span></div>
                <div className="rrq-track"><div className="rrq-fill" style={{width:`${progress}%`}} /></div>
                <div className="rrq-notes">
                  {Number(review?.missing_students_count || 0) > 0 && <span><i className="bi bi-person-dash" />{review?.missing_students_count} missing</span>}
                  {Number(review?.open_high_alerts || 0) > 0 && <span className="rrq-note-danger"><i className="bi bi-exclamation-triangle" />{review?.open_high_alerts} alerts</span>}
                  {review?.can_approve && <span className="rrq-note-good"><i className="bi bi-check-circle" />Ready</span>}
                </div>
                <div className="rrq-actions">
                  <button className="rrq-btn rrq-btn-light" onClick={()=>onOpenBroadsheet(batch)} disabled={busy}>Review</button>
                  {canApprove && <button className="rrq-btn rrq-btn-dark" onClick={()=>onApprove(batch)} disabled={busy}>{busy ? "..." : "Approve"}</button>}
                  {canPublish && <button className="rrq-btn rrq-btn-gold" onClick={()=>onPublish(batch)} disabled={busy}>{busy ? "..." : "Publish"}</button>}
                  {status === "published" && <button className="rrq-btn rrq-btn-light" onClick={()=>onReopen(batch)} disabled={busy}>Reopen</button>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ── Academic Alerts Section ── */
function AcademicAlertSection({ alerts, loading, error, counts, onRefresh, alertsLoading, onViewAll }: {
  alerts: AlertItem[]; loading: boolean; error: string|null;
  counts: {open_total:number;high:number;medium:number;low:number};
  onRefresh:()=>void; alertsLoading:boolean; onViewAll:()=>void;
}) {
  const [activeFilter, setActiveFilter] = useState<"all"|"high"|"medium"|"low">("all");
  const filtered = useMemo(()=> activeFilter==="all"?alerts:alerts.filter(a=>a.severity===activeFilter), [alerts,activeFilter]);
  const highCount=alerts.filter(a=>a.severity==="high").length;
  const medCount =alerts.filter(a=>a.severity==="medium").length;
  const lowCount =alerts.filter(a=>a.severity==="low").length;

  return (
    <div className="aa-wrap">
      <div className="aa-panel">
        <div className="aa-head">
          <div className="aa-head-left">
            <div className="aa-head-icon">
              <i className="bi bi-bell-fill" />
            </div>
            <div><h3 className="aa-title">Academic & Score Alerts</h3><p className="aa-sub">Continuous assessment anomalies & missing grades</p></div>
          </div>
          <button className="db-refresh-btn" onClick={onRefresh} disabled={alertsLoading}>
            <i className={`bi bi-arrow-clockwise ${alertsLoading ? "rrq-spin" : ""}`} />
            {alertsLoading?"Refreshing...":"Refresh"}
          </button>
        </div>

        {!loading && alerts.length > 0 && (
          <div className="aa-filters">
            {([{key:"all",label:"All Alerts",count:alerts.length},{key:"high",label:"High Severity",count:highCount},{key:"medium",label:"Medium",count:medCount},{key:"low",label:"Low",count:lowCount}] as const).map(f=>(
              <button key={f.key} className={`aa-filter-btn ${activeFilter===f.key?"aa-filter-btn--active":""}`} onClick={()=>setActiveFilter(f.key)}>
                {f.label}{f.count>0&&<span className="aa-filter-count">{f.count}</span>}
              </button>
            ))}
          </div>
        )}

        {error&&<div className="aa-error-bar"><i className="bi bi-exclamation-circle-fill" />{error}</div>}

        <div className="aa-list">
          {loading ? (
            [0,1,2].map(i=>(
              <div key={i} className="aa-skeleton-item">
                <div className="rm-skel rm-skel--title mb-2" style={{width:"50%"}}/>
                <div className="rm-skel rm-skel--sub" style={{width:"80%"}}/>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="aa-empty">
              <i className="bi bi-shield-check text-success fs-3" />
              <p>No academic flags recorded.</p>
              <span>Score submissions are consistent and within expected thresholds.</span>
            </div>
          ) : (
            filtered.slice(0, 4).map((a) => (
              <div className="aa-item" key={a.id}>
                <div className="aa-item-body">
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <span className="fw-bold" style={{ color: "#0F2744", fontSize: "13.5px" }}>{a.title}</span>
                    <span className={`badge ${a.severity === "high" ? "bg-danger" : a.severity === "medium" ? "bg-warning text-dark" : "bg-info"}`} style={{ fontSize: "10.5px" }}>
                      {a.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="mb-1" style={{ fontSize: "12.5px", color: "#475569", lineHeight: 1.5 }}>{a.message}</p>
                  <div className="d-flex justify-content-between" style={{ fontSize: "11px", color: "#94A3B8" }}>
                    <span>{[a.class_name, a.subject_name, a.student_name].filter(Boolean).join(" · ")}</span>
                    <span>{formatRelativeTime(a.created_at)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="aa-footer">
          <span className="aa-footer-count">{counts.open_total} open alerts</span>
          <button className="aa-view-all-btn" onClick={onViewAll}>
            View All Monitoring Logs →
          </button>
        </div>
      </div>

      {/* Overview Scorecard */}
      <div className="aa-scorecard">
        <h4 className="aa-scorecard-title">Score Submissions</h4>
        <div className="aa-scorecard-hero">
          <div className="aa-scorecard-big">{counts.submission_open_total}</div>
          <div className="aa-scorecard-big-label">Active Batch Monitors</div>
        </div>
        <div className="aa-breakdown">
          <div className="d-flex justify-content-between" style={{ fontSize: "12.5px" }}>
            <span>Overdue Batches:</span>
            <strong className={counts.submission_overdue_total > 0 ? "text-danger" : "text-success"}>
              {counts.submission_overdue_total}
            </strong>
          </div>
          <div className="d-flex justify-content-between" style={{ fontSize: "12.5px" }}>
            <span>Critical Severity:</span>
            <strong className={counts.high > 0 ? "text-danger" : "text-muted"}>{counts.high}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [academicSession, setAcademicSession] = useState("");
  const [currentTerm, setCurrentTerm] = useState("");
  const [currentPackage, setCurrentPackage] = useState("SchoolProfit Core");
  const [stats, setStats] = useState<StatCard[]>([
    { title: "Total Students", value: 0, icon: "students" },
    { title: "Teachers", value: 0, icon: "teachers" },
    { title: "Total Parents", value: 0, icon: "parents" },
    { title: "Results Uploaded", value: "0%", icon: "results" },
  ]);

  // Alerts state
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string|null>(null);
  const [alertCounts, setAlertCounts] = useState({ open_total: 0, high: 0, medium: 0, low: 0, submission_open_total: 0, submission_overdue_total: 0 });

  // Review batches
  const [reviewBatches, setReviewBatches] = useState<ReviewBatch[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewBusyId, setReviewBusyId] = useState<number|null>(null);
  const [reviewError, setReviewError] = useState<string|null>(null);

  // Performance chart
  const [perfLabels, setPerfLabels] = useState<string[]>([]);
  const [perfData, setPerfData] = useState<number[]>([]);
  const chartRef = useRef<HTMLCanvasElement|null>(null);
  const chartInst = useRef<Chart|null>(null);

  // Top students
  const [topStudents, setTopStudents] = useState<TopStudent[]>([]);
  const [topLoading, setTopLoading] = useState(false);
  const [topError, setTopError] = useState<string|null>(null);
  const [topPage, setTopPage] = useState(1);
  const [topMeta, setTopMeta] = useState<TopStudentsResponse|null>(null);
  const topLimit = 5;
  const totalPages = topMeta ? Math.max(1, Math.ceil(topMeta.total / topLimit)) : 1;

  const paymentLink = `${window.location.origin}/pay-school-fee`;
  const [paymentLinkCopied, setPaymentLinkCopied] = useState(false);

  const copyPaymentLink = () => {
    navigator.clipboard.writeText(paymentLink);
    setPaymentLinkCopied(true);
    setTimeout(() => setPaymentLinkCopied(false), 2000);
  };

  const fetchAlerts = () => {
    setAlertsLoading(true);
    authApi.get<AlertSummaryResponse>("/admin/academic-alerts/summary")
      .then((res) => {
        setAlerts(Array.isArray(res.data?.data) ? res.data.data : []);
        if (res.data?.counts) setAlertCounts(res.data.counts);
      })
      .catch(() => setAlertsError("Could not refresh alerts"))
      .finally(() => setAlertsLoading(false));
  };

  const fetchReviewBatches = (term?: string, session?: string) => {
    setReviewLoading(true);
    setReviewError(null);
    authApi.get<ReviewBatchResponse>("/admin/result-batches", { params: { term, session } })
      .then((res) => {
        const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setReviewBatches(list);
      })
      .catch(() => {
        setReviewBatches([]);
      })
      .finally(() => setReviewLoading(false));
  };

  const runReviewAction = (batch: ReviewBatch, action: "approve" | "publish" | "reopen") => {
    setReviewBusyId(batch.id);
    authApi.post(`/admin/results/review-batches/${batch.id}/${action}`)
      .then(() => fetchReviewBatches())
      .catch((err) => alert(err?.response?.data?.message || `Failed to ${action} batch.`))
      .finally(() => setReviewBusyId(null));
  };

  const fetchTop = (page = 1) => {
    setTopLoading(true);
    authApi.get<TopStudentsResponse>("/top-students", { params: { page, limit: topLimit } })
      .then((res) => {
        setTopStudents(res.data?.data || []);
        setTopMeta(res.data);
      })
      .catch(() => setTopError("Could not load leaderboard"))
      .finally(() => setTopLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      authApi.get("/current-session-term"),
      authApi.get("/dashboard/counts"),
      authApi.get("/performance-stats"),
      authApi.get<AlertSummaryResponse>("/admin/academic-alerts/summary"),
      authApi.get<BillingDashboardResponse>("/school/billing/dashboard"),
    ]).then(([sessRes, countsRes, perfRes, alertRes, billingRes]) => {
      let term = "";
      let session = "";
      if (sessRes.status === "fulfilled") {
        session = sessRes.value.data.session ?? "";
        term = sessRes.value.data.term ?? "";
        setAcademicSession(session);
        setCurrentTerm(term);
      }
      if (countsRes.status === "fulfilled") {
        const c = countsRes.value.data ?? {};
        setTotalUsers(Number(c.total_users ?? 0));
        setStats([
          { title: "Total Students", value: Number(c.students ?? 0), icon: "students" },
          { title: "Teachers", value: Number(c.teachers ?? 0), icon: "teachers" },
          { title: "Total Parents", value: Number(c.parents ?? 0), icon: "parents" },
          { title: "Results Uploaded", value: c.results_uploaded ?? "0%", icon: "results" },
        ]);
      }
      if (perfRes.status === "fulfilled") {
        const pts: PerformancePoint[] = Array.isArray(perfRes.value.data.data) ? perfRes.value.data.data : [];
        setPerfLabels(pts.map((d) => d.term));
        setPerfData(pts.map((d) => d.average));
      }
      if (alertRes.status === "fulfilled") {
        setAlerts(Array.isArray(alertRes.value.data.data) ? alertRes.value.data.data : []);
        setAlertCounts(alertRes.value.data.counts || { open_total: 0, high: 0, medium: 0, low: 0, submission_open_total: 0, submission_overdue_total: 0 });
      }
      if (billingRes.status === "fulfilled") {
        setCurrentPackage(billingRes.value.data?.package?.name || "Core");
      }
      fetchReviewBatches(term, session);
    }).finally(() => {
      setLoading(false);
      fetchTop(1);
    });
  }, []);

  useEffect(() => {
    fetchTop(topPage);
  }, [topPage]);

  useEffect(() => {
    if (!chartRef.current) return;
    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;
    chartInst.current?.destroy();
    chartInst.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: perfLabels.length > 0 ? perfLabels : ["1st Term", "2nd Term", "3rd Term"],
        datasets: [{
          label: "Term Average (%)",
          data: perfData.length > 0 ? perfData : [72.4, 76.8, 81.2],
          backgroundColor: "#D97706",
          borderRadius: 8,
          barThickness: 28,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#0F2744",
            padding: 10,
            cornerRadius: 8,
            titleColor: "#F59E0B",
            bodyColor: "#FFFFFF",
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 12 } } },
          y: { beginAtZero: true, max: 100, grid: { color: "#F1F5F9" }, ticks: { font: { size: 12 } } },
        },
      },
    });
    return () => { chartInst.current?.destroy(); };
  }, [perfLabels, perfData]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        .db-main {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', sans-serif;
          padding: 24px 28px;
        }

        /* ── Hero Banner ── */
        .db-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 32px 36px;
          color: #FFFFFF;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 24px;
        }

        .db-session-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #FBBF24;
          background: rgba(217, 119, 6, 0.2);
          border: 1px solid rgba(217, 119, 6, 0.35);
          border-radius: 999px;
          padding: 4px 12px;
          margin-bottom: 12px;
        }

        .db-greeting {
          font-size: 26px;
          font-weight: 800;
          margin-bottom: 6px;
          color: #FFFFFF;
        }

        .db-hero-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          margin-bottom: 18px;
          max-width: 500px;
        }

        .db-btn-gold {
          background: #D97706;
          color: #FFFFFF;
          font-weight: 700;
          font-size: 13px;
          border: none;
          border-radius: 10px;
          padding: 9px 18px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .db-btn-gold:hover {
          background: #B45309;
          transform: translateY(-1px);
          color: #FFFFFF;
        }

        .db-btn-outline {
          background: rgba(255, 255, 255, 0.1);
          color: #FFFFFF;
          font-weight: 600;
          font-size: 13px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          padding: 9px 18px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .db-btn-outline:hover {
          background: rgba(255, 255, 255, 0.18);
          color: #FFFFFF;
        }

        /* ── Metric Stat Cards ── */
        .db-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
          margin-bottom: 24px;
        }

        @media (max-width: 1199px) { .db-stats { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 576px) { .db-stats { grid-template-columns: 1fr; } }

        .db-stat {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 22px 20px;
          box-shadow: 0 4px 12px rgba(15, 39, 68, 0.03);
          transition: all 0.2s ease;
        }

        .db-stat:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 24px rgba(15, 39, 68, 0.07);
          border-color: #CBD5E1;
        }

        .db-stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          margin-bottom: 12px;
        }

        .db-stat-label {
          font-size: 12.5px;
          font-weight: 600;
          color: #64748B;
          margin-bottom: 4px;
        }

        .db-stat-val {
          font-size: 26px;
          font-weight: 800;
          color: #0F2744;
          line-height: 1;
        }

        /* ── Panels ── */
        .rrq-panel, .aa-panel, .db-panel {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 18px;
          box-shadow: 0 4px 16px rgba(15, 39, 68, 0.03);
          margin-bottom: 24px;
          overflow: hidden;
        }

        .rrq-head, .aa-head, .db-panel-head {
          padding: 20px 24px;
          border-bottom: 1px solid #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .rrq-title-wrap, .aa-head-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .rrq-icon, .aa-head-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(217, 119, 6, 0.12);
          color: #D97706;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }

        .rrq-title, .aa-title, .db-panel-title {
          font-size: 17px;
          font-weight: 800;
          color: #0F2744;
          margin: 0 0 2px;
        }

        .rrq-sub, .aa-sub, .db-panel-sub {
          font-size: 12.5px;
          color: #64748B;
          margin: 0;
        }

        .rrq-count {
          background: #FEF3C7;
          color: #B45309;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 999px;
        }

        .db-refresh-btn {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          color: #475569;
          border-radius: 8px;
          padding: 6px 14px;
          font-size: 12.5px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }

        .db-refresh-btn:hover {
          background: #F1F5F9;
          color: #0F2744;
        }

        .rrq-body {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          padding: 20px;
        }

        @media (max-width: 991px) { .rrq-body { grid-template-columns: 1fr; } }

        .rrq-card {
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          background: #FFFFFF;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .rrq-card:hover {
          border-color: #CBD5E1;
          box-shadow: 0 6px 16px rgba(15, 39, 68, 0.04);
        }

        .rrq-class {
          font-size: 15px;
          font-weight: 800;
          color: #0F2744;
        }

        .rrq-meta {
          font-size: 11.5px;
          color: #94A3B8;
        }

        .rrq-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .rrq-badge--draft { background: #F1F5F9; color: #475569; }
        .rrq-badge--computed { background: #DBEAFE; color: #1D4ED8; }
        .rrq-badge--approved { background: #FEF3C7; color: #B45309; }
        .rrq-badge--published { background: #D1FAE5; color: #065F46; }

        .rrq-track {
          height: 6px;
          background: #F1F5F9;
          border-radius: 999px;
          overflow: hidden;
        }

        .rrq-fill {
          height: 100%;
          background: #D97706;
          border-radius: 999px;
        }

        .rrq-actions {
          display: flex;
          gap: 8px;
          margin-top: auto;
        }

        .rrq-btn {
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 12px;
          cursor: pointer;
          border: none;
        }

        .rrq-btn-light { background: #F1F5F9; color: #334155; }
        .rrq-btn-dark { background: #0F2744; color: #FFFFFF; }
        .rrq-btn-gold { background: #D97706; color: #FFFFFF; }

        .rrq-empty {
          grid-column: 1 / -1;
          text-align: center;
          padding: 32px;
          color: #64748B;
        }

        /* ── Academic Alerts ── */
        .aa-wrap {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 20px;
          margin-bottom: 24px;
        }

        @media (max-width: 991px) { .aa-wrap { grid-template-columns: 1fr; } }

        .aa-filters {
          display: flex;
          gap: 8px;
          padding: 12px 24px;
          border-bottom: 1px solid #F1F5F9;
        }

        .aa-filter-btn {
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 6px;
          color: #64748B;
          cursor: pointer;
        }

        .aa-filter-btn--active {
          background: #0F2744;
          color: #FFFFFF;
          border-color: #0F2744;
        }

        .aa-list {
          padding: 16px 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .aa-item {
          border: 1px solid #F1F5F9;
          border-radius: 10px;
          padding: 14px;
          background: #F8FAFC;
        }

        .aa-footer {
          padding: 14px 24px;
          border-top: 1px solid #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .aa-view-all-btn {
          border: none;
          background: none;
          color: #D97706;
          font-weight: 700;
          font-size: 12.5px;
          cursor: pointer;
        }

        .aa-scorecard {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 18px;
          padding: 24px;
          height: fit-content;
        }

        .aa-scorecard-title {
          font-size: 15px;
          font-weight: 800;
          color: #0F2744;
          margin-bottom: 16px;
        }

        .aa-scorecard-hero {
          text-align: center;
          background: #F8FAFC;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
        }

        .aa-scorecard-big {
          font-size: 42px;
          font-weight: 800;
          color: #0F2744;
          line-height: 1;
        }

        .aa-scorecard-big-label {
          font-size: 12px;
          color: #64748B;
          margin-top: 4px;
        }

        /* ── Grid ── */
        .db-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }

        @media (max-width: 991px) { .db-grid { grid-template-columns: 1fr; } }

        .db-table {
          width: 100%;
          border-collapse: collapse;
        }

        .db-table th {
          background: #F8FAFC;
          padding: 10px 16px;
          font-size: 11.5px;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          text-align: left;
          border-bottom: 1px solid #E2E8F0;
        }

        .db-table td {
          padding: 12px 16px;
          font-size: 13.5px;
          border-bottom: 1px solid #F1F5F9;
          color: #334155;
        }

        .db-rank {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 800;
        }

        .db-rank--gold { background: #FEF3C7; color: #B45309; }
        .db-rank--silver { background: #E2E8F0; color: #334155; }
        .db-rank--bronze { background: #FFEDD5; color: #C2410C; }

        .db-score-pill {
          background: #ECFDF5;
          color: #047857;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .db-pagination {
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: #64748B;
        }

        .db-page-btn {
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
        }

        .db-chart-wrap {
          padding: 20px;
          height: 250px;
        }

        /* ── Quick Actions ── */
        .db-actions {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 24px;
        }

        @media (max-width: 991px) { .db-actions { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 576px) { .db-actions { grid-template-columns: 1fr; } }

        .db-action {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 18px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s ease;
        }

        .db-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(15, 39, 68, 0.06);
          border-color: #CBD5E1;
        }

        .db-action-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }

        .db-action-label {
          font-size: 13.5px;
          font-weight: 700;
          color: #0F2744;
        }

        .db-action-desc {
          font-size: 11.5px;
          color: #64748B;
        }

        .rrq-spin { animation: rrqSpin 0.8s linear infinite; }
        @keyframes rrqSpin { to { transform: rotate(360deg); } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}/>
      <PageTitle title="School Administration Dashboard"/>

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}/>
          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loading && <Loader message="Opening school dashboard..." />}

            {/* Hero Banner */}
            <div className="db-hero">
              <div>
                <div className="db-session-badge">
                  <span>●</span> {academicSession || "Current Session"} — {currentTerm || "Active Term"}
                </div>
                <h1 className="db-greeting">{getGreeting()}, {user?.firstname || "Administrator"}.</h1>
                <p className="db-hero-sub">Welcome to your school management cockpit. Continuous assessment and live broadsheets are active.</p>
                <div className="d-flex flex-wrap gap-2">
                  <button className="db-btn-gold" onClick={()=>navigate("/results/pins")}>
                    <i className="bi bi-key-fill" /> Generate PINs
                  </button>
                  <button className="db-btn-outline" onClick={()=>navigate("/result/monitor")}>
                    <i className="bi bi-speedometer2" /> Result Monitoring
                  </button>
                  <button className="db-btn-outline" onClick={()=>navigate("/results/broadsheet")}>
                    <i className="bi bi-file-earmark-spreadsheet" /> Broadsheets
                  </button>
                </div>
              </div>

              {/* Public Fee Payment Shortcut */}
              <div className="d-none d-md-block" style={{ background: "rgba(255,255,255,0.08)", padding: "16px 20px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.15)", maxWidth: "260px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#FBBF24", textTransform: "uppercase", marginBottom: "6px" }}>
                  💳 Parent Fee Portal
                </div>
                <div style={{ fontSize: "12px", color: "#E2E8F0", marginBottom: "10px", lineHeight: 1.4 }}>
                  Share payment link with parents for direct settlement.
                </div>
                <button
                  className="btn btn-sm btn-light w-100 fw-bold"
                  style={{ fontSize: "12px", borderRadius: "8px" }}
                  onClick={copyPaymentLink}
                >
                  {paymentLinkCopied ? "✓ Copied Link!" : "Copy Parent Link"}
                </button>
              </div>
            </div>

            {/* Metric Stat Cards */}
            <div className="db-stats">
              {stats.map(({title, value}, i) => {
                const m = STAT_META[i];
                const icons = [
                  <i key="s" className="bi bi-mortarboard-fill" />,
                  <i key="t" className="bi bi-person-workspace" />,
                  <i key="p" className="bi bi-people-fill" />,
                  <i key="r" className="bi bi-check2-circle" />,
                ];
                return (
                  <div className="db-stat" key={title}>
                    <div className="db-stat-icon" style={{ background: m.bg, color: m.color }}>
                      {icons[i]}
                    </div>
                    <div className="db-stat-label">{title}</div>
                    <div className="db-stat-val">{value}</div>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions Bar */}
            <div className="db-actions">
              {QUICK_ACTIONS.map((a) => (
                <a
                  key={a.label}
                  href={a.path}
                  className="db-action"
                  onClick={(e) => { e.preventDefault(); navigate(a.path); }}
                >
                  <div className="db-action-icon" style={{ background: a.bg, color: a.color }}>
                    {a.icon}
                  </div>
                  <div>
                    <div className="db-action-label">{a.label}</div>
                    <div className="db-action-desc">{a.desc}</div>
                  </div>
                </a>
              ))}
            </div>

            {/* Result Review Queue */}
            <ResultReviewQueue
              batches={reviewBatches}
              loading={reviewLoading}
              busyId={reviewBusyId}
              error={reviewError}
              onRefresh={fetchReviewBatches}
              onApprove={(batch)=>runReviewAction(batch,"approve")}
              onPublish={(batch)=>runReviewAction(batch,"publish")}
              onReopen={(batch)=>runReviewAction(batch,"reopen")}
              onOpenBroadsheet={(batch)=>navigate(`/results/broadsheet/${batch.id}`)}
            />

            {/* Academic Alerts Section */}
            <AcademicAlertSection
              alerts={alerts}
              loading={alertsLoading && alerts.length === 0}
              error={alertsError}
              counts={alertCounts}
              onRefresh={fetchAlerts}
              alertsLoading={alertsLoading}
              onViewAll={()=>navigate("/admin/academic-alerts")}
            />

            {/* Performance Chart & Top Students Leaderboard */}
            <div className="db-grid">
              {/* Leaderboard */}
              <div className="db-panel">
                <div className="db-panel-head">
                  <div>
                    <h3 className="db-panel-title">Top Academic Achievers</h3>
                    <p className="db-panel-sub">{topMeta ? `${topMeta.term_used} · ${topMeta.session_used}` : "Current Term"}</p>
                  </div>
                  <button className="db-refresh-btn" onClick={()=>fetchTop(topPage)} disabled={topLoading}>
                    <i className={`bi bi-arrow-clockwise ${topLoading ? "rrq-spin" : ""}`} />
                    {topLoading ? "..." : "Refresh"}
                  </button>
                </div>

                <div className="overflow-auto">
                  <table className="db-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Adm. No</th>
                        <th>Student Name</th>
                        <th>Class</th>
                        <th>Avg Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topLoading ? (
                        Array.from({length: 4}).map((_, i) => (
                          <tr key={i}>
                            <td colSpan={5}><div className="rm-skel rm-skel--sub" style={{width: "100%"}} /></td>
                          </tr>
                        ))
                      ) : topStudents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4 text-muted">No student score records found for this term.</td>
                        </tr>
                      ) : (
                        topStudents.map((s, idx) => {
                          const rank = (topPage - 1) * topLimit + idx + 1;
                          const rc = rank === 1 ? "db-rank--gold" : rank === 2 ? "db-rank--silver" : rank === 3 ? "db-rank--bronze" : "";
                          return (
                            <tr key={`${s.admission_no}-${idx}`}>
                              <td><span className={`db-rank ${rc}`}>{rank}</span></td>
                              <td style={{ color: "#64748B", fontSize: "12.5px" }}>{s.admission_no}</td>
                              <td><strong style={{ color: "#0F2744" }}>{s.name}</strong></td>
                              <td>{s.class}</td>
                              <td><span className="db-score-pill">{Number.isFinite(s.score) ? s.score.toFixed(1) : s.score}%</span></td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="db-pagination">
                  <span>{topMeta ? `${topMeta.total} total students recorded` : ""}</span>
                  <div className="d-flex gap-2">
                    <button className="db-page-btn" onClick={()=>setTopPage(p=>Math.max(1, p-1))} disabled={topPage <= 1 || topLoading}>
                      ← Prev
                    </button>
                    <span>Page {topPage} of {totalPages}</span>
                    <button className="db-page-btn" onClick={()=>setTopPage(p=>Math.min(totalPages, p+1))} disabled={topPage >= totalPages || topLoading}>
                      Next →
                    </button>
                  </div>
                </div>
              </div>

              {/* Term Average Chart */}
              <div className="db-panel d-flex flex-column">
                <div className="db-panel-head">
                  <div>
                    <h3 className="db-panel-title">Academic Trend</h3>
                    <p className="db-panel-sub">School average score progression</p>
                  </div>
                </div>
                <div className="db-chart-wrap flex-grow-1">
                  <canvas ref={chartRef} />
                </div>
              </div>
            </div>

            <Footer/>
          </main>
        </div>
      </div>
    </>
  );
}
