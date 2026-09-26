// src/pages/Admin/Academics/GradingScalePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";
import { getUser } from "../../../utils/token";

/* =========================================================
   TYPES
========================================================= */
export type GradeBand = {
  id?: number | null;
  school_id?: number;
  section_id?: number;
  min: number;
  max: number;
  grade: string;
  remark: string;
  gpa_point?: number | null;
  color?: string | null;
  sort_order?: number;
};

export type SectionGrading = {
  id: number;
  name: string;
  uses_grading_scale: boolean;
  grading_system_type?: string;
  is_customized?: boolean;
  grading_scales: GradeBand[];
};

export type PresetScale = {
  name: string;
  description: string;
  scales: {
    min: number;
    max: number;
    grade: string;
    remark: string;
    gpa_point?: number;
    color?: string;
  }[];
};

export type PresetsMap = Record<string, PresetScale>;

/* =========================================================
   COLOR PALETTES & PRESETS
========================================================= */
const COLOR_SWATCHES = [
  { label: "Emerald Green", hex: "#10B981" },
  { label: "Forest Green", hex: "#059669" },
  { label: "Royal Blue", hex: "#2563EB" },
  { label: "Sky Blue", hex: "#3B82F6" },
  { label: "Indigo", hex: "#6366F1" },
  { label: "Purple", hex: "#8B5CF6" },
  { label: "Amber / Gold", hex: "#F59E0B" },
  { label: "Warm Orange", hex: "#EA580C" },
  { label: "Rose Pink", hex: "#EC4899" },
  { label: "Crimson Red", hex: "#EF4444" },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getErrorMessage(err: any): string {
  const status = err?.response?.status;
  const data = err?.response?.data;
  if (status === 409) return data?.message ?? "A conflict occurred.";
  if (status === 404) return data?.message ?? "Section or grading scale not found.";
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

/* =========================================================
   MAIN COMPONENT
========================================================= */
export default function GradingScalePage() {
  const { showSuccess, showError } = useToast();
  const user = getUser();

  // Layout state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingSectionId, setSavingSectionId] = useState<number | null>(null);
  const [togglingSectionId, setTogglingSectionId] = useState<number | null>(null);

  // Data state
  const [sections, setSections] = useState<SectionGrading[]>([]);
  const [presets, setPresets] = useState<PresetsMap>({});
  const [activeTabSectionId, setActiveTabSectionId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit working copies (sectionId -> GradeBand[])
  const [workingScales, setWorkingScales] = useState<Record<number, GradeBand[]>>({});
  const [dirtySections, setDirtySections] = useState<Record<number, boolean>>({});

  // Modal State for adding/editing a specific grade band
  const [bandModalOpen, setBandModalOpen] = useState(false);
  const [editingBandSectionId, setEditingBandSectionId] = useState<number | null>(null);
  const [editingBandIndex, setEditingBandIndex] = useState<number | null>(null); // null = new band
  const [bandForm, setBandForm] = useState<{
    min: string;
    max: string;
    grade: string;
    remark: string;
    gpa_point: string;
    color: string;
  }>({
    min: "0",
    max: "100",
    grade: "",
    remark: "",
    gpa_point: "0.0",
    color: "#3B82F6",
  });

  // Preset Confirmation Modal
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("waec_9point");
  const [presetTargetSectionId, setPresetTargetSectionId] = useState<number | null>(null);

  /* =========================================================
     FETCH DATA
  ========================================================= */
  const fetchGradingData = async () => {
    try {
      setLoading(true);
      const res = await authApi.get("/grading-scales");
      const fetchedSections: SectionGrading[] = res.data?.sections || [];
      const fetchedPresets: PresetsMap = res.data?.presets || {};

      setSections(fetchedSections);
      setPresets(fetchedPresets);

      // Initialize working copies
      const initialWorking: Record<number, GradeBand[]> = {};
      fetchedSections.forEach((s) => {
        initialWorking[s.id] = [...s.grading_scales];
      });
      setWorkingScales(initialWorking);
      setDirtySections({});

      if (fetchedSections.length > 0 && activeTabSectionId === null) {
        setActiveTabSectionId(fetchedSections[0].id);
      }
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGradingData();
  }, []);

  /* =========================================================
     COMPUTED STATS
  ========================================================= */
  const stats = useMemo(() => {
    const total = sections.length;
    const enabled = sections.filter((s) => s.uses_grading_scale).length;
    const disabled = total - enabled;
    const totalBands = Object.values(workingScales).reduce((acc, bands) => acc + bands.length, 0);
    return { total, enabled, disabled, totalBands };
  }, [sections, workingScales]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter((s) => s.name.toLowerCase().includes(q));
  }, [sections, searchQuery]);

  const activeSection = useMemo(() => {
    return sections.find((s) => s.id === activeTabSectionId) || sections[0] || null;
  }, [sections, activeTabSectionId]);

  const activeBands = useMemo(() => {
    if (!activeSection) return [];
    return workingScales[activeSection.id] || [];
  }, [activeSection, workingScales]);

  // Score coverage validation for active section (0 to 100 coverage check)
  const coverageAnalysis = useMemo(() => {
    if (!activeSection || !activeSection.uses_grading_scale || activeBands.length === 0) {
      return { isComplete: true, minScore: 0, maxScore: 100 };
    }

    // Sort descending by min
    const sorted = [...activeBands].sort((a, b) => b.min - a.min);
    const minScore = Math.min(...sorted.map((b) => b.min));
    const maxScore = Math.max(...sorted.map((b) => b.max));

    return {
      isComplete: minScore <= 0 && maxScore >= 100,
      minScore,
      maxScore,
    };
  }, [activeSection, activeBands]);

  /* =========================================================
     ACTIONS & HANDLERS
  ========================================================= */
  const handleToggleGrading = async (sectionId: number, currentStatus: boolean) => {
    try {
      setTogglingSectionId(sectionId);
      const newStatus = !currentStatus;
      await authApi.post(`/grading-scales/section/${sectionId}/toggle`, {
        uses_grading_scale: newStatus,
      });

      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, uses_grading_scale: newStatus } : s))
      );

      showSuccess(
        newStatus
          ? "Letter grading enabled for this section."
          : "Letter grading disabled. Report cards for this section will show marks without letter grades."
      );
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setTogglingSectionId(null);
    }
  };

  const handleOpenBandModal = (sectionId: number, index: number | null = null) => {
    setEditingBandSectionId(sectionId);
    setEditingBandIndex(index);

    const bands = workingScales[sectionId] || [];
    if (index !== null && bands[index]) {
      const b = bands[index];
      setBandForm({
        min: String(b.min),
        max: String(b.max),
        grade: b.grade,
        remark: b.remark || "",
        gpa_point: b.gpa_point !== null && b.gpa_point !== undefined ? String(b.gpa_point) : "0.0",
        color: b.color || "#3B82F6",
      });
    } else {
      // Defaults for new band
      setBandForm({
        min: "0",
        max: "39.99",
        grade: "",
        remark: "",
        gpa_point: "0.0",
        color: "#3B82F6",
      });
    }
    setBandModalOpen(true);
  };

  const handleSaveBandModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBandSectionId) return;

    const minVal = parseFloat(bandForm.min);
    const maxVal = parseFloat(bandForm.max);
    const gradeVal = bandForm.grade.trim().toUpperCase();
    const remarkVal = bandForm.remark.trim();
    const gpaVal = parseFloat(bandForm.gpa_point || "0");

    if (isNaN(minVal) || isNaN(maxVal) || minVal < 0 || maxVal > 100) {
      showError("Score range must be between 0 and 100.");
      return;
    }
    if (minVal > maxVal) {
      showError("Minimum score cannot be greater than Maximum score.");
      return;
    }
    if (!gradeVal) {
      showError("Please enter a Grade code / letter (e.g. A, A1, Distinction).");
      return;
    }

    const currentBands = [...(workingScales[editingBandSectionId] || [])];
    const newBand: GradeBand = {
      id: editingBandIndex !== null ? currentBands[editingBandIndex]?.id : null,
      school_id: user?.school_id,
      section_id: editingBandSectionId,
      min: minVal,
      max: maxVal,
      grade: gradeVal,
      remark: remarkVal,
      gpa_point: isNaN(gpaVal) ? null : gpaVal,
      color: bandForm.color,
      sort_order: editingBandIndex !== null ? editingBandIndex : currentBands.length,
    };

    if (editingBandIndex !== null) {
      currentBands[editingBandIndex] = newBand;
    } else {
      currentBands.push(newBand);
    }

    // Sort descending by min score
    currentBands.sort((a, b) => b.min - a.min);

    setWorkingScales((prev) => ({ ...prev, [editingBandSectionId]: currentBands }));
    setDirtySections((prev) => ({ ...prev, [editingBandSectionId]: true }));
    setBandModalOpen(false);
  };

  const handleDeleteBand = (sectionId: number, index: number) => {
    const currentBands = [...(workingScales[sectionId] || [])];
    currentBands.splice(index, 1);
    setWorkingScales((prev) => ({ ...prev, [sectionId]: currentBands }));
    setDirtySections((prev) => ({ ...prev, [sectionId]: true }));
  };

  const handleSaveSectionGrading = async (sectionId: number) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    const bands = workingScales[sectionId] || [];

    if (section.uses_grading_scale && bands.length === 0) {
      showError("Grading is enabled for this section, but no grade bands are configured. Add at least one grade band or disable grading.");
      return;
    }

    try {
      setSavingSectionId(sectionId);
      const res = await authApi.put(`/grading-scales/section/${sectionId}`, {
        uses_grading_scale: section.uses_grading_scale,
        grading_system_type: section.grading_system_type || "custom",
        scales: bands,
      });

      showSuccess(res.data?.message || `Grading scale for ${section.name} saved successfully!`);
      setDirtySections((prev) => ({ ...prev, [sectionId]: false }));

      // Update local section state
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, is_customized: true, grading_scales: bands } : s))
      );
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setSavingSectionId(null);
    }
  };

  const handleResetSection = (sectionId: number) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    setWorkingScales((prev) => ({ ...prev, [sectionId]: [...section.grading_scales] }));
    setDirtySections((prev) => ({ ...prev, [sectionId]: false }));
  };

  const handleOpenPresetModal = (sectionId: number) => {
    setPresetTargetSectionId(sectionId);
    const sec = sections.find((s) => s.id === sectionId);
    const defaultPreset = sec?.grading_system_type && presets[sec.grading_system_type]
      ? sec.grading_system_type
      : "waec_9point";
    setSelectedPresetKey(defaultPreset);
    setPresetModalOpen(true);
  };

  const handleApplyPreset = async () => {
    if (!presetTargetSectionId || !selectedPresetKey) return;
    const selectedPreset = presets[selectedPresetKey];
    if (!selectedPreset) return;

    try {
      setSavingSectionId(presetTargetSectionId);
      await authApi.post(`/grading-scales/section/${presetTargetSectionId}/apply-preset`, {
        preset_key: selectedPresetKey,
      });

      const formattedBands: GradeBand[] = selectedPreset.scales.map((s, idx) => ({
        id: null,
        school_id: user?.school_id,
        section_id: presetTargetSectionId,
        min: s.min,
        max: s.max,
        grade: s.grade,
        remark: s.remark,
        gpa_point: s.gpa_point ?? null,
        color: s.color || "#3B82F6",
        sort_order: idx,
      }));

      setWorkingScales((prev) => ({ ...prev, [presetTargetSectionId]: formattedBands }));
      setSections((prev) =>
        prev.map((s) =>
          s.id === presetTargetSectionId
            ? {
                ...s,
                uses_grading_scale: true,
                grading_system_type: selectedPresetKey,
                is_customized: true,
                grading_scales: formattedBands,
              }
            : s
        )
      );
      setDirtySections((prev) => ({ ...prev, [presetTargetSectionId]: false }));
      setPresetModalOpen(false);
      showSuccess(`Preset '${selectedPreset.name}' applied successfully.`);
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setSavingSectionId(null);
    }
  };

  return (
    <>
      <style>{`
        /* ======= GradingScalePage - Layout & Theme ======= */
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap');
        
        .db-main {
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          padding: 24px 28px 48px;
        }

        .active-section-tab {
          background: linear-gradient(135deg, #0F2744 0%, #1E4976 100%) !important;
          color: #ffffff !important;
          box-shadow: 0 4px 14px rgba(15, 39, 68, 0.18) !important;
        }

        .spin-animation {
          animation: dbSpin 0.8s linear infinite;
        }

        @keyframes dbSpin {
          to { transform: rotate(360deg); }
        }

        .cursor-pointer {
          cursor: pointer;
        }

        .transition-all {
          transition: all 0.2s ease-in-out;
        }
      `}</style>

      <PageTitle title="Grading Scales & Evaluation System | SchoolProfit" />
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {/* Header Banner */}
            <div
              className="mb-4 p-4 rounded-4 position-relative overflow-hidden shadow-sm"
              style={{
                background: "linear-gradient(135deg, #0F2744 0%, #17375E 60%, #1E4976 100%)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              {/* Subtle background glow */}
              <div
                style={{
                  position: "absolute",
                  top: -40,
                  right: -40,
                  width: 220,
                  height: 220,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(59,130,246,0.3) 0%, rgba(255,255,255,0) 70%)",
                  pointerEvents: "none",
                }}
              />

              <div className="row align-items-center position-relative">
                <div className="col-lg-8">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span
                      className="badge rounded-pill px-3 py-1"
                      style={{
                        background: "rgba(59, 130, 246, 0.25)",
                        border: "1px solid rgba(59, 130, 246, 0.4)",
                        color: "#93C5FD",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                      }}
                    >
                      ACADEMIC EVALUATION SYSTEM
                    </span>
                    <span className="text-light opacity-50">•</span>
                    <span className="text-light opacity-75 small">{getGreeting()}, {user?.name || "Administrator"}</span>
                  </div>

                  <h1 className="h3 fw-bold mb-2 text-white" style={{ fontFamily: "Playfair Display, Georgia, serif", letterSpacing: "-0.01em" }}>
                    Section-Based Grading Scales
                  </h1>
                  <p className="mb-0 text-light opacity-85 small" style={{ maxWidth: 700, lineHeight: 1.6 }}>
                    Configure customized score ranges, letter grades, performance remarks, and GPA weights for each school section.
                    You can also selectively disable letter grading for foundational sections (e.g. Nursery, Creche, Primary) to display purely raw marks on report cards.
                  </p>
                </div>

                <div className="col-lg-4 text-lg-end mt-3 mt-lg-0">
                  <button
                    type="button"
                    className="btn btn-light rounded-pill px-4 py-2 fw-semibold d-inline-flex align-items-center gap-2 shadow-sm"
                    style={{ color: "#0F2744", fontSize: "0.875rem" }}
                    onClick={fetchGradingData}
                    disabled={loading}
                  >
                    <i className={`bi bi-arrow-clockwise ${loading ? "spin-animation" : ""}`} />
                    Refresh Scales
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-3">
                <div
                  className="card h-100 border-0 rounded-4 p-3"
                  style={{
                    background: "#ffffff",
                    boxShadow: "0 2px 12px -2px rgba(15, 39, 68, 0.05)",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-muted small fw-medium">Total Sections</span>
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3"
                      style={{ width: 36, height: 36, background: "rgba(15, 39, 68, 0.08)", color: "#0F2744" }}
                    >
                      <i className="bi bi-diagram-3-fill fs-6" />
                    </div>
                  </div>
                  <h3 className="fw-bold mb-0 text-dark">{stats.total}</h3>
                  <span className="text-muted small mt-1">School educational sections</span>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div
                  className="card h-100 border-0 rounded-4 p-3"
                  style={{
                    background: "#ffffff",
                    boxShadow: "0 2px 12px -2px rgba(15, 39, 68, 0.05)",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-muted small fw-medium">Letter Grading Active</span>
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3"
                      style={{ width: 36, height: 36, background: "rgba(16, 185, 129, 0.12)", color: "#10B981" }}
                    >
                      <i className="bi bi-award-fill fs-6" />
                    </div>
                  </div>
                  <h3 className="fw-bold mb-0 text-success">{stats.enabled}</h3>
                  <span className="text-muted small mt-1">Sections using A–F or WAEC scales</span>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div
                  className="card h-100 border-0 rounded-4 p-3"
                  style={{
                    background: "#ffffff",
                    boxShadow: "0 2px 12px -2px rgba(15, 39, 68, 0.05)",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-muted small fw-medium">No-Grade Sections</span>
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3"
                      style={{ width: 36, height: 36, background: "rgba(245, 158, 11, 0.12)", color: "#D97706" }}
                    >
                      <i className="bi bi-dash-circle-fill fs-6" />
                    </div>
                  </div>
                  <h3 className="fw-bold mb-0" style={{ color: "#D97706" }}>{stats.disabled}</h3>
                  <span className="text-muted small mt-1">Showing raw marks only (e.g. Primary)</span>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div
                  className="card h-100 border-0 rounded-4 p-3"
                  style={{
                    background: "#ffffff",
                    boxShadow: "0 2px 12px -2px rgba(15, 39, 68, 0.05)",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-muted small fw-medium">Active Grade Bands</span>
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3"
                      style={{ width: 36, height: 36, background: "rgba(37, 99, 235, 0.12)", color: "#2563EB" }}
                    >
                      <i className="bi bi-sliders fs-6" />
                    </div>
                  </div>
                  <h3 className="fw-bold mb-0 text-primary">{stats.totalBands}</h3>
                  <span className="text-muted small mt-1">Configured score tiers</span>
                </div>
              </div>
            </div>

            {/* Loading View */}
            {loading ? (
              <div className="card border-0 rounded-4 p-5 text-center bg-white shadow-sm my-4">
                <Loader />
                <p className="text-muted mt-3 mb-0">Loading section grading scales and presets...</p>
              </div>
            ) : sections.length === 0 ? (
              /* Empty State */
              <div className="card border-0 rounded-4 p-5 text-center bg-white shadow-sm my-4">
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 mx-auto"
                  style={{ width: 72, height: 72, background: "rgba(15, 39, 68, 0.06)", color: "#0F2744" }}
                >
                  <i className="bi bi-folder-x fs-2" />
                </div>
                <h4 className="fw-bold text-dark mb-2">No Academic Sections Found</h4>
                <p className="text-muted mx-auto mb-4" style={{ maxWidth: 460 }}>
                  You have not created any sections yet. Please go to Academics &gt; Sections to create sections like Primary, Junior Secondary, and Senior Secondary first.
                </p>
                <div>
                  <a href="/sections" className="btn btn-primary rounded-pill px-4 py-2 fw-semibold">
                    <i className="bi bi-plus-lg me-2" /> Go to Sections
                  </a>
                </div>
              </div>
            ) : (
              /* Main Workspace */
              <div className="row g-4">
                {/* Left Column: Section Selector Tabs */}
                <div className="col-lg-4 col-xl-3">
                  <div
                    className="card border-0 rounded-4 shadow-sm overflow-hidden"
                    style={{ background: "#ffffff", border: "1px solid #E2E8F0" }}
                  >
                    <div className="p-3 border-bottom" style={{ background: "#FAFCFF" }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="fw-bold text-dark small text-uppercase" style={{ letterSpacing: "0.05em" }}>
                          School Sections
                        </span>
                        <span className="badge bg-light text-muted border rounded-pill">{sections.length}</span>
                      </div>

                      <div className="position-relative">
                        <i
                          className="bi bi-search position-absolute text-muted"
                          style={{ top: "50%", left: 12, transform: "translateY(-50%)", fontSize: "0.85rem" }}
                        />
                        <input
                          type="text"
                          className="form-control form-control-sm rounded-pill ps-4"
                          placeholder="Search section..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          style={{ fontSize: "0.85rem" }}
                        />
                      </div>
                    </div>

                    <div className="list-group list-group-flush p-2" style={{ maxHeight: 520, overflowY: "auto" }}>
                      {filteredSections.map((sec) => {
                        const isActive = sec.id === activeTabSectionId;
                        const isDirty = !!dirtySections[sec.id];
                        const bandsCount = (workingScales[sec.id] || []).length;

                        return (
                          <button
                            key={sec.id}
                            type="button"
                            className={`list-group-item list-group-item-action rounded-3 border-0 p-3 mb-1 text-start transition-all ${
                              isActive ? "active-section-tab" : ""
                            }`}
                            onClick={() => setActiveTabSectionId(sec.id)}
                            style={{
                              background: isActive ? "linear-gradient(135deg, #0F2744 0%, #1E4976 100%)" : "transparent",
                              color: isActive ? "#ffffff" : "#1E293B",
                              border: isActive ? "none" : "1px solid transparent",
                            }}
                          >
                            <div className="d-flex align-items-center justify-content-between mb-1">
                              <span className="fw-bold fs-6" style={{ color: isActive ? "#ffffff" : "#0F2744" }}>
                                {sec.name}
                              </span>
                              {isDirty && (
                                <span
                                  className="badge rounded-pill"
                                  style={{
                                    background: isActive ? "#F59E0B" : "rgba(245, 158, 11, 0.15)",
                                    color: isActive ? "#0F2744" : "#B45309",
                                    fontSize: "0.65rem",
                                  }}
                                >
                                  Unsaved
                                </span>
                              )}
                            </div>

                            <div className="d-flex align-items-center justify-content-between">
                              <span
                                className="badge rounded-pill small"
                                style={{
                                  background: sec.uses_grading_scale
                                    ? isActive
                                      ? "rgba(16, 185, 129, 0.25)"
                                      : "rgba(16, 185, 129, 0.12)"
                                    : isActive
                                    ? "rgba(245, 158, 11, 0.25)"
                                    : "rgba(100, 116, 139, 0.12)",
                                  color: sec.uses_grading_scale
                                    ? isActive
                                      ? "#A7F3D0"
                                      : "#059669"
                                    : isActive
                                    ? "#FDE68A"
                                    : "#64748B",
                                  fontSize: "0.7rem",
                                  fontWeight: 600,
                                }}
                              >
                                <i className={`bi ${sec.uses_grading_scale ? "bi-check2-circle" : "bi-dash-circle"} me-1`} />
                                {sec.uses_grading_scale ? "Grading Enabled" : "No Grades"}
                              </span>

                              <span
                                className="small"
                                style={{ color: isActive ? "rgba(255,255,255,0.75)" : "#64748B", fontSize: "0.75rem" }}
                              >
                                {sec.uses_grading_scale ? `${bandsCount} bands` : "Raw marks"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Info Box */}
                  <div
                    className="card border-0 rounded-4 p-3 mt-3 shadow-sm"
                    style={{ background: "#F1F5F9", border: "1px solid #E2E8F0" }}
                  >
                    <div className="d-flex align-items-center gap-2 mb-2 text-primary fw-semibold small">
                      <i className="bi bi-info-circle-fill" />
                      How Section Grading Works
                    </div>
                    <p className="text-muted small mb-0" style={{ lineHeight: 1.5, fontSize: "0.8rem" }}>
                      When results are computed, GradeQuest matches each student to their section's grading rules. If a section is toggled off, letter grades (e.g. A1, B, C) are suppressed on the report card while showing raw CA & Exam marks.
                    </p>
                  </div>
                </div>

                {/* Right Column: Active Section Detail & Scale Matrix */}
                <div className="col-lg-8 col-xl-9">
                  {activeSection && (
                    <div
                      className="card border-0 rounded-4 shadow-sm"
                      style={{ background: "#ffffff", border: "1px solid #E2E8F0" }}
                    >
                      {/* Section Header */}
                      <div className="p-4 border-bottom" style={{ background: "#FAFCFF" }}>
                        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                          <div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <h2 className="h4 fw-bold text-dark mb-0">{activeSection.name}</h2>
                              <span
                                className="badge rounded-pill px-3 py-1"
                                style={{
                                  background: activeSection.uses_grading_scale ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.15)",
                                  color: activeSection.uses_grading_scale ? "#059669" : "#B45309",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                }}
                              >
                                {activeSection.uses_grading_scale ? "Letter Grading Active" : "No Letter Grading"}
                              </span>
                            </div>
                            <p className="text-muted small mb-0">
                              Configure how scores between 0% and 100% are converted into letter grades and remarks for this section.
                            </p>
                          </div>

                          {/* Top Controls: Toggle & Presets */}
                          <div className="d-flex flex-wrap align-items-center gap-2">
                            <button
                              type="button"
                              className={`btn rounded-pill px-3 py-2 fw-semibold d-inline-flex align-items-center gap-2 ${
                                activeSection.uses_grading_scale ? "btn-outline-danger" : "btn-outline-success"
                              }`}
                              style={{ fontSize: "0.85rem" }}
                              onClick={() => handleToggleGrading(activeSection.id, activeSection.uses_grading_scale)}
                              disabled={togglingSectionId === activeSection.id}
                            >
                              <i className={`bi ${activeSection.uses_grading_scale ? "bi-toggle-on text-success" : "bi-toggle-off text-muted"} fs-5`} />
                              {activeSection.uses_grading_scale ? "Disable Letter Grading" : "Enable Letter Grading"}
                            </button>

                            <button
                              type="button"
                              className="btn btn-primary rounded-pill px-3 py-2 fw-semibold d-inline-flex align-items-center gap-2 shadow-sm"
                              style={{ fontSize: "0.85rem", background: "#0F2744", borderColor: "#0F2744" }}
                              onClick={() => handleOpenPresetModal(activeSection.id)}
                            >
                              <i className="bi bi-magic" />
                              Apply Standard Preset
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Section Body */}
                      <div className="p-4">
                        {/* If Grading is DISABLED for this section */}
                        {!activeSection.uses_grading_scale ? (
                          <div
                            className="rounded-4 p-4 text-center my-3"
                            style={{
                              background: "rgba(245, 158, 11, 0.06)",
                              border: "1px dashed rgba(245, 158, 11, 0.4)",
                            }}
                          >
                            <div
                              className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                              style={{ width: 56, height: 56, background: "rgba(245, 158, 11, 0.15)", color: "#D97706" }}
                            >
                              <i className="bi bi-shield-slash fs-4" />
                            </div>
                            <h5 className="fw-bold text-dark mb-2">Letter Grading is Disabled for "{activeSection.name}"</h5>
                            <p className="text-muted small mx-auto mb-3" style={{ maxWidth: 540 }}>
                              Students in this section (e.g. Nursery, Reception, Primary) will receive report cards that display their raw Continuous Assessment (CA) and Exam scores without any letter grades (A, B, C, D) or grade remarks.
                            </p>
                            <button
                              type="button"
                              className="btn btn-success rounded-pill px-4 py-2 fw-semibold d-inline-flex align-items-center gap-2 shadow-sm"
                              onClick={() => handleToggleGrading(activeSection.id, false)}
                            >
                              <i className="bi bi-check2-circle" /> Enable Letter Grading for {activeSection.name}
                            </button>
                          </div>
                        ) : (
                          /* If Grading is ENABLED for this section */
                          <>
                            {/* Visual Score Coverage Bar */}
                            <div className="mb-4 p-3 rounded-4" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                              <div className="d-flex align-items-center justify-content-between mb-2">
                                <span className="small fw-bold text-dark">
                                  Score Coverage Matrix (0% – 100%)
                                </span>
                                {!coverageAnalysis.isComplete ? (
                                  <span className="badge bg-danger rounded-pill px-2 py-1 small">
                                    <i className="bi bi-exclamation-triangle-fill me-1" />
                                    Incomplete Range Coverage ({coverageAnalysis.minScore}% – {coverageAnalysis.maxScore}%)
                                  </span>
                                ) : (
                                  <span className="badge bg-success rounded-pill px-2 py-1 small">
                                    <i className="bi bi-check-circle-fill me-1" /> Full 100% Score Range Covered
                                  </span>
                                )}
                              </div>

                              {/* Color Bar */}
                              <div className="progress" style={{ height: 20, borderRadius: 8, background: "#E2E8F0" }}>
                                {activeBands.map((band, idx) => {
                                  const span = Math.max(0, band.max - band.min);
                                  return (
                                    <div
                                      key={idx}
                                      className="progress-bar fw-bold text-white"
                                      style={{
                                        width: `${span}%`,
                                        background: band.color || "#3B82F6",
                                        fontSize: "0.75rem",
                                      }}
                                      title={`${band.grade}: ${band.min}% – ${band.max}% (${band.remark})`}
                                    >
                                      {span >= 8 ? band.grade : ""}
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="d-flex justify-content-between text-muted small mt-1 px-1" style={{ fontSize: "0.7rem" }}>
                                <span>0%</span>
                                <span>25%</span>
                                <span>50%</span>
                                <span>75%</span>
                                <span>100%</span>
                              </div>
                            </div>

                            {/* Grade Bands Table */}
                            <div className="d-flex align-items-center justify-content-between mb-3">
                              <div>
                                <h5 className="fw-bold text-dark mb-0">Configured Grade Bands</h5>
                                <span className="text-muted small">
                                  Sorted from highest score tier to lowest
                                </span>
                              </div>

                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm rounded-pill px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1.5"
                                onClick={() => handleOpenBandModal(activeSection.id, null)}
                              >
                                <i className="bi bi-plus-circle" /> Add Grade Band
                              </button>
                            </div>

                            {activeBands.length === 0 ? (
                              <div className="text-center py-5 border rounded-4 my-3 bg-light">
                                <i className="bi bi-sliders text-muted fs-1 mb-2 d-block" />
                                <h6 className="fw-bold text-dark mb-1">No Grade Bands Configured</h6>
                                <p className="text-muted small mb-3">Click below to add grade bands or apply a standard preset template.</p>
                                <div className="d-flex justify-content-center gap-2">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary rounded-pill px-3"
                                    onClick={() => handleOpenBandModal(activeSection.id, null)}
                                  >
                                    Add Custom Band
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-dark rounded-pill px-3"
                                    onClick={() => handleOpenPresetModal(activeSection.id)}
                                  >
                                    Apply Preset
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="table-responsive rounded-4 border overflow-hidden mb-4">
                                <table className="table table-hover align-middle mb-0" style={{ fontSize: "0.875rem" }}>
                                  <thead style={{ background: "#F8FAFC", color: "#475569" }}>
                                    <tr>
                                      <th style={{ width: 80 }} className="ps-3">Grade</th>
                                      <th>Score Range</th>
                                      <th>Performance Remark</th>
                                      <th style={{ width: 100 }}>GPA Point</th>
                                      <th style={{ width: 100 }}>Badge Preview</th>
                                      <th style={{ width: 120 }} className="text-end pe-3">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activeBands.map((band, idx) => (
                                      <tr key={idx}>
                                        {/* Grade Letter */}
                                        <td className="ps-3">
                                          <span
                                            className="badge rounded-pill fw-bold px-3 py-1.5"
                                            style={{
                                              background: band.color ? `${band.color}20` : "rgba(37,99,235,0.12)",
                                              color: band.color || "#2563EB",
                                              border: `1px solid ${band.color || "#2563EB"}40`,
                                              fontSize: "0.85rem",
                                            }}
                                          >
                                            {band.grade}
                                          </span>
                                        </td>

                                        {/* Range */}
                                        <td>
                                          <span className="fw-semibold text-dark">
                                            {band.min}% – {band.max}%
                                          </span>
                                        </td>

                                        {/* Remark */}
                                        <td>
                                          <span className="text-secondary">{band.remark || "—"}</span>
                                        </td>

                                        {/* GPA */}
                                        <td>
                                          <span className="badge bg-light text-dark border">
                                            {band.gpa_point !== null && band.gpa_point !== undefined ? `${band.gpa_point}` : "0.0"}
                                          </span>
                                        </td>

                                        {/* Color Preview */}
                                        <td>
                                          <div className="d-flex align-items-center gap-2">
                                            <div
                                              className="rounded-circle shadow-sm"
                                              style={{
                                                width: 18,
                                                height: 18,
                                                background: band.color || "#3B82F6",
                                                border: "2px solid #ffffff",
                                              }}
                                            />
                                            <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                                              {band.color || "#3B82F6"}
                                            </span>
                                          </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="text-end pe-3">
                                          <div className="btn-group btn-group-sm">
                                            <button
                                              type="button"
                                              className="btn btn-outline-secondary"
                                              title="Edit Band"
                                              onClick={() => handleOpenBandModal(activeSection.id, idx)}
                                            >
                                              <i className="bi bi-pencil" />
                                            </button>
                                            <button
                                              type="button"
                                              className="btn btn-outline-danger"
                                              title="Delete Band"
                                              onClick={() => handleDeleteBand(activeSection.id, idx)}
                                            >
                                              <i className="bi bi-trash" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Action Footer Bar */}
                            <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-3 pt-3 border-top">
                              <div className="d-flex align-items-center gap-2">
                                {dirtySections[activeSection.id] ? (
                                  <span className="badge bg-warning text-dark px-3 py-2 rounded-pill small">
                                    <i className="bi bi-exclamation-circle-fill me-1" />
                                    You have unsaved changes in this section
                                  </span>
                                ) : (
                                  <span className="text-muted small">
                                    <i className="bi bi-check2-all text-success me-1" />
                                    Grading scale is synced and saved
                                  </span>
                                )}
                              </div>

                              <div className="d-flex align-items-center gap-2">
                                {dirtySections[activeSection.id] && (
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary rounded-pill px-3 py-2 fw-semibold"
                                    style={{ fontSize: "0.85rem" }}
                                    onClick={() => handleResetSection(activeSection.id)}
                                    disabled={savingSectionId === activeSection.id}
                                  >
                                    Revert Changes
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="btn btn-success rounded-pill px-4 py-2 fw-semibold d-inline-flex align-items-center gap-2 shadow-sm"
                                  style={{ fontSize: "0.85rem" }}
                                  onClick={() => handleSaveSectionGrading(activeSection.id)}
                                  disabled={savingSectionId === activeSection.id}
                                >
                                  {savingSectionId === activeSection.id ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm" role="status" />
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <i className="bi bi-cloud-check-fill" /> Save Grading Scale
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <Footer />

      {/* =========================================================
          MODAL: ADD / EDIT GRADE BAND
      ========================================================= */}
      {bandModalOpen && (
        <div className="modal show d-block" tabIndex={-1} style={{ background: "rgba(15, 39, 68, 0.6)", backdropFilter: "blur(4px)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
              <form onSubmit={handleSaveBandModal}>
                <div className="modal-header border-bottom p-3" style={{ background: "#0F2744", color: "#ffffff" }}>
                  <h5 className="modal-title fw-bold fs-6">
                    <i className="bi bi-sliders me-2" />
                    {editingBandIndex !== null ? "Edit Grade Band" : "Add New Grade Band"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setBandModalOpen(false)}
                  />
                </div>

                <div className="modal-body p-4">
                  <div className="row g-3">
                    {/* Grade Code */}
                    <div className="col-12">
                      <label className="form-label fw-semibold small text-dark">
                        Grade Code / Letter <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control rounded-3"
                        placeholder="e.g. A, A1, B2, Distinction"
                        value={bandForm.grade}
                        onChange={(e) => setBandForm({ ...bandForm, grade: e.target.value })}
                        required
                        autoFocus
                      />
                      <div className="form-text">The letter or designation printed on report cards.</div>
                    </div>

                    {/* Min and Max Score */}
                    <div className="col-6">
                      <label className="form-label fw-semibold small text-dark">
                        Minimum Score (%) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="form-control rounded-3"
                        value={bandForm.min}
                        onChange={(e) => setBandForm({ ...bandForm, min: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label fw-semibold small text-dark">
                        Maximum Score (%) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="form-control rounded-3"
                        value={bandForm.max}
                        onChange={(e) => setBandForm({ ...bandForm, max: e.target.value })}
                        required
                      />
                    </div>

                    {/* Remark */}
                    <div className="col-12">
                      <label className="form-label fw-semibold small text-dark">
                        Performance Remark
                      </label>
                      <input
                        type="text"
                        className="form-control rounded-3"
                        placeholder="e.g. Excellent, Very Good, Credit, Pass"
                        value={bandForm.remark}
                        onChange={(e) => setBandForm({ ...bandForm, remark: e.target.value })}
                      />
                    </div>

                    {/* GPA Point */}
                    <div className="col-6">
                      <label className="form-label fw-semibold small text-dark">
                        GPA Points (Optional)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        className="form-control rounded-3"
                        placeholder="e.g. 5.0, 4.0"
                        value={bandForm.gpa_point}
                        onChange={(e) => setBandForm({ ...bandForm, gpa_point: e.target.value })}
                      />
                    </div>

                    {/* Color Swatch */}
                    <div className="col-6">
                      <label className="form-label fw-semibold small text-dark">
                        Badge Color
                      </label>
                      <div className="d-flex align-items-center gap-2">
                        <input
                          type="color"
                          className="form-control form-control-color rounded-3 p-1"
                          style={{ width: 44, height: 38 }}
                          value={bandForm.color}
                          onChange={(e) => setBandForm({ ...bandForm, color: e.target.value })}
                        />
                        <span className="text-muted small font-monospace">{bandForm.color}</span>
                      </div>
                    </div>

                    {/* Quick Swatches */}
                    <div className="col-12">
                      <label className="form-label fw-semibold small text-muted">Quick Palette Swatches</label>
                      <div className="d-flex flex-wrap gap-2">
                        {COLOR_SWATCHES.map((sw, i) => (
                          <button
                            key={i}
                            type="button"
                            className="rounded-circle border-0 shadow-sm"
                            style={{
                              width: 24,
                              height: 24,
                              background: sw.hex,
                              outline: bandForm.color.toLowerCase() === sw.hex.toLowerCase() ? "2px solid #0F2744" : "none",
                              outlineOffset: 2,
                            }}
                            title={sw.label}
                            onClick={() => setBandForm({ ...bandForm, color: sw.hex })}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top p-3 bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-pill px-4"
                    onClick={() => setBandModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary rounded-pill px-4 fw-semibold"
                    style={{ background: "#0F2744", borderColor: "#0F2744" }}
                  >
                    {editingBandIndex !== null ? "Update Band" : "Add Band"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: APPLY PRESET TEMPLATE
      ========================================================= */}
      {presetModalOpen && (
        <div className="modal show d-block" tabIndex={-1} style={{ background: "rgba(15, 39, 68, 0.6)", backdropFilter: "blur(4px)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
              <div className="modal-header border-bottom p-3" style={{ background: "#0F2744", color: "#ffffff" }}>
                <h5 className="modal-title fw-bold fs-6">
                  <i className="bi bi-magic me-2" />
                  Apply Standard Grading Preset
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setPresetModalOpen(false)}
                />
              </div>

              <div className="modal-body p-4">
                <p className="text-muted small mb-4">
                  Select a standardized grading scale to automatically populate the grade bands for this section.
                  You can further customize thresholds, remarks, and colors after applying.
                </p>

                <div className="row g-3 mb-4">
                  {Object.entries(presets).map(([key, preset]) => {
                    const isSelected = selectedPresetKey === key;
                    return (
                      <div key={key} className="col-md-6">
                        <div
                          className={`card h-100 rounded-4 p-3 border-2 cursor-pointer transition-all ${
                            isSelected ? "border-primary shadow-sm bg-primary-subtle" : "border-light bg-light"
                          }`}
                          style={{
                            cursor: "pointer",
                            borderColor: isSelected ? "#2563EB" : "#E2E8F0",
                            background: isSelected ? "rgba(37, 99, 235, 0.05)" : "#FAFAFA",
                          }}
                          onClick={() => setSelectedPresetKey(key)}
                        >
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <h6 className="fw-bold text-dark mb-0">{preset.name}</h6>
                            <input
                              type="radio"
                              name="presetOption"
                              checked={isSelected}
                              onChange={() => setSelectedPresetKey(key)}
                              className="form-check-input"
                            />
                          </div>
                          <p className="text-muted small mb-2">{preset.description}</p>
                          <div className="d-flex flex-wrap gap-1">
                            {preset.scales.slice(0, 6).map((sc, idx) => (
                              <span
                                key={idx}
                                className="badge rounded-pill"
                                style={{
                                  background: sc.color ? `${sc.color}20` : "#E2E8F0",
                                  color: sc.color || "#0F2744",
                                  fontSize: "0.65rem",
                                }}
                              >
                                {sc.grade} ({sc.min}+)
                              </span>
                            ))}
                            {preset.scales.length > 6 && (
                              <span className="badge bg-light text-muted border rounded-pill" style={{ fontSize: "0.65rem" }}>
                                +{preset.scales.length - 6} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Preset Preview */}
                {selectedPresetKey && presets[selectedPresetKey] && (
                  <div className="p-3 rounded-4 bg-white border">
                    <h6 className="fw-bold text-dark mb-2">
                      Preview: {presets[selectedPresetKey].name} ({presets[selectedPresetKey].scales.length} tiers)
                    </h6>
                    <div className="table-responsive" style={{ maxHeight: 200, overflowY: "auto" }}>
                      <table className="table table-sm table-bordered mb-0" style={{ fontSize: "0.8rem" }}>
                        <thead className="table-light">
                          <tr>
                            <th>Grade</th>
                            <th>Min Score</th>
                            <th>Max Score</th>
                            <th>Remark</th>
                            <th>GPA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {presets[selectedPresetKey].scales.map((s, idx) => (
                            <tr key={idx}>
                              <td>
                                <span className="fw-bold" style={{ color: s.color || "#0F2744" }}>
                                  {s.grade}
                                </span>
                              </td>
                              <td>{s.min}%</td>
                              <td>{s.max}%</td>
                              <td>{s.remark}</td>
                              <td>{s.gpa_point ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer border-top p-3 bg-light">
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-pill px-4"
                  onClick={() => setPresetModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary rounded-pill px-4 fw-semibold"
                  style={{ background: "#0F2744", borderColor: "#0F2744" }}
                  onClick={handleApplyPreset}
                  disabled={savingSectionId !== null}
                >
                  {savingSectionId !== null ? "Applying..." : "Apply This Preset"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
