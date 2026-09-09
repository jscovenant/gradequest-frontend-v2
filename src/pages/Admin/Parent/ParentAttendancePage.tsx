import React, { useEffect, useState } from "react";
import { authApi } from "../../../utils/axios";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import PageTitle from "../../../components/PageTitle";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

interface Child {
  id: number;
  firstname: string;
  surname: string;
  reg_no: string;
  photo?: string;
  class_name?: string;
}

interface AttendanceRecord {
  id: number;
  date: string;
  day: string;
  status: "present" | "late" | "absent" | "excused";
  remarks: string;
  week_number: number;
  marked_by: string;
}

interface MonthlyStat {
  month: string;
  total: number;
  present: number;
  absent: number;
  rate: number;
}

interface AttendanceStats {
  total_days: number;
  present_days: number;
  late_days: number;
  absent_days: number;
  excused_days: number;
  attendance_rate: number;
}

export default function ParentAttendancePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [stats, setStats] = useState<AttendanceStats>({
    total_days: 0,
    present_days: 0,
    late_days: 0,
    absent_days: 0,
    excused_days: 0,
    attendance_rate: 0,
  });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [filterTab, setFilterTab] = useState<"all" | "absent" | "late">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchAttendance = async (childId?: number) => {
    try {
      setLoading(true);
      const url = childId ? `/parent/attendance?child_id=${childId}` : "/parent/attendance";
      const res = await authApi.get(url);
      const data = res.data;

      setChildren(data.children || []);
      if (data.selected_child) {
        setSelectedChildId(data.selected_child.id);
      } else if (data.children && data.children.length > 0 && !selectedChildId) {
        setSelectedChildId(data.children[0].id);
      }
      setStats(data.stats || {
        total_days: 0,
        present_days: 0,
        late_days: 0,
        absent_days: 0,
        excused_days: 0,
        attendance_rate: 0,
      });
      setRecords(data.records || []);
      setMonthlyStats(data.monthly_breakdown || []);
    } catch (err: any) {
      console.error("Failed to load attendance records", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleChildSwitch = (childId: number) => {
    setSelectedChildId(childId);
    fetchAttendance(childId);
  };

  const selectedChild = children.find((c) => c.id === selectedChildId);

  const filteredRecords = records.filter((r) => {
    if (filterTab === "absent" && r.status !== "absent" && r.status !== "excused") return false;
    if (filterTab === "late" && r.status !== "late") return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        r.date.toLowerCase().includes(q) ||
        r.day.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        (r.remarks && r.remarks.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <span className="badge bg-success-subtle text-success fw-bold px-2 py-1"><i className="bi bi-check-circle-fill me-1" />Present</span>;
      case "late":
        return <span className="badge bg-warning-subtle text-warning fw-bold px-2 py-1"><i className="bi bi-clock-history me-1" />Late</span>;
      case "absent":
        return <span className="badge bg-danger-subtle text-danger fw-bold px-2 py-1"><i className="bi bi-x-circle-fill me-1" />Absent</span>;
      case "excused":
        return <span className="badge bg-info-subtle text-info fw-bold px-2 py-1"><i className="bi bi-info-circle-fill me-1" />Excused</span>;
      default:
        return <span className="badge bg-secondary-subtle text-secondary fw-bold px-2 py-1">{status}</span>;
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        .p-att-main {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: calc(66px + 24px) 28px 40px !important;
        }

        @media (max-width: 767.98px) {
          .p-att-main {
            padding: calc(66px + 16px) 14px 36px !important;
          }
        }

        .p-att-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 32px 36px;
          color: #FFFFFF;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
          position: relative;
          overflow: hidden;
        }

        @media (max-width: 767.98px) {
          .p-att-hero {
            padding: 20px 18px !important;
            border-radius: 14px !important;
            margin-bottom: 16px !important;
          }
        }

        .p-att-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        .p-att-hero-glow {
          position: absolute;
          top: -40px;
          right: -40px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.2) 0%, transparent 65%);
          pointer-events: none;
        }

        .p-att-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }

        .p-att-badge {
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

        .p-att-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 6px #10B981;
        }

        .p-att-title {
          font-size: 26px;
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.1;
          margin-bottom: 8px;
        }

        .p-att-title em {
          font-style: normal;
          color: #FBBF24;
        }

        .p-att-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.6;
          max-width: 620px;
          margin-bottom: 0;
        }

        @media (max-width: 767.98px) {
          .p-att-title {
            font-size: 20px !important;
          }
          .p-att-sub {
            font-size: 12.5px !important;
          }
        }

        /* Child Selector Pills */
        .p-child-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          border-radius: 12px;
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          color: #475569;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .p-child-pill:hover {
          background: #F1F5F9;
          border-color: #CBD5E1;
          transform: translateY(-1px);
        }

        .p-child-pill.active {
          background: #0A192F;
          border-color: #0A192F;
          color: #FFFFFF;
          box-shadow: 0 4px 14px rgba(10, 25, 47, 0.25);
        }

        .p-child-pill.active .p-child-sub {
          color: #FBBF24;
        }

        .p-child-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 12px;
          color: #0F2744;
        }

        /* KPI Cards */
        .p-stat-card {
          background: #FFFFFF;
          border: 1px solid rgba(15, 39, 68, 0.08);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(15, 39, 68, 0.04);
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .p-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(15, 39, 68, 0.08);
        }

        .p-stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--stat-color, #2563EB);
        }

        /* Panels */
        .p-panel {
          background: #FFFFFF;
          border: 1px solid rgba(15, 39, 68, 0.08);
          border-radius: 18px;
          box-shadow: 0 4px 20px rgba(15, 39, 68, 0.06);
          overflow: hidden;
          margin-bottom: 24px;
        }

        .p-panel-head {
          padding: 18px 22px;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .p-table {
          width: 100%;
          border-collapse: collapse;
        }

        .p-table th {
          background: #F8FAFC;
          color: #64748B;
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 12px 18px;
          border-bottom: 1px solid #E2E8F0;
        }

        .p-table td {
          padding: 14px 18px;
          border-bottom: 1px solid #F1F5F9;
          font-size: 13.5px;
          color: #1E293B;
          vertical-align: middle;
        }

        .p-table tr:hover td {
          background: #F8FAFC;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Child Attendance - SchoolProfit" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto gq-app-main parent-db-main d-flex flex-column min-vh-100">
            {loading && <Loader message="Loading attendance records..." />}

            {/* ── Signature SchoolProfit Hero ── */}
            <div className="p-att-hero">
              <div className="p-att-hero-glow" />
              <div className="p-att-hero-inner">
                <div>
                  <div className="p-att-badge">
                    <span className="p-att-dot" />
                    Parent Portal · Attendance Tracker
                  </div>
                  <h1 className="p-att-title">
                    {getGreeting()}, <em>Parent.</em>
                  </h1>
                  <p className="p-att-sub">
                    Monitor your child's daily class presence, arrival punctuality, excused absence logs, and cumulative attendance ratings in real-time.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Child Switcher ── */}
            {children.length > 0 && (
              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fw-bold small text-uppercase text-muted" style={{ letterSpacing: "0.05em" }}>
                    Select Ward / Child
                  </span>
                  <span className="badge bg-primary-subtle text-primary fw-bold">
                    {children.length} {children.length === 1 ? "Child Linked" : "Children Linked"}
                  </span>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {children.map((child) => {
                    const isActive = child.id === selectedChildId;
                    const initials = `${child.surname?.[0] || ""}${child.firstname?.[0] || ""}`.toUpperCase();
                    return (
                      <button
                        key={child.id}
                        type="button"
                        className={`p-child-pill ${isActive ? "active" : ""}`}
                        onClick={() => handleChildSwitch(child.id)}
                      >
                        <div className="p-child-avatar">
                          {child.photo ? (
                            <img src={child.photo} alt={child.firstname} className="w-100 h-100 rounded-circle object-fit-cover" />
                          ) : (
                            initials
                          )}
                        </div>
                        <div className="text-start">
                          <div className="fw-bold">{child.surname} {child.firstname}</div>
                          <div className="p-child-sub small" style={{ fontSize: "11.5px" }}>
                            {child.class_name || "Assigned Class"} · {child.reg_no}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── KPI Stat Cards ── */}
            <div className="row g-3 mb-4">
              <div className="col-sm-6 col-xl-3">
                <div className="p-stat-card" style={{ "--stat-color": "#2563EB" } as React.CSSProperties}>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="small fw-bold text-uppercase text-muted">Attendance Rate</span>
                    <span className="badge bg-primary-subtle text-primary fw-bold">
                      {stats.attendance_rate >= 80 ? "Excellent" : stats.attendance_rate >= 60 ? "Average" : "Warning"}
                    </span>
                  </div>
                  <div className="fs-3 fw-bold text-dark">{stats.attendance_rate}%</div>
                  <div className="progress mt-2" style={{ height: 6 }}>
                    <div
                      className={`progress-bar ${stats.attendance_rate >= 75 ? "bg-success" : stats.attendance_rate >= 50 ? "bg-warning" : "bg-danger"}`}
                      style={{ width: `${Math.min(100, stats.attendance_rate)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="col-sm-6 col-xl-3">
                <div className="p-stat-card" style={{ "--stat-color": "#10B981" } as React.CSSProperties}>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="small fw-bold text-uppercase text-muted">Days Present</span>
                    <i className="bi bi-calendar-check text-success fs-5" />
                  </div>
                  <div className="fs-3 fw-bold text-dark">{stats.present_days} <span className="fs-6 fw-normal text-muted">/ {stats.total_days}</span></div>
                  <div className="small text-muted mt-1">Total school days recorded</div>
                </div>
              </div>

              <div className="col-sm-6 col-xl-3">
                <div className="p-stat-card" style={{ "--stat-color": "#F59E0B" } as React.CSSProperties}>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="small fw-bold text-uppercase text-muted">Late Arrivals</span>
                    <i className="bi bi-clock-history text-warning fs-5" />
                  </div>
                  <div className="fs-3 fw-bold text-dark">{stats.late_days}</div>
                  <div className="small text-muted mt-1">Recorded after morning assembly</div>
                </div>
              </div>

              <div className="col-sm-6 col-xl-3">
                <div className="p-stat-card" style={{ "--stat-color": "#EF4444" } as React.CSSProperties}>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="small fw-bold text-uppercase text-muted">Absences & Excuses</span>
                    <i className="bi bi-exclamation-octagon text-danger fs-5" />
                  </div>
                  <div className="fs-3 fw-bold text-dark">
                    {stats.absent_days} <span className="fs-6 fw-normal text-muted">({stats.excused_days} excused)</span>
                  </div>
                  <div className="small text-muted mt-1">Missed school sessions</div>
                </div>
              </div>
            </div>

            {/* ── Monthly Trend & Attendance Table ── */}
            <div className="row g-4 mb-4">
              {monthlyStats.length > 0 && (
                <div className="col-12">
                  <div className="p-panel mb-0">
                    <div className="p-panel-head">
                      <div className="fw-bold" style={{ color: "#0F2744", fontSize: "15px" }}>
                        <i className="bi bi-bar-chart-steps me-2 text-primary" />
                        Monthly Attendance Trend
                      </div>
                      <small className="text-muted">Presence consistency by month</small>
                    </div>
                    <div className="p-4">
                      <div className="row g-3">
                        {monthlyStats.map((m, idx) => (
                          <div key={idx} className="col-sm-6 col-md-4 col-lg-2">
                            <div className="border rounded-3 p-3 text-center bg-light">
                              <div className="small fw-bold text-muted mb-1">{m.month}</div>
                              <div className="fs-5 fw-bold text-dark">{m.rate}%</div>
                              <div className="small text-muted">{m.present} / {m.total} days</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="col-12">
                <div className="p-panel">
                  <div className="p-panel-head">
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                      <h2 className="mb-0 fw-bold fs-6" style={{ color: "#0F2744" }}>
                        <i className="bi bi-calendar2-week me-2 text-primary" />
                        Attendance History for {selectedChild ? `${selectedChild.surname} ${selectedChild.firstname}` : "Child"}
                      </h2>

                      {/* Filter Tabs */}
                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          className={`btn ${filterTab === "all" ? "btn-dark" : "btn-outline-secondary"}`}
                          onClick={() => setFilterTab("all")}
                        >
                          All Logs ({records.length})
                        </button>
                        <button
                          type="button"
                          className={`btn ${filterTab === "absent" ? "btn-dark" : "btn-outline-secondary"}`}
                          onClick={() => setFilterTab("absent")}
                        >
                          Absences ({stats.absent_days + stats.excused_days})
                        </button>
                        <button
                          type="button"
                          className={`btn ${filterTab === "late" ? "btn-dark" : "btn-outline-secondary"}`}
                          onClick={() => setFilterTab("late")}
                        >
                          Late Arrivals ({stats.late_days})
                        </button>
                      </div>
                    </div>

                    <div className="d-flex gap-2 align-items-center">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        style={{ maxWidth: 220, borderRadius: 8 }}
                        placeholder="Search date, remark..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                        onClick={() => fetchAttendance(selectedChildId || undefined)}
                      >
                        <i className="bi bi-arrow-clockwise" />
                        Refresh
                      </button>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="p-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Day</th>
                          <th>Week</th>
                          <th>Status</th>
                          <th>Teacher Note / Remark</th>
                          <th>Logged By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-5 text-muted">
                              <i className="bi bi-calendar-x fs-2 d-block mb-2 text-secondary" />
                              No attendance entries found for this filter.
                            </td>
                          </tr>
                        ) : (
                          filteredRecords.map((r) => (
                            <tr key={r.id}>
                              <td className="fw-bold">{r.date}</td>
                              <td>{r.day}</td>
                              <td>
                                <span className="badge bg-light text-dark border">Week {r.week_number}</span>
                              </td>
                              <td>{getStatusBadge(r.status)}</td>
                              <td>
                                <span className="text-muted small">{r.remarks}</span>
                              </td>
                              <td className="small text-muted">{r.marked_by}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
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
