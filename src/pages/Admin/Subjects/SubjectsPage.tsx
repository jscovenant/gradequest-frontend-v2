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
  category_label?: string;
};

/* =========================
   STANDARD CURRICULUM PRESETS
========================= */
const STANDARD_CURRICULUM: Record<
  string,
  { label: string; icon: string; tag: string; items: CurriculumTemplateItem[] }
> = {
  primary: {
    label: "Primary / Basic",
    icon: "🎒",
    tag: "Primary",
    items: [
      { name: "Mathematics", code: "MTH", section_tag: "primary", category_label: "Primary" },
      { name: "English Studies", code: "ENG", section_tag: "primary", category_label: "Primary" },
      { name: "Basic Science & Technology", code: "BST", section_tag: "primary", category_label: "Primary" },
      { name: "Social Studies", code: "SOS", section_tag: "primary", category_label: "Primary" },
      { name: "Civic Education", code: "CIV", section_tag: "primary", category_label: "Primary" },
      { name: "Quantitative Reasoning", code: "QTR", section_tag: "primary", category_label: "Primary" },
      { name: "Verbal Reasoning", code: "VRB", section_tag: "primary", category_label: "Primary" },
      { name: "Christian Religious Studies (CRS)", code: "CRS", section_tag: "primary", category_label: "Primary" },
      { name: "Islamic Religious Studies (IRS)", code: "IRS", section_tag: "primary", category_label: "Primary" },
      { name: "Cultural & Creative Arts (CCA)", code: "CCA", section_tag: "primary", category_label: "Primary" },
      { name: "Physical & Health Education (PHE)", code: "PHE", section_tag: "primary", category_label: "Primary" },
      { name: "Agricultural Science", code: "AGR", section_tag: "primary", category_label: "Primary" },
      { name: "Home Economics", code: "HEC", section_tag: "primary", category_label: "Primary" },
      { name: "Computer Studies / ICT", code: "ICT", section_tag: "primary", category_label: "Primary" },
      { name: "Handwriting & Phonics", code: "HWT", section_tag: "primary", category_label: "Primary" },
      { name: "French Language", code: "FRN", section_tag: "primary", category_label: "Primary" },
    ],
  },
  junior: {
    label: "Junior Secondary (JSS)",
    icon: "📘",
    tag: "Junior Sec",
    items: [
      { name: "English Studies", code: "ENG", section_tag: "junior", category_label: "Junior Sec" },
      { name: "General Mathematics", code: "MTH", section_tag: "junior", category_label: "Junior Sec" },
      { name: "Basic Science", code: "BSC", section_tag: "junior", category_label: "Junior Sec" },
      { name: "Basic Technology", code: "BTE", section_tag: "junior", category_label: "Junior Sec" },
      { name: "Business Studies", code: "BST", section_tag: "junior", category_label: "Junior Sec" },
      { name: "Social Studies", code: "SOS", section_tag: "junior", category_label: "Junior Sec" },
      { name: "Civic Education", code: "CIV", section_tag: "junior", category_label: "Junior Sec" },
      { name: "Agricultural Science", code: "AGR", section_tag: "junior", category_label: "Junior Sec" },
      { name: "Home Economics", code: "HEC", section_tag: "junior", category_label: "Junior Sec" },
      { name: "Computer Studies / ICT", code: "ICT", section_tag: "junior", category_label: "Junior Sec" },
      { name: "Physical & Health Education (PHE)", code: "PHE", section_tag: "junior", category_label: "Junior Sec" },
      { name: "Cultural & Creative Arts (CCA)", code: "CCA", section_tag: "junior", category_label: "Junior Sec" },
      { name: "Christian Religious Studies (CRS)", code: "CRS", section_tag: "junior", category_label: "Junior Sec" },
      { name: "Islamic Religious Studies (IRS)", code: "IRS", section_tag: "junior", category_label: "Junior Sec" },
      { name: "French Language", code: "FRN", section_tag: "junior", category_label: "Junior Sec" },
      { name: "Nigerian Language (Hausa / Igbo / Yoruba)", code: "NLN", section_tag: "junior", category_label: "Junior Sec" },
    ],
  },
  senior_compulsory: {
    label: "Senior Compulsory (All Depts)",
    icon: "⭐",
    tag: "Senior Compulsory",
    items: [
      { name: "English Language", code: "ENG", section_tag: "senior", dept_tag: "general", category_label: "Senior Compulsory" },
      { name: "General Mathematics", code: "MTH", section_tag: "senior", dept_tag: "general", category_label: "Senior Compulsory" },
      { name: "Civic Education", code: "CIV", section_tag: "senior", dept_tag: "general", category_label: "Senior Compulsory" },
      { name: "Economics", code: "ECO", section_tag: "senior", dept_tag: "general", category_label: "Senior Compulsory" },
      { name: "Data Processing", code: "DTP", section_tag: "senior", dept_tag: "general", category_label: "Senior Compulsory" },
      { name: "Trade & Entrepreneurship", code: "TRD", section_tag: "senior", dept_tag: "general", category_label: "Senior Compulsory" },
    ],
  },
  senior_science: {
    label: "Senior Science Department",
    icon: "🔬",
    tag: "Senior Science",
    items: [
      { name: "Physics", code: "PHY", section_tag: "senior", dept_tag: "science", category_label: "Science" },
      { name: "Chemistry", code: "CHM", section_tag: "senior", dept_tag: "science", category_label: "Science" },
      { name: "Biology", code: "BIO", section_tag: "senior", dept_tag: "science", category_label: "Science" },
      { name: "Further Mathematics", code: "FMT", section_tag: "senior", dept_tag: "science", category_label: "Science" },
      { name: "Agricultural Science", code: "AGR", section_tag: "senior", dept_tag: "science", category_label: "Science" },
      { name: "Technical Drawing", code: "TDR", section_tag: "senior", dept_tag: "science", category_label: "Science" },
      { name: "Geography", code: "GEO", section_tag: "senior", dept_tag: "science", category_label: "Science" },
    ],
  },
  senior_arts: {
    label: "Senior Arts & Humanities",
    icon: "🏛️",
    tag: "Senior Arts",
    items: [
      { name: "Literature in English", code: "LIT", section_tag: "senior", dept_tag: "arts", category_label: "Arts & Humanities" },
      { name: "Government", code: "GOV", section_tag: "senior", dept_tag: "arts", category_label: "Arts & Humanities" },
      { name: "Christian Religious Studies (CRS)", code: "CRS", section_tag: "senior", dept_tag: "arts", category_label: "Arts & Humanities" },
      { name: "Islamic Religious Studies (IRS)", code: "IRS", section_tag: "senior", dept_tag: "arts", category_label: "Arts & Humanities" },
      { name: "History", code: "HIS", section_tag: "senior", dept_tag: "arts", category_label: "Arts & Humanities" },
      { name: "Visual Arts", code: "ART", section_tag: "senior", dept_tag: "arts", category_label: "Arts & Humanities" },
      { name: "Music", code: "MUS", section_tag: "senior", dept_tag: "arts", category_label: "Arts & Humanities" },
      { name: "French Language", code: "FRN", section_tag: "senior", dept_tag: "arts", category_label: "Arts & Humanities" },
      { name: "Nigerian Language (Hausa / Igbo / Yoruba)", code: "NLN", section_tag: "senior", dept_tag: "arts", category_label: "Arts & Humanities" },
    ],
  },
  senior_commercial: {
    label: "Senior Commercial Department",
    icon: "📊",
    tag: "Senior Commercial",
    items: [
      { name: "Financial Accounting", code: "ACC", section_tag: "senior", dept_tag: "commercial", category_label: "Commercial" },
      { name: "Commerce", code: "COM", section_tag: "senior", dept_tag: "commercial", category_label: "Commercial" },
      { name: "Book Keeping", code: "BKK", section_tag: "senior", dept_tag: "commercial", category_label: "Commercial" },
      { name: "Store Management", code: "STM", section_tag: "senior", dept_tag: "commercial", category_label: "Commercial" },
      { name: "Office Practice", code: "OFP", section_tag: "senior", dept_tag: "commercial", category_label: "Commercial" },
      { name: "Insurance", code: "INS", section_tag: "senior", dept_tag: "commercial", category_label: "Commercial" },
    ],
  },
  senior_vocational: {
    label: "Senior Vocational & Technical",
    icon: "🛠️",
    tag: "Senior Vocational",
    items: [
      { name: "Food & Nutrition", code: "FDN", section_tag: "senior", dept_tag: "vocational", category_label: "Vocational" },
      { name: "Clothing & Textiles", code: "CLT", section_tag: "senior", dept_tag: "vocational", category_label: "Vocational" },
      { name: "Auto Mechanics", code: "MEC", section_tag: "senior", dept_tag: "vocational", category_label: "Vocational" },
      { name: "Building Construction", code: "BLD", section_tag: "senior", dept_tag: "vocational", category_label: "Vocational" },
      { name: "Electrical Installation", code: "ELE", section_tag: "senior", dept_tag: "vocational", category_label: "Vocational" },
      { name: "Woodwork", code: "WDW", section_tag: "senior", dept_tag: "vocational", category_label: "Vocational" },
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
  // active Senior Department Tab: 'all_senior' | 'compulsory' | number (dept_id)
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
  const [createCode, setCreateCode] = useState("");
  const [createSectionId, setCreateSectionId] = useState<string>("");
  const [createDepartmentId, setCreateDepartmentId] = useState<string>("");

  // edit form
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
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
    s.department?.name ?? departments.find((x) => x.id === s.department_id)?.name ?? "Compulsory (All Depts)";

  const isSubjectInPrimary = (s: Subject) => {
    if (!s.section_id && !s.department_id) return true; // Universal
    if (primarySection && s.section_id === primarySection.id) return true;
    const name = sectionName(s).toLowerCase();
    return /primary|nursery|basic|grade|kinder/i.test(name);
  };

  const isSubjectInJunior = (s: Subject) => {
    if (!s.section_id && !s.department_id) return true; // Universal
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
      if (activeSeniorDept === "compulsory") {
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
    setCreateCode("");
    setShowCreate(true);
  }

  async function createSubject() {
    const name = createName.trim();
    if (!name) return showError("Please enter a subject name.");

    try {
      setBusyKey("subject:create");
      const payload: any = { name };
      if (createCode.trim()) payload.code = createCode.trim().toUpperCase();

      const res = await authApi.post("/subjects", payload);
      const code = res.data?.subject_code ? ` (${res.data.subject_code})` : "";
      showSuccess((res.data?.message ?? "Subject added successfully") + code);

      setCreateName("");
      setCreateCode("");
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
    setEditCode(subject.subject_id ?? "");
    setShowEdit(true);
  }

  async function updateSubject() {
    if (!editId) return;
    const name = editName.trim();
    if (!name) return showError("Please enter a subject name.");

    try {
      setBusyKey(`subject:update:${editId}`);
      const payload: any = { name };

      const res = await authApi.put(`/subjects/${editId}`, payload);
      showSuccess(res.data?.message ?? "Subject updated successfully.");

      setShowEdit(false);
      setEditId(null);
      setEditName("");
      setEditCode("");
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
    // Pre-check all items that are NOT already in the school
    const initialMap: Record<string, boolean> = {};
    Object.values(STANDARD_CURRICULUM).forEach((group) => {
      group.items.forEach((item) => {
        const alreadyInSchool = subjects.some(
          (s) => s.name.toLowerCase().trim() === item.name.toLowerCase().trim()
        );
        if (!alreadyInSchool) {
          initialMap[item.name] = true;
        }
      });
    });
    setCurriculumSelection(initialMap);
    setShowCurriculumModal(true);
  }

  // Items currently visible in the modal based on active category
  const activeModalCurriculumGroups = useMemo(() => {
    if (selectedCurriculumCategory === "all") {
      return Object.entries(STANDARD_CURRICULUM);
    }
    if (STANDARD_CURRICULUM[selectedCurriculumCategory]) {
      return [[selectedCurriculumCategory, STANDARD_CURRICULUM[selectedCurriculumCategory]]] as [
        string,
        (typeof STANDARD_CURRICULUM)[string]
      ][];
    }
    return Object.entries(STANDARD_CURRICULUM);
  }, [selectedCurriculumCategory]);

  const modalSelectedCount = useMemo(() => {
    let count = 0;
    activeModalCurriculumGroups.forEach(([, group]) => {
      group.items.forEach((item) => {
        const alreadyExists = subjects.some(
          (s) => s.name.toLowerCase().trim() === item.name.toLowerCase().trim()
        );
        if (!alreadyExists && curriculumSelection[item.name]) {
          count++;
        }
      });
    });
    return count;
  }, [activeModalCurriculumGroups, curriculumSelection, subjects]);

  async function importSelectedCurriculum() {
    const selectedItems: CurriculumTemplateItem[] = [];
    activeModalCurriculumGroups.forEach(([, group]) => {
      group.items.forEach((item) => {
        const alreadyExists = subjects.some(
          (s) => s.name.toLowerCase().trim() === item.name.toLowerCase().trim()
        );
        if (!alreadyExists && curriculumSelection[item.name]) {
          selectedItems.push(item);
        }
      });
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
          next[s.id] = true; // Compulsory Senior Subjects
        } else if (offeringDepartmentId && s.department_id === Number(offeringDepartmentId)) {
          next[s.id] = true; // Specific Department Subjects
        }
      } else {
        // Universal subjects
        if (!s.section_id && !s.department_id) next[s.id] = true;
      }
    });

    setOfferingSubjectIds(next);
    showSuccess("Pre-selected compulsory & standard subjects for this level.");
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

        /* ============================
           MODAL SYSTEM - HIGH VISIBILITY
        ============================ */
        .db-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 16px;
          overflow-y: auto;
        }
        .db-modal-card {
          background: #FFFFFF;
          border-radius: 20px;
          width: 100%;
          max-width: 620px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
          border: 1px solid #E2E8F0;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          overflow: hidden;
          animation: modalFadeIn 0.2s ease-out;
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.97) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .db-modal-top {
          padding: 20px 24px;
          background: #FFFFFF;
          border-bottom: 1px solid #F1F5F9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .db-modal-heading {
          font-size: 18px;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .db-modal-desc {
          font-size: 12.5px;
          color: #64748B;
          margin: 3px 0 0 0;
        }
        .db-modal-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid #E2E8F0;
          background: #F8FAFC;
          color: #64748B;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .db-modal-close-btn:hover {
          background: #F1F5F9;
          color: #0F172A;
          border-color: #CBD5E1;
        }
        .db-modal-content {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }
        .db-modal-bottom {
          padding: 16px 24px;
          background: #F8FAFC;
          border-top: 1px solid #E2E8F0;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          align-items: center;
        }

        /* Form Fields */
        .db-form-group {
          margin-bottom: 18px;
        }
        .db-form-group label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #0F172A;
          margin-bottom: 7px;
        }
        .db-form-input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #CBD5E1;
          border-radius: 10px;
          font-size: 14px;
          color: #0F172A;
          background: #FFFFFF;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .db-form-input:focus {
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .db-form-hint {
          font-size: 12px;
          color: #64748B;
          margin-top: 5px;
          display: block;
        }

        /* Suggestion Pills */
        .db-quick-chips {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 10px;
        }
        .db-quick-chip {
          font-size: 11.5px;
          padding: 4px 10px;
          border-radius: 8px;
          background: #EFF6FF;
          border: 1px solid #BFDBFE;
          color: #1E40AF;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.15s;
        }
        .db-quick-chip:hover {
          background: #DBEAFE;
          border-color: #93C5FD;
          transform: translateY(-1px);
        }

        /* Curriculum Modal Categories */
        .db-curriculum-cat-bar {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 8px;
          margin-bottom: 16px;
        }
        .db-curriculum-cat-btn {
          padding: 7px 12px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid #E2E8F0;
          background: #F8FAFC;
          color: #475569;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .db-curriculum-cat-btn:hover {
          background: #EFF6FF;
          color: #1E40AF;
        }
        .db-curriculum-cat-btn.active {
          background: #7C3AED;
          color: #FFFFFF;
          border-color: #7C3AED;
          box-shadow: 0 2px 6px rgba(124, 58, 237, 0.25);
        }

        /* Curriculum Preset Item Card */
        .db-preset-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          transition: all 0.15s;
          cursor: pointer;
        }
        .db-preset-card:hover {
          border-color: #93C5FD;
          background: #F8FAFC;
        }
        .db-preset-card.checked {
          border-color: #7C3AED;
          background: #FAF5FF;
        }
        .db-preset-card.exists {
          background: #F1F5F9;
          border-color: #E2E8F0;
          opacity: 0.75;
          cursor: not-allowed;
        }
        .db-preset-card input[type="checkbox"] {
          width: 17px;
          height: 17px;
          accent-color: #7C3AED;
          cursor: pointer;
        }

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
                  className={`db-dept-pill ${activeSeniorDept === "compulsory" ? "active" : ""}`}
                  onClick={() => setActiveSeniorDept("compulsory")}
                  type="button"
                >
                  ⭐ Compulsory (All Depts)
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
                        ? `Senior Secondary Subjects ${activeSeniorDept !== "all_senior" ? "— " + (activeSeniorDept === "compulsory" ? "Compulsory (All Depts)" : (departments.find((d) => String(d.id) === activeSeniorDept)?.name || "")) : ""}`
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
                        if (activeSeniorDept === "compulsory") openCurriculumModal("senior_compulsory");
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
                      <th style={{ width: 190 }}>Department / Category</th>
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
                <div className="db-form-group" style={{ minWidth: 200, margin: 0 }}>
                  <label>Select Target Class</label>
                  <select
                    className="db-form-input"
                    value={offeringClassId}
                    onChange={(e) => setOfferingClassId(e.target.value)}
                  >
                    <option value="">All Classes (School Default)</option>
                    {classes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="db-form-group" style={{ minWidth: 170, margin: 0 }}>
                  <label>Section (Optional)</label>
                  <select
                    className="db-form-input"
                    value={offeringSectionId}
                    onChange={(e) => setOfferingSectionId(e.target.value)}
                  >
                    <option value="">All Sections</option>
                    {sections.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="db-form-group" style={{ minWidth: 180, margin: 0 }}>
                  <label>Department (Optional)</label>
                  <select
                    className="db-form-input"
                    value={offeringDepartmentId}
                    onChange={(e) => setOfferingDepartmentId(e.target.value)}
                  >
                    <option value="">Compulsory / All Departments</option>
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
                  ⚡ Auto-Select Compulsory Subjects
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
                <div className="db-form-hint">
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

            {/* ========================================================
                MODAL 1: ADD NEW SUBJECT (Clean & Fast)
               ======================================================== */}
            {showCreate && (
              <div className="db-modal-overlay" onMouseDown={() => setShowCreate(false)}>
                <div className="db-modal-card" style={{ maxWidth: 520 }} onMouseDown={(e) => e.stopPropagation()}>
                  <div className="db-modal-top">
                    <div>
                      <h3 className="db-modal-heading">
                        <span>➕ Add New Subject</span>
                      </h3>
                      <p className="db-modal-desc">Register a master subject in your school catalog.</p>
                    </div>
                    <button className="db-modal-close-btn" onClick={() => setShowCreate(false)} type="button">
                      ✕
                    </button>
                  </div>

                  <div className="db-modal-content">
                    {/* Subject Name Input */}
                    <div className="db-form-group">
                      <label>
                        Subject Name <span style={{ color: "#EF4444" }}>*</span>
                      </label>
                      <input
                        className="db-form-input"
                        placeholder="e.g. Further Mathematics, Chemistry, Civic Education"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        autoFocus
                      />

                      {/* Common One-Click Suggestions */}
                      <div className="db-quick-chips">
                        {[
                          "Mathematics",
                          "English Studies",
                          "Civic Education",
                          "Biology",
                          "Chemistry",
                          "Physics",
                          "Economics",
                          "Literature in English",
                          "Financial Accounting",
                          "Basic Science",
                          "Social Studies",
                        ].map((item) => (
                          <button
                            key={item}
                            type="button"
                            className="db-quick-chip"
                            onClick={() => {
                              setCreateName(item);
                            }}
                          >
                            + {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="db-modal-bottom">
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

            {/* ========================================================
                MODAL 2: EDIT SUBJECT
               ======================================================== */}
            {showEdit && (
              <div className="db-modal-overlay" onMouseDown={() => setShowEdit(false)}>
                <div className="db-modal-card" style={{ maxWidth: 520 }} onMouseDown={(e) => e.stopPropagation()}>
                  <div className="db-modal-top">
                    <div>
                      <h3 className="db-modal-heading">
                        <span>✏️ Edit Subject</span>
                      </h3>
                      <p className="db-modal-desc">Update subject name.</p>
                    </div>
                    <button className="db-modal-close-btn" onClick={() => setShowEdit(false)} type="button">
                      ✕
                    </button>
                  </div>

                  <div className="db-modal-content">
                    <div className="db-form-group">
                      <label>
                        Subject Name <span style={{ color: "#EF4444" }}>*</span>
                      </label>
                      <input
                        className="db-form-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="db-modal-bottom">
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

            {/* ========================================================
                MODAL 3: STANDARD CURRICULUM PRESET IMPORTER
               ======================================================== */}
            {showCurriculumModal && (
              <div className="db-modal-overlay" onMouseDown={() => setShowCurriculumModal(false)}>
                <div className="db-modal-card" style={{ maxWidth: 680 }} onMouseDown={(e) => e.stopPropagation()}>
                  <div className="db-modal-top">
                    <div>
                      <h3 className="db-modal-heading">
                        <span>✨ Standard Curriculum Presets</span>
                      </h3>
                      <p className="db-modal-desc">
                        Select and import standard NERDC / WAEC curriculum subjects into your school.
                      </p>
                    </div>
                    <button className="db-modal-close-btn" onClick={() => setShowCurriculumModal(false)} type="button">
                      ✕
                    </button>
                  </div>

                  <div className="db-modal-content">
                    {/* Level Filter Buttons */}
                    <div className="db-curriculum-cat-bar">
                      <button
                        type="button"
                        className={`db-curriculum-cat-btn ${selectedCurriculumCategory === "all" ? "active" : ""}`}
                        onClick={() => setSelectedCurriculumCategory("all")}
                      >
                        🌟 All Levels
                      </button>
                      <button
                        type="button"
                        className={`db-curriculum-cat-btn ${selectedCurriculumCategory === "primary" ? "active" : ""}`}
                        onClick={() => setSelectedCurriculumCategory("primary")}
                      >
                        🎒 Primary
                      </button>
                      <button
                        type="button"
                        className={`db-curriculum-cat-btn ${selectedCurriculumCategory === "junior" ? "active" : ""}`}
                        onClick={() => setSelectedCurriculumCategory("junior")}
                      >
                        📘 Junior Sec
                      </button>
                      <button
                        type="button"
                        className={`db-curriculum-cat-btn ${selectedCurriculumCategory === "senior_compulsory" ? "active" : ""}`}
                        onClick={() => setSelectedCurriculumCategory("senior_compulsory")}
                      >
                        ⭐ Senior Compulsory
                      </button>
                      <button
                        type="button"
                        className={`db-curriculum-cat-btn ${selectedCurriculumCategory === "senior_science" ? "active" : ""}`}
                        onClick={() => setSelectedCurriculumCategory("senior_science")}
                      >
                        🔬 Science
                      </button>
                      <button
                        type="button"
                        className={`db-curriculum-cat-btn ${selectedCurriculumCategory === "senior_arts" ? "active" : ""}`}
                        onClick={() => setSelectedCurriculumCategory("senior_arts")}
                      >
                        🏛️ Arts
                      </button>
                      <button
                        type="button"
                        className={`db-curriculum-cat-btn ${selectedCurriculumCategory === "senior_commercial" ? "active" : ""}`}
                        onClick={() => setSelectedCurriculumCategory("senior_commercial")}
                      >
                        📊 Commercial
                      </button>
                      <button
                        type="button"
                        className={`db-curriculum-cat-btn ${selectedCurriculumCategory === "senior_vocational" ? "active" : ""}`}
                        onClick={() => setSelectedCurriculumCategory("senior_vocational")}
                      >
                        🛠️ Vocational
                      </button>
                    </div>

                    {/* Controls Row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #F1F5F9" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                        Available Subjects ({modalSelectedCount} selected for import)
                      </span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="db-chip-btn"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                          onClick={() => {
                            const nextMap: Record<string, boolean> = { ...curriculumSelection };
                            activeModalCurriculumGroups.forEach(([, grp]) => {
                              grp.items.forEach((it) => {
                                const exists = subjects.some(
                                  (s) => s.name.toLowerCase().trim() === it.name.toLowerCase().trim()
                                );
                                if (!exists) nextMap[it.name] = true;
                              });
                            });
                            setCurriculumSelection(nextMap);
                          }}
                          type="button"
                        >
                          Select All Available
                        </button>
                        <button
                          className="db-chip-btn"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                          onClick={() => {
                            const nextMap: Record<string, boolean> = { ...curriculumSelection };
                            activeModalCurriculumGroups.forEach(([, grp]) => {
                              grp.items.forEach((it) => {
                                delete nextMap[it.name];
                              });
                            });
                            setCurriculumSelection(nextMap);
                          }}
                          type="button"
                        >
                          Clear Selection
                        </button>
                      </div>
                    </div>

                    {/* Grouped Subject Cards */}
                    <div style={{ maxHeight: 360, overflowY: "auto", paddingRight: 4 }}>
                      {activeModalCurriculumGroups.map(([key, group]) => {
                        return (
                          <div key={key} style={{ marginBottom: 18 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, color: "#64748B", textTransform: "uppercase", marginBottom: 8, letterSpacing: "0.05em" }}>
                              <span>{group.icon}</span>
                              <span>{group.label}</span>
                              <span style={{ fontSize: 11, background: "#F1F5F9", padding: "1px 6px", borderRadius: 6, color: "#475569" }}>
                                {group.items.length} subjects
                              </span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
                              {group.items.map((item) => {
                                const alreadyExists = subjects.some(
                                  (s) => s.name.toLowerCase().trim() === item.name.toLowerCase().trim()
                                );
                                const isChecked = !alreadyExists && !!curriculumSelection[item.name];

                                return (
                                  <div
                                    key={item.name}
                                    className={`db-preset-card ${alreadyExists ? "exists" : isChecked ? "checked" : ""}`}
                                    onClick={() => {
                                      if (alreadyExists) return;
                                      setCurriculumSelection((prev) => ({
                                        ...prev,
                                        [item.name]: !prev[item.name],
                                      }));
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={alreadyExists ? false : !!curriculumSelection[item.name]}
                                      disabled={alreadyExists}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        setCurriculumSelection((prev) => ({
                                          ...prev,
                                          [item.name]: e.target.checked,
                                        }));
                                      }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {item.name}
                                      </div>
                                      <div style={{ fontSize: 11, color: "#64748B", display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                                        <span className="db-badge-code" style={{ fontSize: 10, padding: "1px 4px" }}>{item.code}</span>
                                        <span>{item.category_label || group.tag}</span>
                                      </div>
                                    </div>

                                    {alreadyExists && (
                                      <span style={{ fontSize: 10.5, fontWeight: 700, background: "#D1FAE5", color: "#065F46", padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>
                                        ✓ In School
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="db-modal-bottom">
                    <button className="db-chip-btn" onClick={() => setShowCurriculumModal(false)} type="button">
                      Cancel
                    </button>
                    <button
                      className="db-btn-magic"
                      onClick={importSelectedCurriculum}
                      disabled={busyKey !== null || modalSelectedCount === 0}
                      type="button"
                    >
                      {isBusy("curriculum:import")
                        ? "Importing..."
                        : `Import ${modalSelectedCount} Selected Subjects`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                MODAL 4: BULK ASSIGN SECTION
               ======================================================== */}
            {showAssign && (
              <div className="db-modal-overlay" onMouseDown={() => setShowAssign(false)}>
                <div className="db-modal-card" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="db-modal-top">
                    <div>
                      <h3 className="db-modal-heading">
                        <span>📦 Bulk Assign Section</span>
                      </h3>
                      <p className="db-modal-desc">Assign {selectedCount} selected subjects to an academic section.</p>
                    </div>
                    <button className="db-modal-close-btn" onClick={() => setShowAssign(false)} type="button">
                      ✕
                    </button>
                  </div>

                  <div className="db-modal-content">
                    <div className="db-form-group">
                      <label>
                        Select Target Section <span style={{ color: "#EF4444" }}>*</span>
                      </label>
                      <select
                        className="db-form-input"
                        value={assignSectionId}
                        onChange={(e) => setAssignSectionId(e.target.value)}
                      >
                        <option value="">Select Section</option>
                        {sections.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="db-modal-bottom">
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
