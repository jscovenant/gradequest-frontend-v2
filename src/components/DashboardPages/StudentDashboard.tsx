import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
import { authApi } from "../../utils/axios";
import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import PageTitle from "../PageTitle";

type StudentInfo = {
  id: number;
  name: string;
  reg_no?: string;
  class?: string | null;
  photo?: string | null;
};

type CurrentResult = {
  school_id: number;
  student_id: number;
  class_id: number;
  class_name?: string | null;
  term: string;
  session: string;
  status: string;
  is_published: boolean;
  has_result: boolean;
  average?: string | number | null;
  grade?: string | null;
  position?: string | number | null;
  updated_at?: string | null;
};

type DashboardResponse = {
  student: StudentInfo;
  stats: {
    subjects: number;
    attendance_rate: number;
    fee_balance: number;
    unread_notifications: number;
    results_count: number;
    avg_score: number;
  };
  fees: {
    total_fees: number;
    total_paid: number;
    balance: number;
    last_payment_date?: string | null;
  };
  charts: {
    performance: { label: string; average: number }[];
    access: { labels: string[]; data: number[] };
  };
  next_class?: any;
  recent_notifications?: any[];
  current_result?: CurrentResult | null;
  latest_published_result?: CurrentResult | null;
};

const emptyDashboard: DashboardResponse = {
  student: { id: 0, name: "Student" },
  stats: { subjects: 0, attendance_rate: 0, fee_balance: 0, unread_notifications: 0, results_count: 0, avg_score: 0 },
  fees: { total_fees: 0, total_paid: 0, balance: 0 },
  charts: { performance: [], access: { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], data: [0, 0, 0, 0, 0, 0, 0] } },
  recent_notifications: [],
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function money(n?: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(n || 0));
}

function shortDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function resultLabel(result?: CurrentResult | null) {
  if (!result) return { label: "No current result", text: "The school has not prepared your current term result yet.", tone: "muted" };
  if (!result.has_result) return { label: "Not entered yet", text: "Your scores for this term have not been entered yet.", tone: "muted" };
  if (!result.is_published) return { label: "Waiting for release", text: "Your result has been prepared. It will show here after the school publishes it.", tone: "warning" };
  return { label: "Available now", text: "Your current term result has been published.", tone: "success" };
}

function canOpenResult(result?: CurrentResult | null) {
  return Boolean(result?.is_published && result?.has_result);
}

