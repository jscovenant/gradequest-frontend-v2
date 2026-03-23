// src/pages/Teachers/TeacherSubjectsPage.tsx
import { useEffect, useMemo, useState } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

type Teacher = { id: number; firstname?: string; surname?: string };
type Subject = { id: number; name: string };

type Assignment = {
  teacher_id: number;
  subject_id: number;
  teacher?: Teacher | null;
  subject?: Subject | null;
};

function capitalize(str?: string | null) {
  if (!str) return "";
  const s = String(str).trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function fullName(t?: Teacher | null) {
  return [capitalize(t?.firstname), capitalize(t?.surname)].filter(Boolean).join(" ").trim() || "—";
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function TeacherSubjectsPage() {
  const { showSuccess, showError } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // page loading
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  // data
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // filters
  const [teacherQuery, setTeacherQuery] = useState("");
  const [subjectQuery, setSubjectQuery] = useState("");
  const [onlyAssigned, setOnlyAssigned] = useState(false);

  // modal state (assign subjects)
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | "">("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [modalSubjectSearch, setModalSubjectSearch] = useState("");

  // boot loader
  useEffect(() => {
    const t = window.setTimeout(() => setLoadingPage(false), 120);
    return () => window.clearTimeout(t);
  }, []);

  const normalizeAssignments = (raw: any): Assignment[] => {
    const list: any[] = Array.isArray(raw) ? raw : raw?.data ?? raw?.assignments ?? [];
    return list
      .map((a) => ({
        teacher_id: Number(a.teacher_id ?? a.teacher?.id ?? 0),
        subject_id: Number(a.subject_id ?? a.subject?.id ?? 0),
        teacher: a.teacher
          ? { id: Number(a.teacher.id), firstname: a.teacher.firstname, surname: a.teacher.surname }
          : undefined,
        subject: a.subject ? { id: Number(a.subject.id), name: a.subject.name } : undefined,
      }))
      .filter((a) => a.teacher_id > 0 && a.subject_id > 0);
  };

  const fetchAll = async () => {
    setLoadingData(true);
    try {
      const [tRes, sRes, aRes] = await Promise.all([
        authApi.get("/teachers"),
        authApi.get("/subjects"),
        authApi.get("/teacher-subjects"),
      ]);

      const tList: Teacher[] = (tRes.data?.data ?? tRes.data ?? []).map((t: any) => ({
        id: Number(t.id),
        firstname: t.firstname,
        surname: t.surname,
      }));

      const sList: Subject[] = (sRes.data?.data ?? sRes.data ?? []).map((s: any) => ({
        id: Number(s.id),
        name: String(s.name ?? "").trim(),
      }));

      setTeachers(tList);
      setSubjects(sList);
      setAssignments(normalizeAssignments(aRes.data));
    } catch (e: any) {
      console.error(e);
      showError(e?.response?.data?.message || "Failed to load teacher-subject data.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assignedTeacherIds = useMemo(() => new Set(assignments.map((a) => a.teacher_id)), [assignments]);

  const assignmentsByTeacher = useMemo(() => {
    const map = new Map<number, Assignment[]>();
    for (const a of assignments) {
      const arr = map.get(a.teacher_id) ?? [];
      arr.push(a);
      map.set(a.teacher_id, arr);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((x, y) => String(x.subject?.name ?? "").localeCompare(String(y.subject?.name ?? "")));
      map.set(k, arr);
    }
    return map;
  }, [assignments]);

  const teacherNameById = (id: number) => {
    const t = teachers.find((x) => x.id === id);
    return fullName(t ?? null);
  };

  // ===== helper: get assigned subject ids for a teacher =====
  const assignedSubjectIdsForTeacher = (teacherId: number) => {
    return assignments
      .filter((a) => a.teacher_id === teacherId)
      .map((a) => a.subject_id)
      .filter((x) => Number(x) > 0);
  };

  const filteredTeachers = useMemo(() => {
    const q = teacherQuery.trim().toLowerCase();
    let list = teachers;

    if (onlyAssigned) list = list.filter((t) => assignedTeacherIds.has(t.id));
    if (!q) return list;

    return list.filter((t) => {
      const name = `${t.firstname ?? ""} ${t.surname ?? ""}`.toLowerCase();
      return name.includes(q) || String(t.id).includes(q);
    });
  }, [teachers, teacherQuery, onlyAssigned, assignedTeacherIds]);

  const totalAssignments = assignments.length;
  const totalTeachers = teachers.length;
  const totalSubjects = subjects.length;
  const teachersWithSubjects = assignedTeacherIds.size;

  // ===== MODAL =====
  const openAssignModal = (teacherId?: number) => {
    setModalSubjectSearch("");

    const tid = teacherId ?? "";
    setSelectedTeacherId(tid);

    // ✅ Pre-check subjects already assigned
    if (teacherId) {
      setSelectedSubjectIds(assignedSubjectIdsForTeacher(teacherId));
    } else {
      setSelectedSubjectIds([]);
    }

    setShowAssignModal(true);
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedTeacherId("");
    setSelectedSubjectIds([]);
    setModalSubjectSearch("");
  };

  // ✅ When teacher changes inside modal, auto-load their assigned subjects
  useEffect(() => {
    if (!showAssignModal) return;

    const tid = Number(selectedTeacherId);
    if (!tid) {
      setSelectedSubjectIds([]);
      return;
    }

    setSelectedSubjectIds(assignedSubjectIdsForTeacher(tid));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeacherId, showAssignModal, assignments]);

  const toggleSubject = (id: number) => {
    setSelectedSubjectIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const modalSubjects = useMemo(() => {
    const q = modalSubjectSearch.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((s) => s.name.toLowerCase().includes(q));
  }, [subjects, modalSubjectSearch]);

  const modalAllSelected = useMemo(() => {
    if (!modalSubjects.length) return false;
    const set = new Set(selectedSubjectIds);
    return modalSubjects.every((s) => set.has(s.id));
  }, [modalSubjects, selectedSubjectIds]);

  const toggleSelectAllModal = () => {
    const visibleIds = modalSubjects.map((s) => s.id);
    const set = new Set(selectedSubjectIds);
    if (modalAllSelected) {
      setSelectedSubjectIds(selectedSubjectIds.filter((id) => !visibleIds.includes(id)));
    } else {
      visibleIds.forEach((id) => set.add(id));
      setSelectedSubjectIds(Array.from(set));
    }
  };

  // ✅ SYNC: add new + remove unchecked
  const assignSubjects = async () => {
    const teacherId = Number(selectedTeacherId);
    if (!teacherId) return showError("Please select a teacher.");

    setSaving(true);
    try {
      const existing = new Set(assignedSubjectIdsForTeacher(teacherId));
      const next = new Set(selectedSubjectIds);

      const toRemove = Array.from(existing).filter((id) => !next.has(id));
      const toAdd = Array.from(next).filter((id) => !existing.has(id));

      // remove unchecked
      if (toRemove.length) {
        await Promise.all(toRemove.map((sid) => authApi.delete(`/teacher-subjects/${teacherId}/${sid}`)));
      }

      // add new checked (or re-send all selected; we only send additions)
      if (toAdd.length) {
        const res = await authApi.post("/teacher-subjects", {
          teacher_id: teacherId,
          subject_ids: toAdd,
        });
        showSuccess(res?.data?.message || "Subjects assigned successfully.");
      } else {
        // if only removals happened
        showSuccess("Assignments updated successfully.");
      }

      closeAssignModal();
      await fetchAll();
    } catch (e: any) {
      console.error(e);
      showError(e?.response?.data?.message || "Failed to update assignments.");
    } finally {
      setSaving(false);
    }
  };

  const removeAssignment = async (teacherId: number, subjectId: number) => {
    const ok = window.confirm("Remove this subject from the teacher?");
    if (!ok) return;

    setSaving(true);
    try {
      const res = await authApi.delete(`/teacher-subjects/${teacherId}/${subjectId}`);
      showSuccess(res?.data?.message || "Subject removed from teacher.");
      await fetchAll();
    } catch (e: any) {
      console.error(e);
      showError(e?.response?.data?.message || "Failed to remove assignment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Teacher's Subjects" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main
            className="col-md-9 col-lg-10 ms-auto px-4 d-flex flex-column min-vh-100"
            style={{ backgroundColor: "#f8f9fa" }}
          >
            {(loadingPage || loadingData || saving) && (
              <Loader message={saving ? "Saving changes..." : loadingData ? "Loading assignments..." : "Loading..."} />
            )}

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
                  top: "-55px",
                  right: "-55px",
                  width: 210,
                  height: 210,
                  background: "rgba(255,255,255,0.10)",
                  borderRadius: "50%",
                  filter: "blur(42px)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "-35px",
                  left: "-35px",
                  width: 170,
                  height: 170,
                  background: "rgba(255,255,255,0.10)",
                  borderRadius: "50%",
                  filter: "blur(42px)",
                }}
              />

              <div className="row align-items-center position-relative g-3">
                <div className="col-lg-8">
                  <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                    <span
                      className="badge px-3 py-2"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.18)",
                        color: "#fff",
                        borderRadius: 999,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      <i className="bi bi-journal-bookmark-fill me-1" />
                      Teacher Subject Assignment
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
                      <i className="bi bi-shield-check me-1" />
                      Manage teaching workload
                    </span>
                  </div>

                  <h2 className="fw-bold text-white mb-2">{getGreeting()}, Admin 👋</h2>
                  <p className="text-white mb-4" style={{ opacity: 0.9, fontSize: "1rem" }}>
                    Assign subjects to teachers, view all assignments, and remove subjects when needed.
                  </p>

                  <div className="d-flex flex-wrap gap-2">
                    <button
                      className="btn btn-light px-4 py-2 d-flex align-items-center gap-2"
                      style={{ borderRadius: 10, fontWeight: 700, boxShadow: "0 4px 12px rgba(0,0,0,0.10)" }}
                      onClick={() => openAssignModal()}
                      disabled={loadingData}
                    >
                      <i className="bi bi-plus-circle" />
                      Assign Subjects
                    </button>

                    <button
                      className="btn px-4 py-2 d-flex align-items-center gap-2"
                      style={{
                        borderRadius: 10,
                        fontWeight: 700,
                        backgroundColor: "rgba(255,255,255,0.20)",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.30)",
                      }}
                      onClick={() => fetchAll()}
                      disabled={loadingData}
                    >
                      <i className="bi bi-arrow-clockwise" />
                      Refresh
                    </button>
                  </div>
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
                        Quick Stats
                      </span>
                      <i className="bi bi-graph-up text-white" />
                    </div>

                    <div className="d-flex flex-column gap-2">
                      <div className="d-flex justify-content-between">
                        <span className="text-white" style={{ opacity: 0.85 }}>
                          Teachers
                        </span>
                        <span className="text-white fw-bold">{loadingData ? "..." : totalTeachers}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-white" style={{ opacity: 0.85 }}>
                          Subjects
                        </span>
                        <span className="text-white fw-bold">{loadingData ? "..." : totalSubjects}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-white" style={{ opacity: 0.85 }}>
                          Assignments
                        </span>
                        <span className="text-white fw-bold">{loadingData ? "..." : totalAssignments}</span>
                      </div>
                      <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.18)" }}>
                        <small className="text-white" style={{ opacity: 0.85 }}>
                          Teachers assigned: <b>{loadingData ? "..." : teachersWithSubjects}</b>
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TOOLBAR */}
            <div className="card border-0 shadow-sm mb-4 mt-3" style={{ borderRadius: 12 }}>
              <div className="card-body p-3 p-md-4 d-flex flex-wrap gap-2 align-items-center justify-content-between">
                <div style={{ minWidth: 260 }}>
                  <div className="fw-semibold" style={{ color: "#1e293b" }}>
                    Directory & Filters
                  </div>
                  <div className="text-muted small">Search teachers, search subjects, and optionally show only assigned teachers.</div>
                </div>

                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <div className="input-group" style={{ minWidth: 260 }}>
                    <span className="input-group-text bg-white">
                      <i className="bi bi-search" />
                    </span>
                    <input
                      className="form-control"
                      placeholder="Search teacher (e.g. Ade)"
                      value={teacherQuery}
                      onChange={(e) => setTeacherQuery(e.target.value)}
                    />
                    {teacherQuery.trim() ? (
                      <button className="btn btn-outline-secondary" onClick={() => setTeacherQuery("")} title="Clear">
                        <i className="bi bi-x-lg" />
                      </button>
                    ) : null}
                  </div>

                  <div className="input-group" style={{ minWidth: 260 }}>
                    <span className="input-group-text bg-white">
                      <i className="bi bi-funnel" />
                    </span>
                    <input
                      className="form-control"
                      placeholder="Search subject (e.g. Maths)"
                      value={subjectQuery}
                      onChange={(e) => setSubjectQuery(e.target.value)}
                    />
                    {subjectQuery.trim() ? (
                      <button className="btn btn-outline-secondary" onClick={() => setSubjectQuery("")} title="Clear">
                        <i className="bi bi-x-lg" />
                      </button>
                    ) : null}
                  </div>

                  <div className="form-check ms-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="onlyAssigned"
                      checked={onlyAssigned}
                      onChange={(e) => setOnlyAssigned(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="onlyAssigned">
                      Only assigned
                    </label>
                  </div>

                  <button className="btn btn-primary" style={{ borderRadius: 10, fontWeight: 700 }} onClick={() => openAssignModal()}>
                    <i className="bi bi-plus-circle me-1" />
                    Assign
                  </button>
                </div>
              </div>
            </div>

            {/* CONTENT GRID */}
            <div className="row g-3 mb-4">
              {/* LEFT: TEACHERS */}
              <div className="col-12 col-lg-6">
                <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                  <div className="card-body p-3 p-md-4">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div>
                        <div className="fw-semibold" style={{ color: "#1e293b" }}>
                          Teachers
                        </div>
                        <div className="text-muted small">Select a teacher to assign subjects quickly.</div>
                      </div>
                      <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                        {filteredTeachers.length} shown
                      </span>
                    </div>

                    <div style={{ maxHeight: 520, overflow: "auto" }}>
                      {filteredTeachers.length === 0 ? (
                        <div className="text-center text-muted py-5">
                          <i className="bi bi-emoji-frown fs-3 d-block mb-2" />
                          No teachers found.
                        </div>
                      ) : (
                        <div className="list-group">
                          {filteredTeachers.map((t) => {
                            const count = assignmentsByTeacher.get(t.id)?.length ?? 0;
                            const isAssigned = count > 0;

                            return (
                              <button
                                key={t.id}
                                type="button"
                                className="list-group-item list-group-item-action d-flex align-items-center justify-content-between"
                                onClick={() => openAssignModal(t.id)}
                                style={{ borderRadius: 10, marginBottom: 8 }}
                              >
                                <div>
                                  <div className="fw-semibold">{fullName(t)}</div>
                                  <div className="text-muted small">ID: {t.id}</div>
                                </div>

                                <div className="d-flex align-items-center gap-2">
                                  <span className={`badge ${isAssigned ? "bg-success" : "bg-secondary"}`} style={{ borderRadius: 999 }}>
                                    {isAssigned ? `${count} subject(s)` : "No subjects"}
                                  </span>
                                  <i className="bi bi-chevron-right text-muted" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="text-muted small mt-2">
                      <i className="bi bi-info-circle me-1" />
                      Tip: Clicking a teacher opens the Assign modal with that teacher pre-selected.
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: ASSIGNMENTS */}
              <div className="col-12 col-lg-6">
                <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                  <div className="card-body p-3 p-md-4">
                    <div className="input-group mb-3">
                      <span className="input-group-text bg-white">
                        <i className="bi bi-search" />
                      </span>
                      <input
                        className="form-control"
                        placeholder="Filter subjects in assignment list (e.g. English)"
                        value={subjectQuery}
                        onChange={(e) => setSubjectQuery(e.target.value)}
                      />
                      {subjectQuery.trim() ? (
                        <button className="btn btn-outline-secondary" onClick={() => setSubjectQuery("")} title="Clear">
                          <i className="bi bi-x-lg" />
                        </button>
                      ) : null}
                    </div>

                    <div style={{ maxHeight: 520, overflow: "auto" }}>
                      {assignments.length === 0 ? (
                        <div className="text-center text-muted py-5">
                          <i className="bi bi-info-circle fs-3 d-block mb-2" />
                          No assignments yet.
                          <div className="small">Click “Assign Subjects” to start.</div>
                        </div>
                      ) : (
                        Array.from(assignmentsByTeacher.entries())
                          .sort((a, b) => teacherNameById(a[0]).localeCompare(teacherNameById(b[0])))
                          .map(([teacherId, list]) => {
                            const q = subjectQuery.trim().toLowerCase();
                            const filtered = q ? list.filter((x) => (x.subject?.name ?? "").toLowerCase().includes(q)) : list;
                            if (q && filtered.length === 0) return null;

                            return (
                              <div key={teacherId} className="mb-3">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                  <div className="fw-bold" style={{ color: "#1e293b" }}>
                                    {teacherNameById(teacherId)}
                                  </div>
                                  <span className="badge bg-light text-dark" style={{ borderRadius: 999 }}>
                                    {filtered.length} subject(s)
                                  </span>
                                </div>

                                <div className="d-flex flex-wrap gap-2">
                                  {filtered.map((a) => (
                                    <span
                                      key={`${a.teacher_id}-${a.subject_id}`}
                                      className="badge bg-white text-dark border d-inline-flex align-items-center gap-2 px-3 py-2"
                                      style={{ borderRadius: 999 }}
                                    >
                                      <i className="bi bi-book" />
                                      {a.subject?.name ?? `Subject #${a.subject_id}`}
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        style={{ borderRadius: 999, padding: "2px 8px" }}
                                        onClick={() => removeAssignment(a.teacher_id, a.subject_id)}
                                        title="Remove"
                                      >
                                        <i className="bi bi-x-lg" />
                                      </button>
                                    </span>
                                  ))}
                                </div>

                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary mt-2"
                                  style={{ borderRadius: 10 }}
                                  onClick={() => openAssignModal(teacherId)}
                                >
                                  <i className="bi bi-plus-circle me-1" />
                                  Add / Edit subjects
                                </button>

                                <hr className="mt-3 mb-0" />
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <Footer />
            </div>
          </main>
        </div>
      </div>

      {/* ASSIGN MODAL */}
      {showAssignModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: "rgba(0,0,0,.55)", backdropFilter: "blur(7px)", zIndex: 1200 }}
          onMouseDown={closeAssignModal}
        >
          <div
            className="card border-0 shadow-lg"
            style={{ width: "min(980px, 96vw)", maxHeight: "92vh", borderRadius: 18, overflow: "hidden" }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-3 p-md-4 text-white" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
              <div className="d-flex align-items-start justify-content-between gap-2">
                <div>
                  <h5 className="fw-bold mb-1">
                    <i className="bi bi-plus-circle me-2" />
                    Assign Subjects to Teacher
                  </h5>
                  <div className="small" style={{ opacity: 0.9 }}>
                    Subjects already assigned are pre-selected.
                  </div>
                </div>

                <button className="btn btn-outline-light" style={{ borderRadius: 10 }} onClick={closeAssignModal}>
                  <i className="bi bi-x-lg" />
                </button>
              </div>
            </div>

            <div className="p-3 p-md-4" style={{ background: "#f8f9fa", overflow: "auto", maxHeight: "calc(92vh - 150px)" }}>
              <div className="row g-3">
                <div className="col-12 col-lg-5">
                  <label className="form-label fw-semibold small mb-1">Teacher *</label>
                  <select
                    className="form-select"
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">-- Select Teacher --</option>
                    {teachers
                      .slice()
                      .sort((a, b) => fullName(a).localeCompare(fullName(b)))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {fullName(t)}
                        </option>
                      ))}
                  </select>

                  {selectedTeacherId ? (
                    <div className="alert alert-info mt-3 mb-0" style={{ borderRadius: 12 }}>
                      Editing assignments for: <b>{teacherNameById(Number(selectedTeacherId))}</b>
                      <div className="small mt-1">
                        Currently selected: <b>{selectedSubjectIds.length}</b> subject(s)
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted small mt-2">Tip: Click a teacher on the left to open this modal pre-filled.</div>
                  )}
                </div>

                <div className="col-12 col-lg-7">
                  <div className="d-flex align-items-center justify-content-between">
                    <label className="form-label fw-semibold small mb-1">Subjects *</label>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      style={{ borderRadius: 10 }}
                      onClick={toggleSelectAllModal}
                      disabled={modalSubjects.length === 0}
                      title="Select / Unselect visible"
                    >
                      <i className="bi bi-check2-square me-1" />
                      {modalAllSelected ? "Unselect visible" : "Select visible"}
                    </button>
                  </div>

                  <div className="input-group mb-2">
                    <span className="input-group-text bg-white">
                      <i className="bi bi-search" />
                    </span>
                    <input
                      className="form-control"
                      placeholder="Search subjects..."
                      value={modalSubjectSearch}
                      onChange={(e) => setModalSubjectSearch(e.target.value)}
                    />
                    {modalSubjectSearch.trim() ? (
                      <button className="btn btn-outline-secondary" onClick={() => setModalSubjectSearch("")} title="Clear">
                        <i className="bi bi-x-lg" />
                      </button>
                    ) : null}
                  </div>

                  <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                    <div className="card-body" style={{ maxHeight: 360, overflow: "auto" }}>
                      {modalSubjects.length === 0 ? (
                        <div className="text-center text-muted py-4">
                          <i className="bi bi-emoji-frown fs-3 d-block mb-2" />
                          No subjects found.
                        </div>
                      ) : (
                        <div className="row g-2">
                          {modalSubjects.map((s) => {
                            const checked = selectedSubjectIds.includes(s.id);
                            return (
                              <div className="col-12 col-md-6" key={s.id}>
                                <label
                                  className="d-flex align-items-center justify-content-between border rounded p-2 bg-white"
                                  style={{ cursor: "pointer" }}
                                >
                                  <div className="d-flex align-items-center gap-2">
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      checked={checked}
                                      onChange={() => toggleSubject(s.id)}
                                      disabled={!selectedTeacherId}
                                      title={!selectedTeacherId ? "Select a teacher first" : undefined}
                                    />
                                    <span className="fw-semibold">{s.name}</span>
                                  </div>
                                  <span className={`badge ${checked ? "bg-success" : "bg-secondary"}`} style={{ borderRadius: 999 }}>
                                    {checked ? "Selected" : "—"}
                                  </span>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-muted small mt-2">
                    Selected: <b>{selectedSubjectIds.length}</b>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 px-md-4 border-top bg-white">
              <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                <small className="text-muted">
                  <i className="bi bi-info-circle me-1" />
                  This will <b>sync</b> (add + remove) assignments for the selected teacher.
                </small>

                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary" style={{ borderRadius: 10 }} onClick={closeAssignModal} disabled={saving}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ borderRadius: 10, fontWeight: 800 }}
                    onClick={assignSubjects}
                    disabled={saving || !selectedTeacherId}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2" />
                        Save Assignment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}