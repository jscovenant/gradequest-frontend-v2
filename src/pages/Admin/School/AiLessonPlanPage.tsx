import { useEffect, useMemo, useState } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";

const safeAiError = (message: string | undefined, fallback: string) => {
  const text = String(message || fallback);
  return /openai|api key|quota|billing|organization|insufficient_quota|provider/i.test(text)
    ? "Something went wrong while processing this AI request. Please try again later."
    : text;
};

type SchemeTopic = { week?: number; topic: string; subtopics?: string[]; objectives?: string[]; activities?: string[]; resources?: string[]; assessment?: string[] };
type LessonScheme = { id: number; title: string; subject: string; class_name: string; term?: string; curriculum?: string; source?: string; topics?: SchemeTopic[]; content?: string; level_id?: number | null; section_id?: number | null; department_id?: number | null; subject_id?: number | null; academic_session_id?: number | null; term_id?: number | null };
type LessonPlanRecord = { id: number; scheme_id?: number | null; subject: string; class_name: string; topic: string; duration_minutes: number; plan: LessonPlan; status: string; level_id?: number | null; section_id?: number | null; department_id?: number | null; subject_id?: number | null; academic_session_id?: number | null; term_id?: number | null };
type LessonNoteRecord = { id: number; scheme_id?: number | null; lesson_plan_id?: number | null; title: string; subject: string; class_name: string; topic: string; content: LessonNote; youtube_videos?: string[]; status: string; published_at?: string; level_id?: number | null; section_id?: number | null; department_id?: number | null; subject_id?: number | null; academic_session_id?: number | null; term_id?: number | null };

type LessonPlan = {
  title: string; subject: string; class: string; topic: string; duration_minutes: number; objectives: string[]; teaching_aids: string[]; previous_knowledge: string; introduction: string; teacher_activities: string[]; learner_activities: string[]; assessment: string[]; homework: string[]; board_summary: string[]; closure: string;
};

type LessonNote = {
  title: string; subject: string; class: string; topic: string; sections?: { heading: string; body: string }[]; examples?: string[]; board_notes?: string[]; class_activity?: string[]; summary?: string[]; homework?: string[]; quiz?: { question: string; answer?: string }[]; youtube_search_terms?: string[]; youtube_recommendations?: { title: string; url: string; verified?: boolean }[];
};

type CreditSummary = {
  remaining_credits: number;
  user_allocation?: {
    allocated_credits: number;
    used_credits: number;
    remaining_credits: number;
    is_unlimited: boolean;
  } | null;
  is_plus_active?: boolean;
  ai_lesson_plan_credit_cost?: number;
  ai_scheme_work_credit_cost?: number;
  ai_lesson_note_credit_cost?: number;
};
type Option = { id: number; name: string; section_id?: number | null; department_id?: number | null; class_id?: number | null };
type CurrentPeriod = { academic_session_id?: number | null; academic_session_name?: string | null; term_id?: number | null; term_name?: string | null };

type NoteEditorState = {
  title: string;
  topic: string;
  sections: { heading: string; body: string }[];
  examplesText: string;
  boardNotesText: string;
  classActivityText: string;
  summaryText: string;
  homeworkText: string;
  quiz: { question: string; answer: string }[];
  youtubeLinksText: string;
};

type PlanEditorState = {
  title: string;
  topic: string;
  duration_minutes: number;
  objectivesText: string;
  teachingAidsText: string;
  previous_knowledge: string;
  introduction: string;
  teacherActivitiesText: string;
  learnerActivitiesText: string;
  assessmentText: string;
  homeworkText: string;
  boardSummaryText: string;
  closure: string;
};

const curriculumOptions = [
  "Nigeria National Curriculum",
  "Lagos State Curriculum",
  "WAEC/NECO Senior Secondary Curriculum",
  "UBE Basic Education Curriculum",
  "British Curriculum",
  "School Custom Curriculum",
];

function noteToEditorState(noteContent?: LessonNote | null, verifiedYt?: string[]): NoteEditorState {
  const c = noteContent || ({} as LessonNote);
  return {
    title: c.title || "",
    topic: c.topic || "",
    sections: Array.isArray(c.sections) && c.sections.length > 0
      ? c.sections.map((s) => ({ heading: s.heading || "", body: s.body || "" }))
      : [{ heading: "1. Key Concept & Lesson Notes", body: "" }],
    examplesText: Array.isArray(c.examples) ? c.examples.join("\n") : "",
    boardNotesText: Array.isArray(c.board_notes) ? c.board_notes.join("\n") : "",
    classActivityText: Array.isArray(c.class_activity) ? c.class_activity.join("\n") : "",
    summaryText: Array.isArray(c.summary) ? c.summary.join("\n") : "",
    homeworkText: Array.isArray(c.homework) ? c.homework.join("\n") : "",
    quiz: Array.isArray(c.quiz) && c.quiz.length > 0
      ? c.quiz.map((q) => ({ question: q.question || "", answer: q.answer || "" }))
      : [{ question: "", answer: "" }],
    youtubeLinksText: Array.isArray(verifiedYt) ? verifiedYt.join("\n") : "",
  };
}

function editorStateToNote(state: NoteEditorState, baseNote?: LessonNote | null): LessonNote {
  const parseLines = (text: string) => text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return {
    title: state.title.trim() || baseNote?.title || "Lesson Note",
    subject: baseNote?.subject || "",
    class: baseNote?.class || "",
    topic: state.topic.trim() || baseNote?.topic || "",
    sections: state.sections.map((s) => ({ heading: s.heading.trim(), body: s.body.trim() })).filter((s) => s.heading || s.body),
    examples: parseLines(state.examplesText),
    board_notes: parseLines(state.boardNotesText),
    class_activity: parseLines(state.classActivityText),
    summary: parseLines(state.summaryText),
    homework: parseLines(state.homeworkText),
    quiz: state.quiz.map((q) => ({ question: q.question.trim(), answer: q.answer.trim() })).filter((q) => q.question),
    youtube_search_terms: baseNote?.youtube_search_terms || [],
    youtube_recommendations: baseNote?.youtube_recommendations || [],
  };
}

function planToEditorState(p?: LessonPlan | null): PlanEditorState {
  const plan = p || ({} as LessonPlan);
  const toLines = (arr?: string[]) => (Array.isArray(arr) ? arr.join("\n") : "");
  return {
    title: plan.title || "",
    topic: plan.topic || "",
    duration_minutes: plan.duration_minutes || 40,
    objectivesText: toLines(plan.objectives),
    teachingAidsText: toLines(plan.teaching_aids),
    previous_knowledge: plan.previous_knowledge || "",
    introduction: plan.introduction || "",
    teacherActivitiesText: toLines(plan.teacher_activities),
    learnerActivitiesText: toLines(plan.learner_activities),
    assessmentText: toLines(plan.assessment),
    homeworkText: toLines(plan.homework),
    boardSummaryText: toLines(plan.board_summary),
    closure: plan.closure || "",
  };
}

function editorStateToPlan(state: PlanEditorState, basePlan?: LessonPlan | null): LessonPlan {
  const parseLines = (text: string) => text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return {
    title: state.title.trim() || basePlan?.title || "Lesson Plan",
    subject: basePlan?.subject || "",
    class: basePlan?.class || "",
    topic: state.topic.trim() || basePlan?.topic || "",
    duration_minutes: Number(state.duration_minutes || 40),
    objectives: parseLines(state.objectivesText),
    teaching_aids: parseLines(state.teachingAidsText),
    previous_knowledge: state.previous_knowledge.trim(),
    introduction: state.introduction.trim(),
    teacher_activities: parseLines(state.teacherActivitiesText),
    learner_activities: parseLines(state.learnerActivitiesText),
    assessment: parseLines(state.assessmentText),
    homework: parseLines(state.homeworkText),
    board_summary: parseLines(state.boardSummaryText),
    closure: state.closure.trim(),
  };
}

function ListBlock({ title, items }: { title: string; items?: string[] }) {
  return (
    <section className="lp-section">
      <h3>{title}</h3>
      {items?.length ? (
        <ol>
          {items.map((item, i) => (
            <li key={`${title}-${i}`}>{item}</li>
          ))}
        </ol>
      ) : (
        <p className="lp-muted">No item saved.</p>
      )}
    </section>
  );
}

