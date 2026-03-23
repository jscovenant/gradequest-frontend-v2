// src/pages/Parents/ParentsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { authApi } from "../../../utils/axios";

import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { useToast } from "../../../contexts/ToastContext";
import PageTitle from "../../../components/PageTitle";

/* =========================
   TYPES
========================= */
type StudentClass = {
  id: number;
  name: string;
  description?: string | null;
};

type ParentRow = {
  id: number;
  firstname?: string;
  surname?: string;
  email?: string;
  phone?: string;
  address?: string | null;
  default_password?: string | null;
};

type StudentRow = {
  id: number;
  firstname?: string;
  surname?: string;
  reg_no?: string;
  level_id?: number;
  level?: { id: number; name: string } | null;

  // ✅ assignment info from backend (/students/by-classes)
  assigned_parent_id?: number | null;
  assigned_parent_firstname?: string | null;
  assigned_parent_surname?: string | null;
};

type ParentDetailsResponse = {
  parent: ParentRow;
  children: StudentRow[];
};

type ModalTab = "overview" | "children" | "security";

/* =========================
   SMALL UI HELPERS
========================= */
const capitalize = (str?: string | null) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

const fullName = (p?: any) =>
  [capitalize(p?.firstname), capitalize(p?.surname)].filter(Boolean).join(" ").trim() || "—";

const initials = (p?: any) => {
  const a = (p?.firstname || "").trim().charAt(0).toUpperCase();
  const b = (p?.surname || "").trim().charAt(0).toUpperCase();
  return (a + b).trim() || "P";
};

const safeLower = (v?: string | null) => (v ?? "").toString().toLowerCase();

interface InfoItemProps {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
}
const InfoItem = ({ label, value, icon }: InfoItemProps) => (
  <div className="pr-info">
    <div className="pr-info-label">
      {icon ? <span className="pr-info-ico">{icon}</span> : null}
      {label}
    </div>
    <div className="pr-info-val">{value && value !== "" ? value : "N/A"}</div>
  </div>
);

interface BadgeItemProps {
  label: string;
  value?: string | null;
  tone?: "gold" | "blue" | "green" | "purple" | "gray";
  icon?: React.ReactNode;
}
const BadgeItem = ({ label, value, tone = "gray", icon }: BadgeItemProps) => (
  <div className="pr-info">
    <div className="pr-info-label">
      {icon ? <span className="pr-info-ico">{icon}</span> : null}
      {label}
    </div>
    <div className={`pr-pill pr-pill--${tone}`}>{value && value !== "" ? value : "N/A"}</div>
  </div>
);

