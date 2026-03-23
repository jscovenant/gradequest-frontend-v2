import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { authApi } from "../../utils/axios";
import TopNav from "../LayoutComponents/TopNav";
import Sidebar from "../LayoutComponents/Sidebar";
import Footer from "../LayoutComponents/Footer";
import Loader from "../ui/dashboardLoader";
import { useNavigate } from "react-router-dom";
import PageTitle from "../PageTitle";

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
  data: AlertItem[]; submission_monitors: SubmissionMonitor[];
  counts: { open_total: number; high: number; medium: number; low: number; submission_open_total: number; submission_overdue_total: number };
};

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

function getMonitorConfig(status: SubmissionMonitor["status"]) {
  if (status==="overdue") return { color:"rgb(239,68,68)", bg:"rgba(239,68,68,0.06)", border:"rgba(239,68,68,0.14)", barTrack:"rgba(239,68,68,0.12)", barFill:"#ef4444", label:"Overdue", labelColor:"#dc2626", labelBg:"rgba(239,68,68,0.10)" };
  if (status==="partial") return { color:"rgb(245,158,11)", bg:"rgba(245,158,11,0.06)", border:"rgba(245,158,11,0.16)", barTrack:"rgba(245,158,11,0.12)", barFill:"#f59e0b", label:"Partial", labelColor:"rgb(146,64,14)", labelBg:"rgba(245,158,11,0.12)" };
  if (status==="complete") return { color:"rgb(34,197,94)", bg:"rgba(34,197,94,0.06)", border:"rgba(34,197,94,0.14)", barTrack:"rgba(34,197,94,0.12)", barFill:"#22c55e", label:"Complete", labelColor:"rgb(21,128,61)", labelBg:"rgba(34,197,94,0.10)" };
  return { color:"rgb(59,130,246)", bg:"rgba(59,130,246,0.06)", border:"rgba(59,130,246,0.14)", barTrack:"rgba(59,130,246,0.12)", barFill:"#3b82f6", label:"Pending", labelColor:"rgb(29,78,216)", labelBg:"rgba(59,130,246,0.10)" };
}

function formatAlertMeta(a: AlertItem) { return [a.class_name,a.subject_name,a.student_name].filter(Boolean).join(" · ") || "Academic monitoring"; }
function formatRelativeTime(d?: string|null): string { if(!d)return""; const diff=Date.now()-new Date(d).getTime(); const m=Math.floor(diff/60000); if(m<1)return"just now"; if(m<60)return`${m}m ago`; const h=Math.floor(m/60); if(h<24)return`${h}h ago`; return`${Math.floor(h/24)}d ago`; }

