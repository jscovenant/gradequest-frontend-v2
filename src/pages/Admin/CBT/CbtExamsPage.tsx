import { FormEvent, useEffect, useMemo, useState } from "react";

import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";
import CbtHtml from "../../../components/cbt/CbtHtml";
import CbtRichEditor from "../../../components/cbt/CbtRichEditor";
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
};

type SchoolSection = {
  id: number;
  name: string;
};

type Department = {
  id: number;
  name: string;
};

type Subject = {
  id: number;
  name: string;
  department_id?: number | null;
  section_id?: number | null;
  class_id?: number | null;
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
      const key = normalizeSubjectName(subject.name);
      if (key && !chosen.has(key)) chosen.set(key, subject);
    });

  return Array.from(chosen.values()).sort((a, b) => a.name.localeCompare(b.name));
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
  const [form, setForm] = useState(emptyExam);
  const [settingsForm, setSettingsForm] = useState(emptyExam);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [examDetail, setExamDetail] = useState<CbtExamDetail | null>(null);
  const [sectionForm, setSectionForm] = useState(emptySection);
  const [groupForm, setGroupForm] = useState(emptyGroup);
  const [questionForm, setQuestionForm] = useState(emptyQuestion);
  const [licenseDays] = useState(365);
  const [offlineLicense, setOfflineLicense] = useState<any>(null);
  const [syncFile, setSyncFile] = useState<File | null>(null);
  const [syncPayload, setSyncPayload] = useState<any>(null);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
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

  const readList = <T,>(value: any): T[] => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    return [];
  };

  const visibleSubjectsFor = (values: typeof emptyExam) => {
    const selectedDepartment = values.department_id ? Number(values.department_id) : null;
    const selectedSection = values.section_id ? Number(values.section_id) : null;
    const selectedClass = values.class_id ? Number(values.class_id) : null;

    return preferGeneralSubjects(subjects.filter((subject) => {
      const subjectDepartment = Number(subject.department_id || 0);
      if (selectedDepartment && subjectDepartment > 0 && subjectDepartment !== selectedDepartment) return false;
      if (selectedSection && subject.section_id && Number(subject.section_id) !== selectedSection) return false;
      if (selectedClass && subject.class_id && Number(subject.class_id) !== selectedClass) return false;
      return true;
    }));
  };

  const createSubjects = useMemo(() => visibleSubjectsFor(form), [subjects, form.department_id, form.section_id, form.class_id]);
  const settingsSubjects = useMemo(() => visibleSubjectsFor(settingsForm), [subjects, settingsForm.department_id, settingsForm.section_id, settingsForm.class_id]);

  const examPayload = (values: typeof emptyExam) => ({
    ...values,
    subject_id: values.subject_id ? Number(values.subject_id) : null,
    class_id: values.class_id ? Number(values.class_id) : null,
    section_id: values.section_id ? Number(values.section_id) : null,
    department_id: values.department_id ? Number(values.department_id) : null,
    access_code: values.access_code_required ? values.access_code : null,
  });

  async function load() {
    setLoading(true);
    try {
      const [examRes, classRes, sectionRes, departmentRes] = await Promise.all([
        authApi.get("/cbt/exams"),
        authApi.get("/levels"),
        authApi.get("/sections"),
        authApi.get("/departments"),
      ]);
      const departmentList = readList<Department>(departmentRes.data);
      const subjectResponses = await Promise.all(
        departmentList.map((department) =>
          authApi.get(`/departments/${department.id}/subjects`).catch(() => ({ data: [] }))
        )
      );
      const subjectMap = new Map<number, Subject>();
      subjectResponses.forEach((response) => {
        readList<Subject>(response.data).forEach((subject) => {
          subjectMap.set(subject.id, { ...subject, department_id: subject.department_id ?? null });
        });
      });

      const user = getUser();
      const isTeacher = String(user?.role || "").toLowerCase() === "teacher";

      let finalSubjects: Subject[] = [];
      if (isTeacher) {
        try {
          const tsRes = await authApi.get("/teacher-subjects");
          const assignments = readList<any>(tsRes.data);
          const teacherSubjects = assignments
            .filter((a: any) => Number(a.teacher_id) === Number(user?.id))
            .map((a: any) => a.subject)
            .filter(Boolean);
          finalSubjects = preferGeneralSubjects(teacherSubjects);
        } catch {
          finalSubjects = preferGeneralSubjects(Array.from(subjectMap.values()));
        }
      } else {
        finalSubjects = preferGeneralSubjects(Array.from(subjectMap.values()));
      }

      setExams(Array.isArray(examRes.data?.exams?.data) ? examRes.data.exams.data : []);
      setClasses(Array.isArray(classRes.data) ? classRes.data : []);
      setSections(readList<SchoolSection>(sectionRes.data));
      setDepartments(departmentList);
      setSubjects(finalSubjects);
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

  useEffect(() => {
    void load();
  }, []);

  async function createExam(e: FormEvent) {
    e.preventDefault();
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

  async function addQuestion(e: FormEvent) {
    e.preventDefault();
    if (!selectedExamId) return showError("Select an exam first.");
    const plainQuestionText = questionForm.question_text.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    if (!plainQuestionText && !questionForm.question_text.includes("<img")) {
      return showError("Enter the question before saving.");
    }

    const usesOptions = objectiveTypes.includes(questionForm.question_type);
    const payload: any = {
      ...questionForm,
      section_id: questionForm.section_id ? Number(questionForm.section_id) : null,
      question_group_id: questionForm.question_group_id ? Number(questionForm.question_group_id) : null,
      marks: Number(questionForm.marks),
      options: usesOptions ? questionForm.options.filter((option) => option.option_text.trim()) : [],
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

  async function downloadOfflineBundle() {
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
    setSaving(true);
    try {
      const token = getToken?.() || "";
      const base = getApiBaseUrl().replace(/\/+$/, "");
      const directUrl = `${base}/public/cbt/offline/installer/download?token=${encodeURIComponent(token)}`;

      showSuccess("Downloading SchoolProfit Offline CBT Setup (106 MB)... Check your browser's download bar.");

      const a = document.createElement("a");
      a.href = directUrl;
      a.download = "SchoolProfitOfflineCBTSetup.exe";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      showError(e?.message || "Unable to start offline CBT download.");
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
  const draftCount = exams.filter((exam) => exam.status === "draft").length;
  const publishedCount = exams.filter((exam) => exam.status === "published").length;
  const scheduledCount = exams.filter((exam) => (exam.schedules || []).length > 0).length;
  const totalQuestions = exams.reduce((sum, exam) => sum + Number(exam.questions_count || 0), 0);
  const selectedSchedule = examDetail?.schedules?.[0] || null;
  const currentUser = getUser();
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
    if (!schedule?.exam_date) return "Set timetable";
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
          border-radius: 18px;
          padding: 32px 36px;
          display: grid;
          grid-template-columns: minmax(0,1fr) auto;
          gap: 24px;
          align-items: end;
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
          margin-bottom: 12px;
        }
        .cbt-hero h1 {
          font-weight: 800;
          margin: 4px 0 8px;
          font-size: 26px;
          color: #fff;
        }
        .cbt-hero p {
          margin: 0;
          color: #CBD5E1;
          max-width: 780px;
          line-height: 1.6;
          font-size: 13.5px;
        }
        .cbt-hero-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; position: relative; z-index: 1; }
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
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <span className="cbt-eyebrow"><i className="bi bi-pc-display-horizontal me-1" /> Online and Offline CBT</span>
                  <h1>Computer Based Tests</h1>
                  <p>Manage exam setup, scheduling, question banks, student access, and offline CBT licensing from one workspace.</p>
                </div>
                <div className="cbt-hero-actions">
                  <a className="cbt-btn cbt-soft" href={publicAccessUrl} target="_blank" rel="noreferrer"><i className="bi bi-box-arrow-up-right" /> Public Access</a>
                  <button className="cbt-btn cbt-soft" type="button" onClick={() => setManualOpen(true)}><i className="bi bi-question-circle" /> CBT Manual</button>
                  <button className="cbt-btn cbt-soft" type="button" disabled={saving} onClick={downloadOfflineInstaller}><i className="bi bi-windows" /> Download Offline App</button>
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
                        <label className="cbt-label">Exam title</label>
                        <input className="cbt-input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required placeholder="e.g. English Language CBT" />
                      </div>
                      <div className="cbt-field">
                        <label className="cbt-label">Class</label>
                        <select className="cbt-select" value={form.class_id} onChange={(e) => setForm((p) => ({ ...p, class_id: e.target.value }))}>
                          <option value="">All classes</option>
                          {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                      </div>
                      <div className="cbt-field">
                        <label className="cbt-label">Section</label>
                        <select className="cbt-select" value={form.section_id} onChange={(e) => setForm((p) => ({ ...p, section_id: e.target.value, subject_id: "" }))}>
                          <option value="">All sections</option>
                          {sections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                      </div>
                      <div className="cbt-field">
                        <label className="cbt-label">Department</label>
                        <select className="cbt-select" value={form.department_id} onChange={(e) => setForm((p) => ({ ...p, department_id: e.target.value, subject_id: "" }))}>
                          <option value="">General Department / Common Subjects</option>
                          {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                      </div>
                      <div className="cbt-field">
                        <label className="cbt-label">Subject</label>
                        <select className="cbt-select" value={form.subject_id} onChange={(e) => setForm((p) => ({ ...p, subject_id: e.target.value }))}>
                          <option value="">Select subject</option>
                          {createSubjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
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
                    </div>
                    <p className="cbt-help">If a timetable is set, students can only access this exam during this date and time.</p>

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
                      <span className="cbt-pill cbt-pill-neutral">{exams.length} total</span>
                    </div>
                    <div className="cbt-table-wrap">
                      <table className="cbt-table">
                        <thead><tr><th>Exam</th><th>Audience</th><th>Schedule</th><th>Access</th><th>Status</th><th>Questions</th><th>Actions</th></tr></thead>
                        <tbody>
                          {exams.length === 0 ? (
                            <tr><td colSpan={7} className="text-muted">No CBT exam has been created yet.</td></tr>
                          ) : exams.map((exam) => (
                            <tr key={exam.id}>
                              <td>
                                <div className="cbt-exam-name">
                                  <span className="cbt-exam-icon"><i className="bi bi-journal-check" /></span>
                                  <div>
                                    <div className="cbt-title cbt-title-lg">{exam.title}</div>
                                    <div className="cbt-sub">{exam.exam_code || `Exam #${exam.id}`} - {exam.duration_minutes} mins - {exam.delivery_mode}</div>
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
                                <option value="theory">Theory</option>
                              </select>
                            </div>
                          </div>

                          <label className="cbt-label">Question</label>
                          <CbtRichEditor
                            value={questionForm.question_text}
                            disabled={selectedIsPublished}
                            examId={selectedExamId}
                            placeholder="Type the question here. You can add tables and upload diagrams."
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
                        {questions.length === 0 ? <div className="cbt-empty">No questions yet. Add the first question above.</div> : questions.map((question, index) => (
                          <div className="cbt-question-card" key={question.id}>
                            <h3>{index + 1}.</h3>
                            <CbtHtml html={question.question_text} />
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
                          <label className="cbt-label">Class</label>
                          <select className="cbt-select" value={settingsForm.class_id} disabled={!examDetail || selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, class_id: e.target.value }))}>
                            <option value="">All classes</option>
                            {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                          </select>
                        </div>
                        <div className="cbt-field">
                          <label className="cbt-label">Section</label>
                          <select className="cbt-select" value={settingsForm.section_id} disabled={!examDetail || selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, section_id: e.target.value, subject_id: "" }))}>
                            <option value="">All sections</option>
                            {sections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                          </select>
                        </div>
                        <div className="cbt-field">
                          <label className="cbt-label">Department</label>
                          <select className="cbt-select" value={settingsForm.department_id} disabled={!examDetail || selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, department_id: e.target.value, subject_id: "" }))}>
                            <option value="">General Department / Common Subjects</option>
                            {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                          </select>
                        </div>
                        <div className="cbt-field">
                          <label className="cbt-label">Subject</label>
                          <select className="cbt-select" value={settingsForm.subject_id} disabled={!examDetail || selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, subject_id: e.target.value }))}>
                            <option value="">Select subject</option>
                            {settingsSubjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
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
              <div className="cbt-section-label">Basics</div>
              <div className="cbt-form-grid">
                <div className="cbt-field cbt-field-full">
                  <label className="cbt-label">Exam title</label>
                  <input className="cbt-input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required placeholder="e.g. English Language CBT" />
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">Class</label>
                  <select className="cbt-select" value={form.class_id} onChange={(e) => setForm((p) => ({ ...p, class_id: e.target.value }))}>
                    <option value="">All classes</option>
                    {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">Section</label>
                  <select className="cbt-select" value={form.section_id} onChange={(e) => setForm((p) => ({ ...p, section_id: e.target.value, subject_id: "" }))}>
                    <option value="">All sections</option>
                    {sections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">Department</label>
                  <select className="cbt-select" value={form.department_id} onChange={(e) => setForm((p) => ({ ...p, department_id: e.target.value, subject_id: "" }))}>
                    <option value="">General Department / Common Subjects</option>
                    {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div className="cbt-field">
                  <label className="cbt-label">Subject</label>
                  <select className="cbt-select" value={form.subject_id} onChange={(e) => setForm((p) => ({ ...p, subject_id: e.target.value }))}>
                    <option value="">Select subject</option>
                    {createSubjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
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
                <div className="cbt-field"><label className="cbt-label">Class</label><select className="cbt-select" value={settingsForm.class_id} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, class_id: e.target.value }))}><option value="">All classes</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                <div className="cbt-field"><label className="cbt-label">Section</label><select className="cbt-select" value={settingsForm.section_id} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, section_id: e.target.value, subject_id: "" }))}><option value="">All sections</option>{sections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                <div className="cbt-field"><label className="cbt-label">Department</label><select className="cbt-select" value={settingsForm.department_id} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, department_id: e.target.value, subject_id: "" }))}><option value="">General Department / Common Subjects</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                <div className="cbt-field"><label className="cbt-label">Subject</label><select className="cbt-select" value={settingsForm.subject_id} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, subject_id: e.target.value }))}><option value="">{settingsForm.department_id ? "Select subject" : "Select general subject"}</option>{settingsSubjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                <div className="cbt-field"><label className="cbt-label">Mode</label><select className="cbt-select" value={settingsForm.delivery_mode} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, delivery_mode: e.target.value as any }))}><option value="online">Online</option><option value="offline">Offline/LAN</option><option value="hybrid">Online and Offline</option></select></div>
                <div className="cbt-field"><label className="cbt-label">Duration</label><input className="cbt-input" type="number" min={1} value={settingsForm.duration_minutes} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))} /></div>
              </div>
              <div className="cbt-section-label">Timetable</div>
              <div className="cbt-form-grid">
                <div className="cbt-field"><label className="cbt-label">Exam date</label><input className="cbt-input" type="date" value={settingsForm.schedule.exam_date} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, schedule: { ...p.schedule, exam_date: e.target.value } }))} /></div>
                <div className="cbt-field"><label className="cbt-label">Venue</label><input className="cbt-input" value={settingsForm.schedule.venue} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, schedule: { ...p.schedule, venue: e.target.value } }))} /></div>
                <div className="cbt-field"><label className="cbt-label">Start time</label><input className="cbt-input" type="time" value={settingsForm.schedule.starts_at} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, schedule: { ...p.schedule, starts_at: e.target.value } }))} /></div>
                <div className="cbt-field"><label className="cbt-label">End time</label><input className="cbt-input" type="time" value={settingsForm.schedule.ends_at} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, schedule: { ...p.schedule, ends_at: e.target.value } }))} /></div>
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
              <div className="cbt-field"><label className="cbt-label">General instructions</label><textarea className="cbt-textarea" value={settingsForm.general_instructions} disabled={selectedIsPublished} onChange={(e) => setSettingsForm((p) => ({ ...p, general_instructions: e.target.value }))} /></div>
            </div>
            <div className="cbt-modal-head">
              <button className="cbt-btn cbt-soft" type="button" onClick={() => setSettingsModalOpen(false)}>Cancel</button>
              <button className="cbt-btn cbt-primary" disabled={saving || selectedIsPublished}><i className="bi bi-save" /> Save Settings</button>
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
              <div className="cbt-import-guide mb-3">
                <code><strong>1. Install</strong><br />Install the Windows offline CBT app on the server computer.</code>
                <code><strong>2. Package</strong><br />Download published offline/hybrid exams with the latest fee access snapshot.</code>
                <code><strong>3. Results</strong><br />Upload the completed result JSON exported from the offline server.</code>
              </div>
              <div className="alert alert-info mb-3">
                Download a fresh bundle close to exam time. The offline server uses the bundle snapshot to know which students are allowed to write.
              </div>

              <div className="cbt-work-actions">
                <button className="cbt-btn cbt-gold" type="button" disabled={saving} onClick={downloadOfflineInstaller}>
                  <i className="bi bi-windows" /> Download Windows App
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
                <button className="cbt-btn cbt-soft" type="button" disabled={saving} onClick={downloadOfflineInstaller}><i className="bi bi-windows" /> Download Offline App</button>
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

              {questions.length === 0 ? (
                <div className="cbt-empty">No questions have been added to this exam yet.</div>
              ) : questions.map((question, index) => (
                <div className="cbt-preview-question" key={`preview-${question.id}`}>
                  <h3>{index + 1}.</h3>
                  <CbtHtml html={question.question_text} />
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
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
