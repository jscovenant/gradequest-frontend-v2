// src/pages/Results/BroadsheetPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";

import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";

type Batch = {
  id: number;
  school_id: number;
  class_id: number;
  term: string;
  session: string;
  status: "draft" | "computed" | "approved" | "published";
};

type BroadsheetSubject = { id: number; name: string };

type SubjectCell = {
  ca: any;
  exam: number | null;
  total: number | null;
  effective_total: number | null;
  grade: string | null;
  remark: string | null;
  comment: string | null;
  signature: string | null;
  carry_over_enabled: boolean;
  carry_over_json: any;
  cumulative_total: number | null;
  cumulative_average: number | null;
  position: number | null;
};

type BroadsheetRow = {
  user_id: number;
  student_result_id: number;
  reg_no: string | null;
  name: string;
  overall: {
    average: number | null;
    grade: string | null;
    position: number | null;
  };
  subjects: Record<string, SubjectCell>;
};

type BroadsheetResponse = {
  batch: Batch;
  subjects: BroadsheetSubject[];
  rows: BroadsheetRow[];
  meta: {
    class_size: number;
    include_previous: boolean;
    rank_by: string;

    // optional (added by backend when filtered)
    filtered_by_subject_id?: number;
    min_score?: number | null;
    max_score?: number | null;
    order?: "asc" | "desc";
  };
};

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function StatusBadge({ status }: { status: Batch["status"] }) {
  const map: Record<Batch["status"], { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-secondary" },
    computed: { label: "Computed", cls: "bg-info" },
    approved: { label: "Approved", cls: "bg-primary" },
    published: { label: "Published", cls: "bg-success" },
  };
  const s = map[status] ?? map.draft;
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

function formatNum(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return String(n);
}

function csvEscape(v: any) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function isValidNumberString(s: string) {
  if (!s) return true;
  return /^\d+(\.\d+)?$/.test(s);
}

export default function BroadsheetPage() {
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const query = useQuery();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ✅ Support BOTH:
  // - /results/broadsheet/:batchId (preferred)
  // - ?batch_id=88 or ?batchId=88 (fallback)
  const { batchId: batchIdParam } = useParams<{ batchId?: string }>();
  const batchId = Number(batchIdParam ?? query.get("batch_id") ?? query.get("batchId") ?? 0);

  // Existing filters (querystring)
  const [includePrevious, setIncludePrevious] = useState<boolean>(query.get("include_previous") === "1");
  const [rankBy, setRankBy] = useState<"average" | "total">(query.get("rank_by") === "total" ? "total" : "average");

  // ✅ NEW: subject-score filtering (querystring)
  const initSubject = query.get("subject_id");
  const [filterSubjectId, setFilterSubjectId] = useState<number | "">(initSubject ? Number(initSubject) : "");
  const [minScore, setMinScore] = useState<string>(query.get("min_score") ?? "");
  const [maxScore, setMaxScore] = useState<string>(query.get("max_score") ?? "");
  const [order, setOrder] = useState<"asc" | "desc">(query.get("order") === "asc" ? "asc" : "desc");

  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  const [data, setData] = useState<BroadsheetResponse | null>(null);

  const subjectIds = useMemo(() => data?.subjects.map((s) => String(s.id)) ?? [], [data]);
  const selectedSubjectName = useMemo(() => {
    if (!data || !filterSubjectId) return "";
    return data.subjects.find((s) => s.id === filterSubjectId)?.name ?? "";
  }, [data, filterSubjectId]);

  // ✅ keep URL in sync with filters
  useEffect(() => {
    if (!batchId || Number.isNaN(batchId)) return;

    const params = new URLSearchParams();

    if (includePrevious) params.set("include_previous", "1");
    params.set("rank_by", rankBy);

    // subject filter params
    if (filterSubjectId) params.set("subject_id", String(filterSubjectId));
    if (minScore) params.set("min_score", minScore);
    if (maxScore) params.set("max_score", maxScore);
    if (order) params.set("order", order);

    navigate({ search: params.toString() }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includePrevious, rankBy, filterSubjectId, minScore, maxScore, order, batchId]);

  useEffect(() => {
    if (!batchId || Number.isNaN(batchId)) {
      showError("Select a batch first or open with /results/broadsheet/:batchId (or ?batch_id=88).");
      return;
    }
    void loadBroadsheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, includePrevious, rankBy, filterSubjectId, minScore, maxScore, order]);

  async function loadBroadsheet() {
    // client-side quick validations (avoid hitting API with bad filters)
    if (minScore && !isValidNumberString(minScore)) {
      showError("Min score must be a valid number.");
      return;
    }
    if (maxScore && !isValidNumberString(maxScore)) {
      showError("Max score must be a valid number.");
      return;
    }
    if (minScore && maxScore && Number(maxScore) < Number(minScore)) {
      showError("Max score cannot be less than Min score.");
      return;
    }

    try {
      setLoading(true);

      const res = await authApi.get<BroadsheetResponse>(`/result-batches/${batchId}/broadsheet`, {
        params: {
          include_previous: includePrevious ? 1 : 0,
          rank_by: rankBy,

          // ✅ subject-score filter params
          subject_id: filterSubjectId || undefined,
          min_score: minScore ? Number(minScore) : undefined,
          max_score: maxScore ? Number(maxScore) : undefined,
          order,
        },
      });

      setData(res.data);
    } catch (e: any) {
      console.error(e);
      showError(e?.response?.data?.message || "Failed to load broadsheet");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function computeBroadsheet() {
    try {
      setComputing(true);

      // NOTE: compute endpoint stays same (positions). Subject filtering is for viewing.
      const res = await authApi.post<BroadsheetResponse>(
        `/result-batches/${batchId}/broadsheet/compute`,
        null,
        { params: { include_previous: includePrevious ? 1 : 0, rank_by: rankBy } }
      );

      setData(res.data);
      showSuccess("Broadsheet computed successfully ✅");
    } catch (e: any) {
      console.error(e);
      showError(e?.response?.data?.message || "Failed to compute broadsheet");
    } finally {
      setComputing(false);
    }
  }

  // ✅ Export CSV (client-side): exports whatever is currently loaded (including filtered rows).
  function exportCSVClient() {
    if (!data) return;

    const headers = [
      "Reg No",
      "Name",
      ...data.subjects.map((s) => `${s.name} (Total)`),
      ...data.subjects.map((s) => `${s.name} (Pos)`),
      "Average",
      "Overall Pos",
    ];

    const rows = data.rows.map((r) => {
      const totals = subjectIds.map((sid) => {
        const cell = r.subjects[sid];
        const total = includePrevious ? cell?.effective_total : cell?.total;
        return formatNum(total);
      });

      const positions = subjectIds.map((sid) => {
        const cell = r.subjects[sid];
        return cell?.position ?? "-";
      });

      return [
        r.reg_no || "-",
        r.name,
        ...totals,
        ...positions,
        formatNum(r.overall.average),
        r.overall.position ?? "-",
      ];
    });

    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;

    const suffix = filterSubjectId ? `_filtered_subject_${filterSubjectId}` : "";
    a.download = `broadsheet_batch_${data.batch.id}_${data.batch.term}_${data.batch.session}${suffix}.csv`;

    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const clearSubjectFilter = () => {
    setFilterSubjectId("");
    setMinScore("");
    setMaxScore("");
    setOrder("desc");
  };

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Broadsheet" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto px-4 d-flex flex-column min-vh-100" style={{ backgroundColor: "#f8f9fa" }}>
            {(loading || computing) && <Loader message={computing ? "Computing broadsheet..." : "Loading broadsheet..."} />}

            {/* HERO */}
            <div
              className="mt-4 p-4 position-relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: 16,
                boxShadow: "0 10px 30px rgba(102, 126, 234, 0.3)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-50px",
                  right: "-50px",
                  width: 200,
                  height: 200,
                  background: "rgba(255, 255, 255, 0.10)",
                  borderRadius: "50%",
                  filter: "blur(40px)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "-30px",
                  left: "-30px",
                  width: 150,
                  height: 150,
                  background: "rgba(255, 255, 255, 0.10)",
                  borderRadius: "50%",
                  filter: "blur(40px)",
                }}
              />

              <div className="row align-items-center position-relative g-3">
                <div className="col-lg-8">
                  <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                    <span
                      className="badge px-3 py-2"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        color: "#fff",
                        borderRadius: 999,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      <i className="bi bi-table me-1" />
                      Broadsheet
                    </span>

                    <span
                      className="badge px-3 py-2"
                      style={{
                        backgroundColor: "rgba(16, 185, 129, 0.9)",
                        color: "#fff",
                        borderRadius: 999,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      <i className="bi bi-award-fill me-1" />
                      Positions & Rankings
                    </span>

                    {filterSubjectId && (
                      <span
                        className="badge px-3 py-2"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.22)",
                          color: "#fff",
                          borderRadius: 999,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}
                        title="Filtered by subject score"
                      >
                        <i className="bi bi-funnel-fill me-1" />
                        Filter: {selectedSubjectName || `Subject #${filterSubjectId}`} ({order === "desc" ? "Highest" : "Lowest"})
                      </span>
                    )}
                  </div>

                  <h2 className="fw-bold text-white mb-2">{getGreeting()}! 👋</h2>

                  <p className="text-white mb-0" style={{ opacity: 0.9, fontSize: "1rem" }}>
                    View the class broadsheet, compute positions, filter students by subject score, and export results.
                  </p>
                </div>

                <div className="col-lg-4 d-none d-lg-block">
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(10px)",
                      borderRadius: 16,
                      padding: "1.25rem",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <span className="text-white" style={{ fontSize: "0.9rem", opacity: 0.9 }}>
                        Quick Summary
                      </span>
                      <i className="bi bi-sliders text-white" />
                    </div>

                    <div className="d-flex flex-column gap-2">
                      <div className="d-flex justify-content-between">
                        <span className="text-white" style={{ opacity: 0.85 }}>
                          Students
                        </span>
                        <span className="text-white fw-bold">{data ? data.meta.class_size : "—"}</span>
                      </div>

                      <div className="d-flex justify-content-between">
                        <span className="text-white" style={{ opacity: 0.85 }}>
                          Subjects
                        </span>
                        <span className="text-white fw-bold">{data ? data.subjects.length : "—"}</span>
                      </div>

                      <div className="d-flex justify-content-between">
                        <span className="text-white" style={{ opacity: 0.85 }}>
                          Mode
                        </span>
                        <span className="text-white fw-bold">{includePrevious ? "Cumulative" : "Current"}</span>
                      </div>

                      {filterSubjectId && (
                        <div className="d-flex justify-content-between">
                          <span className="text-white" style={{ opacity: 0.85 }}>
                            Filtered Rows
                          </span>
                          <span className="text-white fw-bold">{data ? data.rows.length : "—"}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.18)" }}>
                      <small className="text-white" style={{ opacity: 0.9 }}>
                        Batch: <b>#{data?.batch.id ?? batchId ?? "—"}</b> • Rank by: <b>{rankBy}</b>
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TOOLBAR */}
            <div className="card border-0 shadow-sm mb-4 mt-3" style={{ borderRadius: 12 }}>
              <div className="card-body p-3 p-md-4 d-flex flex-wrap gap-3 align-items-center justify-content-between">
                <div style={{ minWidth: 280 }}>
                  <div className="fw-semibold" style={{ color: "#1e293b" }}>
                    Class Broadsheet
                  </div>
                  <div className="text-muted small">
                    {data ? (
                      <>
                        Batch <b>#{data.batch.id}</b> • {data.batch.term} • {data.batch.session} • <StatusBadge status={data.batch.status} />
                      </>
                    ) : (
                      <>Batch #{batchId || "—"}</>
                    )}
                  </div>
                </div>

                <div className="d-flex flex-wrap gap-2 align-items-center">
                  {/* existing */}
                  <div className="form-check me-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="includePrev"
                      checked={includePrevious}
                      onChange={(e) => setIncludePrevious(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="includePrev">
                      Include previous (cumulative)
                    </label>
                  </div>

                  <select className="form-select" style={{ width: 200, borderRadius: 10 }} value={rankBy} onChange={(e) => setRankBy(e.target.value as any)}>
                    <option value="average">Rank by Average</option>
                    <option value="total">Rank by Total (N/A)</option>
                  </select>

                  {/* ✅ NEW: filter by subject score */}
                  <select
                    className="form-select"
                    style={{ width: 220, borderRadius: 10 }}
                    value={filterSubjectId}
                    onChange={(e) => setFilterSubjectId(e.target.value ? Number(e.target.value) : "")}
                    title="Filter rows by subject score"
                    disabled={!data?.subjects?.length}
                  >
                    <option value="">Filter by Subject (optional)</option>
                    {data?.subjects?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  <input
                    className="form-control"
                    style={{ width: 110, borderRadius: 10 }}
                    placeholder="Min"
                    value={minScore}
                    onChange={(e) => setMinScore(e.target.value.replace(/[^\d.]/g, ""))}
                    disabled={!filterSubjectId}
                    inputMode="decimal"
                  />

                  <input
                    className="form-control"
                    style={{ width: 110, borderRadius: 10 }}
                    placeholder="Max"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value.replace(/[^\d.]/g, ""))}
                    disabled={!filterSubjectId}
                    inputMode="decimal"
                  />

                  <select
                    className="form-select"
                    style={{ width: 140, borderRadius: 10 }}
                    value={order}
                    onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
                    disabled={!filterSubjectId}
                    title="Sort by selected subject score"
                  >
                    <option value="desc">Highest</option>
                    <option value="asc">Lowest</option>
                  </select>

                  {filterSubjectId && (
                    <button className="btn btn-outline-secondary" onClick={clearSubjectFilter} style={{ borderRadius: 10 }}>
                      <i className="bi bi-x-circle me-1" />
                      Clear filter
                    </button>
                  )}

                  {/* actions */}
                  <button className="btn btn-outline-secondary" onClick={() => navigate(-1)} style={{ borderRadius: 10 }}>
                    <i className="bi bi-arrow-left me-1" />
                    Back
                  </button>

                  <button className="btn btn-outline-primary" onClick={loadBroadsheet} disabled={loading || computing || !batchId} style={{ borderRadius: 10 }}>
                    <i className="bi bi-arrow-clockwise me-1" />
                    {loading ? "Refreshing..." : "Refresh"}
                  </button>

                  <button className="btn btn-primary" onClick={computeBroadsheet} disabled={computing || loading || !batchId} style={{ borderRadius: 10, fontWeight: 700 }}>
                    {computing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Computing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-calculator-fill me-2" />
                        Compute Positions
                      </>
                    )}
                  </button>

                  <button className="btn btn-success" onClick={exportCSVClient} disabled={!data || loading || computing} style={{ borderRadius: 10, fontWeight: 700 }} title={!data ? "Load broadsheet first" : ""}>
                    <i className="bi bi-download me-2" />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Optional hint row */}
              <div className="px-3 px-md-4 pb-3">
                <small className="text-muted">
                  Tip: Select a subject and set Min/Max to list only students within a score range. Sorting uses{" "}
                  <b>{includePrevious ? "effective_total (cumulative)" : "total (current term)"}</b>.
                </small>
              </div>
            </div>

            {/* TABLE */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
              <div className="card-body p-0">
                <div className="table-responsive" style={{ maxHeight: "70vh" }}>
                  <table className="table table-hover mb-0 align-middle">
                    <thead className="table-light" style={{ position: "sticky", top: 0, zIndex: 2 }}>
                      <tr className="text-muted small">
                        <th style={{ minWidth: 140 }} className="ps-4">
                          Reg No
                        </th>
                        <th style={{ minWidth: 260 }}>Name</th>

                        {data?.subjects.map((s) => (
                          <th key={s.id} style={{ minWidth: 160 }}>
                            <div className="fw-semibold">{s.name}</div>
                            <div className="text-muted small">Total / Pos</div>
                          </th>
                        ))}

                        <th style={{ minWidth: 120 }}>Average</th>
                        <th style={{ minWidth: 100 }} className="pe-4">
                          Pos
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {!data && !loading && (
                        <tr>
                          <td colSpan={999} className="text-center py-5">
                            <div className="fw-bold">No data loaded</div>
                            <div className="text-muted">Click “Refresh” to load the broadsheet.</div>
                          </td>
                        </tr>
                      )}

                      {data && data.rows.length === 0 && !loading && (
                        <tr>
                          <td colSpan={999} className="text-center py-5">
                            <div className="fw-bold">No students matched your filter</div>
                            <div className="text-muted">
                              Try widening the Min/Max score range, or <button className="btn btn-link p-0" onClick={clearSubjectFilter}>clear filter</button>.
                            </div>
                          </td>
                        </tr>
                      )}

                      {data?.rows?.map((r) => (
                        <tr key={r.student_result_id}>
                          <td className="ps-4 fw-semibold">{r.reg_no || "-"}</td>
                          <td>
                            <div className="fw-semibold">{r.name}</div>
                            <div className="text-muted small">Result ID: {r.student_result_id}</div>
                          </td>

                          {subjectIds.map((sid) => {
                            const cell = r.subjects[sid];
                            const total = includePrevious ? cell?.effective_total : cell?.total;

                            const isHighlighted = filterSubjectId && String(filterSubjectId) === sid;

                            return (
                              <td key={`${r.student_result_id}-${sid}`}>
                                <div className="d-flex flex-column">
                                  <span className="fw-semibold" style={isHighlighted ? { color: "#0d6efd" } : undefined}>
                                    {formatNum(total)}
                                  </span>
                                  <span className="text-muted small">Pos: {cell?.position ?? "-"}</span>
                                </div>
                              </td>
                            );
                          })}

                          <td className="fw-semibold">{formatNum(r.overall.average)}</td>
                          <td className="pe-4 fw-semibold">{r.overall.position ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {data && (
                  <div className="d-flex justify-content-between align-items-center p-3 border-top flex-wrap gap-2">
                    <div className="text-muted small">
                      Students: <span className="fw-semibold">{data.meta.class_size}</span> • Subjects:{" "}
                      <span className="fw-semibold">{data.subjects.length}</span>
                      {filterSubjectId && (
                        <>
                          {" "}
                          • Filtered rows: <span className="fw-semibold">{data.rows.length}</span>
                        </>
                      )}
                    </div>
                    <div className="text-muted small">
                      {includePrevious ? "Cumulative mode ON" : "Cumulative mode OFF"}
                      {filterSubjectId && (
                        <>
                          {" "}
                          • Sorted: <span className="fw-semibold">{order === "desc" ? "Highest" : "Lowest"}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto">
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}