/* =========================
   ICONS (inline SVG)
========================= */
const I = {
  people: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 18c0-3.314 2.686-6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="15" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11 18c0-2.209 1.791-4 4-4s4 1.791 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  mail: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path
        d="M3 6a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M4 6l6 5 6-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  phone: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path
        d="M7.2 4.2l1.5 3.1c.2.4.1.9-.2 1.2l-1.3 1.3c1.1 2 2.8 3.7 4.8 4.8l1.3-1.3c.3-.3.8-.4 1.2-.2l3.1 1.5c.5.2.7.8.5 1.3l-.7 1.8c-.2.5-.7.8-1.2.8C8.7 18.6 1.4 11.3 1.7 3.9c0-.5.3-1 .8-1.2l1.8-.7c.5-.2 1.1 0 1.3.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  ),
  child: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="7" r="3.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 18c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6.2 6.2c.5-1.8 2-3.1 3.8-3.1s3.3 1.3 3.8 3.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  refresh: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  plus: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  search: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  eye: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 5h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6 5V3.5A1.5 1.5 0 017.5 2h1A1.5 1.5 0 0110 3.5V5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 5l.5 9h5L11 5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M7 7.5v5M9 7.5v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  shield: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 1.5l5 2v4.4c0 3.3-2.2 6-5 6.6-2.8-.6-5-3.3-5-6.6V3.5l5-2z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M6.2 8.2l1.2 1.2 2.6-2.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  key: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="5.2" cy="8.2" r="2.6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7.8 8.2H14V6.6h-2V5h-2V3.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

/* =========================
   PAGE
========================= */
export default function ParentsPage() {
  const { showSuccess, showError } = useToast();

  // ===== Sidebar =====
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ===== List =====
  const [allParents, setAllParents] = useState<ParentRow[]>([]);
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(8);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // ===== Profile modal =====
  const [selectedParent, setSelectedParent] = useState<ParentRow | null>(null);
  const [parentDetails, setParentDetails] = useState<ParentDetailsResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>("overview");

  // ===== Security password UX =====
  const [passwordVisible, setPasswordVisible] = useState(false);

  // ===== Edit mode =====
  const [isEditMode, setIsEditMode] = useState(false);
  const [savingParent, setSavingParent] = useState(false);
  const [editedParent, setEditedParent] = useState({
    firstname: "",
    surname: "",
    email: "",
    phone: "",
    address: "",
    password: "",
  });

  // ===== Add Parent Modal =====
  const [showAddModal, setShowAddModal] = useState(false);
  const [creatingParent, setCreatingParent] = useState(false);
  const [newParent, setNewParent] = useState({
    firstname: "",
    surname: "",
    email: "",
    phone: "",
    address: "",
  });
  const [generatedPassword, setGeneratedPassword] = useState<string>("");

  // ===== Assign Children Modal (Dynamic classes) =====
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classSearch, setClassSearch] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);

  const [studentsLoading, setStudentsLoading] = useState(false);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  /** ================= FETCH PARENTS ================= */
  const fetchAllParents = async () => {
    setLoading(true);
    try {
      const res = await authApi.get<ParentRow[]>("/parents");
      setAllParents(res.data || []);
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message ?? "Failed to load parents");
    } finally {
      setLoading(false);
    }
  };

  const applySearchAndPaging = () => {
    const term = search.trim().toLowerCase();

    const filtered = !term
      ? allParents
      : allParents.filter((p) => {
          const hay = [safeLower(p.firstname), safeLower(p.surname), safeLower(p.email), safeLower(p.phone)].join(" ");
          return hay.includes(term);
        });

    const pages = Math.max(1, Math.ceil(filtered.length / perPage));
    setTotalPages(pages);

    const safePage = Math.min(page, pages);
    if (safePage !== page) setPage(safePage);

    const start = (safePage - 1) * perPage;
    setParents(filtered.slice(start, start + perPage));
  };

  useEffect(() => {
    fetchAllParents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applySearchAndPaging();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allParents, search, page]);

  /** ================= PROFILE ================= */
  const openParent = async (parent: ParentRow) => {
    setSelectedParent(parent);
    setParentDetails(null);
    setLoadingProfile(true);

    setActiveTab("overview");
    setIsEditMode(false);
    setEditedParent({
      firstname: "",
      surname: "",
      email: "",
      phone: "",
      address: "",
      password: "",
    });
    setPasswordVisible(false);

    try {
      const res = await authApi.get<ParentDetailsResponse>(`/parents/${parent.id}`);
      setParentDetails(res.data);
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message ?? "Failed to load parent profile");
      setSelectedParent(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const closeParentModal = () => {
    setSelectedParent(null);
    setParentDetails(null);
    setLoadingProfile(false);
    setActiveTab("overview");
    setIsEditMode(false);
    setEditedParent({
      firstname: "",
      surname: "",
      email: "",
      phone: "",
      address: "",
      password: "",
    });
    setPasswordVisible(false);
  };

  /** ================= EDIT ================= */
  const enableEditMode = async () => {
    if (!selectedParent) return;

    setLoadingProfile(true);
    setActiveTab("overview");
    try {
      const res = await authApi.get<{ parent: ParentRow }>(`/parents/${selectedParent.id}/edit`);
      const p = res.data?.parent;

      setIsEditMode(true);
      setParentDetails((prev) => ({ parent: p, children: prev?.children ?? [] }));

      setEditedParent({
        firstname: p?.firstname || "",
        surname: p?.surname || "",
        email: p?.email || "",
        phone: p?.phone || "",
        address: (p?.address as any) || "",
        password: "",
      });
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message ?? "Failed to fetch parent for edit");
    } finally {
      setLoadingProfile(false);
    }
  };

  const cancelEditMode = () => {
    setIsEditMode(false);
    setEditedParent({
      firstname: "",
      surname: "",
      email: "",
      phone: "",
      address: "",
      password: "",
    });
  };

  const saveParent = async () => {
    if (!selectedParent) return;

    if (!editedParent.firstname.trim()) return showError("Firstname is required");
    if (!editedParent.surname.trim()) return showError("Surname is required");
    if (!editedParent.email.trim()) return showError("Email is required");
    if (!editedParent.phone.trim()) return showError("Phone is required");

    setSavingParent(true);
    try {
      await authApi.put(`/parents/${selectedParent.id}`, {
        firstname: editedParent.firstname.trim(),
        surname: editedParent.surname.trim(),
        email: editedParent.email.trim(),
        phone: editedParent.phone.trim(),
        address: editedParent.address?.trim() || null,
        password: editedParent.password?.trim() || null,
      });

      showSuccess("Parent updated successfully!");
      setIsEditMode(false);

      await fetchAllParents();
      await openParent({ id: selectedParent.id } as ParentRow);
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to update parent");
    } finally {
      setSavingParent(false);
    }
  };

  /** ================= DELETE ================= */
  const deleteParent = async (parent: ParentRow) => {
    const ok = window.confirm(`Delete ${fullName(parent)}?`);
    if (!ok) return;

    setLoading(true);
    try {
      await authApi.delete(`/delete-parent/${parent.id}`);
      showSuccess("Parent deleted successfully");
      closeParentModal();
      setPage(1);
      await fetchAllParents();
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to delete parent");
    } finally {
      setLoading(false);
    }
  };

  /** ================= ADD PARENT ================= */
  const openAddParentModal = () => {
    setNewParent({ firstname: "", surname: "", email: "", phone: "", address: "" });
    setGeneratedPassword("");
    setShowAddModal(true);
  };

  const closeAddParentModal = () => {
    if (creatingParent) return;
    setShowAddModal(false);
  };

  const createParent = async () => {
    if (!newParent.firstname.trim()) return showError("Firstname is required");
    if (!newParent.surname.trim()) return showError("Surname is required");
    if (!newParent.email.trim()) return showError("Email is required");
    if (!newParent.phone.trim()) return showError("Phone is required");

    setCreatingParent(true);
    try {
      const res = await authApi.post("/parents/register", {
        firstname: newParent.firstname.trim(),
        surname: newParent.surname.trim(),
        email: newParent.email.trim(),
        phone: newParent.phone.trim(),
        address: newParent.address?.trim() || null,
      });

      setGeneratedPassword(res.data?.default_password || "");
      showSuccess(res.data?.message || "Parent registered successfully!");

      await fetchAllParents();

      const created = res.data?.parent as ParentRow | undefined;
      if (created?.id) {
        setShowAddModal(false);
        await openParent(created);
        setActiveTab("security");
      }
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to register parent");
    } finally {
      setCreatingParent(false);
    }
  };

  /** ================= ASSIGN CHILDREN (Dynamic Classes) ================= */
  const fetchClasses = async () => {
    setClassesLoading(true);
    try {
      const res = await authApi.get<StudentClass[]>("/student-classes");
      setClasses(res.data || []);
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to load classes");
      setClasses([]);
    } finally {
      setClassesLoading(false);
    }
  };

  const openAssignModal = async () => {
    if (!selectedParent) return;
    setShowAssignModal(true);

    // reset
    setClassSearch("");
    setSelectedClassIds([]);
    setStudents([]);
    setStudentSearch("");
    setSelectedStudentIds([]);

    await fetchClasses();
  };

  const closeAssignModal = () => {
    if (assigning || studentsLoading || classesLoading) return;
    setShowAssignModal(false);
  };

  const filteredClasses = useMemo(() => {
    const term = classSearch.trim().toLowerCase();
    if (!term) return classes;
    return classes.filter((c) => safeLower(c.name).includes(term));
  }, [classes, classSearch]);

  const toggleClass = (id: number) => {
    setSelectedClassIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const loadStudentsBySelectedClasses = async () => {
    if (!selectedClassIds.length) return showError("Select at least one class");
    if (!selectedParent) return showError("No parent selected");

    setStudentsLoading(true);
    try {
      const res = await authApi.post("/students/by-classes", {
        class_ids: selectedClassIds,
        parent_id: selectedParent.id, // ✅ for UI pre-check
      });

      const list: StudentRow[] = res.data?.students || [];
      setStudents(list);

      // ✅ auto-check those already linked to this parent
      const alreadyLinkedIds = list.filter((s) => s.assigned_parent_id === selectedParent.id).map((s) => s.id);
      setSelectedStudentIds(alreadyLinkedIds);

      if (list.length === 0) showError("No students found in selected classes");
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to load students");
    } finally {
      setStudentsLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const term = studentSearch.trim().toLowerCase();
    if (!term) return students;

    return students.filter((s) => {
      const hay = [safeLower(s.firstname), safeLower(s.surname), safeLower(s.reg_no), safeLower(s.level?.name || "")].join(" ");
      return hay.includes(term);
    });
  }, [students, studentSearch]);

  const toggleStudent = (student: StudentRow) => {
    if (!selectedParent) return;

    const assignedToOther = !!student.assigned_parent_id && student.assigned_parent_id !== selectedParent.id;
    if (assignedToOther) {
      const pName = `${student.assigned_parent_firstname || ""} ${student.assigned_parent_surname || ""}`.trim();
      return showError(`This student is already assigned to ${pName || "another parent"}`);
    }

    setSelectedStudentIds((prev) => (prev.includes(student.id) ? prev.filter((x) => x !== student.id) : [...prev, student.id]));
  };

  const assignSelectedChildren = async () => {
    if (!selectedParent) return showError("No parent selected");
    if (!selectedStudentIds.length) return showError("Select at least one student");

    // ✅ Do not re-send those already linked to this parent
    const alreadyLinked = new Set(students.filter((s) => s.assigned_parent_id === selectedParent.id).map((s) => s.id));
    const toAssign = selectedStudentIds.filter((id) => !alreadyLinked.has(id));

    if (toAssign.length === 0) {
      return showError("Selected students are already assigned to this parent.");
    }

    setAssigning(true);
    try {
      await authApi.post("/parents/assign-child", {
        parent_id: selectedParent.id,
        student_ids: toAssign,
      });

      showSuccess("Students assigned successfully");
      setShowAssignModal(false);

      await openParent({ id: selectedParent.id } as ParentRow);
      setActiveTab("children");
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to assign students");
    } finally {
      setAssigning(false);
    }
  };

  const removeChild = async (studentId: number) => {
    if (!selectedParent) return;

    const ok = window.confirm("Remove this student from this parent?");
    if (!ok) return;

    setLoadingProfile(true);
    try {
      await authApi.delete("/parents/remove-child", {
        data: { parent_id: selectedParent.id, student_id: studentId },
      });
      showSuccess("Student removed from parent");
      await openParent({ id: selectedParent.id } as ParentRow);
      setActiveTab("children");
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to remove student");
    } finally {
      setLoadingProfile(false);
    }
  };

  /** ================= STATS (current page) ================= */
  const totalParentsOnPage = parents?.length ?? 0;
  const parentsWithEmailCount = useMemo(() => parents.filter((p) => !!(p.email && p.email.trim())).length, [parents]);
  const parentsWithPhoneCount = useMemo(() => parents.filter((p) => !!(p.phone && p.phone.trim())).length, [parents]);
  const childrenCountInProfile = parentDetails?.children?.length ?? 0;

  /** ================= CLIPBOARD ================= */
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess("Copied!");
    } catch {
      showError("Copy failed (browser blocked)");
    }
  };

  const anyBusy = loading || savingParent || creatingParent || assigning;

  return (
    <>
      <style>{`
/* =========================
   ParentsPage — "AdminDashboard" template skin
   (inline styles per your request)
========================= */

/* Fonts:
   Put this in public/index.html (recommended):
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
*/

.pr-main{
  background: var(--bs-body-bg, #f5f1eb);
  min-height: 100vh;
  font-family: "DM Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  padding: 28px 28px 0;
}

.pr-hero{
  background:#0f172a;
  border-radius: var(--bs-border-radius-lg, 16px);
  padding: 32px 36px;
  position:relative;
  overflow:hidden;
  margin-bottom: 18px;
}
.pr-hero::before{
  content:"";
  position:absolute;
  inset:0;
  background-image: radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px);
  background-size:24px 24px;
  pointer-events:none;
}
.pr-hero-glow{
  position:absolute; top:-60px; right:-60px;
  width:320px; height:320px; border-radius:50%;
  background: radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 65%);
  pointer-events:none;
}
.pr-hero-glow2{
  position:absolute; bottom:-40px; left:30%;
  width:220px; height:220px; border-radius:50%;
  background: radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%);
  pointer-events:none;
}
.pr-hero-inner{
  position:relative; z-index:1;
  display:flex; align-items:center; justify-content:space-between;
  gap:32px; flex-wrap:wrap;
}
.pr-session-badge{
  display:inline-flex; align-items:center; gap:7px;
  font-size:11px; font-weight:500; letter-spacing:0.12em;
  text-transform:uppercase;
  color:#e8c97a;
  background: rgba(201,168,76,0.1);
  border: 1px solid rgba(201,168,76,0.2);
  border-radius:999px;
  padding: 4px 12px;
  margin-bottom: 14px;
}
.pr-session-dot{
  width:6px; height:6px; border-radius:50%;
  background:#22c55e;
  animation: prPulse 2s ease infinite;
}
@keyframes prPulse{
  0%,100%{ opacity:1; transform:scale(1); }
  50%{ opacity:.4; transform:scale(1.5); }
}
.pr-greeting{
  font-family:"Lora", Georgia, serif;
  font-size: clamp(22px, 2.5vw, 32px);
  font-weight:700;
  color:#fff;
  line-height:1.1;
  margin-bottom: 8px;
}
.pr-greeting em{ font-style:italic; color:#e8c97a; }
.pr-hero-sub{
  font-size: 13.5px; font-weight:300; color:#64748b;
  line-height:1.65; max-width:520px; margin-bottom: 18px;
}
.pr-hero-btns{ display:flex; gap:10px; flex-wrap:wrap; }

.pr-btn-gold{
  display:inline-flex; align-items:center; gap:7px;
  padding: 10px 18px;
  font-size:13px; font-weight:500;
  color:#0f172a;
  background:#c9a84c;
  border:none;
  border-radius: 8px;
  cursor:pointer;
  transition: background .2s, transform .2s;
  text-decoration:none;
  white-space:nowrap;
}
.pr-btn-gold:hover{ background:#e8c97a; transform: translateY(-1px); }

.pr-btn-outline{
  display:inline-flex; align-items:center; gap:7px;
  padding: 10px 18px;
  font-size:13px; font-weight:400;
  color: rgba(255,255,255,0.75);
  background: transparent;
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 8px;
  cursor:pointer;
  transition: background .2s, border-color .2s, color .2s;
  white-space:nowrap;
}
.pr-btn-outline:hover{
  background: rgba(255,255,255,0.06);
  color:#fff;
  border-color: rgba(255,255,255,0.28);
}
.pr-btn-outline:disabled, .pr-btn-gold:disabled{
  opacity:.6; cursor:not-allowed;
}

.pr-hero-stat-card{
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.09);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  padding: 18px 20px;
  min-width: 240px;
}
.pr-hero-stat-row{ display:flex; flex-direction:column; gap:10px; }
.pr-hero-stat-item{ display:flex; align-items:center; justify-content:space-between; gap:16px; }
.pr-hero-stat-label{ font-size:12px; font-weight:300; color:#64748b; }
.pr-hero-stat-val{ font-family:"Lora", serif; font-size:18px; font-weight:700; color:#fff; }
.pr-hero-stat-sep{ height:1px; background: rgba(255,255,255,0.06); }

.pr-stats{
  display:grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 18px;
}
@media (max-width: 1199.98px){ .pr-stats{ grid-template-columns: repeat(2, 1fr);} }
@media (max-width: 575.98px){ .pr-stats{ grid-template-columns: 1fr; } }

.pr-stat{
  background: var(--bs-body-bg, #fff);
  border: 1px solid var(--bs-border-color, #ede8e0);
  border-radius: 14px;
  padding: 22px 20px;
  position: relative;
  overflow:hidden;
  transition: box-shadow .25s, transform .25s;
}
.pr-stat:hover{ box-shadow: 0 8px 28px rgba(0,0,0,0.08); transform: translateY(-3px); }
.pr-stat::before{
  content:"";
  position:absolute; top:0; left:0; right:0; height:3px;
  background: var(--sc, #b45309);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform .3s ease;
}
.pr-stat:hover::before{ transform: scaleX(1); }

.pr-stat-head{ display:flex; align-items:flex-start; justify-content:space-between; margin-bottom: 14px; }
.pr-stat-icon{
  width:42px; height:42px; border-radius:10px;
  background: var(--si, #fef3c7);
  color: var(--sc, #b45309);
  display:flex; align-items:center; justify-content:center;
  transition: transform .3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pr-stat:hover .pr-stat-icon{ transform: scale(1.1) rotate(-4deg); }
.pr-stat-label{ font-size:12px; font-weight:400; color:#9a8a7a; margin-bottom:5px; letter-spacing:.03em; }
.pr-stat-val{
  font-family:"Lora", Georgia, serif;
  font-size: 30px;
  font-weight:700;
  color:#1a1a2e;
  line-height:1;
}
.pr-stat-footer{
  display:flex; align-items:center; gap:6px;
  margin-top: 14px; padding-top: 12px;
  border-top: 1px solid rgba(0,0,0,0.06);
  font-size:12px; color:#9a8a7a;
}
.pr-stat-trend{ color:#22c55e; font-weight:500; }

.pr-grid{
  display:grid;
  grid-template-columns: 1fr 360px;
  gap: 20px;
  margin-bottom: 18px;
}
@media (max-width: 991.98px){ .pr-grid{ grid-template-columns: 1fr; } }

.pr-panel{
  background: var(--bs-body-bg, #fff);
  border: 1px solid var(--bs-border-color, #ede8e0);
  border-radius: 14px;
  overflow:hidden;
}
.pr-panel-head{
  display:flex; align-items:center; justify-content:space-between;
  padding: 20px 22px 16px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  gap: 12px;
}
.pr-panel-title-group{ display:flex; align-items:center; gap: 12px; }
.pr-panel-icon{
  width:36px; height:36px; border-radius: 9px;
  display:flex; align-items:center; justify-content:center;
  background: var(--pi, #fef3c7);
  color: var(--pc, #b45309);
  flex-shrink:0;
}
.pr-panel-title{
  font-family:"Lora", serif;
  font-size:16px; font-weight:700;
  color:#1a1a2e; margin:0;
}
.pr-panel-sub{ font-size:11.5px; font-weight:300; color:#9a8a7a; margin:0; }

.pr-table{ width:100%; border-collapse: collapse; }
.pr-table th{
  padding: 10px 16px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #9a8a7a;
  background: #faf8f5;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  text-align:left;
  white-space:nowrap;
}
.pr-table th:last-child{ text-align:right; }
.pr-table td{
  padding: 13px 16px;
  font-size: 13.5px;
  color: #4a4a5a;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  vertical-align: middle;
}
.pr-table tbody tr:last-child td{ border-bottom:none; }
.pr-table tbody tr{ transition: background .15s; }
.pr-table tbody tr:hover{ background:#faf8f5; }

.pr-row-title{
  display:flex; align-items:center; gap:12px;
}
.pr-avatar{
  width: 42px; height: 42px;
  border-radius: 999px;
  background: #fef3c7;
  color: #b45309;
  display:flex; align-items:center; justify-content:center;
  font-weight: 800;
  border: 1px solid rgba(180,83,9,0.18);
  flex-shrink:0;
}
.pr-name{ font-weight:600; color:#1a1a2e; line-height:1.1; }
.pr-subtle{ color:#9a8a7a; font-size: 12.5px; }

.pr-actions{
  display:grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 22px;
}
@media (max-width: 991.98px){ .pr-actions{ grid-template-columns: repeat(2, 1fr);} }
@media (max-width: 575.98px){ .pr-actions{ grid-template-columns: 1fr 1fr; } }

.pr-action{
  background: var(--bs-body-bg, #fff);
  border: 1px solid var(--bs-border-color, #ede8e0);
  border-radius: 14px;
  padding: 20px 18px;
  cursor:pointer;
  display:flex;
  flex-direction:column;
  gap:10px;
  transition: box-shadow .25s, transform .25s, border-color .25s;
  text-decoration:none;
  color: inherit;
}
.pr-action:hover{
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  transform: translateY(-4px);
  border-color: var(--ac-border, #fde68a);
}
.pr-action-icon{
  width:46px; height:46px; border-radius: 12px;
  background: var(--ac-bg, #fef3c7);
  color: var(--ac-color, #b45309);
  display:flex; align-items:center; justify-content:center;
  transition: transform .3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pr-action:hover .pr-action-icon{ transform: scale(1.1) rotate(-5deg); }
.pr-action-label{ font-size: 13.5px; font-weight: 600; color:#1a1a2e; }
.pr-action-desc{ font-size: 11.5px; font-weight: 300; color:#9a8a7a; }

.pr-pagination{
  display:flex; align-items:center; justify-content:space-between;
  padding: 14px 18px;
  flex-wrap:wrap;
  gap:10px;
  border-top: 1px solid rgba(0,0,0,0.06);
}
.pr-page-info{ font-size: 12px; font-weight: 300; color:#9a8a7a; }
.pr-page-btns{ display:flex; align-items:center; gap: 6px; }
.pr-page-btn{
  display:inline-flex; align-items:center; gap: 6px;
  padding: 6px 12px;
  font-size: 12.5px;
  font-weight: 400;
  color:#7a6a5a;
  background:#f5f1eb;
  border: 1px solid #e5ddd3;
  border-radius: 7px;
  cursor:pointer;
  transition: background .2s, color .2s;
}
.pr-page-btn:hover:not(:disabled){ background:#ede8e0; color:#1a1a2e; }
.pr-page-btn:disabled{ opacity:.45; cursor:not-allowed; }
.pr-page-current{ padding: 6px 12px; font-size: 12px; color:#9a8a7a; }

.pr-toolbar{
  padding: 14px 16px;
  display:flex;
  flex-wrap:wrap;
  gap: 10px;
  align-items:center;
  justify-content:space-between;
}
.pr-input{
  display:flex;
  align-items:center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 10px;
  background:#fff;
  border: 1px solid #ede8e0;
  min-width: 320px;
}
.pr-input input{
  border:none;
  outline:none;
  width: 100%;
  font-size: 13px;
  color:#1a1a2e;
}
.pr-clear{
  border:none;
  background: transparent;
  color:#9a8a7a;
  cursor:pointer;
  padding: 2px 4px;
}
.pr-clear:hover{ color:#1a1a2e; }

.pr-refresh{
  display:inline-flex; align-items:center; gap: 7px;
  padding: 9px 14px;
  font-size: 12.5px;
  font-weight: 400;
  color:#7a6a5a;
  background:#f5f1eb;
  border: 1px solid #e5ddd3;
  border-radius: 10px;
  cursor:pointer;
}
.pr-refresh:hover{ background:#ede8e0; }
.pr-refresh:disabled{ opacity:.55; cursor:not-allowed; }

.pr-mini-btn{
  display:inline-flex; align-items:center; gap: 7px;
  padding: 8px 12px;
  font-size: 12.5px;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.08);
  background: #fff;
  color:#1a1a2e;
  cursor:pointer;
}
.pr-mini-btn:hover{ background:#faf8f5; }
.pr-mini-btn--danger{ color:#9a3412; border-color: rgba(154,52,18,0.18); }
.pr-mini-btn--danger:hover{ background:#fff7ed; }
.pr-mini-btn:disabled{ opacity:.6; cursor:not-allowed; }

/* Modal shell */
.pr-overlay{
  position:fixed; inset:0;
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(7px);
  display:flex; align-items:center; justify-content:center;
  z-index: 1400;
}
.pr-modal{
  width: min(1100px, 96vw);
  max-height: 92vh;
  border-radius: 18px;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 20px 50px rgba(0,0,0,0.22);
}
.pr-modal--md{ width: min(900px, 96vw); }
.pr-modal-head{
  background:#0f172a;
  position:relative;
  padding: 18px 20px;
  overflow:hidden;
}
.pr-modal-head::before{
  content:"";
  position:absolute;
  inset:0;
  background-image: radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px);
  background-size:24px 24px;
  pointer-events:none;
}
.pr-modal-head-inner{
  position:relative; z-index:1;
  display:flex; align-items:flex-start; justify-content:space-between;
  gap: 12px;
}
.pr-modal-title{
  display:flex; align-items:center; gap: 12px;
  color:#fff;
}
.pr-modal-title h5{
  margin:0;
  font-family:"Lora", serif;
  font-weight:700;
}
.pr-modal-title p{
  margin:0;
  font-size: 12.5px;
  font-weight: 300;
  color:#64748b;
}
.pr-modal-body{
  background:#f5f1eb;
  padding: 16px 16px 18px;
  overflow:auto;
  max-height: calc(92vh - 150px);
}
.pr-modal-foot{
  padding: 12px 16px;
  border-top: 1px solid rgba(0,0,0,0.06);
  background:#fff;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.pr-tabs{
  display:flex; flex-wrap:wrap; gap: 8px;
  margin-top: 12px;
}
.pr-tab{
  display:inline-flex; align-items:center; gap: 7px;
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  border: 1px solid rgba(255,255,255,0.18);
  background: transparent;
  color: rgba(255,255,255,0.85);
  cursor: pointer;
}
.pr-tab:hover{ background: rgba(255,255,255,0.06); color:#fff; }
.pr-tab--active{
  background: rgba(201,168,76,0.12);
  border-color: rgba(201,168,76,0.22);
  color:#e8c97a;
}

/* Inside modal content cards */
.pr-card{
  background:#fff;
  border: 1px solid #ede8e0;
  border-radius: 14px;
  overflow:hidden;
}
.pr-card-pad{ padding: 16px; }
.pr-form-grid{
  display:grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
@media (max-width: 991.98px){ .pr-form-grid{ grid-template-columns: repeat(2,1fr); } }
@media (max-width: 575.98px){ .pr-form-grid{ grid-template-columns: 1fr; } }

.pr-field label{
  display:block;
  font-size: 12px;
  color:#9a8a7a;
  font-weight: 500;
  margin-bottom: 6px;
  letter-spacing: .02em;
}
.pr-field input{
  width: 100%;
  border: 1px solid #ede8e0;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  outline: none;
}
.pr-field input:focus{
  border-color: rgba(201,168,76,0.55);
  box-shadow: 0 0 0 3px rgba(201,168,76,0.16);
}

.pr-info-grid{
  display:grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
@media (max-width: 991.98px){ .pr-info-grid{ grid-template-columns: repeat(2, 1fr);} }
@media (max-width: 575.98px){ .pr-info-grid{ grid-template-columns: 1fr;} }

.pr-info-label{
  font-size: 12px;
  color:#9a8a7a;
  display:flex;
  align-items:center;
  gap: 8px;
  margin-bottom: 6px;
}
.pr-info-ico{
  width: 28px; height: 28px;
  border-radius: 9px;
  background:#faf8f5;
  border: 1px solid rgba(0,0,0,0.06);
  display:flex; align-items:center; justify-content:center;
  color:#7a6a5a;
  flex-shrink:0;
}
.pr-info-val{
  font-size: 13.5px;
  font-weight: 600;
  color:#1a1a2e;
}

.pr-pill{
  display:inline-flex; align-items:center; justify-content:center;
  font-size: 12.5px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid rgba(0,0,0,0.06);
  background:#faf8f5;
  color:#7a6a5a;
  width: fit-content;
}
.pr-pill--gold{ background:#fef3c7; border-color: rgba(180,83,9,0.18); color:#b45309; }
.pr-pill--blue{ background:#dbeafe; border-color: rgba(30,64,175,0.18); color:#1e40af; }
.pr-pill--green{ background:#d1fae5; border-color: rgba(6,95,70,0.18); color:#065f46; }
.pr-pill--purple{ background:#ede9fe; border-color: rgba(124,58,237,0.18); color:#7c3aed; }
.pr-pill--gray{ background:#f1f5f9; border-color: rgba(71,85,105,0.16); color:#475569; }

.pr-alert{
  display:flex; align-items:flex-start; gap:10px;
  background:#fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 10px;
  padding: 11px 12px;
  font-size: 13px;
  color:#9a3412;
  margin-bottom: 12px;
}

.pr-kbd{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

/* Spin */
@keyframes prSpin{ to { transform: rotate(360deg); } }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Parents" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto pr-main">
            {anyBusy && (
              <Loader
                message={
                  creatingParent
                    ? "Creating parent..."
                    : savingParent
                    ? "Saving parent..."
                    : assigning
                    ? "Assigning students..."
                    : "Loading parents..."
                }
              />
            )}

            {/* ================= HERO ================= */}
            <div className="pr-hero">
              <div className="pr-hero-glow" aria-hidden="true" />
              <div className="pr-hero-glow2" aria-hidden="true" />

              <div className="pr-hero-inner">
                <div>
                  <div className="pr-session-badge">
                    <span className="pr-session-dot" />
                    Parents Registry
                  </div>

                  <h1 className="pr-greeting">
                    {getGreeting()}, <em>Admin.</em>
                  </h1>

                  <p className="pr-hero-sub">
                    Search parents, open profiles, edit details, manage default passwords, and assign children by selecting class(es).
                  </p>

                  <div className="pr-hero-btns">
                    <button className="pr-btn-gold" onClick={openAddParentModal} disabled={anyBusy}>
                      {I.plus} Add Parent
                    </button>

                    <button className="pr-btn-outline" onClick={fetchAllParents} disabled={loading}>
                      <span style={{ display: "inline-flex", alignItems: "center", ...(loading ? { animation: "prSpin .8s linear infinite" } : {}) }}>
                        {I.refresh}
                      </span>
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Hero mini stat */}
                <div className="pr-hero-stat-card d-none d-md-block">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a84c" }}>
                      Quick glance
                    </span>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M2 10V6M5 10V4M8 10V7M11 10V3" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div className="pr-hero-stat-row">
                    <div className="pr-hero-stat-item">
                      <span className="pr-hero-stat-label">On this page</span>
                      <span className="pr-hero-stat-val">{totalParentsOnPage}</span>
                    </div>
                    <div className="pr-hero-stat-sep" />
                    <div className="pr-hero-stat-item">
                      <span className="pr-hero-stat-label">With email</span>
                      <span className="pr-hero-stat-val">{parentsWithEmailCount}</span>
                    </div>
                    <div className="pr-hero-stat-sep" />
                    <div className="pr-hero-stat-item">
                      <span className="pr-hero-stat-label">With phone</span>
                      <span className="pr-hero-stat-val">{parentsWithPhoneCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= KPI CARDS (template-style) ================= */}
            <div className="pr-stats">
              {[
                { title: "Parents (Page)", value: totalParentsOnPage, color: "#b45309", bg: "#fef3c7", icon: I.people, label: "loaded in view" },
                { title: "With Email", value: parentsWithEmailCount, color: "#1e40af", bg: "#dbeafe", icon: I.mail, label: "contactable" },
                { title: "With Phone", value: parentsWithPhoneCount, color: "#065f46", bg: "#d1fae5", icon: I.phone, label: "reachable" },
                { title: "Children (Open Profile)", value: childrenCountInProfile, color: "#7c3aed", bg: "#ede9fe", icon: I.child, label: "in selected profile" },
              ].map((c) => (
                <div key={c.title} className="pr-stat" style={{ ["--sc" as any]: c.color, ["--si" as any]: c.bg }}>
                  <div className="pr-stat-head">
                    <div className="pr-stat-icon">{c.icon}</div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: "#c8bfb5" }}>
                      <circle cx="4" cy="8" r="1.2" fill="currentColor" />
                      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
                      <circle cx="12" cy="8" r="1.2" fill="currentColor" />
                    </svg>
                  </div>
                  <p className="pr-stat-label">{c.title}</p>
                  <div className="pr-stat-val">{c.value}</div>
                  <div className="pr-stat-footer">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 9l3-4 2 2 3-5" stroke="#22c55e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="pr-stat-trend">+</span>
                    <span>{c.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ================= QUICK ACTIONS ================= */}
            <div className="pr-actions">
              {[
                { label: "Add Parent", desc: "Create a parent account", color: "#b45309", bg: "#fef3c7", onClick: openAddParentModal, icon: I.plus },
                { label: "Refresh List", desc: "Reload parents data", color: "#1e40af", bg: "#dbeafe", onClick: fetchAllParents, icon: I.refresh },
                { label: "Clear Search", desc: "Reset filters", color: "#065f46", bg: "#d1fae5", onClick: () => { setSearch(""); setPage(1); }, icon: I.search },
                { label: "Help Tip", desc: "Assign children from profile", color: "#7c3aed", bg: "#ede9fe", onClick: () => showSuccess("Tip: Open a parent → Assign Child → select class(es) → load students → assign."), icon: I.shield },
              ].map((a) => (
                <a
                  key={a.label}
                  href="#"
                  className="pr-action"
                  style={{ ["--ac-color" as any]: a.color, ["--ac-bg" as any]: a.bg, ["--ac-border" as any]: a.bg }}
                  onClick={(e) => {
                    e.preventDefault();
                    a.onClick();
                  }}
                >
                  <div className="pr-action-icon">{a.icon}</div>
                  <div>
                    <div className="pr-action-label">{a.label}</div>
                    <div className="pr-action-desc">{a.desc}</div>
                  </div>
                </a>
              ))}
            </div>

            {/* ================= MAIN GRID ================= */}
            <div className="pr-grid">
              {/* Directory */}
              <div className="pr-panel">
                <div className="pr-panel-head">
                  <div className="pr-panel-title-group">
                    <div className="pr-panel-icon" style={{ ["--pi" as any]: "#fef3c7", ["--pc" as any]: "#b45309" }}>
                      {I.people}
                    </div>
                    <div>
                      <p className="pr-panel-title">Parent Directory</p>
                      <p className="pr-panel-sub">Search by name, email or phone • Click “View” to open profile</p>
                    </div>
                  </div>

                  <div className="pr-toolbar" style={{ padding: 0 }}>
                    <div className="pr-input">
                      <span style={{ color: "#9a8a7a" }}>{I.search}</span>
                      <input
                        placeholder="Search (e.g. Grace, parent@email.com)"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                      />
                      {!!search.trim() && (
                        <button
                          className="pr-clear"
                          type="button"
                          title="Clear"
                          onClick={() => {
                            setSearch("");
                            setPage(1);
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <button className="pr-refresh" onClick={fetchAllParents} disabled={loading}>
                      <span style={{ display: "inline-flex", alignItems: "center", ...(loading ? { animation: "prSpin .8s linear infinite" } : {}) }}>
                        {I.refresh}
                      </span>
                      Refresh
                    </button>

                    <button className="pr-btn-gold" onClick={openAddParentModal} disabled={anyBusy}>
                      {I.plus} Add Parent
                    </button>
                  </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table className="pr-table">
                    <thead>
                      <tr>
                        <th style={{ width: 460 }}>Parent</th>
                        <th style={{ width: 300 }}>Email</th>
                        <th style={{ width: 220 }}>Phone</th>
                        <th style={{ width: 260, textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={4} style={{ padding: "44px 16px", textAlign: "center", color: "#9a8a7a" }}>
                            Loading parents…
                          </td>
                        </tr>
                      ) : parents.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: "44px 16px", textAlign: "center", color: "#9a8a7a" }}>
                            No parents found. Try a different search or add a new parent.
                          </td>
                        </tr>
                      ) : (
                        parents.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <div className="pr-row-title">
                                <div className="pr-avatar">{initials(p)}</div>
                                <div>
                                  <div className="pr-name">{fullName(p)}</div>
                                  <div className="pr-subtle">ID: {p.id}</div>
                                </div>
                              </div>
                            </td>

                            <td style={{ color: "#9a8a7a" }}>{p.email || "—"}</td>
                            <td style={{ color: "#9a8a7a" }}>{p.phone || "—"}</td>

                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                <button className="pr-mini-btn" onClick={() => openParent(p)}>
                                  {I.eye} View
                                </button>

                                <button className="pr-mini-btn pr-mini-btn--danger" onClick={() => deleteParent(p)}>
                                  {I.trash} Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pr-pagination">
                  <span className="pr-page-info">
                    Page <b>{page}</b> of <b>{totalPages}</b>
                  </span>

                  <div className="pr-page-btns">
                    <button className="pr-page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Previous
                    </button>

                    <span className="pr-page-current">
                      {parents.length} shown • {allParents.length} total
                    </span>

                    <button className="pr-page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                      Next
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Side panel: Guidance */}
              <div className="pr-panel" style={{ display: "flex", flexDirection: "column" }}>
                <div className="pr-panel-head">
                  <div className="pr-panel-title-group">
                    <div className="pr-panel-icon" style={{ ["--pi" as any]: "#d1fae5", ["--pc" as any]: "#065f46" }}>
                      {I.shield}
                    </div>
                    <div>
                      <p className="pr-panel-title">Operational Notes</p>
                      <p className="pr-panel-sub">How assignment & security behave</p>
                    </div>
                  </div>
                </div>

                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="pr-alert" style={{ marginBottom: 0 }}>
                    <span style={{ flexShrink: 0 }}>{I.shield}</span>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>One student → one parent</div>
                      Students already assigned to another parent are locked in the assign modal, and an error toast shows the parent name.
                    </div>
                  </div>

                  <div className="pr-card">
                    <div className="pr-card-pad">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{ fontWeight: 800, color: "#1a1a2e" }}>Quick Tips</div>
                        <span className="pr-pill pr-pill--gold">Workflow</span>
                      </div>
                      <ol style={{ margin: 0, paddingLeft: 18, color: "#7a6a5a", fontSize: 13.5, lineHeight: 1.7 }}>
                        <li>Click <b>View</b> on a parent.</li>
                        <li>Use <b>Assign Child</b> in the profile header.</li>
                        <li>Select class(es) → <b>Load Students</b> → <b>Assign Selected</b>.</li>
                      </ol>
                    </div>
                  </div>

                  <div className="pr-card">
                    <div className="pr-card-pad">
                      <div style={{ fontWeight: 800, color: "#1a1a2e", marginBottom: 8 }}>Security</div>
                      <div style={{ color: "#7a6a5a", fontSize: 13.5, lineHeight: 1.7 }}>
                        Default passwords are shown in the <b>Security</b> tab, with <b>show/hide</b> and <b>copy</b> controls.
                        Consider rotating passwords after first login.
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: "auto" }}>
                    <Footer />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* ================= ADD PARENT MODAL ================= */}
      {showAddModal && (
        <div className="pr-overlay" onMouseDown={closeAddParentModal}>
          <div className="pr-modal pr-modal--md" onMouseDown={(e) => e.stopPropagation()}>
            <div className="pr-modal-head">
              <div className="pr-modal-head-inner">
                <div className="pr-modal-title">
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#e8c97a",
                    }}
                  >
                    {I.plus}
                  </div>
                  <div>
                    <h5>Add Parent</h5>
                    <p>Create a parent account — password is auto-generated.</p>
                  </div>
                </div>

                <button className="pr-btn-outline" onClick={closeAddParentModal} disabled={creatingParent}>
                  ✕ Close
                </button>
              </div>
            </div>

            <div className="pr-modal-body">
              <div className="pr-card">
                <div className="pr-card-pad">
                  <div className="pr-form-grid">
                    <div className="pr-field">
                      <label>First Name *</label>
                      <input value={newParent.firstname} onChange={(e) => setNewParent({ ...newParent, firstname: e.target.value })} />
                    </div>

                    <div className="pr-field">
                      <label>Surname *</label>
                      <input value={newParent.surname} onChange={(e) => setNewParent({ ...newParent, surname: e.target.value })} />
                    </div>

                    <div className="pr-field">
                      <label>Email *</label>
                      <input type="email" value={newParent.email} onChange={(e) => setNewParent({ ...newParent, email: e.target.value })} />
                    </div>

                    <div className="pr-field">
                      <label>Phone *</label>
                      <input value={newParent.phone} onChange={(e) => setNewParent({ ...newParent, phone: e.target.value })} />
                    </div>

                    <div className="pr-field" style={{ gridColumn: "1 / -1" }}>
                      <label>Address (optional)</label>
                      <input value={newParent.address} onChange={(e) => setNewParent({ ...newParent, address: e.target.value })} />
                    </div>
                  </div>

                  {generatedPassword ? (
                    <div style={{ marginTop: 14 }}>
                      <div className="pr-alert" style={{ background: "#d1fae5", borderColor: "rgba(6,95,70,0.18)", color: "#065f46", marginBottom: 0 }}>
                        <span style={{ flexShrink: 0 }}>{I.key}</span>
                        <div style={{ width: "100%" }}>
                          <div style={{ fontWeight: 800, marginBottom: 4 }}>Generated Password</div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                            <span className="pr-kbd">{generatedPassword}</span>
                            <button className="pr-mini-btn" onClick={() => copyToClipboard(generatedPassword)}>
                              Copy
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="pr-modal-foot">
              <small style={{ color: "#9a8a7a" }}>Tip: After creation, open profile → Security tab to view default password.</small>

              <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
                <button className="pr-mini-btn" onClick={closeAddParentModal} disabled={creatingParent}>
                  Cancel
                </button>

                <button className="pr-btn-gold" onClick={createParent} disabled={creatingParent}>
                  {creatingParent ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      {I.plus} Create Parent
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= PROFILE MODAL ================= */}
      {selectedParent && (
        <div className="pr-overlay" style={{ zIndex: 1500 }} onMouseDown={closeParentModal}>
          <div className="pr-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="pr-modal-head">
              <div className="pr-modal-head-inner">
                <div className="pr-modal-title">
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#e8c97a",
                      fontWeight: 900,
                    }}
                  >
                    {initials(parentDetails?.parent || selectedParent)}
                  </div>
                  <div>
                    <h5>{parentDetails?.parent ? fullName(parentDetails.parent) : fullName(selectedParent)}</h5>
                    <p>
                      {parentDetails?.parent?.email ?? selectedParent.email ?? "—"} • {parentDetails?.parent?.phone ?? selectedParent.phone ?? "—"}
                    </p>
                  </div>
                </div>

                <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {!loadingProfile && (
                    <>
                      {!isEditMode ? (
                        <>
                          <button className="pr-btn-gold" onClick={openAssignModal}>
                            {I.plus} Assign Child
                          </button>
                          <button className="pr-btn-outline" onClick={enableEditMode}>
                            ✎ Edit
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="pr-btn-gold" onClick={saveParent} disabled={savingParent}>
                            {savingParent ? "Saving…" : "Save"}
                          </button>
                          <button className="pr-btn-outline" onClick={cancelEditMode} disabled={savingParent}>
                            Cancel
                          </button>
                        </>
                      )}
                    </>
                  )}

                  <button className="pr-btn-outline" onClick={closeParentModal}>
                    ✕ Close
                  </button>
                </div>
              </div>

              <div className="pr-tabs">
                <button
                  className={`pr-tab ${activeTab === "overview" ? "pr-tab--active" : ""}`}
                  onClick={() => setActiveTab("overview")}
                  disabled={loadingProfile}
                >
                  ▦ Overview
                </button>
                <button
                  className={`pr-tab ${activeTab === "children" ? "pr-tab--active" : ""}`}
                  onClick={() => setActiveTab("children")}
                  disabled={loadingProfile}
                >
                  👥 Children
                </button>
                <button
                  className={`pr-tab ${activeTab === "security" ? "pr-tab--active" : ""}`}
                  onClick={() => setActiveTab("security")}
                  disabled={loadingProfile}
                >
                  🔒 Security
                </button>
              </div>
            </div>

            <div className="pr-modal-body">
              {loadingProfile ? (
                <div style={{ padding: 30, textAlign: "center", color: "#9a8a7a" }}>Loading parent details…</div>
              ) : !parentDetails?.parent ? (
                <div className="pr-alert">
                  <span style={{ flexShrink: 0 }}>⚠</span>
                  No parent details available.
                </div>
              ) : (
                <>
                  {activeTab === "overview" && (
                    <div className="pr-card">
                      <div className="pr-card-pad">
                        {isEditMode ? (
                          <div className="pr-form-grid">
                            <div className="pr-field">
                              <label>First Name *</label>
                              <input value={editedParent.firstname} onChange={(e) => setEditedParent({ ...editedParent, firstname: e.target.value })} />
                            </div>
                            <div className="pr-field">
                              <label>Surname *</label>
                              <input value={editedParent.surname} onChange={(e) => setEditedParent({ ...editedParent, surname: e.target.value })} />
                            </div>
                            <div className="pr-field">
                              <label>Email *</label>
                              <input type="email" value={editedParent.email} onChange={(e) => setEditedParent({ ...editedParent, email: e.target.value })} />
                            </div>
                            <div className="pr-field">
                              <label>Phone *</label>
                              <input value={editedParent.phone} onChange={(e) => setEditedParent({ ...editedParent, phone: e.target.value })} />
                            </div>
                            <div className="pr-field" style={{ gridColumn: "1 / -1" }}>
                              <label>Address</label>
                              <input value={editedParent.address} onChange={(e) => setEditedParent({ ...editedParent, address: e.target.value })} />
                            </div>
                            <div className="pr-field" style={{ gridColumn: "1 / -1" }}>
                              <label>New Password (optional)</label>
                              <input
                                className="pr-kbd"
                                value={editedParent.password}
                                onChange={(e) => setEditedParent({ ...editedParent, password: e.target.value })}
                                placeholder="Leave empty to keep current"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="pr-info-grid">
                            <InfoItem label="Full Name" value={fullName(parentDetails.parent)} icon={I.people} />
                            <InfoItem label="Email" value={parentDetails.parent.email || null} icon={I.mail} />
                            <InfoItem label="Phone" value={parentDetails.parent.phone || null} icon={I.phone} />
                            <InfoItem label="Address" value={parentDetails.parent.address || null} icon={<span>📍</span>} />
                            <BadgeItem label="Children Linked" value={String(parentDetails.children?.length ?? 0)} tone="blue" icon={I.child} />
                            <BadgeItem label="Account Role" value="Parent" tone="gray" icon={<span>👤</span>} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === "children" && (
                    <div className="pr-card">
                      <div className="pr-card-pad" style={{ padding: 0 }}>
                        <div className="pr-panel-head" style={{ border: "none", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                          <div className="pr-panel-title-group">
                            <div className="pr-panel-icon" style={{ ["--pi" as any]: "#ede9fe", ["--pc" as any]: "#7c3aed" }}>
                              {I.child}
                            </div>
                            <div>
                              <p className="pr-panel-title">Linked Children</p>
                              <p className="pr-panel-sub">Remove or assign students</p>
                            </div>
                          </div>

                          <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
                            <button className="pr-mini-btn" onClick={openAssignModal}>
                              {I.plus} Assign
                            </button>
                            <button className="pr-mini-btn pr-mini-btn--danger" onClick={() => deleteParent(parentDetails.parent)}>
                              {I.trash} Delete Parent
                            </button>
                          </div>
                        </div>

                        <div style={{ overflowX: "auto" }}>
                          <table className="pr-table">
                            <thead>
                              <tr>
                                <th style={{ width: 70 }}>#</th>
                                <th>Student</th>
                                <th style={{ width: 220 }}>Reg No</th>
                                <th style={{ width: 240 }}>Class</th>
                                <th style={{ width: 180, textAlign: "right" }}>Action</th>
                              </tr>
                            </thead>

                            <tbody>
                              {(parentDetails.children ?? []).length === 0 ? (
                                <tr>
                                  <td colSpan={5} style={{ padding: "44px 16px", textAlign: "center", color: "#9a8a7a" }}>
                                    No students linked. Click “Assign” to add children to this parent.
                                  </td>
                                </tr>
                              ) : (
                                parentDetails.children.map((c, idx) => (
                                  <tr key={c.id}>
                                    <td style={{ color: "#9a8a7a" }}>{idx + 1}</td>
                                    <td>
                                      <div className="pr-name">{fullName(c)}</div>
                                      <div className="pr-subtle">ID: {c.id}</div>
                                    </td>
                                    <td>
                                      <span className="pr-pill pr-pill--blue">{c.reg_no || "—"}</span>
                                    </td>
                                    <td>
                                      <span className="pr-pill pr-pill--gold">{c.level?.name || "—"}</span>
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                      <button className="pr-mini-btn pr-mini-btn--danger" onClick={() => removeChild(c.id)}>
                                        Remove
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "security" && (
                    <div className="pr-card">
                      <div className="pr-card-pad">
                        <div className="pr-info-grid">
                          <InfoItem label="Email" value={parentDetails.parent?.email || "—"} icon={I.mail} />
                          <InfoItem label="Phone" value={parentDetails.parent?.phone || "—"} icon={I.phone} />

                          <div className="pr-info" style={{ gridColumn: "1 / -1" }}>
                            <div className="pr-info-label">
                              <span className="pr-info-ico">{I.key}</span>
                              Default Password
                            </div>

                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                              <input
                                type={passwordVisible ? "text" : "password"}
                                value={
                                  passwordVisible
                                    ? parentDetails.parent?.default_password || "N/A"
                                    : parentDetails.parent?.default_password
                                    ? "••••••••••"
                                    : "N/A"
                                }
                                readOnly
                                className="pr-kbd"
                                style={{
                                  flex: "1 1 320px",
                                  border: "1px solid #ede8e0",
                                  borderRadius: 10,
                                  padding: "10px 12px",
                                  fontSize: 13,
                                }}
                              />

                              <button
                                className="pr-mini-btn"
                                onClick={() => setPasswordVisible((v) => !v)}
                                disabled={!parentDetails.parent?.default_password || parentDetails.parent?.default_password === "N/A"}
                                title={passwordVisible ? "Hide" : "Show"}
                              >
                                {passwordVisible ? "Hide" : "Show"}
                              </button>

                              <button
                                className="pr-mini-btn"
                                onClick={() => {
                                  const pwd = parentDetails.parent?.default_password || "";
                                  if (!pwd || pwd === "N/A") return showError("No password to copy");
                                  copyToClipboard(pwd);
                                }}
                                disabled={!parentDetails.parent?.default_password || parentDetails.parent?.default_password === "N/A"}
                                title="Copy"
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: 12, color: "#9a8a7a", fontSize: 12.5 }}>
                          Tip: Encourage parents to change their password after first login.
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="pr-modal-foot">
              <small style={{ color: "#9a8a7a" }}>Tip: Assign children by selecting classes in the Assign modal.</small>
              <button className="pr-mini-btn" onClick={closeParentModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ASSIGN MODAL (Dynamic Classes) ================= */}
      {showAssignModal && selectedParent && (
        <div className="pr-overlay" style={{ zIndex: 1600 }} onMouseDown={closeAssignModal}>
          <div className="pr-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="pr-modal-head">
              <div className="pr-modal-head-inner">
                <div className="pr-modal-title">
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#e8c97a",
                    }}
                  >
                    {I.child}
                  </div>
                  <div>
                    <h5>Assign Children</h5>
                    <p>
                      Parent: <b style={{ color: "#e8c97a" }}>{fullName(selectedParent)}</b> • Select class(es) → load students → assign.
                    </p>
                  </div>
                </div>

                <button className="pr-btn-outline" onClick={closeAssignModal} disabled={assigning || studentsLoading || classesLoading}>
                  ✕ Close
                </button>
              </div>
            </div>

            <div className="pr-modal-body">
              <div className="pr-grid" style={{ gridTemplateColumns: "380px 1fr", marginBottom: 0 }}>
                {/* Classes */}
                <div className="pr-panel">
                  <div className="pr-panel-head">
                    <div className="pr-panel-title-group">
                      <div className="pr-panel-icon" style={{ ["--pi" as any]: "#dbeafe", ["--pc" as any]: "#1e40af" }}>
                        <span>🏫</span>
                      </div>
                      <div>
                        <p className="pr-panel-title">Classes</p>
                        <p className="pr-panel-sub">Loaded from student_classes</p>
                      </div>
                    </div>

                    <span className="pr-pill pr-pill--blue">Selected: {selectedClassIds.length}</span>
                  </div>

                  <div style={{ padding: 14 }}>
                    <div className="pr-input" style={{ minWidth: "unset" }}>
                      <span style={{ color: "#9a8a7a" }}>{I.search}</span>
                      <input placeholder="Search class..." value={classSearch} onChange={(e) => setClassSearch(e.target.value)} />
                    </div>

                    <div style={{ marginTop: 10, maxHeight: 320, overflow: "auto", background: "#fff", borderRadius: 12, border: "1px solid #ede8e0", padding: 8 }}>
                      {classesLoading ? (
                        <div style={{ padding: 14, textAlign: "center", color: "#9a8a7a" }}>Loading classes…</div>
                      ) : filteredClasses.length === 0 ? (
                        <div style={{ padding: 14, textAlign: "center", color: "#9a8a7a" }}>No classes found</div>
                      ) : (
                        filteredClasses.map((c) => {
                          const checked = selectedClassIds.includes(c.id);
                          return (
                            <label
                              key={c.id}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                gap: 10,
                                padding: 10,
                                borderRadius: 10,
                                cursor: "pointer",
                                background: checked ? "#faf8f5" : "transparent",
                                border: checked ? "1px solid rgba(201,168,76,0.25)" : "1px solid transparent",
                              }}
                            >
                              <div style={{ display: "flex", gap: 10 }}>
                                <input type="checkbox" checked={checked} onChange={() => toggleClass(c.id)} style={{ marginTop: 3 }} />
                                <div>
                                  <div style={{ fontWeight: 700, color: "#1a1a2e" }}>{c.name}</div>
                                  {c.description ? <div style={{ color: "#9a8a7a", fontSize: 12.5 }}>{c.description}</div> : null}
                                </div>
                              </div>

                              <span className="pr-pill pr-pill--gray" style={{ flexShrink: 0 }}>
                                ID: {c.id}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>

                    <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                      <button
                        className="pr-mini-btn"
                        style={{ justifyContent: "center", fontWeight: 800 }}
                        onClick={loadStudentsBySelectedClasses}
                        disabled={studentsLoading || !selectedClassIds.length}
                      >
                        {studentsLoading ? "Loading students…" : "Load Students"}
                      </button>

                      <button className="pr-mini-btn" style={{ justifyContent: "center" }} onClick={() => setSelectedClassIds([])} disabled={!selectedClassIds.length}>
                        Clear class selection
                      </button>
                    </div>
                  </div>
                </div>

                {/* Students */}
                <div className="pr-panel">
                  <div className="pr-panel-head">
                    <div className="pr-panel-title-group">
                      <div className="pr-panel-icon" style={{ ["--pi" as any]: "#d1fae5", ["--pc" as any]: "#065f46" }}>
                        {I.child}
                      </div>
                      <div>
                        <p className="pr-panel-title">Students</p>
                        <p className="pr-panel-sub">Locked if assigned to another parent</p>
                      </div>
                    </div>

                    <span className="pr-pill pr-pill--green">Selected: {selectedStudentIds.length}</span>
                  </div>

                  <div style={{ padding: 14 }}>
                    <div className="pr-input" style={{ minWidth: "unset" }}>
                      <span style={{ color: "#9a8a7a" }}>{I.search}</span>
                      <input placeholder="Search students (name, reg no)..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                    </div>

                    <div style={{ marginTop: 10, maxHeight: 380, overflow: "auto", borderRadius: 12, border: "1px solid #ede8e0", background: "#fff" }}>
                      <table className="pr-table">
                        <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                          <tr>
                            <th style={{ width: 58 }} />
                            <th>Student</th>
                            <th style={{ width: 220 }}>Reg No</th>
                            <th style={{ width: 240 }}>Class</th>
                          </tr>
                        </thead>

                        <tbody>
                          {filteredStudents.length === 0 ? (
                            <tr>
                              <td colSpan={4} style={{ padding: "44px 16px", textAlign: "center", color: "#9a8a7a" }}>
                                <div style={{ fontWeight: 800, color: "#1a1a2e" }}>
                                  {students.length === 0 ? "No students loaded" : "No matches"}
                                </div>
                                <div style={{ marginTop: 6 }}>
                                  {students.length === 0 ? "Select class(es) and click “Load Students”." : "Try a different keyword."}
                                </div>
                              </td>
                            </tr>
                          ) : (
                            filteredStudents.map((s) => {
                              const assignedToOther = !!s.assigned_parent_id && s.assigned_parent_id !== selectedParent.id;
                              const assignedToThis = !!s.assigned_parent_id && s.assigned_parent_id === selectedParent.id;
                              const checked = selectedStudentIds.includes(s.id) || assignedToThis;

                              return (
                                <tr
                                  key={s.id}
                                  style={{
                                    cursor: assignedToOther ? "not-allowed" : "pointer",
                                    opacity: assignedToOther ? 0.6 : 1,
                                  }}
                                  onClick={() => toggleStudent(s)}
                                >
                                  <td>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={assignedToOther}
                                      onChange={() => toggleStudent(s)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </td>

                                  <td>
                                    <div style={{ fontWeight: 800, color: "#1a1a2e" }}>{fullName(s)}</div>
                                    <div className="pr-subtle">ID: {s.id}</div>

                                    {assignedToOther ? (
                                      <div style={{ marginTop: 6 }}>
                                        <span className="pr-pill pr-pill--gray" style={{ background: "#fff7ed", color: "#9a3412", borderColor: "rgba(154,52,18,0.16)" }}>
                                          Assigned to{" "}
                                          {`${s.assigned_parent_firstname || ""} ${s.assigned_parent_surname || ""}`.trim() || "another parent"}
                                        </span>
                                      </div>
                                    ) : assignedToThis ? (
                                      <div style={{ marginTop: 6 }}>
                                        <span className="pr-pill pr-pill--green">Already assigned to this parent</span>
                                      </div>
                                    ) : null}
                                  </td>

                                  <td>
                                    <span className="pr-pill pr-pill--blue">{s.reg_no || "—"}</span>
                                  </td>

                                  <td>
                                    <span className="pr-pill pr-pill--gold">{s.level?.name || "—"}</span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                      <button className="pr-mini-btn" onClick={() => setSelectedStudentIds([])} disabled={!selectedStudentIds.length}>
                        Clear selection
                      </button>

                      <button className="pr-btn-gold" onClick={assignSelectedChildren} disabled={assigning || !selectedStudentIds.length}>
                        {assigning ? "Assigning…" : "Assign Selected"}
                      </button>
                    </div>

                    <div style={{ marginTop: 12, color: "#9a8a7a", fontSize: 12.5 }}>
                      Students already assigned to <b>this</b> parent are pre-checked. Students assigned to <b>another</b> parent are locked.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pr-modal-foot">
              <small style={{ color: "#9a8a7a" }}>Classes are fetched dynamically from Student Classes.</small>
              <button className="pr-mini-btn" onClick={closeAssignModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}