/* ─── ResultMonitoringSection ─── */
function ResultMonitoringSection({ monitors, loading, onRefresh, alertsLoading }: {
  monitors: SubmissionMonitor[]; loading: boolean;
  onRefresh: ()=>void; alertsLoading: boolean;
}) {
  const overdue  = monitors.filter(m=>m.status==="overdue").length;
  const partial  = monitors.filter(m=>m.status==="partial").length;
  const complete = monitors.filter(m=>m.status==="complete").length;
  const pending  = monitors.filter(m=>m.status==="pending").length;

  return (
    <div className="rm-panel">
      <div className="rm-head">
        <div className="rm-head-left">
          <div className="rm-head-iconbox">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M4 16V11M7 16V7M10 16V9M13 16V5M16 16V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <circle cx="4" cy="9" r="1.5" fill="currentColor"/><circle cx="7" cy="5.5" r="1.5" fill="currentColor"/>
              <circle cx="10" cy="7.5" r="1.5" fill="currentColor"/><circle cx="13" cy="3.5" r="1.5" fill="currentColor"/>
            </svg>
          </div>
          <div>
            <h3 className="rm-head-title">Result Submission Monitoring</h3>
            <p className="rm-head-sub">Live upload status across all classes this term</p>
          </div>
        </div>
        <div className="rm-head-right">
          {!loading && (
            <div className="rm-summary-pills">
              {overdue>0  && <span className="rm-spill rm-spill--danger"><span className="rm-spill-dot" style={{background:"#ef4444"}}/>{overdue} overdue</span>}
              {partial>0  && <span className="rm-spill rm-spill--warn"><span className="rm-spill-dot" style={{background:"#f59e0b"}}/>{partial} partial</span>}
              {pending>0  && <span className="rm-spill rm-spill--info"><span className="rm-spill-dot" style={{background:"#3b82f6"}}/>{pending} pending</span>}
              {complete>0 && <span className="rm-spill rm-spill--ok"><span className="rm-spill-dot" style={{background:"#22c55e"}}/>{complete} complete</span>}
            </div>
          )}
          <button className="rm-refresh-btn" onClick={onRefresh} disabled={alertsLoading}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{animation:alertsLoading?"dbSpin 0.8s linear infinite":"none"}}>
              <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {alertsLoading?"Loading…":"Refresh"}
          </button>
        </div>
      </div>

      <div className="rm-body">
        {loading ? (
          <div className="rm-grid">
            {[0,1,2,3,4,5].map(i=>(
              <div key={i} className="rm-skeleton-card">
                <div className="rm-skel rm-skel--title mb-2"/><div className="rm-skel rm-skel--sub mb-3"/>
                <div className="rm-skel rm-skel--bar mb-2"/>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <div className="rm-skel" style={{width:50,height:10,borderRadius:4}}/><div className="rm-skel" style={{width:40,height:10,borderRadius:4}}/>
                </div>
              </div>
            ))}
          </div>
        ) : monitors.length === 0 ? (
          <div className="rm-empty">
            <div className="rm-empty-icon">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5"/><path d="M10 16l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <p className="rm-empty-title">All caught up!</p>
            <p className="rm-empty-sub">No incomplete result submissions right now.</p>
          </div>
        ) : (
          <div className="rm-grid">
            {monitors.map((m,idx)=>{
              const cfg = getMonitorConfig(m.status);
              const pct = m.expected_students_count>0 ? Math.round((m.completed_students_count/m.expected_students_count)*100) : 0;
              return (
                <div key={m.id} className="rm-card" style={{"--rmc-bg":cfg.bg,"--rmc-border":cfg.border,"--rmc-color":cfg.color,"--rmc-bar":cfg.barFill,"--rmc-track":cfg.barTrack,animationDelay:`${idx*60}ms`} as React.CSSProperties}>
                  <div className="rm-card-top">
                    <div className="rm-card-info">
                      <p className="rm-card-class">{m.class_name}</p>
                      {m.teacher_name&&<p className="rm-card-teacher"><svg width="10" height="10" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 11c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>{m.teacher_name}</p>}
                    </div>
                    <span className="rm-status-badge" style={{color:cfg.labelColor,background:cfg.labelBg}}>{cfg.label}</span>
                  </div>
                  <div className="rm-bar-wrap">
                    <div className="rm-bar-track"><div className="rm-bar-fill" style={{width:`${pct}%`,background:cfg.barFill}}/></div>
                    <div className="rm-bar-labels"><span className="rm-bar-pct">{pct}%</span><span className="rm-bar-count">{m.completed_students_count}/{m.expected_students_count} students</span></div>
                  </div>
                  <div className="rm-card-footer">
                    {m.submission_deadline&&<span className="rm-meta-chip rm-meta-chip--deadline"><svg width="10" height="10" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/><path d="M6 3v3l2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>{m.submission_deadline}</span>}
                    {m.pending_students_count>0&&<span className="rm-meta-chip rm-meta-chip--pending"><svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 2v4l3 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.1"/></svg>{m.pending_students_count} pending</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── AcademicAlertSection ─── */
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
            {alertsLoading?"Loading…":"Refresh"}
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

/* ─── Main ─── */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [academicSession,setAcademicSession]=useState("");
  const [currentTerm,setCurrentTerm]=useState("");
  const [loading,setLoading]=useState(true);
  const [totalUsers,setTotalUsers]=useState(0);
  const [stats,setStats]=useState<StatCard[]>([{title:"Total Students",value:0,icon:"students"},{title:"Teachers",value:0,icon:"teachers"},{title:"Total Parents",value:0,icon:"parents"},{title:"Results Uploaded",value:"0%",icon:"results"}]);
  const [alerts,setAlerts]=useState<AlertItem[]>([]);
  const [submissionMonitors,setSubmissionMonitors]=useState<SubmissionMonitor[]>([]);
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
  const topLimit=5;
  const totalPages=useMemo(()=>!topMeta?1:Math.max(1,Math.ceil(topMeta.total/topLimit)),[topMeta]);

  const fetchTop=async(page:number)=>{setTopLoading(true);setTopError(null);try{const res=await authApi.get<TopStudentsResponse>("/top-performing-students",{params:{limit:topLimit,page}});setTopStudents(res.data.data||[]);setTopMeta({total:res.data.total??0,session_used:res.data.session_used??"",term_used:res.data.term_used??""});}catch(e:any){setTopStudents([]);setTopMeta(null);setTopError(e?.response?.data?.message||"Unable to load top students.");}finally{setTopLoading(false);}};
  const fetchAlerts=async()=>{setAlertsLoading(true);setAlertsError(null);try{const res=await authApi.get<AlertSummaryResponse>("/admin/academic-alerts/summary");setAlerts(res.data.data||[]);setSubmissionMonitors(res.data.submission_monitors||[]);setAlertCounts(res.data.counts||{open_total:0,high:0,medium:0,low:0,submission_open_total:0,submission_overdue_total:0});}catch(e:any){setAlerts([]);setSubmissionMonitors([]);setAlertCounts({open_total:0,high:0,medium:0,low:0,submission_open_total:0,submission_overdue_total:0});setAlertsError(e?.response?.data?.message||"Unable to load academic alerts.");}finally{setAlertsLoading(false);}};

  useEffect(()=>{setLoading(true);Promise.all([authApi.get("/current-session-term"),authApi.get("/dashboard/counts"),authApi.get("/performance-stats"),authApi.get<AlertSummaryResponse>("/admin/academic-alerts/summary")]).then(([sess,counts,perf,alertRes])=>{setAcademicSession(sess.data.session??"");setCurrentTerm(sess.data.term??"");const c=counts.data??{};setTotalUsers(Number(c.total_users??(Number(c.students??0)+Number(c.teachers??0)+Number(c.parents??0))));setStats([{title:"Total Students",value:Number(c.students??0),icon:"students"},{title:"Teachers",value:Number(c.teachers??0),icon:"teachers"},{title:"Total Parents",value:Number(c.parents??0),icon:"parents"},{title:"Results Uploaded",value:c.results_uploaded??"0%",icon:"results"}]);const pts:PerformancePoint[]=perf.data.data||[];setPerfLabels(pts.map(d=>d.term));setPerfData(pts.map(d=>d.average));setAlerts(alertRes.data.data||[]);setSubmissionMonitors(alertRes.data.submission_monitors||[]);setAlertCounts(alertRes.data.counts||{open_total:0,high:0,medium:0,low:0,submission_open_total:0,submission_overdue_total:0});}).catch(e=>{console.error(e);setAlertsError("Some dashboard sections could not be loaded.");}).finally(()=>{setLoading(false);fetchTop(1);});},[]);
  useEffect(()=>{fetchTop(topPage);},[topPage]);
  useEffect(()=>{if(!chartRef.current)return;const ctx=chartRef.current.getContext("2d");if(!ctx)return;chartInst.current?.destroy();chartInst.current=new Chart(ctx,{type:"bar",data:{labels:perfLabels,datasets:[{label:"Average Score",data:perfData,backgroundColor:(context)=>{const g=context.chart.ctx.createLinearGradient(0,0,0,260);g.addColorStop(0,"rgba(255,200,87,0.88)");g.addColorStop(1,"rgba(255,200,87,0.20)");return g;},borderRadius:6,barThickness:32}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:"#050008",padding:12,cornerRadius:8,titleColor:"rgb(255,200,87)",bodyColor:"#94a3b8",titleFont:{size:13,weight:"bold" as const},bodyFont:{size:12}}},scales:{x:{grid:{display:false},ticks:{font:{size:11},color:"#9a8a7a"},border:{display:false}},y:{beginAtZero:true,grid:{color:"rgba(0,0,0,0.04)"},ticks:{font:{size:11},color:"#9a8a7a"},border:{display:false}}}}});return()=>{chartInst.current?.destroy();};},[perfLabels,perfData]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500&display=swap');
        :root{--db-light:var(--bs-light,#fcf8f8);--db-dark:var(--bs-dark,#050008);--db-accent:var(--bs-secondary,rgb(255,200,87));--db-magenta:var(--bs-primary,rgb(211,0,176));--db-success:var(--bs-success,rgb(34,197,94));--db-danger:var(--bs-danger,rgb(239,68,68));--db-border:var(--bs-border-color,#ede8e0);--db-radius:var(--bs-border-radius-lg,14px);--db-accent-dim:rgba(255,200,87,0.10);--db-accent-border:rgba(255,200,87,0.22);--db-magenta-dim:rgba(211,0,176,0.08)}
        .db-main{background:var(--db-light);min-height:100vh;font-family:'DM Sans',sans-serif;padding:28px 28px 0}
        .db-hero{background:var(--db-dark);border-radius:var(--db-radius);padding:32px 36px;position:relative;overflow:hidden;margin-bottom:28px}
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
        .db-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
        @media(max-width:1199.98px){.db-stats{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:575.98px){.db-stats{grid-template-columns:1fr}}
        .db-stat{background:#fff;border:1px solid var(--db-border);border-radius:var(--db-radius);padding:24px 22px;position:relative;overflow:hidden;cursor:default;transition:box-shadow .25s,transform .25s;animation:dbFadeUp .5s ease both}
        .db-stat:nth-child(1){animation-delay:.05s}.db-stat:nth-child(2){animation-delay:.10s}.db-stat:nth-child(3){animation-delay:.15s}.db-stat:nth-child(4){animation-delay:.20s}
        @keyframes dbFadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .db-stat:hover{box-shadow:0 8px 28px rgba(0,0,0,0.08);transform:translateY(-3px)}
        .db-stat::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--sc);transform:scaleX(0);transform-origin:left;transition:transform .3s ease}
        .db-stat:hover::before{transform:scaleX(1)}
        .db-stat-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px}
        .db-stat-icon{width:42px;height:42px;border-radius:10px;background:var(--si);color:var(--sc);display:flex;align-items:center;justify-content:center;transition:transform .3s cubic-bezier(.34,1.56,.64,1)}
        .db-stat:hover .db-stat-icon{transform:scale(1.1) rotate(-4deg)}
        .db-stat-more{color:#c8bfb5;cursor:pointer;padding:2px}
        .db-stat-label{font-size:12px;font-weight:400;color:#9a8a7a;margin-bottom:5px;letter-spacing:.03em}
        .db-stat-val{font-family:'Playfair Display',Georgia,serif;font-size:30px;font-weight:700;color:var(--db-dark);line-height:1}
        .db-stat-footer{display:flex;align-items:center;gap:5px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(0,0,0,0.06);font-size:12px;color:#9a8a7a}
        .db-stat-trend{color:var(--db-success);font-weight:500}
        .db-grid{display:grid;grid-template-columns:1fr 360px;gap:20px;margin-bottom:24px}
        @media(max-width:991.98px){.db-grid{grid-template-columns:1fr}}
        .db-panel{background:#fff;border:1px solid var(--db-border);border-radius:var(--db-radius);overflow:hidden}
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
        .db-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
        @media(max-width:991.98px){.db-actions{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:575.98px){.db-actions{grid-template-columns:1fr 1fr}}
        .db-action{background:#fff;border:1px solid var(--db-border);border-radius:var(--db-radius);padding:22px 18px;cursor:pointer;display:flex;flex-direction:column;gap:10px;transition:box-shadow .25s,transform .25s,border-color .25s;text-decoration:none;color:inherit}
        .db-action:hover{box-shadow:0 8px 24px rgba(0,0,0,0.08);transform:translateY(-4px);border-color:var(--db-accent-border)}
        .db-action-icon{width:46px;height:46px;border-radius:12px;background:var(--ac-bg);color:var(--ac-color);display:flex;align-items:center;justify-content:center;transition:transform .3s cubic-bezier(.34,1.56,.64,1)}
        .db-action:hover .db-action-icon{transform:scale(1.1) rotate(-5deg)}
        .db-action-label{font-size:13.5px;font-weight:500;color:var(--db-dark)}.db-action-desc{font-size:11.5px;font-weight:300;color:#9a8a7a}
        .db-alert{display:flex;align-items:flex-start;gap:10px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:11px 14px;font-size:13px;color:var(--db-danger);margin:0 20px 16px}
        .db-skeleton{height:14px;border-radius:7px;background:linear-gradient(90deg,#f0ebe3 25%,#e8e0d5 50%,#f0ebe3 75%);background-size:200% 100%;animation:dbSkeleton 1.4s ease infinite}
        @keyframes dbSkeleton{from{background-position:200% 0}to{background-position:-200% 0}}
        @keyframes dbSpin{to{transform:rotate(360deg)}}

        /* ═══ RESULT MONITORING ═══ */
        .rm-panel{background:#fff;border:1px solid var(--db-border);border-radius:var(--db-radius);overflow:hidden;margin-bottom:24px}
        .rm-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid rgba(0,0,0,0.06);gap:16px;flex-wrap:wrap}
        .rm-head-left{display:flex;align-items:center;gap:14px}
        .rm-head-iconbox{width:42px;height:42px;border-radius:11px;background:rgba(255,200,87,0.10);color:rgb(180,83,9);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .rm-head-title{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:var(--db-dark);margin:0 0 3px}
        .rm-head-sub{font-size:12px;font-weight:300;color:#9a8a7a;margin:0}
        .rm-head-right{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
        .rm-summary-pills{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .rm-spill{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:11.5px;font-weight:500}
        .rm-spill-dot{width:6px;height:6px;border-radius:50%}
        .rm-spill--danger{background:rgba(239,68,68,0.09);color:#dc2626;border:1px solid rgba(239,68,68,0.18)}
        .rm-spill--warn{background:rgba(245,158,11,0.09);color:rgb(146,64,14);border:1px solid rgba(245,158,11,0.18)}
        .rm-spill--info{background:rgba(59,130,246,0.09);color:rgb(29,78,216);border:1px solid rgba(59,130,246,0.18)}
        .rm-spill--ok{background:rgba(34,197,94,0.09);color:rgb(21,128,61);border:1px solid rgba(34,197,94,0.18)}
        .rm-body{padding:20px}
        .rm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
        .rm-card{background:var(--rmc-bg);border:1px solid var(--rmc-border);border-radius:12px;padding:16px;animation:rmCardIn .4s ease both;transition:box-shadow .2s,transform .2s}
        .rm-card:hover{box-shadow:0 4px 18px rgba(0,0,0,0.07);transform:translateY(-2px)}
        @keyframes rmCardIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .rm-card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:14px}
        .rm-card-info{}
        .rm-card-class{font-size:14px;font-weight:600;color:var(--db-dark);margin:0 0 4px}
        .rm-card-teacher{display:flex;align-items:center;gap:5px;font-size:11.5px;color:#9a8a7a;margin:0}
        .rm-status-badge{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 10px;border-radius:999px;white-space:nowrap;flex-shrink:0}
        .rm-bar-wrap{margin-bottom:12px}
        .rm-bar-track{height:6px;border-radius:999px;background:var(--rmc-track);overflow:hidden;margin-bottom:6px}
        .rm-bar-fill{height:100%;border-radius:999px;transition:width .6s cubic-bezier(.34,1.2,.64,1)}
        .rm-bar-labels{display:flex;justify-content:space-between;align-items:center}
        .rm-bar-pct{font-size:12px;font-weight:600;color:var(--rmc-color)}
        .rm-bar-count{font-size:11px;font-weight:300;color:#9a8a7a}
        .rm-card-footer{display:flex;flex-wrap:wrap;gap:6px;padding-top:10px;border-top:1px solid rgba(0,0,0,0.05)}
        .rm-meta-chip{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 8px;border-radius:6px}
        .rm-meta-chip--deadline{background:rgba(0,0,0,0.04);color:#7a6a5a}
        .rm-meta-chip--pending{background:rgba(245,158,11,0.08);color:rgb(146,64,14)}
        .rm-skeleton-card{background:rgba(0,0,0,0.02);border:1px solid var(--db-border);border-radius:12px;padding:16px}
        .rm-skel{display:block;border-radius:6px;background:linear-gradient(90deg,#f0ebe3 25%,#e8e0d5 50%,#f0ebe3 75%);background-size:200% 100%;animation:dbSkeleton 1.4s ease infinite}
        .rm-skel--title{height:14px;width:55%}.rm-skel--sub{height:11px;width:70%}.rm-skel--bar{height:6px;border-radius:999px}
        .rm-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 24px;text-align:center}
        .rm-empty-icon{width:56px;height:56px;border-radius:50%;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.18);display:flex;align-items:center;justify-content:center;color:rgb(34,197,94)}
        .rm-empty-title{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:var(--db-dark);margin:0}
        .rm-empty-sub{font-size:13px;color:#9a8a7a;margin:0}

        /* ═══ ACADEMIC ALERTS ═══ */
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
          <Sidebar sidebarOpen={sidebarOpen}/>
          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loading&&<Loader message="Loading dashboard…"/>}

            {/* Hero */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true"/>
              <div className="db-hero-glow2" aria-hidden="true"/>
              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge"><span className="db-session-dot"/>{academicSession||"Loading…"} — {currentTerm||"…"}</div>
                  <h1 className="db-greeting">{getGreeting()}, <em>Admin.</em></h1>
                  <p className="db-hero-sub">Here's an overview of your school's performance and activity this term.</p>
                  <div className="d-flex flex-wrap gap-2">
                    <button className="db-btn-gold" onClick={()=>navigate("/results/pins")}><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="7" width="12" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 7V5.5a3 3 0 016 0V7" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="10.5" r="1" fill="currentColor"/></svg>Generate PINs</button>
                    <button className="db-btn-outline"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1v9M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>Export Report</button>
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

            {/* ── UPGRADED: Result Submission Monitoring ── */}
            <ResultMonitoringSection monitors={submissionMonitors} loading={alertsLoading&&submissionMonitors.length===0} onRefresh={fetchAlerts} alertsLoading={alertsLoading}/>

            {/* ── UPGRADED: Academic Alerts ── */}
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

            {/* Chart + table */}
            <div className="db-grid">
              <div className="db-panel">
                <div className="db-panel-head">
                  <div className="d-flex align-items-center gap-3">
                    <div className="db-panel-icon" style={{"--pi":"var(--db-accent-dim)","--pc":"rgb(180,83,9)"} as React.CSSProperties}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.6 4H14L10.8 8.4l1.2 3.6L8 9.8 4 12l1.2-3.6L2 6h4.4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg></div>
                    <div><p className="db-panel-title">Top Performing Students</p><p className="db-panel-sub">{topMeta?`${topMeta.term_used} · ${topMeta.session_used}`:"Current term & session"}</p></div>
                  </div>
                  <button className="db-refresh-btn" onClick={()=>fetchTop(topPage)} disabled={topLoading}><svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{animation:topLoading?"dbSpin 0.8s linear infinite":"none"}}><path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>{topLoading?"Loading…":"Refresh"}</button>
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