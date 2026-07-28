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
type ReviewSummaryResponse = { batch: ReviewBatch; review: NonNullable<ReviewBatch["review"]> };

const STAT_META = [
  { color: "var(--bs-warning,  rgb(245,158,11))", bg: "rgba(245,158,11,0.10)", label: "vs last term" },
  { color: "var(--bs-info,     rgb(59,130,246))", bg: "rgba(59,130,246,0.10)", label: "active staff" },
  { color: "var(--bs-success,  rgb(34,197,94))",  bg: "rgba(34,197,94,0.10)",  label: "registered" },
  { color: "var(--bs-primary,  rgb(211,0,176))",  bg: "rgba(211,0,176,0.08)", label: "completion" },
];

const QUICK_ACTIONS = [
  { label:"Add Student",    desc:"Register a new student",      color:"var(--bs-warning, rgb(245,158,11))", bg:"rgba(245,158,11,0.10)", path:"/students/register",
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="10" cy="8" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="M2 20c0-4.418 3.582-8 8-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M18 14v6M15 17h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg> },
  { label:"Upload Results", desc:"Add or update grades",         color:"var(--bs-success, rgb(34,197,94))",  bg:"rgba(34,197,94,0.10)",  path:"/students/results/add",
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 2v6h6M12 11v6M9 14l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { label:"Generate PINs",  desc:"Create result access cards",   color:"var(--bs-info, rgb(59,130,246))",    bg:"rgba(59,130,246,0.10)", path:"/results/pins",
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="8" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M7 8V6a5 5 0 0110 0v2" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="14" r="1.5" fill="currentColor"/><path d="M12 15.5v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
  { label:"Fee Access",     desc:"Control result viewing",       color:"var(--bs-danger, rgb(239,68,68))",   bg:"rgba(239,68,68,0.09)",  path:"/school/settings",
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.5"/><path d="M12 14v2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
  { label:"View Reports",   desc:"Analytics & insights",         color:"var(--bs-primary, rgb(211,0,176))",  bg:"rgba(211,0,176,0.08)",  path:"/students/report",
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 20V14M8 20V8M12 20V11M16 20V5M20 20V9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M4 14l4-6 4 3 4-9 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg> },
];

function getGreeting() { const h = new Date().getHours(); if(h<12)return"Good morning"; if(h<17)return"Good afternoon"; return"Good evening"; }

function getAlertConfig(severity: AlertItem["severity"]) {
  if (severity === "high") return { color:"rgb(239,68,68)", bg:"rgba(239,68,68,0.07)", border:"rgba(239,68,68,0.15)", pill:"rgba(239,68,68,0.12)", barColor:"#ef4444", label:"High",
    icon:<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3l5.5 9H2.5L8 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M8 7v2.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> };
  if (severity === "medium") return { color:"rgb(245,158,11)", bg:"rgba(245,158,11,0.07)", border:"rgba(245,158,11,0.18)", pill:"rgba(245,158,11,0.12)", barColor:"#f59e0b", label:"Medium",
    icon:<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v3.5M8 10h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> };
  return { color:"rgb(59,130,246)", bg:"rgba(59,130,246,0.07)", border:"rgba(59,130,246,0.15)", pill:"rgba(59,130,246,0.12)", barColor:"#3b82f6", label:"Low",
    icon:<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 7.5v3M8 6h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> };
}

function formatAlertMeta(a: AlertItem) { return [a.class_name,a.subject_name,a.student_name].filter(Boolean).join(" Â· ") || "Academic monitoring"; }
function formatRelativeTime(d?: string|null): string { if(!d)return""; const diff=Date.now()-new Date(d).getTime(); const m=Math.floor(diff/60000); if(m<1)return"just now"; if(m<60)return`${m}m ago`; const h=Math.floor(m/60); if(h<24)return`${h}h ago`; return`${Math.floor(h/24)}d ago`; }

function resultStatusLabel(status?: ResultBatchStatus) {
  const s = String(status || "").toLowerCase();
  if (s === "draft") return "Still Entering";
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
          <div className="rrq-icon"><i className="bi bi-clipboard-check" /></div>
          <div>
            <h2 className="rrq-title">Results to Review</h2>
            <p className="rrq-sub">Latest class results waiting for admin or principal approval.</p>
          </div>
        </div>
        <div className="rrq-head-actions">
          <span className="rrq-count">{waiting} waiting</span>
          <button className="db-refresh-btn" onClick={onRefresh} disabled={loading}>
            <i className={`bi bi-arrow-clockwise ${loading ? "rrq-spin" : ""}`} />
            {loading ? "Loading" : "Refresh"}
          </button>
        </div>
      </div>

      {error && <div className="rrq-error"><i className="bi bi-exclamation-circle" />{error}</div>}

      <div className="rrq-body">
        {loading && batches.length === 0 ? (
          [0,1,2].map((i) => (
            <div className="rrq-card" key={i}>
              <div className="rm-skel rm-skel--title" style={{width:"38%"}}/>
              <div className="rm-skel rm-skel--sub mt-2" style={{width:"70%"}}/>
              <div className="rm-skel mt-3" style={{width:"100%",height:8}}/>
            </div>
          ))
        ) : batches.length === 0 ? (
          <div className="rrq-empty">
            <i className="bi bi-check2-circle" />
            <div><p>No result is waiting for review.</p><span>When teachers save class results, the latest batches will appear here.</span></div>
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
            const canApprove = !!review?.can_approve && status !== "approved" && status !== "published";
            const canPublish = !!review?.can_publish && status !== "published";

            return (
              <div className="rrq-card" key={batch.id}>
                <div className="rrq-card-top">
                  <div>
                    <div className="rrq-class">{batch.class_name}</div>
                    <div className="rrq-meta">{batch.term} â€¢ {batch.session} â€¢ updated {formatRelativeTime(batch.updated_at)}</div>
                  </div>
                  <span className={`rrq-badge rrq-badge--${tone}`}>{resultStatusLabel(batch.status)}</span>
                </div>
                <p className="rrq-status-text">{review?.simple_status || "Open this result batch to review the class scores."}</p>
                <div className="rrq-progress-row"><span>{done}/{total} students completed</span><span>{progress}%</span></div>
                <div className="rrq-track"><div className="rrq-fill" style={{width:`${progress}%`}} /></div>
                <div className="rrq-notes">
                  {Number(review?.missing_students_count || 0) > 0 && <span><i className="bi bi-person-dash" />{review?.missing_students_count} missing</span>}
                  {Number(review?.open_high_alerts || 0) > 0 && <span className="rrq-note-danger"><i className="bi bi-exclamation-triangle" />{review?.open_high_alerts} serious alert{review?.open_high_alerts === 1 ? "" : "s"}</span>}
                  {Number(review?.open_alerts || 0) > 0 && Number(review?.open_high_alerts || 0) === 0 && <span><i className="bi bi-info-circle" />{review?.open_alerts} alert{review?.open_alerts === 1 ? "" : "s"}</span>}
                  {review?.can_approve && <span className="rrq-note-good"><i className="bi bi-check-circle" />Ready</span>}
                </div>
                <div className="rrq-actions">
                  <button className="rrq-btn rrq-btn-light" onClick={()=>onOpenBroadsheet(batch)} disabled={busy}>Review</button>
                  {canApprove && <button className="rrq-btn rrq-btn-dark" onClick={()=>onApprove(batch)} disabled={busy}>{busy ? "Working" : "Approve"}</button>}
                  {canPublish && <button className="rrq-btn rrq-btn-gold" onClick={()=>onPublish(batch)} disabled={busy}>{busy ? "Working" : "Publish"}</button>}
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

/* â”€â”€â”€ AcademicAlertSection â”€â”€â”€ */
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
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 2l6.5 11H2.5L9 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 7.5V11M9 12.5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            </div>
            <div><h3 className="aa-title">Academic Alerts</h3><p className="aa-sub">Flagged concerns requiring attention</p></div>
          </div>
          <button className="rm-refresh-btn" onClick={onRefresh} disabled={alertsLoading}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{animation:alertsLoading?"dbSpin 0.8s linear infinite":"none"}}>
              <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {alertsLoading?"Loadingâ€¦":"Refresh"}
          </button>
        </div>

        {!loading&&alerts.length>0&&(
          <div className="aa-filters">
            {([{key:"all",label:"All",count:alerts.length},{key:"high",label:"High",count:highCount},{key:"medium",label:"Medium",count:medCount},{key:"low",label:"Low",count:lowCount}] as const).map(f=>(
              <button key={f.key} className={`aa-filter-btn ${activeFilter===f.key?"aa-filter-btn--active":""}`} data-sev={f.key} onClick={()=>setActiveFilter(f.key)}>
                {f.label}{f.count>0&&<span className="aa-filter-count">{f.count}</span>}
              </button>
            ))}
          </div>
        )}

        {error&&<div className="aa-error-bar"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3"/><path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>{error}</div>}

        <div className="aa-list">
          {loading ? (
            [0,1,2,3].map(i=>(
              <div key={i} className="aa-skeleton-item">
                <div style={{display:"flex",gap:10}}>
                  <div className="rm-skel" style={{width:32,height:32,borderRadius:8,flexShrink:0}}/>
                  <div style={{flex:1}}><div className="rm-skel rm-skel--title mb-2" style={{width:"45%"}}/><div className="rm-skel rm-skel--sub" style={{width:"70%"}}/></div>
                  <div className="rm-skel" style={{width:52,height:22,borderRadius:999}}/>
                </div>
                <div className="rm-skel rm-skel--sub mt-2" style={{width:"90%",marginLeft:42}}/>
              </div>
            ))
          ) : filtered.length===0 ? (
            <div className="aa-empty">
              <svg width="32" height="32" viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="15" stroke="#d4c9bd" strokeWidth="1.5"/><path d="M12 18l4 4 8-8" stroke="#d4c9bd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <p>{activeFilter==="all"?"No open academic alerts right now.":`No ${activeFilter}-severity alerts.`}</p>
            </div>
          ) : (
            filtered.map((a,idx)=>{
              const cfg=getAlertConfig(a.severity);
              return (
                <div key={a.id} className="aa-item" style={{"--ai-bg":cfg.bg,"--ai-border":cfg.border,"--ai-color":cfg.color,"--ai-pill":cfg.pill,"--ai-bar":cfg.barColor,animationDelay:`${idx*50}ms`} as React.CSSProperties}>
                  <div className="aa-item-bar"/>
                  <div className="aa-item-body">
                    <div className="aa-item-top">
                      <div className="aa-item-left">
                        <div className="aa-item-icon">{cfg.icon}</div>
                        <div><p className="aa-item-title">{a.title}</p><p className="aa-item-meta">{formatAlertMeta(a)}</p></div>
                      </div>
                      <div className="aa-item-right">
                        <span className="aa-sev-badge">{cfg.label}</span>
                        {a.created_at&&<span className="aa-time">{formatRelativeTime(a.created_at)}</span>}
                      </div>
                    </div>
                    <p className="aa-item-msg">{a.message}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {!loading&&counts.open_total>0&&(
          <div className="aa-footer">
            <span className="aa-footer-count">{counts.open_total} total open alert{counts.open_total===1?"":"s"}</span>
            <button className="aa-view-all-btn" onClick={onViewAll}>View all alerts<svg width="12" height="12" viewBox="0 0 13 13" fill="none"><path d="M1 6.5h11M6.5 1l5.5 5.5-5.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
          </div>
        )}
      </div>

      {/* Scorecard */}
      <div className="aa-scorecard">
        <p className="aa-scorecard-title">Alert Overview</p>
        <div className="aa-scorecard-hero">
          <div className="aa-scorecard-big">{counts.open_total}</div>
          <div className="aa-scorecard-big-label">Open alerts</div>
        </div>
        <div className="aa-breakdown">
          {([{key:"high",label:"High",count:counts.high,color:"#ef4444",track:"rgba(239,68,68,0.10)"},{key:"medium",label:"Medium",count:counts.medium,color:"#f59e0b",track:"rgba(245,158,11,0.10)"},{key:"low",label:"Low",count:counts.low,color:"#3b82f6",track:"rgba(59,130,246,0.10)"}] as const).map(s=>{
            const pct=counts.open_total>0?Math.round((s.count/counts.open_total)*100):0;
            return (
              <div key={s.key} className="aa-breakdown-row">
                <div className="aa-breakdown-label-row">
                  <span className="aa-breakdown-label"><span className="aa-breakdown-dot" style={{background:s.color}}/>{s.label}</span>
                  <span className="aa-breakdown-count">{s.count}</span>
                </div>
                <div className="aa-breakdown-track" style={{background:s.track}}>
                  <div className="aa-breakdown-fill" style={{width:`${pct}%`,background:s.color}}/>
                </div>
              </div>
            );
          })}
        </div>
        <div className="aa-scorecard-divider"/>
        <button className="db-btn-gold" onClick={onViewAll} style={{width:"100%",justifyContent:"center"}}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          View all alerts
        </button>
        {counts.high>0&&(
          <div className="aa-tip-box">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{flexShrink:0}}><path d="M7 2l4.5 7.5H2.5L7 2z" stroke="rgb(220,38,38)" strokeWidth="1.3" strokeLinejoin="round"/><path d="M7 6v2M7 9.5v.2" stroke="rgb(220,38,38)" strokeWidth="1.4" strokeLinecap="round"/></svg>
            {counts.high} high-severity alert{counts.high>1?"s need":" needs"} immediate attention.
          </div>
        )}
      </div>
    </div>
  );
}

/* â”€â”€â”€ Main â”€â”€â”€ */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [academicSession,setAcademicSession]=useState("");
  const [currentTerm,setCurrentTerm]=useState("");
  const [loading,setLoading]=useState(true);
  const [totalUsers,setTotalUsers]=useState(0);
  const [stats,setStats]=useState<StatCard[]>([{title:"Total Students",value:0,icon:"students"},{title:"Teachers",value:0,icon:"teachers"},{title:"Total Parents",value:0,icon:"parents"},{title:"Results Uploaded",value:"0%",icon:"results"}]);
  const [alerts,setAlerts]=useState<AlertItem[]>([]);
  const [alertCounts,setAlertCounts]=useState({open_total:0,high:0,medium:0,low:0,submission_open_total:0,submission_overdue_total:0});
  const [alertsLoading,setAlertsLoading]=useState(false);
  const [alertsError,setAlertsError]=useState<string|null>(null);
  const chartRef=useRef<HTMLCanvasElement|null>(null);
  const chartInst=useRef<Chart|null>(null);
  const [perfLabels,setPerfLabels]=useState<string[]>([]);
  const [perfData,setPerfData]=useState<number[]>([]);
  const [topStudents,setTopStudents]=useState<TopStudent[]>([]);
  const [topMeta,setTopMeta]=useState<{total:number;session_used:string;term_used:string}|null>(null);
  const [topLoading,setTopLoading]=useState(false);
  const [topError,setTopError]=useState<string|null>(null);
  const [topPage,setTopPage]=useState(1);
  const [paymentLinkCopied,setPaymentLinkCopied]=useState(false);
  const [currentPackage,setCurrentPackage]=useState("Core");
  const [reviewBatches,setReviewBatches]=useState<ReviewBatch[]>([]);
  const [reviewLoading,setReviewLoading]=useState(false);
  const [reviewError,setReviewError]=useState<string|null>(null);
  const [reviewBusyId,setReviewBusyId]=useState<number|null>(null);
  const topLimit=5;
  const totalPages=useMemo(()=>!topMeta?1:Math.max(1,Math.ceil(topMeta.total/topLimit)),[topMeta]);
  const adminUser = getUser();
  const paymentLink = `${window.location.origin}/pay-school-fee${adminUser?.reg_no ? `?school_code=${encodeURIComponent(adminUser.reg_no)}` : ""}`;
  const copyPaymentLink=async()=>{try{await navigator.clipboard.writeText(paymentLink);setPaymentLinkCopied(true);window.setTimeout(()=>setPaymentLinkCopied(false),1800);}catch{window.prompt("Copy payment link",paymentLink);}};

  const fetchTop=async(page:number)=>{setTopLoading(true);setTopError(null);try{const res=await authApi.get<TopStudentsResponse>("/top-performing-students",{params:{limit:topLimit,page}});setTopStudents(Array.isArray(res.data.data)?res.data.data:[]);setTopMeta({total:res.data.total??0,session_used:res.data.session_used??"",term_used:res.data.term_used??""});}catch(e:any){setTopStudents([]);setTopMeta(null);setTopError(e?.response?.data?.message||"Unable to load top students.");}finally{setTopLoading(false);}};
  const fetchAlerts=async()=>{setAlertsLoading(true);setAlertsError(null);try{const res=await authApi.get<AlertSummaryResponse>("/admin/academic-alerts/summary");setAlerts(res.data.data||[]);setAlertCounts(res.data.counts||{open_total:0,high:0,medium:0,low:0,submission_open_total:0,submission_overdue_total:0});}catch(e:any){setAlerts([]);setAlertCounts({open_total:0,high:0,medium:0,low:0,submission_open_total:0,submission_overdue_total:0});setAlertsError(e?.response?.data?.message||"Unable to load academic alerts.");}finally{setAlertsLoading(false);}};
  const fetchReviewBatches=async(termValue=currentTerm,sessionValue=academicSession)=>{setReviewLoading(true);setReviewError(null);try{const params:any={};if(termValue)params.term=termValue;if(sessionValue)params.session=sessionValue;const res=await authApi.get<ReviewBatchResponse>("/admin/result-batches",{params});const list=(Array.isArray(res.data.data)?res.data.data:[]).slice(0,5);const enriched=await Promise.all(list.map(async(batch)=>{try{const summary=await authApi.get<ReviewSummaryResponse>(`/result-batches/${batch.id}/review-summary`);return{...batch,...summary.data.batch,review:summary.data.review};}catch{return batch;}}));setReviewBatches(enriched);}catch(e:any){setReviewBatches([]);setReviewError(e?.response?.data?.message||"Unable to load results for review.");}finally{setReviewLoading(false);}};
  const runReviewAction=async(batch:ReviewBatch,action:"approve"|"publish"|"reopen")=>{setReviewBusyId(batch.id);setReviewError(null);try{await authApi.post(`/result-batches/${batch.id}/${action}`);await fetchReviewBatches();}catch(e:any){setReviewError(e?.response?.data?.message||`Unable to ${action} this result batch.`);}finally{setReviewBusyId(null);}};

  useEffect(()=>{setLoading(true);Promise.allSettled([authApi.get("/current-session-term"),authApi.get("/dashboard/counts"),authApi.get("/performance-stats"),authApi.get<AlertSummaryResponse>("/admin/academic-alerts/summary"),authApi.get<BillingDashboardResponse>("/school/billing/dashboard")]).then(([sessRes,countsRes,perfRes,alertRes,billingRes])=>{let termForReview="";let sessionForReview="";if(sessRes.status==="fulfilled"){sessionForReview=sessRes.value.data.session??"";termForReview=sessRes.value.data.term??"";setAcademicSession(sessionForReview);setCurrentTerm(termForReview);} if(countsRes.status==="fulfilled"){const c=countsRes.value.data??{};setTotalUsers(Number(c.total_users??(Number(c.students??0)+Number(c.teachers??0)+Number(c.parents??0))));setStats([{title:"Total Students",value:Number(c.students??0),icon:"students"},{title:"Teachers",value:Number(c.teachers??0),icon:"teachers"},{title:"Total Parents",value:Number(c.parents??0),icon:"parents"},{title:"Results Uploaded",value:c.results_uploaded??"0%",icon:"results"}]);} if(perfRes.status==="fulfilled"){const pts:PerformancePoint[]=Array.isArray(perfRes.value.data.data)?perfRes.value.data.data:[];setPerfLabels(pts.map(d=>d.term));setPerfData(pts.map(d=>d.average));} if(alertRes.status==="fulfilled"){setAlerts(Array.isArray(alertRes.value.data.data)?alertRes.value.data.data:[]);setAlertCounts(alertRes.value.data.counts||{open_total:0,high:0,medium:0,low:0,submission_open_total:0,submission_overdue_total:0});} if(billingRes.status==="fulfilled"){setCurrentPackage(billingRes.value.data?.package?.name||"Core");} if([sessRes,countsRes,perfRes,alertRes].some(r=>r.status==="rejected")){setAlertsError("Some dashboard sections could not be loaded.");}return{termForReview,sessionForReview};}).then(({termForReview,sessionForReview})=>{fetchReviewBatches(termForReview,sessionForReview);}).finally(()=>{setLoading(false);fetchTop(1);});},[]);
  useEffect(()=>{fetchTop(topPage);},[topPage]);
  useEffect(()=>{if(!chartRef.current)return;const ctx=chartRef.current.getContext("2d");if(!ctx)return;chartInst.current?.destroy();chartInst.current=new Chart(ctx,{type:"bar",data:{labels:perfLabels,datasets:[{label:"Average Score",data:perfData,backgroundColor:(context)=>{const g=context.chart.ctx.createLinearGradient(0,0,0,260);g.addColorStop(0,"rgba(255,200,87,0.88)");g.addColorStop(1,"rgba(255,200,87,0.20)");return g;},borderRadius:6,barThickness:32}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:"#050008",padding:12,cornerRadius:8,titleColor:"rgb(255,200,87)",bodyColor:"#94a3b8",titleFont:{size:13,weight:"bold" as const},bodyFont:{size:12}}},scales:{x:{grid:{display:false},ticks:{font:{size:11},color:"#9a8a7a"},border:{display:false}},y:{beginAtZero:true,grid:{color:"rgba(0,0,0,0.04)"},ticks:{font:{size:11},color:"#9a8a7a"},border:{display:false}}}}});return()=>{chartInst.current?.destroy();};},[perfLabels,perfData]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500&display=swap');
        :root{--db-light:var(--bs-light,#fcf8f8);--db-dark:var(--bs-dark,#050008);--db-accent:var(--bs-secondary,rgb(255,200,87));--db-magenta:var(--bs-primary,rgb(211,0,176));--db-success:var(--bs-success,rgb(34,197,94));--db-danger:var(--bs-danger,rgb(239,68,68));--db-border:var(--bs-border-color,#ede8e0);--db-radius:var(--bs-border-radius-lg,14px);--db-accent-dim:rgba(255,200,87,0.10);--db-accent-border:rgba(255,200,87,0.22);--db-magenta-dim:rgba(211,0,176,0.08)}
        .db-main{background:linear-gradient(180deg,rgba(211,0,176,0.035),transparent 240px),var(--db-light);min-height:100vh;font-family:'DM Sans',sans-serif;padding:28px 28px 0;overflow-x:hidden}
        .db-hero{background:linear-gradient(135deg,var(--db-dark),#16081d);border-radius:var(--db-radius);padding:30px 34px;position:relative;overflow:hidden;margin-bottom:24px;border:1px solid rgba(255,255,255,0.08);box-shadow:0 18px 44px rgba(5,0,8,0.10)}
        .db-hero::before{content:'';position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,0.045) 1px,transparent 1px);background-size:24px 24px;pointer-events:none}
        .db-hero-glow{position:absolute;top:-60px;right:-60px;width:320px;height:320px;border-radius:50%;background:radial-gradient(circle,rgba(255,200,87,0.10) 0%,transparent 65%);pointer-events:none}
        .db-hero-glow2{position:absolute;bottom:-40px;left:30%;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(211,0,176,0.06) 0%,transparent 70%);pointer-events:none}
        .db-hero-inner{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap}
        .db-session-badge{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--db-accent);background:rgba(255,200,87,0.10);border:1px solid rgba(255,200,87,0.22);border-radius:100px;padding:4px 12px;margin-bottom:14px}
        .db-session-dot{width:6px;height:6px;border-radius:50%;background:var(--db-success);animation:dbPulse 2s ease infinite}
        @keyframes dbPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}
        .db-greeting{font-family:'Playfair Display',Georgia,serif;font-size:clamp(22px,2.5vw,32px);font-weight:900;color:#fff;line-height:1.1;margin-bottom:8px}
        .db-greeting em{font-style:italic;color:var(--db-magenta)}
        .db-hero-sub{font-size:13.5px;font-weight:300;color:rgba(255,255,255,0.38);line-height:1.65;max-width:440px;margin-bottom:24px}
        .db-btn-gold{display:inline-flex;align-items:center;gap:7px;padding:10px 20px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:var(--db-dark);background:var(--db-accent);border:none;border-radius:var(--db-radius);cursor:pointer;transition:background .2s,transform .2s;text-decoration:none;white-space:nowrap}
        .db-btn-gold:hover{background:#ffe0a0;transform:translateY(-1px)}
        .db-btn-outline{display:inline-flex;align-items:center;gap:7px;padding:10px 20px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:400;color:rgba(255,255,255,0.7);background:transparent;border:1px solid rgba(255,255,255,0.14);border-radius:var(--db-radius);cursor:pointer;transition:background .2s,border-color .2s,color .2s;white-space:nowrap}
        .db-btn-outline:hover{background:rgba(255,255,255,0.06);color:#fff;border-color:rgba(255,255,255,0.28)}
        .db-hero-stat-card{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);backdrop-filter:blur(8px);border-radius:var(--db-radius);padding:20px 24px;min-width:220px}
        .db-hero-stat-item{display:flex;justify-content:space-between;align-items:center;gap:16px}
        .db-hero-stat-label{font-size:12px;font-weight:300;color:rgba(255,255,255,0.28)}
        .db-hero-stat-val{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:var(--db-accent)}
        .db-hero-stat-sep{height:1px;background:rgba(255,255,255,0.06)}
        .db-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:24px}
        @media(max-width:1199.98px){.db-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:575.98px){.db-stats{grid-template-columns:1fr}}
        .db-stat{background:#fff;border:1px solid rgba(5,0,8,0.08);border-radius:var(--db-radius);padding:22px 20px;position:relative;overflow:hidden;cursor:default;transition:box-shadow .25s,transform .25s,border-color .25s;animation:dbFadeUp .5s ease both;box-shadow:0 10px 28px rgba(5,0,8,0.045)}
        .db-stat::after{content:'';position:absolute;right:-44px;top:-44px;width:132px;height:132px;border-radius:50%;background:rgba(211,0,176,0.055);pointer-events:none}
        .db-stat:nth-child(1){animation-delay:.05s}.db-stat:nth-child(2){animation-delay:.10s}.db-stat:nth-child(3){animation-delay:.15s}.db-stat:nth-child(4){animation-delay:.20s}
        @keyframes dbFadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .db-stat:hover{box-shadow:0 16px 36px rgba(5,0,8,0.08);transform:translateY(-3px);border-color:rgba(211,0,176,0.18)}
        .db-stat::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--db-magenta),var(--db-accent));transform:scaleX(0);transform-origin:left;transition:transform .3s ease}
        .db-stat:hover::before{transform:scaleX(1)}
        .db-stat-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;position:relative;z-index:1}
        .db-stat-icon{width:42px;height:42px;border-radius:10px;background:rgba(211,0,176,0.08);color:var(--db-magenta);display:flex;align-items:center;justify-content:center;transition:transform .3s cubic-bezier(.34,1.56,.64,1)}
        .db-stat:hover .db-stat-icon{transform:scale(1.1) rotate(-4deg)}
        .db-stat-more{color:#c8bfb5;cursor:pointer;padding:2px;position:relative;z-index:1}
        .db-stat-label{font-size:12px;font-weight:600;color:#8c7f8f;margin-bottom:5px;letter-spacing:.03em;position:relative;z-index:1}
        .db-stat-val{font-family:'Playfair Display',Georgia,serif;font-size:30px;font-weight:700;color:var(--db-dark);line-height:1;position:relative;z-index:1}
        .db-stat-footer{display:flex;align-items:center;gap:5px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(5,0,8,0.07);font-size:12px;color:#9a8a7a;position:relative;z-index:1}
        .db-stat-trend{color:var(--db-success);font-weight:700}
        .db-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,360px);gap:20px;margin-bottom:24px}
        @media(max-width:991.98px){.db-grid{grid-template-columns:1fr}}
        .db-panel{background:#fff;border:1px solid var(--db-border);border-radius:var(--db-radius);overflow:hidden;min-width:0;box-shadow:0 8px 24px rgba(5,0,8,0.04)}
        .db-panel-head{display:flex;align-items:center;justify-content:space-between;padding:22px 24px 18px;border-bottom:1px solid rgba(0,0,0,0.06);gap:12px}
        .db-panel-icon{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:var(--pi);color:var(--pc);flex-shrink:0}
        .db-panel-title{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:var(--db-dark);margin:0}
        .db-panel-sub{font-size:11.5px;font-weight:300;color:#9a8a7a;margin:0}
        .db-table{width:100%;border-collapse:collapse}
        .db-table th{padding:10px 16px;font-size:11px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:#9a8a7a;background:var(--db-light);border-bottom:1px solid rgba(0,0,0,0.06);text-align:left;white-space:nowrap}
        .db-table th:last-child{text-align:right}
        .db-table td{padding:13px 16px;font-size:13.5px;color:#4a4a5a;border-bottom:1px solid rgba(0,0,0,0.06);vertical-align:middle}
        .db-table tbody tr:last-child td{border-bottom:none}
        .db-table tbody tr{transition:background .15s;cursor:default}
        .db-table tbody tr:hover{background:var(--db-light)}
        .db-rank{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;font-size:11px;font-weight:700;background:#f0ebe3;color:#7a6a5a}
        .db-rank--gold{background:rgba(255,200,87,0.15);color:rgb(180,83,9)}.db-rank--silver{background:#f1f5f9;color:#475569}.db-rank--bronze{background:#fff7ed;color:#9a3412}
        .db-student-name{font-weight:500;color:var(--db-dark)}
        .db-score-pill{display:inline-flex;align-items:center;font-size:12.5px;font-weight:500;padding:3px 10px;border-radius:100px;float:right;background:var(--db-accent-dim);color:rgb(180,83,9)}
        .db-table-empty{padding:48px 16px;text-align:center;color:#b5a090;font-size:13.5px}
        .db-pagination{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;flex-wrap:wrap;gap:10px;border-top:1px solid rgba(0,0,0,0.06)}
        .db-page-info{font-size:12px;font-weight:300;color:#9a8a7a}
        .db-page-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;font-size:12.5px;font-weight:400;color:#7a6a5a;background:var(--db-light);border:1px solid var(--db-border);border-radius:7px;cursor:pointer;transition:background .2s,color .2s}
        .db-page-btn:hover:not(:disabled){background:#ede8e0;color:var(--db-dark)}.db-page-btn:disabled{opacity:.4;cursor:not-allowed}
        .db-page-current{padding:6px 12px;font-size:12px;color:#9a8a7a}
        .db-refresh-btn,.rm-refresh-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;font-size:12px;font-weight:400;color:#7a6a5a;background:var(--db-light);border:1px solid var(--db-border);border-radius:7px;cursor:pointer;transition:background .2s,border-color .2s}
        .db-refresh-btn:hover,.rm-refresh-btn:hover{background:#ede8e0;border-color:var(--db-accent-border)}
        .db-refresh-btn:disabled,.rm-refresh-btn:disabled{opacity:.5;cursor:not-allowed}
        .db-chart-wrap{padding:20px;height:260px}
        .db-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:28px}
        @media(max-width:991.98px){.db-actions{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:575.98px){.db-actions{grid-template-columns:1fr 1fr}}
        .db-action{background:#fff;border:1px solid rgba(5,0,8,0.08);border-radius:var(--db-radius);padding:20px 18px;cursor:pointer;display:flex;flex-direction:column;gap:10px;transition:box-shadow .25s,transform .25s,border-color .25s;text-decoration:none;color:inherit;box-shadow:0 8px 24px rgba(5,0,8,0.04);min-width:0}
        .db-action:hover{box-shadow:0 14px 34px rgba(5,0,8,0.08);transform:translateY(-4px);border-color:rgba(211,0,176,0.18)}
        .db-action-icon{width:46px;height:46px;border-radius:12px;background:rgba(211,0,176,0.08);color:var(--db-magenta);display:flex;align-items:center;justify-content:center;transition:transform .3s cubic-bezier(.34,1.56,.64,1)}
        .db-action:hover .db-action-icon{transform:scale(1.1) rotate(-5deg)}
        .db-action-label{font-size:13.5px;font-weight:700;color:var(--db-dark)}.db-action-desc{font-size:11.5px;font-weight:400;color:#9a8a7a}
        .db-alert{display:flex;align-items:flex-start;gap:10px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:11px 14px;font-size:13px;color:var(--db-danger);margin:0 20px 16px}
        .db-payment-card{background:#fff;border:1px solid rgba(5,0,8,0.08);border-radius:var(--db-radius);box-shadow:0 10px 28px rgba(5,0,8,0.045);padding:18px 20px;margin:-4px 0 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
        .db-payment-icon{width:46px;height:46px;border-radius:12px;background:rgba(211,0,176,0.08);color:var(--db-magenta);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .db-payment-title{font-weight:850;color:var(--db-dark);margin:0 0 3px}
        .db-payment-sub{font-size:12.5px;color:#9a8a7a;margin:0;line-height:1.5}
        .db-payment-url{font-size:12px;color:#6b5f55;background:var(--db-light);border:1px solid rgba(5,0,8,0.07);border-radius:10px;padding:9px 12px;max-width:min(100%,420px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .gq-plus-banner{background:linear-gradient(135deg,#fff,#fff7df);border:1px solid rgba(255,200,87,0.36);border-radius:var(--db-radius);box-shadow:0 16px 38px rgba(5,0,8,0.07);padding:18px 20px;margin:-8px 0 24px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;position:relative;overflow:hidden}
        .gq-plus-banner::before{content:'';position:absolute;inset:0;background-image:radial-gradient(circle,rgba(211,0,176,0.07) 1px,transparent 1px);background-size:22px 22px;pointer-events:none}
        .gq-plus-left,.gq-plus-actions{position:relative;z-index:1}
        .gq-plus-left{display:flex;align-items:flex-start;gap:14px;min-width:260px;flex:1}
        .gq-plus-icon{width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,var(--db-magenta),#7c3aed);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 24px rgba(124,58,237,0.18);flex-shrink:0}
        .gq-plus-eyebrow{font-size:11px;font-weight:800;letter-spacing:0;text-transform:uppercase;color:rgb(180,83,9);margin-bottom:3px}
        .gq-plus-title{font-family:'Playfair Display',serif;font-size:22px;font-weight:900;color:var(--db-dark);margin:0}
        .gq-plus-title em{color:var(--db-magenta);font-style:italic}
        .gq-plus-sub{font-size:12.5px;color:#7a6a5a;line-height:1.55;margin:5px 0 0;max-width:760px}
        .gq-plus-tags{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
        .gq-plus-tag{font-size:11px;font-weight:650;color:#5f4b10;background:rgba(255,200,87,0.22);border:1px solid rgba(255,200,87,0.28);border-radius:999px;padding:5px 9px}
        .gq-plus-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .gq-plus-current{font-size:11.5px;color:#7a6a5a;background:#fff;border:1px solid rgba(5,0,8,0.08);border-radius:999px;padding:7px 10px}
        @media(max-width:575.98px){.gq-plus-banner{padding:16px}.gq-plus-left{min-width:0}.gq-plus-title{font-size:19px}.gq-plus-actions{width:100%}.gq-plus-actions .db-btn-gold,.gq-plus-actions .db-btn-outline{width:100%;justify-content:center}}
        .rrq-panel{background:#fff;border:1px solid rgba(5,0,8,0.08);border-radius:var(--db-radius);box-shadow:0 14px 34px rgba(5,0,8,0.055);margin:-6px 0 24px;overflow:hidden}
        .rrq-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:20px 22px;border-bottom:1px solid rgba(5,0,8,0.06);flex-wrap:wrap}
        .rrq-title-wrap{display:flex;align-items:center;gap:12px;min-width:260px}
        .rrq-icon{width:42px;height:42px;border-radius:12px;background:rgba(211,0,176,0.08);color:var(--db-magenta);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0}
        .rrq-title{font-family:'Playfair Display',serif;font-size:18px;font-weight:900;color:var(--db-dark);margin:0 0 3px}
        .rrq-sub{font-size:12.5px;color:#9a8a7a;margin:0;line-height:1.45}
        .rrq-head-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .rrq-count{font-size:11.5px;font-weight:750;color:rgb(146,64,14);background:rgba(255,200,87,0.18);border:1px solid rgba(255,200,87,0.28);border-radius:999px;padding:7px 10px}
        .rrq-body{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;padding:16px}
        @media(max-width:1199.98px){.rrq-body{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:767.98px){.rrq-body{grid-template-columns:1fr}.rrq-head{align-items:flex-start}.rrq-head-actions{width:100%;justify-content:space-between}.rrq-title-wrap{min-width:0}}
        .rrq-card{border:1px solid rgba(5,0,8,0.08);border-radius:12px;background:linear-gradient(180deg,#fff,#fffcf7);padding:15px;min-width:0;display:flex;flex-direction:column;gap:10px}
        .rrq-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
        .rrq-class{font-size:14px;font-weight:850;color:var(--db-dark);line-height:1.25}
        .rrq-meta{font-size:11.5px;color:#9a8a7a;margin-top:3px;line-height:1.4}
        .rrq-badge{font-size:10.5px;font-weight:850;letter-spacing:.04em;text-transform:uppercase;border-radius:999px;padding:5px 8px;white-space:nowrap}
        .rrq-badge--draft{background:#f1f5f9;color:#475569}.rrq-badge--computed{background:rgba(59,130,246,0.10);color:#1d4ed8}.rrq-badge--approved{background:rgba(245,158,11,0.13);color:#92400e}.rrq-badge--published{background:rgba(34,197,94,0.12);color:#15803d}
        .rrq-status-text{font-size:12.5px;color:#6b5f55;line-height:1.55;margin:0;min-height:38px}
        .rrq-progress-row{display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:#7a6a5a;font-weight:650}
        .rrq-track{height:8px;border-radius:999px;background:#f0ebe3;overflow:hidden}.rrq-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--db-magenta),var(--db-accent));transition:width .35s ease}
        .rrq-notes{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:24px}
        .rrq-notes span{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:#7a6a5a;background:var(--db-light);border:1px solid rgba(5,0,8,0.06);border-radius:999px;padding:5px 8px}
        .rrq-notes .rrq-note-danger{color:#b91c1c;background:rgba(239,68,68,0.06);border-color:rgba(239,68,68,0.16)}
        .rrq-notes .rrq-note-good{color:#15803d;background:rgba(34,197,94,0.08);border-color:rgba(34,197,94,0.16)}
        .rrq-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:auto}
        .rrq-btn{border:none;border-radius:8px;padding:8px 11px;font-size:12px;font-weight:750;cursor:pointer;transition:transform .18s,background .18s,color .18s;border:1px solid transparent}
        .rrq-btn:hover:not(:disabled){transform:translateY(-1px)}.rrq-btn:disabled{opacity:.55;cursor:not-allowed}
        .rrq-btn-light{background:#fff;color:#5f5147;border-color:rgba(5,0,8,0.10)}.rrq-btn-dark{background:var(--db-dark);color:#fff}.rrq-btn-gold{background:var(--db-accent);color:var(--db-dark)}
        .rrq-empty{grid-column:1/-1;display:flex;align-items:center;gap:12px;border:1px dashed rgba(5,0,8,0.12);border-radius:12px;padding:22px;color:#8c7f8f;background:var(--db-light)}
        .rrq-empty i{font-size:26px;color:var(--db-success)}.rrq-empty p{font-weight:850;color:var(--db-dark);margin:0 0 3px}.rrq-empty span{font-size:12.5px}
        .rrq-error{display:flex;align-items:center;gap:8px;margin:14px 16px 0;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.16);color:#b91c1c;border-radius:10px;padding:10px 12px;font-size:12.5px}
        .rrq-spin{animation:dbSpin .8s linear infinite}
        .db-skeleton{height:14px;border-radius:7px;background:linear-gradient(90deg,#f0ebe3 25%,#e8e0d5 50%,#f0ebe3 75%);background-size:200% 100%;animation:dbSkeleton 1.4s ease infinite}
        @keyframes dbSkeleton{from{background-position:200% 0}to{background-position:-200% 0}}
        @keyframes dbSpin{to{transform:rotate(360deg)}}
        .rm-skel{display:block;border-radius:6px;background:linear-gradient(90deg,#f0ebe3 25%,#e8e0d5 50%,#f0ebe3 75%);background-size:200% 100%;animation:dbSkeleton 1.4s ease infinite}
        .rm-skel--title{height:14px;width:55%}.rm-skel--sub{height:11px;width:70%}
        /* â•â•â• ACADEMIC ALERTS â•â•â• */
        .aa-wrap{display:grid;grid-template-columns:1fr 300px;gap:20px;margin-bottom:24px;align-items:start}
        @media(max-width:991.98px){.aa-wrap{grid-template-columns:1fr}}
        .aa-panel{background:#fff;border:1px solid var(--db-border);border-radius:var(--db-radius);overflow:hidden}
        .aa-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:20px 22px 16px;border-bottom:1px solid rgba(0,0,0,0.06)}
        .aa-head-left{display:flex;align-items:center;gap:12px}
        .aa-head-icon{width:40px;height:40px;border-radius:11px;background:rgba(239,68,68,0.08);color:rgb(220,38,38);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .aa-title{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:var(--db-dark);margin:0 0 3px}
        .aa-sub{font-size:12px;font-weight:300;color:#9a8a7a;margin:0}
        .aa-filters{display:flex;align-items:center;gap:4px;padding:12px 18px;border-bottom:1px solid rgba(0,0,0,0.05);overflow-x:auto}
        .aa-filter-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;font-size:12.5px;font-weight:400;color:#9a8a7a;background:transparent;border:1px solid transparent;border-radius:8px;cursor:pointer;white-space:nowrap;transition:background .15s,color .15s,border-color .15s}
        .aa-filter-btn:hover{background:var(--db-light);color:var(--db-dark)}
        .aa-filter-btn--active{background:var(--db-dark)!important;color:#fff!important;border-color:var(--db-dark)!important}
        .aa-filter-btn--active[data-sev="high"]{background:rgba(239,68,68,0.10)!important;color:#dc2626!important;border-color:rgba(239,68,68,0.20)!important}
        .aa-filter-btn--active[data-sev="medium"]{background:rgba(245,158,11,0.10)!important;color:rgb(146,64,14)!important;border-color:rgba(245,158,11,0.22)!important}
        .aa-filter-btn--active[data-sev="low"]{background:rgba(59,130,246,0.10)!important;color:rgb(29,78,216)!important;border-color:rgba(59,130,246,0.20)!important}
        .aa-filter-count{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;font-size:10.5px;font-weight:700;background:rgba(0,0,0,0.07);color:inherit;border-radius:999px}
        .aa-error-bar{display:flex;align-items:center;gap:10px;margin:0 18px 4px;padding:10px 14px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.18);border-radius:8px;font-size:13px;color:rgb(220,38,38)}
        .aa-list{display:flex;flex-direction:column;padding:14px 18px 18px;gap:10px}
        .aa-item{display:flex;gap:0;border:1px solid var(--ai-border);background:var(--ai-bg);border-radius:12px;overflow:hidden;animation:aaItemIn .35s ease both;transition:box-shadow .2s}
        .aa-item:hover{box-shadow:0 3px 14px rgba(0,0,0,0.06)}
        @keyframes aaItemIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        .aa-item-bar{width:4px;flex-shrink:0;background:var(--ai-bar)}
        .aa-item-body{padding:13px 14px;flex:1;min-width:0}
        .aa-item-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px}
        .aa-item-left{display:flex;align-items:flex-start;gap:10px;min-width:0}
        .aa-item-icon{width:30px;height:30px;border-radius:8px;background:var(--ai-pill);color:var(--ai-color);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
        .aa-item-title{font-size:13.5px;font-weight:600;color:var(--db-dark);margin:0 0 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .aa-item-meta{font-size:11.5px;color:#9a8a7a;margin:0}
        .aa-item-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0}
        .aa-sev-badge{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 9px;border-radius:999px;color:var(--ai-color);background:var(--ai-pill)}
        .aa-time{font-size:10.5px;color:#b5a090}
        .aa-item-msg{font-size:12.5px;line-height:1.6;color:#6b5f55;margin:0}
        .aa-skeleton-item{border:1px solid var(--db-border);border-radius:12px;padding:14px}
        .aa-empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:40px 24px;text-align:center;color:#b5a090;font-size:13px}
        .aa-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;border-top:1px solid rgba(0,0,0,0.06);background:rgba(0,0,0,0.015)}
        .aa-footer-count{font-size:12px;color:#9a8a7a}
        .aa-view-all-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;font-size:12.5px;font-weight:500;color:var(--db-dark);background:var(--db-accent);border:none;border-radius:8px;cursor:pointer;transition:background .2s,transform .2s}
        .aa-view-all-btn:hover{background:#ffe0a0;transform:translateY(-1px)}
        .aa-scorecard{background:#fff;border:1px solid var(--db-border);border-radius:var(--db-radius);padding:22px 20px;display:flex;flex-direction:column;gap:18px}
        .aa-scorecard-title{font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:var(--db-dark);margin:0}
        .aa-scorecard-hero{text-align:center;padding:18px 0;background:rgba(0,0,0,0.02);border:1px solid rgba(0,0,0,0.05);border-radius:12px}
        .aa-scorecard-big{font-family:'Playfair Display',serif;font-size:52px;font-weight:900;color:var(--db-dark);line-height:1}
        .aa-scorecard-big-label{font-size:12px;font-weight:300;color:#9a8a7a;margin-top:4px}
        .aa-breakdown{display:flex;flex-direction:column;gap:14px}
        .aa-breakdown-label-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
        .aa-breakdown-label{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:400;color:#7a6a5a}
        .aa-breakdown-dot{width:8px;height:8px;border-radius:50%}
        .aa-breakdown-count{font-size:13px;font-weight:600;color:var(--db-dark)}
        .aa-breakdown-track{height:8px;border-radius:999px;overflow:hidden}
        .aa-breakdown-fill{height:100%;border-radius:999px;transition:width .6s cubic-bezier(.34,1.2,.64,1)}
        .aa-scorecard-divider{height:1px;background:rgba(0,0,0,0.06);margin:0 -4px}
        .aa-tip-box{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.14);border-radius:9px;font-size:12px;line-height:1.6;color:rgb(185,28,28)}
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}/>
      <PageTitle title="Dashboard"/>

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}/>
          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loading&&<Loader message="Loading dashboardâ€¦"/>}

            {/* Hero */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true"/>
              <div className="db-hero-glow2" aria-hidden="true"/>
              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge"><span className="db-session-dot"/>{academicSession||"Loadingâ€¦"} â€” {currentTerm||"â€¦"}</div>
                  <h1 className="db-greeting">{getGreeting()}, <em>Admin.</em></h1>
                  <p className="db-hero-sub">Here's an overview of your school's performance and activity this term.</p>
                  <div className="d-flex flex-wrap gap-2">
                    <button className="db-btn-gold" onClick={()=>navigate("/results/pins")}><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="7" width="12" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 7V5.5a3 3 0 016 0V7" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="10.5" r="1" fill="currentColor"/></svg>Generate PINs</button>
                    <button className="db-btn-outline"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1v9M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>Export Report</button>
                    <button className="db-btn-outline" onClick={()=>navigate("/admin/result-monitoring")}><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 12V8M5 12V5M8 12V7M11 12V3M14 12V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Result Monitoring</button>
                  </div>
                </div>
                <div className="db-hero-stat-card d-none d-md-block">
                  <div className="d-flex align-items-center justify-content-between mb-3"><span style={{fontSize:11,fontWeight:500,letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--db-accent)"}}>Quick glance</span><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 10V6M5 10V4M8 10V7M11 10V3" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"/></svg></div>
                  <div className="d-flex flex-column gap-3">
                    <div className="db-hero-stat-item"><span className="db-hero-stat-label">Total users</span><span className="db-hero-stat-val">{totalUsers}</span></div>
                    <div className="db-hero-stat-sep"/>
                    <div className="db-hero-stat-item"><span className="db-hero-stat-label">Open alerts</span><span className="db-hero-stat-val">{alertCounts.open_total}</span></div>
                    <div className="db-hero-stat-sep"/>
                    <div className="db-hero-stat-item"><span className="db-hero-stat-label">Open submissions</span><span className="db-hero-stat-val">{alertCounts.submission_open_total}</span></div>
                    <div className="db-hero-stat-sep"/>
                    <div className="db-hero-stat-item"><span className="db-hero-stat-label">Overdue</span><span className="db-hero-stat-val">{alertCounts.submission_overdue_total}</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* â”€â”€ Academic Alerts â”€â”€ */}
            <div className="gq-plus-banner">
              <div className="gq-plus-left">
                <div className="gq-plus-icon">
                  <i className="bi bi-stars fs-4" />
                </div>
                <div>
                  <div className="gq-plus-eyebrow">Premium upgrade</div>
                  <h2 className="gq-plus-title">Unlock <em>GradeQuestPlus</em></h2>
                  <p className="gq-plus-sub">
                    Upgrade for premium tools like WhatsApp notifications, CBT, AI student insights,
                    custom domains, and advanced reports.
                  </p>
                  <div className="gq-plus-tags">
                    <span className="gq-plus-tag">WhatsApp</span>
                    <span className="gq-plus-tag">CBT</span>
                    <span className="gq-plus-tag">AI insights</span>
                    <span className="gq-plus-tag">Advanced reports</span>
                  </div>
                </div>
              </div>
              <div className="gq-plus-actions">
                <span className="gq-plus-current">Current package: {currentPackage}</span>
                <button className="db-btn-gold" onClick={()=>navigate("/checkout?plan=GradeQuestPlus")}>
                  <i className="bi bi-arrow-up-circle" />
                  Upgrade
                </button>
                <button className="db-btn-outline" style={{color:"var(--db-dark)",borderColor:"rgba(5,0,8,0.12)"}} onClick={()=>navigate("/billing")}>
                  View Billing
                </button>
              </div>
            </div>

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

            <AcademicAlertSection alerts={alerts} loading={alertsLoading&&alerts.length===0} error={alertsError} counts={{open_total:alertCounts.open_total,high:alertCounts.high,medium:alertCounts.medium,low:alertCounts.low}} onRefresh={fetchAlerts} alertsLoading={alertsLoading} onViewAll={()=>navigate("/admin/academic-alerts")}/>

            {/* Stats */}
            <div className="db-stats">
              {stats.map(({title,value},i)=>{
                const m=STAT_META[i];
                const icons=[
                  <svg key="s" width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2 18c0-3.314 2.686-6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="15" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M11 18c0-2.209 1.791-4 4-4s4 1.791 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
                  <svg key="t" width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5"/><path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M14 5l1.5 1.5L18 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                  <svg key="p" width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2 17c0-3.314 2.686-5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M12 13l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="15" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.3"/></svg>,
                  <svg key="r" width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 12V7M7 12V4M11 12V8M15 12V3M19 12V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="3" cy="14" r="1.5" fill="currentColor"/><circle cx="7" cy="14" r="1.5" fill="currentColor"/><circle cx="11" cy="14" r="1.5" fill="currentColor"/><circle cx="15" cy="14" r="1.5" fill="currentColor"/></svg>,
                ];
                return (
                  <div className="db-stat" key={title} style={{"--sc":m.color,"--si":m.bg} as React.CSSProperties}>
                    <div className="db-stat-head"><div className="db-stat-icon">{icons[i]}</div><svg className="db-stat-more" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="8" r="1.2" fill="currentColor"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="12" cy="8" r="1.2" fill="currentColor"/></svg></div>
                    <p className="db-stat-label">{title}</p>
                    <div className="db-stat-val">{value}</div>
                    <div className="db-stat-footer"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 9l3-4 2 2 3-5" stroke="var(--db-success)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg><span className="db-stat-trend">+8.5%</span><span>{m.label}</span></div>
                  </div>
                );
              })}
            </div>

            <div className="db-payment-card">
              <div className="d-flex align-items-start gap-3">
                <div className="db-payment-icon"><i className="bi bi-credit-card-2-front fs-5" /></div>
                <div>
                  <p className="db-payment-title">Parent school-fee payment link</p>
                  <p className="db-payment-sub">Send this public link to parents. They can enter school code, admission number, and amount without logging in.</p>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <div className="db-payment-url">{paymentLink}</div>
                <button className="db-btn-gold" onClick={copyPaymentLink}>{paymentLinkCopied ? "Copied" : "Copy Link"}</button>
                <button className="db-btn-outline" style={{color:"var(--db-dark)",borderColor:"rgba(5,0,8,0.12)"}} onClick={()=>window.open(paymentLink,"_blank")}>Open</button>
              </div>
            </div>

            {/* Chart + table */}
            <div className="db-grid">
              <div className="db-panel">
                <div className="db-panel-head">
                  <div className="d-flex align-items-center gap-3">
                    <div className="db-panel-icon" style={{"--pi":"var(--db-accent-dim)","--pc":"rgb(180,83,9)"} as React.CSSProperties}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.6 4H14L10.8 8.4l1.2 3.6L8 9.8 4 12l1.2-3.6L2 6h4.4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg></div>
                    <div><p className="db-panel-title">Top Performing Students</p><p className="db-panel-sub">{topMeta?`${topMeta.term_used} Â· ${topMeta.session_used}`:"Current term & session"}</p></div>
                  </div>
                  <button className="db-refresh-btn" onClick={()=>fetchTop(topPage)} disabled={topLoading}><svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{animation:topLoading?"dbSpin 0.8s linear infinite":"none"}}><path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>{topLoading?"Loadingâ€¦":"Refresh"}</button>
                </div>
                {topError&&<div className="db-alert"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3"/><path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>{topError}</div>}
                <div className="overflow-auto">
                  <table className="db-table">
                    <thead><tr><th>#</th><th>Adm. No</th><th>Student</th><th>Class</th><th>Avg Score</th></tr></thead>
                    <tbody>
                      {topLoading?(Array.from({length:5}).map((_,i)=>(<tr key={i}>{Array.from({length:5}).map((__,j)=>(<td key={j}><div className="db-skeleton" style={{width:j===2?120:j===4?60:80}}/></td>))}</tr>)))
                       :topStudents.length===0?(<tr><td colSpan={5} className="db-table-empty">No data found for the current term/session.</td></tr>)
                       :(topStudents.map((s,idx)=>{const rank=(topPage-1)*topLimit+idx+1;const rc=rank===1?"db-rank--gold":rank===2?"db-rank--silver":rank===3?"db-rank--bronze":"";return(<tr key={`${s.admission_no}-${idx}`}><td><span className={`db-rank ${rc}`}>{rank}</span></td><td style={{color:"#9a8a7a",fontSize:12.5}}>{s.admission_no}</td><td className="db-student-name">{s.name}</td><td style={{fontSize:13}}>{s.class}</td><td><span className="db-score-pill">{Number.isFinite(s.score)?s.score.toFixed(1):s.score}</span></td></tr>);}))}
                    </tbody>
                  </table>
                </div>
                <div className="db-pagination">
                  <span className="db-page-info">{topMeta?`${topMeta.total} students total`:""}</span>
                  <div className="d-flex align-items-center gap-2">
                    <button className="db-page-btn" onClick={()=>setTopPage(p=>Math.max(1,p-1))} disabled={topPage<=1||topLoading}><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Prev</button>
                    <span className="db-page-current">Page {topPage} of {totalPages}</span>
                    <button className="db-page-btn" onClick={()=>setTopPage(p=>Math.min(totalPages,p+1))} disabled={topPage>=totalPages||topLoading}>Next<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                  </div>
                </div>
              </div>

              <div className="db-panel" style={{display:"flex",flexDirection:"column"}}>
                <div className="db-panel-head">
                  <div className="d-flex align-items-center gap-3">
                    <div className="db-panel-icon" style={{"--pi":"rgba(59,130,246,0.10)","--pc":"rgb(59,130,246)"} as React.CSSProperties}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 12V8M5 12V5M8 12V7M11 12V3M14 12V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></div>
                    <div><p className="db-panel-title">Performance</p><p className="db-panel-sub">Average score by term</p></div>
                  </div>
                </div>
                <div className="db-chart-wrap" style={{flex:1}}><canvas ref={chartRef}/></div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="db-actions">
              {QUICK_ACTIONS.map(a=>(
                <a key={a.label} href={a.path} className="db-action" style={{"--ac-color":a.color,"--ac-bg":a.bg,"--ac-border":"var(--db-accent-border)"} as React.CSSProperties} onClick={e=>{e.preventDefault();navigate(a.path);}}>
                  <div className="db-action-icon">{a.icon}</div>
                  <div><div className="db-action-label">{a.label}</div><div className="db-action-desc">{a.desc}</div></div>
                </a>
              ))}
            </div>

            <Footer/>
          </main>
        </div>
      </div>
    </>
  );
}
