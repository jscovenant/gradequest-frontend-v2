import { useEffect, useMemo, useState } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";

type AssignedClass = { id: number; name: string; section_id?: number | null; section_name?: string | null };
type Teacher = { id: number; firstname?: string; surname?: string; email?: string | null; reg_no?: string | null; username?: string | null; teacher_status?: string | null; assigned_classes?: AssignedClass[] };
type Subject = { id: number; name: string; section_id?: number | null; department_id?: number | null; class_id?: number | null; section_name?: string | null; department_name?: string | null };
type Assignment = { teacher_id: number; subject_id: number; teacher?: Teacher | null; subject?: Subject | null };

const capitalize = (value?: string | null) => {
  const text = String(value || "").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : "";
};

const fullName = (teacher?: Teacher | null) => [capitalize(teacher?.firstname), capitalize(teacher?.surname)].filter(Boolean).join(" ") || "Unnamed teacher";

export default function TeacherSubjectsPage() {
  const { showSuccess, showError } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | "">("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");

  const loadWorkspace = async () => {
    setLoading(true);
    try {
      const res = await authApi.get("/teacher-subjects/workspace");
      const nextTeachers: Teacher[] = res.data?.teachers || [];
      const nextSubjects: Subject[] = res.data?.subjects || [];
      const nextAssignments: Assignment[] = res.data?.assignments || [];
      setTeachers(nextTeachers);
      setSubjects(nextSubjects);
      setAssignments(nextAssignments);

      if (!selectedTeacherId && nextTeachers.length > 0) {
        setSelectedTeacherId(nextTeachers[0].id);
      }
    } catch (err: any) {
      showError(err?.response?.data?.message || "Unable to load teacher subject assignments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTeacher = useMemo(() => teachers.find((teacher) => teacher.id === Number(selectedTeacherId)) || null, [teachers, selectedTeacherId]);
  const selectedTeacherAssignments = useMemo(() => assignments.filter((item) => item.teacher_id === Number(selectedTeacherId)), [assignments, selectedTeacherId]);

  useEffect(() => {
    setSelectedSubjectIds(selectedTeacherAssignments.map((item) => item.subject_id));
  }, [selectedTeacherAssignments]);

  const eligibleSubjects = useMemo(() => {
    if (!selectedTeacher) return [];
    const classIds = new Set((selectedTeacher.assigned_classes || []).map((item) => Number(item.id)).filter(Boolean));
    const sectionIds = new Set((selectedTeacher.assigned_classes || []).map((item) => Number(item.section_id)).filter(Boolean));
    const q = subjectSearch.trim().toLowerCase();

    return subjects.filter((subject) => {
      const classOk = !subject.class_id || subject.class_id === 0 || classIds.has(Number(subject.class_id));
      const sectionOk = !subject.section_id || sectionIds.size === 0 || sectionIds.has(Number(subject.section_id));
      const searchOk = !q || subject.name.toLowerCase().includes(q) || String(subject.section_name || "").toLowerCase().includes(q) || String(subject.department_name || "").toLowerCase().includes(q);
      return classOk && sectionOk && searchOk;
    });
  }, [selectedTeacher, subjects, subjectSearch]);

  const filteredTeachers = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((teacher) => `${teacher.firstname || ""} ${teacher.surname || ""} ${teacher.email || ""} ${teacher.reg_no || ""} ${teacher.username || ""}`.toLowerCase().includes(q));
  }, [teachers, teacherSearch]);

  const assignedCountByTeacher = useMemo(() => {
    const map = new Map<number, number>();
    assignments.forEach((item) => map.set(item.teacher_id, (map.get(item.teacher_id) || 0) + 1));
    return map;
  }, [assignments]);

  const toggleSubject = (subjectId: number) => {
    setSelectedSubjectIds((prev) => prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]);
  };

  const saveAssignments = async () => {
    if (!selectedTeacher) return showError("Select a teacher first.");
    if ((selectedTeacher.assigned_classes || []).length === 0) return showError("This teacher has no assigned class. Assign class first from the teacher profile.");

    setSaving(true);
    try {
      const res = await authApi.post("/teacher-subjects", {
        teacher_id: selectedTeacher.id,
        subject_ids: selectedSubjectIds,
        sync: true,
      });
      showSuccess(res.data?.message || "Teacher subjects saved.");
      if (res.data?.assignments) setAssignments(res.data.assignments);
      await loadWorkspace();
    } catch (err: any) {
      showError(err?.response?.data?.message || "Unable to save teacher subjects.");
    } finally {
      setSaving(false);
    }
  };

  const selectAllVisible = () => {
    const ids = eligibleSubjects.map((subject) => subject.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedSubjectIds.includes(id));
    if (allSelected) {
      setSelectedSubjectIds((prev) => prev.filter((id) => !ids.includes(id)));
      return;
    }
    setSelectedSubjectIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  return <>
    <style>{`
      .ts-main{background:#fbf7f8;min-height:100vh;overflow-x:hidden;font-family:"DM Sans",system-ui,sans-serif}.ts-shell{padding:26px 26px 0}.ts-hero{background:#08020b;color:#fff;border-radius:16px;padding:24px 26px;margin-bottom:16px}.ts-kicker{font-size:11px;text-transform:uppercase;font-weight:900;color:var(--bs-secondary,#ffc857);letter-spacing:.12em}.ts-title{font-family:"Lora",serif;font-size:clamp(25px,3vw,35px);font-weight:900;margin:6px 0}.ts-sub{max-width:820px;color:rgba(255,255,255,.72);font-size:13.5px;line-height:1.7;margin:0}.ts-grid{display:grid;grid-template-columns:360px 1fr;gap:16px;align-items:start}.ts-card{background:#fff;border:1px solid rgba(8,2,11,.08);border-radius:14px;box-shadow:0 12px 32px rgba(8,2,11,.055);overflow:hidden}.ts-pad{padding:16px}.ts-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.ts-head h2{font-size:16px;font-weight:900;color:#181022;margin:0}.ts-muted{font-size:12px;color:#806f78;line-height:1.55;margin:3px 0 0}.ts-input,.ts-select{width:100%;border:1px solid rgba(8,2,11,.12);border-radius:10px;padding:10px 12px;background:#fff;color:#181022;font-weight:700;outline:none}.ts-teacher{width:100%;border:1px solid rgba(8,2,11,.08);background:#fff;border-radius:12px;padding:12px;text-align:left;margin-bottom:8px}.ts-teacher.active{border-color:var(--bs-primary,#d300b0);box-shadow:0 0 0 3px rgba(211,0,176,.12)}.ts-name{font-weight:900;color:#181022}.ts-pill{display:inline-flex;border-radius:999px;padding:5px 9px;background:#f3eef2;color:#3c3039;font-size:11px;font-weight:900}.ts-pill.ok{background:#dcfce7;color:#166534}.ts-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.ts-class-list{display:flex;gap:8px;flex-wrap:wrap}.ts-subject-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-height:520px;overflow:auto;padding-right:4px}.ts-subject{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;border:1px solid rgba(8,2,11,.08);border-radius:12px;padding:12px;background:#fff;cursor:pointer}.ts-subject.checked{border-color:#16a34a;background:#f0fdf4}.ts-btn{border:0;border-radius:10px;background:var(--bs-primary,#d300b0);color:#fff;font-weight:900;padding:10px 14px}.ts-btn.secondary{background:#fff;color:#181022;border:1px solid rgba(8,2,11,.12)}.ts-actions{display:flex;gap:8px;flex-wrap:wrap}.ts-empty{border:1px dashed rgba(8,2,11,.18);border-radius:14px;padding:28px;text-align:center;color:#806f78;background:#fff}.ts-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}.ts-summary div{border:1px solid rgba(8,2,11,.08);border-radius:12px;padding:12px;background:#fffcf7}.ts-summary span{display:block;font-size:11px;color:#806f78}.ts-summary strong{font-size:20px;color:#181022}@media(max-width:1100px){.ts-grid{grid-template-columns:1fr}.ts-subject-grid{grid-template-columns:1fr}}@media(max-width:767px){.ts-shell{padding:18px 12px 0}.ts-summary{grid-template-columns:1fr}}`}</style>
    <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Teacher Subjects" />
    <div className="container-fluid"><div className="row"><Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <main className="col-md-9 col-lg-10 ms-auto gq-app-main ts-main">
        <div className="ts-shell">
        <PageTitle title="Teacher Subjects" />
        {(loading || saving) && <Loader message={saving ? "Saving assignment..." : "Loading teacher subjects..."} />}
        <section className="ts-hero"><div className="ts-kicker">Academic setup</div><h1 className="ts-title">Assign Subjects to Teachers</h1><p className="ts-sub">Choose a teacher, confirm the assigned class/section, then select the subjects the teacher can use for lesson notes, lesson plans, CBT and result workflows.</p></section>

        <div className="ts-summary"><div><span>Teachers</span><strong>{teachers.length}</strong></div><div><span>Subjects</span><strong>{subjects.length}</strong></div><div><span>Assignments</span><strong>{assignments.length}</strong></div></div>

        <div className="ts-grid">
          <section className="ts-card"><div className="ts-pad"><div className="ts-head"><div><h2>Teachers</h2><p className="ts-muted">Select one teacher to manage subjects.</p></div><button className="ts-btn secondary" onClick={loadWorkspace}>Refresh</button></div><input className="ts-input" placeholder="Search teacher" value={teacherSearch} onChange={(e)=>setTeacherSearch(e.target.value)} />
            <div style={{marginTop:12,maxHeight:620,overflow:"auto"}}>{filteredTeachers.length === 0 ? <div className="ts-empty">No teacher found.</div> : filteredTeachers.map((teacher)=><button key={teacher.id} type="button" className={`ts-teacher ${selectedTeacherId === teacher.id ? "active" : ""}`} onClick={()=>setSelectedTeacherId(teacher.id)}><div className="ts-name">{fullName(teacher)}</div><div className="ts-muted">{teacher.email || teacher.username || teacher.reg_no || `ID ${teacher.id}`}</div><div className="ts-meta"><span className={`ts-pill ${assignedCountByTeacher.get(teacher.id) ? "ok" : ""}`}>{assignedCountByTeacher.get(teacher.id) || 0} subject(s)</span>{(teacher.assigned_classes || []).length ? <span className="ts-pill">{teacher.assigned_classes?.map((c)=>c.name).join(", ")}</span> : <span className="ts-pill">No class</span>}</div></button>)}</div>
          </div></section>

          <section className="ts-card"><div className="ts-pad"><div className="ts-head"><div><h2>{selectedTeacher ? fullName(selectedTeacher) : "Select teacher"}</h2><p className="ts-muted">Subjects are filtered by the teacher assigned class and section.</p></div><div className="ts-actions"><button className="ts-btn secondary" onClick={selectAllVisible} disabled={!selectedTeacher || eligibleSubjects.length === 0}>Select visible</button><button className="ts-btn" onClick={saveAssignments} disabled={!selectedTeacher || saving}>Save Assignment</button></div></div>
            {!selectedTeacher ? <div className="ts-empty">Select a teacher from the left.</div> : <>
              <div className="ts-class-list">{(selectedTeacher.assigned_classes || []).length ? selectedTeacher.assigned_classes?.map((item)=><span className="ts-pill ok" key={item.id}>{item.name}{item.section_name ? ` - ${item.section_name}` : ""}</span>) : <span className="ts-pill">No assigned class. Assign class from teacher profile first.</span>}</div>
              <div style={{margin:"14px 0"}}><input className="ts-input" placeholder="Search eligible subjects" value={subjectSearch} onChange={(e)=>setSubjectSearch(e.target.value)} /></div>
              {eligibleSubjects.length === 0 ? <div className="ts-empty">No eligible subject found for this teacher class/section. Confirm that subjects have been created and linked to the correct section/class.</div> : <div className="ts-subject-grid">{eligibleSubjects.map((subject)=>{ const checked = selectedSubjectIds.includes(subject.id); return <label key={subject.id} className={`ts-subject ${checked ? "checked" : ""}`}><div><div className="ts-name">{subject.name}</div><div className="ts-muted">{subject.section_name || "General section"}{subject.department_name ? ` - ${subject.department_name}` : ""}</div></div><input type="checkbox" checked={checked} onChange={()=>toggleSubject(subject.id)} /></label>; })}</div>}
              <p className="ts-muted" style={{marginTop:12}}>Selected subjects: <strong>{selectedSubjectIds.length}</strong>. Saving will replace the teacher previous subject list with the selected subjects.</p>
            </>}
          </div></section>
        </div>
        </div>
        <Footer />
      </main>
    </div></div>
  </>;
}




