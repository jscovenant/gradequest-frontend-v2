import { FormEvent, useEffect, useMemo, useState } from "react";

import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";
import CbtHtml from "../../../components/cbt/CbtHtml";
import CbtRichEditor from "../../../components/cbt/CbtRichEditor";
import ClassCbtSettingsModal from "../../../components/cbt/ClassCbtSettingsModal";
import { authApi } from "../../../utils/axios";
import { getUser, getToken } from "../../../utils/token";
import { getApiBaseUrl } from "../../../utils/apiUrl";
import { useToast } from "../../../contexts/ToastContext";

const safeAiError = (message: string | undefined, fallback: string) => {
  const text = String(message || fallback);
  return /openai|api key|quota|billing|organization|insufficient_quota|provider/i.test(text)
    ? "Something went wrong while processing this AI request. Please try again later."
    : text;
};
type CbtExam = {
  id: number;
  title: string;
  exam_code?: string;
  subject_id?: number | null;
  class_id?: number | null;
  section_id?: number | null;
  department_id?: number | null;
  subject?: { id?: number; name?: string; department_id?: number | null; section_id?: number | null; class_id?: number | null } | null;
  class?: { id?: number; name?: string } | null;
  section?: { id?: number; name?: string } | null;
  department?: { id?: number; name?: string } | null;
  delivery_mode: "online" | "offline" | "hybrid";
  status: string;
  duration_minutes: number;
  pass_mark?: number;
  max_attempts?: number;
  shuffle_questions?: boolean | number;
  shuffle_options?: boolean | number;
  show_result_after_submit?: boolean | number;
  access_code_required?: boolean | number;
  access_code?: string;
  calculator_enabled?: boolean | number;
  include_theory?: boolean | number;
  theory_instructions?: string;
  schedules?: CbtSchedule[];
  general_instructions?: string;
  questions_count?: number;
  attempts_count?: number;
};

type CbtSchedule = {
  id?: number;
  exam_date?: string;
  starts_at?: string;
  ends_at?: string;
  venue?: string;
};

type SchoolClass = {
  id: number;
  name: string;
  section_id?: number | null;
  department_id?: number | null;
  section?: { id: number; name: string } | null;
};

type SchoolSection = {
  id: number;
  name: string;
};

type AcademicSessionItem = {
  id: number;
  name: string;
  is_current?: boolean | number;
};

type TermItem = {
  id: number;
  name: string;
  is_current?: boolean | number;
  academic_session_id?: number;
};

type Department = {
  id: number;
  name: string;
};

type Subject = {
  id: number;
  name: string;
  subject_id?: string | null;
  department_id?: number | null;
  section_id?: number | null;
  class_id?: number | null;
  section_name?: string | null;
  department_name?: string | null;
  section?: { id: number; name: string } | null;
  department?: { id: number; name: string } | null;
};

const normalizeSubjectName = (name: string | undefined | null) => String(name || "").trim().toLowerCase();