function parseNotification(n: any) {
  const data = typeof n?.data === "string" ? (() => {
    try { return JSON.parse(n.data); } catch { return {}; }
  })() : (n?.data || {});

  return {
    title: data.title || data.subject || n?.type?.split("\\").pop() || "Notification",
    body: data.message || data.body || "Open notifications to read more.",
  };
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [academicSession, setAcademicSession] = useState("");
  const [currentTerm, setCurrentTerm] = useState("");
  const [dashboard, setDashboard] = useState<DashboardResponse>(emptyDashboard);
  const performanceRef = useRef<HTMLCanvasElement | null>(null);
  const accessRef = useRef<HTMLCanvasElement | null>(null);
  const performanceChart = useRef<Chart | null>(null);
  const accessChart = useRef<Chart | null>(null);

  const openableResult = canOpenResult(dashboard.current_result)
    ? dashboard.current_result
    : dashboard.latest_published_result;
  const displayResult = canOpenResult(openableResult) ? openableResult : dashboard.current_result;
  const resultState = canOpenResult(dashboard.current_result)
    ? resultLabel(dashboard.current_result)
    : canOpenResult(dashboard.latest_published_result)
      ? {
          label: "Latest result available",
          text: `${dashboard.latest_published_result?.term || "Latest term"} - ${dashboard.latest_published_result?.session || "Academic session"} has been published. Your current term result is still waiting for release.`,
          tone: "success",
        }
      : resultLabel(dashboard.current_result);
  const feePaidPercent = dashboard.fees.total_fees > 0
    ? Math.min(100, Math.round((dashboard.fees.total_paid / dashboard.fees.total_fees) * 100))
    : 0;

  const latestAverage = useMemo(() => {
    const perf = dashboard.charts.performance || [];
    const last = perf.length ? perf[perf.length - 1]?.average : dashboard.stats.avg_score;
    return Number(last || 0).toFixed(1);
  }, [dashboard]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    Promise.allSettled([
      authApi.get("/current-session-term"),
      authApi.get<DashboardResponse>("/student/dashboard"),
    ]).then(([sessionRes, dashRes]) => {
      if (!mounted) return;

      if (sessionRes.status === "fulfilled") {
        setAcademicSession(sessionRes.value.data.session || "");
        setCurrentTerm(sessionRes.value.data.term || "");
      }

      if (dashRes.status === "fulfilled") {
        setDashboard({
          ...emptyDashboard,
          ...dashRes.value.data,
          charts: {
            performance: dashRes.value.data.charts?.performance || [],
            access: dashRes.value.data.charts?.access?.labels?.length
              ? dashRes.value.data.charts.access
              : emptyDashboard.charts.access,
          },
          recent_notifications: Array.isArray(dashRes.value.data.recent_notifications) ? dashRes.value.data.recent_notifications : [],
        });
      } else {
        setError(dashRes.reason?.response?.data?.message || "Unable to load your dashboard.");
      }
    }).finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!performanceRef.current || !accessRef.current) return;

    const performanceCtx = performanceRef.current.getContext("2d");
    const accessCtx = accessRef.current.getContext("2d");
    if (!performanceCtx || !accessCtx) return;

    performanceChart.current?.destroy();
    accessChart.current?.destroy();

    const perf = dashboard.charts.performance || [];
    performanceChart.current = new Chart(performanceCtx, {
      type: "bar",
      data: {
        labels: perf.map((p) => p.label),
        datasets: [{
          label: "Average",
          data: perf.map((p) => Number(p.average || 0)),
          backgroundColor: "rgba(211,0,176,0.82)",
          borderRadius: 7,
          barThickness: 34,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#8a7d72", font: { size: 11 } } },
          y: { beginAtZero: true, grid: { color: "rgba(5,0,8,0.06)" }, ticks: { color: "#8a7d72", font: { size: 11 } } },
        },
      },
    });

    accessChart.current = new Chart(accessCtx, {
      type: "line",
      data: {
        labels: dashboard.charts.access.labels,
        datasets: [{
          label: "Result views",
          data: dashboard.charts.access.data,
          borderColor: "rgb(255,200,87)",
          backgroundColor: "rgba(255,200,87,0.18)",
          pointBackgroundColor: "rgb(255,200,87)",
          pointBorderColor: "#fff",
          pointRadius: 4,
          tension: 0.38,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#8a7d72", font: { size: 11 } } },
          y: { beginAtZero: true, grid: { color: "rgba(5,0,8,0.06)" }, ticks: { color: "#8a7d72", font: { size: 11 }, precision: 0 } },
        },
      },
    });

    return () => {
      performanceChart.current?.destroy();
      accessChart.current?.destroy();
    };
  }, [dashboard.charts]);

  const openCurrentResult = () => {
    const result = openableResult;
    if (!canOpenResult(result)) return;

    navigate("/students/results/show", {
      state: {
        studentId: result.student_id,
        classId: result.class_id,
        term: result.term,
        session: result.session,
        schoolId: result.school_id,
      },
    });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        :root{
          --sd-bg: #F8FAFC;
          --sd-dark: #0F2744;
          --sd-primary: #0F2744;
          --sd-gold: #D97706;
          --sd-border: #E2E8F0;
          --sd-radius: 16px;
        }
        .sd-main{
          background: var(--sd-bg);
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: 24px 28px 0;
          overflow-x: hidden;
        }
        .sd-hero{
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: var(--sd-radius);
          padding: 32px;
          position: relative;
          overflow: hidden;
          color: #fff;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
          margin: 0 0 24px;
        }
        .sd-hero-inner{
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0,1fr) 280px;
          gap: 24px;
          align-items: center;
        }
        .sd-pill-row{
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .sd-pill{
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 999px;
          background: rgba(217, 119, 6, 0.2);
          border: 1px solid rgba(217, 119, 6, 0.35);
          font-size: 11.5px;
          font-weight: 700;
          color: #FBBF24;
        }
        .sd-title{
          font-size: clamp(22px,2.6vw,32px);
          font-weight: 800;
          margin: 0 0 8px;
        }
        .sd-title span{color: #FBBF24}
        .sd-sub{
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.6;
          max-width: 620px;
          margin: 0 0 20px;
        }
        .sd-actions{
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .sd-btn{
          border: 0;
          border-radius: 10px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .sd-btn-gold{
          background: #D97706;
          color: #FFFFFF;
        }
        .sd-btn-gold:hover{
          background: #B45309;
          transform: translateY(-1px);
        }
        .sd-btn-light{
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: #fff;
        }
        .sd-btn-light:hover{
          background: rgba(255,255,255,0.18);
        }
        .sd-profile-card{
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(8px);
          border-radius: 14px;
          padding: 20px;
        }
        .sd-profile-stat{
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .sd-profile-stat:last-child{border-bottom: 0}
        .sd-profile-label{font-size: 12px; color: #CBD5E1}
        .sd-profile-value{font-size: 15px; font-weight: 800; color: #FBBF24; text-align: right}
        .sd-grid{display: grid; grid-template-columns: 1.2fr .8fr; gap: 20px; margin-bottom: 24px}
        .sd-stats{display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 16px; margin-bottom: 24px}
        .sd-card{
          background: #fff;
          border: 1px solid var(--sd-border);
          border-radius: var(--sd-radius);
          box-shadow: 0 4px 16px rgba(15, 39, 68, 0.03);
          min-width: 0;
        }
        .sd-card-pad{padding: 22px 24px}
        .sd-stat{padding: 20px; transition: all 0.2s ease}
        .sd-stat:hover{transform: translateY(-2px); box-shadow: 0 8px 24px rgba(15, 39, 68, 0.06); border-color: #CBD5E1}
        .sd-stat-icon{width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; font-size: 18px}
        .sd-stat-label{font-size: 12.5px; font-weight: 600; color: #64748B; margin: 0 0 4px}
        .sd-stat-value{font-size: 24px; font-weight: 800; color: var(--sd-dark); margin: 0}
        .sd-stat-sub{font-size: 11.5px; color: #94A3B8; margin-top: 4px}
        .sd-card-head{display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px}
        .sd-card-title{font-size: 16px; font-weight: 800; color: var(--sd-dark); margin: 0}
        .sd-card-sub{font-size: 12px; color: #64748B; margin: 2px 0 0}
        .sd-result-card{display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 20px; align-items: center}
        .sd-result-badge{display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 700; margin-bottom: 8px}
        .sd-result-badge.success{color: #065F46; background: #D1FAE5}
        .sd-result-badge.warning{color: #92400E; background: #FEF3C7}
        .sd-result-badge.muted{color: #475569; background: #F1F5F9}
        .sd-result-title{font-size: 18px; font-weight: 800; color: var(--sd-dark); margin: 0 0 4px}
        .sd-result-text{font-size: 13px; color: #475569; line-height: 1.5; margin: 0}
        .sd-result-metrics{display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px}
        .sd-mini{background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 8px 14px; min-width: 90px}
        .sd-mini-label{font-size: 10.5px; font-weight: 600; color: #64748B}
        .sd-mini-value{font-size: 15px; font-weight: 800; color: var(--sd-dark)}
        .sd-chart{height: 260px}
        .sd-fee-track,.sd-att-track{height: 8px; border-radius: 999px; background: #F1F5F9; overflow: hidden}
        .sd-fee-fill,.sd-att-fill{height: 100%; border-radius: 999px; background: #D97706}
        .sd-list{display: flex; flex-direction: column; gap: 10px}
        .sd-note{padding: 12px 14px; border-radius: 10px; background: #F8FAFC; border: 1px solid #E2E8F0}
        .sd-note-title{font-size: 13px; font-weight: 700; color: var(--sd-dark); margin: 0 0 3px}
        .sd-note-body{font-size: 12px; color: #64748B; margin: 0; line-height: 1.5}
        .sd-empty{padding: 24px; border-radius: 12px; border: 1px dashed #CBD5E1; color: #64748B; background: #F8FAFC; font-size: 13px; text-align: center}
        .sd-error{background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; font-size: 13px}
        @media(max-width:1199.98px){.sd-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.sd-grid{grid-template-columns:1fr}.sd-hero-inner{grid-template-columns:1fr}}
        @media(max-width:575.98px){.sd-main{padding:18px 14px 0}.sd-stats{grid-template-columns:1fr}.sd-result-card{grid-template-columns:1fr}.sd-actions .sd-btn{width:100%;justify-content:center}.sd-profile-card{display:none}}
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Student Dashboard" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="col-md-9 col-lg-10 ms-auto sd-main">
            {loading && <Loader message="Loading student dashboard..." />}
            {error && <div className="sd-error"><i className="bi bi-exclamation-circle me-2" />{error}</div>}

            <section className="sd-hero">
              <div className="sd-hero-inner">
                <div>
                  <div className="sd-pill-row">
                    <span className="sd-pill"><i className="bi bi-calendar-check" />{academicSession || "Academic session"} • {currentTerm || "Current term"}</span>
                    {dashboard.student.class && <span className="sd-pill"><i className="bi bi-mortarboard" />{dashboard.student.class}</span>}
                    {dashboard.student.reg_no && <span className="sd-pill"><i className="bi bi-person-badge" />{dashboard.student.reg_no}</span>}
                  </div>
                  <h1 className="sd-title">{greeting()}, <span>{dashboard.student.name || "Student"}</span></h1>
                  <p className="sd-sub">Track your attendance, fees, notices and published results from one simple dashboard.</p>
                  <div className="sd-actions">
                    <button className="sd-btn sd-btn-gold" onClick={openCurrentResult} disabled={!canOpenResult(openableResult)}>
                      <i className="bi bi-journal-check" /> {canOpenResult(dashboard.current_result) ? "View Current Result" : "View Latest Result"}
                    </button>
                    <button className="sd-btn sd-btn-light" onClick={()=>navigate("/student/my-fees")}><i className="bi bi-wallet2" /> My Fees</button>
                    <button className="sd-btn sd-btn-light" onClick={()=>navigate("/notifications")}><i className="bi bi-bell" /> Notices</button>
                  </div>
                </div>
                <div className="sd-profile-card">
                  <div className="sd-profile-stat"><span className="sd-profile-label">Average score</span><span className="sd-profile-value">{latestAverage}%</span></div>
                  <div className="sd-profile-stat"><span className="sd-profile-label">Attendance</span><span className="sd-profile-value">{dashboard.stats.attendance_rate || 0}%</span></div>
                  <div className="sd-profile-stat"><span className="sd-profile-label">Fee balance</span><span className="sd-profile-value">{money(dashboard.fees.balance)}</span></div>
                </div>
              </div>
            </section>

            <section className="sd-card sd-card-pad mb-3">
              <div className="sd-result-card">
                <div>
                  <span className={`sd-result-badge ${resultState.tone}`}><i className="bi bi-circle-fill" style={{fontSize:7}} />{resultState.label}</span>
                  <h2 className="sd-result-title">{displayResult?.term || currentTerm || "Current Term"} Result</h2>
                  <p className="sd-result-text">{resultState.text}</p>
                  <div className="sd-result-metrics">
                    <div className="sd-mini"><div className="sd-mini-label">Average</div><div className="sd-mini-value">{displayResult?.average ?? "N/A"}</div></div>
                    <div className="sd-mini"><div className="sd-mini-label">Grade</div><div className="sd-mini-value">{displayResult?.grade ?? "N/A"}</div></div>
                    <div className="sd-mini"><div className="sd-mini-label">Position</div><div className="sd-mini-value">{displayResult?.position ?? "N/A"}</div></div>
                  </div>
                </div>
                <button className="sd-btn sd-btn-gold" onClick={openCurrentResult} disabled={!canOpenResult(openableResult)}>
                  <i className="bi bi-eye" /> {canOpenResult(dashboard.current_result) ? "Open Result" : "Open Latest Result"}
                </button>
              </div>
            </section>

            <section className="sd-stats">
              {[
                { label:"Subjects", value:dashboard.stats.subjects, sub:"Registered subjects", icon:"book", bg:"rgba(211,0,176,.08)", color:"var(--sd-primary)" },
                { label:"Attendance", value:`${dashboard.stats.attendance_rate || 0}%`, sub:"Current attendance rate", icon:"clipboard-check", bg:"rgba(34,197,94,.1)", color:"#16a34a" },
                { label:"Fee Balance", value:money(dashboard.stats.fee_balance), sub:"Outstanding school fees", icon:"wallet2", bg:"rgba(245,158,11,.12)", color:"#b45309" },
                { label:"Notices", value:dashboard.stats.unread_notifications, sub:"Unread messages", icon:"bell", bg:"rgba(59,130,246,.1)", color:"#2563eb" },
              ].map((item)=>(
                <div className="sd-card sd-stat" key={item.label}>
                  <div className="sd-stat-icon" style={{background:item.bg,color:item.color}}><i className={`bi bi-${item.icon}`} /></div>
                  <p className="sd-stat-label">{item.label}</p>
                  <p className="sd-stat-value">{item.value}</p>
                  <div className="sd-stat-sub">{item.sub}</div>
                </div>
              ))}
            </section>

            <section className="sd-grid">
              <div className="sd-card sd-card-pad">
                <div className="sd-card-head">
                  <div><h3 className="sd-card-title">Performance Trend</h3><p className="sd-card-sub">Your average score by term</p></div>
                  <span className="sd-pill" style={{color:"#5f5147",borderColor:"rgba(5,0,8,.08)",background:"var(--sd-bg)"}}>{dashboard.stats.results_count} result record{dashboard.stats.results_count === 1 ? "" : "s"}</span>
                </div>
                <div className="sd-chart"><canvas ref={performanceRef} /></div>
              </div>

              <div className="sd-card sd-card-pad">
                <div className="sd-card-head"><div><h3 className="sd-card-title">Fees</h3><p className="sd-card-sub">Payment summary</p></div></div>
                <div className="sd-result-metrics mb-3">
                  <div className="sd-mini"><div className="sd-mini-label">Paid</div><div className="sd-mini-value">{money(dashboard.fees.total_paid)}</div></div>
                  <div className="sd-mini"><div className="sd-mini-label">Balance</div><div className="sd-mini-value">{money(dashboard.fees.balance)}</div></div>
                </div>
                <div className="sd-progress-text d-flex justify-content-between mb-2"><small>{feePaidPercent}% paid</small><small>{shortDate(dashboard.fees.last_payment_date)}</small></div>
                <div className="sd-fee-track"><div className="sd-fee-fill" style={{width:`${feePaidPercent}%`}} /></div>
                <button className="sd-btn sd-btn-gold mt-3" onClick={()=>navigate("/student/my-fees")}><i className="bi bi-receipt" /> View Fee Details</button>
              </div>
            </section>

            <section className="sd-grid">
              <div className="sd-card sd-card-pad">
                <div className="sd-card-head"><div><h3 className="sd-card-title">Result View Activity</h3><p className="sd-card-sub">How often you checked results this week</p></div></div>
                <div className="sd-chart"><canvas ref={accessRef} /></div>
              </div>

              <div className="sd-card sd-card-pad">
                <div className="sd-card-head"><div><h3 className="sd-card-title">Today</h3><p className="sd-card-sub">Next class and recent notices</p></div></div>
                {dashboard.next_class ? (
                  <div className="sd-note mb-3">
                    <p className="sd-note-title">{dashboard.next_class.subject_name || dashboard.next_class.subject || "Next class"}</p>
                    <p className="sd-note-body">{dashboard.next_class.start_time || "Time not set"} - {dashboard.next_class.end_time || "Time not set"} {dashboard.next_class.venue ? `• ${dashboard.next_class.venue}` : ""}</p>
                  </div>
                ) : <div className="sd-empty mb-3">No class timetable found for today.</div>}

                <div className="sd-list">
                  {(dashboard.recent_notifications || []).slice(0,3).map((n:any)=> {
                    const note = parseNotification(n);
                    return <div className="sd-note" key={n.id}><p className="sd-note-title">{note.title}</p><p className="sd-note-body">{note.body}</p></div>;
                  })}
                  {(!dashboard.recent_notifications || dashboard.recent_notifications.length === 0) && <div className="sd-empty">No recent notices.</div>}
                </div>
              </div>
            </section>

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}
