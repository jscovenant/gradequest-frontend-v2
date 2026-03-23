// src/pages/Admin/Academics/SubjectsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";
/* =========================
   TYPES
========================= */
type Department = { id: number; name: string };
type Section = { id: number; name: string };

type Subject = {
  id: number;
  name: string;
  subject_id?: string; // backend generates "SCI001" style
  department_id: number;
  section_id?: number | null;
  school_id?: number;
  created_at?: string;
  updated_at?: string;

  section?: { id: number; name: string } | null;
  department?: { id: number; name: string } | null;
};

/* =========================
   HELPERS
========================= */
function getErrorMessage(err: any): string {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (status === 409) return data?.message ?? "This item already exists.";
  if (status === 404) return data?.message ?? "Not found.";
  if (status === 422) {
    const errors = data?.errors;
    if (errors) {
      const firstKey = Object.keys(errors)[0];
      const firstMsg = errors[firstKey]?.[0];
      if (firstMsg) return firstMsg;
    }
    return data?.message ?? "Validation error.";
  }
  return data?.message ?? err?.message ?? "Something went wrong.";
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/* =========================
   PAGE
========================= */
export default function SubjectsPage() {
  const { showSuccess, showError } = useToast();

  // layout
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // loading
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingSections, setLoadingSections] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // selection / ui
  const [departmentId, setDepartmentId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  // create
  const [createName, setCreateName] = useState("");

  // edit
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  // assign-section
  const [selectedIds, setSelectedIds] = useState<Record<number, boolean>>({});
  const [assignSectionId, setAssignSectionId] = useState<string>("");

  const isBusy = (key: string) => busyKey === key;

  /* =========================
     FETCH
  ========================= */
  async function fetchDepartments() {
    try {
      setLoadingDepartments(true);
      // common in your project: "/student-department"
      const res = await authApi.get<Department[]>("/student-department");
      setDepartments(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setLoadingDepartments(false);
    }
  }

  async function fetchSections() {
    try {
      setLoadingSections(true);
      // per your SubjectController route: GET /sections
      const res = await authApi.get<Section[]>("/sections");
      setSections(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setLoadingSections(false);
    }
  }

  async function fetchSubjects(depId: string) {
    if (!depId) {
      setSubjects([]);
      setSelectedIds({});
      return;
    }

    try {
      setLoadingSubjects(true);
      const res = await authApi.get<Subject[]>(`/departments/${depId}/subjects`);
      const list = Array.isArray(res.data) ? res.data : [];

      setSubjects(list);

      // ✅ pre-check if subject already assigned to ANY section
      const nextSelected: Record<number, boolean> = {};
      list.forEach((s) => {
        nextSelected[s.id] = s.section_id != null;
      });
      setSelectedIds(nextSelected);
    } catch (err: any) {
      showError(getErrorMessage(err));
      setSubjects([]);
      setSelectedIds({});
    } finally {
      setLoadingSubjects(false);
    }
  }

  useEffect(() => {
    setLoadingPage(true);
    Promise.all([fetchDepartments(), fetchSections()]).finally(() => setLoadingPage(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (departmentId) fetchSubjects(departmentId);
    else {
      setSubjects([]);
      setSelectedIds({});
      setQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId]);

  /* =========================
     DERIVED
  ========================= */
  const selectedDepartment = useMemo(
    () => departments.find((d) => String(d.id) === String(departmentId)),
    [departments, departmentId]
  );

  const sectionName = (s: Subject) =>
    s.section?.name ?? sections.find((x) => x.id === s.section_id)?.name ?? "—";

  const filteredSubjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((s) => {
      const secName = sectionName(s);
      const hay = `${s.name ?? ""} ${s.subject_id ?? ""} ${secName}`.toLowerCase();
      return hay.includes(q);
    });
  }, [subjects, query, sections]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalSubjects = subjects.length;

  const selectedCount = useMemo(() => Object.values(selectedIds).filter(Boolean).length, [selectedIds]);

  const allFilteredSelected =
    !!departmentId &&
    filteredSubjects.length > 0 &&
    filteredSubjects.every((s) => !!selectedIds[s.id]);

  /* =========================
     PAGINATION
  ========================= */
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => setPage(1), [query, departmentId]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredSubjects.length / perPage)), [filteredSubjects.length]);
  const safePage = clamp(page, 1, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return filteredSubjects.slice(start, start + perPage);
  }, [filteredSubjects, safePage]);

  /* =========================
     ACTIONS
  ========================= */
  async function createSubject() {
    if (!departmentId) return showError("Please select a department first.");
    const name = createName.trim();
    if (!name) return showError("Please enter a subject name.");

    try {
      setBusyKey("subject:create");
      const res = await authApi.post(`/departments/${departmentId}/subjects`, { name });
      const code = res.data?.subject_code ? ` (${res.data.subject_code})` : "";
      showSuccess((res.data?.message ?? "Subject added successfully") + code);

      setCreateName("");
      setShowCreate(false);
      await fetchSubjects(departmentId);
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  function openEdit(subject: Subject) {
    setEditId(subject.id);
    setEditName(subject.name ?? "");
    setShowEdit(true);
  }

  async function updateSubject() {
    if (!editId) return;
    const name = editName.trim();
    if (!name) return showError("Please enter a subject name.");

    try {
      setBusyKey(`subject:update:${editId}`);
      const res = await authApi.put(`/subjects/${editId}`, { name });
      showSuccess(res.data?.message ?? "Subject updated successfully.");

      setShowEdit(false);
      setEditId(null);
      setEditName("");
      if (departmentId) await fetchSubjects(departmentId);
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function selectAllFiltered() {
    const next: Record<number, boolean> = { ...selectedIds };
    filteredSubjects.forEach((s) => (next[s.id] = true));
    setSelectedIds(next);
  }

  function clearSelection() {
    setSelectedIds({});
  }

  async function assignSectionToSelected() {
    if (!assignSectionId) return showError("Please select a section.");

    const ids = Object.entries(selectedIds)
      .filter(([_, v]) => v)
      .map(([k]) => Number(k));

    if (ids.length === 0) return showError("Please select at least one subject.");

    try {
      setBusyKey("subject:assign");
      const res = await authApi.post("/subjects/assign-section", {
        section_id: Number(assignSectionId),
        subject_ids: ids,
      });

      showSuccess(res.data?.message ?? "Subjects successfully assigned to section.");

      setShowAssign(false);
      setAssignSectionId("");
      setSelectedIds({});
      if (departmentId) await fetchSubjects(departmentId);
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  /* =========================
     STYLES (AdminDashboard template family)
  ========================= */
  const STAT_META = [
    { color: "#b45309", bg: "#fef3c7", label: "total in department" },
    { color: "#065f46", bg: "#d1fae5", label: "selected for bulk" },
    { color: "#1e40af", bg: "#dbeafe", label: "departments loaded" },
    { color: "#7c3aed", bg: "#ede9fe", label: "sections loaded" },
  ];

  return (
    <>
      <style>{`
        /* ======= SubjectsPage - AdminDashboard template style ======= */
        .db-main {
          background: var(--bs-body-bg, #f5f1eb);
          min-height: 100vh;
          font-family: "DM Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          padding: 28px 28px 0;
        }

        .db-hero {
          background: #0f172a;
          border-radius: 16px;
          padding: 32px 36px;
          position: relative;
          overflow: hidden;
          margin-bottom: 22px;
        }
        .db-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
        }
        .db-hero-glow {
          position: absolute;
          top: -60px;
          right: -60px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201, 168, 76, 0.10) 0%, transparent 65%);
          pointer-events: none;
        }
        .db-hero-glow2 {
          position: absolute;
          bottom: -40px;
          left: 30%;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .db-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          flex-wrap: wrap;
        }

        .db-session-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #e8c97a;
          background: rgba(201, 168, 76, 0.10);
          border: 1px solid rgba(201, 168, 76, 0.20);
          border-radius: 100px;
          padding: 4px 12px;
          margin-bottom: 14px;
        }
        .db-session-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          animation: dbPulse 2s ease infinite;
        }
        @keyframes dbPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.5); }
        }

        .db-greeting {
          font-family: "Lora", Georgia, serif;
          font-size: clamp(22px, 2.5vw, 32px);
          font-weight: 700;
          color: #fff;
          line-height: 1.1;
          margin-bottom: 8px;
        }
        .db-greeting em { font-style: italic; color: #e8c97a; }

        .db-hero-sub {
          font-size: 13.5px;
          font-weight: 300;
          color: #64748b;
          line-height: 1.65;
          max-width: 640px;
          margin-bottom: 18px;
        }

        .db-hero-btns { display:flex; gap:10px; flex-wrap:wrap; }

        .db-btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
          background: #c9a84c;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
          text-decoration: none;
          white-space: nowrap;
        }
        .db-btn-gold:hover { background: #e8c97a; transform: translateY(-1px); }
        .db-btn-gold:disabled { opacity: .55; cursor:not-allowed; transform:none; }

        .db-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.75);
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
          white-space: nowrap;
        }
        .db-btn-outline:hover { background: rgba(255, 255, 255, 0.06); color: #fff; border-color: rgba(255, 255, 255, 0.28); }
        .db-btn-outline:disabled { opacity: .55; cursor:not-allowed; }

        .db-hero-stat-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.09);
          backdrop-filter: blur(8px);
          border-radius: 12px;
          padding: 20px 24px;
          min-width: 260px;
        }
        .db-hero-stat-row { display:flex; flex-direction:column; gap:10px; }
        .db-hero-stat-item { display:flex; justify-content:space-between; align-items:center; gap:16px; }
        .db-hero-stat-label { font-size: 12px; font-weight: 300; color: #64748b; }
        .db-hero-stat-val { font-family: "Lora", serif; font-size: 18px; font-weight: 700; color: #fff; }
        .db-hero-stat-sep { height: 1px; background: rgba(255, 255, 255, 0.06); }

        .db-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 18px;
        }
        @media (max-width: 1199.98px) { .db-stats { grid-template-columns: repeat(2, 1fr);} }
        @media (max-width: 575.98px) { .db-stats { grid-template-columns: 1fr; } }

        .db-stat {
          background: #fff;
          border: 1px solid #ede8e0;
          border-radius: 14px;
          padding: 22px 20px;
          position: relative;
          overflow: hidden;
          cursor: default;
          transition: box-shadow 0.25s, transform 0.25s;
        }
        .db-stat:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.08); transform: translateY(-3px); }
        .db-stat::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: var(--sc, #b45309);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
        }
        .db-stat:hover::before { transform: scaleX(1); }

        .db-stat-head { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom: 14px; }
        .db-stat-icon {
          width: 42px; height: 42px;
          border-radius: 10px;
          background: var(--si, #fef3c7);
          color: var(--sc, #b45309);
          display:flex; align-items:center; justify-content:center;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .db-stat:hover .db-stat-icon { transform: scale(1.1) rotate(-4deg); }
        .db-stat-more { color: #c8bfb5; padding: 2px; }

        .db-stat-label { font-size: 12px; font-weight: 500; color: #9a8a7a; margin-bottom: 6px; letter-spacing: .03em; }
        .db-stat-val { font-family: "Lora", Georgia, serif; font-size: 28px; font-weight: 700; color: #1a1a2e; line-height: 1; }
        .db-stat-footer {
          display:flex; align-items:center; gap:6px;
          margin-top: 12px; padding-top: 10px;
          border-top: 1px solid rgba(0,0,0,0.06);
          font-size: 12px; color: #9a8a7a;
        }
        .db-stat-trend { color:#22c55e; font-weight:600; }

        .db-panel {
          background: #fff;
          border: 1px solid #ede8e0;
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .db-panel-head {
          display:flex;
          align-items:center;
          justify-content: space-between;
          padding: 18px 20px 16px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          gap: 12px;
          flex-wrap: wrap;
        }
        .db-panel-title-group { display:flex; align-items:center; gap:12px; }
        .db-panel-icon {
          width: 36px; height: 36px; border-radius: 9px;
          display:flex; align-items:center; justify-content:center;
          background: var(--pi, #fef3c7);
          color: var(--pc, #b45309);
          flex-shrink: 0;
        }
        .db-panel-title { font-family: "Lora", serif; font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 0; }
        .db-panel-sub { font-size: 11.5px; font-weight: 300; color: #9a8a7a; margin: 0; }

        .db-toolbar { display:flex; align-items:center; gap: 10px; flex-wrap: wrap; }
        .db-input {
          display:flex;
          align-items:center;
          gap: 8px;
          padding: 10px 12px;
          background: #faf8f5;
          border: 1px solid #e5ddd3;
          border-radius: 12px;
          min-width: 280px;
        }
        .db-input input {
          border: none;
          outline: none;
          background: transparent;
          width: 100%;
          font-size: 13.5px;
          color: #1a1a2e;
        }
        .db-chip-btn {
          display:inline-flex;
          align-items:center;
          gap: 6px;
          padding: 8px 12px;
          font-size: 12.5px;
          font-weight: 600;
          color: #7a6a5a;
          background: #f5f1eb;
          border: 1px solid #e5ddd3;
          border-radius: 10px;
          cursor: pointer;
          transition: background .2s, color .2s, transform .2s;
          white-space: nowrap;
        }
        .db-chip-btn:hover:not(:disabled) { background:#ede8e0; color:#1a1a2e; transform: translateY(-1px); }
        .db-chip-btn:disabled { opacity: .5; cursor: not-allowed; }

        .db-select {
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid #e5ddd3;
          background: #faf8f5;
          outline: none;
          font-size: 13.5px;
          color: #1a1a2e;
          min-width: 260px;
        }
        .db-select:focus {
          border-color: rgba(201,168,76,0.55);
          box-shadow: 0 0 0 4px rgba(201,168,76,0.18);
          background: #fff;
        }

        .db-table { width: 100%; border-collapse: collapse; }
        .db-table th {
          padding: 10px 16px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: #9a8a7a;
          background: #faf8f5;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          text-align: left;
          white-space: nowrap;
        }
        .db-table th:last-child { text-align: right; }
        .db-table td {
          padding: 13px 16px;
          font-size: 13.5px;
          color: #4a4a5a;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          vertical-align: middle;
        }
        .db-table tbody tr { transition: background 0.15s; }
        .db-table tbody tr:hover { background: #faf8f5; }
        .db-table tbody tr:last-child td { border-bottom: none; }

        .db-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          background: #f0ebe3;
          color: #7a6a5a;
          white-space: nowrap;
        }

        .db-actions { display:inline-flex; justify-content:flex-end; gap: 8px; flex-wrap: wrap; }
        .db-action-btn {
          display:inline-flex;
          align-items:center;
          gap: 6px;
          padding: 7px 12px;
          font-size: 12.5px;
          font-weight: 700;
          border-radius: 10px;
          cursor: pointer;
          border: 1px solid rgba(0,0,0,0.10);
          background: #fff;
          transition: transform .2s, box-shadow .2s, background .2s;
          white-space: nowrap;
        }
        .db-action-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 18px rgba(0,0,0,0.08); background: #faf8f5; }
        .db-action-btn:disabled { opacity: .5; cursor: not-allowed; }

        .db-action-primary { border-color: rgba(30, 64, 175, 0.25); color: #1e40af; }
        .db-action-gold    { border-color: rgba(180, 83, 9, 0.25); color: #b45309; }
        .db-action-green   { border-color: rgba(6, 95, 70, 0.25); color: #065f46; }

        .db-helper-row {
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          padding: 12px 14px;
          margin: 12px 0 18px;
          background: rgba(201,168,76,0.08);
          border: 1px solid rgba(201,168,76,0.20);
          border-radius: 14px;
        }
        .db-helper-left { display:flex; align-items:center; gap: 10px; flex-wrap: wrap; color:#7a6a5a; font-size: 12.5px; }
        .db-helper-right { display:flex; align-items:center; gap: 8px; flex-wrap: wrap; }

        .db-pagination {
          display:flex;
          align-items:center;
          justify-content: space-between;
          padding: 14px 16px;
          border-top: 1px solid rgba(0,0,0,0.06);
          flex-wrap: wrap;
          gap: 10px;
        }
        .db-page-info { font-size: 12px; color:#9a8a7a; }
        .db-page-btns { display:flex; align-items:center; gap: 8px; }
        .db-page-btn {
          display:inline-flex;
          align-items:center;
          gap: 6px;
          padding: 7px 12px;
          font-size: 12.5px;
          font-weight: 700;
          color: #7a6a5a;
          background: #f5f1eb;
          border: 1px solid #e5ddd3;
          border-radius: 10px;
          cursor: pointer;
          transition: background .2s, transform .2s, color .2s;
        }
        .db-page-btn:hover:not(:disabled) { background:#ede8e0; color:#1a1a2e; transform: translateY(-1px); }
        .db-page-btn:disabled { opacity: .45; cursor:not-allowed; }
        .db-page-current { font-size: 12px; color:#9a8a7a; }

        /* Modals */
        .db-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(7px);
          z-index: 1400;
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 12px;
        }
        .db-modal {
          width: min(900px, 96vw);
          max-height: 92vh;
          border-radius: 18px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 24px 70px rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.12);
        }
        .db-modal-head {
          padding: 18px 20px;
          background: linear-gradient(135deg, #0f172a 0%, #1f2937 100%);
          color: #fff;
          position: relative;
          overflow: hidden;
        }
        .db-modal-head::before {
          content:"";
          position:absolute;
          inset:0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events:none;
        }
        .db-modal-head-inner {
          position: relative;
          z-index: 1;
          display:flex;
          align-items:flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .db-modal-title {
          margin:0;
          font-family: "Lora", Georgia, serif;
          font-size: 16px;
          font-weight: 800;
        }
        .db-modal-sub {
          margin: 2px 0 0;
          color: rgba(255,255,255,0.72);
          font-size: 12.5px;
          font-weight: 300;
        }
        .db-modal-close {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.06);
          color: #fff;
          cursor: pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          transition: background .2s, border-color .2s, transform .2s;
          flex-shrink: 0;
        }
        .db-modal-close:hover:not(:disabled) { background: rgba(255,255,255,0.10); border-color: rgba(255,255,255,0.26); transform: translateY(-1px); }
        .db-modal-close:disabled { opacity: .5; cursor:not-allowed; }

        .db-modal-body { background:#f5f1eb; padding: 16px; overflow:auto; max-height: calc(92vh - 130px); }
        .db-modal-card { background:#fff; border: 1px solid #ede8e0; border-radius: 16px; padding: 16px; }

        .db-form-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 767.98px) { .db-form-grid { grid-template-columns: 1fr; } }

        .db-field label {
          display:block;
          font-size: 12px;
          font-weight: 800;
          color: #7a6a5a;
          margin-bottom: 6px;
          letter-spacing: .02em;
        }
        .db-field input, .db-field select {
          width: 100%;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid #e5ddd3;
          background: #faf8f5;
          outline: none;
          font-size: 13.5px;
          color: #1a1a2e;
        }
        .db-field input:focus, .db-field select:focus {
          border-color: rgba(201,168,76,0.55);
          box-shadow: 0 0 0 4px rgba(201,168,76,0.18);
          background: #fff;
        }
        .db-help { margin-top: 6px; font-size: 11.5px; color: #9a8a7a; }

        .db-modal-foot {
          padding: 14px 16px;
          background: #fff;
          border-top: 1px solid rgba(0,0,0,0.06);
          display:flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .db-btn {
          display:inline-flex;
          align-items:center;
          gap: 7px;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          border: 1px solid transparent;
          transition: transform .2s, box-shadow .2s, background .2s, border-color .2s;
          white-space: nowrap;
        }
        .db-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(0,0,0,0.10); }
        .db-btn:disabled { opacity: .55; cursor:not-allowed; box-shadow:none; transform:none; }

        .db-btn-secondary { background: #f5f1eb; border-color: #e5ddd3; color: #7a6a5a; }
        .db-btn-secondary:hover:not(:disabled) { background: #ede8e0; color:#1a1a2e; }

        .db-btn-primary { background: #c9a84c; color: #0f172a; border-color: rgba(201,168,76,0.35); }
        .db-btn-primary:hover:not(:disabled) { background:#e8c97a; }

        .db-btn-green { background: #10b981; color: #062a22; border-color: rgba(16,185,129,0.35); }
        .db-btn-green:hover:not(:disabled) { background: #34d399; }

        @keyframes dbSpin { to { transform: rotate(360deg); } }

        .db-muted { color: #9a8a7a; }
        .db-checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: #c9a84c; }
        .db-badge-code {
          display:inline-flex;
          align-items:center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          background: #ede8e0;
          color: #1a1a2e;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Subjects" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loadingPage && <Loader message="Loading subjects..." />}

            {/* ===== HERO ===== */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Academics • Subjects
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>Admin.</em>
                  </h1>

                  <p className="db-hero-sub">
                    Pick a department, manage subjects, and bulk-assign subjects to a section. Subjects already assigned are
                    pre-checked.
                  </p>

                  <div className="db-hero-btns">
                    <button
                      className="db-btn-gold"
                      onClick={() => setShowCreate(true)}
                      disabled={!departmentId || busyKey !== null}
                      title={!departmentId ? "Select a department first" : ""}
                      type="button"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      Add Subject
                    </button>

                    <button
                      className="db-btn-outline"
                      onClick={() => (departmentId ? fetchSubjects(departmentId) : fetchDepartments())}
                      disabled={busyKey !== null || (departmentId ? loadingSubjects : loadingDepartments)}
                      type="button"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        style={{ animation: loadingSubjects || loadingDepartments ? "dbSpin 0.8s linear infinite" : "none" }}
                      >
                        <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Refresh
                    </button>

                    <button
                      className="db-btn-outline"
                      onClick={() => setShowAssign(true)}
                      disabled={!departmentId || selectedCount === 0 || busyKey !== null}
                      title={selectedCount === 0 ? "Select subjects first" : ""}
                      type="button"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M7 8h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        <path d="M6.5 6.3l7 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M6.5 9.7l7-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <circle cx="6" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.4" />
                        <circle cx="14" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.4" />
                      </svg>
                      Assign Section ({selectedCount})
                    </button>
                  </div>
                </div>

                {/* Quick summary */}
                <div className="db-hero-stat-card d-none d-md-block">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a84c" }}>
                      Quick summary
                    </span>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M2 10V6M5 10V4M8 10V7M11 10V3" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div className="db-hero-stat-row">
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Departments</span>
                      <span className="db-hero-stat-val">{loadingDepartments ? "…" : departments.length}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Sections</span>
                      <span className="db-hero-stat-val">{loadingSections ? "…" : sections.length}</span>
                    </div>
                    <div className="db-hero-stat-sep" />
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Subjects (dept)</span>
                      <span className="db-hero-stat-val">{departmentId ? totalSubjects : "—"}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Department:{" "}
                      <span style={{ color: "#fff", fontWeight: 700 }}>{selectedDepartment?.name ?? "Not selected"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== STAT CARDS ===== */}
            <div className="db-stats">
              {[
                { title: "Total Subjects", value: departmentId ? totalSubjects : "—", hint: "total in department" },
                { title: "Selected", value: selectedCount, hint: "marked for bulk" },
                { title: "Departments", value: loadingDepartments ? "…" : departments.length, hint: "loaded" },
                { title: "Sections", value: loadingSections ? "…" : sections.length, hint: "loaded" },
              ].map((c, i) => {
                const m = STAT_META[i];
                const icons = [
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" key="i1">
                    <path d="M4 6l6-3 6 3-6 3-6-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M4 10l6 3 6-3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M4 14l6 3 6-3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>,
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" key="i2">
                    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M6 10l2.5 2.5L14 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>,
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" key="i3">
                    <path d="M7 6a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <rect x="5" y="8" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M10 12v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>,
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" key="i4">
                    <path d="M7 10h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M6.5 7.5l7 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M6.5 12.5l7-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <circle cx="6" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.4" />
                    <circle cx="14" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.4" />
                  </svg>,
                ];

                return (
                  <div className="db-stat" key={c.title} style={{ "--sc": m.color, "--si": m.bg } as React.CSSProperties}>
                    <div className="db-stat-head">
                      <div className="db-stat-icon">{icons[i]}</div>
                      <svg className="db-stat-more" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="4" cy="8" r="1.2" fill="currentColor" />
                        <circle cx="8" cy="8" r="1.2" fill="currentColor" />
                        <circle cx="12" cy="8" r="1.2" fill="currentColor" />
                      </svg>
                    </div>
                    <p className="db-stat-label">{c.title}</p>
                    <div className="db-stat-val">{c.value}</div>
                    <div className="db-stat-footer">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 9l3-4 2 2 3-5" stroke="#22c55e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="db-stat-trend">OK</span>
                      <span className="db-muted">{c.hint}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ===== PANEL: FILTERS + TABLE ===== */}
            <div className="db-panel">
              <div className="db-panel-head">
                <div className="db-panel-title-group">
                  <div className="db-panel-icon" style={{ "--pi": "#fef3c7", "--pc": "#b45309" } as React.CSSProperties}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 4.5h10M3 8h10M3 11.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="db-panel-title">Subjects</p>
                    <p className="db-panel-sub">Filter by department • Search • Bulk assign</p>
                  </div>
                </div>

                <div className="db-toolbar">
                  <select
                    className="db-select"
                    value={departmentId}
                    onChange={(e) => {
                      setDepartmentId(e.target.value);
                      setQuery("");
                    }}
                    disabled={loadingDepartments || busyKey !== null}
                    title="Select department"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>

                  <div className="db-input" title="Search subjects">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="7" cy="7" r="4.5" stroke="#9a8a7a" strokeWidth="1.4" />
                      <path d="M11 11l3 3" stroke="#9a8a7a" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <input
                      placeholder="Search subjects…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      disabled={!departmentId}
                    />
                    {query.trim() ? (
                      <button className="db-chip-btn" style={{ padding: "6px 10px", borderRadius: 10 }} onClick={() => setQuery("")} type="button">
                        Clear
                      </button>
                    ) : null}
                  </div>

                  <button
                    className="db-chip-btn"
                    onClick={() => (departmentId ? fetchSubjects(departmentId) : fetchDepartments())}
                    disabled={busyKey !== null || (departmentId ? loadingSubjects : loadingDepartments)}
                    type="button"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Refresh
                  </button>

                  <button
                    className="db-chip-btn"
                    onClick={() => setShowCreate(true)}
                    disabled={!departmentId || busyKey !== null}
                    title={!departmentId ? "Select a department first" : ""}
                    type="button"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    Add
                  </button>

                  <button
                    className="db-chip-btn"
                    onClick={() => setShowAssign(true)}
                    disabled={!departmentId || selectedCount === 0 || busyKey !== null}
                    title={selectedCount === 0 ? "Select subjects first" : ""}
                    type="button"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M7 8h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M6.5 6.3l7 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      <path d="M6.5 9.7l7-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      <circle cx="6" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.4" />
                      <circle cx="14" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                    Assign ({selectedCount})
                  </button>
                </div>
              </div>

              {/* selection helper */}
              {departmentId ? (
                <div className="db-helper-row">
                  <div className="db-helper-left">
                    <span>
                      Department: <b style={{ color: "#1a1a2e" }}>{selectedDepartment?.name ?? "—"}</b>
                    </span>
                    <span style={{ opacity: 0.6 }}>•</span>
                    <span>
                      Selected: <b style={{ color: "#1a1a2e" }}>{selectedCount}</b>
                    </span>
                    <span style={{ opacity: 0.6 }}>•</span>
                    <span>
                      Total: <b style={{ color: "#1a1a2e" }}>{totalSubjects}</b>
                    </span>
                  </div>

                  <div className="db-helper-right">
                    <button className="db-chip-btn" onClick={selectAllFiltered} disabled={busyKey !== null || filteredSubjects.length === 0} type="button">
                      Select All (Filtered)
                    </button>
                    <button className="db-chip-btn" onClick={clearSelection} disabled={busyKey !== null || selectedCount === 0} type="button">
                      Clear
                    </button>
                  </div>
                </div>
              ) : null}

              <div style={{ overflowX: "auto" }}>
                <table className="db-table">
                  <thead>
                    <tr>
                      <th style={{ width: 56 }}>
                        <input
                          type="checkbox"
                          className="db-checkbox"
                          checked={allFilteredSelected}
                          disabled={!departmentId || filteredSubjects.length === 0}
                          onChange={(e) => {
                            if (!departmentId) return;
                            if (e.target.checked) selectAllFiltered();
                            else clearSelection();
                          }}
                          title="Select all filtered"
                        />
                      </th>
                      <th>Subject</th>
                      <th style={{ width: 160 }}>Code</th>
                      <th style={{ width: 220 }}>Section</th>
                      <th style={{ width: 210, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {!departmentId ? (
                      <tr>
                        <td colSpan={5} style={{ padding: 34, textAlign: "center", color: "#9a8a7a" }}>
                          <div style={{ fontWeight: 900, color: "#1a1a2e" }}>Select a department</div>
                          <div style={{ marginTop: 6 }}>Choose a department to load its subjects.</div>
                        </td>
                      </tr>
                    ) : loadingSubjects ? (
                      <tr>
                        <td colSpan={5} style={{ padding: 28, textAlign: "center", color: "#9a8a7a" }}>
                          <span className="spinner-border spinner-border-sm" />{" "}
                          <span style={{ marginLeft: 8 }}>Loading subjects…</span>
                        </td>
                      </tr>
                    ) : pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: 34, textAlign: "center", color: "#9a8a7a" }}>
                          <div style={{ fontWeight: 900, color: "#1a1a2e" }}>No subjects found</div>
                          <div style={{ marginTop: 6 }}>Click “Add” to create one.</div>
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((s) => {
                        const busyEdit = isBusy(`subject:update:${s.id}`);
                        return (
                          <tr key={s.id}>
                            <td>
                              <input
                                type="checkbox"
                                className="db-checkbox"
                                checked={!!selectedIds[s.id]}
                                onChange={() => toggleSelect(s.id)}
                                title="Select subject"
                              />
                            </td>

                            <td>
                              <div style={{ fontWeight: 800, color: "#1a1a2e" }}>{s.name}</div>
                              <div style={{ fontSize: 12, color: "#9a8a7a" }}>ID: {s.id}</div>
                            </td>

                            <td>
                              <span className="db-badge-code">{s.subject_id ?? "—"}</span>
                            </td>

                            <td>
                              <span className="db-pill">
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M3 6h6" stroke="#7a6a5a" strokeWidth="1.4" strokeLinecap="round" />
                                </svg>
                                {sectionName(s)}
                              </span>
                            </td>

                            <td style={{ textAlign: "right" }}>
                              <div className="db-actions">
                                <button className="db-action-btn db-action-primary" onClick={() => openEdit(s)} disabled={busyKey !== null} type="button">
                                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                    <path
                                      d="M3 11.5V13h1.5L12.8 4.7 11.3 3.2 3 11.5z"
                                      stroke="currentColor"
                                      strokeWidth="1.4"
                                      strokeLinejoin="round"
                                    />
                                    <path d="M10.6 3.9l1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                  </svg>
                                  Edit
                                </button>

                                {busyEdit && (
                                  <span className="db-pill" style={{ background: "rgba(148,163,184,0.18)", color: "#475569" }}>
                                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ animation: "dbSpin .9s linear infinite" }}>
                                      <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                      <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Saving…
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* pagination */}
              {departmentId ? (
                <div className="db-pagination">
                  <div className="db-page-info">
                    Showing <b>{pageRows.length}</b> of <b>{filteredSubjects.length}</b> results • Page <b>{safePage}</b> of{" "}
                    <b>{totalPages}</b>
                  </div>

                  <div className="db-page-btns">
                    <button className="db-page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} type="button">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Prev
                    </button>

                    <span className="db-page-current">Page {safePage}</span>

                    <button className="db-page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} type="button">
                      Next
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <Footer />

            {/* =========================
                MODAL: CREATE SUBJECT
            ========================= */}
            {showCreate && (
              <div
                className="db-modal-backdrop"
                onMouseDown={() => {
                  if (busyKey) return;
                  setShowCreate(false);
                }}
              >
                <div className="db-modal" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="db-modal-head">
                    <div className="db-modal-head-inner">
                      <div>
                        <h3 className="db-modal-title">Add Subject</h3>
                        <p className="db-modal-sub">
                          Department: <b>{selectedDepartment?.name ?? "—"}</b>
                        </p>
                      </div>

                      <button className="db-modal-close" onClick={() => setShowCreate(false)} disabled={busyKey !== null} type="button" aria-label="Close">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="db-modal-body">
                    <div className="db-modal-card">
                      <div className="db-form-grid">
                        <div className="db-field" style={{ gridColumn: "1 / -1" }}>
                          <label>
                            Subject Name <span style={{ color: "#ef4444" }}>*</span>
                          </label>
                          <input placeholder="e.g. Mathematics" value={createName} onChange={(e) => setCreateName(e.target.value)} />
                          <div className="db-help">A code will be generated automatically (e.g. SCI001).</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="db-modal-foot">
                    <button className="db-btn db-btn-secondary" onClick={() => setShowCreate(false)} disabled={busyKey !== null} type="button">
                      Cancel
                    </button>
                    <button className="db-btn db-btn-primary" onClick={createSubject} disabled={busyKey !== null} type="button">
                      {isBusy("subject:create") ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" style={{ width: 14, height: 14 }} />
                          Saving…
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Save Subject
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =========================
                MODAL: EDIT SUBJECT
            ========================= */}
            {showEdit && editId && (
              <div
                className="db-modal-backdrop"
                onMouseDown={() => {
                  if (busyKey) return;
                  setShowEdit(false);
                }}
              >
                <div className="db-modal" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="db-modal-head">
                    <div className="db-modal-head-inner">
                      <div>
                        <h3 className="db-modal-title">Edit Subject</h3>
                        <p className="db-modal-sub">Update subject name.</p>
                      </div>

                      <button className="db-modal-close" onClick={() => setShowEdit(false)} disabled={busyKey !== null} type="button" aria-label="Close">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="db-modal-body">
                    <div className="db-modal-card">
                      <div className="db-form-grid">
                        <div className="db-field" style={{ gridColumn: "1 / -1" }}>
                          <label>
                            Subject Name <span style={{ color: "#ef4444" }}>*</span>
                          </label>
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="db-modal-foot">
                    <button className="db-btn db-btn-secondary" onClick={() => setShowEdit(false)} disabled={busyKey !== null} type="button">
                      Cancel
                    </button>
                    <button className="db-btn db-btn-primary" onClick={updateSubject} disabled={busyKey !== null} type="button">
                      {isBusy(`subject:update:${editId}`) ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" style={{ width: 14, height: 14 }} />
                          Saving…
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Update
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =========================
                MODAL: ASSIGN SECTION (BULK)
            ========================= */}
            {showAssign && (
              <div
                className="db-modal-backdrop"
                onMouseDown={() => {
                  if (busyKey) return;
                  setShowAssign(false);
                }}
              >
                <div className="db-modal" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="db-modal-head">
                    <div className="db-modal-head-inner">
                      <div>
                        <h3 className="db-modal-title">Assign Section</h3>
                        <p className="db-modal-sub">
                          Assign <b>{selectedCount}</b> subject(s) to a section.
                        </p>
                      </div>

                      <button className="db-modal-close" onClick={() => setShowAssign(false)} disabled={busyKey !== null} type="button" aria-label="Close">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="db-modal-body">
                    <div className="db-modal-card">
                      <div className="db-form-grid">
                        <div className="db-field">
                          <label>
                            Select Section <span style={{ color: "#ef4444" }}>*</span>
                          </label>
                          <select value={assignSectionId} onChange={(e) => setAssignSectionId(e.target.value)} disabled={loadingSections}>
                            <option value="">Select Section</option>
                            {sections.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          <div className="db-help">This will update section_id for all selected subjects.</div>
                        </div>

                        <div className="db-modal-card" style={{ background: "#faf8f5", borderRadius: 14 }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: "#1a1a2e", marginBottom: 10 }}>Quick actions</div>
                          <div style={{ display: "grid", gap: 10 }}>
                            <button className="db-btn db-btn-secondary" onClick={selectAllFiltered} disabled={busyKey !== null || filteredSubjects.length === 0} type="button">
                              Select All (Filtered)
                            </button>
                            <button className="db-btn db-btn-secondary" onClick={clearSelection} disabled={busyKey !== null || selectedCount === 0} type="button">
                              Clear Selection
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="db-modal-foot">
                    <button className="db-btn db-btn-secondary" onClick={() => setShowAssign(false)} disabled={busyKey !== null} type="button">
                      Cancel
                    </button>
                    <button className="db-btn db-btn-green" onClick={assignSectionToSelected} disabled={busyKey !== null} type="button">
                      {isBusy("subject:assign") ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" style={{ width: 14, height: 14 }} />
                          Assigning…
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M7 8h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                            <path d="M6.5 6.3l7 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            <path d="M6.5 9.7l7-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            <circle cx="6" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.4" />
                            <circle cx="14" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.4" />
                          </svg>
                          Assign Section
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

/**
 * NOTES:
 * - Department endpoint used: GET /student-department (as in your project).
 * - Subjects endpoint used: GET /departments/{id}/subjects
 * - Create subject: POST /departments/{id}/subjects { name }
 * - Update subject: PUT /subjects/{id} { name }
 * - Assign section: POST /subjects/assign-section { section_id, subject_ids }
 */