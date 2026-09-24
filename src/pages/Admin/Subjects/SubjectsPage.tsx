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

type CurriculumTemplateItem = {
  name: string;
  code: string;
  section_tag: string;
  dept_tag?: string;
};

/* =========================
   STANDARD CURRICULUM PRESETS
========================= */
const STANDARD_CURRICULUM: Record<string, { label: string; icon: string; items: CurriculumTemplateItem[] }> = {
  primary: {
    label: "Primary / Basic Section",
    icon: "🎒",
    items: [
      { name: "Mathematics", code: "MTH", section_tag: "primary" },
      { name: "English Studies", code: "ENG", section_tag: "primary" },
      { name: "Basic Science & Technology", code: "BST", section_tag: "primary" },
      { name: "Social Studies", code: "SOS", section_tag: "primary" },
      { name: "Civic Education", code: "CIV", section_tag: "primary" },
      { name: "Quantitative Reasoning", code: "QTR", section_tag: "primary" },
      { name: "Verbal Reasoning", code: "VRB", section_tag: "primary" },
      { name: "Christian Religious Studies (CRS)", code: "CRS", section_tag: "primary" },
      { name: "Islamic Religious Studies (IRS)", code: "IRS", section_tag: "primary" },
      { name: "Cultural & Creative Arts (CCA)", code: "CCA", section_tag: "primary" },
      { name: "Physical & Health Education (PHE)", code: "PHE", section_tag: "primary" },
      { name: "Agricultural Science", code: "AGR", section_tag: "primary" },
      { name: "Home Economics", code: "HEC", section_tag: "primary" },
      { name: "Computer Studies / ICT", code: "ICT", section_tag: "primary" },
      { name: "Handwriting & Phonics", code: "HWT", section_tag: "primary" },
      { name: "French Language", code: "FRN", section_tag: "primary" },
    ],
  },
  junior: {
    label: "Junior Secondary (JSS)",
    icon: "📘",
    items: [
      { name: "English Studies", code: "ENG", section_tag: "junior" },
      { name: "General Mathematics", code: "MTH", section_tag: "junior" },
      { name: "Basic Science", code: "BSC", section_tag: "junior" },
      { name: "Basic Technology", code: "BTE", section_tag: "junior" },
      { name: "Business Studies", code: "BST", section_tag: "junior" },
      { name: "Social Studies", code: "SOS", section_tag: "junior" },
      { name: "Civic Education", code: "CIV", section_tag: "junior" },
      { name: "Agricultural Science", code: "AGR", section_tag: "junior" },
      { name: "Home Economics", code: "HEC", section_tag: "junior" },
      { name: "Computer Studies / ICT", code: "ICT", section_tag: "junior" },
      { name: "Physical & Health Education (PHE)", code: "PHE", section_tag: "junior" },
      { name: "Cultural & Creative Arts (CCA)", code: "CCA", section_tag: "junior" },
      { name: "Christian Religious Studies (CRS)", code: "CRS", section_tag: "junior" },
      { name: "Islamic Religious Studies (IRS)", code: "IRS", section_tag: "junior" },
      { name: "French Language", code: "FRN", section_tag: "junior" },
      { name: "Nigerian Language (Hausa / Igbo / Yoruba)", code: "NLN", section_tag: "junior" },
    ],
  },
  senior_core: {
    label: "Senior Sec - General / All Depts",
    icon: "⭐",
    items: [
      { name: "English Language", code: "ENG", section_tag: "senior", dept_tag: "general" },
      { name: "General Mathematics", code: "MTH", section_tag: "senior", dept_tag: "general" },
      { name: "Civic Education", code: "CIV", section_tag: "senior", dept_tag: "general" },
      { name: "Economics", code: "ECO", section_tag: "senior", dept_tag: "general" },
      { name: "Data Processing", code: "DTP", section_tag: "senior", dept_tag: "general" },
      { name: "Trade & Entrepreneurship", code: "TRD", section_tag: "senior", dept_tag: "general" },
    ],
  },
  senior_science: {
    label: "Senior Sec - Science Department",
    icon: "🔬",
    items: [
      { name: "Physics", code: "PHY", section_tag: "senior", dept_tag: "science" },
      { name: "Chemistry", code: "CHM", section_tag: "senior", dept_tag: "science" },
      { name: "Biology", code: "BIO", section_tag: "senior", dept_tag: "science" },
      { name: "Further Mathematics", code: "FMT", section_tag: "senior", dept_tag: "science" },
      { name: "Agricultural Science", code: "AGR", section_tag: "senior", dept_tag: "science" },
      { name: "Technical Drawing", code: "TDR", section_tag: "senior", dept_tag: "science" },
      { name: "Geography", code: "GEO", section_tag: "senior", dept_tag: "science" },
    ],
  },
  senior_arts: {
    label: "Senior Sec - Arts & Humanities",
    icon: "🏛️",
    items: [
      { name: "Literature in English", code: "LIT", section_tag: "senior", dept_tag: "arts" },
      { name: "Government", code: "GOV", section_tag: "senior", dept_tag: "arts" },
      { name: "Christian Religious Studies (CRS)", code: "CRS", section_tag: "senior", dept_tag: "arts" },
      { name: "Islamic Religious Studies (IRS)", code: "IRS", section_tag: "senior", dept_tag: "arts" },
      { name: "History", code: "HIS", section_tag: "senior", dept_tag: "arts" },
      { name: "Visual Arts", code: "ART", section_tag: "senior", dept_tag: "arts" },
      { name: "Music", code: "MUS", section_tag: "senior", dept_tag: "arts" },
      { name: "French Language", code: "FRN", section_tag: "senior", dept_tag: "arts" },
      { name: "Nigerian Language (Hausa / Igbo / Yoruba)", code: "NLN", section_tag: "senior", dept_tag: "arts" },
    ],
  },
  senior_commercial: {
    label: "Senior Sec - Commercial Department",
    icon: "📊",
    items: [
      { name: "Financial Accounting", code: "ACC", section_tag: "senior", dept_tag: "commercial" },
      { name: "Commerce", code: "COM", section_tag: "senior", dept_tag: "commercial" },
      { name: "Book Keeping", code: "BKK", section_tag: "senior", dept_tag: "commercial" },
      { name: "Store Management", code: "STM", section_tag: "senior", dept_tag: "commercial" },
      { name: "Office Practice", code: "OFP", section_tag: "senior", dept_tag: "commercial" },
      { name: "Insurance", code: "INS", section_tag: "senior", dept_tag: "commercial" },
    ],
  },
  senior_vocational: {
    label: "Senior Sec - Vocational & Technical",
    icon: "🛠️",
    items: [
      { name: "Food & Nutrition", code: "FDN", section_tag: "senior", dept_tag: "vocational" },
      { name: "Clothing & Textiles", code: "CLT", section_tag: "senior", dept_tag: "vocational" },
      { name: "Auto Mechanics", code: "MEC", section_tag: "senior", dept_tag: "vocational" },
      { name: "Building Construction", code: "BLD", section_tag: "senior", dept_tag: "vocational" },
      { name: "Electrical Installation", code: "ELE", section_tag: "senior", dept_tag: "vocational" },
      { name: "Woodwork", code: "WDW", section_tag: "senior", dept_tag: "vocational" },
    ],
  },
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
   PAGE COMPONENT
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

  // active Section Tab: 'all' | 'primary' | 'junior' | 'senior' | number (custom section id)
  const [activeSectionTab, setActiveSectionTab] = useState<string>("all");
  // active Senior Department Tab: 'all_senior' | 'core' | number (dept_id)
  const [activeSeniorDept, setActiveSeniorDept] = useState<string>("all_senior");

  // filters & search
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showCurriculumModal, setShowCurriculumModal] = useState(false);

  // curriculum importer state
  const [selectedCurriculumCategory, setSelectedCurriculumCategory] = useState<string>("all");
  const [curriculumSelection, setCurriculumSelection] = useState<Record<string, boolean>>({});

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
     DETECTED SECTION OBJECTS
  ========================= */
  const primarySection = useMemo(
    () => sections.find((s) => /primary|nursery|basic|grade|kinder/i.test(s.name)),
    [sections]
  );
  const juniorSection = useMemo(
    () => sections.find((s) => /junior|jss/i.test(s.name)),
    [sections]
  );
  const seniorSection = useMemo(
    () => sections.find((s) => /senior|sss/i.test(s.name)),
    [sections]
  );

  /* =========================
     FETCH DATA
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

      const res = await authApi.get<Subject[]>("/subjects/list", { params });
      const list = Array.isArray(res.data) ? res.data : [];
      setSubjects(list);
    } catch (err: any) {
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
  }, [showArchived]);

  /* =========================
     CATEGORY RESOLUTION HELPERS
  ========================= */
  const sectionName = (s: Subject) =>
    s.section?.name ?? sections.find((x) => x.id === s.section_id)?.name ?? "Universal / All";

  const departmentName = (s: Subject) =>
    s.department?.name ?? departments.find((x) => x.id === s.department_id)?.name ?? "All Departments";

  const isSubjectInPrimary = (s: Subject) => {
    if (!s.section_id) return true; // Universal
    if (primarySection && s.section_id === primarySection.id) return true;
    const name = sectionName(s).toLowerCase();
    return /primary|nursery|basic|grade|kinder/i.test(name);
  };

  const isSubjectInJunior = (s: Subject) => {
    if (!s.section_id) return true; // Universal
    if (juniorSection && s.section_id === juniorSection.id) return true;
    const name = sectionName(s).toLowerCase();
    return /junior|jss/i.test(name);
  };

  const isSubjectInSenior = (s: Subject) => {
    if (!s.section_id && !s.department_id) return true; // Universal
    if (seniorSection && s.section_id === seniorSection.id) return true;
    if (s.department_id) return true; // Any department subject belongs to Senior
    const name = sectionName(s).toLowerCase();
    return /senior|sss/i.test(name);
  };

  /* =========================
     FILTERED SUBJECTS
  ========================= */
  const filteredSubjects = useMemo(() => {
    let list = subjects;

    // 1. Section Tab Filter
    if (activeSectionTab === "primary") {
      list = list.filter(isSubjectInPrimary);
    } else if (activeSectionTab === "junior") {
      list = list.filter(isSubjectInJunior);
    } else if (activeSectionTab === "senior") {
      list = list.filter(isSubjectInSenior);

      // Senior Department Sub-Filter
      if (activeSeniorDept === "core") {
        list = list.filter((s) => !s.department_id);
      } else if (activeSeniorDept !== "all_senior") {
        const deptIdNum = Number(activeSeniorDept);
        list = list.filter((s) => s.department_id === deptIdNum);
      }
    } else if (activeSectionTab !== "all") {
      const secIdNum = Number(activeSectionTab);
      list = list.filter((s) => s.section_id === secIdNum || !s.section_id);
    }

    // 2. Search Query Filter
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((s) => {
        const sec = sectionName(s).toLowerCase();
        const dep = departmentName(s).toLowerCase();
        const hay = `${s.name ?? ""} ${s.subject_id ?? ""} ${sec} ${dep}`.toLowerCase();
        return hay.includes(q);
      });
    }

    return list;
  }, [subjects, activeSectionTab, activeSeniorDept, query, sections, departments, primarySection, juniorSection, seniorSection]);

  const totalSubjects = subjects.length;
  const primaryCount = useMemo(() => subjects.filter(isSubjectInPrimary).length, [subjects, primarySection]);
  const juniorCount = useMemo(() => subjects.filter(isSubjectInJunior).length, [subjects, juniorSection]);
  const seniorCount = useMemo(() => subjects.filter(isSubjectInSenior).length, [subjects, seniorSection]);

  const selectedCount = useMemo(() => Object.values(selectedIds).filter(Boolean).length, [selectedIds]);
  const allFilteredSelected =
    filteredSubjects.length > 0 && filteredSubjects.every((s) => !!selectedIds[s.id]);

  /* =========================
     PAGINATION
  ========================= */
  const [page, setPage] = useState(1);
  const perPage = 12;

  useEffect(() => setPage(1), [query, activeSectionTab, activeSeniorDept]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredSubjects.length / perPage)), [filteredSubjects.length]);
  const safePage = clamp(page, 1, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return filteredSubjects.slice(start, start + perPage);
  }, [filteredSubjects, safePage]);

  /* =========================
     CONTEXT-AWARE ADD SUBJECT
  ========================= */
  function openAddModal() {
    setCreateName("");
    // Pre-fill section based on current active tab
    if (activeSectionTab === "primary" && primarySection) {
      setCreateSectionId(String(primarySection.id));
      setCreateDepartmentId("");
    } else if (activeSectionTab === "junior" && juniorSection) {
      setCreateSectionId(String(juniorSection.id));
      setCreateDepartmentId("");
    } else if (activeSectionTab === "senior") {
      if (seniorSection) setCreateSectionId(String(seniorSection.id));
      else setCreateSectionId("");

      if (activeSeniorDept !== "all_senior" && activeSeniorDept !== "core") {
        setCreateDepartmentId(activeSeniorDept);
      } else {
        setCreateDepartmentId("");
      }
    } else {
      setCreateSectionId("");
      setCreateDepartmentId("");
    }
    setShowCreate(true);
  }

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
     CURRICULUM PRESET IMPORTER
  ========================= */
  function openCurriculumModal(category: string = "all") {
    setSelectedCurriculumCategory(category);
    // Pre-check all items for that category
    const initialMap: Record<string, boolean> = {};
    if (category === "all") {
      Object.values(STANDARD_CURRICULUM).forEach((group) => {
        group.items.forEach((item) => {
          initialMap[item.name] = true;
        });
      });
    } else if (STANDARD_CURRICULUM[category]) {
      STANDARD_CURRICULUM[category].items.forEach((item) => {
        initialMap[item.name] = true;
      });
    }
    setCurriculumSelection(initialMap);
    setShowCurriculumModal(true);
  }

  async function importSelectedCurriculum() {
    const activeGroupKeys =
      selectedCurriculumCategory === "all"
        ? Object.keys(STANDARD_CURRICULUM)
        : [selectedCurriculumCategory];

    const selectedItems: CurriculumTemplateItem[] = [];
    activeGroupKeys.forEach((key) => {
      const group = STANDARD_CURRICULUM[key];
      if (group) {
        group.items.forEach((item) => {
          if (curriculumSelection[item.name]) {
            selectedItems.push(item);
          }
        });
      }
    });

    if (selectedItems.length === 0) {
      return showError("Please select at least one subject to import.");
    }

    try {
      setBusyKey("curriculum:import");
      const res = await authApi.post("/subjects/seed-curriculum", {
        subjects: selectedItems,
      });

      showSuccess(res.data?.message ?? "Standard curriculum loaded successfully!");
      setShowCurriculumModal(false);
      await fetchSubjects();
    } catch (err: any) {
      showError(getErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  /* =========================
     SUBJECT ALLOCATION MATRIX
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
      showSuccess(`Loaded subject allocation for the selected scope.`);
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

  function selectRecommendedOfferings() {
    const next: Record<number, boolean> = { ...offeringSubjectIds };
    const selClass = classes.find((c) => String(c.id) === offeringClassId);
    const className = (selClass?.name || "").toLowerCase();

    const isSeniorClass = /sss|senior|ss 1|ss 2|ss 3/i.test(className);
    const isJuniorClass = /jss|junior|basic 7|basic 8|basic 9/i.test(className);
    const isPrimaryClass = /primary|basic|grade|nursery|kinder/i.test(className);

    subjects.forEach((s) => {
      if (isPrimaryClass && isSubjectInPrimary(s)) {
        next[s.id] = true;
      } else if (isJuniorClass && isSubjectInJunior(s)) {
        next[s.id] = true;
      } else if (isSeniorClass) {
        if (!s.department_id) {
          next[s.id] = true; // Core Senior Subjects
        } else if (offeringDepartmentId && s.department_id === Number(offeringDepartmentId)) {
          next[s.id] = true; // Specific Department Subjects
        }
      } else {
        // Universal subjects
        if (!s.section_id && !s.department_id) next[s.id] = true;
      }
    });

    setOfferingSubjectIds(next);
    showSuccess("Pre-selected standard subjects for this academic level.");
  }

  function clearAllOfferings() {
    setOfferingSubjectIds({});
  }

  if (loadingPage) {
    return (
      <>
        <PageTitle title="Subjects Management | SchoolProfit" />
        <Loader />
      </>
    );
  }

  return (
    <>
      <style>{`
        /* Academic Subject Master System Styles */
        .gq-app-main {
          background-color: #F8FAFC;
          min-height: 100vh;
        }
        .db-main {
          padding: 24px 28px;
          background: #F8FAFC;
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .db-main { padding: 16px 14px; }
        }

        /* Hero Banner */
        .db-hero {
          background: linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F2027 100%);
          border-radius: 20px;
          padding: 30px 32px;
          color: #fff;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.18);
          flex-wrap: wrap;
        }
        .db-eyebrow {
          font-size: 11.5px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #38BDF8;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .db-greeting {
          font-size: 24px;
          font-weight: 800;
          color: #fff;
          margin: 0 0 6px 0;
          letter-spacing: -0.02em;
        }
        .db-hero-sub {
          font-size: 13.5px;
          color: #CBD5E1;
          line-height: 1.5;
          max-width: 600px;
          margin: 0;
        }

        /* Stat Chips */
        .db-hero-stats {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .db-hero-stat-box {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 14px;
          padding: 12px 18px;
          text-align: center;
          min-width: 100px;
        }
        .db-hero-stat-num {
          font-size: 22px;
          font-weight: 800;
          color: #F8FAFC;
          display: block;
        }
        .db-hero-stat-lbl {
          font-size: 11px;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        /* Section Tabs Navigation */
        .db-section-nav {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .db-sec-tab {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 12px;
          font-size: 13.5px;
          font-weight: 700;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .db-sec-tab:hover {
          border-color: #3B82F6;
          color: #1E40AF;
          background: #EFF6FF;
        }
        .db-sec-tab.active {
          background: #0F172A;
          border-color: #0F172A;
          color: #FFFFFF;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
        }
        .db-sec-tab-badge {
          font-size: 11px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 99px;
          background: rgba(148, 163, 184, 0.2);
          color: inherit;
        }
        .db-sec-tab.active .db-sec-tab-badge {
          background: rgba(255, 255, 255, 0.25);
          color: #fff;
        }

        /* Sub-Department Pills for Senior Secondary */
        .db-sub-dept-bar {
          display: flex;
          gap: 8px;
          background: #F1F5F9;
          padding: 8px 12px;
          border-radius: 14px;
          margin-bottom: 20px;
          overflow-x: auto;
          align-items: center;
        }
        .db-dept-pill {
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 12.5px;
          font-weight: 700;
          border: none;
          background: transparent;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .db-dept-pill:hover {
          background: #E2E8F0;
          color: #0F172A;
        }
        .db-dept-pill.active {
          background: #2563EB;
          color: #FFFFFF;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
        }

        /* Panels */
        .db-panel {
          background: #FFFFFF;
          border-radius: 18px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
          padding: 24px;
          margin-bottom: 24px;
        }
        .db-panel-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .db-panel-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .db-panel-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: #EFF6FF;
          color: #2563EB;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .db-panel-title {
          font-size: 17px;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
        }
        .db-panel-sub {
          font-size: 12.5px;
          color: #64748B;
          margin: 2px 0 0 0;
        }

        /* Buttons & Actions */
        .db-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 700;
          color: #FFFFFF;
          background: #2563EB;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .db-btn-primary:hover { background: #1D4ED8; }

        .db-btn-magic {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 700;
          color: #FFFFFF;
          background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%);
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 3px 10px rgba(124, 58, 237, 0.25);
        }
        .db-btn-magic:hover {
          opacity: 0.95;
          transform: translateY(-1px);
        }

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
        }
        .db-btn-gold:hover { background: #B45309; }

        .db-chip-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 600;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s;
        }
        .db-chip-btn:hover { border-color: #CBD5E1; background: #F8FAFC; }
        .db-chip-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Search input */
        .db-input {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 7px 12px;
          min-width: 240px;
        }
        .db-input input {
          border: none;
          background: transparent;
          font-size: 13px;
          color: #0F172A;
          outline: none;
          width: 100%;
        }

        /* Tables */
        .db-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .db-table th {
          text-align: left;
          padding: 12px 14px;
          background: #F8FAFC;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid #E2E8F0;
        }
        .db-table td {
          padding: 13px 14px;
          border-bottom: 1px solid #F1F5F9;
          color: #1E293B;
          vertical-align: middle;
        }
        .db-table tr:hover td {
          background: #F8FAFC;
        }

        /* Badges & Pills */
        .db-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 9px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 700;
          background: #F1F5F9;
          color: #475569;
        }
        .db-pill-blue { background: #EFF6FF; color: #1D4ED8; }
        .db-pill-green { background: #ECFDF5; color: #047857; }
        .db-pill-purple { background: #F5F3FF; color: #6D28D9; }
        .db-pill-amber { background: #FFFBEB; color: #B45309; }

        .db-badge-code {
          font-family: monospace;
          font-weight: 800;
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          padding: 2px 7px;
          border-radius: 6px;
          color: #0F172A;
          font-size: 12px;
        }

        /* Allocation Grid */
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
          background: rgba(15, 23, 42, 0.65);
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
          max-width: 580px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          overflow: hidden;
          max-height: 90vh;
          display: flex;
          flex-column: column;
        }
        .db-modal-head {
          padding: 20px 24px;
          background: #F8FAFC;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .db-modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }
        .db-modal-foot {
          padding: 16px 24px;
          background: #F8FAFC;
          border-top: 1px solid #E2E8F0;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .db-field {
          margin-bottom: 16px;
        }
        .db-field label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #0F172A;
          margin-bottom: 6px;
        }
        .db-field input, .db-field select {
          width: 100%;
          padding: 9px 13px;
          border: 1px solid #CBD5E1;
          border-radius: 10px;
          font-size: 13.5px;
          outline: none;
        }
        .db-field input:focus, .db-field select:focus { border-color: #2563EB; }
        .db-help { font-size: 12px; color: #64748B; margin-top: 4px; display: block; }

        .db-suggest-chips {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 8px;
        }
        .db-suggest-chip {
          font-size: 11.5px;
          padding: 4px 8px;
          border-radius: 6px;
          background: #EFF6FF;
          border: 1px solid #BFDBFE;
          color: #1E40AF;
          cursor: pointer;
          font-weight: 600;
        }
        .db-suggest-chip:hover { background: #DBEAFE; }

        /* Pagination */
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
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Academic Subjects & Curriculum | SchoolProfit" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto gq-app-main db-main d-flex flex-column min-vh-100">
            {/* HERO BANNER */}
            <div className="db-hero">
              <div>
                <div className="db-eyebrow">Academic Curriculum Management</div>
                <h1 className="db-greeting">{getGreeting()}, Administrator</h1>
                <p className="db-hero-sub">
                  Organize subjects by educational level (Primary, Junior Secondary, and Senior Secondary Departments) and easily allocate curriculum to classes.
                </p>
              </div>

              <div className="db-hero-stats">
                <div className="db-hero-stat-box">
                  <span className="db-hero-stat-num">{totalSubjects}</span>
                  <span className="db-hero-stat-lbl">Total Subjects</span>
                </div>
                <div className="db-hero-stat-box">
                  <span className="db-hero-stat-num" style={{ color: "#34D399" }}>{primaryCount}</span>
                  <span className="db-hero-stat-lbl">Primary</span>
                </div>
                <div className="db-hero-stat-box">
                  <span className="db-hero-stat-num" style={{ color: "#60A5FA" }}>{juniorCount}</span>
                  <span className="db-hero-stat-lbl">Junior Sec</span>
                </div>
                <div className="db-hero-stat-box">
                  <span className="db-hero-stat-num" style={{ color: "#F472B6" }}>{seniorCount}</span>
                  <span className="db-hero-stat-lbl">Senior Sec</span>
                </div>
              </div>
            </div>

            {/* SECTION LEVEL TABS */}
            <div className="db-section-nav">
              <button
                className={`db-sec-tab ${activeSectionTab === "all" ? "active" : ""}`}
                onClick={() => {
                  setActiveSectionTab("all");
                  setActiveSeniorDept("all_senior");
                }}
                type="button"
              >
                <span>🌐 All Subjects</span>
                <span className="db-sec-tab-badge">{totalSubjects}</span>
              </button>

              <button
                className={`db-sec-tab ${activeSectionTab === "primary" ? "active" : ""}`}
                onClick={() => {
                  setActiveSectionTab("primary");
                  setActiveSeniorDept("all_senior");
                }}
                type="button"
              >
                <span>🎒 Primary / Basic</span>
                <span className="db-sec-tab-badge">{primaryCount}</span>
              </button>

              <button
                className={`db-sec-tab ${activeSectionTab === "junior" ? "active" : ""}`}
                onClick={() => {
                  setActiveSectionTab("junior");
                  setActiveSeniorDept("all_senior");
                }}
                type="button"
              >
                <span>📘 Junior Secondary (JSS)</span>
                <span className="db-sec-tab-badge">{juniorCount}</span>
              </button>

              <button
                className={`db-sec-tab ${activeSectionTab === "senior" ? "active" : ""}`}
                onClick={() => {
                  setActiveSectionTab("senior");
                  setActiveSeniorDept("all_senior");
                }}
                type="button"
              >
                <span>🎓 Senior Secondary (SSS)</span>
                <span className="db-sec-tab-badge">{seniorCount}</span>
              </button>

              {/* Dynamic Tabs for other custom school sections if any */}
              {sections
                .filter((s) => !/primary|basic|junior|jss|senior|sss|kinder/i.test(s.name))
                .map((sec) => (
                  <button
                    key={sec.id}
                    className={`db-sec-tab ${activeSectionTab === String(sec.id) ? "active" : ""}`}
                    onClick={() => {
                      setActiveSectionTab(String(sec.id));
                      setActiveSeniorDept("all_senior");
                    }}
                    type="button"
                  >
                    <span>🏫 {sec.name}</span>
                  </button>
                ))}
            </div>

            {/* SENIOR SECONDARY DEPARTMENT SUB-NAV */}
            {activeSectionTab === "senior" && (
              <div className="db-sub-dept-bar">
                <span style={{ fontSize: 12, fontWeight: 800, color: "#64748B", textTransform: "uppercase", paddingRight: 6 }}>
                  Departments:
                </span>
                <button
                  className={`db-dept-pill ${activeSeniorDept === "all_senior" ? "active" : ""}`}
                  onClick={() => setActiveSeniorDept("all_senior")}
                  type="button"
                >
                  All Senior ({seniorCount})
                </button>
                <button
                  className={`db-dept-pill ${activeSeniorDept === "core" ? "active" : ""}`}
                  onClick={() => setActiveSeniorDept("core")}
                  type="button"
                >
                  ⭐ General / Core (All Depts)
                </button>
                {departments.map((d) => (
                  <button
                    key={d.id}
                    className={`db-dept-pill ${activeSeniorDept === String(d.id) ? "active" : ""}`}
                    onClick={() => setActiveSeniorDept(String(d.id))}
                    type="button"
                  >
                    {/science/i.test(d.name) ? "🔬 " : /art/i.test(d.name) ? "🏛️ " : /comm/i.test(d.name) ? "📊 " : "🛠️ "}
                    {d.name}
                  </button>
                ))}
              </div>
            )}

            {/* SUBJECTS CATALOG PANEL */}
            <div className="db-panel">
              <div className="db-panel-head">
                <div className="db-panel-title-group">
                  <div className="db-panel-icon">
                    <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                      <path d="M3 4.5h10M3 8h10M3 11.5h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="db-panel-title">
                      {activeSectionTab === "primary"
                        ? "Primary / Basic Subjects"
                        : activeSectionTab === "junior"
                        ? "Junior Secondary (JSS) Subjects"
                        : activeSectionTab === "senior"
                        ? `Senior Secondary Subjects ${activeSeniorDept !== "all_senior" ? "— " + (activeSeniorDept === "core" ? "General / Core" : (departments.find((d) => String(d.id) === activeSeniorDept)?.name || "")) : ""}`
                        : "Registered Subjects Master Catalog"}
                    </h2>
                    <p className="db-panel-sub">
                      Showing {filteredSubjects.length} active subjects for this level.
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {/* Search */}
                  <div className="db-input">
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                      <circle cx="7" cy="7" r="4.5" stroke="#64748B" strokeWidth="1.4" />
                      <path d="M11 11l3 3" stroke="#64748B" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <input
                      placeholder="Search subject or code..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query.trim() && (
                      <button className="db-chip-btn" style={{ padding: "2px 6px" }} onClick={() => setQuery("")} type="button">
                        ✕
                      </button>
                    )}
                  </div>

                  {/* 1-Click Load Standard Curriculum */}
                  <button
                    className="db-btn-magic"
                    onClick={() => {
                      if (activeSectionTab === "primary") openCurriculumModal("primary");
                      else if (activeSectionTab === "junior") openCurriculumModal("junior");
                      else if (activeSectionTab === "senior") {
                        if (activeSeniorDept === "core") openCurriculumModal("senior_core");
                        else if (activeSeniorDept !== "all_senior") {
                          const deptObj = departments.find((d) => String(d.id) === activeSeniorDept);
                          const deptName = (deptObj?.name || "").toLowerCase();
                          if (/sci/i.test(deptName)) openCurriculumModal("senior_science");
                          else if (/art|hum/i.test(deptName)) openCurriculumModal("senior_arts");
                          else if (/com/i.test(deptName)) openCurriculumModal("senior_commercial");
                          else openCurriculumModal("senior_vocational");
                        } else {
                          openCurriculumModal("all");
                        }
                      } else {
                        openCurriculumModal("all");
                      }
                    }}
                    type="button"
                  >
                    ✨ Standard Curriculum Presets
                  </button>

                  {/* Add Subject */}
                  <button className="db-btn-primary" onClick={openAddModal} type="button">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Add Subject
                  </button>

                  <button
                    className="db-chip-btn"
                    onClick={() => setShowArchived((v) => !v)}
                    type="button"
                  >
                    {showArchived ? "Show Active" : "Archived"}
                  </button>
                </div>
              </div>

              {/* Table Toolbar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 14, borderBottom: "1px solid #F1F5F9", marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: "#64748B" }}>
                  Total: <b style={{ color: "#0F172A" }}>{filteredSubjects.length}</b> subjects
                  {selectedCount > 0 && (
                    <span style={{ marginLeft: 10, color: "#2563EB", fontWeight: 700 }}>
                      • {selectedCount} selected
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button className="db-chip-btn" onClick={selectAllFiltered} disabled={filteredSubjects.length === 0} type="button">
                    Select All
                  </button>
                  <button className="db-chip-btn" onClick={clearSelection} disabled={selectedCount === 0} type="button">
                    Clear
                  </button>
                  <button
                    className="db-chip-btn"
                    onClick={() => setShowAssign(true)}
                    disabled={selectedCount === 0}
                    type="button"
                  >
                    Assign Section ({selectedCount})
                  </button>
                </div>
              </div>

              {/* Subject Table */}
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
                      <th style={{ width: 130 }}>Code</th>
                      <th style={{ width: 170 }}>Academic Section</th>
                      <th style={{ width: 180 }}>Department</th>
                      <th style={{ width: 160, textAlign: "right" }}>Actions</th>
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
                        <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
                          <div style={{ fontSize: 28, marginBottom: 8 }}>📚</div>
                          <div style={{ fontWeight: 800, color: "#0F172A", fontSize: 15 }}>No subjects found in this view</div>
                          <div style={{ marginTop: 4, fontSize: 13 }}>Click "+ Add Subject" or use "✨ Standard Curriculum Presets" to populate.</div>
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
                            <div style={{ fontSize: 11, color: "#94A3B8" }}>ID: {s.id}</div>
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
                            <div style={{ display: "inline-flex", gap: 6 }}>
                              <button
                                className="db-chip-btn"
                                onClick={() => openEdit(s)}
                                disabled={showArchived}
                                type="button"
                              >
                                Edit
                              </button>

                              <button
                                className="db-chip-btn"
                                style={{ color: showArchived ? "#059669" : "#DC2626" }}
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
                  <div className="db-panel-icon" style={{ background: "#FEF3C7", color: "#D97706" }}>
                    <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                      <path d="M3 4h10M3 8h10M3 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="db-panel-title">Subject Allocation Matrix</h2>
                    <p className="db-panel-sub">
                      Assign which master subjects belong to each target class (e.g. Primary 1, JSS 1) or Senior Department (e.g. SSS 1 Science).
                    </p>
                  </div>
                </div>

                <div>
                  <span className="db-pill db-pill-blue" style={{ fontSize: 13, padding: "6px 12px" }}>
                    {offeringSelectedCount} subjects selected for this class
                  </span>
                </div>
              </div>

              {/* Scope selectors */}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 18 }}>
                <div className="db-field" style={{ minWidth: 200, margin: 0 }}>
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

                <div className="db-field" style={{ minWidth: 180, margin: 0 }}>
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
                  className="db-chip-btn"
                  style={{ height: 42, background: "#0F172A", color: "#fff", borderColor: "#0F172A" }}
                  type="button"
                  onClick={loadOfferings}
                  disabled={busyKey !== null}
                >
                  {isBusy("offerings:load") ? "Loading..." : "Load Current Setup"}
                </button>

                <button
                  className="db-chip-btn"
                  style={{ height: 42, background: "#EFF6FF", color: "#1D4ED8", borderColor: "#BFDBFE" }}
                  type="button"
                  onClick={selectRecommendedOfferings}
                >
                  ⚡ Auto-Select Level Core
                </button>

                <button
                  className="db-btn-gold"
                  style={{ height: 42 }}
                  type="button"
                  onClick={saveOfferings}
                  disabled={busyKey !== null}
                >
                  {isBusy("offerings:save") ? "Saving..." : "Save Allocation"}
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div className="db-help">
                  Check the subjects offered by students in this class:
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
                      <h3 className="db-panel-title">Add New Subject</h3>
                      <p className="db-panel-sub">Create a subject in your school catalog.</p>
                    </div>
                    <button className="db-chip-btn" onClick={() => setShowCreate(false)} type="button">
                      ✕
                    </button>
                  </div>

                  <div className="db-modal-body">
                    <div className="db-field">
                      <label>
                        Subject Name <span style={{ color: "#EF4444" }}>*</span>
                      </label>
                      <input
                        placeholder="e.g. Further Mathematics, Chemistry, Civic Education"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        autoFocus
                      />

                      {/* Common suggestions */}
                      <div className="db-suggest-chips">
                        {["Mathematics", "English Studies", "Biology", "Chemistry", "Physics", "Civic Education", "Economics", "Literature in English", "Financial Accounting", "Basic Science", "Social Studies"].map((item) => (
                          <button
                            key={item}
                            type="button"
                            className="db-suggest-chip"
                            onClick={() => setCreateName(item)}
                          >
                            + {item}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="db-field">
                      <label>Academic Section (Optional)</label>
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
                    <button className="db-btn-primary" onClick={createSubject} disabled={busyKey !== null} type="button">
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
                      <h3 className="db-panel-title">Edit Subject</h3>
                      <p className="db-panel-sub">Update subject details.</p>
                    </div>
                    <button className="db-chip-btn" onClick={() => setShowEdit(false)} type="button">
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
                    <button className="db-btn-primary" onClick={updateSubject} disabled={busyKey !== null} type="button">
                      {isBusy(`subject:update:${editId}`) ? "Updating..." : "Update Subject"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL: STANDARD CURRICULUM PRESET IMPORTER */}
            {showCurriculumModal && (
              <div className="db-modal-backdrop" onMouseDown={() => setShowCurriculumModal(false)}>
                <div className="db-modal" style={{ maxWidth: 650 }} onMouseDown={(e) => e.stopPropagation()}>
                  <div className="db-modal-head">
                    <div>
                      <h3 className="db-panel-title">✨ Standard Curriculum Presets</h3>
                      <p className="db-panel-sub">Quickly import verified NERDC / WAEC national curriculum subjects.</p>
                    </div>
                    <button className="db-chip-btn" onClick={() => setShowCurriculumModal(false)} type="button">
                      ✕
                    </button>
                  </div>

                  <div className="db-modal-body">
                    {/* Category Selector */}
                    <div className="db-field">
                      <label>Select Curriculum Level to Review:</label>
                      <select
                        value={selectedCurriculumCategory}
                        onChange={(e) => {
                          const cat = e.target.value;
                          setSelectedCurriculumCategory(cat);
                          const nextMap: Record<string, boolean> = {};
                          if (cat === "all") {
                            Object.values(STANDARD_CURRICULUM).forEach((group) => {
                              group.items.forEach((item) => (nextMap[item.name] = true));
                            });
                          } else if (STANDARD_CURRICULUM[cat]) {
                            STANDARD_CURRICULUM[cat].items.forEach((item) => (nextMap[item.name] = true));
                          }
                          setCurriculumSelection(nextMap);
                        }}
                      >
                        <option value="all">🌟 Complete School Curriculum (All Levels)</option>
                        <option value="primary">🎒 Primary / Basic Curriculum</option>
                        <option value="junior">📘 Junior Secondary (JSS) Curriculum</option>
                        <option value="senior_core">⭐ Senior Secondary - General / Core</option>
                        <option value="senior_science">🔬 Senior Secondary - Science Department</option>
                        <option value="senior_arts">🏛️ Senior Secondary - Arts & Humanities</option>
                        <option value="senior_commercial">📊 Senior Secondary - Commercial Department</option>
                        <option value="senior_vocational">🛠️ Senior Secondary - Vocational & Technical</option>
                      </select>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "#0F172A" }}>
                        Select subjects to add to your school catalog:
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="db-chip-btn"
                          style={{ padding: "3px 8px", fontSize: 11.5 }}
                          onClick={() => {
                            const map: Record<string, boolean> = {};
                            const activeKeys =
                              selectedCurriculumCategory === "all"
                                ? Object.keys(STANDARD_CURRICULUM)
                                : [selectedCurriculumCategory];
                            activeKeys.forEach((key) => {
                              STANDARD_CURRICULUM[key]?.items.forEach((it) => (map[it.name] = true));
                            });
                            setCurriculumSelection(map);
                          }}
                          type="button"
                        >
                          Select All
                        </button>
                        <button
                          className="db-chip-btn"
                          style={{ padding: "3px 8px", fontSize: 11.5 }}
                          onClick={() => setCurriculumSelection({})}
                          type="button"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div style={{ maxHeight: 300, overflowY: "auto", border: "1px solid #E2E8F0", borderRadius: 12, padding: 12 }}>
                      {(selectedCurriculumCategory === "all"
                        ? Object.keys(STANDARD_CURRICULUM)
                        : [selectedCurriculumCategory]
                      ).map((key) => {
                        const group = STANDARD_CURRICULUM[key];
                        if (!group) return null;
                        return (
                          <div key={key} style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: "#64748B", textTransform: "uppercase", marginBottom: 8 }}>
                              {group.icon} {group.label}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                              {group.items.map((item) => {
                                const alreadyExists = subjects.some(
                                  (s) => s.name.toLowerCase().trim() === item.name.toLowerCase().trim()
                                );
                                return (
                                  <label
                                    key={item.name}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                      padding: "7px 10px",
                                      borderRadius: 8,
                                      background: alreadyExists ? "#F1F5F9" : "#F8FAFC",
                                      border: "1px solid #E2E8F0",
                                      fontSize: 12.5,
                                      cursor: alreadyExists ? "default" : "pointer",
                                      opacity: alreadyExists ? 0.7 : 1,
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={alreadyExists ? false : !!curriculumSelection[item.name]}
                                      disabled={alreadyExists}
                                      onChange={(e) => {
                                        setCurriculumSelection((prev) => ({
                                          ...prev,
                                          [item.name]: e.target.checked,
                                        }));
                                      }}
                                    />
                                    <span style={{ fontWeight: 600, color: "#0F172A" }}>{item.name}</span>
                                    {alreadyExists && (
                                      <span style={{ fontSize: 10, background: "#D1FAE5", color: "#065F46", padding: "1px 5px", borderRadius: 4, marginLeft: "auto" }}>
                                        ✓ Added
                                      </span>
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="db-modal-foot">
                    <button className="db-chip-btn" onClick={() => setShowCurriculumModal(false)} type="button">
                      Cancel
                    </button>
                    <button
                      className="db-btn-magic"
                      onClick={importSelectedCurriculum}
                      disabled={busyKey !== null}
                      type="button"
                    >
                      {isBusy("curriculum:import") ? "Importing..." : "Import Selected Subjects"}
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
                      <h3 className="db-panel-title">Bulk Assign Section</h3>
                      <p className="db-panel-sub">Assign {selectedCount} selected subjects to a section.</p>
                    </div>
                    <button className="db-chip-btn" onClick={() => setShowAssign(false)} type="button">
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
                    <button className="db-btn-primary" onClick={assignSectionToSelected} disabled={busyKey !== null} type="button">
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
