import { useEffect, useMemo, useState } from "react";
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
interface Level {
  id: number;
  name: string;
}

interface Teacher {
  id: number;
  firstname?: string;
  surname?: string;
  username?: string | null;
  reg_no?: string | null;

  email?: string | null;
  phone?: string | null;
  dob?: string | null;
  sex?: string | null;
  address?: string | null;
  photo?: string | null;
  status?: number | string | null;

  level?: Level | null;

  teacher_enrollment?: {
    level_id?: number | null;
    level?: Level | null;
  } | null;
}

type ModalTab = "overview" | "security";

/* =========================
   HELPERS
========================= */
const capitalize = (str?: string | null) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

const fullName = (t?: Teacher | any) =>
  [capitalize(t?.firstname), capitalize(t?.surname)].filter(Boolean).join(" ").trim();

const initials = (t?: Teacher | any) => {
  const a = (t?.firstname || "").trim().charAt(0).toUpperCase();
  const b = (t?.surname || "").trim().charAt(0).toUpperCase();
  return (a + b).trim() || "T";
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function safeStatusActive(status?: any) {
  return String(status) === "1" || status === 1 || String(status).toLowerCase() === "active";
}

/* =========================
   PAGE
========================= */
export default function TeachersPage() {
  const { showSuccess, showError } = useToast();

  // ===== Sidebar =====
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ===== List =====
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(8);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // ===== Levels =====
  const [levels, setLevels] = useState<Level[]>([]);

  // ===== Profile =====
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherDetails, setTeacherDetails] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // ===== Edit =====
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedTeacher, setEditedTeacher] = useState<any>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");

  // ===== Password =====
  const [decryptedPassword, setDecryptedPassword] = useState<string>("");
  const [passwordVisible, setPasswordVisible] = useState(false);

  // ===== Modal UX =====
  const [activeProfileTab, setActiveProfileTab] = useState<ModalTab>("overview");

  // ===== Add Teacher Modal =====
  const [showAddModal, setShowAddModal] = useState(false);
  const [creatingTeacher, setCreatingTeacher] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    firstname: "",
    surname: "",
    email: "",
    phone: "",
    sex: "",
    dob: "",
    address: "",
    username: "",
    level_id: "",
  });
  const [newTeacherPhoto, setNewTeacherPhoto] = useState<File | null>(null);
  const [newTeacherPhotoPreview, setNewTeacherPhotoPreview] = useState<string>("");

  const BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8000" ||
    "https://gradequest.com.ng";

  const getTeacherPhoto = (photo?: string | null) =>
    photo ? `${BASE_URL}/uploads/users/${photo}` : "/media/profile.jpg";

  /* =========================
     FETCH
  ========================= */
  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await authApi.get("/all-teachers", {
        params: { page, perPage, search },
      });

      const data = res.data.teachers;
      setTeachers(data.data || data);
      setTotalPages(data.last_page || 1);
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message ?? "Failed to load teachers");
    } finally {
      setLoading(false);
    }
  };

  const fetchLevels = async () => {
    try {
      const res = await authApi.get("/levels");
      setLevels(res.data.levels || res.data || []);
    } catch {
      setLevels([]);
    }
  };

  useEffect(() => {
    fetchTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  useEffect(() => {
    fetchLevels();
  }, []);

  /* =========================
     MODAL: OPEN/CLOSE
  ========================= */
  const openTeacher = async (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setLoadingProfile(true);
    setIsEditMode(false);
    setEditedTeacher({});
    setPhotoFile(null);
    setPhotoPreview("");
    setPasswordVisible(false);
    setDecryptedPassword("");
    setActiveProfileTab("overview");

    try {
      const res = await authApi.get(`/teachers/view/${teacher.id}`);
      setTeacherDetails(res.data);
      setDecryptedPassword(res.data.decrypted_password || "");
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message ?? "Failed to load teacher profile");
      setSelectedTeacher(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const closeTeacherModal = () => {
    setSelectedTeacher(null);
    setTeacherDetails(null);
    setIsEditMode(false);
    setEditedTeacher({});
    setPhotoFile(null);
    setPhotoPreview("");
    setPasswordVisible(false);
    setDecryptedPassword("");
    setActiveProfileTab("overview");
  };

  /* =========================
     EDIT MODE
  ========================= */
  const enableEditMode = async () => {
    if (!selectedTeacher) return;

    setLoadingProfile(true);
    setActiveProfileTab("overview");
    try {
      const res = await authApi.get(`/teachers/edit/${selectedTeacher.id}`);
      const t = res.data.teacher as Teacher;

      setIsEditMode(true);
      setTeacherDetails((prev: any) => ({ ...(prev || {}), teacher: t }));

      setEditedTeacher({
        firstname: t.firstname || "",
        surname: t.surname || "",
        email: t.email || "",
        phone: t.phone || "",
        dob: t.dob || "",
        sex: t.sex || "",
        address: t.address || "",
        level_id: res.data.level_id ?? t.teacher_enrollment?.level_id ?? "",
        password: "",
      });

      setPhotoPreview(res.data.photo_url || getTeacherPhoto(t.photo));
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message ?? "Failed to fetch teacher for edit");
    } finally {
      setLoadingProfile(false);
    }
  };

  const cancelEditMode = () => {
    setIsEditMode(false);
    setEditedTeacher({});
    setPhotoFile(null);
    setPhotoPreview("");
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  /* =========================
     SAVE / DELETE
  ========================= */
  const saveTeacher = async () => {
    if (!selectedTeacher) return;

    setSavingTeacher(true);
    try {
      const formData = new FormData();
      Object.entries(editedTeacher).forEach(([key, value]) => {
        if (value !== undefined && value !== null) formData.append(key, value as any);
      });
      if (photoFile) formData.append("photo", photoFile);

      formData.append("_method", "PUT");

      const res = await authApi.post(`/teachers/${selectedTeacher.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showSuccess(res.data.message || "Teacher updated successfully!");
      await fetchTeachers();
      setIsEditMode(false);
      setPhotoFile(null);
      setPhotoPreview("");
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to update teacher");
    } finally {
      setSavingTeacher(false);
    }
  };

  const deleteTeacher = async (teacher: Teacher) => {
    const ok = window.confirm(`Delete ${fullName(teacher)}?`);
    if (!ok) return;

    setLoading(true);
    try {
      await authApi.delete(`/teachers/${teacher.id}`);
      showSuccess("Teacher deleted successfully");
      fetchTeachers();
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to delete teacher");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     ADD TEACHER MODAL
  ========================= */
  const openAddTeacherModal = () => {
    setNewTeacher({
      firstname: "",
      surname: "",
      email: "",
      phone: "",
      sex: "",
      dob: "",
      address: "",
      username: "",
      level_id: "",
    });
    setNewTeacherPhoto(null);
    setNewTeacherPhotoPreview("");
    setShowAddModal(true);
  };

  const closeAddTeacherModal = () => {
    if (creatingTeacher) return;
    setShowAddModal(false);
  };

  const handleNewTeacherPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewTeacherPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => setNewTeacherPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const createTeacher = async () => {
    if (!newTeacher.firstname.trim()) return showError("First name is required");
    if (!newTeacher.surname.trim()) return showError("Surname is required");
    if (!newTeacher.level_id) return showError("Please select a class (level)");

    setCreatingTeacher(true);
    try {
      const formData = new FormData();
      formData.append("firstname", newTeacher.firstname.trim());
      formData.append("surname", newTeacher.surname.trim());
      formData.append("role", "Teacher");
      formData.append("level_id", String(newTeacher.level_id));

      if (newTeacher.email) formData.append("email", newTeacher.email);
      if (newTeacher.phone) formData.append("phone", newTeacher.phone);
      if (newTeacher.sex) formData.append("sex", newTeacher.sex);
      if (newTeacher.dob) formData.append("dob", newTeacher.dob);
      if (newTeacher.address) formData.append("address", newTeacher.address);
      if (newTeacher.username) formData.append("username", newTeacher.username);

      if (newTeacherPhoto) formData.append("photo", newTeacherPhoto);

      const res = await authApi.post("/register-teacher", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showSuccess(res.data.message || "Teacher registered successfully!");
      setShowAddModal(false);

      setPage(1);
      await fetchTeachers();

      const created = res.data.user as Teacher | undefined;
      if (created?.id) openTeacher(created);
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Failed to register teacher");
    } finally {
      setCreatingTeacher(false);
    }
  };

  /* =========================
     DERIVED STATS
  ========================= */
  const totalTeachers = teachers?.length ?? 0;
  const activeCount = useMemo(() => teachers.filter((t) => safeStatusActive(t.status)).length, [teachers]);
  const maleCount = useMemo(() => teachers.filter((t) => (t.sex ?? "").toLowerCase() === "male").length, [teachers]);
  const femaleCount = useMemo(() => teachers.filter((t) => (t.sex ?? "").toLowerCase() === "female").length, [teachers]);

  const roleHint = "Admin";

  return (
    <>
      {/* ===== Dashboard template styles (inline) ===== */}
      <style>{`
.db-main{
  background: var(--bs-body-bg, #f5f1eb);
  min-height: 100vh;
  font-family: "DM Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  padding: 28px 28px 0;
}
.db-hero{
  background:#0f172a;
  border-radius:16px;
  padding:32px 36px;
  position:relative;
  overflow:hidden;
  margin-bottom:22px;
  border:1px solid rgba(255,255,255,0.06);
}
.db-hero::before{
  content:"";
  position:absolute; inset:0;
  background-image: radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px);
  background-size:24px 24px;
  pointer-events:none;
}
.db-hero-glow{
  position:absolute; top:-60px; right:-60px;
  width:320px; height:320px; border-radius:50%;
  background: radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 65%);
  pointer-events:none;
}
.db-hero-glow2{
  position:absolute; bottom:-40px; left:25%;
  width:220px; height:220px; border-radius:50%;
  background: radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%);
  pointer-events:none;
}
.db-hero-inner{ position:relative; z-index:1; display:flex; align-items:flex-start; justify-content:space-between; gap:28px; flex-wrap:wrap; }
.db-session-badge{
  display:inline-flex; align-items:center; gap:7px;
  font-size:11px; font-weight:500; letter-spacing:0.12em; text-transform:uppercase;
  color:#e8c97a; background: rgba(201,168,76,0.10);
  border:1px solid rgba(201,168,76,0.22);
  border-radius:999px; padding:4px 12px; margin-bottom:12px;
}
.db-session-dot{ width:6px; height:6px; border-radius:50%; background:#22c55e; animation:dbPulse 2s ease infinite; }
@keyframes dbPulse{ 0%,100%{opacity:1; transform:scale(1);} 50%{opacity:.4; transform:scale(1.5);} }

.db-greeting{
  font-family:"Lora", Georgia, serif;
  font-size: clamp(22px, 2.5vw, 32px);
  font-weight:700; color:#fff; line-height:1.1; margin-bottom:8px;
}
.db-greeting em{ font-style:italic; color:#e8c97a; }
.db-hero-sub{ font-size:13.5px; font-weight:300; color:#94a3b8; line-height:1.7; max-width:640px; margin-bottom:18px; }

.db-hero-btns{ display:flex; gap:10px; flex-wrap:wrap; }
.db-btn-gold{
  display:inline-flex; align-items:center; gap:7px;
  padding:10px 18px;
  font-size:13px; font-weight:600;
  color:#0f172a; background:#c9a84c; border:none;
  border-radius:10px; cursor:pointer;
  transition: background .2s, transform .2s;
  text-decoration:none; white-space:nowrap;
}
.db-btn-gold:hover{ background:#e8c97a; transform: translateY(-1px); }
.db-btn-outline{
  display:inline-flex; align-items:center; gap:7px;
  padding:10px 18px;
  font-size:13px; font-weight:500;
  color: rgba(255,255,255,0.78);
  background:transparent;
  border:1px solid rgba(255,255,255,0.16);
  border-radius:10px; cursor:pointer;
  transition: background .2s, border-color .2s, color .2s;
}
.db-btn-outline:hover{ background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.28); color:#fff; }
.db-btn-outline:disabled,.db-btn-gold:disabled{ opacity:.55; cursor:not-allowed; transform:none; }

.db-hero-stat-card{
  background: rgba(255,255,255,0.05);
  border:1px solid rgba(255,255,255,0.09);
  backdrop-filter: blur(8px);
  border-radius:12px;
  padding:18px 20px;
  min-width: 260px;
}
.db-hero-stat-item{ display:flex; align-items:center; justify-content:space-between; gap:14px; }
.db-hero-stat-label{ font-size:12px; font-weight:300; color:#94a3b8; }
.db-hero-stat-val{ font-family:"Lora", serif; font-size:18px; font-weight:700; color:#fff; }
.db-hero-stat-sep{ height:1px; background: rgba(255,255,255,0.06); margin:10px 0; }
@keyframes dbSpin { to { transform: rotate(360deg); } }

.db-stats{
  display:grid;
  grid-template-columns: repeat(4, 1fr);
  gap:16px;
  margin-bottom: 18px;
}
@media (max-width: 1199.98px){ .db-stats{ grid-template-columns: repeat(2, 1fr);} }
@media (max-width: 575.98px){ .db-stats{ grid-template-columns: 1fr;} }

.db-stat{
  background:#fff;
  border:1px solid #ede8e0;
  border-radius:14px;
  padding:22px 20px;
  position:relative;
  overflow:hidden;
  transition: box-shadow .25s, transform .25s;
}
.db-stat:hover{ box-shadow: 0 8px 28px rgba(0,0,0,0.08); transform: translateY(-3px); }
.db-stat::before{
  content:""; position:absolute; top:0; left:0; right:0; height:3px;
  background: var(--sc, #b45309);
  transform: scaleX(0); transform-origin:left;
  transition: transform .3s ease;
}
.db-stat:hover::before{ transform: scaleX(1); }
.db-stat-head{ display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:14px; }
.db-stat-icon{
  width:42px; height:42px; border-radius:10px;
  background: var(--si, #fef3c7);
  color: var(--sc, #b45309);
  display:flex; align-items:center; justify-content:center;
}
.db-stat-label{ font-size:12px; font-weight:400; color:#9a8a7a; margin-bottom:5px; letter-spacing:.03em; }
.db-stat-val{ font-family:"Lora", Georgia, serif; font-size:28px; font-weight:700; color:#1a1a2e; line-height:1; }
.db-stat-footer{
  display:flex; align-items:center; gap:6px;
  margin-top:12px; padding-top:12px;
  border-top:1px solid rgba(0,0,0,0.06);
  font-size:12px; color:#9a8a7a;
}
.db-panel{
  background:#fff;
  border:1px solid #ede8e0;
  border-radius:14px;
  overflow:hidden;
  margin-bottom: 22px;
}
.db-panel-head{
  display:flex; align-items:center; justify-content:space-between;
  padding:18px 20px;
  border-bottom:1px solid rgba(0,0,0,0.06);
  gap:12px;
}
.db-panel-title-group{ display:flex; align-items:center; gap:12px; }
.db-panel-icon{
  width:36px; height:36px; border-radius:9px;
  display:flex; align-items:center; justify-content:center;
  background: var(--pi, #fef3c7);
  color: var(--pc, #b45309);
  flex-shrink:0;
}
.db-panel-title{
  font-family:"Lora", serif;
  font-size:16px; font-weight:700;
  color:#1a1a2e; margin:0;
}
.db-panel-sub{ font-size:11.5px; font-weight:300; color:#9a8a7a; margin:0; }

.db-refresh-btn{
  display:inline-flex; align-items:center; gap:6px;
  padding:7px 14px;
  font-size:12px; font-weight:500;
  color:#7a6a5a;
  background:#f5f1eb;
  border:1px solid #e5ddd3;
  border-radius:10px;
  cursor:pointer;
  transition: background .2s;
}
.db-refresh-btn:hover{ background:#ede8e0; }
.db-refresh-btn:disabled{ opacity:.55; cursor:not-allowed; }

.db-toolbar{
  padding: 14px 20px;
  display:flex; align-items:center; justify-content:space-between;
  flex-wrap:wrap; gap:12px;
}
.db-input{
  border:1px solid #e5ddd3;
  background:#fff;
  border-radius:12px;
  padding:10px 12px;
  font-size:13px;
  color:#1a1a2e;
  outline:none;
  min-height: 40px;
}
.db-input:focus{
  border-color: rgba(201,168,76,0.7);
  box-shadow: 0 0 0 3px rgba(201,168,76,0.15);
}
.db-actions{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }

.db-mini-btn{
  display:inline-flex; align-items:center; justify-content:center;
  gap:6px;
  border-radius:12px;
  padding:10px 14px;
  font-size:12.5px;
  font-weight:800;
  border:1px solid #e5ddd3;
  background:#f5f1eb;
  color:#7a6a5a;
  cursor:pointer;
  transition: background .2s, transform .2s;
  min-height: 40px;
  white-space: nowrap;
}
.db-mini-btn:hover{ background:#ede8e0; transform: translateY(-1px); }
.db-mini-btn:disabled{ opacity:.55; cursor:not-allowed; transform:none; }

.db-mini-btn--p{ background: rgba(99,102,241,0.12); border-color: rgba(99,102,241,0.22); color:#4338ca; }
.db-mini-btn--g{ background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.25); color:#15803d; }
.db-mini-btn--r{ background: rgba(244,63,94,0.10); border-color: rgba(244,63,94,0.22); color:#be123c; }

.db-pill{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:5px 10px;
  border-radius:999px;
  font-size:12px;
  font-weight:800;
}
.db-pill--info{ background: rgba(30,64,175,0.10); color:#1e40af; }
.db-pill--gold{ background: rgba(180,83,9,0.10); color:#b45309; }
.db-pill--muted{ background: rgba(148,163,184,0.18); color:#64748b; }
.db-pill--ok{ background: rgba(34,197,94,0.14); color:#15803d; }
.db-pill--no{ background: rgba(100,116,139,0.18); color:#475569; }

.db-table{ width:100%; border-collapse:collapse; }
.db-table th{
  padding:10px 16px;
  font-size:11px;
  font-weight:700;
  letter-spacing:0.12em;
  text-transform:uppercase;
  color:#9a8a7a;
  background:#faf8f5;
  border-bottom:1px solid rgba(0,0,0,0.06);
  text-align:left;
  white-space:nowrap;
}
.db-table td{
  padding:13px 16px;
  font-size:13.5px;
  color:#4a4a5a;
  border-bottom:1px solid rgba(0,0,0,0.06);
  vertical-align:middle;
}
.db-table tbody tr{ transition: background .15s; }
.db-table tbody tr:hover{ background:#faf8f5; }

.db-avatar{
  width:44px; height:44px;
  border-radius:999px;
  border:1px solid rgba(0,0,0,0.08);
  overflow:hidden;
  background:#fff;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
}
.db-avatar img{ width:100%; height:100%; object-fit:cover; }
.db-avatar-fallback{
  background:#e0e7ff;
  color:#4338ca;
  font-weight:900;
}

.db-empty{
  padding:46px 16px;
  text-align:center;
  color:#b5a090;
  font-size:13.5px;
}

.db-modal-backdrop{
  position:fixed; inset:0;
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(7px);
  z-index: 1200;
  display:flex;
  align-items:center;
  justify-content:center;
  padding: 14px;
}
.db-modal{
  width: min(1100px, 96vw);
  max-height: 92vh;
  background:#fff;
  border-radius: 18px;
  overflow:hidden;
  box-shadow: 0 20px 70px rgba(0,0,0,0.35);
  border:1px solid rgba(255,255,255,0.10);
}
.db-modal-head{
  padding: 18px 20px;
  background:#0f172a;
  color:#fff;
  position:relative;
  overflow:hidden;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.db-modal-head::before{
  content:"";
  position:absolute; inset:0;
  background-image: radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px);
  background-size:24px 24px;
  pointer-events:none;
}
.db-modal-glow{
  position:absolute; top:-60px; right:-60px;
  width:240px; height:240px; border-radius:50%;
  background: radial-gradient(circle, rgba(201,168,76,0.14) 0%, transparent 65%);
}
.db-modal-row{ position:relative; z-index:1; display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; }
.db-modal-left{ display:flex; align-items:center; gap:14px; }
.db-modal-title{
  font-family:"Lora", serif;
  font-size: 18px;
  font-weight: 800;
  margin: 0;
}
.db-modal-sub{
  margin: 4px 0 0;
  font-size: 12.5px;
  color:#94a3b8;
}
.db-modal-body{
  background:#f5f1eb;
  padding: 14px;
  overflow:auto;
  max-height: calc(92vh - 78px);
}
.db-card{
  background:#fff;
  border:1px solid #ede8e0;
  border-radius: 14px;
  overflow:hidden;
}
.db-card-inner{ padding: 16px; }
.db-kv-grid{
  display:grid;
  grid-template-columns: repeat(3, minmax(220px, 1fr));
  gap: 12px;
}
@media (max-width: 991.98px){ .db-kv-grid{ grid-template-columns: 1fr; } }
.db-kv{
  border:1px solid rgba(0,0,0,0.06);
  border-radius: 12px;
  background:#faf8f5;
  padding: 12px;
}
.db-kv-label{
  font-size:11px;
  font-weight:800;
  letter-spacing:0.1em;
  text-transform:uppercase;
  color:#9a8a7a;
  display:flex;
  align-items:center;
  gap:8px;
  margin-bottom: 6px;
}
.db-kv-val{ font-size:14px; font-weight:800; color:#1a1a2e; }

.db-tabs{ display:flex; gap:8px; flex-wrap:wrap; margin-top: 12px; position:relative; z-index:1; }
.db-tab{
  border:1px solid rgba(255,255,255,0.18);
  background: transparent;
  color: rgba(255,255,255,0.82);
  border-radius: 999px;
  padding: 8px 12px;
  font-size:12px;
  font-weight:800;
  cursor:pointer;
}
.db-tab--active{
  background: rgba(255,255,255,0.10);
  color:#fff;
  border-color: rgba(255,255,255,0.28);
}
.db-form-grid{
  display:grid;
  grid-template-columns: repeat(2, minmax(260px, 1fr));
  gap: 12px;
}
@media (max-width: 991.98px){ .db-form-grid{ grid-template-columns: 1fr; } }
.db-label{
  font-size:11px;
  font-weight:900;
  letter-spacing:0.12em;
  text-transform:uppercase;
  color:#9a8a7a;
  margin-bottom:6px;
}
.db-select{
  border:1px solid #e5ddd3;
  background:#fff;
  border-radius:12px;
  padding:10px 12px;
  font-size:13px;
  color:#1a1a2e;
  outline:none;
  min-height: 40px;
  width:100%;
}
.db-select:focus{
  border-color: rgba(201,168,76,0.7);
  box-shadow: 0 0 0 3px rgba(201,168,76,0.15);
}
.db-muted{ color:#9a8a7a; font-size:12.5px; }
      `}</style>

      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Teachers" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main">
            {(loading || savingTeacher || creatingTeacher) && (
              <Loader
                message={
                  creatingTeacher ? "Creating teacher..." : savingTeacher ? "Saving teacher..." : "Loading teachers..."
                }
              />
            )}

            {/* ===== HERO ===== */}
            <div className="db-hero">
              <div className="db-hero-glow" aria-hidden="true" />
              <div className="db-hero-glow2" aria-hidden="true" />

              <div className="db-hero-inner">
                <div>
                  <div className="db-session-badge">
                    <span className="db-session-dot" />
                    Teachers ·{" "}
                    <span style={{ color: "#94a3b8" }}>
                      page {page} / {totalPages}
                    </span>{" "}
                    · <span style={{ color: "#94a3b8" }}>{totalTeachers} on this page</span>
                  </div>

                  <h1 className="db-greeting">
                    {getGreeting()}, <em>{roleHint}.</em>
                  </h1>

                  <p className="db-hero-sub">
                    Search teachers, view profiles, edit details, update class enrollment, and manage login credentials
                    securely.
                  </p>

                  <div className="db-hero-btns">
                    <button className="db-btn-gold" onClick={openAddTeacherModal}>
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 6,
                          background: "rgba(15,23,42,0.10)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        +
                      </span>
                      Add Teacher
                    </button>

                    <button className="db-btn-outline" onClick={() => fetchTeachers()} disabled={loading}>
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          border: "2px solid rgba(255,255,255,0.25)",
                          borderTopColor: "#fff",
                          display: "inline-block",
                          animation: loading ? "dbSpin 0.8s linear infinite" : "none",
                        }}
                      />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Hero mini stat */}
                <div className="db-hero-stat-card d-none d-md-block">
                  <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a84c", marginBottom: 10 }}>
                    Quick stats
                  </div>

                  <div className="db-hero-stat-item">
                    <span className="db-hero-stat-label">Active</span>
                    <span className="db-hero-stat-val">{activeCount}</span>
                  </div>
                  <div className="db-hero-stat-sep" />
                  <div className="db-hero-stat-item">
                    <span className="db-hero-stat-label">Male</span>
                    <span className="db-hero-stat-val">{maleCount}</span>
                  </div>
                  <div className="db-hero-stat-sep" />
                  <div className="db-hero-stat-item">
                    <span className="db-hero-stat-label">Female</span>
                    <span className="db-hero-stat-val">{femaleCount}</span>
                  </div>

                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      Tip: Click <b style={{ color: "#fff" }}>View</b> to open profile.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== KPI cards ===== */}
            <div className="db-stats">
              {[
                { title: "Teachers (Page)", value: totalTeachers, color: "#1e40af", bg: "#dbeafe", hint: "loaded in current view" },
                { title: "Active", value: activeCount, color: "#15803d", bg: "#dcfce7", hint: "status active" },
                { title: "Male", value: maleCount, color: "#0369a1", bg: "#e0f2fe", hint: "gender: male" },
                { title: "Female", value: femaleCount, color: "#be123c", bg: "#ffe4e6", hint: "gender: female" },
              ].map((c, i) => (
                <div
                  className="db-stat"
                  key={c.title}
                  style={{ "--sc": c.color, "--si": c.bg } as React.CSSProperties}
                >
                  <div className="db-stat-head">
                    <div className="db-stat-icon">
                      {i === 0 ? (
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                          <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M2 18c0-3.314 2.686-6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <circle cx="15" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                        </svg>
                      ) : i === 1 ? (
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                          <path d="M16 6l-7 9-3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
                        </svg>
                      ) : i === 2 ? (
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                          <path d="M10 2v16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
                          <path d="M6 8a4 4 0 118 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                          <path d="M10 2v16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
                          <path d="M6 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                          <path d="M10 6v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      )}
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: "#c8bfb5" }}>
                      <circle cx="4" cy="8" r="1.2" fill="currentColor" />
                      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
                      <circle cx="12" cy="8" r="1.2" fill="currentColor" />
                    </svg>
                  </div>
                  <p className="db-stat-label">{c.title}</p>
                  <div className="db-stat-val">{c.value}</div>
                  <div className="db-stat-footer">
                    <span className="db-pill db-pill--muted">{c.hint}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ===== Panel: Toolbar + Table ===== */}
            <div className="db-panel">
              <div className="db-panel-head">
                <div className="db-panel-title-group">
                  <div
                    className="db-panel-icon"
                    style={{ "--pi": "#fef3c7", "--pc": "#b45309" } as React.CSSProperties}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 3h8M5 7h6M6 11h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="db-panel-title">Teacher Directory</p>
                    <p className="db-panel-sub">Search by name, email or phone. View profile to edit or manage credentials.</p>
                  </div>
                </div>

                <button className="db-refresh-btn" onClick={() => fetchTeachers()} disabled={loading}>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 14 14"
                    fill="none"
                    style={{ animation: loading ? "dbSpin 0.8s linear infinite" : "none" }}
                  >
                    <path d="M12 7A5 5 0 112 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M12 3v4h-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {loading ? "Loading…" : "Refresh"}
                </button>
              </div>

              <div className="db-toolbar">
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", width: "100%" }}>
                  <div style={{ flex: "1 1 360px", minWidth: 260 }}>
                    <input
                      className="db-input"
                      style={{ width: "100%" }}
                      placeholder="Search teachers (name, email, phone)…"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                    />
                    <div className="db-muted" style={{ marginTop: 6 }}>
                      Tip: Clearing search will return the full list again.
                    </div>
                  </div>

                  <div className="db-actions" style={{ marginLeft: "auto" }}>
                    {search.trim() ? (
                      <button
                        className="db-mini-btn"
                        onClick={() => {
                          setSearch("");
                          setPage(1);
                        }}
                        title="Clear search"
                      >
                        ✕ Clear
                      </button>
                    ) : null}

                    <button className="db-mini-btn db-mini-btn--p" onClick={openAddTeacherModal}>
                      + Add Teacher
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="db-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 360 }}>Teacher</th>
                      <th style={{ width: 170 }}>Staff ID</th>
                      <th style={{ width: 260 }}>Class</th>
                      <th style={{ width: 140 }}>Status</th>
                      <th style={{ width: 220, textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="db-empty">
                          <div style={{ fontWeight: 900, color: "#1a1a2e" }}>Loading teachers…</div>
                          <div style={{ marginTop: 6 }}>Please wait.</div>
                        </td>
                      </tr>
                    ) : teachers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="db-empty">
                          <div style={{ fontWeight: 900, color: "#1a1a2e" }}>No teachers found</div>
                          <div style={{ marginTop: 6 }}>Try a different search or add a new teacher.</div>
                        </td>
                      </tr>
                    ) : (
                      teachers.map((t) => {
                        const statusOk = safeStatusActive(t.status);
                        const className = t.level?.name || t.teacher_enrollment?.level?.name || "—";
                        return (
                          <tr key={t.id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div className={`db-avatar ${t.photo ? "" : "db-avatar-fallback"}`}>
                                  {t.photo ? (
                                    <img src={getTeacherPhoto(t.photo)} alt={fullName(t)} />
                                  ) : (
                                    <span>{initials(t)}</span>
                                  )}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 900, color: "#1a1a2e", lineHeight: 1.2 }}>
                                    {fullName(t) || "—"}
                                  </div>
                                  <div className="db-muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 520 }}>
                                    {t.email || "—"} {t.phone ? `· ${t.phone}` : ""}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td>
                              <span className="db-pill db-pill--info">{t.reg_no || "—"}</span>
                            </td>

                            <td>
                              <span className="db-pill db-pill--gold">{className}</span>
                            </td>

                            <td>
                              <span className={`db-pill ${statusOk ? "db-pill--ok" : "db-pill--no"}`}>
                                {statusOk ? "Active" : "Inactive"}
                              </span>
                            </td>

                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                <button className="db-mini-btn db-mini-btn--p" onClick={() => openTeacher(t)}>
                                  View
                                </button>
                                <button className="db-mini-btn db-mini-btn--r" onClick={() => deleteTeacher(t)}>
                                  Delete
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  padding: "14px 20px",
                  borderTop: "1px solid rgba(0,0,0,0.06)",
                  background: "#fff",
                }}
              >
                <div className="db-muted">
                  Page <b style={{ color: "#1a1a2e" }}>{page}</b> of <b style={{ color: "#1a1a2e" }}>{totalPages}</b>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="db-mini-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                    ← Previous
                  </button>
                  <button className="db-mini-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next →
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-auto" style={{ paddingTop: 18 }}>
              <Footer />
            </div>
          </main>
        </div>
      </div>

      {/* ================= ADD TEACHER MODAL ================= */}
      {showAddModal && (
        <div className="db-modal-backdrop" onMouseDown={closeAddTeacherModal}>
          <div className="db-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="db-modal-head">
              <div className="db-modal-glow" aria-hidden="true" />
              <div className="db-modal-row">
                <div className="db-modal-left">
                  <div className="db-avatar" style={{ width: 62, height: 62, borderColor: "rgba(255,255,255,0.25)" }}>
                    {newTeacherPhotoPreview ? (
                      <img src={newTeacherPhotoPreview} alt="Preview" />
                    ) : (
                      <span style={{ color: "#e8c97a", fontWeight: 900 }}>+</span>
                    )}
                  </div>
                  <div>
                    <p className="db-modal-title">Add Teacher</p>
                    <p className="db-modal-sub">Create a staff account and assign a class (Level). Password is auto-generated.</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <label className="db-btn-outline" style={{ margin: 0 }}>
                    Upload Photo
                    <input type="file" accept="image/*" onChange={handleNewTeacherPhoto} style={{ display: "none" }} />
                  </label>

                  <button className="db-btn-outline" onClick={closeAddTeacherModal} disabled={creatingTeacher}>
                    Close
                  </button>
                </div>
              </div>
            </div>

            <div className="db-modal-body">
              <div className="db-card">
                <div className="db-card-inner">
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontFamily: "Lora, serif", fontWeight: 900, color: "#1a1a2e" }}>Teacher Information</div>
                      <div className="db-muted">Fields marked * are required.</div>
                    </div>

                    <span className="db-pill db-pill--muted">Only admins should create staff accounts</span>
                  </div>

                  <div className="db-form-grid">
                    <div>
                      <div className="db-label">First name *</div>
                      <input
                        className="db-input"
                        style={{ width: "100%" }}
                        value={newTeacher.firstname}
                        onChange={(e) => setNewTeacher({ ...newTeacher, firstname: e.target.value })}
                        placeholder="e.g. Adeola"
                      />
                    </div>

                    <div>
                      <div className="db-label">Surname *</div>
                      <input
                        className="db-input"
                        style={{ width: "100%" }}
                        value={newTeacher.surname}
                        onChange={(e) => setNewTeacher({ ...newTeacher, surname: e.target.value })}
                        placeholder="e.g. Johnson"
                      />
                    </div>

                    <div>
                      <div className="db-label">Username</div>
                      <input
                        className="db-input"
                        style={{ width: "100%" }}
                        value={newTeacher.username}
                        onChange={(e) => setNewTeacher({ ...newTeacher, username: e.target.value })}
                        placeholder="e.g. adeola.j"
                      />
                    </div>

                    <div>
                      <div className="db-label">Email</div>
                      <input
                        className="db-input"
                        style={{ width: "100%" }}
                        type="email"
                        value={newTeacher.email}
                        onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                        placeholder="teacher@email.com"
                      />
                    </div>

                    <div>
                      <div className="db-label">Phone</div>
                      <input
                        className="db-input"
                        style={{ width: "100%" }}
                        value={newTeacher.phone}
                        onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                        placeholder="080..."
                      />
                    </div>

                    <div>
                      <div className="db-label">Gender</div>
                      <select
                        className="db-select"
                        value={newTeacher.sex}
                        onChange={(e) => setNewTeacher({ ...newTeacher, sex: e.target.value })}
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>

                    <div>
                      <div className="db-label">DOB</div>
                      <input
                        className="db-input"
                        style={{ width: "100%" }}
                        type="date"
                        value={newTeacher.dob}
                        onChange={(e) => setNewTeacher({ ...newTeacher, dob: e.target.value })}
                      />
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <div className="db-label">Address</div>
                      <input
                        className="db-input"
                        style={{ width: "100%" }}
                        value={newTeacher.address}
                        onChange={(e) => setNewTeacher({ ...newTeacher, address: e.target.value })}
                        placeholder="Teacher address"
                      />
                    </div>

                    <div>
                      <div className="db-label">Assign Class (Level) *</div>
                      <select
                        className="db-select"
                        value={newTeacher.level_id}
                        onChange={(e) => setNewTeacher({ ...newTeacher, level_id: e.target.value })}
                      >
                        <option value="">Select class</option>
                        {levels.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                      <div className="db-muted" style={{ marginTop: 6 }}>
                        A random password is generated automatically. View it later from the teacher profile.
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 10 }}>
                      <button
                        className="db-mini-btn db-mini-btn--p"
                        onClick={createTeacher}
                        disabled={creatingTeacher}
                        title="Create Teacher"
                      >
                        {creatingTeacher ? (
                          <>
                            <span
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: "50%",
                                border: "2px solid rgba(67,56,202,0.25)",
                                borderTopColor: "#4338ca",
                                display: "inline-block",
                                animation: "dbSpin 0.8s linear infinite",
                              }}
                            />
                            Creating…
                          </>
                        ) : (
                          <>Create Teacher</>
                        )}
                      </button>

                      <button className="db-mini-btn" onClick={closeAddTeacherModal} disabled={creatingTeacher}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12 }} className="db-muted">
                Security note: share credentials only with the teacher and encourage password change after first login.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= PROFILE MODAL ================= */}
      {selectedTeacher && (
        <div className="db-modal-backdrop" onMouseDown={closeTeacherModal}>
          <div className="db-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="db-modal-head">
              <div className="db-modal-glow" aria-hidden="true" />

              <div className="db-modal-row">
                <div className="db-modal-left">
                  <div className="db-avatar" style={{ width: 62, height: 62, borderColor: "rgba(255,255,255,0.25)" }}>
                    <img
                      src={photoPreview || getTeacherPhoto(teacherDetails?.teacher?.photo || selectedTeacher.photo)}
                      alt="Teacher"
                    />
                  </div>

                  <div>
                    <p className="db-modal-title">
                      {teacherDetails?.teacher ? fullName(teacherDetails.teacher) : fullName(selectedTeacher)}
                    </p>
                    <p className="db-modal-sub">
                      Staff ID: <b style={{ color: "#fff" }}>{teacherDetails?.teacher?.reg_no ?? selectedTeacher.reg_no ?? "—"}</b>{" "}
                      · Class:{" "}
                      <b style={{ color: "#fff" }}>
                        {teacherDetails?.teacher?.teacher_enrollment?.level?.name ??
                          teacherDetails?.teacher?.level?.name ??
                          selectedTeacher.level?.name ??
                          "—"}
                      </b>
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {!loadingProfile && !isEditMode && (
                    <button className="db-btn-gold" onClick={enableEditMode}>
                      Edit
                    </button>
                  )}

                  {!loadingProfile && isEditMode && (
                    <>
                      <button className="db-btn-gold" onClick={saveTeacher} disabled={savingTeacher}>
                        {savingTeacher ? "Saving…" : "Save"}
                      </button>
                      <button className="db-btn-outline" onClick={cancelEditMode} disabled={savingTeacher}>
                        Cancel
                      </button>
                    </>
                  )}

                  <button className="db-btn-outline" onClick={closeTeacherModal}>
                    Close
                  </button>
                </div>
              </div>

              <div className="db-tabs">
                <button
                  className={`db-tab ${activeProfileTab === "overview" ? "db-tab--active" : ""}`}
                  onClick={() => setActiveProfileTab("overview")}
                  disabled={loadingProfile}
                >
                  Overview
                </button>
                <button
                  className={`db-tab ${activeProfileTab === "security" ? "db-tab--active" : ""}`}
                  onClick={() => setActiveProfileTab("security")}
                  disabled={loadingProfile}
                >
                  Security
                </button>
              </div>
            </div>

            <div className="db-modal-body">
              {loadingProfile ? (
                <div className="db-card">
                  <div className="db-card-inner" style={{ textAlign: "center", padding: 30 }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        border: "3px solid rgba(0,0,0,0.10)",
                        borderTopColor: "#0f172a",
                        display: "inline-block",
                        animation: "dbSpin 0.8s linear infinite",
                      }}
                    />
                    <div className="db-muted" style={{ marginTop: 10 }}>
                      Loading teacher details…
                    </div>
                  </div>
                </div>
              ) : !teacherDetails?.teacher ? (
                <div className="db-card">
                  <div className="db-card-inner">
                    <div style={{ fontWeight: 900, color: "#1a1a2e" }}>No teacher details available.</div>
                    <div className="db-muted" style={{ marginTop: 6 }}>
                      Try closing and reopening the profile.
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* ===== OVERVIEW ===== */}
                  {activeProfileTab === "overview" && (
                    <div className="db-card">
                      <div className="db-card-inner">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                          <div>
                            <div style={{ fontFamily: "Lora, serif", fontWeight: 900, color: "#1a1a2e" }}>
                              {isEditMode ? "Edit Teacher Information" : "Teacher Details"}
                            </div>
                            <div className="db-muted">
                              {isEditMode ? "Update personal, contact and class enrollment." : "Personal, contact and enrollment summary."}
                            </div>
                          </div>

                          {isEditMode ? (
                            <label className="db-mini-btn db-mini-btn--p" style={{ margin: 0 }}>
                              Change Photo
                              <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
                            </label>
                          ) : (
                            <span className="db-pill db-pill--muted">ID: {teacherDetails.teacher?.id}</span>
                          )}
                        </div>

                        {isEditMode ? (
                          <div className="db-form-grid">
                            <div>
                              <div className="db-label">First name *</div>
                              <input
                                className="db-input"
                                style={{ width: "100%" }}
                                value={editedTeacher.firstname}
                                onChange={(e) => setEditedTeacher({ ...editedTeacher, firstname: e.target.value })}
                              />
                            </div>
                            <div>
                              <div className="db-label">Surname *</div>
                              <input
                                className="db-input"
                                style={{ width: "100%" }}
                                value={editedTeacher.surname}
                                onChange={(e) => setEditedTeacher({ ...editedTeacher, surname: e.target.value })}
                              />
                            </div>

                            <div>
                              <div className="db-label">Email *</div>
                              <input
                                className="db-input"
                                style={{ width: "100%" }}
                                type="email"
                                value={editedTeacher.email}
                                onChange={(e) => setEditedTeacher({ ...editedTeacher, email: e.target.value })}
                              />
                            </div>

                            <div>
                              <div className="db-label">Phone</div>
                              <input
                                className="db-input"
                                style={{ width: "100%" }}
                                value={editedTeacher.phone}
                                onChange={(e) => setEditedTeacher({ ...editedTeacher, phone: e.target.value })}
                              />
                            </div>

                            <div>
                              <div className="db-label">Gender</div>
                              <select
                                className="db-select"
                                value={editedTeacher.sex}
                                onChange={(e) => setEditedTeacher({ ...editedTeacher, sex: e.target.value })}
                              >
                                <option value="">Select</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                              </select>
                            </div>

                            <div>
                              <div className="db-label">DOB</div>
                              <input
                                className="db-input"
                                style={{ width: "100%" }}
                                type="date"
                                value={editedTeacher.dob}
                                onChange={(e) => setEditedTeacher({ ...editedTeacher, dob: e.target.value })}
                              />
                            </div>

                            <div style={{ gridColumn: "1 / -1" }}>
                              <div className="db-label">Address</div>
                              <input
                                className="db-input"
                                style={{ width: "100%" }}
                                value={editedTeacher.address}
                                onChange={(e) => setEditedTeacher({ ...editedTeacher, address: e.target.value })}
                              />
                            </div>

                            <div>
                              <div className="db-label">Class (Level)</div>
                              <select
                                className="db-select"
                                value={editedTeacher.level_id ?? ""}
                                onChange={(e) => setEditedTeacher({ ...editedTeacher, level_id: e.target.value })}
                              >
                                <option value="">Select class</option>
                                {levels.map((l) => (
                                  <option key={l.id} value={l.id}>
                                    {l.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <div className="db-label">New password (optional)</div>
                              <input
                                className="db-input"
                                style={{ width: "100%", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
                                value={editedTeacher.password}
                                onChange={(e) => setEditedTeacher({ ...editedTeacher, password: e.target.value })}
                                placeholder="Leave empty to keep current"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="db-kv-grid">
                            <div className="db-kv">
                              <div className="db-kv-label">Full name</div>
                              <div className="db-kv-val">{fullName(teacherDetails.teacher) || "N/A"}</div>
                            </div>
                            <div className="db-kv">
                              <div className="db-kv-label">Email</div>
                              <div className="db-kv-val">{teacherDetails.teacher?.email || "N/A"}</div>
                            </div>
                            <div className="db-kv">
                              <div className="db-kv-label">Phone</div>
                              <div className="db-kv-val">{teacherDetails.teacher?.phone || "N/A"}</div>
                            </div>

                            <div className="db-kv">
                              <div className="db-kv-label">Gender</div>
                              <div className="db-kv-val">{teacherDetails.teacher?.sex || "N/A"}</div>
                            </div>
                            <div className="db-kv">
                              <div className="db-kv-label">DOB</div>
                              <div className="db-kv-val">{teacherDetails.teacher?.dob || "N/A"}</div>
                            </div>
                            <div className="db-kv">
                              <div className="db-kv-label">Address</div>
                              <div className="db-kv-val">{teacherDetails.teacher?.address || "N/A"}</div>
                            </div>

                            <div className="db-kv">
                              <div className="db-kv-label">Class</div>
                              <div className="db-kv-val">
                                {teacherDetails.teacher?.teacher_enrollment?.level?.name || teacherDetails.teacher?.level?.name || "N/A"}
                              </div>
                            </div>
                            <div className="db-kv">
                              <div className="db-kv-label">Staff ID</div>
                              <div className="db-kv-val">{teacherDetails.teacher?.reg_no || "N/A"}</div>
                            </div>
                            <div className="db-kv">
                              <div className="db-kv-label">Status</div>
                              <div className="db-kv-val">{safeStatusActive(teacherDetails.teacher?.status) ? "Active" : "Inactive"}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ===== SECURITY ===== */}
                  {activeProfileTab === "security" && (
                    <div className="db-card">
                      <div className="db-card-inner">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                          <div>
                            <div style={{ fontFamily: "Lora, serif", fontWeight: 900, color: "#1a1a2e" }}>Login Credentials</div>
                            <div className="db-muted">Returned from /teachers/view/:id (handle securely).</div>
                          </div>
                          <span className="db-pill db-pill--gold">Security</span>
                        </div>

                        <div className="db-kv-grid">
                          <div className="db-kv">
                            <div className="db-kv-label">Username</div>
                            <div className="db-kv-val">{teacherDetails.teacher?.username ?? "—"}</div>
                          </div>
                          <div className="db-kv">
                            <div className="db-kv-label">Staff ID (Reg No)</div>
                            <div className="db-kv-val">{teacherDetails.teacher?.reg_no ?? "—"}</div>
                          </div>
                          <div className="db-kv" style={{ gridColumn: "1 / -1" }}>
                            <div className="db-kv-label">Default password</div>
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                              <input
                                className="db-input"
                                style={{
                                  flex: "1 1 320px",
                                  minWidth: 240,
                                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                }}
                                readOnly
                                type={passwordVisible ? "text" : "password"}
                                value={decryptedPassword || "N/A"}
                              />

                              <button
                                className="db-mini-btn db-mini-btn--p"
                                onClick={() => setPasswordVisible((v) => !v)}
                                disabled={!decryptedPassword}
                                title={passwordVisible ? "Hide password" : "Show password"}
                              >
                                {passwordVisible ? "Hide" : "Show"}
                              </button>

                              <button
                                className="db-mini-btn db-mini-btn--g"
                                onClick={() => {
                                  if (!decryptedPassword) return showError("No password to copy");
                                  navigator.clipboard.writeText(decryptedPassword).then(() => showSuccess("Password copied!"));
                                }}
                                disabled={!decryptedPassword}
                                title="Copy password"
                              >
                                Copy
                              </button>
                            </div>

                            {!decryptedPassword ? (
                              <div className="db-muted" style={{ marginTop: 8 }}>
                                No decrypted password returned. Confirm backend returns <code>decrypted_password</code>.
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div className="db-muted">Tip: Use tabs to switch between Overview and Security.</div>
                <button className="db-mini-btn" onClick={closeTeacherModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}