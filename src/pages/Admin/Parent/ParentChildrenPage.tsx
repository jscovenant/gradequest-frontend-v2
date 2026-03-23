import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../../utils/axios";

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
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Manage Parent-Children" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main
            className="col-md-9 col-lg-10 ms-auto px-4 d-flex flex-column min-vh-100"
            style={{ backgroundColor: "#f8f9fa" }}
          >
            {loading && <Loader message="Loading children..." />}

            {/* Hero */}
            <div
              className="mt-4 p-4 position-relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: "16px",
                boxShadow: "0 10px 30px rgba(102, 126, 234, 0.3)",
              }}
            >
              <div className="row align-items-center position-relative">
                <div className="col-md-8">
                  <span
                    className="badge px-3 py-2 mb-3"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      color: "#fff",
                      borderRadius: "20px",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                    }}
                  >
                    <i className="bi bi-people me-1"></i>
                    Parent Portal
                  </span>

                  <h2 className="fw-bold text-white mb-2">
                    {getGreeting()}, {parentName}! 👋
                  </h2>

                  <p className="text-white mb-0" style={{ opacity: 0.9, fontSize: "1rem" }}>
                    Here’s your children list with quick indicators—class, attendance, fees and results.
                  </p>
                </div>

                <div className="col-md-4 d-none d-md-block text-end">
                  <button
                    className="btn btn-light px-4 py-2"
                    style={{ borderRadius: 10, fontWeight: 600 }}
                    onClick={() => fetchChildren()}
                  >
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="row g-3 mb-4 mt-1">
              {stats.map(({ title, value, icon }, index) => {
                const colors = [
                  { gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", icon: "#667eea", bg: "#f0edff" },
                  { gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", icon: "#f5576c", bg: "#fff0f3" },
                  { gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", icon: "#00f2fe", bg: "#e6f9ff" },
                  { gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", icon: "#38f9d7", bg: "#e6fff9" },
                ];

                return (
                  <div className="col-md-6 col-lg-3" key={title}>
                    <div
                      className="card border-0 h-100 position-relative overflow-hidden"
                      style={{
                        borderRadius: 12,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        transition: "transform 0.2s, box-shadow 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.12)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                      }}
                    >
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: colors[index].gradient }} />

                      <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div className="p-2 rounded-3" style={{ backgroundColor: colors[index].bg }}>
                            <i className={`bi bi-${icon} fs-4`} style={{ color: colors[index].icon }} />
                          </div>
                          <i className="bi bi-three-dots-vertical text-muted" style={{ cursor: "pointer" }} />
                        </div>

                        <p className="text-muted mb-1 small">{title}</p>
                        <h3 className="fw-bold mb-0" style={{ color: "#1e293b" }}>
                          {value}
                        </h3>

                        <div className="mt-3 pt-3" style={{ borderTop: "1px solid #f1f5f9" }}>
                          <small className="text-muted d-flex align-items-center gap-1">
                            <i className="bi bi-shield-check text-success" />
                            Live data from your account
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Search + Table */}
            <div className="card border-0 shadow-sm mb-5" style={{ borderRadius: 12 }}>
              <div className="card-body p-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
                  <div>
                    <h6 className="fw-semibold mb-0" style={{ color: "#1e293b" }}>
                      My Children
                    </h6>
                    <small className="text-muted">Search and manage selection</small>
                  </div>

                  <div className="mt-2 mt-md-0" style={{ minWidth: 280 }}>
                    <input
                      className="form-control"
                      placeholder="Search by name, reg no, class..."
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      style={{ borderRadius: 10 }}
                    />
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr className="text-muted small">
                        <th>Student</th>
                        <th>Class</th>
                        <th>Attendance (30d)</th>
                        <th>Fee Balance</th>
                        <th>Results</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>
                      {filtered.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <img
                                src={c.photo || "http://localhost:8000/img/profile.png"}
                                alt="Student"
                                style={{ width: 40, height: 40, borderRadius: 12, objectFit: "cover" }}
                              />
                              <div>
                                <div className="fw-semibold">{c.name}</div>
                                <small className="text-muted">{c.reg_no || "N/A"}</small>
                              </div>
                            </div>
                          </td>

                          <td>{c.class || "—"}</td>

                          <td>
                            <span className="badge bg-light text-dark" style={{ borderRadius: 20 }}>
                              {c.attendance_rate_30d}%
                            </span>
                          </td>

                          <td className="fw-semibold">{money(c.fee_balance)}</td>

                          <td>{c.results_count}</td>

                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-2">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  style={{ borderRadius: 10 }}
                                  onClick={() => navigate(`/parent/results?student_id=${c.id}`)}
                                >
                                  Results
                                </button>

                                <button
                                  className="btn btn-sm btn-primary"
                                  style={{ borderRadius: 10 }}
                                  onClick={() => navigate(`/parent/students/${c.id}/fees`)}
                                >
                                  Fees
                                </button>
                              </div>
                          </td>
                        </tr>
                      ))}

                      {!loading && filtered.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center text-muted py-4">
                            No children found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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