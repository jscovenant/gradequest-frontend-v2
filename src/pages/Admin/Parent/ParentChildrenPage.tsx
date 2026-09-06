import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../../utils/axios";
import { resolveMediaUrl } from "../../../utils/apiUrl";

import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";

type ChildSummary = {
  id: number;
  name: string;
  reg_no?: string;
  photo?: string | null;
  class?: string | null;
  attendance_rate_30d: number;
  fee_balance: number;
  results_count: number;
};

type ChildrenResponse = {
  parent: { id: number; name: string; email?: string; phone?: string | null };
  stats: { children: number };
  children: ChildSummary[];
};

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
}

const money = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(n || 0);

export default function ParentChildrenPage() {
  const navigate = useNavigate();

  // ===== Sidebar State =====
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ===== Loading State =====
  const [loading, setLoading] = useState(true);

  // ===== API Data =====
  const [data, setData] = useState<ChildrenResponse | null>(null);
  const [q, setQ] = useState("");

  // ===== Stats cards =====
  const [stats, setStats] = useState<StatCard[]>([
    { title: "My Children", value: 0, icon: "people" },
    { title: "Total Balance", value: money(0), icon: "wallet2" },
    { title: "Avg Attendance (30d)", value: "0%", icon: "clipboard-check" },
    { title: "Total Results", value: 0, icon: "bar-chart" },
  ]);

  const children = data?.children ?? [];

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return children;
    return children.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const reg = (c.reg_no || "").toLowerCase();
      const cls = (c.class || "").toLowerCase();
      return name.includes(s) || reg.includes(s) || cls.includes(s);
    });
  }, [children, q]);

  const computeStats = (list: ChildSummary[]) => {
    const totalBalance = list.reduce((sum, c) => sum + Number(c.fee_balance || 0), 0);
    const totalResults = list.reduce((sum, c) => sum + Number(c.results_count || 0), 0);
    const avgAttendance =
      list.length > 0
        ? Math.round(list.reduce((sum, c) => sum + Number(c.attendance_rate_30d || 0), 0) / list.length)
        : 0;

    setStats([
      { title: "My Children", value: list.length, icon: "people" },
      { title: "Total Balance", value: money(totalBalance), icon: "wallet2" },
      { title: "Avg Attendance (30d)", value: `${avgAttendance}%`, icon: "clipboard-check" },
      { title: "Total Results", value: totalResults, icon: "bar-chart" },
    ]);
  };

  const fetchChildren = () => {
    setLoading(true);

    authApi
      .get("/parent/children")
      .then((res) => {
        const payload: ChildrenResponse = res.data;
        setData(payload);
        computeStats(payload.children || []);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const parentName = data?.parent?.name ?? "Parent";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        .parent-ch-main {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: calc(66px + 24px) 28px 40px !important;
        }

        @media (max-width: 767.98px) {
          .parent-ch-main {
            padding: calc(66px + 16px) 14px 36px !important;
          }
          .parent-hero {
            padding: 20px 18px !important;
            border-radius: 14px !important;
            margin-bottom: 16px !important;
          }
          .parent-greeting {
            font-size: 20px !important;
          }
          .parent-hero-sub {
            font-size: 12.5px !important;
          }
        }

        .parent-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 32px 36px;
          color: #FFFFFF;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
          position: relative;
          overflow: hidden;
        }

        .parent-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        .parent-hero-glow {
          position: absolute;
          top: -40px;
          right: -40px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.18) 0%, transparent 65%);
          pointer-events: none;
        }

        .parent-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 24px;
        }

        .parent-session-badge {
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
          border-radius: 100px;
          padding: 4px 12px;
          margin-bottom: 12px;
        }

        .parent-session-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 6px #10B981;
        }

        .parent-greeting {
          font-size: 26px;
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.1;
          margin-bottom: 8px;
        }

        .parent-greeting em {
          font-style: normal;
          color: #FBBF24;
        }

        .parent-hero-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.6;
          max-width: 520px;
          margin-bottom: 0;
        }

        .parent-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        @media (max-width: 1100px) {
          .parent-stat-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .parent-stat-grid {
            grid-template-columns: 1fr;
          }
        }

        .parent-stat-card {
          background: #FFFFFF;
          border: 1px solid rgba(15, 39, 68, 0.08);
          border-radius: 16px;
          padding: 20px 24px;
          box-shadow: 0 2px 10px rgba(15, 39, 68, 0.04);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .parent-stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(15, 39, 68, 0.08);
          border-color: rgba(217, 119, 6, 0.25);
        }

        .parent-stat-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          margin-bottom: 14px;
        }

        .parent-stat-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748B;
          margin-bottom: 6px;
        }

        .parent-stat-val {
          font-size: 24px;
          font-weight: 800;
          color: #0F2744;
          line-height: 1.1;
        }

        .parent-panel {
          background: #FFFFFF;
          border: 1px solid rgba(15, 39, 68, 0.08);
          border-radius: 16px;
          box-shadow: 0 2px 10px rgba(15, 39, 68, 0.04);
          overflow: hidden;
          margin-bottom: 24px;
        }

        .parent-panel-head {
          padding: 18px 24px;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .parent-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .parent-table th {
          background: #F8FAFC;
          padding: 12px 16px;
          font-weight: 700;
          color: #475569;
          font-size: 11.5px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid #E2E8F0;
        }

        .parent-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #F1F5F9;
          color: #1E293B;
          vertical-align: middle;
        }

        .parent-table tr:hover td {
          background: #F8FAFC;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="My Children" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto gq-app-main parent-ch-main d-flex flex-column min-vh-100">
            {loading && <Loader message="Loading children directory..." />}

            {/* ── Signature Hero ── */}
            <div className="parent-hero">
              <div className="parent-hero-glow" />
              <div className="parent-hero-inner">
                <div>
                  <div className="parent-session-badge">
                    <span className="parent-session-dot" />
                    Family Directory
                  </div>

                  <h1 className="parent-greeting">
                    {getGreeting()}, <em>{parentName}!</em> 👋
                  </h1>

                  <p className="parent-hero-sub">
                    Direct access to each child’s attendance, continuous assessment reports, term broadsheets, and fee breakdown.
                  </p>
                </div>

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-outline-light px-4 py-2"
                    style={{ borderRadius: 10, fontWeight: 700, backdropFilter: "blur(8px)" }}
                    onClick={() => fetchChildren()}
                  >
                    <i className="bi bi-arrow-clockwise me-2" />
                    Refresh
                  </button>
                  <button
                    className="btn btn-warning px-4 py-2"
                    style={{ borderRadius: 10, fontWeight: 700, color: "#0F2744", background: "#FBBF24" }}
                    onClick={() => navigate("/dashboard")}
                  >
                    <i className="bi bi-speedometer2 me-2" />
                    Dashboard
                  </button>
                </div>
              </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="parent-stat-grid">
              {stats.map(({ title, value, icon }, idx) => {
                const meta = [
                  { color: "#10B981", bg: "rgba(16, 185, 129, 0.12)" },
                  { color: "#2563EB", bg: "rgba(37, 99, 235, 0.12)" },
                  { color: "#059669", bg: "rgba(5, 150, 105, 0.12)" },
                  { color: "#D97706", bg: "rgba(217, 119, 6, 0.12)" },
                ][idx % 4];

                return (
                  <div className="parent-stat-card" key={title}>
                    <div className="d-flex align-items-start justify-content-between">
                      <div>
                        <div className="parent-stat-title">{title}</div>
                        <div className="parent-stat-val">{value}</div>
                      </div>
                      <div
                        className="parent-stat-icon-wrap"
                        style={{ backgroundColor: meta.bg, color: meta.color }}
                      >
                        <i className={`bi bi-${icon}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Children Directory Table ── */}
            <div className="parent-panel mb-5">
              <div className="parent-panel-head">
                <div>
                  <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#0F2744", margin: 0 }}>
                    <i className="bi bi-people-fill text-primary me-2" />
                    All Enrolled Children ({filtered.length})
                  </h2>
                  <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                    Select a student to view academic records or clear fees
                  </div>
                </div>

                <div style={{ minWidth: 260 }}>
                  <input
                    className="form-control"
                    placeholder="Search by name, reg no, class..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    style={{ borderRadius: 10, fontSize: "13px" }}
                  />
                </div>
              </div>

              <div className="table-responsive">
                <table className="parent-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Class</th>
                      <th>Attendance (30d)</th>
                      <th>Fee Balance</th>
                      <th>Results Available</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((c) => {
                      const balance = Number(c.fee_balance || 0);
                      const isClear = balance <= 0;
                      const initials = (c.name || "Student")
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();

                      return (
                        <tr key={c.id}>
                          <td>
                            <div className="d-flex align-items-center gap-3">
                              <div
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 12,
                                  background: "#0A192F",
                                  color: "#FBBF24",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 800,
                                  fontSize: 14,
                                  overflow: "hidden",
                                  flexShrink: 0,
                                  border: "1.5px solid rgba(15, 39, 68, 0.12)",
                                }}
                              >
                                {c.photo ? (
                                  <img
                                    src={resolveMediaUrl(c.photo, "/media/profile.jpg")}
                                    alt={c.name}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                ) : null}
                                <span>{initials}</span>
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: "#0F2744", fontSize: 14 }}>{c.name}</div>
                                <small className="text-muted">Reg No: <strong>{c.reg_no || "N/A"}</strong></small>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="badge bg-light text-dark border px-2 py-1 fw-bold">{c.class || "—"}</span>
                          </td>

                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="progress flex-grow-1" style={{ height: 6, width: 60, borderRadius: 999 }}>
                                <div
                                  className={`progress-bar ${c.attendance_rate_30d >= 75 ? "bg-success" : c.attendance_rate_30d >= 50 ? "bg-warning" : "bg-danger"}`}
                                  style={{ width: `${Math.min(100, c.attendance_rate_30d || 0)}%` }}
                                />
                              </div>
                              <span style={{ fontWeight: 700, fontSize: "12px" }}>{c.attendance_rate_30d}%</span>
                            </div>
                          </td>

                          <td style={{ fontWeight: 700, color: isClear ? "#15803D" : "#B91C1C", fontSize: 13.5 }}>
                            {money(c.fee_balance)}
                          </td>

                          <td>
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle fw-bold px-2 py-1">
                              <i className="bi bi-award me-1" />
                              {c.results_count} term result{c.results_count !== 1 ? "s" : ""}
                            </span>
                          </td>

                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-2">
                              <button
                                className="btn btn-sm btn-outline-dark"
                                style={{ borderRadius: 8, fontWeight: 700, fontSize: "12px" }}
                                onClick={() => navigate(`/parent/results?student_id=${c.id}`)}
                                title="View Academic Results and Broadsheet"
                              >
                                <i className="bi bi-file-earmark-bar-graph me-1 text-primary" />
                                Broadsheet
                              </button>

                              <button
                                className="btn btn-sm btn-primary"
                                style={{ borderRadius: 8, fontWeight: 700, fontSize: "12px" }}
                                onClick={() => navigate(`/parent/students/${c.id}/fees`)}
                                title="View Fee Breakdown & Payment Details"
                              >
                                <i className="bi bi-receipt me-1" />
                                Fees
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {!loading && filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-5">
                          <i className="bi bi-search fs-2 d-block mb-2 text-secondary" />
                          No children found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}