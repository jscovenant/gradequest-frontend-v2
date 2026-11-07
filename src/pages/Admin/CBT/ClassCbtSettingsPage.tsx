import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";

export interface ClassCbtItem {
  id: number;
  name: string;
  class_group?: string | null;
  section_id?: number | null;
  section_name?: string | null;
  cbt_enabled: boolean;
  student_count: number;
  platform_fee_per_student: number;
  total_platform_fee: number;
  package_label: string;
}

export interface ClassCbtSummary {
  total_classes: number;
  cbt_classes_count: number;
  basic_classes_count: number;
  total_students: number;
  cbt_students_count: number;
  basic_students_count: number;
  projected_total_fee: number;
  has_mixed_structure: boolean;
}

function fmtNaira(val: number): string {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(val);
  } catch {
    return `₦${Number(val || 0).toLocaleString()}`;
  }
}

export default function ClassCbtSettingsPage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [classes, setClasses] = useState<ClassCbtItem[]>([]);
  const [cbtRate, setCbtRate] = useState<number>(1000);
  const [basicRate, setBasicRate] = useState<number>(500);
  const [isFullCbt, setIsFullCbt] = useState<boolean>(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "cbt" | "basic">("all");

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await authApi.get("/levels/cbt-settings");
      const data = res.data;
      setClasses(data.classes || []);
      setCbtRate(Number(data.cbt_rate_per_student || 1000));
      setBasicRate(Number(data.basic_rate_per_student || 500));
      setIsFullCbt(Boolean(data.is_full_cbt_package));
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to load class CBT settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggle = (id: number) => {
    setClasses((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const nextEnabled = !c.cbt_enabled;
        const rate = nextEnabled ? cbtRate : basicRate;
        return {
          ...c,
          cbt_enabled: nextEnabled,
          platform_fee_per_student: rate,
          total_platform_fee: c.student_count * rate,
          package_label: nextEnabled ? "Full CBT Package" : "Basic Plan (Results Only)",
        };
      })
    );
  };

  const handleEnableAll = () => {
    setClasses((prev) =>
      prev.map((c) => ({
        ...c,
        cbt_enabled: true,
        platform_fee_per_student: cbtRate,
        total_platform_fee: c.student_count * cbtRate,
        package_label: "Full CBT Package",
      }))
    );
    showSuccess("Enabled CBT for all classes.");
  };

  const handleDisablePrimaryNursery = () => {
    setClasses((prev) =>
      prev.map((c) => {
        const lower = c.name.toLowerCase();
        const isNurseryOrPrimary =
          lower.includes("nursery") ||
          lower.includes("creche") ||
          lower.includes("kindergarten") ||
          lower.includes("primary") ||
          lower.includes("basic 1") ||
          lower.includes("basic 2") ||
          lower.includes("basic 3") ||
          lower.includes("basic 4") ||
          lower.includes("basic 5") ||
          lower.includes("basic 6") ||
          lower.includes("kg");
        const nextEnabled = !isNurseryOrPrimary;
        const rate = nextEnabled ? cbtRate : basicRate;
        return {
          ...c,
          cbt_enabled: nextEnabled,
          platform_fee_per_student: rate,
          total_platform_fee: c.student_count * rate,
          package_label: nextEnabled ? "Full CBT Package" : "Basic Plan (Results Only)",
        };
      })
    );
    showSuccess("Disabled CBT for Nursery & Primary classes. Platform fee set to ₦500/student.");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        classes: classes.map((c) => ({
          id: c.id,
          cbt_enabled: c.cbt_enabled,
        })),
      };
      const res = await authApi.put("/levels/cbt-settings", payload);
      showSuccess(res.data?.message || "Class CBT settings and platform fees updated successfully!");
      await fetchSettings();
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to update CBT class settings");
    } finally {
      setSaving(false);
    }
  };

  const liveSummary = useMemo<ClassCbtSummary>(() => {
    const total_classes = classes.length;
    const cbt_classes_count = classes.filter((c) => c.cbt_enabled).length;
    const basic_classes_count = total_classes - cbt_classes_count;
    const cbt_students_count = classes.filter((c) => c.cbt_enabled).reduce((sum, c) => sum + c.student_count, 0);
    const basic_students_count = classes.filter((c) => !c.cbt_enabled).reduce((sum, c) => sum + c.student_count, 0);
    const projected_total_fee = classes.reduce((sum, c) => sum + c.total_platform_fee, 0);

    return {
      total_classes,
      cbt_classes_count,
      basic_classes_count,
      total_students: cbt_students_count + basic_students_count,
      cbt_students_count,
      basic_students_count,
      projected_total_fee,
      has_mixed_structure: cbt_classes_count > 0 && basic_classes_count > 0,
    };
  }, [classes]);

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.section_name && c.section_name.toLowerCase().includes(search.toLowerCase()));
      if (!matchSearch) return false;
      if (filterType === "cbt") return c.cbt_enabled;
      if (filterType === "basic") return !c.cbt_enabled;
      return true;
    });
  }, [classes, search, filterType]);

  return (
    <>
      <style>{`
        .cbt-settings-page {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: 24px 28px 48px;
        }

        .cbt-hero {
          background: linear-gradient(135deg, #033987 0%, #082855 60%, #0F2744 100%);
          border-radius: 18px;
          padding: 30px 36px;
          color: #fff;
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px -5px rgba(3, 57, 135, 0.25);
        }

        .cbt-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .cbt-kpi-card {
          background: #fff;
          border-radius: 16px;
          padding: 20px 22px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 2px 10px rgba(15, 39, 68, 0.04);
          position: relative;
          overflow: hidden;
        }

        .cbt-kpi-card::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 5px;
        }

        .cbt-kpi-cbt::before { background: #033987; }
        .cbt-kpi-basic::before { background: #119940; }
        .cbt-kpi-total::before { background: #FEC602; }

        .cbt-kpi-label {
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .05em;
          color: #64748B;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .cbt-kpi-val {
          font-size: 24px;
          font-weight: 800;
          color: #0F2744;
          line-height: 1.2;
        }

        .cbt-kpi-sub {
          font-size: 12px;
          color: #64748B;
          margin-top: 6px;
          font-weight: 500;
        }

        .cbt-card {
          background: #fff;
          border-radius: 18px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 4px 14px rgba(15, 39, 68, 0.04);
          padding: 24px;
          margin-bottom: 24px;
        }

        .cbt-table-responsive {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .cbt-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 8px;
        }

        .cbt-table th {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .06em;
          color: #64748B;
          padding: 10px 16px;
          border-bottom: 2px solid #E2E8F0;
        }

        .cbt-table td {
          background: #fff;
          padding: 14px 16px;
          vertical-align: middle;
          border-top: 1px solid #F1F5F9;
          border-bottom: 1px solid #F1F5F9;
        }

        .cbt-table tr:hover td {
          background: #F8FAFC;
        }

        .cbt-table tr td:first-child {
          border-left: 1px solid #F1F5F9;
          border-top-left-radius: 12px;
          border-bottom-left-radius: 12px;
        }

        .cbt-table tr td:last-child {
          border-right: 1px solid #F1F5F9;
          border-top-right-radius: 12px;
          border-bottom-right-radius: 12px;
        }

        .cbt-badge-cbt {
          background: #EFF6FF;
          color: #1D4ED8;
          border: 1px solid #BFDBFE;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .cbt-badge-basic {
          background: #ECFDF5;
          color: #047857;
          border: 1px solid #A7F3D0;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .cbt-switch {
          position: relative;
          display: inline-block;
          width: 46px;
          height: 24px;
        }

        .cbt-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .cbt-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #CBD5E1;
          transition: .3s;
          border-radius: 24px;
        }

        .cbt-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        input:checked + .cbt-slider {
          background-color: #033987;
        }

        input:checked + .cbt-slider:before {
          transform: translateX(22px);
        }

        .cbt-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          font-weight: 700;
          padding: 10px 18px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cbt-btn-primary {
          background: #033987;
          color: #fff;
        }

        .cbt-btn-primary:hover {
          background: #0A4FB3;
          color: #fff;
        }

        .cbt-btn-secondary {
          background: #F1F5F9;
          color: #334155;
          border: 1px solid #CBD5E1;
        }

        .cbt-btn-secondary:hover {
          background: #E2E8F0;
        }

        .cbt-btn-gold {
          background: #FEC602;
          color: #0F2744;
          font-weight: 800;
        }

        .cbt-btn-gold:hover {
          background: #E5B202;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Class CBT & Platform Fee Settings" />
      <PageTitle title="Class CBT & Platform Fee Settings" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="col-md-9 col-lg-10 ms-auto cbt-settings-page">
            {loading && <Loader message="Loading class-level CBT allocations..." />}

            {/* Hero Header */}
            <div className="cbt-hero">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-2" style={{ background: "rgba(254, 198, 2, 0.2)", border: "1px solid rgba(254, 198, 2, 0.4)", color: "#FEC602", fontSize: 11.5, fontWeight: 700 }}>
                    <i className="bi bi-sliders2" /> Class Package & Fee Management
                  </div>
                  <h1 className="h3 fw-bold mb-1">Class-Level CBT & Platform Fee Control</h1>
                  <p className="mb-0 text-light opacity-85" style={{ maxWidth: 700, fontSize: 13.5 }}>
                    Subscribed to Full CBT? Enable or disable CBT independently for each class.
                    Non-CBT classes (e.g. Basic 4–6) automatically fall back to the Basic Plan rate of ₦500 per student.
                  </p>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <button className="cbt-btn cbt-btn-secondary" onClick={() => navigate("/levels")}>
                    <i className="bi bi-arrow-left" /> Back to Classes
                  </button>
                  <button className="cbt-btn cbt-btn-gold" onClick={handleSave} disabled={saving}>
                    <i className="bi bi-check2-circle" /> {saving ? "Saving Changes..." : "Save Configuration"}
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="cbt-kpi-grid">
              <div className="cbt-kpi-card cbt-kpi-cbt">
                <div className="cbt-kpi-label">
                  <span>Full CBT Classes</span>
                  <span className="badge bg-primary text-white">{fmtNaira(cbtRate)}/student</span>
                </div>
                <div className="cbt-kpi-val">{liveSummary.cbt_classes_count} <span className="fs-6 fw-normal text-muted">Classes</span></div>
                <div className="cbt-kpi-sub">{liveSummary.cbt_students_count} Active Students participating in CBT</div>
              </div>

              <div className="cbt-kpi-card cbt-kpi-basic">
                <div className="cbt-kpi-label">
                  <span>Results Only Classes</span>
                  <span className="badge bg-success text-white">{fmtNaira(basicRate)}/student</span>
                </div>
                <div className="cbt-kpi-val">{liveSummary.basic_classes_count} <span className="fs-6 fw-normal text-muted">Classes</span></div>
                <div className="cbt-kpi-sub">{liveSummary.basic_students_count} Students charged at Basic rate (₦500)</div>
              </div>

              <div className="cbt-kpi-card cbt-kpi-total">
                <div className="cbt-kpi-label">
                  <span>Projected Platform Fee</span>
                  <span className="badge bg-dark text-white">{liveSummary.total_students} Students</span>
                </div>
                <div className="cbt-kpi-val text-primary">{fmtNaira(liveSummary.projected_total_fee)}</div>
                <div className="cbt-kpi-sub">
                  {liveSummary.has_mixed_structure ? "Mixed Structure (CBT + Basic rate)" : "Uniform class structure"}
                </div>
              </div>
            </div>

            {/* Main Workspace Card */}
            <div className="cbt-card">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 pb-3 border-bottom mb-4">
                {/* Search & Filter */}
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <div className="input-group" style={{ maxWidth: 280 }}>
                    <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-search" /></span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="Search class or section..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <div className="btn-group" role="group">
                    <button
                      type="button"
                      className={`btn btn-sm ${filterType === "all" ? "btn-dark" : "btn-outline-secondary"}`}
                      onClick={() => setFilterType("all")}
                    >
                      All ({classes.length})
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${filterType === "cbt" ? "btn-primary" : "btn-outline-primary"}`}
                      onClick={() => setFilterType("cbt")}
                    >
                      CBT Active ({liveSummary.cbt_classes_count})
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${filterType === "basic" ? "btn-success" : "btn-outline-success"}`}
                      onClick={() => setFilterType("basic")}
                    >
                      Results Only ({liveSummary.basic_classes_count})
                    </button>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <button className="btn btn-sm btn-outline-primary fw-bold" onClick={handleEnableAll}>
                    <i className="bi bi-check-all me-1" /> Enable All
                  </button>
                  <button className="btn btn-sm btn-outline-success fw-bold" onClick={handleDisablePrimaryNursery} title="Disable CBT for Nursery, Creche, KG, and Primary/Basic 1-6">
                    <i className="bi bi-mortarboard me-1" /> Disable Nursery & Primary (₦500)
                  </button>
                </div>
              </div>

              {/* Classes Table */}
              <div className="cbt-table-responsive">
                <table className="cbt-table">
                  <thead>
                    <tr>
                      <th style={{ width: "26%" }}>Class / Level</th>
                      <th style={{ width: "16%" }}>Section</th>
                      <th style={{ width: "14%" }} className="text-center">Active Students</th>
                      <th style={{ width: "20%" }}>Assigned Package & Rate</th>
                      <th style={{ width: "14%" }} className="text-end">Projected Total</th>
                      <th style={{ width: "10%" }} className="text-center">CBT Toggle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClasses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-5 text-muted">
                          <i className="bi bi-inbox fs-2 d-block mb-2 opacity-50" />
                          No classes matched your search filter.
                        </td>
                      </tr>
                    ) : (
                      filteredClasses.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong className="text-dark fs-6">{item.name}</strong>
                            {item.class_group && <small className="text-muted d-block">{item.class_group}</small>}
                          </td>
                          <td>
                            <span className="badge bg-light text-secondary border">
                              {item.section_name || "General"}
                            </span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-3 py-2 fw-bold">
                              <i className="bi bi-people me-1" /> {item.student_count} students
                            </span>
                          </td>
                          <td>
                            {item.cbt_enabled ? (
                              <span className="cbt-badge-cbt">
                                <i className="bi bi-lightning-fill text-warning" />
                                Full CBT ({fmtNaira(item.platform_fee_per_student)}/stu)
                              </span>
                            ) : (
                              <span className="cbt-badge-basic">
                                <i className="bi bi-file-earmark-text" />
                                Basic Plan ({fmtNaira(item.platform_fee_per_student)}/stu)
                              </span>
                            )}
                          </td>
                          <td className="text-end fw-bold text-dark fs-6">
                            {fmtNaira(item.total_platform_fee)}
                          </td>
                          <td className="text-center">
                            <label className="cbt-switch" title={item.cbt_enabled ? "Click to disable CBT (₦500/student)" : "Click to enable Full CBT"}>
                              <input
                                type="checkbox"
                                checked={item.cbt_enabled}
                                onChange={() => handleToggle(item.id)}
                              />
                              <span className="cbt-slider" />
                            </label>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Actions Bar */}
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mt-4 pt-3 border-top">
                <span className="text-muted small">
                  Showing <strong>{filteredClasses.length}</strong> of <strong>{classes.length}</strong> total classes.
                  Changes only take effect after clicking <strong>Save Configuration</strong>.
                </span>
                <div className="d-flex align-items-center gap-2">
                  <button className="cbt-btn cbt-btn-secondary" onClick={() => navigate("/cbt/exams")}>
                    <i className="bi bi-pc-display-horizontal" /> Go to CBT Exams
                  </button>
                  <button className="cbt-btn cbt-btn-gold" onClick={handleSave} disabled={saving}>
                    <i className="bi bi-check2-circle" /> {saving ? "Saving Changes..." : "Save Configuration"}
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      <Footer />
    </>
  );
}