const preferGeneralSubjects = (items: Subject[]) => {
  const chosen = new Map<string, Subject>();
  [...items]
    .sort((a, b) => {
      const byName = normalizeSubjectName(a.name).localeCompare(normalizeSubjectName(b.name));
      if (byName !== 0) return byName;

      const aGeneral = !a.department_id;
      const bGeneral = !b.department_id;
      if (aGeneral !== bGeneral) return aGeneral ? -1 : 1;

      return Number(a.id || 0) - Number(b.id || 0);
    })
    .forEach((subject) => {
      const key = `${normalizeSubjectName(subject.name)}__${subject.section_id || 0}`;
      if (key && !chosen.has(key)) chosen.set(key, subject);
    });

  return Array.from(chosen.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const getSubjectLabel = (subject: Subject) => {
  const meta: string[] = [];
  const secName = subject.section_name || subject.section?.name;
  const deptName = subject.department_name || subject.department?.name;
  if (secName) meta.push(secName);
  if (deptName) meta.push(deptName);

  if (meta.length > 0) {
    return `${subject.name} (${meta.join(" - ")})`;
  }
  return subject.name;
};

type CbtOption = {
  id?: number;
  label?: string;
  option_text: string;
  is_correct?: boolean | number;
};

type CbtQuestion = {
  id: number;
  question_type: string;
  question_text: string;
  marks: number;
  diagram_url?: string | null;
  options?: CbtOption[];
};

type CbtAttempt = {
  id: number;
  status: string;
  attempt_number?: number;
  score?: number | string;
  total_marks?: number | string;
  started_at?: string;
  submitted_at?: string;
  answers_count?: number;
  events_count?: number;
  answers?: { selected_option_ids?: number[]; answer_text?: string }[];
  student?: {
    id?: number;
    firstname?: string;
    surname?: string;
    reg_no?: string;
    level?: { name?: string };
  };
};

type CbtSection = {
  id: number;
  title: string;
  instructions?: string;
  questions?: CbtQuestion[];
  question_groups?: CbtGroup[];
};

type CbtGroup = {
  id: number;
  title?: string;
  group_type: string;
  passage?: string;
  instructions?: string;
  questions?: CbtQuestion[];
};

type CbtExamDetail = CbtExam & {
  general_instructions?: string;
  sections?: CbtSection[];
  question_groups?: CbtGroup[];
  questions?: CbtQuestion[];
  attempts?: CbtAttempt[];
};

type LessonNoteSource = {
  id: number;
  title: string;
  subject: string;
  class_name: string;
  topic: string;
  status: string;
};

type AiQuestionDraft = {
  sections?: {
    title?: string;
    instructions?: string;
    questions?: any[];
    groups?: { title?: string; group_type?: string; passage?: string; questions?: any[] }[];
  }[];
  summary?: {
    questions_detected?: number;
    sections_detected?: number;
    groups_detected?: number;
  };
};

const emptyAiForm = {
  lesson_note_id: "",
  lesson_note_ids: [] as string[],
  topics: "",
  source_text: "",
  question_count: 20,
  difficulty: "normal",
  marks_per_question: 1,
  formats: ["single_choice", "comprehension"],
};
type WordImportResult = {
  message?: string;
  preview?: boolean;
  summary?: {
    questions_detected?: number;
    sections_detected?: number;
    passages_detected?: number;
    errors_count?: number;
    imported_count?: number;
  };
  errors?: string[];
  questions?: {
    number?: number;
    section?: string;
    type?: string;
    text?: string;
    options?: number;
    marks?: number;
    has_passage?: boolean;
  }[];
};

const emptyExam = {
  title: "",
  academic_session_id: "",
  term_id: "",
  subject_id: "",
  class_id: "",
  section_id: "",
  department_id: "",
  delivery_mode: "online",
  duration_minutes: 60,
  pass_mark: 50,
  max_attempts: 1,
  shuffle_questions: false,
  shuffle_options: false,
  show_result_after_submit: false,
  access_code_required: false,
  access_code: "",
  calculator_enabled: false,
  include_theory: false,
  theory_instructions: "",
  schedule: {
    exam_date: "",
    starts_at: "",
    ends_at: "",
    venue: "",
  },
  general_instructions: "",
};

const emptySection = {
  title: "",
  instructions: "",
};

const emptyGroup = {
  section_id: "",
  group_type: "comprehension",
  title: "",
  instructions: "",
  passage: "",
};

const emptyQuestion = {
  section_id: "",
  question_group_id: "",
  question_type: "single_choice",
  question_text: "",
  instructions: "",
  marks: 1,
  difficulty: "normal",
  explanation: "",
  diagram_url: "",
  options: [
    { label: "A", option_text: "", is_correct: true },
    { label: "B", option_text: "", is_correct: false },
    { label: "C", option_text: "", is_correct: false },
    { label: "D", option_text: "", is_correct: false },
  ],
};

const objectiveTypes = ["single_choice", "multiple_choice", "true_false"];

export default function CbtExamsPage() {
  const { showError, showSuccess } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exams, setExams] = useState<CbtExam[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<SchoolSection[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<AcademicSessionItem[]>([]);
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [reuseModalOpen, setReuseModalOpen] = useState(false);
  const [reuseSourceExam, setReuseSourceExam] = useState<CbtExam | null>(null);
  const [reusing, setReusing] = useState(false);
  const [reuseForm, setReuseForm] = useState({
    title: "",
    academic_session_id: "",
    term_id: "",
    class_id: "",
    duration_minutes: 60,
    pass_mark: 50,
    schedule: {
      exam_date: "",
      starts_at: "",
      ends_at: "",
      venue: "",
    },
  });
  const [form, setForm] = useState(emptyExam);
  const [filterSessionId, setFilterSessionId] = useState<string>("");
  const [filterTermId, setFilterTermId] = useState<string>("");
  const [filterClassId, setFilterClassId] = useState<string>("");
  const [filterSubjectId, setFilterSubjectId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSearch, setFilterSearch] = useState<string>("");
  const [settingsForm, setSettingsForm] = useState(emptyExam);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [examDetail, setExamDetail] = useState<CbtExamDetail | null>(null);
  const [sectionForm, setSectionForm] = useState(emptySection);
  const [groupForm, setGroupForm] = useState(emptyGroup);
  const [questionForm, setQuestionForm] = useState(emptyQuestion);
  const [builderTab, setBuilderTab] = useState<"objective" | "theory">("objective");
  const emptyTheoryQuestion = {
    question_text: "",
    marks: 10,
    diagram_url: "",
    explanation: "",
  };
  const [theoryForm, setTheoryForm] = useState(emptyTheoryQuestion);
  const [theoryInstructionsDraft, setTheoryInstructionsDraft] = useState("");
  const [savingTheoryInstructions, setSavingTheoryInstructions] = useState(false);
  const [theoryDiagramUploading, setTheoryDiagramUploading] = useState(false);
  const [theoryDiagramFileName, setTheoryDiagramFileName] = useState("");
  const [showDiagramUrlInput, setShowDiagramUrlInput] = useState(false);
  const [licenseDays] = useState(365);
  const [offlineLicense, setOfflineLicense] = useState<any>(null);
  const [syncFile, setSyncFile] = useState<File | null>(null);
  const [syncPayload, setSyncPayload] = useState<any>(null);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [classCbtModalOpen, setClassCbtModalOpen] = useState(false);
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [questionImportModalOpen, setQuestionImportModalOpen] = useState(false);
  const [questionImportFile, setQuestionImportFile] = useState<File | null>(null);
  const [questionImportResult, setQuestionImportResult] = useState<WordImportResult | null>(null);
  const [questionImporting, setQuestionImporting] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiImporting, setAiImporting] = useState(false);
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [lessonNoteSources, setLessonNoteSources] = useState<LessonNoteSource[]>([]);
  const [lessonNotesLoading, setLessonNotesLoading] = useState(false);
  const [aiForm, setAiForm] = useState(emptyAiForm);
  const [aiDraft, setAiDraft] = useState<AiQuestionDraft | null>(null);
  const [aiCreditSummary, setAiCreditSummary] = useState<{
    remaining_credits: number;
    user_allocation?: { allocated_credits: number; used_credits: number; remaining_credits: number; is_unlimited: boolean } | null;
    is_plus_active?: boolean;
    ai_cbt_question_credit_cost?: number;
  } | null>(null);

  const currentUser = getUser();
  const rawRole = (currentUser?.role || "").toLowerCase().trim();
  const normRole = (currentUser?.normalized_role || currentUser?.role || "").toLowerCase().replace(/[\s-]/g, "_");
  const isTeacher = ["teacher", "class_teacher", "class-teacher", "subject_teacher", "subject-teacher", "staff"].includes(normRole) || ["teacher", "class_teacher", "class-teacher", "subject_teacher", "subject-teacher", "staff"].includes(rawRole);

  const groups = useMemo(() => {
    const fromSections = (examDetail?.sections || []).flatMap((section) =>
      (section.question_groups || []).map((group) => ({ ...group, sectionTitle: section.title }))
    );
    const standalone = (examDetail?.question_groups || []).map((group) => ({ ...group, sectionTitle: "General" }));
    return [...fromSections, ...standalone];
  }, [examDetail]);

  const questions = useMemo(() => {
    const list: CbtQuestion[] = [...(examDetail?.questions || [])];
    (examDetail?.sections || []).forEach((section) => {
      list.push(...(section.questions || []));
      (section.question_groups || []).forEach((group) => list.push(...(group.questions || [])));
    });
    (examDetail?.question_groups || []).forEach((group) => list.push(...(group.questions || [])));

    const seen = new Set<number>();
    return list.filter((question) => {
      if (seen.has(question.id)) return false;
      seen.add(question.id);
      return true;
    });
  }, [examDetail]);

  const objectiveQuestions = useMemo(() => {
    return questions.filter((q) => q.question_type !== "theory");
  }, [questions]);

  const theoryQuestions = useMemo(() => {
    return questions.filter((q) => q.question_type === "theory");
  }, [questions]);

  const readList = <T,>(value: any): T[] => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    return [];
  };

  const isSectionWithoutDept = (sectionId: string | number | undefined | null) => {
    if (!sectionId) return false;
    const sec = sections.find((s) => Number(s.id) === Number(sectionId));
    if (!sec) return false;
    return /primary|nursery|basic|grade|kinder|creche|junior|jss|playgroup/i.test(sec.name);
  };

  const visibleClassesFor = (values: typeof emptyExam) => {
    const selectedSection = values.section_id ? Number(values.section_id) : null;
    if (!selectedSection) return classes;
    return classes.filter((cls) => {
      const clsSecId = cls.section_id ? Number(cls.section_id) : null;
      return !clsSecId || clsSecId === selectedSection;
    });
  };

  const visibleSubjectsFor = (values: typeof emptyExam) => {
    const selectedDepartment = values.department_id ? Number(values.department_id) : null;
    const selectedSection = values.section_id ? Number(values.section_id) : null;
    const selectedClass = values.class_id ? Number(values.class_id) : null;
    const currentSubjectId = values.subject_id ? Number(values.subject_id) : null;

    const classObj = selectedClass ? classes.find((c) => Number(c.id) === selectedClass) : null;
    const classSectionId = classObj?.section_id ? Number(classObj.section_id) : null;
    const effectiveSectionId = selectedSection || classSectionId;

    const filtered = subjects.filter((subject) => {
      if (currentSubjectId && subject.id === currentSubjectId) return true;

      const subjectDepartment = subject.department_id ? Number(subject.department_id) : null;
      const subjectSection = subject.section_id ? Number(subject.section_id) : null;
      const subjectClass = subject.class_id ? Number(subject.class_id) : null;

      // 1. Section filter:
      // If effectiveSectionId is selected: match subjects for that section OR general section subjects (subjectSection == null)
      if (effectiveSectionId && subjectSection && subjectSection !== effectiveSectionId) {
        return false;
      }

      // 2. Department filter:
      // If a department is selected: match subjects for that department OR general subjects (subjectDepartment == null)
      if (selectedDepartment && subjectDepartment && subjectDepartment !== selectedDepartment) {
        return false;
      }

      // 3. Class filter:
      // If selectedClass is selected: match subjects assigned specifically to this class OR subjects for all classes in section (subjectClass == null or 0)
      if (selectedClass && subjectClass && subjectClass !== 0 && subjectClass !== selectedClass) {
        return false;
      }

      return true;
    });

    return preferGeneralSubjects(filtered);
  };

  const createClasses = useMemo(() => visibleClassesFor(form), [classes, form.section_id]);
  const settingsClasses = useMemo(() => visibleClassesFor(settingsForm), [classes, settingsForm.section_id]);
  const createSubjects = useMemo(() => visibleSubjectsFor(form), [subjects, form.department_id, form.section_id, form.class_id, form.subject_id, classes]);
  const settingsSubjects = useMemo(() => visibleSubjectsFor(settingsForm), [subjects, settingsForm.department_id, settingsForm.section_id, settingsForm.class_id, settingsForm.subject_id, classes]);

  const examPayload = (values: typeof emptyExam) => ({
    ...values,
    academic_session_id: values.academic_session_id ? Number(values.academic_session_id) : null,
    term_id: values.term_id ? Number(values.term_id) : null,
    include_theory: Boolean(values.include_theory),
    theory_instructions: values.theory_instructions || "",
    subject_id: values.subject_id ? Number(values.subject_id) : null,
    class_id: values.class_id ? Number(values.class_id) : null,
    section_id: values.section_id ? Number(values.section_id) : null,
    department_id: values.department_id ? Number(values.department_id) : null,
    access_code: values.access_code_required ? values.access_code : null,
    schedule: values.schedule?.exam_date?.trim()
      ? {
          exam_date: values.schedule.exam_date,
          starts_at: values.schedule.starts_at || null,
          ends_at: values.schedule.ends_at || null,
          venue: values.schedule.venue || null,
        }
      : null,
  });

  async function load() {
    setLoading(true);
    try {
      const [examRes, classRes, sectionRes, departmentRes, subjectRes, sessionRes, termRes] = await Promise.all([
        authApi.get("/cbt/exams", { params: { all_periods: 1, per_page: 250 } }),
        authApi.get("/levels"),
        authApi.get("/sections"),
        authApi.get("/departments"),
        authApi.get(isTeacher ? "/subjects/list?for_cbt=1" : "/subjects/list").catch(() => authApi.get(isTeacher ? "/subjects?for_cbt=1" : "/subjects")),
        authApi.get("/sessions").catch(() => ({ data: [] })),
        authApi.get("/terms").catch(() => ({ data: [] })),
      ]);
      const departmentList = readList<Department>(departmentRes.data);
      const sectionList = readList<SchoolSection>(sectionRes.data);
      const classList = Array.isArray(classRes.data) ? classRes.data : [];
      const rawSubjects = readList<any>(subjectRes.data);

      const sectionMap = new Map<number, string>(sectionList.map((s) => [s.id, s.name]));
      const deptMap = new Map<number, string>(departmentList.map((d) => [d.id, d.name]));

      const allSubjects: Subject[] = rawSubjects.map((s: any) => {
        const secId = s.section_id ? Number(s.section_id) : null;
        const deptId = s.department_id ? Number(s.department_id) : null;
        const clsId = s.class_id ? Number(s.class_id) : null;
        return {
          id: Number(s.id),
          name: String(s.name || ""),
          subject_id: s.subject_id || null,
          department_id: deptId,
          section_id: secId,
          class_id: clsId,
          section_name: s.section_name || s.section?.name || (secId ? sectionMap.get(secId) : null) || null,
          department_name: s.department_name || s.department?.name || (deptId ? deptMap.get(deptId) : null) || null,
          section: s.section || (secId ? { id: secId, name: sectionMap.get(secId) || "" } : null),
          department: s.department || (deptId ? { id: deptId, name: deptMap.get(deptId) || "" } : null),
        };
      });

      const user = currentUser;

      let finalSubjects: Subject[] = [];
      if (isTeacher) {
        try {
          const tsRes = await authApi.get("/teacher-subjects");
          const assignments = readList<any>(tsRes.data);
          const teacherSubjectMap = new Map<number, Subject>();
          assignments
            .filter((a: any) => Number(a.teacher_id) === Number(user?.id))
            .forEach((a: any) => {
              const subId = Number(a.subject_id || a.subject?.id || a.id);
              if (subId) {
                const subName = String(a.subject_name || a.subject?.name || a.name || "");
                const secId = a.section_id ? Number(a.section_id) : (a.subject?.section_id ? Number(a.subject.section_id) : null);
                const deptId = a.department_id ? Number(a.department_id) : (a.subject?.department_id ? Number(a.subject.department_id) : null);
                const clsId = a.class_id ? Number(a.class_id) : (a.subject?.class_id ? Number(a.subject.class_id) : null);
                teacherSubjectMap.set(subId, {
                  id: subId,
                  name: subName,
                  subject_id: a.subject_id || null,
                  department_id: deptId,
                  section_id: secId,
                  class_id: clsId,
                  section_name: a.section_name || a.subject?.section_name || (secId ? sectionMap.get(secId) : null) || null,
                  department_name: a.department_name || a.subject?.department_name || (deptId ? deptMap.get(deptId) : null) || null,
                  section: secId ? { id: secId, name: a.section_name || sectionMap.get(secId) || "" } : null,
                  department: deptId ? { id: deptId, name: a.department_name || deptMap.get(deptId) || "" } : null,
                });
              }
            });
          finalSubjects = teacherSubjectMap.size > 0 ? Array.from(teacherSubjectMap.values()) : allSubjects;
        } catch {
          finalSubjects = allSubjects;
        }
      } else {
        finalSubjects = allSubjects;
      }

      const rawExams = examRes.data?.exams?.data ?? examRes.data?.exams ?? [];
      setExams(Array.isArray(rawExams) ? rawExams : []);
      setClasses(classList);
      setSections(sectionList);
      setDepartments(departmentList);
      setSubjects(finalSubjects);
      const rawSessions = readList<any>(sessionRes?.data);
      const rawTerms = readList<any>(termRes?.data);
      const mappedSessions = rawSessions.map((s: any) => ({
        id: Number(s.id),
        name: String(s.name || s.session_name || `Session #${s.id}`),
        is_current: Boolean(s.is_current),
      }));
      const mappedTerms = rawTerms.map((t: any) => ({
        id: Number(t.id),
        name: String(t.name || t.term_name || `Term #${t.id}`),
        is_current: Boolean(t.is_current),
        academic_session_id: t.academic_session_id ? Number(t.academic_session_id) : undefined,
      }));
      setSessions(mappedSessions);
      setTerms(mappedTerms);

      const activeSess = mappedSessions.find((s: any) => s.is_current) || mappedSessions[0];
      const activeT = mappedTerms.find((t: any) => t.is_current) || mappedTerms[0];
      if (activeSess) {
        setFilterSessionId((p) => p || String(activeSess.id));
        setForm((p) => ({ ...p, academic_session_id: p.academic_session_id || String(activeSess.id) }));
      }
      if (activeT) {
        setFilterTermId((p) => p || String(activeT.id));
        setForm((p) => ({ ...p, term_id: p.term_id || String(activeT.id) }));
      }
      authApi.get("/admin/ai/credits").then((r) => setAiCreditSummary(r.data?.data || null)).catch(() => undefined);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to load CBT exams.");
    } finally {
      setLoading(false);
    }
  }

  async function loadExam(id: number) {
    setSelectedExamId(id);
    setSaving(true);
    try {
      const res = await authApi.get(`/cbt/exams/${id}`);
      const exam = res.data?.exam || null;
      setExamDetail(exam);
      if (exam) {
        setSettingsForm({
          academic_session_id: exam.academic_session_id ? String(exam.academic_session_id) : "",
          term_id: exam.term_id ? String(exam.term_id) : "",
          title: exam.title || "",
          subject_id: exam.subject_id ? String(exam.subject_id) : "",
          class_id: exam.class_id ? String(exam.class_id) : "",
          section_id: exam.section_id ? String(exam.section_id) : "",
          department_id: exam.department_id ? String(exam.department_id) : "",
          delivery_mode: exam.delivery_mode || "online",
          duration_minutes: Number(exam.duration_minutes || 60),
          pass_mark: Number(exam.pass_mark || 50),
          max_attempts: Number(exam.max_attempts || 1),
          shuffle_questions: Boolean(exam.shuffle_questions),
          shuffle_options: Boolean(exam.shuffle_options),
          show_result_after_submit: Boolean(exam.show_result_after_submit),
          access_code_required: Boolean(exam.access_code_required),
          access_code: exam.access_code || "",
          calculator_enabled: Boolean(exam.calculator_enabled),
          include_theory: Boolean(exam.include_theory),
          theory_instructions: exam.theory_instructions || "",
          schedule: {
            exam_date: (exam.schedules?.[0]?.exam_date || "").slice(0, 10),
            starts_at: (exam.schedules?.[0]?.starts_at || "").slice(0, 5),
            ends_at: (exam.schedules?.[0]?.ends_at || "").slice(0, 5),
            venue: exam.schedules?.[0]?.venue || "",
          },
          general_instructions: exam.general_instructions || "",
        });
      }
      setSectionForm(emptySection);
      setGroupForm(emptyGroup);
      setQuestionForm(emptyQuestion);
      setTheoryForm(emptyTheoryQuestion);
      if (exam) {
        setTheoryInstructionsDraft(exam.theory_instructions || "");
        if (!exam.include_theory) {
          setBuilderTab("objective");
        }
      }
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to open CBT builder.");
    } finally {
      setSaving(false);
    }
  }

  async function previewExam(id: number) {
    await loadExam(id);
    setPreviewOpen(true);
  }

  async function openWordImport(id: number) {
    await loadExam(id);
    setQuestionImportFile(null);
    setQuestionImportResult(null);
    setQuestionImportModalOpen(true);
  }

  function openReuseModal(exam: CbtExam) {
    setReuseSourceExam(exam);
    const activeSession = sessions.find((s) => s.is_current) || sessions[0];
    const activeTerm = terms.find((t) => t.is_current) || terms[0];
    setReuseForm({
      title: `${exam.title} (Copy)`,
      academic_session_id: activeSession ? String(activeSession.id) : "",
      term_id: activeTerm ? String(activeTerm.id) : "",
      class_id: exam.class_id ? String(exam.class_id) : "",
      duration_minutes: Number(exam.duration_minutes || 60),
      pass_mark: Number(exam.pass_mark || 50),
      schedule: {
        exam_date: "",
        starts_at: "",
        ends_at: "",
        venue: "",
      },
    });
    setReuseModalOpen(true);
  }

  async function handleReuseExam(e: FormEvent) {
    e.preventDefault();
    if (!reuseSourceExam) return;
    if (!reuseForm.academic_session_id) {
      showError("Please select the target academic session.");
      return;
    }
    if (!reuseForm.term_id) {
      showError("Please select the target term.");
      return;
    }

    setReusing(true);
    try {
      const payload = {
        academic_session_id: Number(reuseForm.academic_session_id),
        term_id: Number(reuseForm.term_id),
        class_id: reuseForm.class_id ? Number(reuseForm.class_id) : null,
        title: reuseForm.title.trim() || undefined,
        duration_minutes: Number(reuseForm.duration_minutes) || 60,
        pass_mark: Number(reuseForm.pass_mark) || 50,
        schedule: reuseForm.schedule.exam_date?.trim()
          ? {
              exam_date: reuseForm.schedule.exam_date,
              starts_at: reuseForm.schedule.starts_at || null,
              ends_at: reuseForm.schedule.ends_at || null,
              venue: reuseForm.schedule.venue || null,
            }
          : null,
      };

      const res = await authApi.post(`/cbt/exams/${reuseSourceExam.id}/reuse`, payload);
      showSuccess(res.data?.message || "Exam copied successfully to target academic session!");
      setReuseModalOpen(false);
      setReuseSourceExam(null);
      await load();
      const newExamId = Number(res.data?.exam?.id);
      if (newExamId) {
        await loadExam(newExamId);
      }
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to reuse exam for academic session.");
    } finally {
      setReusing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createExam(e: FormEvent) {
    e.preventDefault();
    if (!form.subject_id) {
      showError("Please select an assigned subject for this CBT exam.");
      return;
    }
    setSaving(true);
    try {
      const res = await authApi.post("/cbt/exams", examPayload(form));
      setForm(emptyExam);
      setCreateModalOpen(false);
      showSuccess("CBT exam created.");
      await load();
      const id = Number(res.data?.exam?.id);
      if (id) await loadExam(id);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to create CBT exam.");
    } finally {
      setSaving(false);
    }
  }

  async function publishExam(id: number) {
    setSaving(true);
    try {
      await authApi.post(`/cbt/exams/${id}/publish`);
      showSuccess("CBT exam published.");
      await load();
      if (selectedExamId === id) await loadExam(id);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to publish CBT exam.");
    } finally {
      setSaving(false);
    }
  }

  async function reopenExam(id: number) {
    setSaving(true);
    try {
      await authApi.post(`/cbt/exams/${id}/reopen`);
      showSuccess("CBT exam reopened for editing.");
      await load();
      if (selectedExamId === id) await loadExam(id);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to reopen CBT exam.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteExam(exam: CbtExam) {
    if ((exam.attempts_count ?? 0) > 0) {
      return showError("This exam cannot be deleted because students have already started it.");
    }

    const ok = window.confirm(`Delete "${exam.title}"? This will remove the exam and all its draft questions.`);
    if (!ok) return;

    setSaving(true);
    try {
      await authApi.delete(`/cbt/exams/${exam.id}`);
      showSuccess("CBT exam deleted.");
      if (selectedExamId === exam.id) {
        setSelectedExamId(null);
        setExamDetail(null);
        setPreviewOpen(false);
      }
      await load();
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to delete CBT exam.");
    } finally {
      setSaving(false);
    }
  }

  async function updateExamSettings(e: FormEvent) {
    e.preventDefault();
    if (!selectedExamId) return showError("Select an exam first.");

    setSaving(true);
    try {
      await authApi.put(`/cbt/exams/${selectedExamId}`, examPayload(settingsForm));
      showSuccess("CBT exam settings updated.");
      setSettingsModalOpen(false);
      await load();
      await loadExam(selectedExamId);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to update exam settings.");
    } finally {
      setSaving(false);
    }
  }

  async function addSection(e: FormEvent) {
    e.preventDefault();
    if (!selectedExamId) return showError("Select an exam first.");
    setSaving(true);
    try {
      await authApi.post(`/cbt/exams/${selectedExamId}/sections`, sectionForm);
      setSectionForm(emptySection);
      showSuccess("Section added.");
      await loadExam(selectedExamId);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to add section.");
    } finally {
      setSaving(false);
    }
  }

  async function addGroup(e: FormEvent) {
    e.preventDefault();
    if (!selectedExamId) return showError("Select an exam first.");
    setSaving(true);
    try {
      await authApi.post(`/cbt/exams/${selectedExamId}/question-groups`, {
        ...groupForm,
        section_id: groupForm.section_id ? Number(groupForm.section_id) : null,
      });
      setGroupForm(emptyGroup);
      showSuccess("Instruction/comprehension group added.");
      await loadExam(selectedExamId);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to add group.");
    } finally {
      setSaving(false);
    }
  }

  async function saveTheoryInstructions() {
    if (!selectedExamId) return;
    setSavingTheoryInstructions(true);
    try {
      await authApi.put(`/cbt/exams/${selectedExamId}`, {
        ...examPayload(settingsForm),
        theory_instructions: theoryInstructionsDraft,
      });
      setExamDetail((p) => p ? { ...p, theory_instructions: theoryInstructionsDraft } : p);
      showSuccess("Theory section instructions saved.");
      await load();
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to save theory instructions.");
    } finally {
      setSavingTheoryInstructions(false);
    }
  }

  async function handleTheoryDiagramFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedExamId) return;

    if (file.size > 5 * 1024 * 1024) {
      showError("Image file size exceeds the 5MB limit. Please choose a smaller image.");
      return;
    }

    setTheoryDiagramFileName(file.name);
    setTheoryDiagramUploading(true);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64Data = ev.target?.result as string;
      if (base64Data) {
        setTheoryForm((p) => ({ ...p, diagram_url: base64Data }));
      }

      try {
        const formData = new FormData();
        formData.append("image", file);
        const res = await authApi.post(`/cbt/exams/${selectedExamId}/questions/images`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data?.url) {
          setTheoryForm((p) => ({ ...p, diagram_url: res.data.url }));
          showSuccess("Diagram uploaded successfully.");
        }
      } catch {
        showSuccess("Diagram image selected.");
      } finally {
        setTheoryDiagramUploading(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function addTheoryQuestion(e: FormEvent) {
    e.preventDefault();
    if (!selectedExamId) return showError("Select an exam first.");
    const plainText = theoryForm.question_text.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    if (!plainText && !theoryForm.question_text.includes("<img")) {
      return showError("Enter the theory question before saving.");
    }
    setSaving(true);
    try {
      const isBase64 = Boolean(theoryForm.diagram_url?.startsWith("data:image/"));
      const payload: any = {
        question_type: "theory",
        question_text: theoryForm.question_text,
        marks: Number(theoryForm.marks) || 10,
        diagram_url: isBase64 ? null : (theoryForm.diagram_url || null),
        diagram_base64: isBase64 ? theoryForm.diagram_url : null,
        explanation: theoryForm.explanation || "",
        options: [],
      };
      await authApi.post(`/cbt/exams/${selectedExamId}/questions`, payload);
      setTheoryForm(emptyTheoryQuestion);
      setTheoryDiagramFileName("");
      setShowDiagramUrlInput(false);
      showSuccess("Theory question added.");
      await load();
      await loadExam(selectedExamId);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to add theory question.");
    } finally {
      setSaving(false);
    }
  }

  async function addQuestion(e: FormEvent) {
    e.preventDefault();
    if (!selectedExamId) return showError("Select an exam first.");
    const plainQuestionText = questionForm.question_text.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    if (!plainQuestionText && !questionForm.question_text.includes("<img")) {
      return showError("Enter the question before saving.");
    }

    const usesOptions = objectiveTypes.includes(questionForm.question_type);
    const isTheory = questionForm.question_type === "theory";
    const payload: any = {
      ...questionForm,
      section_id: questionForm.section_id ? Number(questionForm.section_id) : null,
      question_group_id: questionForm.question_group_id ? Number(questionForm.question_group_id) : null,
      marks: Number(questionForm.marks),
      diagram_url: questionForm.diagram_url || null,
      options: isTheory ? [] : (usesOptions ? questionForm.options.filter((option) => option.option_text.trim()) : []),
    };

    if (questionForm.question_type === "true_false") {
      payload.options = [
        { label: "A", option_text: "True", is_correct: questionForm.options[0]?.is_correct },
        { label: "B", option_text: "False", is_correct: !questionForm.options[0]?.is_correct },
      ];
    }

    if (usesOptions && payload.options.length < 2) {
      return showError("Add at least two options for objective questions.");
    }

    setSaving(true);
    try {
      await authApi.post(`/cbt/exams/${selectedExamId}/questions`, payload);
      setQuestionForm(emptyQuestion);
      showSuccess("Question added.");
      await load();
      await loadExam(selectedExamId);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to add question.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuestion(id: number) {
    if (!selectedExamId) return;
    const ok = window.confirm("Delete this question?");
    if (!ok) return;

    setSaving(true);
    try {
      await authApi.delete(`/cbt/questions/${id}`);
      showSuccess("Question removed.");
      await load();
      await loadExam(selectedExamId);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to remove question.");
    } finally {
      setSaving(false);
    }
  }

  async function resetAttempt(attempt: CbtAttempt) {
    if (!selectedExamId) return;
    const studentName = `${attempt.student?.surname || ""} ${attempt.student?.firstname || ""}`.trim() || "this student";
    const ok = window.confirm(`Reset CBT attempt for ${studentName}? This is only allowed because no question has been answered.`);
    if (!ok) return;

    setSaving(true);
    try {
      await authApi.post(`/cbt/attempts/${attempt.id}/reset`, {
        reason: "Student exited the exam before answering any question.",
      });
      showSuccess("Attempt reset. The student can start again.");
      await load();
      await loadExam(selectedExamId);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to reset attempt.");
    } finally {
      setSaving(false);
    }
  }

  async function exportScores(exam: CbtExam) {
    setSaving(true);
    try {
      const res = await authApi.get(`/cbt/exams/${exam.id}/scores/export`, {
        responseType: "blob",
      });
      const disposition = String(res.headers?.["content-disposition"] || "");
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const fileName = match?.[1] || `cbt_scores_exam_${exam.id}.xlsx`;
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess("CBT scores exported.");
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to export CBT scores.");
    } finally {
      setSaving(false);
    }
  }

  async function downloadQuestionTemplate(format: "docx" | "xlsx" | "csv" = "xlsx") {
    if (!selectedExamId) return showError("Select an exam first.");

    setSaving(true);
    try {
      const res = await authApi.get(`/cbt/exams/${selectedExamId}/questions/template/${format}`, {
        responseType: "blob",
      });
      const disposition = String(res.headers?.["content-disposition"] || "");
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const fileName = match?.[1] || `cbt_question_import_template.${format === "csv" ? "csv" : format}`;
      const blob = new Blob([res.data], {
        type: format === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : format === "csv"
            ? "text/csv"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess(`${format.toUpperCase()} template downloaded.`);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to download template.");
    } finally {
      setSaving(false);
    }
  }

  async function importQuestionFile(preview = false) {
    if (!selectedExamId) return showError("Select an exam first.");
    if (!questionImportFile) return showError("Choose a Word or Excel file first.");

    setQuestionImporting(true);
    setQuestionImportResult(null);
    try {
      const payload = new FormData();
      payload.append("file", questionImportFile);
      payload.append("preview", preview ? "1" : "0");

      const res = await authApi.post(`/cbt/exams/${selectedExamId}/questions/import`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setQuestionImportResult(res.data || null);

      if (preview) {
        showSuccess("Question file checked.");
      } else {
        showSuccess("Questions imported.");
        setQuestionImportFile(null);
        await load();
        await loadExam(selectedExamId);
      }
    } catch (e: any) {
      const data = e?.response?.data || null;
      setQuestionImportResult(data);
      showError(data?.message || "Unable to import questions.");
    } finally {
      setQuestionImporting(false);
    }
  }

  function toggleAiFormat(format: string) {
    setAiForm((current) => {
      const exists = current.formats.includes(format);
      const formats = exists ? current.formats.filter((item) => item !== format) : [...current.formats, format];
      return { ...current, formats: formats.length ? formats : [format] };
    });
  }
  async function loadLessonNoteSources() {
    setLessonNotesLoading(true);
    try {
      const res = await authApi.get("/admin/ai/lessons/workspace");
      const rows = Array.isArray(res.data?.lesson_notes) ? res.data.lesson_notes : [];
      setLessonNoteSources(rows.filter((item: LessonNoteSource) => item.status === "published" || item.status === "draft"));
    } catch {
      setLessonNoteSources([]);
    } finally {
      setLessonNotesLoading(false);
    }
  }

  function toggleLessonNoteSource(id: string) {
    const selected = lessonNoteSources.find((item) => String(item.id) === id);
    setAiForm((current) => {
      const currentLessonNoteIds = Array.isArray(current.lesson_note_ids) ? current.lesson_note_ids : [];
      const exists = currentLessonNoteIds.includes(id);
      const lesson_note_ids = exists ? currentLessonNoteIds.filter((item) => item !== id) : [...currentLessonNoteIds, id];
      const selectedTopics = lessonNoteSources
        .filter((item) => lesson_note_ids.includes(String(item.id)))
        .map((item) => item.topic)
        .filter(Boolean)
        .join(", ");
      return {
        ...current,
        lesson_note_id: lesson_note_ids[0] || "",
        lesson_note_ids,
        topics: selectedTopics || selected?.topic || current.topics,
      };
    });
  }

  function openAiGenerator() {
    setAiDraft(null);
    setAiFile(null);
    setAiModalOpen(true);
    loadLessonNoteSources();
    authApi.get("/admin/ai/credits").then((r) => setAiCreditSummary(r.data?.data || null)).catch(() => undefined);
  }

  async function generateAiQuestions() {
    if (!selectedExamId) return showError("Select an exam first.");
    if (aiCreditSummary && aiCreditSummary.is_plus_active === false) {
      return showError("AI question generation is available on the SchoolProfit Plus package.");
    }
    const selectedLessonNoteIds = Array.isArray(aiForm.lesson_note_ids) ? aiForm.lesson_note_ids : [];
    if (!aiFile && selectedLessonNoteIds.length === 0 && !aiForm.topics.trim() && !aiForm.source_text.trim()) return showError("Select one or more saved lesson notes, upload a note, or enter topics first.");

    setAiGenerating(true);
    setAiDraft(null);
    try {
      const form = new FormData();
      if (aiFile) form.append("source_file", aiFile);
      selectedLessonNoteIds.forEach((id) => form.append("lesson_note_ids[]", String(id)));
      form.append("topics", aiForm.topics);
      form.append("source_text", aiForm.source_text);
      form.append("count", String(aiForm.count));
      form.append("difficulty", aiForm.difficulty);
      form.append("style", aiForm.style);
      form.append("custom_instruction", aiForm.custom_instruction);

      const res = await authApi.post(`/admin/cbt/exams/${selectedExamId}/ai/generate-questions`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAiDraft(res.data?.data || null);
      showSuccess("AI draft questions generated. Review and import below.");
      authApi.get("/admin/ai/credits").then((r) => setAiCreditSummary(r.data?.data || null)).catch(() => undefined);
    } catch (err: any) {
      showError(err?.response?.data?.message || err?.message || "Failed to generate questions with AI.");
    } finally {
      setAiGenerating(false);
    }
  }

  async function importAiDraft() {
    if (!selectedExamId || !aiDraft) return showError("Generate and review AI questions first.");

    setAiImporting(true);
    try {
      const res = await authApi.post("/cbt/exams/" + selectedExamId + "/questions/ai-import", { draft: aiDraft });
      showSuccess(res.data?.message || "AI questions imported.");
      setAiDraft(null);
      setAiFile(null);
      setAiModalOpen(false);
      await load();
      await loadExam(selectedExamId);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to import AI questions.");
    } finally {
      setAiImporting(false);
    }
  }
  async function prepareAndDownloadOfflineBundle() {
    // Allow staff/teachers to manage offline CBT
    setSaving(true);
    setOfflineLicense(null);
    setSyncResult(null);
    try {
      const licenseRes = await authApi.post("/cbt/offline/licenses", { days: licenseDays });
      const license = licenseRes.data?.license || null;
      if (!license?.id) throw new Error("Offline CBT package could not be prepared.");
      setOfflineLicense(license);

      const exam = selectedExamId ? exams.find((item) => item.id === selectedExamId) : null;
      if (exam && exam.status !== "published") throw new Error("Publish this exam before downloading the offline package.");
      if (exam && !["offline", "hybrid"].includes(exam.delivery_mode)) throw new Error("Change this exam mode to Offline/LAN or Hybrid before downloading an offline package.");
      const query = exam ? `?exam_ids[]=${exam.id}` : "";
      const res = await authApi.get(`/cbt/offline/licenses/${license.id}/bundle${query}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gradequest_offline_cbt_bundle_${license.id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showSuccess("Offline CBT bundle downloaded.");
    } catch (e: any) {
      showError(e?.response?.data?.message || e?.message || "Unable to download offline CBT bundle.");
    } finally {
      setSaving(false);
    }
  }

  
  async function fetchLicenses() {
    try {
      const res = await authApi.get("/cbt/offline/licenses");
      const list = res.data?.licenses?.data || (Array.isArray(res.data?.licenses) ? res.data.licenses : []);
      if (list.length > 0) {
        const active = list.find((item: any) => item.status === 'active') || list[0];
        setOfflineLicense(active);
      }
    } catch (e: any) {
      console.warn("Could not fetch offline licenses:", e);
    }
  }

  async function generateFreshLicense() {
    setSaving(true);
    try {
      const res = await authApi.post("/cbt/offline/licenses", { days: licenseDays });
      const lic = res.data?.license;
      if (lic) {
        setOfflineLicense(lic);
        showSuccess("New offline license generated! Copy the license key below.");
      }
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to generate offline license.");
    } finally {
      setSaving(false);
    }
  }

  async function downloadOfflineBundle() {
    // Allow staff/teachers to manage offline CBT
    if (!offlineLicense?.id) {
      showError("Generate an offline license first.");
      return;
    }

    setSaving(true);
    try {
      const exam = selectedExamId ? exams.find((item) => item.id === selectedExamId) : null;
      if (exam && exam.status !== "published") throw new Error("Publish this exam before downloading the offline package.");
      if (exam && !["offline", "hybrid"].includes(exam.delivery_mode)) throw new Error("Change this exam mode to Offline/LAN or Hybrid before downloading an offline package.");
      const query = exam ? `?exam_ids[]=${exam.id}` : "";
      const res = await authApi.get(`/cbt/offline/licenses/${offlineLicense.id}/bundle${query}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gradequest_offline_cbt_bundle_${offlineLicense.id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showSuccess("Offline CBT bundle downloaded.");
    } catch (e: any) {
      showError(e?.response?.data?.message || "Unable to download offline CBT bundle.");
    } finally {
      setSaving(false);
    }
  }

  async function downloadOfflineInstaller() {
    // Allow staff/teachers to manage offline CBT
    setSaving(true);
    try {
      const token = getToken?.() || "";
      const base = getApiBaseUrl().replace(/\/+$/, "");
      const isGradeQuest = typeof window !== "undefined" && window.location.hostname.toLowerCase().includes("gradequest");
      const appName = isGradeQuest ? "GradeQuest" : "SchoolProfit";
      const fileName = `${appName}OfflineCBTSetup.exe`;
      const directUrl = `${base}/public/cbt/offline/installer/download?token=${encodeURIComponent(token)}`;

      showSuccess(`Downloading ${appName} Offline CBT Setup (107 MB)... Check your browser's download bar.`);

      const a = document.createElement("a");
      a.href = directUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      showError(e?.message || "Unable to start offline CBT download.");
    } finally {
      setTimeout(() => setSaving(false), 2000);
    }
  }

  async function downloadStudentClient() {
    setSaving(true);
    try {
      const token = getToken?.() || "";
      const base = getApiBaseUrl().replace(/\/+$/, "");
      const isGradeQuest = typeof window !== "undefined" && window.location.hostname.toLowerCase().includes("gradequest");
      const appName = isGradeQuest ? "GradeQuest" : "SchoolProfit";
      const fileName = `${appName}StudentClientSetup.exe`;
      const directUrl = `${base}/public/cbt/offline/student-client/download?token=${encodeURIComponent(token)}`;

      showSuccess(`Downloading ${appName} Student Client Setup (2 MB)... Run this on student PCs.`);

      const a = document.createElement("a");
      a.href = directUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      showError(e?.message || "Unable to start student client download.");
    } finally {
      setTimeout(() => setSaving(false), 2000);
    }
  }

  async function syncOfflineResults() {
    const licenseId = Number(syncPayload?.license_id || syncPayload?.offline_license_id || offlineLicense?.id || 0);
    if (!licenseId) {
      showError("The result file does not contain a valid offline package reference.");
      return;
    }

    if (!syncPayload) {
      showError("Choose the offline result file first.");
      return;
    }

    setSaving(true);
    setSyncResult(null);
    try {
      const res = await authApi.post(`/cbt/offline/licenses/${licenseId}/sync-results`, {
        sync_reference: syncPayload.sync_reference || syncPayload.reference || undefined,
        attempts: Array.isArray(syncPayload.attempts) ? syncPayload.attempts : [],
      });
      setSyncResult(res.data?.summary || null);
      setSyncFile(null);
      setSyncPayload(null);
      showSuccess(res.data?.message || "Offline CBT results synced.");
      if (selectedExamId) await loadExam(selectedExamId);
    } catch (e: any) {
      showError(e?.response?.data?.message || e?.message || "Unable to sync offline CBT results.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSyncFileSelected(file?: File | null) {
    setSyncFile(file || null);
    setSyncPayload(null);
    setSyncResult(null);
    if (!file) return;

    try {
      const payload = JSON.parse(await file.text());
      if (!Array.isArray(payload.attempts)) {
        throw new Error("This JSON file does not contain offline CBT attempts.");
      }
      setSyncPayload(payload);
      if (payload.license_id || payload.offline_license_id) {
        setOfflineLicense((current: any) => current?.id ? current : { id: payload.license_id || payload.offline_license_id });
      }
      showSuccess("Offline result file is ready to sync.");
    } catch (e: any) {
      setSyncFile(null);
      setSyncPayload(null);
      showError(e?.message || "Unable to read offline result file.");
    }
  }

  const selectedIsPublished = examDetail?.status === "published";
  const filteredExams = useMemo(() => {
    if (!Array.isArray(exams)) return [];
    return exams.filter((exam) => {
      if (filterSessionId && filterSessionId !== "all") {
        if (Number(exam.academic_session_id) !== Number(filterSessionId)) {
          return false;
        }
      }
      if (filterTermId && filterTermId !== "all") {
        if (Number(exam.term_id) !== Number(filterTermId)) {
          return false;
        }
      }
      if (filterClassId) {
        if (Number(exam.class_id) !== Number(filterClassId)) {
          return false;
        }
      }
      if (filterSubjectId) {
        if (Number(exam.subject_id) !== Number(filterSubjectId)) {
          return false;
        }
      }
      if (filterStatus && filterStatus !== "all") {
        if (String(exam.status || "").toLowerCase() !== filterStatus.toLowerCase()) {
          return false;
        }
      }
      if (filterSearch && filterSearch.trim()) {
        const q = filterSearch.trim().toLowerCase();
        const titleMatch = (exam.title || "").toLowerCase().includes(q);
        const codeMatch = (exam.exam_code || "").toLowerCase().includes(q);
        const subjectMatch = (exam.subject?.name || "").toLowerCase().includes(q);
        const classMatch = (exam.class?.name || "").toLowerCase().includes(q);
        if (!titleMatch && !codeMatch && !subjectMatch && !classMatch) {
          return false;
        }
      }
      return true;
    });
  }, [exams, filterSessionId, filterTermId, filterClassId, filterSubjectId, filterStatus, filterSearch]);

  const draftCount = exams.filter((exam) => exam.status === "draft").length;
  const publishedCount = exams.filter((exam) => exam.status === "published").length;
  const scheduledCount = exams.filter((exam) => (exam.schedules || []).length > 0).length;
  const totalQuestions = exams.reduce((sum, exam) => sum + Number(exam.questions_count || 0), 0);
  const selectedSchedule = examDetail?.schedules?.[0] || null;
  const schoolCode = currentUser?.role === "Admin" ? currentUser?.reg_no : currentUser?.school_code;
  const publicAccessUrl = `${window.location.origin}/cbt/access${schoolCode ? `?school_code=${encodeURIComponent(schoolCode)}` : ""}`;
  const cbtManualUrl = "/docs/gradequest-cbt-online-offline-manual.pdf";

  const statusClass = (status?: string) => {
    const value = String(status || "").toLowerCase();
    if (value === "published") return "cbt-status cbt-status-live";
    if (value === "closed") return "cbt-status cbt-status-closed";
    if (value === "archived") return "cbt-status cbt-status-muted";
    return "cbt-status cbt-status-draft";
  };

  const scheduleLabel = (exam: CbtExam) => {
    const schedule = exam.schedules?.[0];
    if (!schedule?.exam_date) return "Unscheduled / On-demand";
    const date = new Date(schedule.exam_date).toLocaleDateString(undefined, { day: "numeric", month: "short" });
    const start = schedule.starts_at?.slice(0, 5) || "--:--";
    const end = schedule.ends_at?.slice(0, 5) || "--:--";
    return `${date} - ${start}-${end}`;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .cbt-main {
          min-height: 100vh;
          background: #F8FAFC;
          padding: calc(var(--gq-topnav-height, 66px) + 24px) 28px 48px;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        }
        @media (max-width: 767.98px) {
          .cbt-main {
            padding: calc(var(--gq-topnav-height, 66px) + 16px) 16px 40px;
          }
        }
        .cbt-shell { max-width: 100%; margin: 0 auto; }
        .cbt-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 60%, #1E3A8A 100%);
          color: #fff;
          border-radius: 16px;
          padding: 24px 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 18px 24px;
          box-shadow: 0 10px 30px -5px rgba(15, 39, 68, 0.15);
          position: relative;
          overflow: hidden;
        }
        .cbt-hero-glow {
          position: absolute;
          top: -60px;
          right: -60px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.15) 0%, transparent 65%);
          pointer-events: none;
        }
        .cbt-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #FBBF24;
          background: rgba(217, 119, 6, 0.20);
          border: 1px solid rgba(217, 119, 6, 0.35);
          border-radius: 100px;
          padding: 4px 12px;
          margin-bottom: 10px;
        }
        .cbt-hero-text {
          flex: 1 1 480px;
          min-width: 280px;
          position: relative;
          z-index: 1;
        }
        .cbt-hero h1 {
          font-weight: 800;
          margin: 0 0 6px;
          font-size: 24px;
          color: #fff;
          line-height: 1.25;
        }
        .cbt-hero p {
          margin: 0;
          color: #CBD5E1;
          max-width: 100%;
          line-height: 1.55;
          font-size: 13.5px;
        }
        .cbt-hero-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; align-items: center; position: relative; z-index: 1; }
        .cbt-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: 18px; }
        .cbt-stat {
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 18px 20px;
          box-shadow: 0 4px 12px rgba(15, 39, 68, 0.03);
        }
        .cbt-stat span { display: block; color: #64748B; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
        .cbt-stat strong { display: block; color: #0F2744; font-size: 24px; font-weight: 800; margin-top: 4px; }
        .cbt-grid { display: grid; grid-template-columns: 1fr; gap: 16px; margin-top: 18px; align-items: start; }
        .cbt-builder { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 16px; margin-top: 18px; align-items: start; }
        .cbt-panel {
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(15, 39, 68, 0.03);
          overflow: hidden;
        }
        .cbt-head { padding: 18px 20px; border-bottom: 1px solid #E2E8F0; background: #fff; }
        .cbt-head h2 { font-size: 16px; font-weight: 700; margin: 0; color: #0F2744; }
        .cbt-head p { margin: 4px 0 0; color: #64748B; font-size: 13px; line-height: 1.5; }
        .cbt-body { padding: 18px 20px; }
        .cbt-label { display: block; font-size: 11.5px; font-weight: 700; color: #0F2744; text-transform: uppercase; margin: 0 0 5px; }
        .cbt-input, .cbt-select, .cbt-textarea {
          width: 100%;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 9px 12px;
          margin: 0;
          background: #F8FAFC;
          color: #0F2744;
          outline: none;
          font-size: 13px;
          font-weight: 600;
          transition: border-color .18s, box-shadow .18s;
        }
        .cbt-input:focus, .cbt-select:focus, .cbt-textarea:focus { border-color: #D97706; background: #fff; box-shadow: 0 0 0 3px rgba(217,119,6,.10); }
        .cbt-input, .cbt-select { height: 40px; }
        .cbt-textarea { min-height: 86px; resize: vertical; }
        .cbt-field { margin-bottom: 14px; }
        .cbt-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .cbt-form-grid .cbt-field-full { grid-column: 1/-1; }
        .cbt-section-label { display: flex; align-items: center; gap: 8px; margin: 4px 0 12px; color: #0F2744; font-size: 12px; font-weight: 800; text-transform: uppercase; }
        .cbt-section-label:after { content: ""; height: 1px; background: #E2E8F0; flex: 1; }
        .cbt-mini-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .cbt-help { font-size: 12px; color: #64748B; margin: -2px 0 12px; line-height: 1.45; }
        .cbt-btn {
          border: 0;
          border-radius: 10px;
          padding: 9px 16px;
          font-size: 13px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 38px;
          white-space: nowrap;
          cursor: pointer;
          transition: all .2s ease;
          text-decoration: none;
        }
        .cbt-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(15,39,68,.12); }
        .cbt-btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }
        .cbt-primary { background: #0F2744; color: #fff; }
        .cbt-primary:hover:not(:disabled) { background: #1E3A8A; color: #fff; }
        .cbt-soft { background: rgba(255,255,255,0.14); color: #fff; border: 1px solid rgba(255,255,255,0.25); }
        .cbt-soft:hover:not(:disabled) { background: rgba(255,255,255,0.24); color: #fff; }
        .cbt-gold { background: #D97706; color: #FFFFFF; }
        .cbt-gold:hover:not(:disabled) { background: #B45309; color: #FFFFFF; }
        .cbt-secondary { background: #EEF2F6; color: #0F2744; border: 1px solid #CBD5E1; font-weight: 700; }
        .cbt-secondary:hover:not(:disabled) { background: #E2E8F0; color: #0F2744; border-color: #94A3B8; }
        .cbt-ghost { background: #F1F5F9; color: #0F2744; border: 1px solid #CBD5E1; font-weight: 700; }
        .cbt-ghost:hover:not(:disabled) { background: #E2E8F0; color: #0F2744; border-color: #94A3B8; }
        .cbt-danger { background: #FEE2E2; color: #991B1B; border: 1px solid #FECACA; font-weight: 700; }
        .cbt-danger:hover:not(:disabled) { background: #FCA5A5; color: #7F1D1D; }
        .cbt-btn-reuse { background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE; font-weight: 700; }
        .cbt-btn-reuse:hover:not(:disabled) { background: #4338CA; color: #FFFFFF; border-color: #4338CA; }
        .cbt-table td:last-child { min-width: 460px; }
        .cbt-table th:last-child {
          position: sticky;
          right: 0;
          background: #F8FAFC;
          z-index: 2;
          box-shadow: -4px 0 8px rgba(15, 39, 68, 0.06);
        }
        .cbt-table td:last-child {
          position: sticky;
          right: 0;
          background: #FFFFFF;
          z-index: 1;
          box-shadow: -4px 0 8px rgba(15, 39, 68, 0.06);
        }
        .cbt-table tr:hover td:last-child {
          background: #F8FAFC;
        }
        .cbt-table-wrap { overflow: auto; }
        .cbt-table { width: 100%; min-width: 920px; border-collapse: separate; border-spacing: 0; }
        .cbt-table th { background: #F8FAFC; color: #64748B; text-transform: uppercase; font-size: 11.5px; font-weight: 700; letter-spacing: .04em; padding: 12px 14px; border-bottom: 1px solid #E2E8F0; }
        .cbt-table td { padding: 14px; border-bottom: 1px solid #F1F5F9; vertical-align: middle; font-size: 13px; color: #334155; }
        .cbt-table tbody tr:hover { background: #F8FAFC; }
        .cbt-title { font-weight: 700; color: #0F2744; }
        .cbt-title-lg { font-size: 16px; }
        .cbt-sub { color: #64748B; font-size: 12px; line-height: 1.45; }
        .cbt-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 700; background: #EEF2FF; color: #3730A3; text-transform: capitalize; }
        .cbt-pill-neutral { background: #F1F5F9; color: #334155; }
        .cbt-pill-green { background: #DCFCE7; color: #166534; }
        .cbt-pill-gold { background: #FEF3C7; color: #92400E; }
        .cbt-status { display: inline-flex; border-radius: 999px; padding: 5px 10px; font-size: 11px; font-weight: 700; text-transform: capitalize; }
        .cbt-status-live { background: #DCFCE7; color: #166534; }
        .cbt-status-draft { background: #FEF3C7; color: #92400E; }
        .cbt-status-closed { background: #E0F2FE; color: #075985; }
        .cbt-status-muted { background: #F1F5F9; color: #475569; }
        .cbt-exam-name { display: flex; gap: 10px; align-items: flex-start; }
        .cbt-exam-icon { width: 38px; height: 38px; border-radius: 10px; background: #0F2744; color: #fff; display: grid; place-items: center; flex: 0 0 auto; }
        .cbt-row-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-start; }
        .cbt-license { background: #0F2744; color: #E2E8F0; border-radius: 12px; padding: 14px; margin-top: 12px; white-space: pre-wrap; overflow: auto; max-height: 240px; }
        .cbt-option-row { display: grid; grid-template-columns: 54px minmax(0, 1fr) 86px; gap: 8px; align-items: center; margin-bottom: 8px; }
        .cbt-option-check { display: flex; gap: 6px; align-items: center; font-size: 12px; font-weight: 700; color: #475569; }
        .cbt-toggle { display: flex; align-items: flex-start; gap: 9px; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; background: #F8FAFC; }
        .cbt-toggle input { margin-top: 3px; }
        .cbt-toggle strong { display: block; color: #0F2744; font-size: 13px; }
        .cbt-toggle span { display: block; color: #64748B; font-size: 12px; line-height: 1.42; }
        .cbt-question-card { border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px; margin-bottom: 10px; background: #fff; }
        .cbt-question-card h3 { font-size: 14px; font-weight: 700; margin: 0 0 6px; color: #0F2744; line-height: 1.5; }
        .cbt-question-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .cbt-empty { border: 1px dashed #CBD5E1; border-radius: 14px; padding: 24px; text-align: center; color: #64748B; background: #F8FAFC; }
        .cbt-ai-note-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 8px; max-height: 240px; overflow: auto; border: 1px solid #E2E8F0; border-radius: 12px; background: #fff; padding: 10px; }
        .cbt-ai-note-option { display: flex; gap: 9px; align-items: flex-start; border: 1px solid #E2E8F0; border-radius: 10px; background: #F8FAFC; padding: 10px; cursor: pointer; }
        .cbt-ai-note-option input { margin-top: 3px; }
        .cbt-ai-note-option strong { display: block; color: #0F2744; font-size: 12.5px; line-height: 1.35; }
        .cbt-ai-note-option small { display: block; color: #64748B; font-size: 11px; line-height: 1.35; margin-top: 3px; }
        .cbt-ai-format-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
        .cbt-ai-check { border: 1px solid #E2E8F0; background: #fff; border-radius: 10px; padding: 10px; display: flex; gap: 8px; align-items: center; font-size: 12px; font-weight: 700; color: #334155; }
        .cbt-import-box { border: 1px solid #E2E8F0; border-radius: 14px; background: #F8FAFC; padding: 16px; margin-bottom: 14px; }
        .cbt-import-top { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: end; }
        .cbt-import-file { position: relative; border: 1px dashed #CBD5E1; border-radius: 12px; background: #fff; padding: 12px; min-height: 62px; display: flex; align-items: center; gap: 10px; }
        .cbt-import-file i { font-size: 22px; color: #0F2744; }
        .cbt-import-file strong { display: block; color: #0F2744; font-size: 13px; }
        .cbt-import-file span { display: block; color: #64748B; font-size: 12px; line-height: 1.35; }
        .cbt-import-file input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
        .cbt-import-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        .cbt-import-guide { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
        .cbt-import-guide code { display: block; background: #fff; border: 1px solid #E2E8F0; border-radius: 9px; padding: 8px; color: #334155; font-size: 11px; white-space: normal; }
        .cbt-import-result { border-top: 1px solid #E2E8F0; margin-top: 12px; padding-top: 12px; }
        .cbt-import-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 10px; }
        .cbt-import-summary div { background: #fff; border: 1px solid #E2E8F0; border-radius: 10px; padding: 9px; }
        .cbt-import-summary span { display: block; color: #64748B; font-size: 10px; font-weight: 700; text-transform: uppercase; }
        .cbt-import-summary strong { display: block; color: #0F2744; font-size: 16px; font-weight: 800; }
        .cbt-import-errors { border: 1px solid #fecaca; background: #fff1f2; color: #991b1b; border-radius: 10px; padding: 10px; font-size: 12px; }
        .cbt-import-preview { display: grid; gap: 8px; max-height: 260px; overflow: auto; }
        .cbt-import-preview-item { background: #fff; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px; }
        .cbt-import-preview-item strong { display: block; color: #0F2744; font-size: 13px; line-height: 1.45; }
        .cbt-import-preview-item span { display: inline-flex; margin: 6px 6px 0 0; }
        .cbt-rich-editor { border: 1px solid #E2E8F0; border-radius: 12px; background: #fff; margin-bottom: 12px; overflow: hidden; }
        .cbt-rich-toolbar { display: flex; gap: 6px; flex-wrap: wrap; padding: 8px; border-bottom: 1px solid #E2E8F0; background: #F8FAFC; }
        .cbt-rich-toolbar button { width: 34px; height: 32px; border: 1px solid #E2E8F0; background: #fff; color: #334155; border-radius: 8px; display: grid; place-items: center; cursor: pointer; }
        .cbt-rich-toolbar button.is-active { background: #0F2744; border-color: #0F2744; color: #fff; }
        .cbt-rich-toolbar button:disabled { opacity: .45; cursor: not-allowed; }
        .cbt-rich-content { padding: 12px; }
        .cbt-rich-content .ProseMirror { outline: none; min-height: inherit; }
        .cbt-html { color: #0F2744; line-height: 1.55; }
        .cbt-html p { margin: 0 0 10px; }
        .cbt-html table, .cbt-rich-content table { width: 100%; border-collapse: collapse; margin: 10px 0; table-layout: fixed; }
        .cbt-html th, .cbt-html td, .cbt-rich-content th, .cbt-rich-content td { border: 1px solid #CBD5E1; padding: 8px; vertical-align: top; }
        .cbt-html th, .cbt-rich-content th { background: #F1F5F9; font-weight: 700; }
        .cbt-html img, .cbt-rich-content img { max-width: 100%; height: auto; border-radius: 10px; border: 1px solid #E2E8F0; margin: 8px 0; }
        .cbt-html ul, .cbt-html ol { padding-left: 20px; margin: 8px 0; }
        .cbt-html blockquote { border-left: 4px solid #D97706; padding-left: 12px; color: #475569; }
        .cbt-section-switcher { display: flex; gap: 10px; border-bottom: 2px solid #E2E8F0; padding-bottom: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .cbt-tab-btn { border: 1px solid #CBD5E1; background: #F8FAFC; color: #475569; padding: 10px 20px; border-radius: 10px; font-weight: 700; font-size: 13.5px; display: inline-flex; align-items: center; cursor: pointer; transition: all 0.2s ease; }
        .cbt-tab-btn:hover { background: #E2E8F0; color: #0F2744; }
        .cbt-tab-btn.active { background: #0F2744; border-color: #0F2744; color: #fff; box-shadow: 0 4px 14px rgba(15, 39, 68, 0.18); }
        .cbt-builder-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .cbt-selected-strip { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; padding: 14px 20px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; }
        .cbt-selected-strip div { background: #fff; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px; }
        .cbt-selected-strip span { display: block; color: #64748B; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .cbt-selected-strip strong { display: block; color: #0F2744; font-size: 13px; margin-top: 2px; }
        .cbt-modal-backdrop { position: fixed; inset: 0; background: rgba(15, 39, 68, .55); backdrop-filter: blur(4px); z-index: 2050; display: flex; align-items: center; justify-content: center; padding: 18px; }
        .cbt-modal { width: min(980px, 100%); max-height: 88vh; background: #fff; border-radius: 18px; box-shadow: 0 24px 80px rgba(15, 39, 68, .25); display: flex; flex-direction: column; overflow: hidden; }
        .cbt-modal-sm { width: min(520px, 100%); }
        .cbt-modal-head { padding: 18px 22px; border-bottom: 1px solid #E2E8F0; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
        .cbt-modal-head h2 { font-size: 18px; font-weight: 800; margin: 0; color: #0F2744; }
        .cbt-modal-head p { margin: 4px 0 0; color: #64748B; font-size: 13px; }
        .cbt-modal-body { padding: 20px 22px; overflow: auto; }
        .cbt-preview-question { border: 1px solid #E2E8F0; border-radius: 14px; padding: 14px; margin-bottom: 12px; background: #fff; }
        .cbt-preview-question h3 { font-size: 14px; font-weight: 700; color: #0F2744; margin: 0 0 10px; }
        .cbt-preview-option { display: flex; gap: 9px; align-items: flex-start; padding: 7px 0; color: #334155; }
        .cbt-preview-option strong { min-width: 24px; color: #0F2744; }
        .cbt-manual-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .cbt-manual-card { border: 1px solid #E2E8F0; border-radius: 14px; background: #F8FAFC; padding: 16px; }
        .cbt-manual-card h3 { font-size: 15px; font-weight: 700; color: #0F2744; margin: 0 0 8px; }
        .cbt-manual-card ol { margin: 0; padding-left: 18px; color: #334155; line-height: 1.65; font-size: 13px; }
        .cbt-manual-card li { margin-bottom: 7px; }
        .cbt-note { border-left: 4px solid #D97706; background: #FFFBEB; color: #92400E; border-radius: 10px; padding: 12px 14px; font-size: 13px; line-height: 1.55; }
        .cbt-setup-card, .cbt-license-panel, .cbt-settings-panel { display: none; }
        .cbt-work-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .cbt-side-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 14px; padding: 16px; box-shadow: 0 4px 12px rgba(15, 39, 68, 0.03); }
        .cbt-side-card h3 { font-size: 15px; font-weight: 700; margin: 0 0 6px; color: #0F2744; }
        .cbt-side-card p { font-size: 12px; color: #64748B; line-height: 1.5; margin: 0 0 12px; }
        @media(max-width:1199px){
          .cbt-grid, .cbt-builder { grid-template-columns: 1fr; }
          .cbt-hero { grid-template-columns: 1fr; }
          .cbt-hero-actions { justify-content: flex-start; }
          .cbt-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .cbt-selected-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media(max-width:767.98px){
          .cbt-main { padding: calc(var(--gq-topnav-height, 66px) + 12px) 12px 32px; overflow-x: hidden; max-width: 100vw; box-sizing: border-box; }
          .cbt-shell { width: 100%; box-sizing: border-box; }
          .cbt-hero { padding: 20px 16px; border-radius: 14px; gap: 14px; }
          .cbt-hero h1 { font-size: 20px; }
          .cbt-hero-actions { width: 100%; display: flex; flex-wrap: wrap; gap: 8px; }
          .cbt-hero-actions .cbt-btn { flex: 1; min-width: 130px; text-align: center; justify-content: center; }
          .cbt-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
          .cbt-stat { padding: 14px; border-radius: 12px; }
          .cbt-stat strong { font-size: 20px; }
          .cbt-form-grid { grid-template-columns: 1fr; gap: 10px; }
          .cbt-mini-grid { grid-template-columns: 1fr; gap: 8px; }
          .cbt-selected-strip { grid-template-columns: 1fr; padding: 12px; }
          .cbt-table-wrap { width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; display: block; }
          .cbt-table { min-width: 680px; }
          .cbt-option-row { grid-template-columns: 48px minmax(0, 1fr) auto; gap: 6px; }
          .cbt-modal-backdrop { padding: 10px; }
          .cbt-modal { max-height: 92vh; border-radius: 14px; }
          .cbt-modal-head { padding: 14px 16px; }
          .cbt-modal-body { padding: 16px 14px; }
          .cbt-import-top { grid-template-columns: 1fr; }
          .cbt-import-guide { grid-template-columns: 1fr; }
          .cbt-import-summary { grid-template-columns: repeat(2, 1fr); }
          .cbt-manual-grid { grid-template-columns: 1fr; }
          .cbt-ai-format-grid { grid-template-columns: 1fr; }
          .cbt-row-actions { flex-direction: column; width: 100%; }
          .cbt-row-actions .cbt-btn { width: 100%; justify-content: center; }
          .cbt-html table, .cbt-rich-content table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        }
        @media(max-width:480px){
          .cbt-stats { grid-template-columns: 1fr; }
          .cbt-import-summary { grid-template-columns: 1fr; }
          .cbt-hero-actions .cbt-btn { width: 100%; }
        }
      `}</style>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="CBT Exams" />
      <PageTitle title="CBT Exams" />
      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="col-md-9 col-lg-10 ms-auto db-main cbt-main">
            {loading && <Loader message="Loading CBT module..." />}
            <div className="cbt-shell">
              <section className="cbt-hero">
                <div className="cbt-hero-glow" />
                <div className="cbt-hero-text">
                  <span className="cbt-eyebrow"><i className="bi bi-pc-display-horizontal me-1" /> Online and Offline CBT</span>
                  <h1>Computer Based Tests</h1>
                  <p>Manage exam setup, scheduling, question banks, student access, and offline CBT licensing from one workspace.</p>
                </div>
                <div className="cbt-hero-actions">
                  <button
                    className="cbt-btn cbt-gold"
                    type="button"
                    onClick={() => {
                      setLicenseModalOpen(true);
                      fetchLicenses();
                    }}
                    title="View Offline CBT License and package options"
                  >
                    <i className="bi bi-router" /> Offline Package & License
                  </button>
                  <a className="cbt-btn cbt-soft" href={publicAccessUrl} target="_blank" rel="noreferrer"><i className="bi bi-box-arrow-up-right" /> Public Access</a>
                  <button className="cbt-btn cbt-soft" type="button" onClick={() => setManualOpen(true)}><i className="bi bi-question-circle" /> CBT Manual</button>
                  <button className="cbt-btn cbt-soft" type="button" disabled={saving} onClick={downloadOfflineInstaller} title="Download Server stack for host/teacher PC"><i className="bi bi-server" /> Download Offline Server</button>
                  <button className="cbt-btn cbt-primary" type="button" disabled={saving} onClick={downloadStudentClient} title="Download lightweight client installer for student computers"><i className="bi bi-laptop" /> Download Student CBT App</button>
                  <button
                    className="cbt-btn cbt-btn-reuse"
                    type="button"
                    disabled={exams.length === 0}
                    onClick={() => {
                      const cur = exams.find((e) => e.id === selectedExamId) || exams[0];
                      if (cur) openReuseModal(cur);
                    }}
                    title="Reuse an existing exam in another academic session"
                  >
                    <i className="bi bi-copy" /> Reuse Exam
                  </button>
                  <button className="cbt-btn cbt-gold" type="button" onClick={() => setClassCbtModalOpen(true)} title="Configure which classes participate in CBT and adjust platform fees"><i className="bi bi-sliders2 me-1" /> Class CBT & Fee Settings</button>
                  <button className="cbt-btn cbt-primary" type="button" onClick={() => setCreateModalOpen(true)}><i className="bi bi-plus-circle" /> New Exam</button>
                  <button className="cbt-btn cbt-gold" onClick={load}><i className="bi bi-arrow-repeat" /> Refresh</button>
                </div>
              </section>

              <section className="cbt-stats">
                <div className="cbt-stat"><span>Total exams</span><strong>{exams.length}</strong></div>
                <div className="cbt-stat"><span>Published</span><strong>{publishedCount}</strong></div>
                <div className="cbt-stat"><span>Drafts</span><strong>{draftCount}</strong></div>
                <div className="cbt-stat"><span>Questions</span><strong>{totalQuestions}</strong></div>
              </section>

              <section className="cbt-grid">
                <form className="cbt-panel cbt-setup-card" onSubmit={createExam}>
                  <div className="cbt-head"><h2>Create exam</h2><p>Set the exam basics and timetable before adding questions.</p></div>
                  <div className="cbt-body">
                    <div className="cbt-section-label">Basics</div>
                    <div className="cbt-form-grid">
                      <div className="cbt-field cbt-field-full">
                        <label className="cbt-label">Exam title <span className="text-danger">*</span></label>
                        <input className="cbt-input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required placeholder="e.g. English Language CBT" />
                      </div>
                      <div className="cbt-field">
                        <label className="cbt-label">Academic Session <span className="text-danger">*</span></label>
                        <select
                          className="cbt-select"
                          value={form.academic_session_id}
                          required
                          onChange={(e) => setForm((p) => ({ ...p, academic_session_id: e.target.value }))}
                        >
                          <option value="">Select Academic Session</option>
                          {sessions.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} {item.is_current ? "(Active)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="cbt-field">
                        <label className="cbt-label">Academic Term <span className="text-danger">*</span></label>
                        <select
                          className="cbt-select"
                          value={form.term_id}
                          required
                          onChange={(e) => setForm((p) => ({ ...p, term_id: e.target.value }))}
                        >
                          <option value="">Select Term</option>
                          {terms.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} {item.is_current ? "(Active)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="cbt-field">
                        <label className="cbt-label">Section</label>
                        <select
                          className="cbt-select"
                          value={form.section_id}
                          onChange={(e) => {
                            const nextSecId = e.target.value;
                            const noDept = isSectionWithoutDept(nextSecId);
                            setForm((p) => {
                              const curCls = classes.find((c) => String(c.id) === p.class_id);
                              const classValid = !p.class_id || !nextSecId || (curCls?.section_id && String(curCls.section_id) === nextSecId);
                              return {
                                ...p,
                                section_id: nextSecId,
                                department_id: noDept ? "" : p.department_id,
                                class_id: classValid ? p.class_id : "",
                                subject_id: "",
                              };
                            });
                          }}
                        >
                          <option value="">All sections</option>
                          {sections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                      </div>
                      <div className="cbt-field">
                        <label className="cbt-label">Department</label>
                        <select
                          className="cbt-select"
                          value={form.department_id}
                          disabled={isSectionWithoutDept(form.section_id)}
                          onChange={(e) => setForm((p) => ({ ...p, department_id: e.target.value, subject_id: "" }))}
                        >
                          <option value="">{isSectionWithoutDept(form.section_id) ? "General (Not applicable for this section)" : "General Department / Common Subjects"}</option>
                          {!isSectionWithoutDept(form.section_id) && departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                      </div>
                      <div className="cbt-field">
                        <label className="cbt-label">Class</label>
                        <select
                          className="cbt-select"
                          value={form.class_id}
                          onChange={(e) => {
                            const nextClassId = e.target.value;
                            const cls = classes.find((c) => String(c.id) === nextClassId);
                            setForm((p) => ({
                              ...p,
                              class_id: nextClassId,
                              section_id: cls?.section_id ? String(cls.section_id) : (nextClassId ? p.section_id : ""),
                              subject_id: "",
                            }));
                          }}
                        >
                          <option value="">{form.section_id ? "All classes in section" : "All classes"}</option>
                          {createClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                      </div>
                      <div className="cbt-field">
                        <label className="cbt-label">Subject</label>
                        <select
                          className="cbt-select"
                          value={form.subject_id}
                          onChange={(e) => setForm((p) => ({ ...p, subject_id: e.target.value }))}
                        >
                          <option value="">
                            {createSubjects.length === 0
                              ? "No subjects matching selection"
                              : form.section_id
                              ? `Select subject (${createSubjects.length} available)`
                              : "Select subject"}
                          </option>
                          {createSubjects.map((item) => (
                            <option key={item.id} value={item.id}>
                              {getSubjectLabel(item)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="cbt-field">
                        <label className="cbt-label">Mode</label>
                        <select className="cbt-select" value={form.delivery_mode} onChange={(e) => setForm((p) => ({ ...p, delivery_mode: e.target.value as any }))}>
                          <option value="online">Online</option>
                          <option value="offline">Offline/LAN</option>
                          <option value="hybrid">Online and Offline</option>
                        </select>
                      </div>
                      <div className="cbt-field">
                        <label className="cbt-label">Duration</label>
                        <input className="cbt-input" type="number" min={1} value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))} />
                      </div>
                    </div>

                    <div className="cbt-section-label">Timetable</div>
                    <div className="cbt-form-grid">
                      <div className="cbt-field">
                        <label className="cbt-label">Exam date</label>
                        <input className="cbt-input" type="date" value={form.schedule.exam_date} onChange={(e) => setForm((p) => ({ ...p, schedule: { ...p.schedule, exam_date: e.target.value } }))} />
                      </div>
                      <div className="cbt-field">
                        <label className="cbt-label">Venue</label>
                        <input className="cbt-input" value={form.schedule.venue} onChange={(e) => setForm((p) => ({ ...p, schedule: { ...p.schedule, venue: e.target.value } }))} placeholder="CBT Lab" />
                      </div>
                      <div className="cbt-field">
                        <label className="cbt-label">Start time</label>
                        <input className="cbt-input" type="time" value={form.schedule.starts_at} onChange={(e) => setForm((p) => ({ ...p, schedule: { ...p.schedule, starts_at: e.target.value } }))} />
                      </div>
                      <div className="cbt-field">
                        <label className="cbt-label">End time</label>
                        <input className="cbt-input" type="time" value={form.schedule.ends_at} onChange={(e) => setForm((p) => ({ ...p, schedule: { ...p.schedule, ends_at: e.target.value } }))} />
                </div>
                <div className="cbt-field-full d-flex justify-content-between align-items-center mb-2">
                  <p className="cbt-help mb-0">Optional: leave empty for on-demand / unscheduled examination.</p>
                  {form.schedule.exam_date && (
                    <button
                      type="button"
                      className="cbt-btn cbt-ghost text-danger btn-sm py-1 px-2"
                      style={{ fontSize: "11px" }}
                      onClick={() => setForm((p) => ({ ...p, schedule: { exam_date: "", starts_at: "", ends_at: "", venue: "" } }))}
                    >
                      <i className="bi bi-x-circle me-1" /> Clear Timetable
                    </button>
                  )}
                      </div>
                    </div>


                    <div className="cbt-section-label">Exam rules</div>
                    <label className="cbt-toggle">
                      <input type="checkbox" checked={form.shuffle_questions} onChange={(e) => setForm((p) => ({ ...p, shuffle_questions: e.target.checked }))} />
                      <span><strong>Shuffle questions</strong><span>Standalone questions can move around, while comprehension passage blocks stay together.</span></span>
                    </label>
                    <label className="cbt-toggle">
                      <input type="checkbox" checked={form.shuffle_options} onChange={(e) => setForm((p) => ({ ...p, shuffle_options: e.target.checked }))} />
                      <span><strong>Shuffle options</strong><span>Answer options will appear in a different order for students.</span></span>
                    </label>
                    <label className="cbt-toggle">
                      <input type="checkbox" checked={form.show_result_after_submit} onChange={(e) => setForm((p) => ({ ...p, show_result_after_submit: e.target.checked }))} />
                      <span><strong>Show score after submit</strong><span>Students can see their score immediately after submitting, if enabled.</span></span>
                    </label>
                    <label className="cbt-toggle">
                      <input type="checkbox" checked={form.access_code_required} onChange={(e) => setForm((p) => ({ ...p, access_code_required: e.target.checked }))} />
                      <span><strong>Require access code</strong><span>The public CBT page will only show the access-code field when this is enabled.</span></span>
                    </label>
                    {form.access_code_required && (
                      <div className="cbt-field">
                        <label className="cbt-label">Access code</label>
                        <input className="cbt-input" value={form.access_code} onChange={(e) => setForm((p) => ({ ...p, access_code: e.target.value }))} placeholder="e.g. ENG-2026" />
                      </div>
                    )}
                    <label className="cbt-toggle">
                      <input type="checkbox" checked={form.calculator_enabled} onChange={(e) => setForm((p) => ({ ...p, calculator_enabled: e.target.checked }))} />
                      <span><strong>Allow scientific calculator</strong><span>Students can open an in-page calculator during this exam.</span></span>
                    </label>

                    <div className="cbt-section-label">Theory / Essay Questions</div>
                    <div className="cbt-field cbt-field-full mb-3" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px" }}>
                      <label className="cbt-label" style={{ fontWeight: 700, color: "#0F2744", fontSize: 13, marginBottom: 8, display: "block" }}>
                        Do you want to include theory/essay questions in this examination?
                      </label>
                      <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap" }}>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, color: !form.include_theory ? "#0F2744" : "#64748B" }}>
                          <input
                            type="radio"
                            name="overview_include_theory"
                            checked={!form.include_theory}
                            onChange={() => setForm((p) => ({ ...p, include_theory: false }))}
                          />
                          <span>No – Objective Questions Only</span>
                        </label>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, color: form.include_theory ? "#0F2744" : "#64748B" }}>
                          <input
                            type="radio"
                            name="overview_include_theory"
                            checked={Boolean(form.include_theory)}
                            onChange={() => setForm((p) => ({ ...p, include_theory: true }))}
                          />
                          <span>Yes – Include Theory Questions</span>
                        </label>
                      </div>
                      {form.include_theory && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #E2E8F0" }}>
                          <label className="cbt-label" style={{ fontWeight: 600 }}>Theory Section Instructions (Section B)</label>
                          <textarea
                            className="cbt-textarea"
                            style={{ minHeight: 70 }}
                            placeholder="e.g. Read the questions below and write answers on your physical answer paper."
                            value={form.theory_instructions}
                            onChange={(e) => setForm((p) => ({ ...p, theory_instructions: e.target.value }))}
                          />
                          <small style={{ color: "#64748B", display: "block", marginTop: 4 }}>
                            ℹ️ Students will read these questions on their screen and answer manually on paper using a pen. Teachers will enter marks later in Result Entry.
                          </small>
                        </div>
                      )}
                    </div>

                    <div className="cbt-field">
                      <label className="cbt-label">General instructions</label>
                      <textarea className="cbt-textarea" value={form.general_instructions} onChange={(e) => setForm((p) => ({ ...p, general_instructions: e.target.value }))} placeholder="Instructions shown before students start." />
                    </div>
                    <button className="cbt-btn cbt-primary" disabled={saving}><i className="bi bi-plus-circle" /> {saving ? "Saving" : "Create CBT Exam"}</button>
                  </div>
                </form>

                <div>
                  <section className="cbt-panel">
                    <div className="cbt-head cbt-builder-title">
                      <div>
                        <h2>Exam workspace</h2>
                        <p>{scheduledCount} scheduled exam(s). Share: {publicAccessUrl}</p>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="cbt-pill cbt-pill-neutral">{filteredExams.length} showing / {exams.length} total</span>
                      </div>
                    </div>

                    {/* Filter toolbar */}
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px', margin: '0 16px 16px 16px' }}>
                      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-funnel text-primary fw-bold" />
                          <span style={{ fontWeight: 700, fontSize: '13px', color: '#0F2744' }}>Filter Examinations</span>
                        </div>
                        <button
                          type="button"
                          className="cbt-btn cbt-ghost py-1 px-2"
                          style={{ fontSize: '12px' }}
                          onClick={() => {
                            const activeS = sessions.find((s) => s.is_current) || sessions[0];
                            const activeT = terms.find((t) => t.is_current) || terms[0];
                            setFilterSessionId(activeS ? String(activeS.id) : "");
                            setFilterTermId(activeT ? String(activeT.id) : "");
                            setFilterClassId("");
                            setFilterSubjectId("");
                            setFilterStatus("all");
                            setFilterSearch("");
                          }}
                        >
                          <i className="bi bi-arrow-counterclockwise me-1" /> Reset to Current Period
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '3px' }}>Session</label>
                          <select
                            className="cbt-select"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            value={filterSessionId}
                            onChange={(e) => setFilterSessionId(e.target.value)}
                          >
                            <option value="all">All Sessions</option>
                            {sessions.map((s) => (
                              <option key={s.id} value={s.id}>{s.name} {s.is_current ? "★" : ""}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '3px' }}>Term</label>
                          <select
                            className="cbt-select"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            value={filterTermId}
                            onChange={(e) => setFilterTermId(e.target.value)}
                          >
                            <option value="all">All Terms</option>
                            {terms.map((t) => (
                              <option key={t.id} value={t.id}>{t.name} {t.is_current ? "★" : ""}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '3px' }}>Class</label>
                          <select
                            className="cbt-select"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            value={filterClassId}
                            onChange={(e) => setFilterClassId(e.target.value)}
                          >
                            <option value="">All Classes</option>
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '3px' }}>Subject</label>
                          <select
                            className="cbt-select"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            value={filterSubjectId}
                            onChange={(e) => setFilterSubjectId(e.target.value)}
                          >
                            <option value="">All Subjects</option>
                            {subjects.map((sub) => (
                              <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '3px' }}>Status</label>
                          <select
                            className="cbt-select"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                          >
                            <option value="all">All Statuses</option>
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '3px' }}>Search</label>
                          <input
                            className="cbt-input"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            placeholder="Title or code..."
                            value={filterSearch}
                            onChange={(e) => setFilterSearch(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="cbt-table-wrap">
                      <table className="cbt-table">
                        <thead><tr><th>Exam</th><th>Audience</th><th>Schedule</th><th>Access</th><th>Status</th><th>Questions</th><th>Actions</th></tr></thead>
                        <tbody>
                          {filteredExams.length === 0 ? (
                            <tr><td colSpan={7} className="text-muted text-center py-4">No examination matches the current period or filter selection.</td></tr>
                          ) : filteredExams.map((exam) => (
                            <tr key={exam.id}>
                              <td>
                                <div className="cbt-exam-name">
                                  <span className="cbt-exam-icon"><i className="bi bi-journal-check" /></span>
                                  <div>
                                    <div className="cbt-title cbt-title-lg">{exam.title}</div>
                                    <div className="cbt-sub d-flex align-items-center gap-1 flex-wrap mt-1">
                                        <span className="badge bg-primary text-white" style={{ fontSize: '10.5px', padding: '2px 7px' }}>
                                          {exam.academic_session?.name || "Session"} • {exam.term?.name || "Term"}
                                        </span>
                                        <span>{exam.exam_code || `Exam #${exam.id}`}</span>
                                        <span>&bull;</span>
                                        <span>{exam.duration_minutes} mins</span>
                                        <span>&bull;</span>
                                        <span className="text-capitalize">{exam.delivery_mode}</span>
                                      </div>
                                    <div className="mt-2 d-flex gap-2 align-items-center flex-wrap">
                                      <button
                                        className="cbt-btn cbt-btn-reuse"
                                        type="button"
                                        disabled={saving}
                                        title="Reuse this exam for another academic session or term"
                                        onClick={() => openReuseModal(exam)}
                                        style={{ padding: '3px 10px', fontSize: '11.5px', borderRadius: '6px' }}
                                      >
                                        <i className="bi bi-copy me-1" /> Reuse Exam
                                      </button>
                                      <button
                                        className="cbt-btn cbt-secondary"
                                        type="button"
                                        disabled={saving}
                                        title="Open Question Builder for this exam"
                                        onClick={() => loadExam(exam.id)}
                                        style={{ padding: '3px 10px', fontSize: '11.5px', borderRadius: '6px' }}
                                      >
                                        <i className="bi bi-pencil-square me-1" /> Builder
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="d-flex gap-1 flex-wrap">
                                  <span className="cbt-pill">{exam.class?.name || "All classes"}</span>
                                  {exam.section?.name ? <span className="cbt-pill cbt-pill-neutral">{exam.section.name}</span> : null}
                                  {exam.department?.name ? <span className="cbt-pill cbt-pill-neutral">{exam.department.name}</span> : null}
                                  {exam.subject?.name ? <span className="cbt-pill cbt-pill-gold">{exam.subject.name}</span> : null}
                                </div>
                              </td>
                              <td><div className="cbt-title">{scheduleLabel(exam)}</div><div className="cbt-sub">{exam.schedules?.[0]?.venue || "Open Builder to add venue/time"}</div></td>
                              <td>
                                <div className="d-flex gap-1 flex-wrap">
                                  {exam.access_code_required ? <span className="cbt-pill cbt-pill-gold">Code</span> : <span className="cbt-pill cbt-pill-neutral">Open</span>}
                                  {exam.calculator_enabled ? <span className="cbt-pill cbt-pill-green">Calc</span> : null}
                                </div>
                              </td>
                              <td><span className={statusClass(exam.status)}>{exam.status}</span></td>
                              <td><div className="cbt-title">{exam.questions_count ?? 0}</div><div className="cbt-sub">{exam.attempts_count ?? 0} attempt(s)</div></td>
                              <td>
                                <div className="cbt-row-actions">
                                  <button className="cbt-btn cbt-secondary" type="button" disabled={saving} onClick={() => loadExam(exam.id)}><i className="bi bi-pencil-square" /> Builder</button>
                                  <button className="cbt-btn cbt-soft" type="button" disabled={saving} title="View Offline CBT License & Package" onClick={() => { setSelectedExamId(exam.id); setLicenseModalOpen(true); fetchLicenses(); }}><i className="bi bi-router" /> Offline</button>
                             <button className="cbt-btn cbt-btn-reuse" type="button" disabled={saving} title="Reuse this exam in another academic session or term" onClick={() => openReuseModal(exam)}><i className="bi bi-copy" /> Reuse</button>
                                  <button className="cbt-btn cbt-primary" type="button" disabled={saving || exam.status === "published"} title={exam.status === "published" ? "Reopen this exam before importing questions." : "Import questions from Word or Excel"} onClick={() => openWordImport(exam.id)}><i className="bi bi-file-earmark-arrow-up" /> Import File</button>
                                  <button className="cbt-btn cbt-secondary" type="button" disabled={saving} onClick={() => previewExam(exam.id)}><i className="bi bi-eye" /> Preview</button>
                                  {exam.status === "draft" ? (
                                    <button className="cbt-btn cbt-gold" type="button" disabled={saving} onClick={() => publishExam(exam.id)}><i className="bi bi-send" /> Publish</button>
                                  ) : exam.status === "published" ? (
                                    <button
                                      className="cbt-btn cbt-secondary"
                                      type="button"
                                      onClick={() => reopenExam(exam.id)}
                                    >
                                      <i className="bi bi-unlock" /> Reopen
                                    </button>
                                  ) : null}
                                  <button
                                    className="cbt-btn cbt-danger"
                                    type="button"
                                    onClick={() => deleteExam(exam)}
                                  >
                                    <i className="bi bi-trash" /> Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                </div>
              </section>

              <section className="cbt-builder">
                <div className="cbt-panel">
                  <div className="cbt-head cbt-builder-title">
                    <div>
                      <h2>{examDetail ? `Question builder: ${examDetail.title}` : "Question builder"}</h2>
                      <p>{examDetail ? `${questions.length} question(s) added. ${selectedIsPublished ? "Published exams cannot be edited." : "Draft exam is editable."}` : "Select Builder beside an exam to start adding questions."}</p>
                    </div>
                    <div className="cbt-work-actions">
                      {examDetail && (
                        <button
                          className="cbt-btn cbt-btn-reuse"
                          type="button"
                          disabled={saving}
                          onClick={() => openReuseModal(examDetail)}
                          title="Reuse this exam for another academic session or term"
                        >
                          <i className="bi bi-copy" /> Reuse Exam
                        </button>
                      )}
                      <button className="cbt-btn cbt-secondary" type="button" disabled={!examDetail || saving} onClick={() => downloadQuestionTemplate("docx")}>
                        <i className="bi bi-file-earmark-word" /> Word Template
                      </button>
                      <button className="cbt-btn cbt-secondary" type="button" disabled={!examDetail || saving} onClick={() => downloadQuestionTemplate("xlsx")}>
                        <i className="bi bi-file-earmark-excel" /> Excel Template
                      </button>
                      <button className="cbt-btn cbt-primary" type="button" disabled={!examDetail || selectedIsPublished} onClick={() => {
                        setQuestionImportFile(null);
                        setQuestionImportResult(null);
                        setQuestionImportModalOpen(true);
                      }}>
                        <i className="bi bi-file-earmark-arrow-up" /> Import File
                      </button>
                      {aiCreditSummary?.is_plus_active !== false && (
                        <button className="cbt-btn cbt-gold" type="button" disabled={!examDetail || selectedIsPublished} onClick={() => {
                          openAiGenerator();
                        }}>
                          <i className="bi bi-stars" /> Generate with AI
                        </button>
                      )}
                    </div>
                  </div>
                  {examDetail && (
                    <div className="cbt-selected-strip">
                      <div><span>Status</span><strong>{examDetail.status}</strong></div>
                      <div><span>Class</span><strong>{examDetail.class?.name || "All classes"}</strong></div>
                      <div><span>Department</span><strong>{examDetail.department?.name || "General Department / Common Subjects"}</strong></div>
                      <div><span>Subject</span><strong>{examDetail.subject?.name || "No subject"}</strong></div>
                      <div><span>Schedule</span><strong>{selectedSchedule?.exam_date ? `${String(selectedSchedule.exam_date).slice(0, 10)} ${selectedSchedule.starts_at?.slice(0, 5) || ""}` : "Not set"}</strong></div>
                      <div><span>Access</span><strong>{examDetail.access_code_required ? "Code required" : "Open access"}</strong></div>
                      <div><span>Format</span><strong style={{ color: examDetail.include_theory ? "#2563EB" : "#0F2744" }}>{examDetail.include_theory ? "Obj + Theory (Sec A & B)" : "Objective Only"}</strong></div>
                    </div>
                  )}
                  <div className="cbt-body">
                    {!examDetail ? (
                      <div className="cbt-empty">Choose an exam from the list above, then add sections, passages, and questions here.</div>
                    ) : (
                      <>
                        {selectedIsPublished && (
                          <div className="alert alert-warning d-flex align-items-center justify-content-between gap-2 flex-wrap">
                            <span>
                              This exam has been published. You can reopen it only if no student has accessed it.
                            </span>
                            <button
                              className="cbt-btn cbt-ghost"
                              type="button"
                              disabled={saving || (examDetail.attempts_count ?? 0) > 0}
                              title={(examDetail.attempts_count ?? 0) > 0 ? "Students have already accessed this exam." : "Reopen exam for editing"}
                              onClick={() => reopenExam(examDetail.id)}
                            >
                              <i className="bi bi-unlock" /> Reopen
                            </button>
                          </div>
                        )}
                        {(examDetail.attempts || []).length > 0 && (
                          <div className="cbt-preview-question">
                            <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-2">
                              <div>
                                <h3 className="mb-1">Student Attempts</h3>
                                <p className="cbt-sub mb-0">Reset is available only when no answer was saved.</p>
                              </div>
                              <span className="cbt-pill">{examDetail.attempts?.length || 0} attempt(s)</span>
                            </div>
                            <div className="table-responsive">
                              <table className="table align-middle mb-0">
                                <thead>
                                  <tr>
                                    <th>Student</th>
                                    <th>Status</th>
                                    <th>Score</th>
                                    <th>Answers</th>
                                    <th>Events</th>
                                    <th>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(examDetail.attempts || []).map((attempt) => {
                                    const studentName = `${attempt.student?.surname || ""} ${attempt.student?.firstname || ""}`.trim() || "Student";
                                    const realAnswersCount = (attempt.answers || []).filter((answer) => Boolean((answer.selected_option_ids || []).length || answer.answer_text?.trim())).length;
                                    const displayedAnswersCount = (attempt.answers || []).length > 0 ? realAnswersCount : Number(attempt.answers_count || 0);
                                    const canReset = realAnswersCount === 0 && attempt.status !== "cancelled";
                                    const score = Number(attempt.score || 0);
                                    const totalMarks = Number(attempt.total_marks || 0);
                                    const percent = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
                                    return (
                                      <tr key={attempt.id}>
                                        <td>
                                          <strong>{studentName}</strong>
                                          <div className="cbt-sub">{attempt.student?.reg_no || "No admission no"} {attempt.student?.level?.name ? `- ${attempt.student.level.name}` : ""}</div>
                                        </td>
                                        <td><span className={statusClass(attempt.status)}>{attempt.status}</span></td>
                                        <td>
                                          <strong>{score}/{totalMarks || "-"}</strong>
                                          {totalMarks > 0 && <div className="cbt-sub">{percent}%</div>}
                                        </td>
                                        <td>{displayedAnswersCount}</td>
                                        <td>{attempt.events_count || 0}</td>
                                        <td>
                                          <button className="cbt-btn cbt-ghost" type="button" disabled={saving || !canReset} title={canReset ? "Allow this student to start again" : "Only zero-answer attempts can be reset"} onClick={() => resetAttempt(attempt)}>
                                            <i className="bi bi-arrow-counterclockwise" /> Reset
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        {Boolean(examDetail.include_theory) && (
                          <div className="cbt-section-switcher">
                            <button
                              type="button"
                              className={`cbt-tab-btn ${builderTab === 'objective' ? 'active' : ''}`}
                              onClick={() => setBuilderTab('objective')}
                            >
                              <i className="bi bi-ui-checks-grid me-2" />
                              Section A: Objective Questions
                              <span className={`badge rounded-pill ms-2 ${builderTab === 'objective' ? 'bg-primary text-white' : 'bg-light text-dark border'}`} style={{ fontSize: 11 }}>
                                {objectiveQuestions.length}
                              </span>
                            </button>
                            <button
                              type="button"
                              className={`cbt-tab-btn ${builderTab === 'theory' ? 'active' : ''}`}
                              onClick={() => setBuilderTab('theory')}
                            >
                              <i className="bi bi-pen me-2" />
                              Section B: Theory / Essay Questions
                              <span className={`badge rounded-pill ms-2 ${builderTab === 'theory' ? 'bg-primary text-white' : 'bg-light text-dark border'}`} style={{ fontSize: 11 }}>
                                {theoryQuestions.length}
                              </span>
                            </button>
                          </div>
                        )}

                        {(!examDetail.include_theory || builderTab === "objective") && (
                          <>
                            <div className="cbt-import-box">
                              <div className="cbt-import-top">
                                <label className="cbt-import-file">
                                  <i className="bi bi-file-earmark-arrow-up" />
                                  <span>
                                    <strong>{questionImportFile ? questionImportFile.name : "Import questions from Word or Excel"}</strong>
                                    <span>.docx, .xlsx, .xls, or .csv. Use A-D options and answer labels.</span>
                                  </span>
                                  <input
                                    type="file"
                                    accept=".docx,.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                                    disabled={selectedIsPublished || questionImporting}
                                    onChange={(e) => {
                                      setQuestionImportFile(e.target.files?.[0] || null);
                                      setQuestionImportResult(null);
                                    }}
                                  />
                                </label>
                                <div className="cbt-import-actions">
                                  <button className="cbt-btn cbt-ghost" type="button" disabled={!questionImportFile || selectedIsPublished || questionImporting} onClick={() => importQuestionFile(true)}>
                                    <i className="bi bi-search" /> Check File
                                  </button>
                                  <button className="cbt-btn cbt-primary" type="button" disabled={!questionImportFile || selectedIsPublished || questionImporting || Boolean((questionImportResult?.summary?.errors_count || 0) > 0)} onClick={() => importQuestionFile(false)}>
                                    <i className="bi bi-cloud-upload" /> Import Questions
                                  </button>
                                </div>
                              </div>
                              <div className="cbt-import-guide">
                                <code>SECTION: Objective Questions<br />TYPE: single_choice</code>
                                <code>1. Question text<br />A. Option<br />ANSWER: A</code>
                                <code>PASSAGE: Text here<br />END PASSAGE</code>
                              </div>

                              {questionImportResult && (
                                <div className="cbt-import-result">
                                  <div className="cbt-import-summary">
                                    <div><span>Questions</span><strong>{questionImportResult.summary?.questions_detected || 0}</strong></div>
                                    <div><span>Sections</span><strong>{questionImportResult.summary?.sections_detected || 0}</strong></div>
                                    <div><span>Passages</span><strong>{questionImportResult.summary?.passages_detected || 0}</strong></div>
                                    <div><span>Errors</span><strong>{questionImportResult.summary?.errors_count || 0}</strong></div>
                                  </div>
                                  {(questionImportResult.errors || []).length > 0 ? (
                                    <div className="cbt-import-errors">
                                      {(questionImportResult.errors || []).slice(0, 8).map((error, index) => <div key={`${error}-${index}`}>{error}</div>)}
                                    </div>
                                  ) : (
                                    <div className="cbt-import-preview">
                                      {(questionImportResult.questions || []).slice(0, 8).map((question) => (
                                        <div className="cbt-import-preview-item" key={`${question.number}-${question.text}`}>
                                          <strong>{question.number}. {question.text}</strong>
                                          <span className="cbt-pill">{String(question.type || "").replace(/_/g, " ")}</span>
                                          <span className="cbt-pill cbt-pill-neutral">{question.options || 0} option(s)</span>
                                          {question.has_passage && <span className="cbt-pill cbt-pill-gold">Passage</span>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <form onSubmit={addQuestion}>
                              <div className="row g-2">
                                <div className="col-md-4">
                                  <label className="cbt-label">Section</label>
                                  <select className="cbt-select" value={questionForm.section_id} disabled={selectedIsPublished} onChange={(e) => setQuestionForm((p) => ({ ...p, section_id: e.target.value }))}>
                                    <option value="">General</option>
                                    {(examDetail.sections || []).map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}
                                  </select>
                                </div>
                                <div className="col-md-4">
                                  <label className="cbt-label">Instruction or passage</label>
                                  <select className="cbt-select" value={questionForm.question_group_id} disabled={selectedIsPublished} onChange={(e) => setQuestionForm((p) => ({ ...p, question_group_id: e.target.value }))}>
                                    <option value="">None</option>
                                    {groups.map((group: any) => <option key={group.id} value={group.id}>{group.title || group.group_type} - {group.sectionTitle}</option>)}
                                  </select>
                                </div>
                                <div className="col-md-4">
                                  <label className="cbt-label">Question type</label>
                                  <select className="cbt-select" value={questionForm.question_type} disabled={selectedIsPublished} onChange={(e) => setQuestionForm((p) => ({ ...p, question_type: e.target.value }))}>
                                    <option value="single_choice">Single choice</option>
                                    <option value="multiple_choice">Multiple choice</option>
                                    <option value="true_false">True / False</option>
                                    <option value="fill_blank">Fill in the blank</option>
                                  </select>
                                </div>
                              </div>

                              <label className="cbt-label">Question</label>
                              <CbtRichEditor
                                value={questionForm.question_text}
                                disabled={selectedIsPublished}
                                examId={selectedExamId}
                                placeholder="Type the objective question here. You can add tables and upload diagrams."
                                onChange={(value) => setQuestionForm((p) => ({ ...p, question_text: value }))}
                              />

                              <div className="row g-2">
                                <div className="col-md-4">
                                  <label className="cbt-label">Marks</label>
                                  <input className="cbt-input" type="number" min={0} value={questionForm.marks} disabled={selectedIsPublished} onChange={(e) => setQuestionForm((p) => ({ ...p, marks: Number(e.target.value) }))} />
                                </div>
                                <div className="col-md-8">
                                  <label className="cbt-label">Explanation</label>
                                  <input className="cbt-input" value={questionForm.explanation} disabled={selectedIsPublished} onChange={(e) => setQuestionForm((p) => ({ ...p, explanation: e.target.value }))} placeholder="Optional marking note or answer explanation." />
                                </div>
                              </div>

                              {objectiveTypes.includes(questionForm.question_type) && questionForm.question_type !== "true_false" && (
                                <div>
                                  <label className="cbt-label">Options</label>
                                  {questionForm.options.map((option, index) => (
                                    <div className="cbt-option-row" key={option.label}>
                                      <input className="cbt-input mb-0" value={option.label} disabled={selectedIsPublished} onChange={(e) => setQuestionForm((p) => ({ ...p, options: p.options.map((item, i) => i === index ? { ...item, label: e.target.value } : item) }))} />
                                      <input className="cbt-input mb-0" value={option.option_text} disabled={selectedIsPublished} onChange={(e) => setQuestionForm((p) => ({ ...p, options: p.options.map((item, i) => i === index ? { ...item, option_text: e.target.value } : item) }))} placeholder={`Option ${option.label}`} />
                                      <label className="cbt-option-check">
                                        <input type={questionForm.question_type === "multiple_choice" ? "checkbox" : "radio"} name="correct_option" checked={Boolean(option.is_correct)} disabled={selectedIsPublished} onChange={(e) => setQuestionForm((p) => ({ ...p, options: p.options.map((item, i) => questionForm.question_type === "multiple_choice" ? (i === index ? { ...item, is_correct: e.target.checked } : item) : { ...item, is_correct: i === index }) }))} />
                                        Correct
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {questionForm.question_type === "true_false" && (
                                <div className="mb-3">
                                  <label className="cbt-label">Correct answer</label>
                                  <select className="cbt-select" disabled={selectedIsPublished} value={questionForm.options[0]?.is_correct ? "true" : "false"} onChange={(e) => setQuestionForm((p) => ({ ...p, options: [{ ...p.options[0], is_correct: e.target.value === "true" }, ...p.options.slice(1)] }))}>
                                    <option value="true">True</option>
                                    <option value="false">False</option>
                                  </select>
                                </div>
                              )}

                              <button className="cbt-btn cbt-primary" disabled={saving || selectedIsPublished}><i className="bi bi-plus-circle" /> Add Question</button>
                            </form>

                            <hr />
                            <div className="d-flex align-items-center justify-content-between mb-3">
                              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0F2744", margin: 0 }}>
                                {examDetail.include_theory ? `Section A: Objective Questions (${objectiveQuestions.length})` : `Exam Questions (${objectiveQuestions.length})`}
                              </h3>
                              <span className="cbt-pill cbt-pill-green">
                                Total Objective Marks: {objectiveQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)} marks
                              </span>
                            </div>

                            {objectiveQuestions.length === 0 ? <div className="cbt-empty">No objective questions yet. Add the first question above.</div> : objectiveQuestions.map((question, index) => (
                              <div className="cbt-question-card" key={question.id}>
                                <h3>{index + 1}.</h3>
                                <CbtHtml html={question.question_text} />
                                {question.diagram_url && (
                                  <div className="my-2 p-2 bg-light rounded text-center border">
                                    <img
                                      src={question.diagram_url}
                                      alt="Question diagram"
                                      style={{ maxHeight: 220, maxWidth: "100%", objectFit: "contain", borderRadius: 6 }}
                                    />
                                  </div>
                                )}
                                <div className="cbt-question-meta">
                                  <span className="cbt-pill">{question.question_type.replace(/_/g, " ")}</span>
                                  <span className="cbt-pill">{question.marks} mark(s)</span>
                                </div>
                                {(question.options || []).length > 0 && (
                                  <div className="mt-2">
                                    {(question.options || []).map((option) => (
                                      <div className="cbt-sub" key={`${question.id}-${option.label}`}><strong>{option.label}.</strong> <CbtHtml html={option.option_text} className="d-inline" /> {option.is_correct ? "(Correct)" : ""}</div>
                                    ))}
                                  </div>
                                )}
                                {!selectedIsPublished && <button className="cbt-btn cbt-danger mt-2" type="button" disabled={saving} onClick={() => deleteQuestion(question.id)}><i className="bi bi-trash" /> Remove</button>}
                              </div>
                            ))}
                          </>
                        )}

                        {Boolean(examDetail.include_theory) && builderTab === "theory" && (
                          <>
                            {/* Section B Theory Instructions Box */}
                            <div className="cbt-panel mb-4" style={{ border: "1px solid #BFDBFE", background: "#EFF6FF", borderRadius: 14 }}>
                              <div className="cbt-head" style={{ borderBottom: "1px solid #DBEAFE", padding: "14px 18px" }}>
                                <div>
                                  <h2 style={{ color: "#1E40AF", fontSize: 16, margin: 0 }}>
                                    <i className="bi bi-pen me-2" /> Section B: Theory / Essay Instructions
                                  </h2>
                                  <p style={{ color: "#3B82F6", margin: "4px 0 0", fontSize: 12.5 }}>
                                    Students read these instructions and questions on their screens and write their answers on physical answer sheets using a pen.
                                  </p>
                                </div>
                              </div>
                              <div className="cbt-body" style={{ padding: "16px 18px" }}>
                                <label className="cbt-label" style={{ fontWeight: 700, color: "#1E3A8A" }}>
                                  Section B Instructions (Displayed at the top of Section B to students)
                                </label>
                                <textarea
                                  className="cbt-textarea mb-2"
                                  style={{ minHeight: 75, background: "#fff", borderColor: "#BFDBFE" }}
                                  disabled={selectedIsPublished || savingTheoryInstructions}
                                  placeholder="e.g. Answer any THREE (3) questions in this section. All questions carry equal marks. Show all working clearly on your answer script."
                                  value={theoryInstructionsDraft}
                                  onChange={(e) => setTheoryInstructionsDraft(e.target.value)}
                                />
                                {!selectedIsPublished && (
                                  <div className="d-flex justify-content-end">
                                    <button
                                      type="button"
                                      className="cbt-btn cbt-primary btn-sm"
                                      disabled={savingTheoryInstructions}
                                      onClick={saveTheoryInstructions}
                                    >
                                      <i className="bi bi-save me-1" /> Save Section Instructions
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Dedicated Theory Question Creator Form */}
                            <form onSubmit={addTheoryQuestion} className="cbt-panel mb-4" style={{ border: "1px solid #E2E8F0", borderRadius: 14 }}>
                              <div className="cbt-head" style={{ padding: "14px 18px" }}>
                                <div>
                                  <h2 style={{ fontSize: 16 }}>Add Theory Question (Question {theoryQuestions.length + 1})</h2>
                                  <p style={{ margin: 0, fontSize: 12.5 }}>Enter the question text, allocated marks, and optional diagram or illustration.</p>
                                </div>
                              </div>
                              <div className="cbt-body" style={{ padding: "16px 18px" }}>
                                <label className="cbt-label" style={{ fontWeight: 700 }}>
                                  Theory Question Text <span className="text-danger">*</span>
                                </label>
                                <CbtRichEditor
                                  value={theoryForm.question_text}
                                  disabled={selectedIsPublished}
                                  examId={selectedExamId}
                                  placeholder="Type the theory question here. You can format text, add bullet points, and create tables (e.g. 1a, 1b, 1c)."
                                  onChange={(value) => setTheoryForm((p) => ({ ...p, question_text: value }))}
                                />

                                {/* Dedicated Diagram / Illustration Upload Box */}
                                <div className="mt-3 mb-3 p-3 bg-white rounded border" style={{ borderColor: "#CBD5E1" }}>
                                  <div className="d-flex align-items-center justify-content-between mb-2">
                                    <label className="cbt-label mb-0" style={{ fontWeight: 700, fontSize: 13, color: "#0F2744" }}>
                                      <i className="bi bi-image text-primary me-1" /> Question Diagram / Illustration (Optional)
                                    </label>
                                    {theoryForm.diagram_url && (
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger py-0 px-2"
                                        style={{ fontSize: 11 }}
                                        onClick={() => {
                                          setTheoryForm((p) => ({ ...p, diagram_url: "" }));
                                          setTheoryDiagramFileName("");
                                        }}
                                      >
                                        <i className="bi bi-trash me-1" /> Remove Diagram
                                      </button>
                                    )}
                                  </div>

                                  <input
                                    type="file"
                                    id="theory-direct-file-input"
                                    className="d-none"
                                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                                    disabled={selectedIsPublished || theoryDiagramUploading}
                                    onChange={handleTheoryDiagramFile}
                                  />

                                  {!theoryForm.diagram_url ? (
                                    <>
                                      {/* Clickable Drag & Drop / Upload Area */}
                                      <div
                                        style={{
                                          border: "2px dashed #93C5FD",
                                          borderRadius: 12,
                                          padding: "20px 16px",
                                          textAlign: "center",
                                          background: "#F8FAFC",
                                          cursor: "pointer",
                                          transition: "background 0.2s ease",
                                        }}
                                        onClick={() => {
                                          if (!theoryDiagramUploading && !selectedIsPublished) {
                                            document.getElementById("theory-direct-file-input")?.click();
                                          }
                                        }}
                                      >
                                        {theoryDiagramUploading ? (
                                          <div className="py-2">
                                            <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                                            <strong style={{ color: "#1E40AF", fontSize: 13 }}>Processing diagram upload...</strong>
                                          </div>
                                        ) : (
                                          <div>
                                            <i className="bi bi-cloud-arrow-up text-primary" style={{ fontSize: 34, display: "block", marginBottom: 6 }} />
                                            <strong style={{ display: "block", color: "#0F2744", fontSize: 14 }}>
                                              Click to choose diagram image from your computer / phone
                                            </strong>
                                            <span style={{ color: "#64748B", fontSize: 12 }}>
                                              Select any PNG, JPG, JPEG, WEBP or GIF file &bull; No online web link needed
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      <div className="d-flex justify-content-between align-items-center mt-2 px-1 flex-wrap gap-2">
                                        <span className="text-muted" style={{ fontSize: 11.5 }}>
                                          Use for math geometry, science apparatus, geography maps, charts, or past-question diagrams.
                                        </span>
                                        <button
                                          type="button"
                                          className="btn btn-link btn-sm p-0 text-decoration-none"
                                          style={{ fontSize: 11.5 }}
                                          onClick={() => setShowDiagramUrlInput(!showDiagramUrlInput)}
                                        >
                                          {showDiagramUrlInput ? "Hide web link option" : "Have an online web link instead?"}
                                        </button>
                                      </div>

                                      {showDiagramUrlInput && (
                                        <div className="mt-2 pt-2 border-top">
                                          <label className="cbt-label" style={{ fontSize: 11.5 }}>Web Image Link (URL)</label>
                                          <input
                                            type="text"
                                            className="cbt-input mb-0"
                                            placeholder="https://example.com/diagram.png"
                                            value={theoryForm.diagram_url || ""}
                                            disabled={selectedIsPublished}
                                            onChange={(e) => setTheoryForm((p) => ({ ...p, diagram_url: e.target.value }))}
                                          />
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    /* Attached Image Preview Card */
                                    <div className="p-3 bg-light rounded border">
                                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                                        <div className="d-flex align-items-center gap-2">
                                          <span className="cbt-pill cbt-pill-green">
                                            <i className="bi bi-check-circle-fill me-1" /> Diagram Attached
                                          </span>
                                          {theoryDiagramFileName && (
                                            <span className="text-muted small" style={{ fontWeight: 600 }}>{theoryDiagramFileName}</span>
                                          )}
                                        </div>
                                        <div className="d-flex gap-2">
                                          <button
                                            type="button"
                                            className="cbt-btn cbt-soft btn-sm"
                                            disabled={selectedIsPublished || theoryDiagramUploading}
                                            onClick={() => document.getElementById("theory-direct-file-input")?.click()}
                                          >
                                            <i className="bi bi-arrow-repeat me-1" /> Change Image
                                          </button>
                                          <button
                                            type="button"
                                            className="cbt-btn cbt-danger btn-sm"
                                            disabled={selectedIsPublished || theoryDiagramUploading}
                                            onClick={() => {
                                              setTheoryForm((p) => ({ ...p, diagram_url: "" }));
                                              setTheoryDiagramFileName("");
                                            }}
                                          >
                                            <i className="bi bi-trash me-1" /> Remove
                                          </button>
                                        </div>
                                      </div>
                                      <div className="text-center p-2 bg-white rounded border">
                                        <img
                                          src={theoryForm.diagram_url}
                                          alt="Theory Diagram Preview"
                                          style={{ maxHeight: 240, maxWidth: "100%", objectFit: "contain", borderRadius: 8 }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="row g-2 mb-3">
                                  <div className="col-md-4">
                                    <label className="cbt-label" style={{ fontWeight: 700 }}>Allocated Marks *</label>
                                    <input
                                      className="cbt-input"
                                      type="number"
                                      min={1}
                                      required
                                      value={theoryForm.marks}
                                      disabled={selectedIsPublished}
                                      onChange={(e) => setTheoryForm((p) => ({ ...p, marks: Number(e.target.value) }))}
                                    />
                                  </div>
                                  <div className="col-md-8">
                                    <label className="cbt-label">Marking Guide / Explanation (Optional)</label>
                                    <input
                                      className="cbt-input"
                                      value={theoryForm.explanation}
                                      disabled={selectedIsPublished}
                                      onChange={(e) => setTheoryForm((p) => ({ ...p, explanation: e.target.value }))}
                                      placeholder="Optional marking notes, sample solution, or grading rubric for teachers."
                                    />
                                  </div>
                                </div>

                                <button className="cbt-btn cbt-primary" disabled={saving || selectedIsPublished}>
                                  <i className="bi bi-plus-circle" /> Add Theory Question
                                </button>
                              </div>
                            </form>

                            {/* Section B Theory Questions List */}
                            <div className="mt-4">
                              <div className="d-flex align-items-center justify-content-between mb-3">
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0F2744", margin: 0 }}>
                                  Section B: Theory Questions ({theoryQuestions.length})
                                </h3>
                                <span className="cbt-pill cbt-pill-green">
                                  Total Theory Marks: {theoryQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)} marks
                                </span>
                              </div>

                              {theoryQuestions.length === 0 ? (
                                <div className="cbt-empty">
                                  <i className="bi bi-pencil-square" style={{ fontSize: 32, display: "block", marginBottom: 8, color: "#94A3B8" }} />
                                  <strong>No theory questions added yet.</strong>
                                  <p style={{ margin: "4px 0 0", fontSize: 13 }}>Use the form above to add Theory Question 1, Question 2, etc.</p>
                                </div>
                              ) : (
                                theoryQuestions.map((question, index) => (
                                  <div className="cbt-question-card" key={question.id} style={{ borderLeft: "4px solid #2563EB" }}>
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                      <h3 style={{ margin: 0, color: "#1E40AF" }}>Theory Question {index + 1}</h3>
                                      <span className="cbt-pill" style={{ background: "#DBEAFE", color: "#1E40AF", fontWeight: 700 }}>
                                        {question.marks} mark(s)
                                      </span>
                                    </div>
                                    <CbtHtml html={question.question_text} />
                                    {question.diagram_url && (
                                      <div className="my-2 p-2 bg-light rounded text-center border">
                                        <img
                                          src={question.diagram_url}
                                          alt={`Question ${index + 1} diagram`}
                                          style={{ maxHeight: 240, maxWidth: "100%", objectFit: "contain", borderRadius: 6 }}
                                        />
                                      </div>
                                    )}
                                    {question.explanation && (
                                      <div className="cbt-note mt-2 mb-2" style={{ fontSize: 12 }}>
                                        <strong>Marking guide:</strong> {question.explanation}
                                      </div>
                                    )}
                                    {!selectedIsPublished && (
                                      <div className="mt-2 text-end">
                                        <button
                                          className="cbt-btn cbt-danger btn-sm"
                                          type="button"
                                          disabled={saving}
                                          onClick={() => deleteQuestion(question.id)}
                                        >
                                          <i className="bi bi-trash" /> Remove Question
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="d-flex flex-column gap-3">
                  <form className="cbt-panel cbt-settings-panel" onSubmit={updateExamSettings}>
                    <div className="cbt-head"><h2>Exam settings</h2><p>Change shuffle and display options for the selected exam.</p></div>
                    <div className="cbt-body">
                      <div className="cbt-section-label">Basics</div>
                      <div className="cbt-form-grid">
                        <div className="cbt-field cbt-field-full">
                          <label className="cbt-label">Exam title</label>
                          <input className="cbt-input" value={settingsForm.title} disabled={!examDetail || selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, title: e.target.value }))} required />
                        </div>
                        <div className="cbt-field">
                          <label className="cbt-label">Section</label>
                          <select
                            className="cbt-select"
                            value={settingsForm.section_id}
                            disabled={!examDetail || selectedIsPublished}
                            onChange={(e) => {
                              const nextSecId = e.target.value;
                              const noDept = isSectionWithoutDept(nextSecId);
                              setSettingsForm((p) => {
                                const curCls = classes.find((c) => String(c.id) === p.class_id);
                                const classValid = !p.class_id || !nextSecId || (curCls?.section_id && String(curCls.section_id) === nextSecId);
                                return {
                                  ...p,
                                  section_id: nextSecId,
                                  department_id: noDept ? "" : p.department_id,
                                  class_id: classValid ? p.class_id : "",
                                  subject_id: "",
                                };
                              });
                            }}
                          >
                            <option value="">All sections</option>
                            {sections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                          </select>
                        </div>
                        <div className="cbt-field">
                          <label className="cbt-label">Department</label>
                          <select
                            className="cbt-select"
                            value={settingsForm.department_id}
                            disabled={!examDetail || selectedIsPublished || isSectionWithoutDept(settingsForm.section_id)}
                            onChange={(e) => setSettingsForm((p) => ({ ...p, department_id: e.target.value, subject_id: "" }))}
                          >
                            <option value="">{isSectionWithoutDept(settingsForm.section_id) ? "General (Not applicable for this section)" : "General Department / Common Subjects"}</option>
                            {!isSectionWithoutDept(settingsForm.section_id) && departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                          </select>
                        </div>
                        <div className="cbt-field">
                          <label className="cbt-label">Class</label>
                          <select
                            className="cbt-select"
                            value={settingsForm.class_id}
                            disabled={!examDetail || selectedIsPublished}
                            onChange={(e) => {
                              const nextClassId = e.target.value;
                              const cls = classes.find((c) => String(c.id) === nextClassId);
                              setSettingsForm((p) => ({
                                ...p,
                                class_id: nextClassId,
                                section_id: cls?.section_id ? String(cls.section_id) : (nextClassId ? p.section_id : ""),
                                subject_id: "",
                              }));
                            }}
                          >
                            <option value="">{settingsForm.section_id ? "All classes in section" : "All classes"}</option>
                            {settingsClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                          </select>
                        </div>
                        <div className="cbt-field">
                          <label className="cbt-label">Subject</label>
                          <select
                            className="cbt-select"
                            value={settingsForm.subject_id}
                            disabled={!examDetail || selectedIsPublished}
                            onChange={(e) => setSettingsForm((p) => ({ ...p, subject_id: e.target.value }))}
                          >
                            <option value="">
                              {settingsSubjects.length === 0
                                ? "No subjects matching selection"
                                : settingsForm.section_id
                                ? `Select subject (${settingsSubjects.length} available)`
                                : "Select subject"}
                            </option>
                            {settingsSubjects.map((item) => (
                              <option key={item.id} value={item.id}>
                                {getSubjectLabel(item)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="cbt-field">
                          <label className="cbt-label">Mode</label>
                          <select className="cbt-select" value={settingsForm.delivery_mode} disabled={!examDetail || selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, delivery_mode: e.target.value as any }))}>
                            <option value="online">Online</option>
                            <option value="offline">Offline/LAN</option>
                            <option value="hybrid">Online and Offline</option>
                          </select>
                        </div>
                        <div className="cbt-field">
                          <label className="cbt-label">Duration</label>
                          <input className="cbt-input" type="number" min={1} value={settingsForm.duration_minutes} disabled={!examDetail || selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))} />
                        </div>
                      </div>

                      <div className="cbt-section-label">Timetable</div>
                      <div className="cbt-form-grid">
                        <div className="cbt-field">
                          <label className="cbt-label">Exam date</label>
                          <input className="cbt-input" type="date" value={settingsForm.schedule.exam_date} disabled={!examDetail || selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, schedule: { ...p.schedule, exam_date: e.target.value } }))} />
                        </div>
                        <div className="cbt-field">
                          <label className="cbt-label">Venue</label>
                          <input className="cbt-input" value={settingsForm.schedule.venue} disabled={!examDetail || selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, schedule: { ...p.schedule, venue: e.target.value } }))} />
                        </div>
                        <div className="cbt-field">
                          <label className="cbt-label">Start time</label>
                          <input className="cbt-input" type="time" value={settingsForm.schedule.starts_at} disabled={!examDetail || selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, schedule: { ...p.schedule, starts_at: e.target.value } }))} />
                        </div>
                        <div className="cbt-field">
                          <label className="cbt-label">End time</label>
                          <input className="cbt-input" type="time" value={settingsForm.schedule.ends_at} disabled={!examDetail || selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, schedule: { ...p.schedule, ends_at: e.target.value } }))} />
                        </div>
                      </div>
                      <p className="cbt-help">Public access follows this timetable. Leave empty to use publish/start and end windows.</p>

                      <div className="cbt-section-label">Exam rules</div>
                      <label className="cbt-toggle">
                        <input type="checkbox" checked={Boolean(settingsForm.shuffle_questions)} disabled={!examDetail || selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, shuffle_questions: e.target.checked }))} />
                        <span><strong>Shuffle questions</strong><span>Comprehension blocks stay together with their passage.</span></span>
                      </label>
                      <label className="cbt-toggle">
                        <input type="checkbox" checked={Boolean(settingsForm.shuffle_options)} disabled={!examDetail || selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, shuffle_options: e.target.checked }))} />
                        <span><strong>Shuffle options</strong><span>Answer options can appear in a different order for students.</span></span>
                      </label>
                      <label className="cbt-toggle">
                        <input type="checkbox" checked={Boolean(settingsForm.show_result_after_submit)} disabled={!examDetail || selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, show_result_after_submit: e.target.checked }))} />
                        <span><strong>Show score after submit</strong><span>Students can see score immediately after submission.</span></span>
                      </label>
                      <label className="cbt-toggle">
                        <input type="checkbox" checked={Boolean(settingsForm.access_code_required)} disabled={!examDetail || selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, access_code_required: e.target.checked }))} />
                        <span><strong>Require access code</strong><span>Students must enter this code only when the school enables it.</span></span>
                      </label>
                      {settingsForm.access_code_required && (
                        <div className="cbt-field">
                          <label className="cbt-label">Access code</label>
                          <input className="cbt-input" value={settingsForm.access_code} disabled={!examDetail || selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, access_code: e.target.value }))} />
                        </div>
                      )}
                      <label className="cbt-toggle">
                        <input type="checkbox" checked={Boolean(settingsForm.calculator_enabled)} disabled={!examDetail || selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, calculator_enabled: e.target.checked }))} />
                        <span><strong>Allow scientific calculator</strong><span>Useful for Mathematics, Physics, Chemistry, and other science exams.</span></span>
                      </label>
                      <div className="cbt-field">
                        <label className="cbt-label">General instructions</label>
                        <textarea className="cbt-textarea" value={settingsForm.general_instructions} disabled={!examDetail || selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, general_instructions: e.target.value }))} />
                      </div>
                      <button className="cbt-btn cbt-primary" disabled={saving || !examDetail || selectedIsPublished}><i className="bi bi-save" /> Save Settings</button>
                    </div>
                  </form>

                  <div className="cbt-side-card">
                    <h3>Exam setup</h3>
                    <p>Update class, timetable, access code, calculator, shuffle rules, and instructions in a focused modal.</p>
                    <button className="cbt-btn cbt-primary w-100" type="button" disabled={!examDetail} onClick={() => setSettingsModalOpen(true)}>
                      <i className="bi bi-sliders" /> Open Settings
                    </button>
                  </div>

                  <div className="cbt-side-card">
                      <h3>Offline CBT</h3>
                      <p>Download the Windows server app, then prepare a signed exam package for school WiFi exams.</p>
                      <div className="d-flex flex-column gap-2">
                        <button className="cbt-btn cbt-primary w-100" type="button" disabled={saving} onClick={downloadOfflineInstaller}>
                          <i className="bi bi-download" /> Download Offline App
                        </button>
                        <button className="cbt-btn cbt-soft w-100" type="button" onClick={() => setLicenseModalOpen(true)}>
                          <i className="bi bi-router" /> Offline Package
                        </button>
                      </div>
                    </div>

                  <form className="cbt-panel" onSubmit={addSection}>
                    <div className="cbt-head"><h2>Add section</h2><p>Use sections for Paper 1, Essay, Objectives, or subject parts.</p></div>
                    <div className="cbt-body">
                      <label className="cbt-label">Section title</label>
                      <input className="cbt-input" value={sectionForm.title} disabled={!examDetail || selectedIsPublished} onChange={(e) => setSectionForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Objective Questions" required />
                      <label className="cbt-label">Instructions</label>
                      <textarea className="cbt-textarea" value={sectionForm.instructions} disabled={!examDetail || selectedIsPublished} onChange={(e) => setSectionForm((p) => ({ ...p, instructions: e.target.value }))} placeholder="Optional instructions for this section." />
                      <button className="cbt-btn cbt-primary" disabled={saving || !examDetail || selectedIsPublished}><i className="bi bi-layout-text-window" /> Add Section</button>
                    </div>
                  </form>

                  <form className="cbt-panel" onSubmit={addGroup}>
                    <div className="cbt-head"><h2>Add passage/instruction</h2><p>Useful for English comprehension or questions that share one instruction.</p></div>
                    <div className="cbt-body">
                      <label className="cbt-label">Attach to section</label>
                      <select className="cbt-select" value={groupForm.section_id} disabled={!examDetail || selectedIsPublished} onChange={(e) => setGroupForm((p) => ({ ...p, section_id: e.target.value }))}>
                        <option value="">General</option>
                        {(examDetail?.sections || []).map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}
                      </select>
                      <label className="cbt-label">Type</label>
                      <select className="cbt-select" value={groupForm.group_type} disabled={!examDetail || selectedIsPublished} onChange={(e) => setGroupForm((p) => ({ ...p, group_type: e.target.value }))}>
                        <option value="comprehension">Comprehension</option>
                        <option value="instruction">Instruction</option>
                        <option value="case_study">Case study</option>
                      </select>
                      <label className="cbt-label">Title</label>
                      <input className="cbt-input" value={groupForm.title} disabled={!examDetail || selectedIsPublished} onChange={(e) => setGroupForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Read the passage below" />
                      <label className="cbt-label">Passage or instruction</label>
                      <textarea className="cbt-textarea" value={groupForm.passage} disabled={!examDetail || selectedIsPublished} onChange={(e) => setGroupForm((p) => ({ ...p, passage: e.target.value, instructions: e.target.value }))} placeholder="Paste comprehension passage or shared instruction here." />
                      <button className="cbt-btn cbt-primary" disabled={saving || !examDetail || selectedIsPublished}><i className="bi bi-journal-plus" /> Add Group</button>
                    </div>
                  </form>
                </div>
              </section>

              <Footer />
            </div>
          </main>
        </div>
      </div>
      {createModalOpen && (
        <div className="cbt-modal-backdrop" role="dialog" aria-modal="true">
          <form className="cbt-modal" onSubmit={createExam}>
            <div className="cbt-modal-head">
              <div><h2>Create CBT Exam</h2><p>Set the essentials now, then add questions from the builder.</p></div>
              <button className="cbt-btn cbt-soft" type="button" onClick={() => setCreateModalOpen(false)}><i className="bi bi-x-lg" /> Close</button>
            </div>
            <div className="cbt-modal-body">
              {isTeacher && subjects.length === 0 && (
                <div style={{ padding: "12px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#991b1b", fontSize: 13, marginBottom: 16 }}>
                  <strong>⚠️ No Assigned Subjects:</strong> You do not have any assigned teaching subjects. CBT examinations can only be created for subjects assigned to you by the school administrator.
                </div>
              )}
              <div className="cbt-section-label">Basics</div>
              <div className="cbt-form-grid">
                <div className="cbt-field cbt-field-full">
                  <label className="cbt-label">Exam title</label>
                  <input className="cbt-input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required placeholder="e.g. English Language CBT" />
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">Section</label>
                  <select
                    className="cbt-select"
                    value={form.section_id}
                    onChange={(e) => {
                      const nextSecId = e.target.value;
                      const noDept = isSectionWithoutDept(nextSecId);
                      setForm((p) => {
                        const curCls = classes.find((c) => String(c.id) === p.class_id);
                        const classValid = !p.class_id || !nextSecId || (curCls?.section_id && String(curCls.section_id) === nextSecId);
                        return {
                          ...p,
                          section_id: nextSecId,
                          department_id: noDept ? "" : p.department_id,
                          class_id: classValid ? p.class_id : "",
                          subject_id: "",
                        };
                      });
                    }}
                  >
                    <option value="">All sections</option>
                    {sections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">Department</label>
                  <select
                    className="cbt-select"
                    value={form.department_id}
                    disabled={isSectionWithoutDept(form.section_id)}
                    onChange={(e) => setForm((p) => ({ ...p, department_id: e.target.value, subject_id: "" }))}
                  >
                    <option value="">{isSectionWithoutDept(form.section_id) ? "General (Not applicable for this section)" : "General Department / Common Subjects"}</option>
                    {!isSectionWithoutDept(form.section_id) && departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">Class</label>
                  <select
                    className="cbt-select"
                    value={form.class_id}
                    onChange={(e) => {
                      const nextClassId = e.target.value;
                      const cls = classes.find((c) => String(c.id) === nextClassId);
                      setForm((p) => ({
                        ...p,
                        class_id: nextClassId,
                        section_id: cls?.section_id ? String(cls.section_id) : (nextClassId ? p.section_id : ""),
                        subject_id: "",
                      }));
                    }}
                  >
                    <option value="">{form.section_id ? "All classes in section" : "All classes"}</option>
                    {createClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">Subject</label>
                  <select
                    className="cbt-select"
                    value={form.subject_id}
                    onChange={(e) => setForm((p) => ({ ...p, subject_id: e.target.value }))}
                  >
                    <option value="">
                      {createSubjects.length === 0
                        ? "No subjects matching selection"
                        : form.section_id
                        ? `Select subject (${createSubjects.length} available)`
                        : "Select subject"}
                    </option>
                    {createSubjects.map((item) => (
                      <option key={item.id} value={item.id}>
                        {getSubjectLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">Mode</label>
                  <select className="cbt-select" value={form.delivery_mode} onChange={(e) => setForm((p) => ({ ...p, delivery_mode: e.target.value as any }))}>
                    <option value="online">Online</option>
                    <option value="offline">Offline/LAN</option>
                    <option value="hybrid">Online and Offline</option>
                  </select>
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">Duration</label>
                  <input className="cbt-input" type="number" min={1} value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))} />
                </div>
              </div>

              <div className="cbt-section-label">Timetable</div>
              <div className="cbt-form-grid">
                <div className="cbt-field">
                  <label className="cbt-label">Exam date</label>
                  <input className="cbt-input" type="date" value={form.schedule.exam_date} onChange={(e) => setForm((p) => ({ ...p, schedule: { ...p.schedule, exam_date: e.target.value } }))} />
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">Venue</label>
                  <input className="cbt-input" value={form.schedule.venue} onChange={(e) => setForm((p) => ({ ...p, schedule: { ...p.schedule, venue: e.target.value } }))} placeholder="CBT Lab" />
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">Start time</label>
                  <input className="cbt-input" type="time" value={form.schedule.starts_at} onChange={(e) => setForm((p) => ({ ...p, schedule: { ...p.schedule, starts_at: e.target.value } }))} />
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">End time</label>
                  <input className="cbt-input" type="time" value={form.schedule.ends_at} onChange={(e) => setForm((p) => ({ ...p, schedule: { ...p.schedule, ends_at: e.target.value } }))} />
                </div>
                <div className="cbt-field-full d-flex justify-content-between align-items-center mb-2">
                  <p className="cbt-help mb-0">Optional: leave empty for on-demand / unscheduled examination.</p>
                  {form.schedule.exam_date && (
                    <button
                      type="button"
                      className="cbt-btn cbt-ghost text-danger btn-sm py-1 px-2"
                      style={{ fontSize: "11px" }}
                      onClick={() => setForm((p) => ({ ...p, schedule: { exam_date: "", starts_at: "", ends_at: "", venue: "" } }))}
                    >
                      <i className="bi bi-x-circle me-1" /> Clear Timetable
                    </button>
                  )}
                </div>
              </div>

              <div className="cbt-section-label">Exam rules</div>
              <div className="cbt-form-grid">
                <label className="cbt-toggle"><input type="checkbox" checked={form.shuffle_questions} onChange={(e) => setForm((p) => ({ ...p, shuffle_questions: e.target.checked }))} /><span><strong>Shuffle questions</strong><span>Keep passage blocks together.</span></span></label>
                <label className="cbt-toggle"><input type="checkbox" checked={form.shuffle_options} onChange={(e) => setForm((p) => ({ ...p, shuffle_options: e.target.checked }))} /><span><strong>Shuffle options</strong><span>Randomize answer options.</span></span></label>
                <label className="cbt-toggle"><input type="checkbox" checked={form.show_result_after_submit} onChange={(e) => setForm((p) => ({ ...p, show_result_after_submit: e.target.checked }))} /><span><strong>Show score</strong><span>Show after submission.</span></span></label>
                <label className="cbt-toggle"><input type="checkbox" checked={form.calculator_enabled} onChange={(e) => setForm((p) => ({ ...p, calculator_enabled: e.target.checked }))} /><span><strong>Calculator</strong><span>Allow scientific calculator.</span></span></label>
                <label className="cbt-toggle"><input type="checkbox" checked={form.access_code_required} onChange={(e) => setForm((p) => ({ ...p, access_code_required: e.target.checked }))} /><span><strong>Access code</strong><span>Require exam code.</span></span></label>
                {form.access_code_required && <div className="cbt-field"><label className="cbt-label">Access code</label><input className="cbt-input" value={form.access_code} onChange={(e) => setForm((p) => ({ ...p, access_code: e.target.value }))} placeholder="e.g. ENG-2026" /></div>}
              </div>
              <div className="cbt-section-label">Theory / Essay Questions</div>
              <div className="cbt-field cbt-field-full mb-3" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px" }}>
                <label className="cbt-label" style={{ fontWeight: 700, color: "#0F2744", fontSize: 13, marginBottom: 8, display: "block" }}>
                  Do you want to include theory/essay questions in this examination?
                </label>
                <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, color: !form.include_theory ? "#0F2744" : "#64748B" }}>
                    <input
                      type="radio"
                      name="modal_include_theory"
                      checked={!form.include_theory}
                      onChange={() => setForm((p) => ({ ...p, include_theory: false }))}
                    />
                    <span>No – Objective Questions Only</span>
                  </label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, color: form.include_theory ? "#0F2744" : "#64748B" }}>
                    <input
                      type="radio"
                      name="modal_include_theory"
                      checked={Boolean(form.include_theory)}
                      onChange={() => setForm((p) => ({ ...p, include_theory: true }))}
                    />
                    <span>Yes – Include Theory Questions</span>
                  </label>
                </div>
                {form.include_theory && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #E2E8F0" }}>
                    <label className="cbt-label" style={{ fontWeight: 600 }}>Theory Section Instructions (Section B)</label>
                    <textarea
                      className="cbt-textarea"
                      style={{ minHeight: 70 }}
                      placeholder="e.g. Read the questions below and write answers on your physical answer paper."
                      value={form.theory_instructions}
                      onChange={(e) => setForm((p) => ({ ...p, theory_instructions: e.target.value }))}
                    />
                    <small style={{ color: "#64748B", display: "block", marginTop: 4 }}>
                      ℹ️ Students will read these questions on their screen and answer manually on paper using a pen. Teachers will enter marks later in Result Entry.
                    </small>
                  </div>
                )}
              </div>

              <div className="cbt-field">
                <label className="cbt-label">General instructions</label>
                <textarea className="cbt-textarea" value={form.general_instructions} onChange={(e) => setForm((p) => ({ ...p, general_instructions: e.target.value }))} placeholder="Instructions shown before students start." />
              </div>
            </div>
            <div className="cbt-modal-head">
              <button className="cbt-btn cbt-soft" type="button" onClick={() => setCreateModalOpen(false)}>Cancel</button>
              <button className="cbt-btn cbt-primary" disabled={saving}><i className="bi bi-plus-circle" /> {saving ? "Saving..." : "Create Exam"}</button>
            </div>
          </form>
        </div>
      )}

      {settingsModalOpen && examDetail && (
        <div className="cbt-modal-backdrop" role="dialog" aria-modal="true">
          <form className="cbt-modal" onSubmit={updateExamSettings}>
            <div className="cbt-modal-head">
              <div><h2>Exam Settings</h2><p>{examDetail.title}</p></div>
              <button className="cbt-btn cbt-soft" type="button" onClick={() => setSettingsModalOpen(false)}><i className="bi bi-x-lg" /> Close</button>
            </div>
            <div className="cbt-modal-body">
              {selectedIsPublished && <div className="alert alert-warning">Reopen this exam first if no student has accessed it.</div>}
              <div className="cbt-section-label">Basics</div>
              <div className="cbt-form-grid">
                <div className="cbt-field cbt-field-full"><label className="cbt-label">Exam title</label><input className="cbt-input" value={settingsForm.title} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, title: e.target.value }))} required /></div>
                <div className="cbt-field">
                  <label className="cbt-label">Section</label>
                  <select
                    className="cbt-select"
                    value={settingsForm.section_id}
                    disabled={selectedIsPublished}
                    onChange={(e) => {
                      const nextSecId = e.target.value;
                      const noDept = isSectionWithoutDept(nextSecId);
                      setSettingsForm((p) => {
                        const curCls = classes.find((c) => String(c.id) === p.class_id);
                        const classValid = !p.class_id || !nextSecId || (curCls?.section_id && String(curCls.section_id) === nextSecId);
                        return {
                          ...p,
                          section_id: nextSecId,
                          department_id: noDept ? "" : p.department_id,
                          class_id: classValid ? p.class_id : "",
                          subject_id: "",
                        };
                      });
                    }}
                  >
                    <option value="">All sections</option>
                    {sections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">Department</label>
                  <select
                    className="cbt-select"
                    value={settingsForm.department_id}
                    disabled={selectedIsPublished || isSectionWithoutDept(settingsForm.section_id)}
                    onChange={(e) => setSettingsForm((p) => ({ ...p, department_id: e.target.value, subject_id: "" }))}
                  >
                    <option value="">{isSectionWithoutDept(settingsForm.section_id) ? "General (Not applicable for this section)" : "General Department / Common Subjects"}</option>
                    {!isSectionWithoutDept(settingsForm.section_id) && departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">Class</label>
                  <select
                    className="cbt-select"
                    value={settingsForm.class_id}
                    disabled={selectedIsPublished}
                    onChange={(e) => {
                      const nextClassId = e.target.value;
                      const cls = classes.find((c) => String(c.id) === nextClassId);
                      setSettingsForm((p) => ({
                        ...p,
                        class_id: nextClassId,
                        section_id: cls?.section_id ? String(cls.section_id) : (nextClassId ? p.section_id : ""),
                        subject_id: "",
                      }));
                    }}
                  >
                    <option value="">{settingsForm.section_id ? "All classes in section" : "All classes"}</option>
                    {settingsClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">Subject</label>
                  <select
                    className="cbt-select"
                    value={settingsForm.subject_id}
                    disabled={selectedIsPublished}
                    onChange={(e) => setSettingsForm((p) => ({ ...p, subject_id: e.target.value }))}
                  >
                    <option value="">
                      {settingsSubjects.length === 0
                        ? "No subjects matching selection"
                        : settingsForm.section_id
                        ? `Select subject (${settingsSubjects.length} available)`
                        : "Select subject"}
                    </option>
                    {settingsSubjects.map((item) => (
                      <option key={item.id} value={item.id}>
                        {getSubjectLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="cbt-field"><label className="cbt-label">Mode</label><select className="cbt-select" value={settingsForm.delivery_mode} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, delivery_mode: e.target.value as any }))}><option value="online">Online</option><option value="offline">Offline/LAN</option><option value="hybrid">Online and Offline</option></select></div>
                <div className="cbt-field"><label className="cbt-label">Duration</label><input className="cbt-input" type="number" min={1} value={settingsForm.duration_minutes} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))} /></div>
              </div>
              <div className="cbt-section-label">Timetable</div>
              <div className="cbt-form-grid">
                <div className="cbt-field"><label className="cbt-label">Exam date</label><input className="cbt-input" type="date" value={settingsForm.schedule.exam_date} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, schedule: { ...p.schedule, exam_date: e.target.value } }))} /></div>
                <div className="cbt-field"><label className="cbt-label">Venue</label><input className="cbt-input" value={settingsForm.schedule.venue} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, schedule: { ...p.schedule, venue: e.target.value } }))} /></div>
                <div className="cbt-field"><label className="cbt-label">Start time</label><input className="cbt-input" type="time" value={settingsForm.schedule.starts_at} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, schedule: { ...p.schedule, starts_at: e.target.value } }))} /></div>
                <div className="cbt-field"><label className="cbt-label">End time</label><input className="cbt-input" type="time" value={settingsForm.schedule.ends_at} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, schedule: { ...p.schedule, ends_at: e.target.value } }))} /></div>
                <div className="cbt-field-full d-flex justify-content-between align-items-center mb-2">
                  <p className="cbt-help mb-0">Optional: leave blank or clear for on-demand / unscheduled examination.</p>
                  {settingsForm.schedule.exam_date && !selectedIsPublished && (
                    <button
                      type="button"
                      className="cbt-btn cbt-ghost text-danger btn-sm py-1 px-2"
                      style={{ fontSize: "11px" }}
                      onClick={() => setSettingsForm((p) => ({ ...p, schedule: { exam_date: "", starts_at: "", ends_at: "", venue: "" } }))}
                    >
                      <i className="bi bi-x-circle me-1" /> Clear Timetable
                    </button>
                  )}
                </div>
              </div>
              <div className="cbt-section-label">Exam rules</div>
              <div className="cbt-form-grid">
                <label className="cbt-toggle"><input type="checkbox" checked={Boolean(settingsForm.shuffle_questions)} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, shuffle_questions: e.target.checked }))} /><span><strong>Shuffle questions</strong><span>Keep passage blocks together.</span></span></label>
                <label className="cbt-toggle"><input type="checkbox" checked={Boolean(settingsForm.shuffle_options)} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, shuffle_options: e.target.checked }))} /><span><strong>Shuffle options</strong><span>Randomize answer options.</span></span></label>
                <label className="cbt-toggle"><input type="checkbox" checked={Boolean(settingsForm.show_result_after_submit)} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, show_result_after_submit: e.target.checked }))} /><span><strong>Show score</strong><span>Show after submission.</span></span></label>
                <label className="cbt-toggle"><input type="checkbox" checked={Boolean(settingsForm.calculator_enabled)} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, calculator_enabled: e.target.checked }))} /><span><strong>Calculator</strong><span>Allow scientific calculator.</span></span></label>
                <label className="cbt-toggle"><input type="checkbox" checked={Boolean(settingsForm.access_code_required)} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, access_code_required: e.target.checked }))} /><span><strong>Access code</strong><span>Require exam code.</span></span></label>
                {settingsForm.access_code_required && <div className="cbt-field"><label className="cbt-label">Access code</label><input className="cbt-input" value={settingsForm.access_code} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, access_code: e.target.value }))} /></div>}
              </div>
              <div className="cbt-section-label">Theory / Essay Questions</div>

              <div className="cbt-field cbt-field-full mb-3" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px" }}>

                <label className="cbt-label" style={{ fontWeight: 700, color: "#0F2744", fontSize: 13, marginBottom: 8, display: "block" }}>

                  Do you want to include theory/essay questions in this examination?

                </label>

                <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap" }}>

                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, color: !settingsForm.include_theory ? "#0F2744" : "#64748B" }}>

                    <input

                      type="radio"

                      name="settings_modal_include_theory"

                      disabled={selectedIsPublished}

                      checked={!settingsForm.include_theory}

                      onChange={() => setSettingsForm((p) => ({ ...p, include_theory: false }))}

                    />

                    <span>No – Objective Questions Only</span>

                  </label>

                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, color: settingsForm.include_theory ? "#0F2744" : "#64748B" }}>

                    <input

                      type="radio"

                      name="settings_modal_include_theory"

                      disabled={selectedIsPublished}

                      checked={Boolean(settingsForm.include_theory)}

                      onChange={() => setSettingsForm((p) => ({ ...p, include_theory: true }))}

                    />

                    <span>Yes – Include Theory Questions</span>

                  </label>

                </div>

                {settingsForm.include_theory && (

                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #E2E8F0" }}>

                    <label className="cbt-label" style={{ fontWeight: 600 }}>Theory Section Instructions (Section B)</label>

                    <textarea

                      className="cbt-textarea"

                      style={{ minHeight: 70 }}

                      disabled={selectedIsPublished}

                      placeholder="e.g. Read the questions below and write answers on your physical answer paper."

                      value={settingsForm.theory_instructions}

                      onChange={(e) => setSettingsForm((p) => ({ ...p, theory_instructions: e.target.value }))}

                    />

                    <small style={{ color: "#64748B", display: "block", marginTop: 4 }}>

                      ℹ️ Students will read these questions on their screen and answer manually on paper using a pen. Teachers will enter marks later in Result Entry.

                    </small>

                  </div>

                )}

              </div>



              <div className="cbt-field"><label className="cbt-label">General instructions</label><textarea className="cbt-textarea" value={settingsForm.general_instructions} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, general_instructions: e.target.value }))} /></div>
            </div>
            <div className="cbt-modal-head">
              <button className="cbt-btn cbt-soft" type="button" onClick={() => setSettingsModalOpen(false)}>Cancel</button>
              <button className="cbt-btn cbt-primary" disabled={saving || selectedIsPublished}><i className="bi bi-save" /> Save Settings</button>
            </div>
          </form>
        </div>
      )}

      {reuseModalOpen && reuseSourceExam && (
        <div className="cbt-modal-backdrop" role="dialog" aria-modal="true">
          <form className="cbt-modal" onSubmit={handleReuseExam}>
            <div className="cbt-modal-head">
              <div>
                <h2>Reuse Exam Across Academic Sessions</h2>
                <p>Create a fresh, independent copy of this exam for a new session or term while preserving all past student records and attempts.</p>
              </div>
              <button className="cbt-btn cbt-soft" type="button" onClick={() => setReuseModalOpen(false)}>
                <i className="bi bi-x-lg" /> Close
              </button>
            </div>
            <div className="cbt-modal-body">
              <div className="alert alert-info py-2 px-3 mb-3 small" style={{ borderRadius: "10px" }}>
                <i className="bi bi-info-circle-fill me-1" />
                <strong>Source:</strong> {reuseSourceExam.title} ({reuseSourceExam.subject?.name || "No subject"}) &bull; {reuseSourceExam.questions_count ?? 0} questions &bull; {reuseSourceExam.attempts_count ?? 0} historical attempts kept safe.
              </div>

              <div className="cbt-section-label">Target Academic Period</div>
              <div className="cbt-form-grid">
                <div className="cbt-field">
                  <label className="cbt-label">Target Academic Session *</label>
                  <select
                    className="cbt-select"
                    value={reuseForm.academic_session_id}
                    required
                    onChange={(e) => setReuseForm((p) => ({ ...p, academic_session_id: e.target.value }))}
                  >
                    <option value="">Select Target Session</option>
                    {sessions.map((sess) => (
                      <option key={sess.id} value={sess.id}>
                        {sess.name} {sess.is_current ? "(Current Session)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">Target Academic Term *</label>
                  <select
                    className="cbt-select"
                    value={reuseForm.term_id}
                    required
                    onChange={(e) => setReuseForm((p) => ({ ...p, term_id: e.target.value }))}
                  >
                    <option value="">Select Target Term</option>
                    {terms
                      .filter((t) => !reuseForm.academic_session_id || !t.academic_session_id || t.academic_session_id === Number(reuseForm.academic_session_id))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.is_current ? "(Current Term)" : ""}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="cbt-section-label">Exam Copy Details</div>
              <div className="cbt-form-grid">
                <div className="cbt-field cbt-field-full">
                  <label className="cbt-label">Exam Title in Target Session</label>
                  <input
                    className="cbt-input"
                    value={reuseForm.title}
                    required
                    onChange={(e) => setReuseForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. 1st Term Basic Science CBT Examination"
                  />
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">Target Class</label>
                  <select
                    className="cbt-select"
                    value={reuseForm.class_id}
                    onChange={(e) => setReuseForm((p) => ({ ...p, class_id: e.target.value }))}
                  >
                    <option value="">All classes in subject section</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">Duration (Minutes)</label>
                  <input
                    className="cbt-input"
                    type="number"
                    min={1}
                    value={reuseForm.duration_minutes}
                    onChange={(e) => setReuseForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))}
                  />
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">Pass Mark (%)</label>
                  <input
                    className="cbt-input"
                    type="number"
                    min={0}
                    max={100}
                    value={reuseForm.pass_mark}
                    onChange={(e) => setReuseForm((p) => ({ ...p, pass_mark: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="cbt-section-label">Timetable for Target Session (Optional)</div>
              <div className="cbt-form-grid">
                <div className="cbt-field">
                  <label className="cbt-label">Exam Date</label>
                  <input
                    className="cbt-input"
                    type="date"
                    value={reuseForm.schedule.exam_date}
                    onChange={(e) => setReuseForm((p) => ({ ...p, schedule: { ...p.schedule, exam_date: e.target.value } }))}
                  />
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">Venue</label>
                  <input
                    className="cbt-input"
                    value={reuseForm.schedule.venue}
                    onChange={(e) => setReuseForm((p) => ({ ...p, schedule: { ...p.schedule, venue: e.target.value } }))}
                    placeholder="e.g. CBT Hall / ICT Center"
                  />
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">Start Time</label>
                  <input
                    className="cbt-input"
                    type="time"
                    value={reuseForm.schedule.starts_at}
                    onChange={(e) => setReuseForm((p) => ({ ...p, schedule: { ...p.schedule, starts_at: e.target.value } }))}
                  />
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">End Time</label>
                  <input
                    className="cbt-input"
                    type="time"
                    value={reuseForm.schedule.ends_at}
                    onChange={(e) => setReuseForm((p) => ({ ...p, schedule: { ...p.schedule, ends_at: e.target.value } }))}
                  />
                </div>
                <div className="cbt-field-full d-flex justify-content-between align-items-center mb-2">
                  <p className="cbt-help mb-0">Optional: leave empty for on-demand / unscheduled examination.</p>
                  {reuseForm.schedule.exam_date && (
                    <button
                      type="button"
                      className="cbt-btn cbt-ghost text-danger btn-sm py-1 px-2"
                      style={{ fontSize: "11px" }}
                      onClick={() => setReuseForm((p) => ({ ...p, schedule: { exam_date: "", starts_at: "", ends_at: "", venue: "" } }))}
                    >
                      <i className="bi bi-x-circle me-1" /> Clear Timetable
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="cbt-modal-head">
              <button className="cbt-btn cbt-soft" type="button" onClick={() => setReuseModalOpen(false)}>
                Cancel
              </button>
              <button className="cbt-btn cbt-primary" disabled={reusing}>
                <i className="bi bi-copy" /> {reusing ? "Copying Exam..." : "Reuse in Target Session"}
              </button>
            </div>
          </form>
        </div>
      )}

      {licenseModalOpen && (
        <div className="cbt-modal-backdrop" role="dialog" aria-modal="true">
          <div className="cbt-modal cbt-modal-sm">
            <div className="cbt-modal-head">
              <div><h2>Offline CBT Package</h2><p>Download a signed exam package for the local WiFi CBT server and sync results back after the exam.</p></div>
              <button className="cbt-btn cbt-soft" type="button" onClick={() => setLicenseModalOpen(false)}><i className="bi bi-x-lg" /> Close</button>
            </div>
            <div className="cbt-modal-body">
              <div className="cbt-license-card mb-3 p-3 bg-light rounded border border-primary">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h4 className="m-0 text-primary fw-bold" style={{ fontSize: "1rem" }}>
                    <i className="bi bi-key-fill me-1" /> Offline CBT Server License
                  </h4>
                  <button
                    className="cbt-btn cbt-soft btn-sm"
                    type="button"
                    onClick={generateFreshLicense}
                    disabled={saving}
                  >
                    <i className="bi bi-arrow-clockwise me-1" /> {offlineLicense?.license_key ? "Generate New Key" : "Generate Key"}
                  </button>
                </div>

                {offlineLicense?.license_key ? (
                  <div>
                    <div className="d-flex gap-2 align-items-center mb-2">
                      <input
                        className="cbt-input fw-bold text-primary font-monospace flex-grow-1"
                        style={{ fontSize: "1.1rem", letterSpacing: "1px", background: "#fff" }}
                        readOnly
                        value={offlineLicense.license_key}
                      />
                      <button
                        className="cbt-btn cbt-primary"
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(offlineLicense.license_key);
                          showSuccess("License Key copied to clipboard: " + offlineLicense.license_key);
                        }}
                      >
                        <i className="bi bi-clipboard-check me-1" /> Copy Key
                      </button>
                    </div>
                    <div className="small text-muted">
                      <strong>How to connect:</strong> Open the Offline CBT Server software on your school PC at <code>http://localhost:8088/cbt/offline-runner</code>, paste this license key into <strong>Cloud Direct Sync</strong>, and click <strong>⬇️ Pull Exams</strong>.
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-muted small mb-2">No active offline license key. Click below to generate one immediately.</p>
                    <button className="cbt-btn cbt-primary" type="button" onClick={generateFreshLicense} disabled={saving}>
                      <i className="bi bi-plus-circle me-1" /> Generate License Key Now
                    </button>
                  </div>
                )}
              </div>
              <div className="cbt-import-guide mb-3">
                <code><strong>1. Host Server</strong><br />Install Offline Server on host PC & click Pull Exams (Direct LAN).</code>
                <code><strong>2. Student PCs</strong><br />Install Student CBT App on lab PCs (1-click desktop launcher).</code>
                <code><strong>3. Auto Push Results</strong><br />Click Push Results on host to save OBJ marks to report cards.</code>
              </div>
              <div className="alert alert-info mb-3">
                Download a fresh bundle close to exam time. The offline server uses the bundle snapshot to know which students are allowed to write.
              </div>

              <div className="cbt-work-actions">
                <button className="cbt-btn cbt-primary" type="button" disabled={saving} onClick={downloadStudentClient} style={{ background: "#2563EB" }}>
                  <i className="bi bi-laptop" /> Download Student CBT App (Client PCs - 2 MB)
                </button>
                <button className="cbt-btn cbt-gold" type="button" disabled={saving} onClick={downloadOfflineInstaller}>
                  <i className="bi bi-server" /> Download Offline Server (Host PC - 120 MB)
                </button>
                <button className="cbt-btn cbt-primary" type="button" disabled={saving} onClick={prepareAndDownloadOfflineBundle}>
                  <i className="bi bi-download" /> Download Offline Package
                </button>
                <button className="cbt-btn cbt-soft" type="button" disabled={saving || !offlineLicense?.id} onClick={downloadOfflineBundle}>
                  <i className="bi bi-arrow-down-circle" /> Re-download Last Package
                </button>
                <button className="cbt-btn cbt-soft" type="button" onClick={() => setManualOpen(true)}>
                  <i className="bi bi-question-circle" /> How to Use
                </button>
              </div>

              {selectedExamId && (
                <p className="cbt-help mt-2">
                  Bundle download will include the selected exam when it is set to Offline/LAN or Hybrid. Without a selected offline exam, it includes available published offline exams.
                </p>
              )}

              <hr />

              <div className="cbt-field">
                <label className="cbt-label">Upload offline result file</label>
                <input
                  className="cbt-input"
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => void handleSyncFileSelected(e.target.files?.[0] || null)}
                />
                <div className="cbt-help">Use the JSON result file exported from the local CBT server after students finish.</div>
              </div>

              {syncPayload && (
                <div className="cbt-import-result mb-3">
                  <div className="cbt-import-summary">
                    <div><span>File</span><strong>{syncFile?.name || "Ready"}</strong></div>
                    <div><span>Attempts</span><strong>{syncPayload.attempts?.length || 0}</strong></div>
                    <div><span>Package</span><strong>{syncPayload.license_id || syncPayload.offline_license_id || offlineLicense?.id || "Missing"}</strong></div>
                    <div><span>Reference</span><strong>{syncPayload.sync_reference ? "Found" : "Auto"}</strong></div>
                  </div>
                </div>
              )}

              <button className="cbt-btn cbt-primary" type="button" disabled={saving || !syncPayload || !(syncPayload.license_id || syncPayload.offline_license_id || offlineLicense?.id)} onClick={syncOfflineResults}>
                <i className="bi bi-cloud-upload" /> Sync Results
              </button>

              {syncResult && <pre className="cbt-license">{JSON.stringify(syncResult, null, 2)}</pre>}
            </div>
          </div>
        </div>
      )}

      {manualOpen && (
        <div className="cbt-modal-backdrop" role="dialog" aria-modal="true">
          <div className="cbt-modal">
            <div className="cbt-modal-head">
              <div><h2>CBT Online and Offline Manual</h2><p>Simple steps for setting exams, running online tests, running offline LAN tests, and syncing scores.</p></div>
              <button className="cbt-btn cbt-soft" type="button" onClick={() => setManualOpen(false)}><i className="bi bi-x-lg" /> Close</button>
            </div>
            <div className="cbt-modal-body">
              <div className="cbt-note mb-3">
                Use Online CBT when internet is stable. Use Offline CBT when students will write through a local WiFi router without relying on internet during the exam.
              </div>
              <div className="cbt-work-actions mb-3">
                <a className="cbt-btn cbt-primary" href={cbtManualUrl} target="_blank" rel="noreferrer"><i className="bi bi-file-earmark-pdf" /> Download PDF Manual</a>
                <a className="cbt-btn cbt-soft" href={publicAccessUrl} target="_blank" rel="noreferrer"><i className="bi bi-box-arrow-up-right" /> Open Online Access Page</a>
                <button className="cbt-btn cbt-soft" type="button" disabled={saving} onClick={downloadOfflineInstaller} title="Download Server stack for host/teacher PC"><i className="bi bi-server" /> Download Offline Server</button>
                  <button className="cbt-btn cbt-primary" type="button" disabled={saving} onClick={downloadStudentClient} title="Download lightweight client installer for student computers"><i className="bi bi-laptop" /> Download Student CBT App</button>
              </div>
              <div className="cbt-manual-grid">
                <div className="cbt-manual-card">
                  <h3>Online CBT</h3>
                  <ol>
                    <li>Create an exam and choose Online or Online and Offline as the mode.</li>
                    <li>Select the class, section, department, subject, duration, and timetable.</li>
                    <li>Add questions manually or import questions from Word, Excel, or CSV.</li>
                    <li>Preview the exam, confirm the instructions, then publish it.</li>
                    <li>Share the public access page or let students open CBT from their dashboard.</li>
                    <li>After submission, view attempts and export scores from the exam workspace.</li>
                  </ol>
                </div>
                <div className="cbt-manual-card">
                  <h3>Offline CBT</h3>
                  <ol>
                    <li>Install the SchoolProfit Offline CBT app on the server computer.</li>
                    <li>Create and publish an exam with Offline/LAN or Online and Offline mode.</li>
                    <li>Open Offline Package and click Download Offline Package close to exam time.</li>
                    <li>Upload the downloaded JSON package inside the offline app on the server computer.</li>
                    <li>Connect student computers to the same WiFi and share the link shown by the offline app.</li>
                    <li>After the exam, export results from the offline app and sync the JSON here.</li>
                  </ol>
                </div>
                <div className="cbt-manual-card">
                  <h3>Question Setup</h3>
                  <ol>
                    <li>Use sections for papers, objectives, theory, or subject parts.</li>
                    <li>Use passage/instruction groups for comprehension and shared instructions.</li>
                    <li>Enable shuffle questions only when you want standalone questions randomized.</li>
                    <li>Enable shuffle options when answer options should appear in a different order.</li>
                    <li>Use the preview button before publishing so mistakes are caught early.</li>
                  </ol>
                </div>
                <div className="cbt-manual-card">
                  <h3>Important Checks</h3>
                  <ol>
                    <li>Only published Offline/LAN or Hybrid exams enter an offline package.</li>
                    <li>Download a fresh package if fees, class list, timetable, or exam settings changed.</li>
                    <li>Students must match the exam class, section, department, and fee access rule.</li>
                    <li>Use Re-download Last Package only when the last package download failed or was lost.</li>
                    <li>Sync each result file once to avoid duplicate upload errors.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {aiModalOpen && examDetail && (
        <div className="cbt-modal-backdrop" role="dialog" aria-modal="true">
          <div className="cbt-modal">
            <div className="cbt-modal-head">
              <div>
                <h2>Generate Questions with AI</h2>
                <p>{examDetail.title} - {examDetail.subject?.name || "No subject selected"} - {examDetail.class?.name || "All classes"}</p>
              </div>
              <button className="cbt-btn cbt-soft" type="button" disabled={aiGenerating || aiImporting} onClick={() => setAiModalOpen(false)}>
                <i className="bi bi-x-lg" /> Close
              </button>
            </div>
            <div className="cbt-modal-body">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 p-3 mb-3" style={{ background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <div>
                  <span className="text-muted small d-block">Generation Unit Cost</span>
                  <strong>{aiCreditSummary?.ai_cbt_question_credit_cost ?? 5} credits</strong>
                </div>
                <div>
                  <span className="text-muted small d-block">{aiCreditSummary?.user_allocation ? "Your AI Allowance" : "School Credits"}</span>
                  <strong className="text-primary">
                    {aiCreditSummary?.user_allocation
                      ? (aiCreditSummary.user_allocation.is_unlimited ? "Unlimited" : `${aiCreditSummary.user_allocation.remaining_credits} credits remaining`)
                      : `${aiCreditSummary?.remaining_credits ?? "-"} credits remaining`}
                  </strong>
                </div>
              </div>
              {aiCreditSummary && aiCreditSummary.is_plus_active === false && (
                <div className="alert alert-warning py-2 px-3 mb-3 small" style={{ borderRadius: "10px" }}>
                  <i className="bi bi-exclamation-triangle-fill me-1" />
                  <strong>SchoolProfit Plus Required:</strong> AI Question generation requires an active SchoolProfit Plus subscription.
                </div>
              )}
              <div className="cbt-import-box">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="cbt-label">Saved lesson notes / topics</label>
                    <div className="cbt-ai-note-list">
                      {lessonNotesLoading ? (
                        <div className="cbt-help">Loading lesson notes...</div>
                      ) : lessonNoteSources.length === 0 ? (
                        <div className="cbt-help">No saved lesson note is available yet.</div>
                      ) : lessonNoteSources.map((item) => {
                        const id = String(item.id);
                        return (
                          <label className="cbt-ai-note-option" key={item.id}>
                            <input
                              type="checkbox"
                              checked={(Array.isArray(aiForm.lesson_note_ids) ? aiForm.lesson_note_ids : []).includes(id)}
                              disabled={aiGenerating || aiImporting}
                              onChange={() => toggleLessonNoteSource(id)}
                            />
                            <span>
                              <strong>{item.topic || item.title}</strong>
                              <small>{item.subject} - {item.class_name} - {item.status}</small>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="cbt-help">Tick one or more lesson topics. AI will combine the selected notes when generating the exam questions.</div>
                  </div>
                  <div className="col-md-6">
                    <label className="cbt-label">Teacher note / manual</label>
                    <label className="cbt-import-file">
                      <i className="bi bi-file-earmark-text" />
                      <span>
                        <strong>{aiFile ? aiFile.name : "Upload Word note or text file"}</strong>
                        <span>.docx or .txt. AI will use this with the selected topics.</span>
                      </span>
                      <input type="file" accept=".docx,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" disabled={aiGenerating || aiImporting} onChange={(e) => setAiFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                  <div className="col-md-6">
                    <label className="cbt-label">Topics</label>
                    <textarea className="cbt-textarea" rows={4} placeholder="Nouns, verbs, comprehension, concord" value={aiForm.topics} disabled={aiGenerating || aiImporting} onChange={(e) => setAiForm((p) => ({ ...p, topics: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="cbt-label">Extra instruction or pasted note</label>
                    <textarea className="cbt-textarea" rows={4} placeholder="Paste teacher note here if you do not want to upload a file." value={aiForm.source_text} disabled={aiGenerating || aiImporting} onChange={(e) => setAiForm((p) => ({ ...p, source_text: e.target.value }))} />
                  </div>
                  <div className="col-md-4">
                    <label className="cbt-label">Number of questions</label>
                    <input className="cbt-input" type="number" min={1} max={80} value={aiForm.question_count} disabled={aiGenerating || aiImporting} onChange={(e) => setAiForm((p) => ({ ...p, question_count: Number(e.target.value) || 1 }))} />
                  </div>
                  <div className="col-md-4">
                    <label className="cbt-label">Marks per question</label>
                    <input className="cbt-input" type="number" min={0.5} step={0.5} value={aiForm.marks_per_question} disabled={aiGenerating || aiImporting} onChange={(e) => setAiForm((p) => ({ ...p, marks_per_question: Number(e.target.value) || 1 }))} />
                  </div>
                  <div className="col-md-4">
                    <label className="cbt-label">Difficulty</label>
                    <select className="cbt-select" value={aiForm.difficulty} disabled={aiGenerating || aiImporting} onChange={(e) => setAiForm((p) => ({ ...p, difficulty: e.target.value }))}>
                      <option value="easy">Easy</option>
                      <option value="normal">Normal</option>
                      <option value="hard">Hard</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                </div>
                <div className="cbt-ai-format-grid">
                  {[
                    ["single_choice", "Objective"],
                    ["multiple_choice", "Multiple answer"],
                    ["true_false", "True / False"],
                    ["fill_blank", "Fill in the gap"],
                    ["theory", "Theory"],
                    ["comprehension", "Comprehension"],
                  ].map(([key, label]) => (
                    <label className="cbt-ai-check" key={key}>
                      <input type="checkbox" checked={aiForm.formats.includes(key)} disabled={aiGenerating || aiImporting} onChange={() => toggleAiFormat(key)} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <div className="cbt-import-actions justify-content-start mt-3">
                  <button className="cbt-btn cbt-gold" type="button" disabled={aiGenerating || aiImporting || (aiCreditSummary?.is_plus_active === false)} onClick={generateAiQuestions}>
                    <i className="bi bi-stars" /> {aiGenerating ? "Generating..." : "Generate Draft"}
                  </button>
                  <button className="cbt-btn cbt-primary" type="button" disabled={!aiDraft || aiGenerating || aiImporting} onClick={importAiDraft}>
                    <i className="bi bi-cloud-upload" /> {aiImporting ? "Importing..." : "Import Approved Draft"}
                  </button>
                </div>
              </div>

              {aiDraft && (
                <div className="cbt-import-result">
                  <div className="cbt-import-summary">
                    <div><span>Questions</span><strong>{aiDraft.summary?.questions_detected || 0}</strong></div>
                    <div><span>Sections</span><strong>{aiDraft.summary?.sections_detected || 0}</strong></div>
                    <div><span>Groups</span><strong>{aiDraft.summary?.groups_detected || 0}</strong></div>
                    <div><span>Status</span><strong>Draft</strong></div>
                  </div>
                  <div className="cbt-import-preview">
                    {(aiDraft.sections || []).map((section, sectionIndex) => (
                      <div className="cbt-import-preview-item" key={`${section.title}-${sectionIndex}`}>
                        <strong>{section.title || "AI Generated Questions"}</strong>
                        {(section.groups || []).map((group, groupIndex) => (
                          <div className="mt-2" key={`${group.title}-${groupIndex}`}>
                            <span className="cbt-pill cbt-pill-gold">{group.group_type || "group"}</span>
                            <div className="cbt-sub">{group.title || "Passage"} - {(group.questions || []).length} question(s)</div>
                          </div>
                        ))}
                        {(section.questions || []).slice(0, 4).map((question: any, qIndex: number) => (
                          <div className="cbt-sub mt-2" key={`${question.question_text}-${qIndex}`}>{qIndex + 1}. {question.question_text}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {questionImportModalOpen && examDetail && (
        <div className="cbt-modal-backdrop" role="dialog" aria-modal="true">
          <div className="cbt-modal">
            <div className="cbt-modal-head">
              <div>
                <h2>Import Questions</h2>
                <p>{examDetail.title} - {examDetail.class?.name || "All classes"}</p>
              </div>
              <button className="cbt-btn cbt-soft" type="button" onClick={() => setQuestionImportModalOpen(false)}>
                <i className="bi bi-x-lg" /> Close
              </button>
            </div>
            <div className="cbt-modal-body">
              <div className="cbt-import-box mb-0">
                <div className="cbt-import-actions mb-3 justify-content-start">
                  <button className="cbt-btn cbt-ghost" type="button" disabled={saving} onClick={() => downloadQuestionTemplate("docx")}>
                    <i className="bi bi-file-earmark-word" /> Download Word Template
                  </button>
                  <button className="cbt-btn cbt-ghost" type="button" disabled={saving} onClick={() => downloadQuestionTemplate("xlsx")}>
                    <i className="bi bi-file-earmark-excel" /> Download Excel Template
                  </button>
                  <button className="cbt-btn cbt-ghost" type="button" disabled={saving} onClick={() => downloadQuestionTemplate("csv")}>
                    <i className="bi bi-filetype-csv" /> Download CSV Template
                  </button>
                </div>
                <div className="cbt-import-top">
                  <label className="cbt-import-file">
                    <i className="bi bi-file-earmark-arrow-up" />
                    <span>
                      <strong>{questionImportFile ? questionImportFile.name : "Choose Word or Excel file"}</strong>
                      <span>Upload `.docx`, `.xlsx`, `.xls`, or `.csv`. Click Check File before importing.</span>
                    </span>
                    <input
                      type="file"
                      accept=".docx,.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                      disabled={selectedIsPublished || questionImporting}
                      onChange={(e) => {
                        setQuestionImportFile(e.target.files?.[0] || null);
                        setQuestionImportResult(null);
                      }}
                    />
                  </label>
                  <div className="cbt-import-actions">
                    <button className="cbt-btn cbt-ghost" type="button" disabled={!questionImportFile || selectedIsPublished || questionImporting} onClick={() => importQuestionFile(true)}>
                      <i className="bi bi-search" /> Check File
                    </button>
                    <button className="cbt-btn cbt-primary" type="button" disabled={!questionImportFile || selectedIsPublished || questionImporting || Boolean((questionImportResult?.summary?.errors_count || 0) > 0)} onClick={() => importQuestionFile(false)}>
                      <i className="bi bi-cloud-upload" /> Import Questions
                    </button>
                  </div>
                </div>
                <div className="cbt-import-guide">
                  <code>Word: insert tables/images directly under the question</code>
                  <code>Excel: use question_image_url and question_table columns</code>
                  <code>Answer: A or A,C for multiple choice</code>
                </div>

                {questionImportResult && (
                  <div className="cbt-import-result">
                    <div className="cbt-import-summary">
                      <div><span>Questions</span><strong>{questionImportResult.summary?.questions_detected || 0}</strong></div>
                      <div><span>Sections</span><strong>{questionImportResult.summary?.sections_detected || 0}</strong></div>
                      <div><span>Passages</span><strong>{questionImportResult.summary?.passages_detected || 0}</strong></div>
                      <div><span>Errors</span><strong>{questionImportResult.summary?.errors_count || 0}</strong></div>
                    </div>
                    {(questionImportResult.errors || []).length > 0 ? (
                      <div className="cbt-import-errors">
                        {(questionImportResult.errors || []).slice(0, 8).map((error, index) => <div key={`${error}-${index}`}>{error}</div>)}
                      </div>
                    ) : (
                      <div className="cbt-import-preview">
                        {(questionImportResult.questions || []).slice(0, 12).map((question) => (
                          <div className="cbt-import-preview-item" key={`${question.number}-${question.text}`}>
                            <strong>{question.number}. {question.text}</strong>
                            <span className="cbt-pill">{String(question.type || "").replace(/_/g, " ")}</span>
                            <span className="cbt-pill cbt-pill-neutral">{question.options || 0} option(s)</span>
                            {question.has_passage && <span className="cbt-pill cbt-pill-gold">Passage</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {previewOpen && examDetail && (
        <div className="cbt-modal-backdrop" role="dialog" aria-modal="true">
          <div className="cbt-modal">
            <div className="cbt-modal-head">
              <div>
                <h2>{examDetail.title}</h2>
                <p>{examDetail.exam_code || `Exam #${examDetail.id}`} - {examDetail.duration_minutes} minutes - {questions.length} question(s)</p>
              </div>
              <button className="cbt-btn cbt-soft" type="button" onClick={() => setPreviewOpen(false)}>
                <i className="bi bi-x-lg" /> Close
              </button>
            </div>
            <div className="cbt-modal-body">
              {examDetail.general_instructions && (
                <div className="cbt-preview-question">
                  <h3>General instructions</h3>
                  <p className="mb-0">{examDetail.general_instructions}</p>
                </div>
              )}

              {groups.length > 0 && (
                <div className="cbt-preview-question">
                  <h3>Passages and instructions</h3>
                  {groups.map((group: any) => (
                    <div className="mb-3" key={group.id}>
                      <div className="cbt-pill mb-2">{group.group_type?.replace(/_/g, " ")}</div>
                      <div className="fw-bold">{group.title || "Untitled group"}</div>
                      <div className="cbt-sub">{group.sectionTitle}</div>
                      {(group.passage || group.instructions) && <p className="mt-2 mb-0">{group.passage || group.instructions}</p>}
                    </div>
                  ))}
                </div>
              )}

              {examDetail.include_theory ? (
                <>
                  {/* Section A: Objective Questions */}
                  <div className="mb-4">
                    <div className="d-flex align-items-center justify-content-between p-2 px-3 mb-3 bg-light rounded border">
                      <h3 className="m-0" style={{ fontSize: 15, fontWeight: 700, color: "#0F2744" }}>
                        Section A: Objective Questions ({objectiveQuestions.length})
                      </h3>
                      <span className="cbt-pill cbt-pill-green">
                        Total: {objectiveQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)} marks
                      </span>
                    </div>
                    {objectiveQuestions.length === 0 ? (
                      <div className="cbt-empty mb-3">No objective questions in Section A.</div>
                    ) : (
                      objectiveQuestions.map((question, index) => (
                        <div className="cbt-preview-question" key={`preview-${question.id}`}>
                          <h3>{index + 1}.</h3>
                          <CbtHtml html={question.question_text} />
                          {question.diagram_url && (
                            <div className="my-2 p-2 bg-light rounded text-center border">
                              <img
                                src={question.diagram_url}
                                alt="Question diagram"
                                style={{ maxHeight: 240, maxWidth: "100%", objectFit: "contain", borderRadius: 6 }}
                              />
                            </div>
                          )}
                          <div className="cbt-question-meta mb-2">
                            <span className="cbt-pill">{question.question_type.replace(/_/g, " ")}</span>
                            <span className="cbt-pill">{question.marks} mark(s)</span>
                          </div>
                          {(question.options || []).map((option) => (
                            <div className="cbt-preview-option" key={`preview-${question.id}-${option.label}`}>
                              <strong>{option.label}.</strong>
                              <CbtHtml html={option.option_text} />
                              {option.is_correct ? <span className="cbt-pill">Answer</span> : null}
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Section B: Theory Questions */}
                  <div className="mb-4">
                    <div className="p-3 mb-3 rounded border" style={{ background: "#EFF6FF", borderColor: "#BFDBFE" }}>
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <div>
                          <h3 className="m-0" style={{ fontSize: 16, fontWeight: 800, color: "#1E40AF" }}>
                            Section B: Theory / Essay Questions ({theoryQuestions.length})
                          </h3>
                          <p className="m-0 small" style={{ color: "#3B82F6" }}>
                            Paper-based answering. Students write answers manually on physical answer sheets.
                          </p>
                        </div>
                        <span className="cbt-pill" style={{ background: "#DBEAFE", color: "#1E40AF", fontWeight: 700 }}>
                          Total: {theoryQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)} marks
                        </span>
                      </div>
                      {examDetail.theory_instructions && (
                        <div className="mt-2 pt-2 border-top small" style={{ borderColor: "#BFDBFE", color: "#1E3A8A" }}>
                          <strong>Instructions:</strong> {examDetail.theory_instructions}
                        </div>
                      )}
                    </div>

                    {theoryQuestions.length === 0 ? (
                      <div className="cbt-empty mb-3">No theory questions in Section B yet.</div>
                    ) : (
                      theoryQuestions.map((question, index) => (
                        <div className="cbt-preview-question" key={`preview-theory-${question.id}`} style={{ borderLeft: "4px solid #2563EB" }}>
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <h3 className="m-0" style={{ color: "#1E40AF" }}>Theory Question {index + 1}</h3>
                            <span className="cbt-pill" style={{ background: "#DBEAFE", color: "#1E40AF", fontWeight: 700 }}>
                              {question.marks} mark(s)
                            </span>
                          </div>
                          <CbtHtml html={question.question_text} />
                          {question.diagram_url && (
                            <div className="my-2 p-2 bg-light rounded text-center border">
                              <img
                                src={question.diagram_url}
                                alt={`Theory Question ${index + 1} Diagram`}
                                style={{ maxHeight: 240, maxWidth: "100%", objectFit: "contain", borderRadius: 6 }}
                              />
                            </div>
                          )}
                          {question.explanation && (
                            <div className="cbt-note mt-2" style={{ fontSize: 12 }}>
                              <strong>Marking guide:</strong> {question.explanation}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                questions.length === 0 ? (
                  <div className="cbt-empty">No questions have been added to this exam yet.</div>
                ) : questions.map((question, index) => (
                  <div className="cbt-preview-question" key={`preview-${question.id}`}>
                    <h3>{index + 1}.</h3>
                    <CbtHtml html={question.question_text} />
                    {question.diagram_url && (
                      <div className="my-2 p-2 bg-light rounded text-center border">
                        <img
                          src={question.diagram_url}
                          alt="Question diagram"
                          style={{ maxHeight: 240, maxWidth: "100%", objectFit: "contain", borderRadius: 6 }}
                        />
                      </div>
                    )}
                    <div className="cbt-question-meta mb-2">
                      <span className="cbt-pill">{question.question_type.replace(/_/g, " ")}</span>
                      <span className="cbt-pill">{question.marks} mark(s)</span>
                    </div>
                    {(question.options || []).map((option) => (
                      <div className="cbt-preview-option" key={`preview-${question.id}-${option.label}`}>
                        <strong>{option.label}.</strong>
                        <CbtHtml html={option.option_text} />
                        {option.is_correct ? <span className="cbt-pill">Answer</span> : null}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      <ClassCbtSettingsModal isOpen={classCbtModalOpen} onClose={() => setClassCbtModalOpen(false)} onSaved={load} />
    </>
  );
}
