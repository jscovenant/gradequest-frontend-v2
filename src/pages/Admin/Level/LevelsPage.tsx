// src/pages/Admin/Level/LevelsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";
import { getUser } from "../../../utils/token";

/* =========================
   TYPES
========================= */
type ClassStatus = "Active" | "Inactive" | string;

type StudentClass = {
  id: number;
  name: string;
  class_group?: string | null;
  description?: string | null;
  section_id?: number | null;
  section?: { id: number; name: string } | null;
  school_id?: number;
  created_at?: string;
  updated_at?: string;
  status?: ClassStatus;
  archived_at?: string | null;
  students_count?: number;
};

type Section = {
  id: number;
  name: string;
};

/* =========================
   HELPERS & PRESETS
========================= */
function getErrorMessage(err: any): string {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (status === 409) return data?.message ?? "This item already exists.";
  if (status === 422) {
    const errors = data?.errors;
    if (errors) {
      const firstKey = Object.keys(errors)[0];
      const firstMsg = errors[firstKey]?.[0];
      if (firstMsg) return firstMsg;
    }
    return data?.message ?? "Validation error.";
  }
  if (status === 404) return data?.message ?? "Not found.";
  return data?.message ?? err?.message ?? "Something went wrong.";
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

const BASE_CLASS_PRESETS = [
  "Nursery 1", "Nursery 2", "Nursery 3",
  "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
  "JSS 1", "JSS 2", "JSS 3",
  "SS 1", "SS 2", "SS 3",
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
  "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"
];

const ARM_PRESETS = {
  colors: ["Magenta", "Gold", "Silver", "Diamond", "Blue", "Green", "Yellow", "Purple"],
  letters: ["A", "B", "C", "D", "E"],
  stones: ["Diamond", "Emerald", "Ruby", "Sapphire", "Topaz", "Pearl"],
  tracks: ["Science", "Commercial", "Art", "Technical", "General"],
};

function getArmBadgeColor(arm?: string | null): { bg: string; color: string; border: string } {
  if (!arm) return { bg: "rgba(100, 116, 139, 0.09)", color: "#64748b", border: "rgba(100, 116, 139, 0.2)" };
  const a = arm.toLowerCase();
  if (a.includes("magenta") || a.includes("pink")) return { bg: "rgba(236, 72, 153, 0.12)", color: "#db2777", border: "rgba(236, 72, 153, 0.3)" };
  if (a.includes("gold") || a.includes("yellow")) return { bg: "rgba(245, 158, 11, 0.15)", color: "#b45309", border: "rgba(245, 158, 11, 0.35)" };
  if (a.includes("diamond") || a.includes("silver") || a.includes("cyan")) return { bg: "rgba(6, 182, 212, 0.12)", color: "#0891b2", border: "rgba(6, 182, 212, 0.3)" };
  if (a.includes("emerald") || a.includes("green")) return { bg: "rgba(16, 185, 129, 0.12)", color: "#059669", border: "rgba(16, 185, 129, 0.3)" };
  if (a.includes("ruby") || a.includes("red")) return { bg: "rgba(239, 68, 68, 0.12)", color: "#dc2626", border: "rgba(239, 68, 68, 0.3)" };
  if (a.includes("science") || a.includes("blue") || a === "a") return { bg: "rgba(37, 99, 235, 0.12)", color: "#2563eb", border: "rgba(37, 99, 235, 0.3)" };
  if (a.includes("commercial") || a.includes("purple") || a === "b") return { bg: "rgba(147, 51, 234, 0.12)", color: "#9333ea", border: "rgba(147, 51, 234, 0.3)" };
  if (a.includes("art") || a.includes("orange") || a === "c") return { bg: "rgba(249, 115, 22, 0.12)", color: "#ea580c", border: "rgba(249, 115, 22, 0.3)" };
  return { bg: "rgba(15, 39, 68, 0.08)", color: "#0F2744", border: "rgba(15, 39, 68, 0.22)" };
}

/* =========================
   MAIN COMPONENT
========================= */
export default function LevelsPage() {
  const { showSuccess, showError, showWarning } = useToast();
  const currentUser = useMemo(() => getUser(), []);

  // layout
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // loading
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingLevels, setLoadingLevels] = useState(true);
  const [loadingSections, setLoadingSections] = useState(true);

  // data
  const [levels, setLevels] = useState<StudentClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  // ui filter state
  const [query, setQuery] = useState("");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string | number>("all");
  const [groupFilter, setGroupFilter] = useState<"all" | "with_group" | "standalone">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTab, setCreateTab] = useState<"single" | "batch">("single");
  const [showEditModal, setShowEditModal] = useState(false);

  // single create form
  const [createForm, setCreateForm] = useState({
    base_name: "",
    class_group: "",
    custom_name: "",
    use_custom_name: false,
    description: "",
    section_id: "" as string | number,
  });

  // batch create form
  const [batchForm, setBatchForm] = useState({
    base_name: "JSS 1",
    section_id: "" as string | number,
    selected_arms: ["Magenta", "Gold", "Diamond"] as string[],
    custom_arm_input: "",
    description: "",
  });

  // edit form
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    class_group: "",
    description: "",
    section_id: "" as string | number,
  });

  const isBusy = (key: string) => busyKey === key;

  /* =========================
     FETCH
  ========================= */
  async function fetchLevels() {
    try {
      setLoadingLevels(true);
      const res = await authApi.get<StudentClass[]>("/levels", {
        params: showArchived ? { archived: 1 } : undefined,
      });
      setLevels(res.data ?? []);
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setLoadingLevels(false);
    }
  }

  async function fetchSections() {
    try {
      setLoadingSections(true);
      const res = await authApi.get<Section[]>("/all-sections");
      setSections(res.data ?? []);
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setLoadingSections(false);
    }
  }

  useEffect(() => {
    setLoadingPage(true);
    Promise.all([fetchLevels(), fetchSections()]).finally(() => setLoadingPage(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  /* =========================
     DERIVED DATA & STATS
  ========================= */
  const sectionName = (level: StudentClass) =>
    level.section?.name ?? sections.find((s) => s.id === level.section_id)?.name ?? "Unassigned Section";

  const totalClasses = levels.length;
  const withGroupCount = useMemo(() => levels.filter((l) => !!l.class_group).length, [levels]);
  const withSectionCount = useMemo(() => levels.filter((l) => !!l.section_id).length, [levels]);
  const totalStudentsEnrolled = useMemo(
    () => levels.reduce((sum, l) => sum + (l.students_count || 0), 0),
    [levels]
  );

  const filteredLevels = useMemo(() => {
    const q = query.trim().toLowerCase();
    return levels.filter((l) => {
      // Search query filter
      if (q) {
        const sec = sectionName(l);
        const hay = `${l.name ?? ""} ${l.class_group ?? ""} ${l.description ?? ""} ${sec}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // Section filter
      if (selectedSectionFilter !== "all") {
        if (selectedSectionFilter === "none") {
          if (l.section_id) return false;
        } else if (Number(l.section_id) !== Number(selectedSectionFilter)) {
          return false;
        }
      }
      // Group filter
      if (groupFilter === "with_group" && !l.class_group) return false;
      if (groupFilter === "standalone" && l.class_group) return false;

      return true;
    });
  }, [levels, query, selectedSectionFilter, groupFilter, sections]);

  // Group classes by section for Section-Grouped Card View
  const classesBySection = useMemo(() => {
    const map = new Map<string, { section: Section | null; items: StudentClass[] }>();

    filteredLevels.forEach((lvl) => {
      const secKey = lvl.section_id ? `sec_${lvl.section_id}` : "unassigned";
      if (!map.has(secKey)) {
        const secObj = lvl.section || sections.find((s) => s.id === lvl.section_id) || null;
        map.set(secKey, { section: secObj, items: [] });
      }
      map.get(secKey)!.items.push(lvl);
    });

    return Array.from(map.values());
  }, [filteredLevels, sections]);

  // Pagination for table view
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    setPage(1);
  }, [query, selectedSectionFilter, groupFilter]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredLevels.length / perPage)), [filteredLevels.length]);
  const safePage = clamp(page, 1, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return filteredLevels.slice(start, start + perPage);
  }, [filteredLevels, safePage]);

  // Computed name for Single Creation
  const computedSingleName = useMemo(() => {
    if (createForm.use_custom_name && createForm.custom_name.trim()) {
      return createForm.custom_name.trim().toUpperCase();
    }
    const base = createForm.base_name.trim();
    const grp = createForm.class_group.trim();
    if (!base) return "";
    return grp ? `${base} ${grp}`.toUpperCase() : base.toUpperCase();
  }, [createForm.base_name, createForm.class_group, createForm.custom_name, createForm.use_custom_name]);

  /* =========================
     ACTIONS
  ========================= */
  async function createSingleLevel() {
    const finalName = computedSingleName;
    if (!finalName) return showError("Please specify a class name.");
    if (finalName.length > 100) return showError("Class name must not exceed 100 characters.");

    try {
      setBusyKey("level:create:single");
      const payload: any = {
        name: finalName,
        class_group: createForm.class_group.trim() || null,
        description: createForm.description?.trim() || null,
      };
      if (createForm.section_id) payload.section_id = Number(createForm.section_id);

      const res = await authApi.post("/levels", payload);
      showSuccess(res.data?.message ?? `Class "${finalName}" created successfully!`);
      setShowCreateModal(false);
      setCreateForm({
        base_name: "",
        class_group: "",
        custom_name: "",
        use_custom_name: false,
        description: "",
        section_id: "",
      });
      await fetchLevels();
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  async function createBatchArms() {
    const base = batchForm.base_name.trim();
    if (!base) return showError("Please enter a base class name (e.g. JSS 1, Grade 4).");
    if (!batchForm.selected_arms.length) return showError("Please select or enter at least one arm / class group.");

    try {
      setBusyKey("level:create:batch");
      const payload: any = {
        base_name: base,
        batch_arms: batchForm.selected_arms,
        description: batchForm.description?.trim() || null,
      };
      if (batchForm.section_id) payload.section_id = Number(batchForm.section_id);

      const res = await authApi.post("/levels", payload);
      showSuccess(res.data?.message ?? "Class arms generated successfully!");
      setShowCreateModal(false);
      await fetchLevels();
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  function handleAddCustomArm() {
    const arm = batchForm.custom_arm_input.trim();
    if (!arm) return;
    if (batchForm.selected_arms.some((a) => a.toLowerCase() === arm.toLowerCase())) {
      showWarning("This arm is already in the list.");
      return;
    }
    setBatchForm({
      ...batchForm,
      selected_arms: [...batchForm.selected_arms, arm],
      custom_arm_input: "",
    });
  }

  function handleToggleBatchArm(arm: string) {
    if (batchForm.selected_arms.includes(arm)) {
      setBatchForm({
        ...batchForm,
        selected_arms: batchForm.selected_arms.filter((a) => a !== arm),
      });
    } else {
      setBatchForm({
        ...batchForm,
        selected_arms: [...batchForm.selected_arms, arm],
      });
    }
  }

  function openEdit(level: StudentClass) {
    setEditId(level.id);
    setEditForm({
      name: level.name ?? "",
      class_group: level.class_group ?? "",
      description: (level.description ?? "") as string,
      section_id: (level.section_id ?? "") as any,
    });
    setShowEditModal(true);
  }

  async function updateLevel() {
    if (!editId) return;
    const name = editForm.name.trim();
    if (!name) return showError("Please enter a class name.");

    try {
      setBusyKey(`level:update:${editId}`);
      const payload: any = {
        name,
        class_group: editForm.class_group.trim() || null,
        description: editForm.description?.trim() || null,
        section_id: editForm.section_id ? Number(editForm.section_id) : null,
      };

      const res = await authApi.put(`/levels/${editId}`, payload);
      showSuccess(res.data?.message ?? "Class updated successfully.");
      setShowEditModal(false);
      setEditId(null);
      await fetchLevels();
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  async function archiveLevel(level: StudentClass) {
    const ok = window.confirm(
      `Archive "${level.name}"?\n\nArchived classes will be hidden from future setup and result forms, but old records will remain safe.`
    );
    if (!ok) return;

    try {
      setBusyKey(`level:archive:${level.id}`);
      const res = await authApi.delete(`/levels/${level.id}`);
      showSuccess(res.data?.message ?? "Class archived successfully.");
      await fetchLevels();
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  async function restoreLevel(level: StudentClass) {
    try {
      setBusyKey(`level:restore:${level.id}`);
      const res = await authApi.post(`/levels/${level.id}/restore`);
      showSuccess(res.data?.message ?? "Class restored successfully.");
      await fetchLevels();
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  /* =========================
     RENDER
  ========================= */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=DM+Sans:wght@400;500;700&display=swap');

        :root {
          --sp-light:    #F8FAFC;
          --sp-dark:     #0F2744;
          --sp-accent:   #D97706;
          --sp-success:  #10B981;
          --sp-danger:   #EF4444;
          --sp-info:     #2563EB;
          --sp-border:   #E2E8F0;
          --sp-radius:   16px;
          --sp-accent-dim: rgba(217,119,6,0.10);
          --sp-accent-border: rgba(217,119,6,0.25);
        }

        .db-main {
          background: var(--sp-light);
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: 24px 28px 40px;
        }

        /* ── Hero ── */
        .db-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          border-radius: var(--sp-radius);
          padding: 32px 36px;
          position: relative;
          overflow: hidden;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
        }
        .db-hero-glow  { position:absolute; top:-60px; right:-60px; width:320px; height:320px; border-radius:50%; background:radial-gradient(circle, rgba(217,119,6,.18) 0%, transparent 65%); pointer-events:none; }
        .db-hero-glow2 { position:absolute; bottom:-40px; left:25%; width:220px; height:220px; border-radius:50%; background:radial-gradient(circle, rgba(37,99,235,.12) 0%, transparent 70%); pointer-events:none; }
        .db-hero-inner { position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; gap:32px; flex-wrap:wrap; }

        .db-session-badge {
          display:inline-flex; align-items:center; gap:7px;
          font-size:11.5px; font-weight:700; letter-spacing:.04em; text-transform:uppercase;
          color: #FBBF24;
          background: rgba(217,119,6,0.20);
          border: 1px solid rgba(217,119,6,0.35);
          border-radius:999px; padding:4px 12px; margin-bottom:12px;
        }
        .db-session-dot { width:6px; height:6px; border-radius:50%; background: var(--sp-success); animation:dbPulse 2s ease infinite; }
        @keyframes dbPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.5)} }

        .db-greeting { font-size:26px; font-weight:800; color:#fff; line-height:1.15; margin-bottom:8px; }
        .db-greeting em { font-style:normal; color: #FBBF24; }
        .db-hero-sub { font-size:13.5px; color:#CBD5E1; line-height:1.6; max-width:560px; margin-bottom:20px; }

        .db-btn-gold { display:inline-flex; align-items:center; gap:8px; padding:9px 18px; font-size:13px; font-weight:700; color:#fff; background:var(--sp-accent); border:none; border-radius:10px; cursor:pointer; transition:all .2s ease; white-space:nowrap; }
        .db-btn-gold:hover { background:#B45309; transform:translateY(-1px); }
        .db-btn-outline { display:inline-flex; align-items:center; gap:8px; padding:9px 18px; font-size:13px; font-weight:600; color:#fff; background:rgba(255,255,255,.10); border:1px solid rgba(255,255,255,.20); border-radius:10px; cursor:pointer; transition:all .2s ease; white-space:nowrap; }
        .db-btn-outline:hover { background:rgba(255,255,255,.18); color:#fff; }
        .db-btn-purple { display:inline-flex; align-items:center; gap:8px; padding:9px 18px; font-size:13px; font-weight:700; color:#fff; background:linear-gradient(135deg, #7C3AED, #9333EA); border:none; border-radius:10px; cursor:pointer; transition:all .2s ease; white-space:nowrap; }
        .db-btn-purple:hover { opacity:0.92; transform:translateY(-1px); }

        .db-hero-stat-card { background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15); backdrop-filter:blur(8px); border-radius:var(--sp-radius); padding:18px 24px; min-width:240px; }
        .db-hero-stat-item { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:8px; }
        .db-hero-stat-label { font-size:12px; font-weight:400; color:#CBD5E1; }
        .db-hero-stat-val { font-size:16px; font-weight:800; color:#FBBF24; }

        /* ── KPI Cards ── */
        .db-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
        @media(max-width:1100px){ .db-stats{grid-template-columns:repeat(2,1fr);} }
        @media(max-width:600px) { .db-stats{grid-template-columns:1fr;} }

        .db-stat { background:#fff; border:1px solid var(--sp-border); border-radius:var(--sp-radius); padding:22px 20px; position:relative; overflow:hidden; transition:box-shadow .25s,transform .25s; }
        .db-stat:hover { box-shadow:0 8px 28px rgba(0,0,0,.08); transform:translateY(-3px); }
        .db-stat::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:var(--sc); transform:scaleX(0); transform-origin:left; transition:transform .3s ease; }
        .db-stat:hover::before { transform:scaleX(1); }
        .db-stat-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
        .db-stat-icon { width:42px; height:42px; border-radius:10px; background:var(--si); color:var(--sc); display:flex; align-items:center; justify-content:center; }
        .db-stat-label { font-size:12px; font-weight:500; color:#9a8a7a; margin-bottom:4px; text-transform:uppercase; letter-spacing:.04em; }
        .db-stat-val { font-family:'Playfair Display',serif; font-size:28px; font-weight:700; color:var(--sp-dark); line-height:1; }
        .db-stat-footer { display:flex; align-items:center; gap:6px; margin-top:12px; padding-top:10px; border-top:1px solid var(--sp-light); font-size:11.5px; color:#8b7b6b; }

        /* ── Main Panel ── */
        .db-panel { background:#fff; border:1px solid var(--sp-border); border-radius:var(--sp-radius); overflow:hidden; margin-bottom:24px; box-shadow:0 2px 12px rgba(0,0,0,0.03); }
        .db-panel-head { display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-bottom:1px solid rgba(0,0,0,0.06); gap:16px; flex-wrap:wrap; }
        .db-panel-title-group { display:flex; align-items:center; gap:12px; }
        .db-panel-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:rgba(15,39,68,0.08); color:var(--sp-dark); flex-shrink:0; }
        .db-panel-title { font-family:'Playfair Display',serif; font-size:17px; font-weight:700; color:var(--sp-dark); margin:0; }
        .db-panel-sub { font-size:12px; font-weight:400; color:#8b7b6b; margin:0; }

        /* ── Controls & Filter Bar ── */
        .db-filter-bar { display:flex; align-items:center; justify-content:space-between; padding:16px 24px; background:linear-gradient(180deg,#fafafa,#fff); border-bottom:1px solid rgba(0,0,0,0.06); gap:14px; flex-wrap:wrap; }
        .db-search-input-wrap { position:relative; min-width:260px; }
        .db-search-input-wrap svg { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#9a8a7a; pointer-events:none; }
        .db-search-input { width:100%; background:#fff; border:1px solid var(--sp-border); border-radius:9px; padding:9px 34px 9px 36px; font-size:13px; color:var(--sp-dark); outline:none; transition:all .2s; }
        .db-search-input:focus { border-color:var(--sp-accent-border); box-shadow:0 0 0 3px var(--sp-accent-dim); }

        .db-filter-select { background:#fff; border:1px solid var(--sp-border); border-radius:8px; padding:8px 12px; font-size:12.5px; color:var(--sp-dark); outline:none; }
        .db-filter-select:focus { border-color:var(--sp-accent-border); }

        .db-view-toggle { display:inline-flex; background:var(--sp-light); border:1px solid var(--sp-border); border-radius:8px; padding:3px; }
        .db-view-toggle-btn { border:none; background:none; padding:5px 10px; font-size:12px; font-weight:600; color:#7a6a5a; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:5px; transition:all .15s; }
        .db-view-toggle-btn--active { background:#fff; color:var(--sp-dark); box-shadow:0 2px 6px rgba(0,0,0,0.06); }

        /* ── Class Cards Grid View ── */
        .db-section-block { margin:24px; padding:20px; background:#fafbfd; border:1px solid var(--sp-border); border-radius:14px; }
        .db-section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
        .db-section-title { font-family:'Playfair Display',serif; font-size:16px; font-weight:700; color:var(--sp-dark); margin:0; display:flex; align-items:center; gap:8px; }
        .db-section-badge-count { font-size:11.5px; font-weight:700; padding:2px 8px; border-radius:999px; background:rgba(15,39,68,0.08); color:var(--sp-dark); }

        .db-cards-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(235px, 1fr)); gap:14px; }
        .db-class-card {
          background:#fff; border:1.5px solid var(--sp-border); border-radius:12px; padding:16px;
          display:flex; flex-direction:column; justify-content:space-between;
          transition:all .22s cubic-bezier(0.16, 1, 0.3, 1); position:relative;
        }
        .db-class-card:hover { transform:translateY(-2px); border-color:rgba(217,119,6,0.45); box-shadow:0 8px 22px -4px rgba(15,39,68,0.08); }
        
        .db-class-top { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; margin-bottom:10px; }
        .db-class-title { font-size:15px; font-weight:800; color:var(--sp-dark); margin:0 0 4px; line-height:1.25; }
        .db-class-desc { font-size:12px; color:#8b7b6b; margin:0; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }

        .db-arm-badge {
          display:inline-flex; align-items:center; gap:4px;
          font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em;
          padding:3px 8px; border-radius:6px; border:1px solid transparent;
        }

        .db-class-meta-row { display:flex; align-items:center; justify-content:space-between; margin-top:14px; padding-top:10px; border-top:1px dashed rgba(0,0,0,0.08); }
        .db-student-headcount { display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:700; color:var(--sp-dark); }
        .db-student-headcount svg { color:#b45309; }

        .db-card-actions { display:flex; align-items:center; gap:6px; }
        .db-card-btn { width:30px; height:30px; border-radius:6px; display:flex; align-items:center; justify-content:center; border:1px solid var(--sp-border); background:var(--sp-light); color:#64748b; cursor:pointer; transition:all .15s; }
        .db-card-btn:hover { background:rgba(217,119,6,0.12); color:#b45309; border-color:rgba(217,119,6,0.3); }
        .db-card-btn--danger:hover { background:rgba(239,68,68,0.12); color:#dc2626; border-color:rgba(239,68,68,0.3); }
        .db-card-btn--restore:hover { background:rgba(16,185,129,0.12); color:#059669; border-color:rgba(16,185,129,0.3); }

        /* ── Data Table View ── */
        .db-table { width:100%; border-collapse:collapse; }
        .db-table th { padding:12px 18px; font-size:11px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:#8b7b6b; background:var(--sp-light); border-bottom:1px solid rgba(0,0,0,0.06); text-align:left; white-space:nowrap; }
        .db-table td { padding:14px 18px; font-size:13px; color:#4a4a5a; border-bottom:1px solid rgba(0,0,0,0.04); vertical-align:middle; }
        .db-table tbody tr:hover { background:#fafafb; }

        /* ── Pagination ── */
        .db-pagination { display:flex; align-items:center; justify-content:space-between; padding:14px 24px; flex-wrap:wrap; gap:10px; border-top:1px solid rgba(0,0,0,0.06); }
        .db-page-info { font-size:12px; color:#8b7b6b; }
        .db-page-btns { display:flex; align-items:center; gap:6px; }
        .db-page-btn { display:inline-flex; align-items:center; gap:4px; padding:6px 12px; font-size:12px; font-weight:600; color:#64748b; background:var(--sp-light); border:1px solid var(--sp-border); border-radius:6px; cursor:pointer; }
        .db-page-btn:hover:not(:disabled) { background:#ede8e0; color:var(--sp-dark); }
        .db-page-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .db-page-current { font-size:12px; font-weight:700; color:var(--sp-dark); padding:0 8px; }

        /* ── Modals ── */
        .db-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.65); backdrop-filter:blur(8px); z-index:1400; display:flex; align-items:center; justify-content:center; padding:16px; }
        .db-modal-box { width:min(640px,94vw); background:#fff; border-radius:18px; overflow:hidden; box-shadow:0 24px 64px rgba(0,0,0,0.35); animation:dbModalIn .25s cubic-bezier(.34,1.2,.64,1) both; }
        @keyframes dbModalIn { from{opacity:0;transform:scale(.95) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        
        .db-modal-header { background:linear-gradient(135deg, #0A192F 0%, #0F2744 100%); padding:22px 26px; position:relative; }
        .db-modal-header-title { font-family:'Playfair Display',serif; font-size:19px; font-weight:700; color:#fff; margin:0 0 3px; }
        .db-modal-header-sub { font-size:12.5px; color:#CBD5E1; margin:0; }
        .db-modal-close-btn { position:absolute; top:18px; right:20px; width:32px; height:32px; border-radius:8px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:background .2s; }
        .db-modal-close-btn:hover { background:rgba(255,255,255,0.2); }

        .db-modal-tabs { display:flex; border-bottom:1px solid var(--sp-border); background:#fcfcfd; padding:0 24px; }
        .db-modal-tab { padding:12px 18px; font-size:13px; font-weight:600; color:#64748b; border:none; background:none; cursor:pointer; border-bottom:2px solid transparent; transition:all .2s; display:flex; align-items:center; gap:6px; }
        .db-modal-tab--active { color:#b45309; border-bottom-color:#b45309; font-weight:700; }

        .db-modal-content { padding:24px; max-height:75vh; overflow-y:auto; }

        .db-form-label { display:block; font-size:12.5px; font-weight:600; color:var(--sp-dark); margin-bottom:6px; }
        .db-form-label span { color:#dc2626; }
        .db-form-input, .db-form-select, .db-form-textarea {
          width:100%; background:#fff; border:1.5px solid var(--sp-border); border-radius:9px; padding:9px 13px; font-size:13px; color:var(--sp-dark); outline:none; transition:all .2s; box-sizing:border-box;
        }
        .db-form-input:focus, .db-form-select:focus, .db-form-textarea:focus {
          border-color:var(--sp-accent-border); box-shadow:0 0 0 3px var(--sp-accent-dim);
        }
        .db-form-hint { font-size:11.5px; color:#8b7b6b; margin-top:4px; line-height:1.4; }

        .db-chips-wrap { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
        .db-chip { padding:4px 9px; font-size:11.5px; font-weight:600; border-radius:6px; border:1px solid var(--sp-border); background:var(--sp-light); color:#64748b; cursor:pointer; transition:all .15s; }
        .db-chip:hover { border-color:#b45309; color:#b45309; background:rgba(217,119,6,0.06); }
        .db-chip--active { background:#b45309 !important; color:#fff !important; border-color:#b45309 !important; }

        .db-live-preview-box {
          background:rgba(217,119,6,0.06); border:1.5px dashed rgba(217,119,6,0.3); border-radius:12px; padding:14px 18px; margin:18px 0;
          display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
        }

        .db-modal-footer { padding:16px 24px; background:#f8fafc; border-top:1px solid var(--sp-border); display:flex; align-items:center; justify-content:flex-end; gap:10px; }
        .db-btn-cancel { padding:9px 18px; font-size:13px; font-weight:600; color:#64748b; background:#fff; border:1px solid var(--sp-border); border-radius:8px; cursor:pointer; }
        .db-btn-cancel:hover { background:#f1f5f9; }
        .db-btn-save { padding:9px 20px; font-size:13px; font-weight:700; color:#fff; background:var(--sp-accent); border:none; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; gap:7px; }
        .db-btn-save:hover:not(:disabled) { background:#b45309; }
        .db-btn-save:disabled { opacity:0.5; cursor:not-allowed; }

        @keyframes dbSpin { to { transform: rotate(360deg); } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Classes & Arms Setup" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {loadingPage && <Loader message="Loading class levels..." />}

            {/* ── HERO ── */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Academics • Class & Arms Architecture
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>{currentUser?.firstname || currentUser?.name || "Admin"}.</em>
                  </h1>

                  <p className="db-hero-sub">
                    Configure your school classes, levels, and optional class groups / arms (e.g. <em>JSS 1 Magenta</em>, <em>JSS 1 Gold</em>, <em>Grade 1 A</em>, <em>SS 2 Science</em>).
                  </p>

                  <div className="d-flex flex-wrap gap-2">
                    <button
                      className="db-btn-gold"
                      onClick={() => {
                        setCreateTab("single");
                        setShowCreateModal(true);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      Add Class
                    </button>

                    <button
                      className="db-btn-purple"
                      onClick={() => {
                        setCreateTab("batch");
                        setShowCreateModal(true);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        <circle cx="13" cy="12" r="2" fill="currentColor" />
                      </svg>
                      Batch Arms Generator
                    </button>

                    <button
                      className="db-btn-outline"
                      onClick={fetchLevels}
                      disabled={loadingLevels || busyKey !== null}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        style={{ animation: loadingLevels ? "dbSpin 0.8s linear infinite" : "none" }}
                      >
                        <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Hero mini stat */}
                <div className="db-hero-stat-card d-none d-md-block">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#FBBF24" }}>
                      Academic Summary
                    </span>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M2 12V8M6 12V5M10 12V9M14 12V3" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div>
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Total Classes</span>
                      <span className="db-hero-stat-val">{totalClasses}</span>
                    </div>
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">With Arms / Groups</span>
                      <span className="db-hero-stat-val">{withGroupCount}</span>
                    </div>
                    <div className="db-hero-stat-item">
                      <span className="db-hero-stat-label">Total Enrolled Students</span>
                      <span className="db-hero-stat-val">{totalStudentsEnrolled}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── KPI STAT CARDS ── */}
            <div className="db-stats">
              {[
                {
                  title: "Total Classes",
                  value: totalClasses,
                  hint: "active configured levels",
                  color: "#d97706",
                  bg: "rgba(217,119,6,0.10)",
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path d="M4 6l6-3 6 3-6 3-6-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M4 10l6 3 6-3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M4 14l6 3 6-3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                  ),
                },
                {
                  title: "Classes With Arms",
                  value: withGroupCount,
                  hint: "e.g. Magenta, Gold, A, B",
                  color: "#9333ea",
                  bg: "rgba(147,51,234,0.10)",
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path d="M10 2l2.5 5 5.5.8-4 3.9.9 5.3-4.9-2.6-4.9 2.6.9-5.3-4-3.9 5.5-.8L10 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    </svg>
                  ),
                },
                {
                  title: "Linked to Sections",
                  value: withSectionCount,
                  hint: `${sections.length} sections defined`,
                  color: "#2563eb",
                  bg: "rgba(37,99,235,0.10)",
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M3 9h14M8 9v7" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                  ),
                },
                {
                  title: "Active Students",
                  value: totalStudentsEnrolled,
                  hint: "across all class rosters",
                  color: "#059669",
                  bg: "rgba(16,185,129,0.10)",
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M1 17c0-3.314 2.686-6 6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      <circle cx="14" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M10.5 17c0-1.933 1.567-3.5 3.5-3.5s3.5 1.567 3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  ),
                },
              ].map((c) => (
                <div className="db-stat" key={c.title} style={{ "--sc": c.color, "--si": c.bg } as React.CSSProperties}>
                  <div className="db-stat-head">
                    <div className="db-stat-icon">{c.icon}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c.color, background: c.bg, padding: "2px 8px", borderRadius: 999 }}>
                      Live
                    </span>
                  </div>
                  <p className="db-stat-label">{c.title}</p>
                  <div className="db-stat-val">{c.value}</div>
                  <div className="db-stat-footer">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 9l3-4 2 2 3-5" stroke="var(--sp-success)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{c.hint}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── MAIN DIRECTORY PANEL ── */}
            <div className="db-panel">
              <div className="db-panel-head">
                <div className="db-panel-title-group">
                  <div className="db-panel-icon">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M7 18h6M10 15v3M7 8h6M7 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="db-panel-title">Classes & Streams Register</h3>
                    <p className="db-panel-sub">Manage school levels, arms, sections, and class groupings.</p>
                  </div>
                </div>

                <div className="d-flex align-items-center flex-wrap gap-2">
                  <div className="db-view-toggle">
                    <button
                      type="button"
                      className={`db-view-toggle-btn ${viewMode === "grid" ? "db-view-toggle-btn--active" : ""}`}
                      onClick={() => setViewMode("grid")}
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
                        <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
                        <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
                        <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                      Cards View
                    </button>
                    <button
                      type="button"
                      className={`db-view-toggle-btn ${viewMode === "table" ? "db-view-toggle-btn--active" : ""}`}
                      onClick={() => setViewMode("table")}
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <path d="M2 4.5h12M2 8h12M2 11.5h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      Table View
                    </button>
                  </div>

                  <button
                    className="db-chip"
                    onClick={() => setShowArchived((v) => !v)}
                    disabled={busyKey !== null}
                    type="button"
                    style={{ padding: "7px 12px", borderRadius: 8 }}
                  >
                    {showArchived ? "Show Active Classes" : "View Archived Classes"}
                  </button>
                </div>
              </div>

              {/* Filter Controls Bar */}
              <div className="db-filter-bar">
                <div className="d-flex align-items-center flex-wrap gap-2" style={{ flex: 1 }}>
                  <div className="db-search-input-wrap">
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <input
                      className="db-search-input"
                      placeholder="Search class name, arm, or section…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>

                  {/* Section Filter Dropdown */}
                  <select
                    className="db-filter-select"
                    value={selectedSectionFilter}
                    onChange={(e) => setSelectedSectionFilter(e.target.value)}
                  >
                    <option value="all">All Sections ({sections.length})</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                    <option value="none">Unassigned Sections</option>
                  </select>

                  {/* Group Filter Dropdown */}
                  <select
                    className="db-filter-select"
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value as any)}
                  >
                    <option value="all">All Arm Groupings</option>
                    <option value="with_group">With Class Group / Arm ({withGroupCount})</option>
                    <option value="standalone">Standalone Classes ({totalClasses - withGroupCount})</option>
                  </select>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: 12, color: "#8b7b6b" }}>
                    Found <strong>{filteredLevels.length}</strong> classes
                  </span>
                </div>
              </div>

              {/* ── CARD GRID VIEW (Grouped by Section) ── */}
              {viewMode === "grid" && (
                <div>
                  {loadingLevels ? (
                    <div style={{ padding: 48, textAlign: "center", color: "#8b7b6b" }}>
                      <span className="spinner-border spinner-border-sm text-warning" />
                      <span style={{ marginLeft: 8 }}>Loading classes…</span>
                    </div>
                  ) : filteredLevels.length === 0 ? (
                    <div style={{ padding: 48, textAlign: "center" }}>
                      <div style={{ fontSize: 36, marginBottom: 12 }}>🏫</div>
                      <h4 style={{ fontFamily: "Playfair Display, serif", color: "var(--sp-dark)", marginBottom: 6 }}>
                        No classes match your filter
                      </h4>
                      <p style={{ fontSize: 13, color: "#8b7b6b", maxWidth: 420, margin: "0 auto 16px" }}>
                        Try searching for a different class name or click "Add Class" to register a new class level.
                      </p>
                      <button
                        className="db-btn-gold"
                        onClick={() => {
                          setQuery("");
                          setSelectedSectionFilter("all");
                          setGroupFilter("all");
                        }}
                      >
                        Reset Filters
                      </button>
                    </div>
                  ) : (
                    classesBySection.map((group, gIdx) => {
                      const secLabel = group.section?.name ?? "Unassigned Section";
                      return (
                        <div className="db-section-block" key={gIdx}>
                          <div className="db-section-header">
                            <h4 className="db-section-title">
                              <span>📂</span>
                              <span>{secLabel}</span>
                              <span className="db-section-badge-count">{group.items.length} {group.items.length === 1 ? "Class" : "Classes"}</span>
                            </h4>
                          </div>

                          <div className="db-cards-grid">
                            {group.items.map((lvl) => {
                              const armTheme = getArmBadgeColor(lvl.class_group);
                              const busyArchive = isBusy(`level:archive:${lvl.id}`);
                              const busyRestore = isBusy(`level:restore:${lvl.id}`);

                              return (
                                <div className="db-class-card" key={lvl.id}>
                                  <div>
                                    <div className="db-class-top">
                                      {lvl.class_group ? (
                                        <span
                                          className="db-arm-badge"
                                          style={{
                                            background: armTheme.bg,
                                            color: armTheme.color,
                                            borderColor: armTheme.border,
                                          }}
                                        >
                                          ⚡ {lvl.class_group}
                                        </span>
                                      ) : (
                                        <span
                                          className="db-arm-badge"
                                          style={{
                                            background: "rgba(100, 116, 139, 0.08)",
                                            color: "#64748b",
                                            borderColor: "rgba(100, 116, 139, 0.15)",
                                          }}
                                        >
                                          Standalone
                                        </span>
                                      )}

                                      <div className="db-card-actions">
                                        {!showArchived && (
                                          <button
                                            type="button"
                                            className="db-card-btn"
                                            title="Edit Class"
                                            onClick={() => openEdit(lvl)}
                                            disabled={busyKey !== null}
                                          >
                                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                                              <path d="M3 11.5V13h1.5L12.8 4.7 11.3 3.2 3 11.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                                              <path d="M10.6 3.9l1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                            </svg>
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          className={`db-card-btn ${showArchived ? "db-card-btn--restore" : "db-card-btn--danger"}`}
                                          title={showArchived ? "Restore Class" : "Archive Class"}
                                          onClick={() => (showArchived ? restoreLevel(lvl) : archiveLevel(lvl))}
                                          disabled={busyKey !== null}
                                        >
                                          {showArchived ? (
                                            busyRestore ? (
                                              "…"
                                            ) : (
                                              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                                                <path d="M2 8a6 6 0 1011.3-2.8M14 2v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                              </svg>
                                            )
                                          ) : busyArchive ? (
                                            "…"
                                          ) : (
                                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                                              <path d="M3 4h10M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M4 4l1 10a1 1 0 001 1h4a1 1 0 001-1l1-10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                            </svg>
                                          )}
                                        </button>
                                      </div>
                                    </div>

                                    <h4 className="db-class-title" title={lvl.name}>{lvl.name}</h4>
                                    <p className="db-class-desc">{lvl.description || "No special description specified."}</p>
                                  </div>

                                  <div className="db-class-meta-row">
                                    <span className="db-student-headcount">
                                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                        <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                                        <path d="M1 13c0-2.2 1.8-4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                                        <circle cx="11.5" cy="8.5" r="1.8" stroke="currentColor" strokeWidth="1.2" />
                                        <path d="M9 13c0-1.5 1.2-2.8 2.8-2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                                      </svg>
                                      <span>{lvl.students_count ?? 0} {lvl.students_count === 1 ? "Student" : "Students"}</span>
                                    </span>

                                    <span style={{ fontSize: 11, color: "#9a8a7a" }}>ID #{lvl.id}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ── DATA TABLE VIEW ── */}
              {viewMode === "table" && (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table className="db-table">
                      <thead>
                        <tr>
                          <th style={{ width: 60 }}>#</th>
                          <th>Class Name</th>
                          <th>Class Group / Arm</th>
                          <th>Section</th>
                          <th>Students Enrolled</th>
                          <th>Description</th>
                          <th style={{ width: 140, textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {loadingLevels ? (
                          <tr>
                            <td colSpan={7} style={{ padding: 36, textAlign: "center", color: "#8b7b6b" }}>
                              <span className="spinner-border spinner-border-sm text-warning" />
                              <span style={{ marginLeft: 8 }}>Loading classes…</span>
                            </td>
                          </tr>
                        ) : pageRows.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#8b7b6b" }}>
                              <div style={{ fontWeight: 700, color: "var(--sp-dark)", marginBottom: 4 }}>No classes found</div>
                              <div>Try adjusting your search or filters.</div>
                            </td>
                          </tr>
                        ) : (
                          pageRows.map((l, idx) => {
                            const rowNo = (safePage - 1) * perPage + idx + 1;
                            const armTheme = getArmBadgeColor(l.class_group);
                            const busyArchive = isBusy(`level:archive:${l.id}`);
                            const busyRestore = isBusy(`level:restore:${l.id}`);

                            return (
                              <tr key={l.id}>
                                <td style={{ color: "#9a8a7a", fontWeight: 600 }}>{rowNo}</td>

                                <td>
                                  <div style={{ fontWeight: 700, color: "var(--sp-dark)", fontSize: 14 }}>{l.name}</div>
                                  <div style={{ fontSize: 11, color: "#9a8a7a" }}>ID: {l.id}</div>
                                </td>

                                <td>
                                  {l.class_group ? (
                                    <span
                                      className="db-arm-badge"
                                      style={{
                                        background: armTheme.bg,
                                        color: armTheme.color,
                                        borderColor: armTheme.border,
                                      }}
                                    >
                                      ⚡ {l.class_group}
                                    </span>
                                  ) : (
                                    <span style={{ color: "#9a8a7a", fontSize: 12 }}>—</span>
                                  )}
                                </td>

                                <td>
                                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--sp-dark)" }}>
                                    {sectionName(l)}
                                  </span>
                                </td>

                                <td>
                                  <span className="db-student-headcount">
                                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                                      <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.3" />
                                      <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                                    </svg>
                                    {l.students_count ?? 0}
                                  </span>
                                </td>

                                <td style={{ color: "#64748b", maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {l.description || "—"}
                                </td>

                                <td style={{ textAlign: "right" }}>
                                  <div className="d-flex align-items-center justify-content-end gap-1">
                                    {!showArchived && (
                                      <button
                                        type="button"
                                        className="db-card-btn"
                                        title="Edit Class"
                                        onClick={() => openEdit(l)}
                                        disabled={busyKey !== null}
                                      >
                                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                                          <path d="M3 11.5V13h1.5L12.8 4.7 11.3 3.2 3 11.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                                          <path d="M10.6 3.9l1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                        </svg>
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      className={`db-card-btn ${showArchived ? "db-card-btn--restore" : "db-card-btn--danger"}`}
                                      title={showArchived ? "Restore Class" : "Archive Class"}
                                      onClick={() => (showArchived ? restoreLevel(l) : archiveLevel(l))}
                                      disabled={busyKey !== null}
                                    >
                                      {showArchived ? (
                                        busyRestore ? (
                                          "…"
                                        ) : (
                                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                                            <path d="M2 8a6 6 0 1011.3-2.8M14 2v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        )
                                      ) : busyArchive ? (
                                        "…"
                                      ) : (
                                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                                          <path d="M3 4h10M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M4 4l1 10a1 1 0 001 1h4a1 1 0 001-1l1-10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                        </svg>
                                      )}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="db-pagination">
                    <div className="db-page-info">
                      Showing <b>{pageRows.length}</b> of <b>{filteredLevels.length}</b> classes • Page <b>{safePage}</b> of <b>{totalPages}</b>
                    </div>

                    <div className="db-page-btns">
                      <button
                        className="db-page-btn"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={safePage <= 1}
                        type="button"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Prev
                      </button>

                      <span className="db-page-current">{safePage} / {totalPages}</span>

                      <button
                        className="db-page-btn"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage >= totalPages}
                        type="button"
                      >
                        Next
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <Footer />

            {/* =========================================================
                MODAL: ADD CLASS (Single & Batch Arms Generator)
            ========================================================= */}
            {showCreateModal && (
              <div
                className="db-modal-overlay"
                onMouseDown={() => {
                  if (busyKey) return;
                  setShowCreateModal(false);
                }}
              >
                <div className="db-modal-box" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="db-modal-header">
                    <button
                      className="db-modal-close-btn"
                      onClick={() => setShowCreateModal(false)}
                      disabled={busyKey !== null}
                      type="button"
                    >
                      ✕
                    </button>
                    <h3 className="db-modal-header-title">Create Class Level</h3>
                    <p className="db-modal-header-sub">
                      Add a single class or use the Batch Arms Generator to create multiple arms (Magenta, Gold, etc.) at once.
                    </p>
                  </div>

                  <div className="db-modal-tabs">
                    <button
                      type="button"
                      className={`db-modal-tab ${createTab === "single" ? "db-modal-tab--active" : ""}`}
                      onClick={() => setCreateTab("single")}
                    >
                      <span>📝</span>
                      <span>Single Class Mode</span>
                    </button>

                    <button
                      type="button"
                      className={`db-modal-tab ${createTab === "batch" ? "db-modal-tab--active" : ""}`}
                      onClick={() => setCreateTab("batch")}
                    >
                      <span>✨</span>
                      <span>Batch Arms Generator</span>
                    </button>
                  </div>

                  <div className="db-modal-content">
                    {/* ── SINGLE CLASS TAB ── */}
                    {createTab === "single" && (
                      <div className="d-flex flex-column gap-3">
                        <div>
                          <label className="db-form-label">
                            Base Level / Class Name <span>*</span>
                          </label>
                          <input
                            className="db-form-input"
                            placeholder="e.g. JSS 1, Grade 4, Nursery 2, SS 3"
                            value={createForm.base_name}
                            onChange={(e) => setCreateForm({ ...createForm, base_name: e.target.value })}
                          />

                          {/* Quick Base Presets */}
                          <div className="db-chips-wrap">
                            <span style={{ fontSize: 11, color: "#8b7b6b", alignSelf: "center", marginRight: 2 }}>Presets:</span>
                            {["Nursery 1", "Pry 1", "Pry 6", "JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3", "Grade 1"].map((b) => (
                              <button
                                key={b}
                                type="button"
                                className={`db-chip ${createForm.base_name === b ? "db-chip--active" : ""}`}
                                onClick={() => setCreateForm({ ...createForm, base_name: b })}
                              >
                                {b}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Optional Class Group / Arm */}
                        <div>
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <label className="db-form-label mb-0">
                              Class Group / Arm <small style={{ fontWeight: 400, color: "#8b7b6b" }}>(Optional)</small>
                            </label>
                            {createForm.class_group && (
                              <button
                                type="button"
                                style={{ background: "none", border: "none", color: "#dc2626", fontSize: 11, cursor: "pointer" }}
                                onClick={() => setCreateForm({ ...createForm, class_group: "" })}
                              >
                                Clear Arm
                              </button>
                            )}
                          </div>
                          <input
                            className="db-form-input"
                            placeholder="e.g. Magenta, Gold, Diamond, A, B, Science"
                            value={createForm.class_group}
                            onChange={(e) => setCreateForm({ ...createForm, class_group: e.target.value })}
                          />
                          <p className="db-form-hint">
                            Add an arm to distinguish classes in the same level (e.g., <em>JSS 1 Magenta</em> vs <em>JSS 1 Gold</em>).
                          </p>

                          {/* Quick Arm Suggestion Chips */}
                          <div className="db-chips-wrap">
                            <span style={{ fontSize: 11, color: "#8b7b6b", alignSelf: "center", marginRight: 2 }}>Quick Arms:</span>
                            {["Magenta", "Gold", "Diamond", "Silver", "A", "B", "C", "Science", "Commercial", "Art"].map((arm) => (
                              <button
                                key={arm}
                                type="button"
                                className={`db-chip ${createForm.class_group === arm ? "db-chip--active" : ""}`}
                                onClick={() => setCreateForm({ ...createForm, class_group: arm })}
                              >
                                {arm}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Live Preview Box */}
                        {computedSingleName && (
                          <div className="db-live-preview-box">
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#b45309", letterSpacing: ".06em" }}>
                                Class Preview
                              </div>
                              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--sp-dark)", marginTop: 2 }}>
                                {computedSingleName}
                              </div>
                            </div>

                            {createForm.class_group && (
                              <span
                                className="db-arm-badge"
                                style={getArmBadgeColor(createForm.class_group)}
                              >
                                ⚡ Group: {createForm.class_group.toUpperCase()}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Section Selection */}
                        <div>
                          <label className="db-form-label">
                            Linked Section <small style={{ fontWeight: 400, color: "#8b7b6b" }}>(Optional)</small>
                          </label>
                          <select
                            className="db-form-select"
                            value={createForm.section_id}
                            onChange={(e) => setCreateForm({ ...createForm, section_id: e.target.value })}
                            disabled={loadingSections}
                          >
                            <option value="">— Not Linked to Any Section —</option>
                            {sections.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="db-form-label">
                            Description <small style={{ fontWeight: 400, color: "#8b7b6b" }}>(Optional)</small>
                          </label>
                          <textarea
                            className="db-form-textarea"
                            rows={2}
                            placeholder="e.g. Junior Secondary Level 1 — Gold Arm"
                            value={createForm.description}
                            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    {/* ── BATCH ARMS TAB ── */}
                    {createTab === "batch" && (
                      <div className="d-flex flex-column gap-3">
                        <div className="p-3" style={{ background: "rgba(147, 51, 234, 0.06)", border: "1px solid rgba(147, 51, 234, 0.2)", borderRadius: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#7e22ce", marginBottom: 2 }}>
                            ⚡ Batch Class & Arms Generator
                          </div>
                          <div style={{ fontSize: 12, color: "#6b21a8", lineHeight: 1.5 }}>
                            Instantly create multiple arms for a level (e.g. <em>JSS 1 Magenta</em>, <em>JSS 1 Gold</em>, <em>JSS 1 Diamond</em>) with one click.
                          </div>
                        </div>

                        <div>
                          <label className="db-form-label">
                            Base Level Name <span>*</span>
                          </label>
                          <input
                            className="db-form-input"
                            placeholder="e.g. JSS 1, SS 2, Grade 5"
                            value={batchForm.base_name}
                            onChange={(e) => setBatchForm({ ...batchForm, base_name: e.target.value })}
                          />

                          <div className="db-chips-wrap">
                            <span style={{ fontSize: 11, color: "#8b7b6b", alignSelf: "center", marginRight: 2 }}>Base:</span>
                            {["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3", "Grade 1", "Grade 2"].map((b) => (
                              <button
                                key={b}
                                type="button"
                                className={`db-chip ${batchForm.base_name === b ? "db-chip--active" : ""}`}
                                onClick={() => setBatchForm({ ...batchForm, base_name: b })}
                              >
                                {b}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Arm Packs Presets */}
                        <div>
                          <label className="db-form-label">
                            Arm Packs & Themes
                          </label>
                          <div className="d-flex flex-wrap gap-2 mb-2">
                            <button
                              type="button"
                              className="db-chip"
                              onClick={() => setBatchForm({ ...batchForm, selected_arms: ARM_PRESETS.colors.slice(0, 4) })}
                            >
                              🎨 Colors (Magenta, Gold, Silver, Diamond)
                            </button>
                            <button
                              type="button"
                              className="db-chip"
                              onClick={() => setBatchForm({ ...batchForm, selected_arms: ARM_PRESETS.letters })}
                            >
                              🔤 Alphabets (A, B, C, D, E)
                            </button>
                            <button
                              type="button"
                              className="db-chip"
                              onClick={() => setBatchForm({ ...batchForm, selected_arms: ARM_PRESETS.tracks })}
                            >
                              🎓 Senior Tracks (Science, Commercial, Art)
                            </button>
                          </div>
                        </div>

                        {/* Selected Arms Tags */}
                        <div>
                          <label className="db-form-label">
                            Active Arms to Generate ({batchForm.selected_arms.length}) <span>*</span>
                          </label>

                          <div className="d-flex flex-wrap gap-2 p-2" style={{ background: "#f8fafc", border: "1px solid var(--sp-border)", borderRadius: 10, minHeight: 44 }}>
                            {batchForm.selected_arms.map((arm) => (
                              <span
                                key={arm}
                                className="db-arm-badge"
                                style={{ ...getArmBadgeColor(arm), padding: "4px 10px", fontSize: 12 }}
                              >
                                {arm}
                                <button
                                  type="button"
                                  onClick={() => handleToggleBatchArm(arm)}
                                  style={{ background: "none", border: "none", color: "inherit", marginLeft: 4, cursor: "pointer", padding: 0, fontWeight: "bold" }}
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>

                          {/* Add Custom Arm Input */}
                          <div className="d-flex align-items-center gap-2 mt-2">
                            <input
                              className="db-form-input"
                              style={{ flex: 1 }}
                              placeholder="Type custom arm name (e.g. Emerald, Blue, Alpha)..."
                              value={batchForm.custom_arm_input}
                              onChange={(e) => setBatchForm({ ...batchForm, custom_arm_input: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddCustomArm();
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="db-btn-gold"
                              style={{ padding: "8px 14px", fontSize: 12.5 }}
                              onClick={handleAddCustomArm}
                            >
                              + Add Arm
                            </button>
                          </div>
                        </div>

                        {/* Section Selection */}
                        <div>
                          <label className="db-form-label">
                            Linked Section <small style={{ fontWeight: 400, color: "#8b7b6b" }}>(Optional)</small>
                          </label>
                          <select
                            className="db-form-select"
                            value={batchForm.section_id}
                            onChange={(e) => setBatchForm({ ...batchForm, section_id: e.target.value })}
                            disabled={loadingSections}
                          >
                            <option value="">— Not Linked to Any Section —</option>
                            {sections.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Batch Generated Classes Preview */}
                        {batchForm.base_name && batchForm.selected_arms.length > 0 && (
                          <div className="db-live-preview-box">
                            <div style={{ width: "100%" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#7e22ce", letterSpacing: ".06em", marginBottom: 6 }}>
                                Classes to be Created ({batchForm.selected_arms.length}):
                              </div>
                              <div className="d-flex flex-wrap gap-2">
                                {batchForm.selected_arms.map((arm) => (
                                  <span key={arm} style={{ fontSize: 12, fontWeight: 700, color: "var(--sp-dark)", background: "#fff", border: "1px solid var(--sp-border)", padding: "3px 8px", borderRadius: 6 }}>
                                    ✨ {batchForm.base_name.trim().toUpperCase()} {arm.trim().toUpperCase()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="db-modal-footer">
                    <button
                      className="db-btn-cancel"
                      onClick={() => setShowCreateModal(false)}
                      disabled={busyKey !== null}
                      type="button"
                    >
                      Cancel
                    </button>

                    {createTab === "single" ? (
                      <button
                        className="db-btn-save"
                        onClick={createSingleLevel}
                        disabled={busyKey !== null || !computedSingleName}
                        type="button"
                      >
                        {isBusy("level:create:single") ? (
                          <>
                            <span className="spinner-border spinner-border-sm" />
                            Creating…
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                              <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Create Class
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        className="db-btn-save"
                        style={{ background: "linear-gradient(135deg, #7C3AED, #9333EA)" }}
                        onClick={createBatchArms}
                        disabled={busyKey !== null || !batchForm.base_name || !batchForm.selected_arms.length}
                        type="button"
                      >
                        {isBusy("level:create:batch") ? (
                          <>
                            <span className="spinner-border spinner-border-sm" />
                            Generating…
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                              <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                            </svg>
                            Generate All {batchForm.selected_arms.length} Arms
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                MODAL: EDIT CLASS
            ========================================================= */}
            {showEditModal && editId && (
              <div
                className="db-modal-overlay"
                onMouseDown={() => {
                  if (busyKey) return;
                  setShowEditModal(false);
                }}
              >
                <div className="db-modal-box" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="db-modal-header">
                    <button
                      className="db-modal-close-btn"
                      onClick={() => setShowEditModal(false)}
                      disabled={busyKey !== null}
                      type="button"
                    >
                      ✕
                    </button>
                    <h3 className="db-modal-header-title">Edit Class</h3>
                    <p className="db-modal-header-sub">
                      Update class name, optional arm/group, and section linkage.
                    </p>
                  </div>

                  <div className="db-modal-content">
                    <div className="d-flex flex-column gap-3">
                      <div>
                        <label className="db-form-label">
                          Full Class Name <span>*</span>
                        </label>
                        <input
                          className="db-form-input"
                          placeholder="e.g. JSS 1 MAGENTA, GRADE 4 GOLD"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="db-form-label">
                          Class Group / Arm <small style={{ fontWeight: 400, color: "#8b7b6b" }}>(Optional)</small>
                        </label>
                        <input
                          className="db-form-input"
                          placeholder="e.g. Magenta, Gold, Diamond, A, B, Science"
                          value={editForm.class_group}
                          onChange={(e) => setEditForm({ ...editForm, class_group: e.target.value })}
                        />

                        {/* Quick Arm Suggestion Chips */}
                        <div className="db-chips-wrap">
                          <span style={{ fontSize: 11, color: "#8b7b6b", alignSelf: "center", marginRight: 2 }}>Presets:</span>
                          {["Magenta", "Gold", "Diamond", "Silver", "A", "B", "C", "Science", "Commercial", "Art"].map((arm) => (
                            <button
                              key={arm}
                              type="button"
                              className={`db-chip ${editForm.class_group === arm ? "db-chip--active" : ""}`}
                              onClick={() => setEditForm({ ...editForm, class_group: arm })}
                            >
                              {arm}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="db-form-label">
                          Section <small style={{ fontWeight: 400, color: "#8b7b6b" }}>(Optional)</small>
                        </label>
                        <select
                          className="db-form-select"
                          value={editForm.section_id}
                          onChange={(e) => setEditForm({ ...editForm, section_id: e.target.value })}
                          disabled={loadingSections}
                        >
                          <option value="">— Not Linked to Any Section —</option>
                          {sections.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="db-form-label">
                          Description <small style={{ fontWeight: 400, color: "#8b7b6b" }}>(Optional)</small>
                        </label>
                        <textarea
                          className="db-form-textarea"
                          rows={2}
                          placeholder="Optional notes or description"
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="db-modal-footer">
                    <button
                      className="db-btn-cancel"
                      onClick={() => setShowEditModal(false)}
                      disabled={busyKey !== null}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="db-btn-save"
                      onClick={updateLevel}
                      disabled={busyKey !== null || !editForm.name.trim()}
                      type="button"
                    >
                      {isBusy(`level:update:${editId}`) ? (
                        <>
                          <span className="spinner-border spinner-border-sm" />
                          Updating…
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Update Class
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
