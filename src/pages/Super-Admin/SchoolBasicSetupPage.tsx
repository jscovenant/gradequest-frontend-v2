import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import { authApi } from "../../utils/axios";
import { useToast } from "../../contexts/ToastContext";

interface School {
  id: number;
  school_name: string;
  category?: string;
  prefix?: string;
  surfix?: string;
  logo?: string;
  primary_color?: string;
  secondary_color?: string;
  email?: string;
  phone?: string;
  address?: string;
  auto_admission?: number | boolean;
}

interface Owner {
  id: number;
  firstname?: string;
  surname?: string;
  email?: string;
  phone?: string;
}

interface SectionItem {
  id: number;
  name: string;
}

interface DepartmentItem {
  id: number;
  name: string;
}

interface ClassItem {
  id: number;
  name: string;
  section_id?: number | null;
  section?: SectionItem | null;
}

interface SubjectItem {
  id: number;
  name: string;
  subject_code?: string;
  subject_id?: string;
  section_id?: number | null;
  department_id?: number | null;
  section?: SectionItem | null;
  department?: DepartmentItem | null;
}

export default function SchoolBasicSetupPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"branding" | "academic" | "subjects" | "students" | "checklist">("branding");

  // School setup data
  const [school, setSchool] = useState<School | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [studentCount, setStudentCount] = useState<number>(0);

  // Branding Form
  const [prefix, setPrefix] = useState("");
  const [surfix, setSurfix] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0F2744");
  const [secondaryColor, setSecondaryColor] = useState("#D97706");
  const [autoAdmission, setAutoAdmission] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [savingBranding, setSavingBranding] = useState(false);

  // Academic Form States
  const [newSectionName, setNewSectionName] = useState("");
  const [savingSection, setSavingSection] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [savingDept, setSavingDept] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassSectionId, setNewClassSectionId] = useState<string>("");
  const [savingClass, setSavingClass] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState(false);

  // Subject Form States
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectSectionId, setNewSubjectSectionId] = useState<string>("");
  const [newSubjectDeptId, setNewSubjectDeptId] = useState<string>("");
  const [savingSubject, setSavingSubject] = useState(false);
  const [seedingCurriculum, setSeedingCurriculum] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");

  // Student Excel Import States
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewingFile, setPreviewingFile] = useState(false);
  const [importingStudents, setImportingStudents] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchSetupData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await authApi.get(`/superadmin/schools/${id}/setup-data`);
      const data = res.data;
      setSchool(data.school || null);
      setOwner(data.owner || null);
      setClasses(data.classes || []);
      setSections(data.sections || []);
      setDepartments(data.departments || []);
      setSubjects(data.subjects || []);
      setStudentCount(data.student_count || 0);

      // Populate branding form
      if (data.school) {
        setPrefix(data.school.prefix || "");
        setSurfix(data.school.surfix || "");
        setPrimaryColor(data.school.primary_color || "#0F2744");
        setSecondaryColor(data.school.secondary_color || "#D97706");
        setAutoAdmission(data.school.auto_admission !== false && data.school.auto_admission !== 0);
        if (data.school.logo) {
          setLogoPreview(data.school.logo.startsWith("http") ? data.school.logo : `/${data.school.logo}`);
        }
      }
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to load school setup details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "School Setup & Student Onboarding - SchoolProfit";
    void fetchSetupData();
  }, [id]);

  /* ==========================================================================
     BRANDING & IDENTITY
     ========================================================================== */
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSavingBranding(true);
    try {
      const formData = new FormData();
      formData.append("prefix", prefix);
      formData.append("surfix", surfix);
      formData.append("primary_color", primaryColor);
      formData.append("secondary_color", secondaryColor);
      formData.append("auto_admission", autoAdmission ? "1" : "0");
      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const res = await authApi.post(`/superadmin/schools/${id}/branding`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showSuccess(res.data?.message || "Branding updated successfully.");
      setSchool(res.data?.school);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to update school branding.");
    } finally {
      setSavingBranding(false);
    }
  };

  /* ==========================================================================
     ACADEMIC PRESETS & STRUCTURE
     ========================================================================== */
  const handleApplyPreset = async () => {
    if (!id) return;
    if (!window.confirm("Apply standard Nigerian academic preset (Sections: Junior/Senior, Departments: General/Science/Arts/Commercial, Classes: JSS 1-3, SSS 1-3)?")) {
      return;
    }
    setApplyingPreset(true);
    try {
      const res = await authApi.post(`/superadmin/schools/${id}/apply-preset`);
      showSuccess(res.data?.message || "Standard academic preset applied successfully!");
      setClasses(res.data?.classes || []);
      setSections(res.data?.sections || []);
      setDepartments(res.data?.departments || []);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to apply preset.");
    } finally {
      setApplyingPreset(false);
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim() || !id) return;
    setSavingSection(true);
    try {
      const res = await authApi.post(`/superadmin/schools/${id}/sections`, { name: newSectionName });
      showSuccess(res.data?.message || "Section added.");
      setSections(res.data?.sections || []);
      setNewSectionName("");
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to add section.");
    } finally {
      setSavingSection(false);
    }
  };

  const handleDeleteSection = async (sectionId: number) => {
    if (!id || !window.confirm("Delete this section? Classes assigned to it may lose their section tag.")) return;
    try {
      const res = await authApi.delete(`/superadmin/schools/${id}/sections/${sectionId}`);
      showSuccess(res.data?.message || "Section removed.");
      setSections(res.data?.sections || []);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to delete section.");
    }
  };

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || !id) return;
    setSavingDept(true);
    try {
      const res = await authApi.post(`/superadmin/schools/${id}/departments`, { name: newDeptName });
      showSuccess(res.data?.message || "Department added.");
      setDepartments(res.data?.departments || []);
      setNewDeptName("");
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to add department.");
    } finally {
      setSavingDept(false);
    }
  };

  const handleDeleteDept = async (deptId: number) => {
    if (!id || !window.confirm("Delete this department?")) return;
    try {
      const res = await authApi.delete(`/superadmin/schools/${id}/departments/${deptId}`);
      showSuccess(res.data?.message || "Department removed.");
      setDepartments(res.data?.departments || []);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to delete department.");
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !id) return;
    setSavingClass(true);
    try {
      const res = await authApi.post(`/superadmin/schools/${id}/classes`, {
        name: newClassName,
        section_id: newClassSectionId ? Number(newClassSectionId) : null,
      });
      showSuccess(res.data?.message || "Class added.");
      setClasses(res.data?.classes || []);
      setNewClassName("");
      setNewClassSectionId("");
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to add class.");
    } finally {
      setSavingClass(false);
    }
  };

  const handleDeleteClass = async (classId: number) => {
    if (!id || !window.confirm("Delete this class?")) return;
    try {
      const res = await authApi.delete(`/superadmin/schools/${id}/classes/${classId}`);
      showSuccess(res.data?.message || "Class removed.");
      setClasses(res.data?.classes || []);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to delete class.");
    }
  };

  /* ==========================================================================
     SUBJECTS
     ========================================================================== */
  const handleSeedCurriculum = async (category: string) => {
    if (!id) return;
    setSeedingCurriculum(true);
    try {
      const res = await authApi.post(`/superadmin/schools/${id}/seed-curriculum`, { category });
      showSuccess(res.data?.message || "Curriculum subjects loaded successfully.");
      setSubjects(res.data?.subjects || []);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to seed curriculum subjects.");
    } finally {
      setSeedingCurriculum(false);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim() || !id) return;
    setSavingSubject(true);
    try {
      const res = await authApi.post(`/superadmin/schools/${id}/subjects`, {
        name: newSubjectName,
        subject_code: newSubjectCode,
        section_id: newSubjectSectionId ? Number(newSubjectSectionId) : null,
        department_id: newSubjectDeptId ? Number(newSubjectDeptId) : null,
      });
      showSuccess(res.data?.message || "Subject added.");
      setSubjects(res.data?.subjects || []);
      setNewSubjectName("");
      setNewSubjectCode("");
      setNewSubjectSectionId("");
      setNewSubjectDeptId("");
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to add subject.");
    } finally {
      setSavingSubject(false);
    }
  };

  const handleDeleteSubject = async (subId: number) => {
    if (!id || !window.confirm("Delete this subject?")) return;
    try {
      const res = await authApi.delete(`/superadmin/schools/${id}/subjects/${subId}`);
      showSuccess(res.data?.message || "Subject removed.");
      setSubjects(res.data?.subjects || []);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to delete subject.");
    }
  };

  const filteredSubjects = useMemo(() => {
    const s = subjectSearch.trim().toLowerCase();
    if (!s) return subjects;
    return subjects.filter((item) => item.name.toLowerCase().includes(s) || (item.subject_code || "").toLowerCase().includes(s));
  }, [subjects, subjectSearch]);

  /* ==========================================================================
     STUDENTS EXCEL IMPORT
     ========================================================================== */
  const handleDownloadTemplate = async () => {
    if (!id) return;
    try {
      const res = await authApi.get(`/superadmin/schools/${id}/student-template`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${school?.school_name || "School"}-Student-Import-Template.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      showSuccess("Template downloaded.");
    } catch (err: any) {
      showError("Failed to download student template.");
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setImportFile(file);
    setPreviewingFile(true);
    setPreviewData(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await authApi.post(`/superadmin/schools/${id}/preview-students`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPreviewData(res.data);
      showSuccess(`File validated: ${res.data?.summary?.ready ?? 0} valid students found.`);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to preview student Excel file.");
    } finally {
      setPreviewingFile(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!importFile || !id) return;
    setImportingStudents(true);

    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const res = await authApi.post(`/superadmin/schools/${id}/import-students`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showSuccess(res.data?.message || `Successfully imported ${res.data?.imported} students!`);
      setStudentCount(res.data?.total_students || 0);
      setImportFile(null);
      setPreviewData(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setActiveTab("checklist");
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to import students.");
    } finally {
      setImportingStudents(false);
    }
  };

  /* ==========================================================================
     HANDOVER & CHECKLIST
     ========================================================================== */
  const ownerPhoneClean = (owner?.phone || school?.phone || "").replace(/[^0-9]/g, "");
  const waPhone = ownerPhoneClean.startsWith("0") ? "234" + ownerPhoneClean.slice(1) : ownerPhoneClean;
  const ownerName = `${owner?.firstname || ""} ${owner?.surname || ""}`.trim() || "School Administrator";

  const handoverMessage = encodeURIComponent(
    `Good day ${ownerName} of ${school?.school_name || "your school"},\n\n` +
      `Exciting news! The SchoolProfit onboarding team has finished configuring your portal's basic setup:\n` +
      `✓ Official School Branding & Admission Numbering (${prefix || "Auto"}...${surfix || ""})\n` +
      `✓ Academic Structure (${classes.length} Classes & ${sections.length} Sections configured)\n` +
      `✓ Subject Catalog (${subjects.length} Subjects provisioned)\n` +
      `✓ Student Roster (${studentCount} Students successfully imported)\n\n` +
      `You and your team can now log in at https://schoolprofit.ng/login to begin using GradeQuest SchoolProfit!\n\n` +
      `Let us know if you need any additional assistance.`
  );

  if (loading) {
    return (
      <>
        <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="School Setup" />
        <div className="container-fluid">
          <div className="row">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <main className="col-md-9 col-lg-10 ms-auto db-main p-3 p-md-4 d-flex flex-column min-vh-100 justify-content-center align-items-center">
              <Loader message="Loading school setup workspace..." />
            </main>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Basic School Setup & Onboarding" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="col-md-9 col-lg-10 ms-auto db-main p-3 p-md-4 d-flex flex-column min-vh-100">
            <div className="container-fluid p-0" style={{ maxWidth: 1300 }}>
            {/* TOP BREADCRUMB & HEADER */}
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 mb-2"
                  style={{ borderRadius: 8 }}
                  onClick={() => navigate("/superadmin/subscribers")}
                >
                  <i className="bi bi-arrow-left" /> Back to School Directory
                </button>
                <div className="d-flex align-items-center gap-2">
                  <h3 className="fw-bold mb-0 text-dark">{school?.school_name || "School Setup"}</h3>
                  <span className="badge bg-primary px-2 py-1" style={{ borderRadius: 6, fontSize: 11 }}>
                    ID: {school?.id}
                  </span>
                </div>
                <div className="text-muted small">
                  Proprietor: <strong className="text-dark">{ownerName}</strong> • {owner?.email || school?.email || "No email"} •{" "}
                  {owner?.phone || school?.phone || "No phone"}
                </div>
              </div>

              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="badge bg-success px-3 py-2" style={{ borderRadius: 8, fontSize: 13 }}>
                  <i className="bi bi-people-fill me-1" />
                  {studentCount} Students Enrolled
                </span>

                {ownerPhoneClean.length >= 8 && (
                  <a
                    href={`https://wa.me/${waPhone}?text=${handoverMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-success fw-bold d-flex align-items-center gap-1"
                    style={{ borderRadius: 8, padding: "6px 12px" }}
                  >
                    <i className="bi bi-whatsapp" />
                    WhatsApp Proprietor
                  </a>
                )}
              </div>
            </div>

            {/* WHITE-GLOVE ONBOARDING BANNER */}
            <div
              className="card border-0 shadow-sm mb-4"
              style={{
                borderRadius: 14,
                background: "linear-gradient(135deg, #0F2744 0%, #1E3A8A 100%)",
                color: "#FFFFFF",
              }}
            >
              <div className="card-body p-3 p-md-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <i className="bi bi-patch-check-fill text-warning fs-5" />
                    <h5 className="fw-bold text-white mb-0">White-Glove School Setup Hub</h5>
                    <span className="badge bg-warning text-dark fw-bold px-2 py-1" style={{ fontSize: 10 }}>
                      Super-Admin &amp; Operations Only
                    </span>
                  </div>
                  <p className="mb-0 text-white-50 small" style={{ maxWidth: 750 }}>
                    Configure the fundamental foundation for newly registered schools: upload their school crest, set admission number prefix &amp; suffix, provision classes and departments, seed curriculum subjects, and bulk import their student roster via Excel.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-light fw-bold btn-sm d-flex align-items-center gap-2 px-3 py-2"
                  style={{ borderRadius: 8, color: "#0F2744" }}
                  onClick={fetchSetupData}
                >
                  <i className="bi bi-arrow-clockwise" />
                  Refresh School Data
                </button>
              </div>
            </div>

            {/* NAVIGATION TABS */}
            <ul className="nav nav-pills mb-4 gap-2 border-bottom pb-2">
              <li className="nav-item">
                <button
                  className={`nav-link fw-bold d-flex align-items-center gap-2 ${activeTab === "branding" ? "active bg-primary text-white" : "text-secondary"}`}
                  style={{ borderRadius: 10, padding: "8px 16px" }}
                  onClick={() => setActiveTab("branding")}
                >
                  <i className="bi bi-palette2" />
                  1. Branding &amp; Numbering
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link fw-bold d-flex align-items-center gap-2 ${activeTab === "academic" ? "active bg-primary text-white" : "text-secondary"}`}
                  style={{ borderRadius: 10, padding: "8px 16px" }}
                  onClick={() => setActiveTab("academic")}
                >
                  <i className="bi bi-building" />
                  2. Classes &amp; Sections ({classes.length})
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link fw-bold d-flex align-items-center gap-2 ${activeTab === "subjects" ? "active bg-primary text-white" : "text-secondary"}`}
                  style={{ borderRadius: 10, padding: "8px 16px" }}
                  onClick={() => setActiveTab("subjects")}
                >
                  <i className="bi bi-book" />
                  3. Subjects ({subjects.length})
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link fw-bold d-flex align-items-center gap-2 ${activeTab === "students" ? "active bg-primary text-white" : "text-secondary"}`}
                  style={{ borderRadius: 10, padding: "8px 16px" }}
                  onClick={() => setActiveTab("students")}
                >
                  <i className="bi bi-file-earmark-spreadsheet" />
                  4. Student Excel Import ({studentCount})
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link fw-bold d-flex align-items-center gap-2 ${activeTab === "checklist" ? "active bg-primary text-white" : "text-secondary"}`}
                  style={{ borderRadius: 10, padding: "8px 16px" }}
                  onClick={() => setActiveTab("checklist")}
                >
                  <i className="bi bi-check2-circle" />
                  5. Handover Checklist
                </button>
              </li>
            </ul>

            {/* TAB CONTENT */}

            {/* TAB 1: BRANDING & IDENTITY */}
            {activeTab === "branding" && (
              <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
                <div className="card-body p-4">
                  <h5 className="fw-bold text-dark mb-1">School Branding &amp; Registration Numbering</h5>
                  <p className="text-muted small mb-4">
                    Upload the official school crest/logo and specify how student admission numbers are formatted (Prefix and Suffix).
                  </p>

                  <form onSubmit={handleSaveBranding}>
                    <div className="row g-4">
                      {/* Logo Section */}
                      <div className="col-md-4">
                        <label className="form-label fw-bold text-dark small">School Crest / Logo</label>
                        <div
                          className="border border-2 border-dashed rounded p-3 text-center d-flex flex-column align-items-center justify-content-center"
                          style={{ minHeight: 180, background: "#F8FAFC", borderColor: "#CBD5E1" }}
                        >
                          {logoPreview ? (
                            <div className="position-relative mb-2">
                              <img
                                src={logoPreview}
                                alt="School Logo"
                                style={{ maxHeight: 110, maxWidth: "100%", objectFit: "contain", borderRadius: 8 }}
                              />
                            </div>
                          ) : (
                            <i className="bi bi-image text-muted fs-1 mb-2" />
                          )}
                          <label className="btn btn-outline-primary btn-sm mb-0 cursor-pointer" style={{ borderRadius: 8 }}>
                            <i className="bi bi-upload me-1" />
                            {logoPreview ? "Change Logo" : "Choose Logo File"}
                            <input type="file" accept="image/*" className="d-none" onChange={handleLogoChange} />
                          </label>
                          <small className="text-muted mt-2" style={{ fontSize: 11 }}>
                            PNG, JPG or WEBP (Max 4MB)
                          </small>
                        </div>
                      </div>

                      {/* Prefix & Suffix & Colors */}
                      <div className="col-md-8">
                        <div className="row g-3">
                          {/* Prefix */}
                          <div className="col-sm-6">
                            <label className="form-label fw-bold text-dark small">
                              Admission Prefix <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              style={{ borderRadius: 8 }}
                              placeholder="e.g. GQS/ or DPS/"
                              value={prefix}
                              onChange={(e) => setPrefix(e.target.value)}
                            />
                            <small className="text-muted" style={{ fontSize: 11 }}>
                              Appears at the start of admission numbers.
                            </small>
                          </div>

                          {/* Suffix / Surfix */}
                          <div className="col-sm-6">
                            <label className="form-label fw-bold text-dark small">
                              Admission Suffix / Surfix <span className="text-muted fw-normal">(Optional)</span>
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              style={{ borderRadius: 8 }}
                              placeholder="e.g. /2026 or /26"
                              value={surfix}
                              onChange={(e) => setSurfix(e.target.value)}
                            />
                            <small className="text-muted" style={{ fontSize: 11 }}>
                              Appears at the end of admission numbers.
                            </small>
                          </div>

                          {/* Live Preview Box */}
                          <div className="col-12">
                            <div className="p-3 bg-light rounded border d-flex align-items-center justify-content-between">
                              <div>
                                <span className="text-muted small fw-bold d-block">Generated Admission Number Preview:</span>
                                <span className="fs-5 fw-bold font-monospace text-primary">
                                  {prefix || "GQ"}847291{surfix || ""}
                                </span>
                              </div>
                              <span className="badge bg-secondary">Sample Output</span>
                            </div>
                          </div>

                          {/* Primary Color */}
                          <div className="col-sm-6">
                            <label className="form-label fw-bold text-dark small">Primary Brand Color</label>
                            <div className="input-group">
                              <input
                                type="color"
                                className="form-control form-control-color"
                                style={{ borderRadius: "8px 0 0 8px", width: 50 }}
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                              />
                              <input
                                type="text"
                                className="form-control font-monospace"
                                style={{ borderRadius: "0 8px 8px 0" }}
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Secondary Color */}
                          <div className="col-sm-6">
                            <label className="form-label fw-bold text-dark small">Secondary Accent Color</label>
                            <div className="input-group">
                              <input
                                type="color"
                                className="form-control form-control-color"
                                style={{ borderRadius: "8px 0 0 8px", width: 50 }}
                                value={secondaryColor}
                                onChange={(e) => setSecondaryColor(e.target.value)}
                              />
                              <input
                                type="text"
                                className="form-control font-monospace"
                                style={{ borderRadius: "0 8px 8px 0" }}
                                value={secondaryColor}
                                onChange={(e) => setSecondaryColor(e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Auto Admission */}
                          <div className="col-12">
                            <div className="form-check form-switch mt-2">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="autoAdmissionSwitch"
                                checked={autoAdmission}
                                onChange={(e) => setAutoAdmission(e.target.checked)}
                              />
                              <label className="form-check-label small fw-bold text-dark" htmlFor="autoAdmissionSwitch">
                                Enable Automatic Admission Number Generation
                              </label>
                              <div className="text-muted small" style={{ fontSize: 11 }}>
                                Automatically assigns unique numbers (Prefix + Random 6-Digits + Suffix) during student import and manual registration.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-end mt-4 pt-3 border-top gap-2">
                      <button
                        type="submit"
                        className="btn btn-primary fw-bold px-4"
                        style={{ borderRadius: 8, background: "#0F2744", borderColor: "#0F2744" }}
                        disabled={savingBranding}
                      >
                        {savingBranding ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" />
                            Saving Branding...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check2-circle me-1" />
                            Save School Branding
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TAB 2: ACADEMIC STRUCTURE */}
            {activeTab === "academic" && (
              <div className="row g-4">
                {/* PRESET BANNER */}
                <div className="col-12">
                  <div className="alert alert-info border-0 shadow-sm d-flex justify-content-between align-items-center flex-wrap gap-2 p-3" style={{ borderRadius: 12 }}>
                    <div>
                      <strong className="d-block">⚡ Need a Quick Start?</strong>
                      <span className="small text-muted">
                        Click the preset button to automatically create Junior &amp; Senior sections, general academic departments, and standard JSS 1-3 &amp; SSS 1-3 classes.
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm fw-bold px-3 py-2"
                      style={{ borderRadius: 8, background: "#1E3A8A" }}
                      onClick={handleApplyPreset}
                      disabled={applyingPreset}
                    >
                      {applyingPreset ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" />
                          Applying Preset...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-magic me-1" />
                          Apply Standard Nigerian Preset (1-Click)
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* SECTIONS */}
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold text-dark mb-0">
                          <i className="bi bi-diagram-3 text-primary me-1" />
                          Sections ({sections.length})
                        </h6>
                      </div>
                      <p className="text-muted small mb-3">e.g. Nursery, Primary, Junior, Senior</p>

                      <form onSubmit={handleAddSection} className="d-flex gap-2 mb-3">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Add new section..."
                          value={newSectionName}
                          onChange={(e) => setNewSectionName(e.target.value)}
                        />
                        <button type="submit" className="btn btn-sm btn-dark fw-bold px-3" disabled={savingSection || !newSectionName.trim()}>
                          Add
                        </button>
                      </form>

                      <div className="list-group list-group-flush" style={{ maxHeight: 320, overflowY: "auto" }}>
                        {sections.length === 0 ? (
                          <div className="text-center text-muted py-4 small">No sections created yet.</div>
                        ) : (
                          sections.map((sec) => (
                            <div key={sec.id} className="list-group-item px-2 py-2 d-flex justify-content-between align-items-center">
                              <span className="fw-semibold text-dark small">{sec.name}</span>
                              <button
                                type="button"
                                className="btn btn-sm text-danger p-0"
                                onClick={() => handleDeleteSection(sec.id)}
                                title="Delete Section"
                              >
                                <i className="bi bi-trash" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* DEPARTMENTS */}
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold text-dark mb-0">
                          <i className="bi bi-diagram-2 text-warning me-1" />
                          Departments ({departments.length})
                        </h6>
                      </div>
                      <p className="text-muted small mb-3">e.g. Science, Arts, Commercial, General</p>

                      <form onSubmit={handleAddDept} className="d-flex gap-2 mb-3">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Add new department..."
                          value={newDeptName}
                          onChange={(e) => setNewDeptName(e.target.value)}
                        />
                        <button type="submit" className="btn btn-sm btn-dark fw-bold px-3" disabled={savingDept || !newDeptName.trim()}>
                          Add
                        </button>
                      </form>

                      <div className="list-group list-group-flush" style={{ maxHeight: 320, overflowY: "auto" }}>
                        {departments.length === 0 ? (
                          <div className="text-center text-muted py-4 small">No departments created yet.</div>
                        ) : (
                          departments.map((dept) => (
                            <div key={dept.id} className="list-group-item px-2 py-2 d-flex justify-content-between align-items-center">
                              <span className="fw-semibold text-dark small">{dept.name}</span>
                              <button
                                type="button"
                                className="btn btn-sm text-danger p-0"
                                onClick={() => handleDeleteDept(dept.id)}
                                title="Delete Department"
                              >
                                <i className="bi bi-trash" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CLASSES */}
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold text-dark mb-0">
                          <i className="bi bi-mortarboard text-success me-1" />
                          Classes ({classes.length})
                        </h6>
                      </div>
                      <p className="text-muted small mb-3">e.g. JSS 1, JSS 2, SSS 1, Primary 1</p>

                      <form onSubmit={handleAddClass} className="d-flex flex-column gap-2 mb-3">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Class name (e.g. JSS 1)"
                          value={newClassName}
                          onChange={(e) => setNewClassName(e.target.value)}
                        />
                        <div className="d-flex gap-2">
                          <select
                            className="form-select form-select-sm"
                            value={newClassSectionId}
                            onChange={(e) => setNewClassSectionId(e.target.value)}
                          >
                            <option value="">Link Section (Optional)</option>
                            {sections.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          <button type="submit" className="btn btn-sm btn-dark fw-bold px-3" disabled={savingClass || !newClassName.trim()}>
                            Add
                          </button>
                        </div>
                      </form>

                      <div className="list-group list-group-flush" style={{ maxHeight: 320, overflowY: "auto" }}>
                        {classes.length === 0 ? (
                          <div className="text-center text-muted py-4 small">No classes created yet.</div>
                        ) : (
                          classes.map((cls) => (
                            <div key={cls.id} className="list-group-item px-2 py-2 d-flex justify-content-between align-items-center">
                              <div>
                                <span className="fw-semibold text-dark small d-block">{cls.name}</span>
                                {cls.section?.name && (
                                  <span className="badge bg-light text-secondary border" style={{ fontSize: 10 }}>
                                    {cls.section.name}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm text-danger p-0"
                                onClick={() => handleDeleteClass(cls.id)}
                                title="Delete Class"
                              >
                                <i className="bi bi-trash" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SUBJECTS */}
            {activeTab === "subjects" && (
              <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                    <div>
                      <h5 className="fw-bold text-dark mb-1">Curriculum &amp; School Subjects</h5>
                      <p className="text-muted small mb-0">
                        Seed standard Nigerian WAEC/NECO curriculum subjects with 1 click or manually register specific subjects.
                      </p>
                    </div>

                    {/* Quick Seed Buttons */}
                    <div className="d-flex gap-2 flex-wrap">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary fw-bold"
                        style={{ borderRadius: 8, background: "#0F2744" }}
                        onClick={() => handleSeedCurriculum("all")}
                        disabled={seedingCurriculum}
                      >
                        <i className="bi bi-lightning-charge me-1" />
                        Seed All Standard Subjects
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary fw-semibold"
                        style={{ borderRadius: 8 }}
                        onClick={() => handleSeedCurriculum("junior")}
                        disabled={seedingCurriculum}
                      >
                        Seed Junior (JSS)
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary fw-semibold"
                        style={{ borderRadius: 8 }}
                        onClick={() => handleSeedCurriculum("senior_core")}
                        disabled={seedingCurriculum}
                      >
                        Seed Senior (SSS)
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary fw-semibold"
                        style={{ borderRadius: 8 }}
                        onClick={() => handleSeedCurriculum("primary")}
                        disabled={seedingCurriculum}
                      >
                        Seed Primary
                      </button>
                    </div>
                  </div>

                  {/* Add Subject Form */}
                  <div className="p-3 bg-light rounded border mb-4">
                    <span className="small fw-bold text-dark d-block mb-2">Register Single Custom Subject:</span>
                    <form onSubmit={handleAddSubject} className="row g-2 align-items-center">
                      <div className="col-md-4">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Subject Name (e.g. Robotics)"
                          value={newSubjectName}
                          onChange={(e) => {
                            setNewSubjectName(e.target.value);
                            if (!newSubjectCode) {
                              const autoCode = e.target.value.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
                              setNewSubjectCode(autoCode);
                            }
                          }}
                        />
                      </div>
                      <div className="col-md-2">
                        <input
                          type="text"
                          className="form-control form-control-sm font-monospace"
                          placeholder="Code (e.g. ROB)"
                          value={newSubjectCode}
                          onChange={(e) => setNewSubjectCode(e.target.value.toUpperCase())}
                        />
                      </div>
                      <div className="col-md-3">
                        <select
                          className="form-select form-select-sm"
                          value={newSubjectSectionId}
                          onChange={(e) => setNewSubjectSectionId(e.target.value)}
                        >
                          <option value="">All / Any Section</option>
                          {sections.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-2">
                        <select
                          className="form-select form-select-sm"
                          value={newSubjectDeptId}
                          onChange={(e) => setNewSubjectDeptId(e.target.value)}
                        >
                          <option value="">All / General Dept</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-1">
                        <button type="submit" className="btn btn-sm btn-dark w-100 fw-bold" disabled={savingSubject || !newSubjectName.trim()}>
                          Add
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Filter & Subjects Table */}
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="small text-muted fw-bold">Active Subjects List ({subjects.length})</span>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      style={{ maxWidth: 260 }}
                      placeholder="Search subjects..."
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                    />
                  </div>

                  <div className="table-responsive" style={{ maxHeight: 420, overflowY: "auto" }}>
                    <table className="table table-hover align-middle mb-0">
                      <thead style={{ background: "#F8FAFC" }}>
                        <tr>
                          <th style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Subject Name</th>
                          <th style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Code</th>
                          <th style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Section</th>
                          <th style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Department</th>
                          <th style={{ fontSize: 12, fontWeight: 700, color: "#475569", width: 60 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubjects.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center text-muted py-4 small">
                              No subjects registered yet. Use the 1-click seed buttons above to load standard Nigerian subjects!
                            </td>
                          </tr>
                        ) : (
                          filteredSubjects.map((sub) => (
                            <tr key={sub.id}>
                              <td>
                                <span className="fw-semibold text-dark small">{sub.name}</span>
                              </td>
                              <td>
                                <span className="badge bg-light text-dark border font-monospace" style={{ fontSize: 11 }}>
                                  {sub.subject_code || sub.subject_id || "—"}
                                </span>
                              </td>
                              <td>
                                <span className="text-secondary small">{sub.section?.name || "All"}</span>
                              </td>
                              <td>
                                <span className="text-secondary small">{sub.department?.name || "General"}</span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-sm text-danger p-0"
                                  onClick={() => handleDeleteSubject(sub.id)}
                                  title="Delete Subject"
                                >
                                  <i className="bi bi-trash" />
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

            {/* TAB 4: STUDENT EXCEL IMPORT */}
            {activeTab === "students" && (
              <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                    <div>
                      <h5 className="fw-bold text-dark mb-1">Bulk Student Excel Import</h5>
                      <p className="text-muted small mb-0">
                        Upload student roster directly into <strong>{school?.school_name}</strong> without needing their login credentials.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm fw-bold d-flex align-items-center gap-1"
                      style={{ borderRadius: 8 }}
                      onClick={handleDownloadTemplate}
                    >
                      <i className="bi bi-download" />
                      Download Excel Template (.xlsx)
                    </button>
                  </div>

                  {/* Template Info Alert */}
                  <div className="alert alert-light border rounded p-3 mb-4 small text-secondary">
                    <i className="bi bi-info-circle-fill text-primary me-2" />
                    <strong>Note:</strong> The downloaded template is automatically populated with the school's configured classes ({classes.map((c) => c.name).slice(0, 4).join(", ")}...). Department and section are completely optional.
                  </div>

                  {/* Upload Box */}
                  <div
                    className="border border-2 border-dashed rounded p-4 text-center d-flex flex-column align-items-center justify-content-center mb-4"
                    style={{ background: "#F8FAFC", borderColor: "#CBD5E1", minHeight: 160 }}
                  >
                    <i className="bi bi-file-earmark-excel text-success fs-1 mb-2" />
                    <h6 className="fw-bold text-dark mb-1">
                      {importFile ? importFile.name : "Select or Drop Student Excel File"}
                    </h6>
                    <span className="text-muted small mb-3">Accepts .xlsx, .xls, or .csv (Max 10MB)</span>

                    <label className="btn btn-primary btn-sm px-4 fw-bold cursor-pointer" style={{ borderRadius: 8, background: "#0F2744" }}>
                      <i className="bi bi-folder2-open me-1" />
                      Browse File
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        className="d-none"
                        onChange={handleFileSelect}
                      />
                    </label>
                  </div>

                  {/* PREVIEW LOADER */}
                  {previewingFile && (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status" />
                      <div className="small text-muted mt-2">Validating and parsing student rows...</div>
                    </div>
                  )}

                  {/* PREVIEW RESULTS TABLE */}
                  {previewData && (
                    <div>
                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 p-3 bg-light rounded border mb-3">
                        <div className="d-flex gap-3 align-items-center">
                          <div>
                            <span className="text-muted small d-block">Total Rows</span>
                            <strong className="fs-5 text-dark">{previewData?.summary?.total ?? 0}</strong>
                          </div>
                          <div className="border-start ps-3">
                            <span className="text-success small d-block">Ready to Import</span>
                            <strong className="fs-5 text-success">{previewData?.summary?.ready ?? 0}</strong>
                          </div>
                          {previewData?.summary?.errors > 0 && (
                            <div className="border-start ps-3">
                              <span className="text-danger small d-block">Errors Found</span>
                              <strong className="fs-5 text-danger">{previewData?.summary?.errors}</strong>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          className="btn btn-success fw-bold px-4 py-2"
                          style={{ borderRadius: 8 }}
                          onClick={handleExecuteImport}
                          disabled={importingStudents || (previewData?.summary?.ready ?? 0) === 0}
                        >
                          {importingStudents ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1" />
                              Importing Students...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-check2-all me-1" />
                              Confirm &amp; Import {previewData?.summary?.ready ?? 0} Students
                            </>
                          )}
                        </button>
                      </div>

                      {/* Preview Rows Table */}
                      <div className="table-responsive" style={{ maxHeight: 350, overflowY: "auto" }}>
                        <table className="table table-sm table-bordered align-middle small mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>#</th>
                              <th>Name</th>
                              <th>Gender</th>
                              <th>Class</th>
                              <th>Section</th>
                              <th>Department</th>
                              <th>Admission No</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.rows?.slice(0, 50).map((r: any, idx: number) => (
                              <tr key={idx} className={r.status === "error" ? "table-danger" : ""}>
                                <td>{idx + 1}</td>
                                <td>
                                  <strong>{r.surname}</strong> {r.firstname} {r.third_name || ""}
                                </td>
                                <td>{r.gender || "—"}</td>
                                <td>{r.class_name || "—"}</td>
                                <td>{r.section_name || "Auto"}</td>
                                <td>{r.department_name || "None"}</td>
                                <td>
                                  <span className="font-monospace text-primary">{r.admission_no || "Auto-Assign"}</span>
                                </td>
                                <td>
                                  <span className={`badge ${r.status === "ready" ? "bg-success" : "bg-danger"}`}>
                                    {r.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: HANDOVER CHECKLIST */}
            {activeTab === "checklist" && (
              <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
                <div className="card-body p-4">
                  <h5 className="fw-bold text-dark mb-1">Onboarding Handover &amp; Completion Status</h5>
                  <p className="text-muted small mb-4">
                    Review the basic setup checklist and notify the school owner that their portal is ready.
                  </p>

                  <div className="row g-3 mb-4">
                    {/* Checklist Items */}
                    <div className="col-md-6">
                      <div className="p-3 border rounded d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <i className={`bi ${school?.logo ? "bi-check-circle-fill text-success" : "bi-circle text-muted"} fs-5`} />
                          <div>
                            <span className="fw-bold text-dark small d-block">School Crest / Logo Upload</span>
                            <span className="text-muted" style={{ fontSize: 11 }}>
                              {school?.logo ? "Uploaded & configured" : "Pending upload"}
                            </span>
                          </div>
                        </div>
                        <button type="button" className="btn btn-sm btn-link p-0" onClick={() => setActiveTab("branding")}>
                          Edit
                        </button>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="p-3 border rounded d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <i className={`bi ${prefix ? "bi-check-circle-fill text-success" : "bi-circle text-muted"} fs-5`} />
                          <div>
                            <span className="fw-bold text-dark small d-block">Admission Number Prefix &amp; Suffix</span>
                            <span className="text-muted" style={{ fontSize: 11 }}>
                              Prefix: {prefix || "GQ"} | Suffix: {surfix || "None"}
                            </span>
                          </div>
                        </div>
                        <button type="button" className="btn btn-sm btn-link p-0" onClick={() => setActiveTab("branding")}>
                          Edit
                        </button>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="p-3 border rounded d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <i className={`bi ${classes.length > 0 ? "bi-check-circle-fill text-success" : "bi-circle text-muted"} fs-5`} />
                          <div>
                            <span className="fw-bold text-dark small d-block">Academic Classes &amp; Sections</span>
                            <span className="text-muted" style={{ fontSize: 11 }}>
                              {classes.length} Classes, {sections.length} Sections
                            </span>
                          </div>
                        </div>
                        <button type="button" className="btn btn-sm btn-link p-0" onClick={() => setActiveTab("academic")}>
                          Manage
                        </button>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="p-3 border rounded d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          <i className={`bi ${subjects.length > 0 ? "bi-check-circle-fill text-success" : "bi-circle text-muted"} fs-5`} />
                          <div>
                            <span className="fw-bold text-dark small d-block">Curriculum Subjects</span>
                            <span className="text-muted" style={{ fontSize: 11 }}>
                              {subjects.length} Subjects provisioned
                            </span>
                          </div>
                        </div>
                        <button type="button" className="btn btn-sm btn-link p-0" onClick={() => setActiveTab("subjects")}>
                          Manage
                        </button>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="p-3 border rounded d-flex align-items-center justify-content-between bg-light">
                        <div className="d-flex align-items-center gap-2">
                          <i className={`bi ${studentCount > 0 ? "bi-check-circle-fill text-success" : "bi-exclamation-circle text-warning"} fs-5`} />
                          <div>
                            <span className="fw-bold text-dark small d-block">Student Roster Import</span>
                            <span className="text-muted" style={{ fontSize: 11 }}>
                              {studentCount > 0 ? `${studentCount} Students actively enrolled` : "No students imported yet"}
                            </span>
                          </div>
                        </div>
                        <button type="button" className="btn btn-sm btn-primary fw-bold" onClick={() => setActiveTab("students")}>
                          Import More Students
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* WHATSAPP HANDOVER DESK */}
                  <div
                    className="p-3 rounded border d-flex justify-content-between align-items-center flex-wrap gap-3"
                    style={{ background: "#F0FDF4", borderColor: "#BBF7D0" }}
                  >
                    <div>
                      <strong className="text-success d-block">
                        <i className="bi bi-whatsapp me-1" />
                        Ready to notify {ownerName}?
                      </strong>
                      <span className="small text-muted">
                        Send a formatted WhatsApp handover message confirming that their basic setup and student roster have been configured.
                      </span>
                    </div>

                    {ownerPhoneClean.length >= 8 ? (
                      <a
                        href={`https://wa.me/${waPhone}?text=${handoverMessage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-success fw-bold px-3 py-2 d-flex align-items-center gap-2"
                        style={{ borderRadius: 8 }}
                      >
                        <i className="bi bi-whatsapp" />
                        Send WhatsApp Handover Message
                      </a>
                    ) : (
                      <span className="badge bg-secondary">No Phone on Profile</span>
                    )}
                  </div>
                </div>
              </div>
            )}
            </div>
            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}