function AcademicScopeFields({
  target,
  values,
  classes,
  sections,
  departments,
  subjects,
  onClass,
  onSubject,
  onChange,
  isTeacherScope = false,
}: {
  target: "scheme" | "plan" | "note";
  values: any;
  classes: Option[];
  sections: Option[];
  departments: Option[];
  subjects: Option[];
  onClass: (id: string, target: "scheme" | "plan" | "note") => void;
  onSubject: (id: string, target: "scheme" | "plan" | "note") => void;
  onChange: (patch: any) => void;
  isTeacherScope?: boolean;
}) {
  const selectedClass = classes.find((item) => String(item.id) === String(values.level_id));
  const selectedSection = sections.find((item) => String(item.id) === String(values.section_id));
  const selectedDepartment = departments.find((item) => String(item.id) === String(values.department_id));

  if (isTeacherScope) {
    return (
      <>
        <label className="lp-field">
          <span>Assigned class</span>
          <input className="lp-input" value={selectedClass?.name || values.class || "No class assigned"} readOnly />
          <small className="lp-muted">This is controlled by the school admin.</small>
        </label>
        <label className="lp-field">
          <span>Section</span>
          <input className="lp-input" value={selectedSection?.name || "Auto assigned after subject selection"} readOnly />
          <small className="lp-muted">Section is taken from the selected subject or assigned class.</small>
        </label>
        <label className="lp-field">
          <span>Department</span>
          <input className="lp-input" value={selectedDepartment?.name || "All departments"} readOnly />
          <small className="lp-muted">Department follows the selected subject where applicable.</small>
        </label>
        <label className="lp-field">
          <span>Assigned subject</span>
          <select className="lp-select" value={values.subject_id} onChange={(e) => onSubject(e.target.value, target)}>
            <option value="">Select assigned subject</option>
            {subjects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {subjects.length === 0 ? (
            <small className="lp-muted">No subject has been assigned to this teacher yet. Ask the admin to assign subjects.</small>
          ) : (
            <small className="lp-muted">Only subjects assigned to this teacher are shown.</small>
          )}
        </label>
      </>
    );
  }

  return (
    <>
      <label className="lp-field">
        <span>Class</span>
        <select className="lp-select" value={values.level_id} onChange={(e) => onClass(e.target.value, target)}>
          <option value="">Select class</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="lp-field">
        <span>Section optional</span>
        <select className="lp-select" value={values.section_id} onChange={(e) => onChange({ section_id: e.target.value })}>
          <option value="">All sections</option>
          {sections.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="lp-field">
        <span>Department optional</span>
        <select className="lp-select" value={values.department_id} onChange={(e) => onChange({ department_id: e.target.value })}>
          <option value="">All departments</option>
          {departments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="lp-field">
        <span>Subject</span>
        <select className="lp-select" value={values.subject_id} onChange={(e) => onSubject(e.target.value, target)}>
          <option value="">Select subject</option>
          {subjects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

function NoteView({ note }: { note: LessonNote }) {
  return (
    <>
      {(note.sections || []).map((section, index) => (
        <section className="lp-section" key={index}>
          <h3>{section.heading}</h3>
          <p style={{ whiteSpace: "pre-line" }}>{section.body}</p>
        </section>
      ))}
      <ListBlock title="Examples & Applications" items={note.examples} />
      <ListBlock title="Board Notes / Summary" items={note.board_notes} />
      <ListBlock title="Class Activity" items={note.class_activity} />
      <ListBlock title="Summary Points" items={note.summary} />
      <ListBlock title="Homework / Assignment" items={note.homework} />
      <section className="lp-section">
        <h3>Quick Quiz</h3>
        {note.quiz?.length ? (
          <ol>
            {note.quiz.map((q, i) => (
              <li key={i} className="mb-2">
                <strong>{q.question}</strong>
                {q.answer ? <div className="lp-muted mt-1">Answer: {q.answer}</div> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="lp-muted">No quiz saved.</p>
        )}
      </section>
      <ListBlock title="Suggested YouTube Searches" items={note.youtube_search_terms} />
      {note.youtube_recommendations?.length ? (
        <section className="lp-section">
          <h3>YouTube Recommendation Links</h3>
          {note.youtube_recommendations.map((item, i) => (
            <p key={i}>
              <a href={item.url} target="_blank" rel="noreferrer">
                {item.title}
              </a>
            </p>
          ))}
          <p className="lp-muted">Open and review the video first. Only links you approve in the verified video box will be shown to students.</p>
        </section>
      ) : null}
    </>
  );
}

export default function AiLessonPlanPage() {
  const { showError, showSuccess } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"scheme" | "plan" | "note" | "library">("scheme");
  const [credits, setCredits] = useState<CreditSummary | null>(null);
  const [schemes, setSchemes] = useState<LessonScheme[]>([]);
  const [plans, setPlans] = useState<LessonPlanRecord[]>([]);
  const [notes, setNotes] = useState<LessonNoteRecord[]>([]);
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [note, setNote] = useState<LessonNoteRecord | null>(null);
  const [classes, setClasses] = useState<Option[]>([]);
  const [sections, setSections] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [isTeacherScope, setIsTeacherScope] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<CurrentPeriod | null>(null);
  const [editingSchemeId, setEditingSchemeId] = useState<number | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isEditingPlan, setIsEditingPlan] = useState(false);

  const [noteEditor, setNoteEditor] = useState<NoteEditorState>(noteToEditorState());
  const [planEditor, setPlanEditor] = useState<PlanEditorState>(planToEditorState());

  const [schemeForm, setSchemeForm] = useState({ level_id: "", section_id: "", department_id: "", subject_id: "", academic_session_id: "", term_id: "", subject: "", class: "", term: "", curriculum: curriculumOptions[0], weeks: 12, content: "" });
  const [form, setForm] = useState({ scheme_id: "", level_id: "", section_id: "", department_id: "", subject_id: "", academic_session_id: "", term_id: "", subject: "", class: "", topic: "", duration_minutes: 40, teacher_notes: "" });
  const [noteForm, setNoteForm] = useState({ scheme_id: "", lesson_plan_id: "", level_id: "", section_id: "", department_id: "", subject_id: "", academic_session_id: "", term_id: "", subject: "", class: "", topic: "", depth: "standard", teacher_notes: "", youtube_videos: "" });

  const selectedScheme = useMemo(() => schemes.find((s) => String(s.id) === form.scheme_id || String(s.id) === noteForm.scheme_id), [schemes, form.scheme_id, noteForm.scheme_id]);
  const selectedPlan = useMemo(() => plans.find((p) => String(p.id) === noteForm.lesson_plan_id), [plans, noteForm.lesson_plan_id]);

  const loadWorkspace = async () => {
    try {
      const [workspace, creditRes, classRes, sectionRes, departmentRes, subjectRes] = await Promise.all([
        authApi.get("/admin/ai/lessons/workspace"),
        authApi.get<{ data: CreditSummary }>("/admin/ai/credits"),
        authApi.get("/levels"),
        authApi.get("/sections"),
        authApi.get("/departments"),
        authApi.get("/subjects"),
      ]);
      const scope = workspace.data?.academic_scope || {};
      const teacherScoped = Boolean(scope.is_teacher);
      const loadedClasses = teacherScoped && Array.isArray(scope.classes) ? scope.classes : (Array.isArray(classRes.data) ? classRes.data : classRes.data?.data || []);
      const loadedSubjects = teacherScoped && Array.isArray(scope.subjects) ? scope.subjects : (Array.isArray(subjectRes.data) ? subjectRes.data : subjectRes.data?.data || []);
      const loadedSections = Array.isArray(sectionRes.data) ? sectionRes.data : sectionRes.data?.data || [];
      const loadedDepartments = Array.isArray(departmentRes.data) ? departmentRes.data : departmentRes.data?.data || [];

      setSchemes(workspace.data?.schemes || []);
      setPlans(workspace.data?.lesson_plans || []);
      setNotes(workspace.data?.lesson_notes || []);
      setCredits(creditRes.data?.data || null);
      const period = workspace.data?.current_period || {};
      setCurrentPeriod(period);
      const periodPatch = { academic_session_id: period.academic_session_id ? String(period.academic_session_id) : "", term_id: period.term_id ? String(period.term_id) : "", term: period.term_name || "" };
      setSchemeForm((prev) => ({ ...prev, ...periodPatch }));
      setForm((prev) => ({ ...prev, academic_session_id: periodPatch.academic_session_id, term_id: periodPatch.term_id }));
      setNoteForm((prev) => ({ ...prev, academic_session_id: periodPatch.academic_session_id, term_id: periodPatch.term_id }));
      setIsTeacherScope(teacherScoped);
      setClasses(loadedClasses);
      setSections(loadedSections);
      setDepartments(loadedDepartments);
      setSubjects(loadedSubjects);

      if (teacherScoped && loadedClasses.length > 0) {
        const assignedClass = loadedClasses[0];
        const classPatchData = { level_id: String(assignedClass.id), class: assignedClass.name, section_id: assignedClass.section_id ? String(assignedClass.section_id) : "", academic_session_id: workspace.data?.current_period?.academic_session_id ? String(workspace.data.current_period.academic_session_id) : "", term_id: workspace.data?.current_period?.term_id ? String(workspace.data.current_period.term_id) : "" };
        setSchemeForm((prev) => ({ ...prev, ...classPatchData }));
        setForm((prev) => ({ ...prev, ...classPatchData }));
        setNoteForm((prev) => ({ ...prev, ...classPatchData }));
      }
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to load lesson workspace.");
    }
  };
  useEffect(() => { loadWorkspace(); }, []);

  const classPatch = (id: string, previousClass = "") => {
    const item = classes.find((row) => String(row.id) === id);
    return { level_id: id, class: item?.name || previousClass, section_id: item?.section_id ? String(item.section_id) : "", academic_session_id: currentPeriod?.academic_session_id ? String(currentPeriod.academic_session_id) : "", term_id: currentPeriod?.term_id ? String(currentPeriod.term_id) : "" };
  };

  const subjectPatch = (id: string, current: any) => {
    const item = subjects.find((row) => String(row.id) === id);
    const selectedClass = classes.find((row) => String(row.id) === String(current.level_id));
    return {
      subject_id: id,
      subject: item?.name || current.subject,
      section_id: item?.section_id ? String(item.section_id) : (selectedClass?.section_id ? String(selectedClass.section_id) : current.section_id || ""),
      department_id: item?.department_id ? String(item.department_id) : current.department_id || "",
    };
  };

  const applyClass = (id: string, target: "scheme" | "plan" | "note") => {
    if (target === "scheme") setSchemeForm((p) => ({ ...p, ...classPatch(id, p.class) }));
    if (target === "plan") setForm((p) => ({ ...p, ...classPatch(id, p.class) }));
    if (target === "note") setNoteForm((p) => ({ ...p, ...classPatch(id, p.class) }));
  };

  const applySubject = (id: string, target: "scheme" | "plan" | "note") => {
    if (target === "scheme") setSchemeForm((p) => ({ ...p, ...subjectPatch(id, p) }));
    if (target === "plan") setForm((p) => ({ ...p, ...subjectPatch(id, p) }));
    if (target === "note") setNoteForm((p) => ({ ...p, ...subjectPatch(id, p) }));
  };

  const generateScheme = async () => {
    if (!schemeForm.subject.trim() || !schemeForm.class.trim() || !schemeForm.term.trim()) return showError?.("Enter subject, class, and term.");
    setLoading(true);
    try {
      const res = await authApi.post("/admin/ai/lesson-schemes/generate", schemeForm);
      showSuccess?.("Scheme of work generated and saved.");
      setSchemes((prev) => [res.data.scheme, ...prev]);
      setCredits((prev) => res.data.ai_credits ? { ...prev, remaining_credits: res.data.ai_credits.remaining, ai_scheme_work_credit_cost: res.data.ai_credits.charged } as CreditSummary : prev);
      setForm((p) => ({ ...p, scheme_id: String(res.data.scheme.id), level_id: String(res.data.scheme.level_id || ""), section_id: String(res.data.scheme.section_id || ""), department_id: String(res.data.scheme.department_id || ""), subject_id: String(res.data.scheme.subject_id || ""), subject: res.data.scheme.subject, class: res.data.scheme.class_name }));
      setNoteForm((p) => ({ ...p, scheme_id: String(res.data.scheme.id), level_id: String(res.data.scheme.level_id || ""), section_id: String(res.data.scheme.section_id || ""), department_id: String(res.data.scheme.department_id || ""), subject_id: String(res.data.scheme.subject_id || ""), subject: res.data.scheme.subject, class: res.data.scheme.class_name }));
    } catch (err: any) { showError?.(safeAiError(err?.response?.data?.message, "Unable to generate scheme of work.")); }
    finally { setLoading(false); }
  };

  const saveUploadedScheme = async () => {
    if (!schemeForm.subject.trim() || !schemeForm.class.trim() || !schemeForm.content.trim()) return showError?.("Enter subject, class, and paste or upload the scheme text.");
    setLoading(true);
    try {
      const res = await authApi.post("/admin/ai/lesson-schemes", { ...schemeForm, title: `${schemeForm.subject} Scheme of Work` });
      showSuccess?.("Scheme of work saved.");
      setSchemes((prev) => [res.data.scheme, ...prev]);
    } catch (err: any) { showError?.(err?.response?.data?.message || "Unable to save scheme of work."); }
    finally { setLoading(false); }
  };

  const generatePlan = async () => {
    if (!form.subject.trim() || !form.class.trim() || !form.topic.trim()) return showError?.("Enter subject, class, and topic.");
    setLoading(true);
    try {
      const res = await authApi.post("/admin/ai/lesson-plans/generate", { ...form, duration_minutes: Number(form.duration_minutes || 40) });
      const createdPlan = res.data?.lesson_plan || null;
      setPlan(createdPlan);
      setPlanEditor(planToEditorState(createdPlan));
      setIsEditingPlan(false);
      if (res.data?.record) setPlans((prev) => [res.data.record, ...prev]);
      if (res.data?.ai_credits) setCredits((prev) => ({ ...prev, remaining_credits: res.data.ai_credits.remaining, ai_lesson_plan_credit_cost: res.data.ai_credits.charged } as CreditSummary));
      showSuccess?.("Lesson plan generated and saved.");
    } catch (err: any) { showError?.(safeAiError(err?.response?.data?.message, "Unable to generate lesson plan.")); }
    finally { setLoading(false); }
  };

  const generateNote = async () => {
    if (!noteForm.subject.trim() || !noteForm.class.trim() || !noteForm.topic.trim()) return showError?.("Enter subject, class, and topic.");
    setLoading(true);
    try {
      const res = await authApi.post("/admin/ai/lesson-notes/generate", { ...noteForm, youtube_videos: noteForm.youtube_videos.split(/\r?\n/).map((v) => v.trim()).filter(Boolean) });
      const createdNoteRecord = res.data.lesson_note;
      setNote(createdNoteRecord);
      setNoteEditor(noteToEditorState(createdNoteRecord?.content, createdNoteRecord?.youtube_videos));
      setIsEditingNote(false);
      setNotes((prev) => [createdNoteRecord, ...prev]);
      if (res.data?.ai_credits) setCredits((prev) => ({ ...prev, remaining_credits: res.data.ai_credits.remaining, ai_lesson_note_credit_cost: res.data.ai_credits.charged } as CreditSummary));
      showSuccess?.("Lesson note generated and saved.");
    } catch (err: any) { showError?.(safeAiError(err?.response?.data?.message, "Unable to generate lesson note.")); }
    finally { setLoading(false); }
  };

  const publishNote = async (item: LessonNoteRecord) => {
    setLoading(true);
    try {
      const res = await authApi.post(`/admin/ai/lesson-notes/${item.id}/publish`, { youtube_videos: (item.youtube_videos || []).filter(Boolean) });
      setNotes((prev) => prev.map((n) => n.id === item.id ? res.data.lesson_note : n));
      if (note?.id === item.id) {
        setNote(res.data.lesson_note);
        setNoteEditor(noteToEditorState(res.data.lesson_note?.content, res.data.lesson_note?.youtube_videos));
      }
      showSuccess?.("Lesson note published to students.");
    } catch (err: any) { showError?.(err?.response?.data?.message || "Unable to publish lesson note."); }
    finally { setLoading(false); }
  };

  const openSchemeForEdit = (item: LessonScheme) => {
    setEditingSchemeId(item.id);
    setSchemeForm({
      level_id: String(item.level_id || ""),
      section_id: String(item.section_id || ""),
      department_id: String(item.department_id || ""),
      subject_id: String(item.subject_id || ""),
      academic_session_id: String(item.academic_session_id || currentPeriod?.academic_session_id || ""),
      term_id: String(item.term_id || currentPeriod?.term_id || ""),
      subject: item.subject || "",
      class: item.class_name || "",
      term: item.term || currentPeriod?.term_name || "",
      curriculum: item.curriculum || curriculumOptions[0],
      weeks: item.topics?.length || 12,
      content: item.content || "",
    });
    setTab("scheme");
  };

  const saveSchemeUpdate = async () => {
    if (!editingSchemeId) return showError?.("Select a saved scheme to edit first.");
    setLoading(true);
    try {
      const res = await authApi.put(`/admin/ai/lesson-schemes/${editingSchemeId}`, { ...schemeForm, title: `${schemeForm.subject} Scheme of Work` });
      setSchemes((prev) => prev.map((item) => item.id === editingSchemeId ? res.data.scheme : item));
      setEditingSchemeId(null);
      showSuccess?.("Scheme of work updated.");
    } catch (err: any) { showError?.(err?.response?.data?.message || "Unable to update scheme of work."); }
    finally { setLoading(false); }
  };

  const openPlanForEdit = (item: LessonPlanRecord) => {
    setEditingPlanId(item.id);
    setForm({
      scheme_id: String(item.scheme_id || ""),
      level_id: String(item.level_id || ""),
      section_id: String(item.section_id || ""),
      department_id: String(item.department_id || ""),
      subject_id: String(item.subject_id || ""),
      academic_session_id: String(item.academic_session_id || currentPeriod?.academic_session_id || ""),
      term_id: String(item.term_id || currentPeriod?.term_id || ""),
      subject: item.subject || "",
      class: item.class_name || "",
      topic: item.topic || "",
      duration_minutes: item.duration_minutes || 40,
      teacher_notes: "",
    });
    setPlan(item.plan);
    setPlanEditor(planToEditorState(item.plan));
    setIsEditingPlan(true);
    setTab("plan");
  };

  const savePlanUpdate = async () => {
    const targetId = editingPlanId || (plans.find((p) => p.topic === plan?.topic)?.id);
    if (!targetId && !plan) return showError?.("No lesson plan available to save.");
    const parsedPlan = editorStateToPlan(planEditor, plan);
    setLoading(true);
    try {
      if (targetId) {
        const res = await authApi.put(`/admin/ai/lesson-plans/${targetId}`, { ...form, duration_minutes: Number(planEditor.duration_minutes || form.duration_minutes || 40), plan: parsedPlan });
        setPlans((prev) => prev.map((item) => item.id === targetId ? res.data.lesson_plan : item));
        setPlan(res.data.lesson_plan?.plan || parsedPlan);
      } else {
        setPlan(parsedPlan);
      }
      setIsEditingPlan(false);
      showSuccess?.("Lesson plan updated.");
    } catch (err: any) { showError?.(err?.response?.data?.message || "Unable to update lesson plan."); }
    finally { setLoading(false); }
  };

  const openNoteForEdit = (item: LessonNoteRecord) => {
    setNote(item);
    setNoteEditor(noteToEditorState(item.content, item.youtube_videos));
    setNoteForm({
      scheme_id: String(item.scheme_id || ""),
      lesson_plan_id: String(item.lesson_plan_id || ""),
      level_id: String(item.level_id || ""),
      section_id: String(item.section_id || ""),
      department_id: String(item.department_id || ""),
      subject_id: String(item.subject_id || ""),
      academic_session_id: String(item.academic_session_id || currentPeriod?.academic_session_id || ""),
      term_id: String(item.term_id || currentPeriod?.term_id || ""),
      subject: item.subject || "",
      class: item.class_name || "",
      topic: item.topic || "",
      depth: "standard",
      teacher_notes: "",
      youtube_videos: (item.youtube_videos || []).join("\n"),
    });
    setIsEditingNote(true);
    setTab("note");
  };

  const saveNoteUpdate = async () => {
    if (!note) return showError?.("Select a lesson note to edit first.");
    const parsedNote = editorStateToNote(noteEditor, note.content);
    const ytVideos = (noteEditor.youtubeLinksText || noteForm.youtube_videos)
      .split(/\r?\n/)
      .map((v) => v.trim())
      .filter(Boolean);

    setLoading(true);
    try {
      const res = await authApi.put(`/admin/ai/lesson-notes/${note.id}`, {
        ...noteForm,
        title: noteEditor.title || note.title,
        content: parsedNote,
        youtube_videos: ytVideos,
        status: note.status,
      });
      setNote(res.data.lesson_note);
      setNoteEditor(noteToEditorState(res.data.lesson_note?.content, res.data.lesson_note?.youtube_videos));
      setNotes((prev) => prev.map((item) => (item.id === note.id ? res.data.lesson_note : item)));
      setIsEditingNote(false);
      showSuccess?.("Lesson note updated successfully.");
    } catch (err: any) {
      showError?.(err?.response?.data?.message || "Unable to update lesson note.");
    } finally {
      setLoading(false);
    }
  };

  const copyNote = async (item: LessonNoteRecord) => {
    const text = `${item.title}\n\n${(item.content?.sections || []).map((s) => `${s.heading}\n${s.body}`).join("\n\n")}`;
    await navigator.clipboard.writeText(text);
    showSuccess?.("Lesson note copied.");
  };

  const archiveLessonItem = async (type: "scheme" | "plan" | "note", id: number) => {
    const label = type === "scheme" ? "scheme of work" : type === "plan" ? "lesson plan" : "lesson note";
    if (!window.confirm(`Archive this ${label}? It will be removed from active lists but kept in the database.`)) return;
    const endpoints = {
      scheme: `/admin/ai/lesson-schemes/${id}`,
      plan: `/admin/ai/lesson-plans/${id}`,
      note: `/admin/ai/lesson-notes/${id}`,
    };
    setLoading(true);
    try {
      await authApi.delete(endpoints[type]);
      if (type === "scheme") {
        setSchemes((prev) => prev.filter((item) => item.id !== id));
        if (editingSchemeId === id) setEditingSchemeId(null);
      }
      if (type === "plan") {
        setPlans((prev) => prev.filter((item) => item.id !== id));
        if (editingPlanId === id) { setEditingPlanId(null); setPlan(null); }
      }
      if (type === "note") {
        setNotes((prev) => prev.filter((item) => item.id !== id));
        if (note?.id === id) { setNote(null); }
      }
      showSuccess?.(`${label.charAt(0).toUpperCase()}${label.slice(1)} archived.`);
    } catch (err: any) {
      showError?.(err?.response?.data?.message || `Unable to archive ${label}.`);
    } finally {
      setLoading(false);
    }
  };

  const readSchemeFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSchemeForm((p) => ({ ...p, content: String(reader.result || "") }));
    reader.readAsText(file);
  };

  const chooseScheme = (id: string) => {
    const s = schemes.find((item) => String(item.id) === id);
    setForm((p) => ({ ...p, scheme_id: id, level_id: String(s?.level_id || ""), section_id: String(s?.section_id || ""), department_id: String(s?.department_id || ""), subject_id: String(s?.subject_id || ""), subject: s?.subject || p.subject, class: s?.class_name || p.class, topic: s?.topics?.[0]?.topic || p.topic }));
    setNoteForm((p) => ({ ...p, scheme_id: id, level_id: String(s?.level_id || ""), section_id: String(s?.section_id || ""), department_id: String(s?.department_id || ""), subject_id: String(s?.subject_id || ""), subject: s?.subject || p.subject, class: s?.class_name || p.class, topic: s?.topics?.[0]?.topic || p.topic }));
  };

  const choosePlan = (id: string) => {
    const p = plans.find((item) => String(item.id) === id);
    setNoteForm((prev) => ({ ...prev, lesson_plan_id: id, level_id: String(p?.level_id || prev.level_id || ""), section_id: String(p?.section_id || prev.section_id || ""), department_id: String(p?.department_id || prev.department_id || ""), subject_id: String(p?.subject_id || prev.subject_id || ""), subject: p?.subject || prev.subject, class: p?.class_name || prev.class, topic: p?.topic || prev.topic }));
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .lp-main {
          background: #F8FAFC;
          min-height: 100vh;
          overflow-x: hidden;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        }
        .lp-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          color: #fff;
          border-radius: 16px;
          padding: 22px 26px;
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
        }
        .lp-hero-glow {
          position: absolute;
          top: -60px;
          right: -60px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.15) 0%, transparent 65%);
          pointer-events: none;
        }
        .lp-hero>* { position: relative; z-index: 1; }
        .lp-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #FBBF24;
          background: rgba(217, 119, 6, 0.20);
          border: 1px solid rgba(217, 119, 6, 0.35);
          border-radius: 100px;
          padding: 3px 11px;
          margin-bottom: 8px;
        }
        .lp-title {
          font-weight: 800;
          font-size: 22px;
          margin: 0 0 4px;
          color: #fff;
          line-height: 1.2;
        }
        .lp-sub {
          max-width: 680px;
          color: #CBD5E1;
          font-size: 13px;
          line-height: 1.5;
          margin: 0;
        }
        .lp-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin: 0 0 20px;
        }
        .lp-tab {
          border: 1px solid #E2E8F0;
          background: #fff;
          border-radius: 10px;
          padding: 9px 18px;
          font-weight: 700;
          font-size: 13px;
          color: #64748B;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .lp-tab:hover { background: #F1F5F9; color: #0F2744; }
        .lp-tab.active { background: #0F2744; color: #fff; border-color: #0F2744; }
        .lp-grid {
          display: grid;
          grid-template-columns: 390px 1fr;
          gap: 20px;
          align-items: start;
        }
        .lp-card {
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(15, 39, 68, 0.03);
          overflow: hidden;
        }
        .lp-pad { padding: 20px; }
        .lp-card h2 { font-size: 16px; font-weight: 700; color: #0F2744; margin: 0; }
        .lp-muted { font-size: 12.5px; color: #64748B; line-height: 1.5; margin: 4px 0 0; }
        .lp-field { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; }
        .lp-field span { font-size: 12px; font-weight: 700; color: #0F2744; }
        .lp-input, .lp-textarea, .lp-select {
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 10px 12px;
          outline: none;
          background: #F8FAFC;
          color: #0F2744;
          font-weight: 600;
          font-size: 13px;
          transition: border-color 0.2s;
        }
        .lp-input:focus, .lp-textarea:focus, .lp-select:focus { border-color: #D97706; background: #fff; }
        .lp-textarea { min-height: 110px; resize: vertical; }
        .lp-btn {
          border: 0;
          border-radius: 10px;
          background: #D97706;
          color: #FFFFFF;
          font-weight: 700;
          font-size: 13px;
          padding: 10px 16px;
          margin-top: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .lp-btn.full { width: 100%; }
        .lp-btn.soft { background: #F8FAFC; border: 1px solid #E2E8F0; color: #0F2744; }
        .lp-btn.danger { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
        .lp-btn:hover:not(:disabled) { background: #B45309; color: #FFFFFF; transform: translateY(-1px); }
        .lp-btn.soft:hover:not(:disabled) { background: #E2E8F0; color: #0F2744; }
        .lp-credit {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .lp-credit div {
          border: 1px solid #E2E8F0;
          background: #fff;
          border-radius: 14px;
          padding: 14px 16px;
          box-shadow: 0 4px 12px rgba(15,39,68,0.02);
        }
        .lp-credit span { font-size: 11.5px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.04em; }
        .lp-credit strong { display: block; font-weight: 800; font-size: 18px; color: #0F2744; margin-top: 4px; }
        .lp-section { border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; background: #F8FAFC; margin-top: 14px; }
        .lp-section h3 { font-size: 14px; font-weight: 700; color: #0F2744; margin: 0 0 8px; }
        .lp-section p, .lp-section li { font-size: 13px; line-height: 1.7; color: #334155; }
        .lp-table { width: 100%; border-collapse: collapse; min-width: 760px; }
        .lp-table th { background: #F8FAFC; font-size: 11.5px; font-weight: 700; text-transform: uppercase; color: #64748B; letter-spacing: 0.04em; text-align: left; padding: 12px; border-bottom: 1px solid #E2E8F0; }
        .lp-table td { border-top: 1px solid #F1F5F9; padding: 12px; vertical-align: top; font-size: 13px; color: #334155; }
        .lp-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .lp-scroll { overflow: auto; }
        .lp-pill { display: inline-flex; border-radius: 999px; padding: 4px 10px; background: #EEF2FF; color: #3730A3; font-size: 11px; font-weight: 700; }
        .lp-pill.pub { background: #DCFCE7; color: #166534; }
        .lp-form-box { border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; background: #F8FAFC; margin-top: 14px; }
        @media(max-width:1199.98px){.lp-grid{grid-template-columns:1fr}.lp-credit{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:767px){.lp-credit{grid-template-columns:1fr}}
        @media print{.sidebar,.top-nav,.navbar,.lp-hero,.lp-tabs,.lp-card:first-child,footer,.lp-actions{display:none!important}.lp-main{padding:0;background:#fff}.lp-grid{display:block}.lp-card{box-shadow:none;border:0}.lp-section{break-inside:avoid}}
      `}</style>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="AI Teaching Workspace" />
      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="col-md-9 col-lg-10 ms-auto db-main lp-main">
            <PageTitle title="AI Teaching Workspace" />
            {loading && <Loader message="Processing AI teaching content..." />}
            <section className="lp-hero db-hero">
              <div>
                <div className="lp-kicker db-session-badge">
                  <i className="bi bi-stars" />
                  <span>SchoolProfit AI Academic tools</span>
                </div>
                <h1 className="lp-title db-greeting">AI Teaching Workspace</h1>
                <p className="lp-sub db-hero-sub">Generate and manage comprehensive schemes of work, lesson plans, and classroom lesson notes tailored to your curriculum.</p>
              </div>
            </section>
            {credits && credits.is_plus_active === false && (
              <div className="alert alert-warning py-3 px-4 mb-3 d-flex align-items-center gap-3" style={{ borderRadius: "14px" }}>
                <i className="bi bi-exclamation-triangle-fill fs-4 text-warning" />
                <div>
                  <h4 className="fs-6 fw-bold mb-1">SchoolProfit Plus Package Required</h4>
                  <p className="mb-0 text-muted" style={{ fontSize: "13px" }}>
                    AI Scheme of Work, Lesson Plan, and Lesson Note generators require an active <strong>SchoolProfit Plus</strong> subscription. Please contact your school administrator to activate the Plus package.
                  </p>
                </div>
              </div>
            )}
            <div className="lp-credit">
              <div>
                <span>Current period</span>
                <strong>{currentPeriod?.term_name || "Term not set"}</strong>
                <small className="lp-muted">{currentPeriod?.academic_session_name || "Session not set"}</small>
              </div>
              <div>
                <span>{credits?.user_allocation ? "Your AI Quota" : "Remaining credits"}</span>
                <strong>
                  {credits?.user_allocation
                    ? credits.user_allocation.is_unlimited
                      ? "Unlimited"
                      : `${credits.user_allocation.remaining_credits} credits`
                    : `${credits?.remaining_credits ?? "-"} credits`}
                </strong>
                {credits?.user_allocation && !credits.user_allocation.is_unlimited && (
                  <small className="lp-muted">{credits.user_allocation.used_credits} / {credits.user_allocation.allocated_credits} used</small>
                )}
              </div>
              <div>
                <span>Scheme cost</span>
                <strong>{credits?.ai_scheme_work_credit_cost ?? 4} credits</strong>
              </div>
              <div>
                <span>Plan cost</span>
                <strong>{credits?.ai_lesson_plan_credit_cost ?? 3} credits</strong>
              </div>
              <div>
                <span>Note cost</span>
                <strong>{credits?.ai_lesson_note_credit_cost ?? 5} credits</strong>
              </div>
            </div>

            <div className="lp-tabs">
              {[
                ["scheme", "Scheme of Work"],
                ["plan", "Lesson Plan"],
                ["note", "Lesson Note"],
                ["library", "Saved Library"],
              ].map(([key, label]) => (
                <button key={key} className={`lp-tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key as any)}>
                  {label}
                </button>
              ))}
            </div>

            {/* TAB: SCHEME */}
            {tab === "scheme" && (
              <div className="lp-grid">
                <section className="lp-card">
                  <div className="lp-pad">
                    <h2>Scheme setup</h2>
                    <p className="lp-muted">Generate from a curriculum or upload/paste an existing scheme.</p>
                    <AcademicScopeFields target="scheme" values={schemeForm} classes={classes} sections={sections} departments={departments} subjects={subjects} onClass={applyClass} onSubject={applySubject} onChange={(patch) => setSchemeForm((p) => ({ ...p, ...patch }))} isTeacherScope={isTeacherScope} />
                    <label className="lp-field">
                      <span>Subject name</span>
                      <input className="lp-input" value={schemeForm.subject} onChange={(e) => setSchemeForm({ ...schemeForm, subject: e.target.value })} placeholder="Auto-filled from selected subject" />
                    </label>
                    <label className="lp-field">
                      <span>Class name</span>
                      <input className="lp-input" value={schemeForm.class} onChange={(e) => setSchemeForm({ ...schemeForm, class: e.target.value })} placeholder="Auto-filled from selected class" />
                    </label>
                    <label className="lp-field">
                      <span>Term</span>
                      <input className="lp-input" value={schemeForm.term} onChange={(e) => setSchemeForm({ ...schemeForm, term: e.target.value })} placeholder="e.g. First Term" />
                    </label>
                    <label className="lp-field">
                      <span>Curriculum</span>
                      <select className="lp-select" value={schemeForm.curriculum} onChange={(e) => setSchemeForm({ ...schemeForm, curriculum: e.target.value })}>
                        {curriculumOptions.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <label className="lp-field">
                      <span>Weeks</span>
                      <input className="lp-input" type="number" min={1} max={16} value={schemeForm.weeks} onChange={(e) => setSchemeForm({ ...schemeForm, weeks: Number(e.target.value) })} />
                    </label>
                    <button className="lp-btn full" disabled={loading} onClick={generateScheme}>
                      Generate Scheme with AI
                    </button>
                    <label className="lp-field">
                      <span>Upload or paste scheme text</span>
                      <input className="lp-input" type="file" accept=".txt,.csv" onChange={(e) => readSchemeFile(e.target.files?.[0])} />
                      <textarea className="lp-textarea" value={schemeForm.content} onChange={(e) => setSchemeForm({ ...schemeForm, content: e.target.value })} placeholder="Paste scheme of work text here." />
                    </label>
                    <button className="lp-btn soft full" disabled={loading} onClick={saveUploadedScheme}>
                      Save Uploaded Scheme
                    </button>
                    {editingSchemeId ? (
                      <button className="lp-btn full" disabled={loading} onClick={saveSchemeUpdate}>
                        Save Scheme Changes
                      </button>
                    ) : null}
                  </div>
                </section>

                <section className="lp-card">
                  <div className="lp-pad">
                    <h2>Saved schemes</h2>
                    <div className="lp-scroll">
                      <table className="lp-table">
                        <thead>
                          <tr>
                            <th>Scheme</th>
                            <th>Subject</th>
                            <th>Topics</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {schemes.map((s) => (
                            <tr key={s.id}>
                              <td>
                                <strong>{s.title}</strong>
                                <div className="lp-muted">
                                  {s.term} - {s.curriculum}
                                </div>
                              </td>
                              <td>
                                {s.subject}
                                <div className="lp-muted">{s.class_name}</div>
                              </td>
                              <td>{s.topics?.length || 0}</td>
                              <td>
                                <div className="lp-actions">
                                  <button
                                    className="lp-btn soft"
                                    onClick={() => {
                                      chooseScheme(String(s.id));
                                      setTab("plan");
                                    }}
                                  >
                                    Use
                                  </button>
                                  <button className="lp-btn soft" onClick={() => openSchemeForEdit(s)}>
                                    Edit
                                  </button>
                                  <button className="lp-btn danger" disabled={loading} onClick={() => archiveLessonItem("scheme", s.id)}>
                                    Archive
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* TAB: PLAN */}
            {tab === "plan" && (
              <div className="lp-grid">
                <section className="lp-card">
                  <div className="lp-pad">
                    <h2>Generate lesson plan</h2>
                    <label className="lp-field">
                      <span>Scheme</span>
                      <select className="lp-select" value={form.scheme_id} onChange={(e) => chooseScheme(e.target.value)}>
                        <option value="">No scheme selected</option>
                        {schemes.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    {selectedScheme?.topics?.length ? (
                      <label className="lp-field">
                        <span>Topic from scheme</span>
                        <select className="lp-select" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
                          <option value="">Select topic</option>
                          {selectedScheme.topics.map((t, i) => (
                            <option key={i} value={t.topic}>
                              Week {t.week}: {t.topic}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <AcademicScopeFields target="plan" values={form} classes={classes} sections={sections} departments={departments} subjects={subjects} onClass={applyClass} onSubject={applySubject} onChange={(patch) => setForm((p) => ({ ...p, ...patch }))} isTeacherScope={isTeacherScope} />
                    <label className="lp-field">
                      <span>Subject name</span>
                      <input className="lp-input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                    </label>
                    <label className="lp-field">
                      <span>Class name</span>
                      <input className="lp-input" value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} />
                    </label>
                    <label className="lp-field">
                      <span>Topic</span>
                      <input className="lp-input" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
                    </label>
                    <label className="lp-field">
                      <span>Duration minutes</span>
                      <input className="lp-input" type="number" min={10} max={240} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
                    </label>
                    <label className="lp-field">
                      <span>Teacher notes optional</span>
                      <textarea className="lp-textarea" value={form.teacher_notes} onChange={(e) => setForm({ ...form, teacher_notes: e.target.value })} />
                    </label>
                    <button className="lp-btn full" disabled={loading} onClick={generatePlan}>
                      Generate and Save Lesson Plan
                    </button>
                  </div>
                </section>

                <section className="lp-card">
                  <div className="lp-pad">
                    <h2>{plan?.title || "Generated lesson plan"}</h2>
                    {plan ? (
                      <>
                        <div className="lp-actions mb-3">
                          <button
                            className={`lp-btn ${!isEditingPlan ? "soft" : ""}`}
                            onClick={() => setIsEditingPlan(!isEditingPlan)}
                          >
                            <i className={`bi ${isEditingPlan ? "bi-eye" : "bi-pencil-square"} me-1`} />
                            {isEditingPlan ? "View Formatted Plan" : "Edit Plan Fields"}
                          </button>
                          <button className="lp-btn soft" onClick={() => window.print()}>
                            <i className="bi bi-printer me-1" /> Print / Save PDF
                          </button>
                          {isEditingPlan && (
                            <button className="lp-btn" disabled={loading} onClick={savePlanUpdate}>
                              <i className="bi bi-check2-circle me-1" /> Save Plan Changes
                            </button>
                          )}
                        </div>

                        {isEditingPlan ? (
                          /* Visual Plan Editor */
                          <div className="lp-form-box">
                            <h3 className="fs-6 fw-bold text-primary mb-3">
                              <i className="bi bi-pencil-square me-2" /> Edit Lesson Plan Sections
                            </h3>
                            <label className="lp-field">
                              <span>Topic</span>
                              <input className="lp-input" value={planEditor.topic} onChange={(e) => setPlanEditor({ ...planEditor, topic: e.target.value })} />
                            </label>
                            <label className="lp-field">
                              <span>Objectives (one per line)</span>
                              <textarea className="lp-textarea" value={planEditor.objectivesText} onChange={(e) => setPlanEditor({ ...planEditor, objectivesText: e.target.value })} placeholder="Students should be able to:&#10;1. Define...&#10;2. Explain..." />
                            </label>
                            <label className="lp-field">
                              <span>Teaching Aids & Resources (one per line)</span>
                              <textarea className="lp-textarea" value={planEditor.teachingAidsText} onChange={(e) => setPlanEditor({ ...planEditor, teachingAidsText: e.target.value })} placeholder="Textbook, Charts, Flashcards..." />
                            </label>
                            <label className="lp-field">
                              <span>Previous Knowledge</span>
                              <textarea className="lp-textarea" value={planEditor.previous_knowledge} onChange={(e) => setPlanEditor({ ...planEditor, previous_knowledge: e.target.value })} placeholder="What students already know..." />
                            </label>
                            <label className="lp-field">
                              <span>Introduction</span>
                              <textarea className="lp-textarea" value={planEditor.introduction} onChange={(e) => setPlanEditor({ ...planEditor, introduction: e.target.value })} placeholder="How the lesson begins..." />
                            </label>
                            <label className="lp-field">
                              <span>Teacher Activities (one per line)</span>
                              <textarea className="lp-textarea" value={planEditor.teacherActivitiesText} onChange={(e) => setPlanEditor({ ...planEditor, teacherActivitiesText: e.target.value })} placeholder="1. Introduces the topic...&#10;2. Demonstrates on the board..." />
                            </label>
                            <label className="lp-field">
                              <span>Learner / Student Activities (one per line)</span>
                              <textarea className="lp-textarea" value={planEditor.learnerActivitiesText} onChange={(e) => setPlanEditor({ ...planEditor, learnerActivitiesText: e.target.value })} placeholder="1. Listen and take notes...&#10;2. Ask questions..." />
                            </label>
                            <label className="lp-field">
                              <span>Assessment / Evaluation (one per line)</span>
                              <textarea className="lp-textarea" value={planEditor.assessmentText} onChange={(e) => setPlanEditor({ ...planEditor, assessmentText: e.target.value })} placeholder="Questions to test understanding..." />
                            </label>
                            <label className="lp-field">
                              <span>Homework / Assignment (one per line)</span>
                              <textarea className="lp-textarea" value={planEditor.homeworkText} onChange={(e) => setPlanEditor({ ...planEditor, homeworkText: e.target.value })} placeholder="Take-home task for students..." />
                            </label>
                            <label className="lp-field">
                              <span>Board Summary (one per line)</span>
                              <textarea className="lp-textarea" value={planEditor.boardSummaryText} onChange={(e) => setPlanEditor({ ...planEditor, boardSummaryText: e.target.value })} placeholder="Summary points on the board..." />
                            </label>
                            <label className="lp-field">
                              <span>Closure / Conclusion</span>
                              <textarea className="lp-textarea" value={planEditor.closure} onChange={(e) => setPlanEditor({ ...planEditor, closure: e.target.value })} placeholder="Lesson wrap-up..." />
                            </label>
                            <button className="lp-btn full mt-3" disabled={loading} onClick={savePlanUpdate}>
                              Save Lesson Plan Changes
                            </button>
                          </div>
                        ) : (
                          /* Visual Plan View */
                          <>
                            <div className="lp-section">
                              <h3>Topic</h3>
                              <p>{plan.topic}</p>
                            </div>
                            <ListBlock title="Objectives" items={plan.objectives} />
                            <ListBlock title="Teaching Aids & Resources" items={plan.teaching_aids} />
                            {plan.previous_knowledge && (
                              <div className="lp-section">
                                <h3>Previous Knowledge</h3>
                                <p>{plan.previous_knowledge}</p>
                              </div>
                            )}
                            <div className="lp-section">
                              <h3>Introduction</h3>
                              <p>{plan.introduction}</p>
                            </div>
                            <ListBlock title="Teacher Activities" items={plan.teacher_activities} />
                            <ListBlock title="Learner Activities" items={plan.learner_activities} />
                            <ListBlock title="Assessment" items={plan.assessment} />
                            <ListBlock title="Homework" items={plan.homework} />
                            {plan.board_summary?.length ? <ListBlock title="Board Summary" items={plan.board_summary} /> : null}
                            {plan.closure && (
                              <div className="lp-section">
                                <h3>Closure</h3>
                                <p>{plan.closure}</p>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <p className="lp-muted">Generate a plan from a selected scheme topic or type the topic manually.</p>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* TAB: NOTE */}
            {tab === "note" && (
              <div className="lp-grid">
                <section className="lp-card">
                  <div className="lp-pad">
                    <h2>Generate lesson note</h2>
                    <label className="lp-field">
                      <span>Scheme</span>
                      <select className="lp-select" value={noteForm.scheme_id} onChange={(e) => chooseScheme(e.target.value)}>
                        <option value="">No scheme selected</option>
                        {schemes.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="lp-field">
                      <span>Saved lesson plan optional</span>
                      <select className="lp-select" value={noteForm.lesson_plan_id} onChange={(e) => choosePlan(e.target.value)}>
                        <option value="">No plan selected</option>
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.topic} - {p.class_name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {selectedScheme?.topics?.length ? (
                      <label className="lp-field">
                        <span>Topic from scheme</span>
                        <select className="lp-select" value={noteForm.topic} onChange={(e) => setNoteForm({ ...noteForm, topic: e.target.value })}>
                          <option value="">Select topic</option>
                          {selectedScheme.topics.map((t, i) => (
                            <option key={i} value={t.topic}>
                              Week {t.week}: {t.topic}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <AcademicScopeFields target="note" values={noteForm} classes={classes} sections={sections} departments={departments} subjects={subjects} onClass={applyClass} onSubject={applySubject} onChange={(patch) => setNoteForm((p) => ({ ...p, ...patch }))} isTeacherScope={isTeacherScope} />
                    <label className="lp-field">
                      <span>Subject name</span>
                      <input className="lp-input" value={noteForm.subject} onChange={(e) => setNoteForm({ ...noteForm, subject: e.target.value })} />
                    </label>
                    <label className="lp-field">
                      <span>Class name</span>
                      <input className="lp-input" value={noteForm.class} onChange={(e) => setNoteForm({ ...noteForm, class: e.target.value })} />
                    </label>
                    <label className="lp-field">
                      <span>Topic</span>
                      <input className="lp-input" value={noteForm.topic} onChange={(e) => setNoteForm({ ...noteForm, topic: e.target.value })} />
                    </label>
                    <label className="lp-field">
                      <span>Depth</span>
                      <select className="lp-select" value={noteForm.depth} onChange={(e) => setNoteForm({ ...noteForm, depth: e.target.value })}>
                        <option value="short">Short</option>
                        <option value="standard">Standard</option>
                        <option value="detailed">Detailed</option>
                      </select>
                    </label>
                    <label className="lp-field">
                      <span>Optional YouTube video links, one per line</span>
                      <textarea className="lp-textarea" value={noteForm.youtube_videos} onChange={(e) => setNoteForm({ ...noteForm, youtube_videos: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
                    </label>
                    <label className="lp-field">
                      <span>Teacher notes optional</span>
                      <textarea className="lp-textarea" value={noteForm.teacher_notes} onChange={(e) => setNoteForm({ ...noteForm, teacher_notes: e.target.value })} />
                    </label>
                    <button className="lp-btn full" disabled={loading} onClick={generateNote}>
                      Generate and Save Lesson Note
                    </button>
                  </div>
                </section>

                <section className="lp-card">
                  <div className="lp-pad">
                    <h2>{note?.title || selectedPlan?.topic || "Generated lesson note"}</h2>
                    {note ? (
                      <>
                        <div className="lp-actions mb-3">
                          <button
                            className={`lp-btn ${!isEditingNote ? "soft" : ""}`}
                            onClick={() => setIsEditingNote(!isEditingNote)}
                          >
                            <i className={`bi ${isEditingNote ? "bi-eye" : "bi-pencil-square"} me-1`} />
                            {isEditingNote ? "View Formatted Note" : "Edit Note Content"}
                          </button>
                          <button className="lp-btn soft" onClick={() => copyNote(note)}>
                            <i className="bi bi-clipboard me-1" /> Copy
                          </button>
                          <button className="lp-btn soft" onClick={() => window.print()}>
                            <i className="bi bi-printer me-1" /> Print / Save PDF
                          </button>
                          {note.status !== "published" ? (
                            <button className="lp-btn" onClick={() => publishNote(note)}>
                              <i className="bi bi-send me-1" /> Publish to Students
                            </button>
                          ) : (
                            <span className="lp-pill pub">
                              <i className="bi bi-check-circle me-1" /> Published
                            </span>
                          )}
                          <button className="lp-btn danger" disabled={loading} onClick={() => archiveLessonItem("note", note.id)}>
                            <i className="bi bi-archive me-1" /> Archive
                          </button>
                        </div>

                        {isEditingNote ? (
                          /* Visual Human-Friendly Lesson Note Form */
                          <div className="lp-form-box">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h3 className="fs-6 fw-bold text-primary m-0">
                                <i className="bi bi-pencil-square me-2" /> Edit Lesson Note Sections
                              </h3>
                            </div>

                            <label className="lp-field">
                              <span>Lesson Title</span>
                              <input
                                className="lp-input"
                                value={noteEditor.title}
                                onChange={(e) => setNoteEditor({ ...noteEditor, title: e.target.value })}
                                placeholder="e.g. Photosynthesis and Plant Nutrition"
                              />
                            </label>

                            <div className="mt-4">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <label className="fw-bold fs-7 text-dark m-0">Lesson Content Sections</label>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary"
                                  style={{ borderRadius: "8px", fontWeight: 700, fontSize: "12px" }}
                                  onClick={() =>
                                    setNoteEditor({
                                      ...noteEditor,
                                      sections: [
                                        ...noteEditor.sections,
                                        { heading: `Section ${noteEditor.sections.length + 1}`, body: "" },
                                      ],
                                    })
                                  }
                                >
                                  <i className="bi bi-plus-circle me-1" /> Add Section
                                </button>
                              </div>

                              {noteEditor.sections.map((sec, sIdx) => (
                                <div key={sIdx} className="p-3 mb-3 border rounded bg-white position-relative shadow-sm">
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="badge bg-primary">Section {sIdx + 1}</span>
                                    {noteEditor.sections.length > 1 && (
                                      <button
                                        type="button"
                                        className="btn btn-sm text-danger p-0 border-0"
                                        onClick={() =>
                                          setNoteEditor({
                                            ...noteEditor,
                                            sections: noteEditor.sections.filter((_, i) => i !== sIdx),
                                          })
                                        }
                                      >
                                        <i className="bi bi-trash me-1" /> Remove
                                      </button>
                                    )}
                                  </div>
                                  <label className="lp-field mt-0 mb-2">
                                    <span>Section Heading</span>
                                    <input
                                      className="lp-input"
                                      value={sec.heading}
                                      onChange={(e) => {
                                        const next = [...noteEditor.sections];
                                        next[sIdx] = { ...next[sIdx], heading: e.target.value };
                                        setNoteEditor({ ...noteEditor, sections: next });
                                      }}
                                      placeholder="e.g. 1. Definition and Significance"
                                    />
                                  </label>
                                  <label className="lp-field">
                                    <span>Detailed Lesson Notes & Explanations</span>
                                    <textarea
                                      className="lp-textarea"
                                      style={{ minHeight: "120px" }}
                                      value={sec.body}
                                      onChange={(e) => {
                                        const next = [...noteEditor.sections];
                                        next[sIdx] = { ...next[sIdx], body: e.target.value };
                                        setNoteEditor({ ...noteEditor, sections: next });
                                      }}
                                      placeholder="Write or edit explanation, key principles, step-by-step notes..."
                                    />
                                  </label>
                                </div>
                              ))}
                            </div>

                            <label className="lp-field mt-3">
                              <span>Examples & Practical Applications (one per line)</span>
                              <textarea
                                className="lp-textarea"
                                style={{ minHeight: "90px" }}
                                value={noteEditor.examplesText}
                                onChange={(e) => setNoteEditor({ ...noteEditor, examplesText: e.target.value })}
                                placeholder="Example 1: ...&#10;Example 2: ..."
                              />
                            </label>

                            <label className="lp-field mt-3">
                              <span>Board Notes / Chalkboard Summary (one per line)</span>
                              <textarea
                                className="lp-textarea"
                                style={{ minHeight: "90px" }}
                                value={noteEditor.boardNotesText}
                                onChange={(e) => setNoteEditor({ ...noteEditor, boardNotesText: e.target.value })}
                                placeholder="Key summary 1&#10;Key summary 2"
                              />
                            </label>

                            <label className="lp-field mt-3">
                              <span>Class Activity & Interactive Exercises (one per line)</span>
                              <textarea
                                className="lp-textarea"
                                style={{ minHeight: "80px" }}
                                value={noteEditor.classActivityText}
                                onChange={(e) => setNoteEditor({ ...noteEditor, classActivityText: e.target.value })}
                                placeholder="Activity 1: Group discussion...&#10;Activity 2: Identification exercise..."
                              />
                            </label>

                            <label className="lp-field mt-3">
                              <span>Lesson Summary Points (one per line)</span>
                              <textarea
                                className="lp-textarea"
                                style={{ minHeight: "80px" }}
                                value={noteEditor.summaryText}
                                onChange={(e) => setNoteEditor({ ...noteEditor, summaryText: e.target.value })}
                                placeholder="Summary point 1&#10;Summary point 2"
                              />
                            </label>

                            <label className="lp-field mt-3">
                              <span>Homework & Take-Home Assignment (one per line)</span>
                              <textarea
                                className="lp-textarea"
                                style={{ minHeight: "80px" }}
                                value={noteEditor.homeworkText}
                                onChange={(e) => setNoteEditor({ ...noteEditor, homeworkText: e.target.value })}
                                placeholder="Assignment 1: ...&#10;Assignment 2: ..."
                              />
                            </label>

                            <div className="mt-4">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <label className="fw-bold fs-7 text-dark m-0">Quick Quiz Questions</label>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary"
                                  style={{ borderRadius: "8px", fontWeight: 700, fontSize: "12px" }}
                                  onClick={() =>
                                    setNoteEditor({
                                      ...noteEditor,
                                      quiz: [...noteEditor.quiz, { question: "", answer: "" }],
                                    })
                                  }
                                >
                                  <i className="bi bi-plus-circle me-1" /> Add Quiz Question
                                </button>
                              </div>
                              {noteEditor.quiz.map((q, qIdx) => (
                                <div key={qIdx} className="p-3 mb-2 border rounded bg-white shadow-sm">
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="badge bg-secondary">Question {qIdx + 1}</span>
                                    <button
                                      type="button"
                                      className="btn btn-sm text-danger p-0 border-0"
                                      onClick={() =>
                                        setNoteEditor({
                                          ...noteEditor,
                                          quiz: noteEditor.quiz.filter((_, i) => i !== qIdx),
                                        })
                                      }
                                    >
                                      <i className="bi bi-x-circle me-1" /> Remove
                                    </button>
                                  </div>
                                  <input
                                    className="lp-input mb-2"
                                    value={q.question}
                                    onChange={(e) => {
                                      const next = [...noteEditor.quiz];
                                      next[qIdx] = { ...next[qIdx], question: e.target.value };
                                      setNoteEditor({ ...noteEditor, quiz: next });
                                    }}
                                    placeholder="Type question here..."
                                  />
                                  <input
                                    className="lp-input"
                                    value={q.answer}
                                    onChange={(e) => {
                                      const next = [...noteEditor.quiz];
                                      next[qIdx] = { ...next[qIdx], answer: e.target.value };
                                      setNoteEditor({ ...noteEditor, quiz: next });
                                    }}
                                    placeholder="Answer key / explanation..."
                                  />
                                </div>
                              ))}
                            </div>

                            <label className="lp-field mt-3">
                              <span>Verified YouTube Video Links (one per line)</span>
                              <textarea
                                className="lp-textarea"
                                style={{ minHeight: "70px" }}
                                value={noteEditor.youtubeLinksText}
                                onChange={(e) => setNoteEditor({ ...noteEditor, youtubeLinksText: e.target.value })}
                                placeholder="https://youtube.com/watch?v=..."
                              />
                            </label>

                            <button className="lp-btn full mt-4" disabled={loading} onClick={saveNoteUpdate}>
                              <i className="bi bi-check2-circle me-2" /> Save Lesson Note Changes
                            </button>
                          </div>
                        ) : (
                          /* Visual Human-Friendly Formatted View */
                          <>
                            <NoteView note={note.content} />
                            {note.youtube_videos?.length ? <ListBlock title="Verified YouTube Videos" items={note.youtube_videos} /> : null}
                          </>
                        )}
                      </>
                    ) : (
                      <p className="lp-muted">Generate a note from a plan, scheme topic, or manual topic. Saved notes can later support CBT question generation.</p>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* TAB: LIBRARY */}
            {tab === "library" && (
              <div className="lp-grid">
                <section className="lp-card">
                  <div className="lp-pad">
                    <h2>Saved lesson plans</h2>
                    <p className="lp-muted">Open a saved plan to edit its content or print.</p>
                    <div className="lp-scroll">
                      <table className="lp-table">
                        <thead>
                          <tr>
                            <th>Plan</th>
                            <th>Class</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plans.map((p) => (
                            <tr key={p.id}>
                              <td>
                                <strong>{p.topic}</strong>
                                <div className="lp-muted">{p.subject}</div>
                              </td>
                              <td>{p.class_name}</td>
                              <td>
                                <span className="lp-pill">{p.status}</span>
                              </td>
                              <td>
                                <div className="lp-actions">
                                  <button className="lp-btn soft" onClick={() => openPlanForEdit(p)}>
                                    Edit
                                  </button>
                                  <button className="lp-btn danger" disabled={loading} onClick={() => archiveLessonItem("plan", p.id)}>
                                    Archive
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>

                <section className="lp-card">
                  <div className="lp-pad">
                    <h2>Saved lesson notes</h2>
                    <p className="lp-muted">Review, copy, edit, print, or publish lesson notes to students.</p>
                    <div className="lp-scroll">
                      <table className="lp-table">
                        <thead>
                          <tr>
                            <th>Note</th>
                            <th>Class</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {notes.map((n) => (
                            <tr key={n.id}>
                              <td>
                                <strong>{n.title}</strong>
                                <div className="lp-muted">
                                  {n.subject} - {n.topic}
                                </div>
                              </td>
                              <td>{n.class_name}</td>
                              <td>
                                <span className={`lp-pill ${n.status === "published" ? "pub" : ""}`}>{n.status}</span>
                              </td>
                              <td>
                                <div className="lp-actions">
                                  <button className="lp-btn soft" onClick={() => openNoteForEdit(n)}>
                                    Edit
                                  </button>
                                  <button className="lp-btn soft" onClick={() => copyNote(n)}>
                                    Copy
                                  </button>
                                  {n.status !== "published" ? (
                                    <button className="lp-btn" onClick={() => publishNote(n)}>
                                      Publish
                                    </button>
                                  ) : null}
                                  <button className="lp-btn danger" disabled={loading} onClick={() => archiveLessonItem("note", n.id)}>
                                    Archive
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              </div>
            )}
            <Footer />
          </main>
        </div>
      </div>
    </>
  );
}
