// src/pages/Admin/Academics - SubjectsPage.tsx
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
type StudentClass = { id: number; name: string; section_id?: number | null };

type Subject = {
  id: number;
  name: string;
  subject_id?: string;
  department_id?: number | null;
  section_id?: number | null;
  class_id?: number | null;
  school_id?: number;
  created_at?: string;
  updated_at?: string;
  archived_at?: string | null;

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
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // filters
  const [sectionFilter, setSectionFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  // create form
  const [createName, setCreateName] = useState("");
  const [createSectionId, setCreateSectionId] = useState<string>("");
  const [createDepartmentId, setCreateDepartmentId] = useState<string>("");

  // edit form
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSectionId, setEditSectionId] = useState<string>("");
  const [editDepartmentId, setEditDepartmentId] = useState<string>("");

  // bulk section assignment
  const [selectedIds, setSelectedIds] = useState<Record<number, boolean>>({});
  const [assignSectionId, setAssignSectionId] = useState<string>("");

  // subject allocation matrix (offerings)
  const [offeringClassId, setOfferingClassId] = useState("");
  const [offeringSectionId, setOfferingSectionId] = useState("");
  const [offeringDepartmentId, setOfferingDepartmentId] = useState("");
  const [offeringSubjectIds, setOfferingSubjectIds] = useState<Record<number, boolean>>({});
  const [offeringLoaded, setOfferingLoaded] = useState(false);

  const isBusy = (key: string) => busyKey === key;

  /* =========================
     FETCH
  ========================= */
  async function fetchDepartments() {
    try {
      setLoadingDepartments(true);
      const res = await authApi.get<Department[]>("/student-department");
      const list = Array.isArray(res.data) ? res.data : [];
      const filtered = list.filter((d) => {
        const n = (d.name || "").trim().toLowerCase();
        return n !== "general" && n !== "general department" && n !== "common";
      });
      setDepartments(filtered);
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setLoadingDepartments(false);
    }
  }

  async function fetchSections() {
    try {
      setLoadingSections(true);
      const res = await authApi.get<Section[]>("/sections");
      setSections(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setLoadingSections(false);
    }
  }

  async function fetchClasses() {
    try {
      const res = await authApi.get("/levels");
      const rows = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setClasses(rows);
    } catch (err: any) {
      showError(getErrorMessage(err));
    }
  }

  async function fetchSubjects() {
    try {
      setLoadingSubjects(true);
      const params: any = {};
      if (showArchived) params.archived = 1;
      if (sectionFilter) params.section_id = sectionFilter;
      if (departmentFilter) params.department_id = departmentFilter;
      if (query.trim()) params.search = query.trim();

      const res = await authApi.get<Subject[]>("/subjects/list", { params });
      const list = Array.isArray(res.data) ? res.data : [];
      setSubjects(list);
    } catch (err: any) {
      // Fallback to legacy endpoint if /subjects/list route cache is warming up
      try {
        const res = await authApi.get<Subject[]>("/departments/all/subjects", {
          params: showArchived ? { archived: 1 } : {},
        });
        setSubjects(Array.isArray(res.data) ? res.data : []);
      } catch (fallbackErr: any) {
        showError(getErrorMessage(err));
        setSubjects([]);
      }
    } finally {
      setLoadingSubjects(false);
    }
  }

  useEffect(() => {
    setLoadingPage(true);
    Promise.all([fetchDepartments(), fetchSections(), fetchClasses(), fetchSubjects()]).finally(() =>
      setLoadingPage(false)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionFilter, departmentFilter, showArchived]);

  /* =========================
     DERIVED
  ========================= */
  const sectionName = (s: Subject) =>
    s.section?.name ?? sections.find((x) => x.id === s.section_id)?.name ?? "Universal / All";

  const departmentName = (s: Subject) =>
    s.department?.name ?? departments.find((x) => x.id === s.department_id)?.name ?? "All Departments";

  const filteredSubjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((s) => {
      const sec = sectionName(s).toLowerCase();
      const dep = departmentName(s).toLowerCase();
      const hay = `${s.name ?? ""} ${s.subject_id ?? ""} ${sec} ${dep}`.toLowerCase();
      return hay.includes(q);
    });
  }, [subjects, query, sections, departments]);

  const totalSubjects = subjects.length;
  const selectedCount = useMemo(() => Object.values(selectedIds).filter(Boolean).length, [selectedIds]);

  const allFilteredSelected =
    filteredSubjects.length > 0 && filteredSubjects.every((s) => !!selectedIds[s.id]);

  /* =========================
     PAGINATION
  ========================= */
  const [page, setPage] = useState(1);
  const perPage = 12;

  useEffect(() => setPage(1), [query, sectionFilter, departmentFilter]);

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
    const name = createName.trim();
    if (!name) return showError("Please enter a subject name.");

    try {
      setBusyKey("subject:create");
      const payload: any = { name };
      if (createSectionId) payload.section_id = Number(createSectionId);
      if (createDepartmentId) payload.department_id = Number(createDepartmentId);
      else payload.is_general = true;

      const res = await authApi.post("/subjects", payload);
      const code = res.data?.subject_code ? ` (${res.data.subject_code})` : "";
      showSuccess((res.data?.message ?? "Subject added successfully") + code);

      setCreateName("");
      setCreateSectionId("");
      setCreateDepartmentId("");
      setShowCreate(false);
      await fetchSubjects();
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  function openEdit(subject: Subject) {
    setEditId(subject.id);
    setEditName(subject.name ?? "");
    setEditSectionId(subject.section_id ? String(subject.section_id) : "");
    setEditDepartmentId(subject.department_id ? String(subject.department_id) : "");
    setShowEdit(true);
  }

  async function updateSubject() {
    if (!editId) return;
    const name = editName.trim();
    if (!name) return showError("Please enter a subject name.");

    try {
      setBusyKey(`subject:update:${editId}`);
      const payload: any = { name };
      payload.section_id = editSectionId ? Number(editSectionId) : null;
      payload.department_id = editDepartmentId ? Number(editDepartmentId) : null;
      payload.is_general = !editDepartmentId;

      const res = await authApi.put(`/subjects/${editId}`, payload);
      showSuccess(res.data?.message ?? "Subject updated successfully.");

      setShowEdit(false);
      setEditId(null);
      setEditName("");
      setEditSectionId("");
      setEditDepartmentId("");
      await fetchSubjects();
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  async function archiveSubject(subject: Subject) {
    const msg = `Are you sure you want to archive "${subject.name}"?`;
    if (!window.confirm(msg)) return;

    try {
      setBusyKey(`subject:archive:${subject.id}`);
      const res = await authApi.delete(`/subjects/${subject.id}`);
      showSuccess(res.data?.message ?? "Subject archived successfully.");
      await fetchSubjects();
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  async function restoreSubject(subject: Subject) {
    try {
      setBusyKey(`subject:restore:${subject.id}`);
      const res = await authApi.post(`/subjects/${subject.id}/restore`);
      showSuccess(res.data?.message ?? "Subject restored successfully.");
      await fetchSubjects();
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
      await fetchSubjects();
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  /* =========================
     SUBJECT OFFERINGS / ALLOCATION
  ========================= */
  const offeringSelectedCount = useMemo(
    () => Object.values(offeringSubjectIds).filter(Boolean).length,
    [offeringSubjectIds]
  );

  async function loadOfferings() {
    try {
      setBusyKey("offerings:load");
      const params: any = {};
      if (offeringClassId) params.level_id = Number(offeringClassId);
      if (offeringSectionId) params.section_id = Number(offeringSectionId);
      if (offeringDepartmentId) params.department_id = Number(offeringDepartmentId);

      const res = await authApi.get("/subject-offerings", { params });
      const ids = new Set<number>((res.data?.subject_ids || []).map((id: number) => Number(id)));
      const next: Record<number, boolean> = {};
      subjects.forEach((subject) => {
        next[subject.id] = ids.has(subject.id);
      });
      setOfferingSubjectIds(next);
      setOfferingLoaded(true);
      showSuccess(`Loaded subject allocation for the selected class/scope.`);
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  async function saveOfferings() {
    const subject_ids = Object.entries(offeringSubjectIds)
      .filter(([, selected]) => selected)
      .map(([id]) => Number(id));

    try {
      setBusyKey("offerings:save");
      const payload: any = { subject_ids };
      if (offeringClassId) payload.level_id = Number(offeringClassId);
      if (offeringSectionId) payload.section_id = Number(offeringSectionId);
      if (offeringDepartmentId) payload.department_id = Number(offeringDepartmentId);

      const res = await authApi.post("/subject-offerings", payload);
      showSuccess(res.data?.message || "Subject allocation saved successfully.");
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  function toggleOfferingSubject(id: number) {
    setOfferingSubjectIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function selectAllOfferings() {
    const next: Record<number, boolean> = {};
    subjects.forEach((s) => {
      next[s.id] = true;
    });
    setOfferingSubjectIds(next);
  }

  function clearAllOfferings() {
    setOfferingSubjectIds({});
  }

  /* =========================
     RENDER
  ========================= */
  if (loadingPage) {
    return <Loader />;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .db-main {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: 24px 28px 0;
        }

        .db-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: 18px;
          padding: 28px 32px;
          margin-bottom: 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(10, 25, 47, 0.15);
        }
        .db-hero::before {
          content: "";
          position: absolute;
          top: -60px; right: -60px;
          width: 220px; height: 220px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(251, 191, 36, 0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .db-greeting {
          font-size: 22px;
          font-weight: 800;
          color: #FFFFFF;
          letter-spacing: -0.4px;
          margin-bottom: 6px;
        }
        .db-greeting em { font-style: normal; color: #FBBF24; }

        .db-hero-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.6;
          max-width: 620px;
          margin-bottom: 18px;
        }

        .db-hero-btns { display:flex; gap:10px; flex-wrap:wrap; }

        .db-btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 700;
          color: #FFFFFF;
          background: #D97706;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          white-space: nowrap;
        }
        .db-btn-gold:hover { background: #B45309; transform: translateY(-1px); color: #FFFFFF; }

        .db-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 600;
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.10);
          border: 1px solid rgba(255, 255, 255, 0.20);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .db-btn-outline:hover { background: rgba(255, 255, 255, 0.18); color: #fff; }

        .db-hero-stat-card {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(8px);
          border-radius: 14px;
          padding: 18px 22px;
          min-width: 220px;
        }
        .db-hero-stat-row { display:flex; flex-direction:column; gap:10px; }
        .db-hero-stat-item { display:flex; justify-content:space-between; align-items:center; gap:16px; }
        .db-hero-stat-label { font-size: 12px; font-weight: 400; color: #CBD5E1; }
        .db-hero-stat-val { font-size: 18px; font-weight: 800; color: #FBBF24; }
        .db-hero-stat-sep { height: 1px; background: rgba(255, 255, 255, 0.08); }

        .db-panel {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.03);
          margin-bottom: 24px;
        }

        .db-panel-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 20px;
        }

        .db-panel-title-group { display: flex; align-items: center; gap: 14px; }
        .db-panel-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          background: var(--pi, #FEF3C7);
          color: var(--pc, #B45309);
        }
        .db-panel-title { font-size: 17px; font-weight: 800; color: #0F172A; margin: 0; }
        .db-panel-sub { font-size: 13px; color: #64748B; margin: 2px 0 0; }

        .db-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .db-select {
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 600;
          color: #1E293B;
          background: #F8FAFC;
          border: 1px solid #CBD5E1;
          border-radius: 10px;
          outline: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .db-select:focus { border-color: #3B82F6; background: #fff; }

        .db-input {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: #F8FAFC;
          border: 1px solid #CBD5E1;
          border-radius: 10px;
          font-size: 13px;
          min-width: 220px;
        }
        .db-input input {
          border: none;
          background: transparent;
          outline: none;
          width: 100%;
          font-size: 13px;
          color: #0F172A;
        }

        .db-chip-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          font-size: 12.5px;
          font-weight: 700;
          color: #334155;
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .db-chip-btn:hover { background: #E2E8F0; color: #0F172A; }

        .db-chip-primary {
          background: #2563EB;
          color: #fff;
          border-color: #2563EB;
        }
        .db-chip-primary:hover { background: #1D4ED8; color: #fff; }

        .db-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .db-table th {
          text-align: left;
          padding: 12px 16px;
          background: #F8FAFC;
          color: #64748B;
          font-weight: 700;
          border-bottom: 1px solid #E2E8F0;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .db-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #F1F5F9;
          color: #1E293B;
          vertical-align: middle;
        }
        .db-table tr:hover td { background: #F8FAFC; }

        .db-badge-code {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 6px;
          background: #EFF6FF;
          color: #1D4ED8;
          font-size: 11.5px;
          font-weight: 700;
          font-family: monospace;
        }

        .db-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          background: #F1F5F9;
          color: #475569;
        }
        .db-pill-green { background: #ECFDF5; color: #047857; }
        .db-pill-blue { background: #EFF6FF; color: #1D4ED8; }
        .db-pill-amber { background: #FEF3C7; color: #B45309; }

        .db-actions { display: flex; gap: 8px; justify-content: flex-end; }
        .db-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s;
        }
        .db-action-primary { background: #EFF6FF; color: #1D4ED8; border-color: #DBEAFE; }
        .db-action-primary:hover { background: #DBEAFE; }
        .db-action-danger { background: #FEF2F2; color: #DC2626; border-color: #FEE2E2; }
        .db-action-danger:hover { background: #FEE2E2; }
        .db-action-green { background: #ECFDF5; color: #047857; border-color: #D1FAE5; }
        .db-action-green:hover { background: #D1FAE5; }

        .db-helper-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 16px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          margin-bottom: 14px;
          font-size: 13px;
        }

        .db-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 18px;
          font-size: 13px;
          color: #64748B;
        }
        .db-page-btns { display: flex; gap: 6px; align-items: center; }
        .db-page-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
          background: #fff;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
        }
        .db-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .db-page-current { font-weight: 700; color: #0F172A; padding: 0 6px; }

        /* Allocation Check Grid */
        .db-check-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 12px;
        }
        .db-option-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .db-option-card:hover { border-color: #3B82F6; background: #EFF6FF; }
        .db-option-card input[type="checkbox"] { width: 16px; height: 16px; accent-color: #2563EB; }

        /* Modal */
        .db-modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
        }
        .db-modal {
          background: #fff;
          border-radius: 18px;
          width: 100%;
          max-width: 520px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          overflow: hidden;
        }
        .db-modal-head {
          padding: 20px 24px;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .db-modal-title { font-size: 17px; font-weight: 800; color: #0F172A; margin: 0; }
        .db-modal-sub { font-size: 13px; color: #64748B; margin: 2px 0 0; }
        .db-modal-close {
          background: transparent;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #94A3B8;
        }
        .db-modal-body { padding: 24px; }
        .db-modal-foot {
          padding: 16px 24px;
          background: #F8FAFC;
          border-top: 1px solid #E2E8F0;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .db-field { margin-bottom: 16px; display: flex; flex-direction: column; gap: 6px; }
        .db-field label { font-size: 13px; font-weight: 700; color: #1E293B; }
        .db-field input, .db-field select {
          padding: 10px 14px;
          border: 1px solid #CBD5E1;
          border-radius: 10px;
          font-size: 13.5px;
          outline: none;
        }
        .db-field input:focus, .db-field select:focus { border-color: #2563EB; }
        .db-help { font-size: 12px; color: #64748B; }

        .db-alert-tip {
          padding: 12px 16px;
          border-radius: 10px;
          background: #EFF6FF;
          border: 1px solid #BFDBFE;
          color: #1E40AF;
          font-size: 12.5px;
          line-height: 1.5;
          margin-bottom: 16px;
        }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Subjects & Academic Allocation | SchoolProfit" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto gq-app-main db-main d-flex flex-column min-vh-100">
            {/* HERO */}
            <div className="db-hero">
              <div>
                <h1 className="db-greeting">
                  {getGreeting()}, <em>Admin</em>
                </h1>
                <p className="db-hero-sub">
                  Universal Subject Bank. Manage single master subjects for your school and seamlessly allocate them across Nursery, Primary, Junior, and Senior Secondary classes.
                </p>
                <div className="db-hero-btns">
                  <button className="db-btn-gold" onClick={() => setShowCreate(true)} type="button">
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Add New Subject
                  </button>
                  <a href="#allocation-section" className="db-btn-outline">
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                      <path d="M3 4h10M3 8h10M3 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    Subject Allocation Matrix
                  </a>
                </div>
              </div>

              <div className="db-hero-stat-card">
                <div className="db-hero-stat-row">
                  <div className="db-hero-stat-item">
                    <span className="db-hero-stat-label">Total School Subjects</span>
                    <span className="db-hero-stat-val">{totalSubjects}</span>
                  </div>
                  <div className="db-hero-stat-sep" />
                  <div className="db-hero-stat-item">
                    <span className="db-hero-stat-label">Sections Configured</span>
                    <span className="db-hero-stat-val" style={{ color: "#60A5FA" }}>{sections.length}</span>
                  </div>
                  <div className="db-hero-stat-sep" />
                  <div className="db-hero-stat-item">
                    <span className="db-hero-stat-label">Departments</span>
                    <span className="db-hero-stat-val" style={{ color: "#34D399" }}>{departments.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SUBJECTS CATALOG PANEL */}
            <div className="db-panel">
              <div className="db-panel-head">
                <div className="db-panel-title-group">
                  <div className="db-panel-icon">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                      <path d="M3 4.5h10M3 8h10M3 11.5h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="db-panel-title">Subjects Master List</h2>
                    <p className="db-panel-sub">All active subjects registered in your school.</p>
                  </div>
                </div>

                <div className="db-toolbar">
                  {/* Section Filter */}
                  <select
                    className="db-select"
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                    title="Filter by Section"
                  >
                    <option value="">All Sections</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  {/* Department Filter */}
                  <select
                    className="db-select"
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    title="Filter by Department"
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>

                  {/* Search */}
                  <div className="db-input">
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="7" cy="7" r="4.5" stroke="#64748B" strokeWidth="1.4" />
                      <path d="M11 11l3 3" stroke="#64748B" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <input
                      placeholder="Search subject or code..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query.trim() && (
                      <button className="db-chip-btn" style={{ padding: "4px 8px" }} onClick={() => setQuery("")} type="button">
                        Clear
                      </button>
                    )}
                  </div>

                  <button className="db-chip-btn" onClick={fetchSubjects} disabled={loadingSubjects} type="button">
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Refresh
                  </button>

                  <button
                    className="db-chip-btn"
                    onClick={() => setShowArchived((v) => !v)}
                    type="button"
                  >
                    {showArchived ? "Show Active" : "View Archived"}
                  </button>

                  {!showArchived && (
                    <>
                      <button className="db-chip-btn db-chip-primary" onClick={() => setShowCreate(true)} type="button">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Add Subject
                      </button>

                      <button
                        className="db-chip-btn"
                        onClick={() => setShowAssign(true)}
                        disabled={selectedCount === 0}
                        title={selectedCount === 0 ? "Select subjects first" : ""}
                        type="button"
                      >
                        Assign Section ({selectedCount})
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Helper toolbar for selection */}
              <div className="db-helper-row">
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span>
                    Total: <b style={{ color: "#0F172A" }}>{filteredSubjects.length}</b> subjects
                  </span>
                  {selectedCount > 0 && (
                    <>
                      <span style={{ color: "#CBD5E1" }}>|</span>
                      <span>
                        Selected: <b style={{ color: "#2563EB" }}>{selectedCount}</b>
                      </span>
                    </>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button className="db-chip-btn" onClick={selectAllFiltered} disabled={filteredSubjects.length === 0} type="button">
                    Select All
                  </button>
                  <button className="db-chip-btn" onClick={clearSelection} disabled={selectedCount === 0} type="button">
                    Clear
                  </button>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <table className="db-table">
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}>
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          disabled={showArchived || filteredSubjects.length === 0}
                          onChange={(e) => {
                            if (e.target.checked) selectAllFiltered();
                            else clearSelection();
                          }}
                        />
                      </th>
                      <th>Subject Name</th>
                      <th style={{ width: 140 }}>Code</th>
                      <th style={{ width: 180 }}>Section</th>
                      <th style={{ width: 180 }}>Department</th>
                      <th style={{ width: 180, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loadingSubjects ? (
                      <tr>
                        <td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#64748B" }}>
                          <span className="spinner-border spinner-border-sm" /> Loading subjects...
                        </td>
                      </tr>
                    ) : pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: 36, textAlign: "center", color: "#64748B" }}>
                          <div style={{ fontWeight: 800, color: "#0F172A", fontSize: 15 }}>No subjects found</div>
                          <div style={{ marginTop: 4 }}>Click "Add Subject" to register a new subject.</div>
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={!!selectedIds[s.id]}
                              onChange={() => toggleSelect(s.id)}
                              disabled={showArchived}
                            />
                          </td>
                          <td>
                            <div style={{ fontWeight: 800, color: "#0F172A" }}>{s.name}</div>
                            <div style={{ fontSize: 11.5, color: "#64748B" }}>ID: {s.id}</div>
                          </td>
                          <td>
                            <span className="db-badge-code">{s.subject_id || `SUB${s.id}`}</span>
                          </td>
                          <td>
                            <span className="db-pill">
                              {sectionName(s)}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`db-pill ${
                                s.department_id ? "db-pill-blue" : "db-pill-green"
                              }`}
                            >
                              {departmentName(s)}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div className="db-actions">
                              <button
                                className="db-action-btn db-action-primary"
                                onClick={() => openEdit(s)}
                                disabled={showArchived}
                                type="button"
                              >
                                Edit
                              </button>

                              <button
                                className={`db-action-btn ${
                                  showArchived ? "db-action-green" : "db-action-danger"
                                }`}
                                onClick={() => (showArchived ? restoreSubject(s) : archiveSubject(s))}
                                type="button"
                              >
                                {showArchived ? "Restore" : "Archive"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="db-pagination">
                  <div>
                    Showing <b>{pageRows.length}</b> of <b>{filteredSubjects.length}</b> subjects (Page {safePage} of {totalPages})
                  </div>
                  <div className="db-page-btns">
                    <button
                      className="db-page-btn"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      type="button"
                    >
                      Prev
                    </button>
                    <span className="db-page-current">{safePage}</span>
                    <button
                      className="db-page-btn"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                      type="button"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SUBJECT ALLOCATION MATRIX PANEL */}
            <div className="db-panel" id="allocation-section">
              <div className="db-panel-head">
                <div className="db-panel-title-group">
                  <div className="db-panel-icon" style={{ "--pi": "#E0F2FE", "--pc": "#0369A1" } as React.CSSProperties}>
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                      <path d="M3 4h10M3 8h10M3 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="db-panel-title">Subject Allocation Matrix</h2>
                    <p className="db-panel-sub">
                      Assign which subjects belong to each class (e.g. Primary 1, JSS 1) or Department (e.g. SSS 1 Science).
                    </p>
                  </div>
                </div>

                <div className="db-panel-actions">
                  <span className="db-pill db-pill-blue">{offeringSelectedCount} subjects selected</span>
                </div>
              </div>

              {/* Scope selectors */}
              <div className="db-toolbar" style={{ alignItems: "flex-end", marginBottom: 16 }}>
                <div className="db-field" style={{ minWidth: 190, margin: 0 }}>
                  <label>Select Target Class</label>
                  <select value={offeringClassId} onChange={(e) => setOfferingClassId(e.target.value)}>
                    <option value="">All Classes (School Default)</option>
                    {classes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="db-field" style={{ minWidth: 170, margin: 0 }}>
                  <label>Section (Optional)</label>
                  <select value={offeringSectionId} onChange={(e) => setOfferingSectionId(e.target.value)}>
                    <option value="">All Sections</option>
                    {sections.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="db-field" style={{ minWidth: 190, margin: 0 }}>
                  <label>Department (Optional)</label>
                  <select value={offeringDepartmentId} onChange={(e) => setOfferingDepartmentId(e.target.value)}>
                    <option value="">All Departments</option>
                    {departments.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  className="db-btn-outline"
                  style={{ background: "#0F172A", borderColor: "#0F172A", color: "#fff", height: 42 }}
                  type="button"
                  onClick={loadOfferings}
                  disabled={busyKey !== null}
                >
                  {isBusy("offerings:load") ? "Loading..." : "Load Current Setup"}
                </button>

                <button
                  className="db-btn-gold"
                  style={{ height: 42 }}
                  type="button"
                  onClick={saveOfferings}
                  disabled={busyKey !== null}
                >
                  {isBusy("offerings:save") ? "Saving..." : "Save Subject Allocation"}
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div className="db-help">
                  Check the subjects that students in this target class or department take:
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="db-chip-btn" onClick={selectAllOfferings} type="button">
                    Select All
                  </button>
                  <button className="db-chip-btn" onClick={clearAllOfferings} type="button">
                    Clear All
                  </button>
                </div>
              </div>

              <div className="db-check-grid">
                {subjects.map((subj) => (
                  <label key={subj.id} className="db-option-card">
                    <input
                      type="checkbox"
                      checked={!!offeringSubjectIds[subj.id]}
                      onChange={() => toggleOfferingSubject(subj.id)}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 13 }}>{subj.name}</div>
                      <div style={{ fontSize: 11, color: "#64748B" }}>
                        {subj.subject_id || `SUB${subj.id}`} | {sectionName(subj)}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <Footer />

            {/* MODAL: ADD SUBJECT */}
            {showCreate && (
              <div className="db-modal-backdrop" onMouseDown={() => setShowCreate(false)}>
                <div className="db-modal" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="db-modal-head">
                    <div>
                      <h3 className="db-modal-title">Add New Subject</h3>
                      <p className="db-modal-sub">Register a single master subject for your school.</p>
                    </div>
                    <button className="db-modal-close" onClick={() => setShowCreate(false)} type="button">
                      ✕
                    </button>
                  </div>

                  <div className="db-modal-body">
                    <div className="db-alert-tip">
                      💡 <b>Pro Tip:</b> Create each subject name once (e.g. <i>Mathematics</i> or <i>Chemistry</i>). You can allocate it to any class or department in the Subject Allocation Matrix below.
                    </div>

                    <div className="db-field">
                      <label>
                        Subject Name <span style={{ color: "#EF4444" }}>*</span>
                      </label>
                      <input
                        placeholder="e.g. Further Mathematics, Civic Education"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        autoFocus
                      />
                    </div>

                    <div className="db-field">
                      <label>Applicable Section (Optional)</label>
                      <select value={createSectionId} onChange={(e) => setCreateSectionId(e.target.value)}>
                        <option value="">Universal / All Sections</option>
                        {sections.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <span className="db-help">Leave as Universal if taught across multiple school levels.</span>
                    </div>

                    <div className="db-field">
                      <label>Department (Optional)</label>
                      <select value={createDepartmentId} onChange={(e) => setCreateDepartmentId(e.target.value)}>
                        <option value="">All Departments</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                      <span className="db-help">Only select if this subject belongs to a specific department (e.g. Science, Arts, Commercial).</span>
                    </div>
                  </div>

                  <div className="db-modal-foot">
                    <button className="db-chip-btn" onClick={() => setShowCreate(false)} type="button">
                      Cancel
                    </button>
                    <button className="db-btn-gold" onClick={createSubject} disabled={busyKey !== null} type="button">
                      {isBusy("subject:create") ? "Saving..." : "Save Subject"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL: EDIT SUBJECT */}
            {showEdit && (
              <div className="db-modal-backdrop" onMouseDown={() => setShowEdit(false)}>
                <div className="db-modal" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="db-modal-head">
                    <div>
                      <h3 className="db-modal-title">Edit Subject</h3>
                      <p className="db-modal-sub">Update subject details.</p>
                    </div>
                    <button className="db-modal-close" onClick={() => setShowEdit(false)} type="button">
                      ✕
                    </button>
                  </div>

                  <div className="db-modal-body">
                    <div className="db-field">
                      <label>
                        Subject Name <span style={{ color: "#EF4444" }}>*</span>
                      </label>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </div>

                    <div className="db-field">
                      <label>Applicable Section</label>
                      <select value={editSectionId} onChange={(e) => setEditSectionId(e.target.value)}>
                        <option value="">Universal / All Sections</option>
                        {sections.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="db-field">
                      <label>Department (Optional)</label>
                      <select value={editDepartmentId} onChange={(e) => setEditDepartmentId(e.target.value)}>
                        <option value="">All Departments</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="db-modal-foot">
                    <button className="db-chip-btn" onClick={() => setShowEdit(false)} type="button">
                      Cancel
                    </button>
                    <button className="db-btn-gold" onClick={updateSubject} disabled={busyKey !== null} type="button">
                      {isBusy(`subject:update:${editId}`) ? "Updating..." : "Update Subject"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL: BULK ASSIGN SECTION */}
            {showAssign && (
              <div className="db-modal-backdrop" onMouseDown={() => setShowAssign(false)}>
                <div className="db-modal" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="db-modal-head">
                    <div>
                      <h3 className="db-modal-title">Bulk Assign Section</h3>
                      <p className="db-modal-sub">Assign {selectedCount} selected subjects to a section.</p>
                    </div>
                    <button className="db-modal-close" onClick={() => setShowAssign(false)} type="button">
                      ✕
                    </button>
                  </div>

                  <div className="db-modal-body">
                    <div className="db-field">
                      <label>
                        Select Target Section <span style={{ color: "#EF4444" }}>*</span>
                      </label>
                      <select value={assignSectionId} onChange={(e) => setAssignSectionId(e.target.value)}>
                        <option value="">Select Section</option>
                        {sections.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="db-modal-foot">
                    <button className="db-chip-btn" onClick={() => setShowAssign(false)} type="button">
                      Cancel
                    </button>
                    <button className="db-btn-gold" onClick={assignSectionToSelected} disabled={busyKey !== null} type="button">
                      {isBusy("subject:assign") ? "Assigning..." : "Assign Section"}
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
