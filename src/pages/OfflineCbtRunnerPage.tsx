import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageTitle from "../components/PageTitle";
import CbtHtml from "../components/cbt/CbtHtml";
import CbtNetworkStatus from "../components/cbt/CbtNetworkStatus";
import CbtRejectionNotice, { CbtRejection } from "../components/cbt/CbtRejectionNotice";
import { QRCodeSVG } from "qrcode.react";

type BundleSummary = {
  id: number;
  school_name?: string;
  license_key?: string;
  generated_at?: string;
  expires_at?: string;
  imported_at?: string;
  is_expired?: boolean;
  exams_count?: number;
  students_count?: number;
  eligible_students_count?: number;
  blocked_students_count?: number;
  fee_policy_snapshot?: {
    included?: boolean;
    generated_at?: string;
    valid_hours?: number;
    message?: string;
  } | null;
};

type ServerInfo = {
  host?: string;
  port?: number;
  local_url?: string;
  network_ips?: string[];
  student_urls?: string[];
};

type Student = {
  id: number;
  name: string;
  reg_no: string;
  class?: string;
  image?: string | null;
  profile_picture?: string | null;
  section?: string | null;
  department?: string | null;
};

type ExamSummary = {
  id: number;
  title: string;
  exam_code?: string;
  duration_minutes: number;
  calculator_enabled?: boolean;
  questions_count?: number;
  subject?: { name?: string } | null;
  class?: { name?: string } | null;
  is_open?: boolean;
  submitted?: boolean;
};

type Option = {
  id: number;
  label?: string;
  option_text: string;
};

type Question = {
  id: number;
  question_group_id?: number | null;
  question_type: string;
  question_text: string;
  instructions?: string | null;
  marks?: number;
  options?: Option[];
};

type QuestionGroup = {
  id: number;
  group_type?: string;
  title?: string | null;
  instructions?: string | null;
  passage?: string | null;
};

type ExamPaper = {
  id: number;
  title: string;
  exam_code?: string;
  duration_minutes: number;
  shuffle_options?: boolean;
  calculator_enabled?: boolean;
  general_instructions?: string | null;
  subject?: { name?: string } | null;
  class?: { name?: string } | null;
  question_groups?: QuestionGroup[];
  questions?: Question[];
  theory_section?: {
    enabled: boolean;
    instructions?: string;
    total_marks?: number;
    questions?: {
      id: number;
      question_type: string;
      question_text: string;
      instructions?: string;
      marks: number;
      diagram_url?: string | null;
    }[];
  };
};

type Attempt = {
  offline_attempt_uuid: string;
  status: string;
  answers?: Answer[];
  started_at?: string | null;
  submitted_at?: string | null;
};

type Answer = {
  question_id: number;
  selected_option_ids?: number[];
  answer_text?: string | null;
};

const apiRoot = (() => {
  const isOfflineRunner = window.location.pathname.includes("/cbt/offline-runner");
  if (isOfflineRunner) {
    return `${window.location.origin}/api`;
  }

  const envBase = import.meta.env.VITE_OFFLINE_CBT_API_URL || import.meta.env.VITE_API_URL;
  if (envBase) {
    const normalized = String(envBase).replace(/\/+$/, "");
    return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
  }

  const sameHostBackend = `${window.location.protocol}//${window.location.hostname}:8000`;
  return `${sameHostBackend}/api`;
})();

const scientificButtons = ["7", "8", "9", "/", "sin", "4", "5", "6", "*", "cos", "1", "2", "3", "-", "tan", "0", ".", "^", "+", "sqrt", "(", ")", "log", "ln", "C"];
const maxSecurityViolations = 3;

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${apiRoot}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const err: any = new Error(payload?.message || "Offline CBT request failed.");
    err.rejection = payload?.rejection;
    throw err;
  }

  return res.json();
}

function shuffled<T>(items: T[], enabled?: boolean) {
  if (!enabled) return items;
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatDateTime(value?: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString();
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function getStudentInitials(name?: string): string {
  if (!name) return "ST";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0]?.slice(0, 2) || "ST").toUpperCase();
}

const resolveStudentPhoto = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  const clean = url.replace(/^\/+/, "");
  return `${window.location.origin}/${clean}`;
};

export default function OfflineCbtRunnerPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bundle, setBundle] = useState<BundleSummary | null>(null);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [attemptStats, setAttemptStats] = useState({ in_progress: 0, submitted: 0 });
  const [studentRegNo, setStudentRegNo] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [examPaper, setExamPaper] = useState<ExamPaper | null>(null);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [activeIndex, setActiveIndex] = useState(0);

  const [activeSection, setActiveSection] = useState<"A" | "B">("A");
  const [completingSectionA, setCompletingSectionA] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [pendingExam, setPendingExam] = useState<ExamSummary | null>(null);
  const [securityWarning, setSecurityWarning] = useState("");
  const [securityViolations, setSecurityViolations] = useState(0);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calcValue, setCalcValue] = useState("");
  const [message, setMessage] = useState("");
  const [rejection, setRejection] = useState<CbtRejection | null>(null);
  const eventThrottleRef = useRef<Record<string, number>>({});
  const forcedSubmitRef = useRef(false);

  const searchParams = new URLSearchParams(window.location.search);
  const isStudentApp = searchParams.get("app") === "student";
  const isServerApp = !isStudentApp && (
    searchParams.get("app") === "server" ||
    searchParams.get("server") === "1" ||
    window.location.pathname.includes("/cbt/offline-server") ||
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
  );

  const [cloudUrl, setCloudUrl] = useState<string>("https://gradequestschool.com.ng");
  const [licenseKeyInput, setLicenseKeyInput] = useState<string>("");
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [cloudSyncLoading, setCloudSyncLoading] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showManualUpload, setShowManualUpload] = useState<boolean>(false);

  async function pullBundleFromCloud() {
    setCloudSyncLoading(true);
    setSyncFeedback(null);
    try {
      const res = await apiFetch<{ message: string; bundle: BundleSummary }>("/offline-cbt/cloud/pull-bundle", {
        method: "POST",
        body: JSON.stringify({
          cloud_url: cloudUrl.trim(),
          license_key: licenseKeyInput.trim() || undefined,
          admin_email: adminEmail.trim() || undefined,
          admin_password: adminPassword || undefined,
        }),
      });
      setBundle(res.bundle);
      setStudent(null);
      setExams([]);
      setAttempt(null);
      setExamPaper(null);
      setSyncFeedback({ type: "success", text: res.message || "Exam package successfully pulled from Cloud!" });
      await loadStatus();
    } catch (err: any) {
      setSyncFeedback({ type: "error", text: err.message || "Failed to pull exams from Cloud." });
    } finally {
      setCloudSyncLoading(false);
    }
  }

  async function pushResultsToCloud() {
    setCloudSyncLoading(true);
    setSyncFeedback(null);
    try {
      const res = await apiFetch<{ message: string; summary?: any }>("/offline-cbt/cloud/push-results", {
        method: "POST",
        body: JSON.stringify({
          cloud_url: cloudUrl.trim(),
          license_key: licenseKeyInput.trim() || undefined,
          admin_email: adminEmail.trim() || undefined,
          admin_password: adminPassword || undefined,
        }),
      });
      setSyncFeedback({ type: "success", text: res.message || "Exam results pushed to Cloud and recorded in report cards!" });
      await loadStatus();
    } catch (err: any) {
      setSyncFeedback({ type: "error", text: err.message || "Failed to push results to Cloud." });
    } finally {
      setCloudSyncLoading(false);
    }
  }

  const questions = examPaper?.questions || [];
  const activeQuestion = questions[activeIndex] || null;
  const activeGroup = activeQuestion?.question_group_id
    ? (examPaper?.question_groups || []).find((group) => group.id === activeQuestion.question_group_id)
    : null;
  const activeOptions = useMemo(
    () => shuffled(activeQuestion?.options || [], examPaper?.shuffle_options),
    [activeQuestion?.id, examPaper?.shuffle_options]
  );
  const answeredCount = Object.values(answers).filter((answer) =>
    Boolean((answer.selected_option_ids || []).length || answer.answer_text?.trim())
  ).length;
  const optionKeys = ["a", "b", "c", "d", "e", "f"];

  async function loadStatus() {
    setLoading(true);
    try {
      const res = await apiFetch<{ bundle: BundleSummary | null; server?: ServerInfo; attempts?: { in_progress: number; submitted: number } }>("/offline-cbt/status");
      setBundle(res.bundle || null);
      setServerInfo(res.server || null);
      setAttemptStats(res.attempts || { in_progress: 0, submitted: 0 });
    } catch (err: any) {
      setMessage(err.message || "Offline CBT server is not reachable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function importBundle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setRejection(null);
    try {
      const bundleJson = JSON.parse(await file.text());
      const res = await apiFetch<{ message: string; bundle: BundleSummary }>("/offline-cbt/bundle/import", {
        method: "POST",
        body: JSON.stringify({ bundle: bundleJson }),
      });
      setBundle(res.bundle);
      setStudent(null);
      setExams([]);
      setAttempt(null);
      setExamPaper(null);
      setMessage(res.message || "Bundle imported.");
      await loadStatus();
    } catch (err: any) {
      setMessage(err.message || "Unable to import offline CBT bundle.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function refreshStudentExams(regNo = studentRegNo) {
    if (!regNo.trim()) return;
    setBusy(true);
    setRejection(null);
    setMessage("");
    try {
      const res = await apiFetch<{ student: Student; exams: ExamSummary[]; rejection?: CbtRejection; school?: { name?: string } }>("/offline-cbt/students/lookup", {
        method: "POST",
        body: JSON.stringify({ student_reg_no: regNo.trim() }),
      });
      setStudent(res.student);
      setExams(res.exams || []);
      if (res.rejection) {
        setRejection(res.rejection);
      }
    } catch (err: any) {
      setStudent(null);
      setExams([]);
      if (err?.rejection) {
        setRejection(err.rejection);
      } else {
        setMessage(err.message || "Admission number was not found on this local CBT server. Please verify your registration number with the invigilator.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function lookupStudent(e: FormEvent) {
    e.preventDefault();
    await refreshStudentExams();
  }

  function handleResetStudent() {
    setStudent(null);
    setExams([]);
    setStudentRegNo("");
    setRejection(null);
    setMessage("");
  }

  async function startExam(exam: ExamSummary) {
    if (!student) return;
    setBusy(true);
    setRejection(null);
    try {
      const res = await apiFetch<{ attempt: Attempt; exam: ExamPaper; student: Student }>("/offline-cbt/exams/" + exam.id + "/start", {
        method: "POST",
        body: JSON.stringify({ student_id: student.id }),
      });
      setAttempt(res.attempt);
      setExamPaper(res.exam);
      setStudent(res.student);
      setAnswers(Object.fromEntries((res.attempt.answers || []).map((answer) => [answer.question_id, answer])));
      setActiveIndex(0);
      setActiveSection("A");
      setCalculatorOpen(false);
      setCalcValue("");
      setPendingExam(null);
      setConfirmingSubmit(false);
      setSecurityWarning("");
      setSecurityViolations(0);
      forcedSubmitRef.current = false;
      setMessage("");
      try {
        await document.documentElement.requestFullscreen?.();
      } catch {
        setSecurityWarning("Fullscreen could not open automatically. Please keep this exam window active.");
      }
    } catch (err: any) {
      setMessage(err.message || "Unable to start exam.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAnswer(answer: Answer) {
    if (!attempt) return;

    setAnswers((current) => ({ ...current, [answer.question_id]: answer }));
    try {
      const res = await apiFetch<{ attempt: Attempt }>("/offline-cbt/attempts/" + attempt.offline_attempt_uuid + "/answers", {
        method: "POST",
        body: JSON.stringify(answer),
      });
      setAttempt(res.attempt);
    } catch (err: any) {
      setMessage(err.message || "Unable to save answer on local server.");
    }
  }

  function chooseOption(optionId: number, checked: boolean) {
    if (!activeQuestion) return;
    const current = answers[activeQuestion.id]?.selected_option_ids || [];
    const selected = activeQuestion.question_type === "multiple_choice"
      ? checked
        ? Array.from(new Set([...current, optionId]))
        : current.filter((item) => item !== optionId)
      : checked
        ? [optionId]
        : [];

    void saveAnswer({
      question_id: activeQuestion.id,
      selected_option_ids: selected,
      answer_text: answers[activeQuestion.id]?.answer_text || null,
    });
  }

  async function completeSectionA() {
    if (!attempt) return;
    const ok = window.confirm("Finish Section A (Objective Questions) and proceed to Section B (Theory)? Your objective scores will be saved immediately on the offline server.");
    if (!ok) return;

    setCompletingSectionA(true);
    try {
      await apiFetch("/offline-cbt/attempts/" + attempt.offline_attempt_uuid + "/complete-objective", { method: "POST" });
      setMessage("Section A completed and scored! Now displaying Section B (Theory).");
      setActiveSection("B");
    } catch (e: any) {
      setMessage(e?.message || "Unable to complete Section A.");
    } finally {
      setCompletingSectionA(false);
    }
  }

  async function submitExam(force = false) {
    if (!attempt) return;
    if (!force && !confirmingSubmit) {
      setConfirmingSubmit(true);
      return;
    }

    setBusy(true);
    try {
      await apiFetch("/offline-cbt/attempts/" + attempt.offline_attempt_uuid + "/submit", { method: "POST" });
      setMessage("Exam submitted successfully on the local server.");
      setAttempt(null);
      setExamPaper(null);
      setAnswers({});
      setActiveIndex(0);
      setConfirmingSubmit(false);
      setCalculatorOpen(false);
      setCalcValue("");
      setSecurityWarning("");
      setSecurityViolations(0);
      forcedSubmitRef.current = true;
      if (document.fullscreenElement) {
        await document.exitFullscreen?.().catch(() => undefined);
      }
      await loadStatus();
      if (studentRegNo) {
        await refreshStudentExams(studentRegNo);
      }
    } catch (err: any) {
      setMessage(err.message || "Unable to submit exam.");
    } finally {
      setBusy(false);
    }
  }

  function exportResults() {
    window.location.href = `${apiRoot}/offline-cbt/results/export`;
  }

  const logSecurityEvent = useCallback(async (eventType: string, severity = "medium", metadata: Record<string, unknown> = {}) => {
    if (!attempt?.offline_attempt_uuid) return;

    const now = Date.now();
    const throttleKey = `${eventType}:${severity}`;
    if ((eventThrottleRef.current[throttleKey] || 0) + 5000 > now) return;
    eventThrottleRef.current[throttleKey] = now;

    await apiFetch(`/offline-cbt/attempts/${attempt.offline_attempt_uuid}/events`, {
      method: "POST",
      body: JSON.stringify({
        event_type: eventType,
        severity,
        metadata: {
          ...metadata,
          page_url: window.location.href,
          recorded_at: new Date().toISOString(),
        },
      }),
    }).catch(() => undefined);
  }, [attempt?.offline_attempt_uuid]);

  const recordViolation = useCallback((eventType: string, messageText: string, metadata: Record<string, unknown> = {}) => {
    if (!attempt?.offline_attempt_uuid || !examPaper || forcedSubmitRef.current) return;

    setSecurityWarning(messageText);
    setSecurityViolations((current) => {
      const next = current + 1;
      void logSecurityEvent(eventType, next >= maxSecurityViolations ? "high" : "medium", {
        ...metadata,
        warning_count: next,
        max_warning_count: maxSecurityViolations,
      });

      if (next >= maxSecurityViolations) {
        forcedSubmitRef.current = true;
        setSecurityWarning("Security limit reached. Your exam is being submitted automatically.");
        void submitExam(true);
      }

      return next;
    });
  }, [attempt?.offline_attempt_uuid, examPaper, logSecurityEvent]);

  function pressCalc(value: string) {
    if (value === "C") return setCalcValue("");
    setCalcValue((prev) => `${prev}${value}`);
  }

  function calculate() {
    try {
      const expression = calcValue
        .replace(/\^/g, "**")
        .replace(/sqrt/g, "Math.sqrt")
        .replace(/sin/g, "Math.sin")
        .replace(/cos/g, "Math.cos")
        .replace(/tan/g, "Math.tan")
        .replace(/log/g, "Math.log10")
        .replace(/ln/g, "Math.log");
      const result = Function(`"use strict"; return (${expression})`)();
      setCalcValue(Number.isFinite(result) ? String(Number(result.toFixed(8))) : "Error");
    } catch {
      setCalcValue("Error");
    }
  }

  useEffect(() => {
    if (!attempt?.started_at || !examPaper) {
      setRemainingSeconds(null);
      return;
    }

    const startedAt = new Date(attempt.started_at).getTime();
    if (Number.isNaN(startedAt)) {
      setRemainingSeconds(null);
      return;
    }

    const expiresAt = startedAt + Number(examPaper.duration_minutes || 60) * 60 * 1000;
    const updateTimer = () => {
      const secondsLeft = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(secondsLeft);
      if (secondsLeft <= 0 && !busy) {
        setConfirmingSubmit(true);
        void submitExam(true);
      }
    };

    updateTimer();
    const timerId = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timerId);
  }, [attempt?.started_at, examPaper?.id, examPaper?.duration_minutes, busy]);

  useEffect(() => {
    if (!examPaper || !activeQuestion) return;

    const blockAction = (event: Event, eventType: string, label: string, severity = "medium") => {
      event.preventDefault();
      recordViolation(eventType, `${label} is disabled during examination session.`, { action: eventType });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && ["c", "v", "x", "p", "s", "u"].includes(key)) {
        event.preventDefault();
        recordViolation("shortcut_blocked", "Keyboard shortcuts are restricted during examination.", { key });
        return;
      }

      if (event.key === "F12") {
        event.preventDefault();
        recordViolation("devtools_blocked", "Developer tools are restricted.", { key });
        return;
      }

      if (["single_choice", "multiple_choice", "true_false"].includes(activeQuestion.question_type)) {
        const optionIndex = optionKeys.indexOf(key);
        if (optionIndex >= 0 && optionIndex < activeOptions.length) {
          event.preventDefault();
          const target = activeOptions[optionIndex];
          const isSelected = (answers[activeQuestion.id]?.selected_option_ids || []).includes(target.id);
          chooseOption(target.id, !isSelected);
        }
      }

      if (key === "arrowright") {
        event.preventDefault();
        setActiveIndex((index) => Math.min(questions.length - 1, index + 1));
      }

      if (key === "arrowleft") {
        event.preventDefault();
        setActiveIndex((index) => Math.max(0, index - 1));
      }

      if (key === "s") {
        event.preventDefault();
        setConfirmingSubmit(true);
      }

      if (key === "enter" && confirmingSubmit) {
        event.preventDefault();
        void submitExam(true);
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        recordViolation("tab_or_window_left", "You left the exam window. This action has been recorded.");
      }
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        recordViolation("fullscreen_exit", "You exited fullscreen mode. This action has been recorded.");
      }
    };

    const onWindowBlur = () => {
      recordViolation("window_blur", "You left the exam window. This action has been recorded.");
    };
    const onCopy = (event: ClipboardEvent) => blockAction(event, "copy_blocked", "Copy");
    const onCut = (event: ClipboardEvent) => blockAction(event, "cut_blocked", "Cut");
    const onPaste = (event: ClipboardEvent) => blockAction(event, "paste_blocked", "Paste");
    const onContextMenu = (event: MouseEvent) => blockAction(event, "right_click_blocked", "Right click");

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [examPaper, activeQuestion, activeOptions, answers, questions.length, confirmingSubmit, logSecurityEvent, recordViolation]);

  return (
    <>
      <PageTitle
        title={
          isServerApp
            ? "GradeQuest Offline CBT"
            : student
            ? `${student.name} - GradeQuest Student CBT`
            : "GradeQuest Student CBT"
        }
      />

      <style>{`
        /* ========================================================
           PREMIUM STUDENT OFFLINE CBT PORTAL STYLES
           ======================================================== */
        @keyframes cbtFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes cbtPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.15); }
        }

        @keyframes cbtGlow {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-20px, 20px); }
        }

        .offline-portal-root {
          min-height: 100vh;
          background: #F8FAFC;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          color: #0F172A;
          display: flex;
          flex-direction: column;
        }

        /* Ambient Auth Wrapper (Single Column) */
        .cbt-auth-stage {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 18px;
          background: radial-gradient(circle at 10% 20%, #032B69 0%, #033987 40%, #081C38 90%);
          position: relative;
          overflow: hidden;
        }

        .cbt-ambient-glow-1 {
          position: absolute;
          top: -120px;
          right: -100px;
          width: 440px;
          height: 440px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(254, 198, 2, 0.18) 0%, transparent 70%);
          animation: cbtGlow 8s ease-in-out infinite;
          pointer-events: none;
        }

        .cbt-ambient-glow-2 {
          position: absolute;
          bottom: -140px;
          left: -80px;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(17, 153, 64, 0.22) 0%, transparent 70%);
          animation: cbtGlow 10s ease-in-out infinite reverse;
          pointer-events: none;
        }

        .cbt-auth-card {
          width: 100%;
          max-width: 460px;
          background: #FFFFFF;
          border-radius: 26px;
          box-shadow: 0 25px 65px -12px rgba(2, 27, 61, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.15);
          padding: 40px 36px;
          position: relative;
          z-index: 10;
          animation: cbtFadeIn 0.5s ease-out;
        }

        .cbt-brand-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: #EFF6FF;
          border: 1px solid #BFDBFE;
          color: #033987;
          border-radius: 999px;
          padding: 5px 13px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .05em;
          text-transform: uppercase;
          margin-bottom: 18px;
        }

        .cbt-pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #119940;
          animation: cbtPulse 2s infinite ease-in-out;
        }

        .cbt-auth-logo-badge {
          width: 58px;
          height: 58px;
          border-radius: 18px;
          background: linear-gradient(135deg, #033987 0%, #0A4FB3 100%);
          color: #FEC602;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          margin-bottom: 16px;
          box-shadow: 0 8px 20px -4px rgba(3, 57, 135, 0.35);
        }

        .cbt-auth-title {
          font-size: 24px;
          font-weight: 800;
          color: #0F172A;
          line-height: 1.25;
          margin-bottom: 6px;
        }

        .cbt-auth-sub {
          font-size: 13.5px;
          color: #64748B;
          line-height: 1.5;
          margin-bottom: 26px;
        }

        .cbt-input-label {
          display: block;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .05em;
          color: #334155;
          margin-bottom: 8px;
        }

        .cbt-input-field {
          width: 100%;
          height: 52px;
          border: 2px solid #E2E8F0;
          border-radius: 14px;
          padding: 0 16px;
          font-size: 16px;
          font-weight: 700;
          color: #0F172A;
          background: #F8FAFC;
          transition: all 0.2s ease;
          outline: none;
        }

        .cbt-input-field:focus {
          background: #FFFFFF;
          border-color: #033987;
          box-shadow: 0 0 0 4px rgba(3, 57, 135, 0.12);
        }

        .cbt-input-field::placeholder {
          color: #94A3B8;
          font-weight: 500;
          font-size: 14.5px;
        }

        .cbt-verify-btn {
          width: 100%;
          height: 54px;
          background: linear-gradient(135deg, #033987 0%, #0947A3 100%);
          color: #FFFFFF;
          border: none;
          border-radius: 14px;
          font-size: 15.5px;
          font-weight: 800;
          letter-spacing: .02em;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 10px 24px -6px rgba(3, 57, 135, 0.35);
          margin-top: 18px;
        }

        .cbt-verify-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 14px 28px -6px rgba(3, 57, 135, 0.45);
          background: linear-gradient(135deg, #022F70 0%, #0A4FB3 100%);
        }

        .cbt-verify-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .cbt-verify-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        /* Confirmation Page Styles */
        .cbt-confirm-page {
          max-width: 960px;
          margin: 0 auto;
          padding: 28px 20px 48px;
          width: 100%;
          animation: cbtFadeIn 0.45s ease-out;
        }

        .cbt-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: #FFFFFF;
          border-radius: 18px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.03);
          margin-bottom: 22px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .cbt-student-hero-card {
          background: #FFFFFF;
          border-radius: 22px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
          padding: 26px 30px;
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
        }

        .cbt-student-hero-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
          background: linear-gradient(90deg, #033987 0%, #119940 50%, #FEC602 100%);
        }

        .cbt-avatar {
          width: 76px;
          height: 76px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          font-weight: 800;
          color: #FFFFFF;
          background: linear-gradient(135deg, #033987 0%, #119940 100%);
          box-shadow: 0 8px 18px -4px rgba(3, 57, 135, 0.3);
          flex-shrink: 0;
        }

        .cbt-exam-card {
          background: #FFFFFF;
          border-radius: 20px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
          padding: 24px;
          transition: all 0.25s ease;
          margin-bottom: 16px;
        }

        .cbt-exam-card:hover {
          border-color: #93C5FD;
          box-shadow: 0 10px 28px -6px rgba(3, 57, 135, 0.12);
        }

        .cbt-exam-card.selected {
          border-color: #033987;
          background: #F8FAFC;
          box-shadow: 0 0 0 2px #033987;
        }

        .cbt-badge-sub {
          background: #EFF6FF;
          color: #1E40AF;
          border: 1px solid #DBEAFE;
          border-radius: 999px;
          padding: 4px 11px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .cbt-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #F1F5F9;
          color: #475569;
          border-radius: 10px;
          padding: 6px 12px;
          font-size: 12.5px;
          font-weight: 700;
        }

        .cbt-chip i {
          font-size: 14px;
          color: #033987;
        }

        .cbt-rules-box {
          background: #F8FAFC;
          border: 1px dashed #CBD5E1;
          border-radius: 18px;
          padding: 20px 24px;
          margin-top: 24px;
        }

        .cbt-rules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
          margin-top: 14px;
        }

        .cbt-rule-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 12.5px;
          color: #475569;
          line-height: 1.5;
        }

        .cbt-rule-item i {
          color: #033987;
          font-size: 16px;
          flex-shrink: 0;
          margin-top: 1px;
        }

        /* Server Console Mode Styles */
        .cbt-console-wrap {
          max-width: 1100px;
          margin: 0 auto;
          padding: 24px;
        }

        /* Existing Examination Engine & Question Paper Styles (PRESERVED) */
        .offline-paper{margin-top:16px;background:#fff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden}.offline-paper-head{padding:18px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;position:sticky;top:0;background:#fff;z-index:20}.offline-timer{background:#111827;color:#fff;border-radius:14px;padding:10px 14px;text-align:center;min-width:120px}.offline-timer span{display:block;font-size:11px;text-transform:uppercase;color:#cbd5e1;font-weight:900}.offline-timer strong{display:block;font-size:22px;line-height:1.1}.offline-timer.danger{background:#991b1b}.offline-body{display:grid;grid-template-columns:250px minmax(0,1fr);gap:0;padding:0}.offline-nav{background:#f8fafc;border-right:1px solid #e5e7eb;padding:16px}.offline-nav-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.offline-qnav{height:38px;border:1px solid #dbe3ef;border-radius:10px;background:#fff;color:#475569;font-weight:900}.offline-qnav.active{background:#111827;color:#fff}.offline-qnav.done{border-color:#22c55e;color:#166534;background:#ecfdf5}.offline-content{padding:18px 20px;min-width:0}.offline-shortcuts{background:#f8fafc;border:1px solid #dbe3ef;color:#334155;border-radius:14px;padding:12px;margin-bottom:14px;font-size:13px}.offline-rules{margin:14px 0 0;padding-left:20px;color:#334155;line-height:1.65}.offline-rules li{margin-bottom:7px}.offline-group{background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin-bottom:14px}.offline-option{display:flex;gap:10px;border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-bottom:10px}.offline-option:has(input:checked){border-color:#033987;background:#eff6ff}.offline-textarea{width:100%;min-height:120px;border:1px solid #dbe3ef;border-radius:12px;padding:12px}.offline-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:12px}.offline-calc{position:fixed;right:24px;bottom:24px;z-index:40;width:min(340px,calc(100vw - 48px));background:#111827;color:#fff;border-radius:18px;padding:14px;box-shadow:0 24px 70px rgba(15,23,42,.34)}.offline-calc input{width:100%;border:0;border-radius:12px;padding:12px;background:#020617;color:#fff;font-size:22px;text-align:right;margin-bottom:10px}.offline-calc-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.offline-calc button{border:0;border-radius:10px;padding:10px 6px;background:#334155;color:#fff;font-weight:900}.offline-confirm{position:fixed;inset:0;background:rgba(15,23,42,.65);backdrop-filter:blur(4px);z-index:1050;display:flex;align-items:center;justify-content:center;padding:18px}.offline-confirm-card{width:min(560px,100%);background:#fff;border-radius:22px;padding:28px;box-shadow:0 24px 80px rgba(15,23,42,.35)}.cbt-html{line-height:1.6}.cbt-html table{width:100%;border-collapse:collapse;margin:10px 0}.cbt-html td,.cbt-html th{border:1px solid #cbd5e1;padding:8px}.cbt-html img{max-width:100%;height:auto;border-radius:10px;border:1px solid #e5e7eb}
        .offline-pill{display:inline-flex;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:900;background:#eef2ff;color:#1e40af}.offline-pill-danger{background:#fee2e2;color:#991b1b}
        .offline-btn{border:0;border-radius:12px;padding:11px 18px;font-weight:800;background:#033987;color:#fff;display:inline-flex;gap:8px;align-items:center;text-decoration:none;cursor:pointer;transition:all 0.2s}.offline-btn:hover{background:#0A4FB3;color:#fff}.offline-btn-soft{background:#f1f5f9;color:#0f172a;border:1px solid #cbd5e1}.offline-btn-soft:hover{background:#e2e8f0}
        .offline-alert{background:#fff7ed;border:1px solid #fed7aa;color:#7c2d12;border-radius:14px;padding:14px;margin:14px 0;font-weight:600}
        .offline-good{background:#ecfdf5;border-color:#bbf7d0;color:#065f46}
        .offline-danger{background:#fef2f2;border-color:#fecaca;color:#991b1b}
        .offline-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 8px 24px rgba(15,23,42,.06);padding:20px}
        .offline-kv{display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;margin:14px 0}.offline-kv div{border:1px solid #e5e7eb;border-radius:12px;padding:10px;background:#f8fafc}.offline-kv strong{display:block;font-size:11.5px;text-transform:uppercase;color:#64748b}.offline-kv span{display:block;font-weight:900;color:#0f172a;margin-top:2px}
        .offline-label{font-size:11.5px;text-transform:uppercase;font-weight:800;color:#475569;margin-bottom:6px}.offline-input{width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:9px 12px;margin-bottom:10px;background:#fff}

        @media(max-width:768px){
          .cbt-auth-card{padding:28px 20px}
          .cbt-student-hero-card{padding:20px 16px}
          .offline-body{grid-template-columns:1fr}
          .offline-nav{border-right:0;border-bottom:1px solid #e5e7eb}
          .offline-paper-head{flex-direction:column;align-items:flex-start}
        }
      `}</style>

      <div className="offline-portal-root">
        {/* Network Connectivity Status Monitor */}
        <CbtNetworkStatus
          pingUrl={`${apiRoot}/offline-cbt/ping`}
          serverLabel={isServerApp ? "Local Server Engine" : "Local CBT Server"}
          isHostServer={isServerApp}
        />

        {/* ========================================================
            VIEW 1: IN-PROGRESS EXAMINATION ENGINE (100% PRESERVED)
           ======================================================== */}
        {examPaper && attempt && activeQuestion ? (
          <div style={{ maxWidth: 1180, margin: "0 auto", width: "100%", padding: "16px 14px" }}>
            <section className="offline-paper">
              <div className="offline-paper-head">
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#0F2744" }}>{examPaper.title}</h2>
                  <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 13 }}>
                    {student?.name} • Question {activeIndex + 1} of {questions.length}
                  </p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    <span className="offline-pill">{student?.reg_no || "Admission No"}</span>
                    <span className="offline-pill">{examPaper.subject?.name || "Subject"}</span>
                    <span className="offline-pill">{examPaper.class?.name || student?.class || "Class"}</span>
                  </div>
                </div>

                <div className="offline-actions">
                  <span className="offline-pill" style={{ background: "#DCFCE7", color: "#166534" }}>
                    {answeredCount}/{questions.length} answered
                  </span>
                  {securityViolations > 0 && (
                    <span className="offline-pill offline-pill-danger">
                      {securityViolations}/{maxSecurityViolations} warning(s)
                    </span>
                  )}
                  <div className={`offline-timer ${(remainingSeconds ?? 9999) <= 300 ? "danger" : ""}`}>
                    <span>Time left</span>
                    <strong>{remainingSeconds === null ? "--:--" : formatTime(remainingSeconds)}</strong>
                  </div>
                  {examPaper.calculator_enabled && (
                    <button className="offline-btn offline-btn-soft" type="button" onClick={() => setCalculatorOpen((value) => !value)}>
                      <i className="bi bi-calculator me-1" /> Calculator
                    </button>
                  )}
                  <button className="offline-btn offline-btn-soft" type="button" disabled={busy} onClick={() => setExamPaper(null)}>
                    Pause
                  </button>
                  {examPaper.theory_section?.enabled && (examPaper.theory_section.questions || []).length > 0 ? (
                    activeSection === "A" ? (
                      <button className="offline-btn" style={{ background: "#4338CA", color: "#fff" }} type="button" disabled={completingSectionA} onClick={completeSectionA}>
                        {completingSectionA ? "Saving..." : "Go to Section B (Theory) ➔"}
                      </button>
                    ) : (
                      <button className="offline-btn" style={{ background: "#119940", color: "#fff" }} type="button" disabled={busy} onClick={() => submitExam()}>
                        Submit Exam
                      </button>
                    )
                  ) : (
                    <button className="offline-btn" style={{ background: "#119940", color: "#fff" }} type="button" disabled={busy} onClick={() => submitExam()}>
                      Submit Exam
                    </button>
                  )}
                </div>
              </div>

              {examPaper.theory_section?.enabled && (examPaper.theory_section.questions || []).length > 0 && (
                <div className="px-4 pt-3 d-flex gap-2 border-bottom pb-2 bg-light">
                  <button
                    type="button"
                    className={`btn btn-sm ${activeSection === "A" ? "btn-primary fw-bold" : "btn-light border"}`}
                    onClick={() => setActiveSection("A")}
                  >
                    Section A: Objective ({questions.length} Qs)
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeSection === "B" ? "btn-primary fw-bold" : "btn-light border"}`}
                    onClick={() => setActiveSection("B")}
                  >
                    Section B: Theory ({(examPaper.theory_section.questions || []).length} Qs)
                  </button>
                </div>
              )}

              {activeSection === "A" && (
                <div className="offline-body">
                  <div className="offline-nav">
                    <div className="offline-label">Questions</div>
                    <div className="offline-nav-grid">
                      {questions.map((question, index) => {
                        const answer = answers[question.id];
                        const done = Boolean((answer?.selected_option_ids || []).length || answer?.answer_text?.trim());
                        return (
                          <button
                            key={question.id}
                            type="button"
                            className={`offline-qnav ${index === activeIndex ? "active" : ""} ${done ? "done" : ""}`}
                            onClick={() => setActiveIndex(index)}
                            title={done ? `Question ${index + 1} answered` : `Question ${index + 1} unanswered`}
                          >
                            {index + 1}
                          </button>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: 12, color: "#64748B", marginTop: 12, lineHeight: 1.4 }}>
                      Green numbers are answered. Dark number is your active question.
                    </p>
                  </div>

                  <div className="offline-content">
                    <div className="offline-shortcuts">
                      <strong>Shortcuts:</strong> A-F choose option, arrow keys move between questions, S opens submit confirmation, Enter confirms submission.
                    </div>
                    {securityWarning && <div className="offline-alert offline-danger">{securityWarning}</div>}
                    {examPaper.general_instructions && <div className="offline-alert">{examPaper.general_instructions}</div>}

                    {activeGroup && (
                      <div className="offline-group">
                        <span className="offline-pill">{activeGroup.group_type || "Passage"}</span>
                        <h3 style={{ fontSize: 16, fontWeight: 800, margin: "8px 0", color: "#0F2744" }}>{activeGroup.title || "Read and answer"}</h3>
                        {activeGroup.instructions && <CbtHtml html={activeGroup.instructions} />}
                        {activeGroup.passage && <CbtHtml html={activeGroup.passage} />}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                      <span className="offline-pill" style={{ background: "#EFF6FF", color: "#1D4ED8" }}>Question {activeIndex + 1}</span>
                      <span className="offline-pill">{activeQuestion.marks || 1} mark(s)</span>
                    </div>

                    <div style={{ fontSize: 16, color: "#0F172A", lineHeight: 1.6, marginBottom: 16 }}>
                      <CbtHtml html={activeQuestion.question_text} />
                    </div>
                    {activeQuestion.instructions && <CbtHtml html={activeQuestion.instructions} />}

                    {["single_choice", "multiple_choice", "true_false"].includes(activeQuestion.question_type) ? (
                      activeOptions.map((option, index) => (
                        <label className="offline-option" key={option.id}>
                          <input
                            type={activeQuestion.question_type === "multiple_choice" ? "checkbox" : "radio"}
                            name={`question-${activeQuestion.id}`}
                            checked={(answers[activeQuestion.id]?.selected_option_ids || []).includes(option.id)}
                            onChange={(e) => chooseOption(option.id, e.target.checked)}
                          />
                          <strong style={{ minWidth: 24 }}>{String.fromCharCode(65 + index)}.</strong>
                          <div style={{ flex: 1 }}>
                            <CbtHtml html={option.option_text} />
                          </div>
                        </label>
                      ))
                    ) : (
                      <textarea
                        className="offline-textarea"
                        placeholder="Type your response here..."
                        value={answers[activeQuestion.id]?.answer_text || ""}
                        onChange={(e) =>
                          saveAnswer({
                            question_id: activeQuestion.id,
                            answer_text: e.target.value,
                            selected_option_ids: answers[activeQuestion.id]?.selected_option_ids || [],
                          })
                        }
                      />
                    )}

                    <div className="d-flex align-items-center justify-content-between mt-4 pt-3 border-top">
                      <button
                        className="offline-btn offline-btn-soft"
                        type="button"
                        disabled={activeIndex === 0}
                        onClick={() => setActiveIndex((idx) => Math.max(0, idx - 1))}
                      >
                        <i className="bi bi-arrow-left" /> Previous Question
                      </button>
                      <button
                        className="offline-btn"
                        type="button"
                        disabled={activeIndex >= questions.length - 1}
                        onClick={() => setActiveIndex((idx) => Math.min(questions.length - 1, idx + 1))}
                      >
                        Next Question <i className="bi bi-arrow-right" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "B" && examPaper.theory_section && (
                <div className="p-4 bg-white">
                  <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
                    <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                      <span className="badge bg-primary" style={{ fontSize: 13, padding: "6px 12px" }}>SECTION B: THEORY / ESSAY QUESTIONS</span>
                      <span className="text-muted fw-bold" style={{ fontSize: 13 }}>
                        {(examPaper.theory_section.questions || []).length} Question(s) | {examPaper.theory_section.total_marks || 0} Marks
                      </span>
                    </div>
                    <div className="alert alert-warning mb-0" style={{ fontSize: 13.5, borderLeft: "4px solid #D97706" }}>
                      <strong>📝 Paper-and-Pen Instructions:</strong> Read each question below carefully. Write your answers with a pen on your official paper answer sheet provided by your examination supervisor. <u>Do not type or attempt to enter answers on your computer screen.</u>
                    </div>
                  </div>

                  {examPaper.theory_section.instructions && (
                    <div className="offline-alert mb-4">
                      <strong>Section Instructions:</strong>
                      <p className="mb-0 mt-1">{examPaper.theory_section.instructions}</p>
                    </div>
                  )}

                  <div className="d-flex flex-column gap-4">
                    {(examPaper.theory_section.questions || []).map((q, idx) => (
                      <div key={q.id} className="p-4 bg-white rounded border shadow-sm" style={{ borderColor: "#E2E8F0" }}>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h4 style={{ fontWeight: 800, color: "#0F2744", margin: 0 }}>Question {idx + 1}</h4>
                          <span className="offline-pill" style={{ background: "#FEF3C7", color: "#92400E", fontWeight: 700 }}>
                            {q.marks} Mark{q.marks === 1 ? "" : "s"}
                          </span>
                        </div>

                        <div className="mb-3" style={{ fontSize: 15, lineHeight: 1.7, color: "#0F2744" }}>
                          <CbtHtml html={q.question_text} />
                        </div>

                        {q.diagram_url && (
                          <div className="my-3 p-3 bg-light rounded text-center border">
                            <img
                              src={q.diagram_url}
                              alt={`Diagram for Question ${idx + 1}`}
                              style={{ maxHeight: 350, maxWidth: "100%", objectFit: "contain", borderRadius: 8 }}
                            />
                            <p className="text-muted small mt-2 mb-0">Figure / Diagram for Question {idx + 1}</p>
                          </div>
                        )}

                        {q.instructions && (
                          <div className="text-muted small mt-2">
                            <em>Note: {q.instructions}</em>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-top d-flex justify-content-between align-items-center">
                    <button className="offline-btn offline-btn-soft" type="button" onClick={() => setActiveSection("A")}>
                      <i className="bi bi-arrow-left me-1" /> View Section A (Objective)
                    </button>
                    <button className="offline-btn" style={{ background: "#119940" }} type="button" disabled={busy} onClick={() => submitExam()}>
                      {busy ? "Submitting..." : "Finish & Submit Exam"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : isServerApp ? (
          /* ========================================================
             VIEW 2: OFFLINE CBT SERVER APPLICATION
             ======================================================== */
          <div className="cbt-console-wrap">
            <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
              <div>
                <h1 className="h3 fw-bold mb-1">GradeQuest Offline CBT</h1>
                <p className="text-muted mb-0">Host management console for packages, Wi-Fi connections, and cloud synchronization.</p>
              </div>
            </div>

            {/* Cloud Sync Section */}
            <div className="offline-card mb-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="fw-bold fs-6 text-dark"><i className="bi bi-cloud-arrow-down-fill text-primary me-2" />Cloud Direct Synchronization</div>
                <span className="badge bg-primary">LAN Direct</span>
              </div>
              <p className="text-muted small mb-3">
                Pull offline exam packages from SchoolProfit cloud or sync completed student results back to update report cards with 1 click.
              </p>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="offline-label">Cloud Server URL</label>
                  <input className="offline-input" value={cloudUrl} onChange={(e) => setCloudUrl(e.target.value)} placeholder="https://gradequestschool.com.ng" />
                </div>
                <div className="col-md-6">
                  <label className="offline-label">License Key</label>
                  <input className="offline-input" value={licenseKeyInput} onChange={(e) => setLicenseKeyInput(e.target.value)} placeholder="e.g. GQ-OFF-XXXX-XXXX" />
                </div>
              </div>

              {syncFeedback && (
                <div className={`offline-alert ${syncFeedback.type === "success" ? "offline-good" : "offline-danger"} mb-3`}>
                  {syncFeedback.text}
                </div>
              )}

              <div className="d-flex gap-2 flex-wrap">
                <button className="offline-btn" type="button" disabled={cloudSyncLoading || busy} onClick={pullBundleFromCloud}>
                  {cloudSyncLoading ? "Syncing..." : "📥 Pull Exams Package"}
                </button>
                <button
                  className="offline-btn offline-btn-soft"
                  type="button"
                  disabled={cloudSyncLoading || busy || attemptStats.submitted === 0}
                  onClick={pushResultsToCloud}
                >
                  {cloudSyncLoading ? "Pushing..." : "📤 Push Results to Cloud"}
                </button>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowManualUpload(!showManualUpload)}>
                  {showManualUpload ? "Hide File Upload" : "📁 USB File Import/Export"}
                </button>
              </div>

              {showManualUpload && (
                <div className="mt-3 p-3 bg-light rounded border">
                  <label className="offline-label">Import Offline JSON File</label>
                  <input className="offline-input" type="file" accept="application/json,.json" disabled={busy} onChange={importBundle} />
                  <button className="btn btn-secondary btn-sm" disabled={!bundle || busy} onClick={exportResults}>
                    Export Results JSON
                  </button>
                </div>
              )}
            </div>

            {/* Package Metadata */}
            <div className="offline-card mb-4">
              <h2 className="fs-5 fw-bold text-dark mb-1">{bundle ? bundle.school_name || "Active Package" : "No Package Loaded"}</h2>
              <div className="offline-kv">
                <div><strong>Exams</strong><span>{bundle?.exams_count || 0}</span></div>
                <div><strong>Total Students</strong><span>{bundle?.students_count || 0}</span></div>
                <div><strong>Eligible</strong><span>{bundle?.eligible_students_count || 0}</span></div>
                <div><strong>Submitted</strong><span>{attemptStats.submitted}</span></div>
                <div><strong>Active Writing</strong><span>{attemptStats.in_progress}</span></div>
                <div><strong>Expires</strong><span>{formatDateTime(bundle?.expires_at)}</span></div>
              </div>
            </div>

            {/* QR Code & Student URLs */}
            <div className="offline-card">
              <h3 className="fs-6 fw-bold text-dark mb-2">Student Lab Access Links</h3>
              {(serverInfo?.student_urls || []).length > 0 ? (
                <div>
                  <div className="d-flex justify-content-center py-3 bg-light rounded border mb-3">
                    <QRCodeSVG
                      value={(serverInfo?.student_urls || [])[0] || serverInfo?.local_url || window.location.href}
                      size={140}
                      level="M"
                      includeMargin
                    />
                  </div>
                  <div className="text-center text-success small mb-3">
                    Students can scan this QR code or navigate to the IP address below from their computers:
                  </div>
                  {(serverInfo?.student_urls || []).map((url) => (
                    <div key={url} className="p-2 bg-light rounded border mb-2 font-monospace fw-bold text-primary">
                      {url}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted small">Connect this computer to the exam Wi-Fi or hotspot to display client connection URLs.</p>
              )}
            </div>
          </div>
        ) : student ? (
          /* ========================================================
             VIEW 3: STUDENT EXAMINATION CONFIRMATION DASHBOARD
             (Step 4: After Successful Verification)
             ======================================================== */
          <div className="cbt-confirm-page">
            {/* Top Bar */}
            <div className="cbt-top-bar">
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-primary text-white" style={{ background: "#033987", fontSize: 12 }}>
                  GradeQuest Student CBT
                </span>
                <span className="text-muted small fw-bold">
                  {bundle?.school_name || "Examination Center"}
                </span>
              </div>
              <button
                className="btn btn-outline-danger btn-sm fw-bold rounded-pill px-3"
                type="button"
                onClick={handleResetStudent}
              >
                <i className="bi bi-box-arrow-right me-1" /> Switch Student / Exit
              </button>
            </div>

            {/* Student Identity Verification Card */}
            <div className="cbt-student-hero-card">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div className="d-flex align-items-center gap-3">
                  {/* Avatar or Photo */}
                  {student.image || student.profile_picture ? (
                    <img
                      src={resolveStudentPhoto(student.image || student.profile_picture)}
                      alt={student.name}
                      className="cbt-avatar"
                      style={{ objectFit: "cover" }}
                      onError={(e) => {
                        // Fallback to initials if image fails
                        (e.target as HTMLElement).style.display = "none";
                        const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="cbt-avatar"
                    style={{
                      display: student.image || student.profile_picture ? "none" : "flex",
                    }}
                  >
                    {getStudentInitials(student.name)}
                  </div>

                  <div>
                    <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle rounded-pill px-2 py-0.5 mb-1" style={{ fontSize: 10, fontWeight: 800 }}>
                      VERIFIED CANDIDATE
                    </span>
                    <h2 className="fs-4 fw-black text-dark mb-1" style={{ letterSpacing: "-0.02em" }}>
                      {student.name}
                    </h2>
                    <div className="d-flex align-items-center gap-2 flex-wrap text-muted small mt-1">
                      <span className="cbt-chip"><i className="bi bi-person-badge" /> Reg: <strong>{student.reg_no}</strong></span>
                      <span className="cbt-chip"><i className="bi bi-mortarboard" /> Class: <strong>{student.class || "General"}</strong></span>
                      {student.section && (
                        <span className="cbt-chip"><i className="bi bi-bookmark" /> Section: <strong>{student.section}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-end d-none d-md-block">
                  <span className="badge bg-success text-white py-2 px-3 rounded-pill fw-bold" style={{ fontSize: 12 }}>
                    <i className="bi bi-check-circle-fill me-1" /> Eligible for Examination
                  </span>
                </div>
              </div>
            </div>

            {/* Rejection / Restriction Notice */}
            {rejection && (
              <div className="mb-4">
                <CbtRejectionNotice rejection={rejection} onRetry={() => refreshStudentExams()} />
              </div>
            )}

            {/* Examination Selection Section */}
            <div className="mb-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h3 className="fs-5 fw-bold text-dark mb-0">Assigned Examinations</h3>
                  <p className="text-muted small mb-0">Select your examination scheduled for this testing session.</p>
                </div>
                <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-3 py-1 fw-bold">
                  {exams.length} Exam{exams.length === 1 ? "" : "s"} Available
                </span>
              </div>

              {exams.length === 0 ? (
                <div className="offline-card text-center py-5">
                  <div className="w-12 h-12 rounded-circle bg-light d-inline-flex align-items-center justify-content-center text-muted fs-3 mb-2">
                    <i className="bi bi-calendar-x" />
                  </div>
                  <h4 className="fs-6 fw-bold text-dark">No Examinations Currently Scheduled</h4>
                  <p className="text-muted small mb-3" style={{ maxWidth: 440, margin: "0 auto" }}>
                    There are no active or published CBT examinations configured for your class (<strong>{student.class || "your level"}</strong>) right now.
                  </p>
                  <p className="small text-secondary mb-0">
                    If your class is writing an exam right now, please alert your invigilator.
                  </p>
                </div>
              ) : (
                exams.map((exam) => (
                  <div
                    key={exam.id}
                    className={`cbt-exam-card ${pendingExam?.id === exam.id ? "selected" : ""}`}
                  >
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <span className="cbt-badge-sub">
                            {exam.subject?.name || "Subject"}
                          </span>
                          {exam.exam_code && (
                            <span className="badge bg-light text-muted border" style={{ fontSize: 11 }}>
                              {exam.exam_code}
                            </span>
                          )}
                        </div>
                        <h4 className="fs-5 fw-bold text-dark mb-2">{exam.title}</h4>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <span className="cbt-chip"><i className="bi bi-clock" /> {exam.duration_minutes} Minutes</span>
                          <span className="cbt-chip"><i className="bi bi-question-circle" /> {exam.questions_count || 0} Questions</span>
                          {exam.calculator_enabled && (
                            <span className="cbt-chip"><i className="bi bi-calculator" /> Calculator Allowed</span>
                          )}
                          {exam.submitted ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                              ✓ Already Submitted
                            </span>
                          ) : exam.is_open ? (
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                              🟢 Ready to Start
                            </span>
                          ) : (
                            <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1">
                              ⏳ Not Open
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        {exam.submitted ? (
                          <button className="btn btn-secondary rounded-pill px-4 py-2 fw-bold" disabled>
                            <i className="bi bi-check2-all me-1" /> Completed
                          </button>
                        ) : !exam.is_open ? (
                          <button className="btn btn-light border rounded-pill px-4 py-2 fw-bold text-muted" disabled>
                            <i className="bi bi-lock me-1" /> Not Scheduled Now
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary rounded-pill px-4 py-2 fw-bold shadow-sm"
                            style={{ background: "#033987", borderColor: "#033987", fontSize: 14.5 }}
                            type="button"
                            disabled={busy}
                            onClick={() => setPendingExam(exam)}
                          >
                            Start Examination <i className="bi bi-arrow-right ms-1" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Examination Rules & Instructions Card */}
            <div className="cbt-rules-box">
              <div className="d-flex align-items-center gap-2 text-dark fw-bold fs-6">
                <i className="bi bi-info-circle-fill text-primary fs-5" /> Examination Instructions & Conduct
              </div>
              <div className="cbt-rules-grid">
                <div className="cbt-rule-item">
                  <i className="bi bi-stopwatch text-primary" />
                  <div><strong>Continuous Timer:</strong> Once started, your exam timer runs continuously without pause.</div>
                </div>
                <div className="cbt-rule-item">
                  <i className="bi bi-cloud-check text-success" />
                  <div><strong>Instant Offline Saving:</strong> Every answer you select is saved to the local server in real-time.</div>
                </div>
                <div className="cbt-rule-item">
                  <i className="bi bi-shield-exclamation text-danger" />
                  <div><strong>Strict Security:</strong> Stay in fullscreen mode. Switching tabs or windows triggers recorded warnings.</div>
                </div>
                <div className="cbt-rule-item">
                  <i className="bi bi-check2-circle text-primary" />
                  <div><strong>Final Submission:</strong> Review your questions and click Submit Exam before your time expires.</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================
             VIEW 4: STUDENT AUTHENTICATION PAGE
             (Step 1 & 2: Single-Column Modern Login Layout)
             ======================================================== */
          <div className="cbt-auth-stage">
            <div className="cbt-ambient-glow-1" />
            <div className="cbt-ambient-glow-2" />

            <div className="cbt-auth-card">
              {/* Badge */}
              <div className="text-center">
                <div className="cbt-brand-pill">
                  <span className="cbt-pulse-dot" /> GradeQuest Student CBT
                </div>
              </div>

              {/* Icon & Identity */}
              <div className="text-center d-flex flex-column align-items-center">
                <div className="cbt-auth-logo-badge">
                  <i className="bi bi-mortarboard-fill" />
                </div>
                <h1 className="cbt-auth-title">Student Sign-In</h1>
                <p className="cbt-auth-sub">
                  {bundle?.school_name
                    ? `${bundle.school_name}`
                    : "Enter your admission number to verify eligibility and load your exams."}
                </p>
              </div>

              {/* Alert Feedback */}
              {message && (
                <div className="offline-alert offline-danger" style={{ marginTop: 0, marginBottom: 18, fontSize: 13 }}>
                  <i className="bi bi-exclamation-triangle-fill me-1" /> {message}
                </div>
              )}

              {rejection && (
                <div style={{ marginBottom: 18 }}>
                  <CbtRejectionNotice rejection={rejection} onRetry={() => refreshStudentExams()} />
                </div>
              )}

              {/* Single Column Form */}
              <form onSubmit={lookupStudent}>
                <div className="mb-3">
                  <label className="cbt-input-label">
                    Registration / Admission Number
                  </label>
                  <input
                    className="cbt-input-field"
                    value={studentRegNo}
                    onChange={(e) => {
                      setStudentRegNo(e.target.value);
                      if (message) setMessage("");
                    }}
                    placeholder="e.g. 2024/JSS1/042 or 703963"
                    required
                    autoFocus
                    disabled={busy}
                  />
                </div>

                <button
                  className="cbt-verify-btn"
                  type="submit"
                  disabled={busy || !studentRegNo.trim()}
                >
                  {busy ? (
                    <>
                      <div className="spinner-border spinner-border-sm text-light" role="status" />
                      <span>Verifying Student Records...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Student</span>
                      <i className="bi bi-arrow-right-circle fs-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Guidance Footer */}
              <div className="mt-4 pt-3 border-top text-center text-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
                <i className="bi bi-wifi text-success me-1" />
                Connected to examination room local server.
                <div className="text-secondary mt-1">
                  Need help? If your admission number is not found, raise your hand for the invigilator.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scientific Calculator Floating Modal */}
        {calculatorOpen && examPaper?.calculator_enabled && (
          <div className="offline-calc">
            <input value={calcValue} onChange={(e) => setCalcValue(e.target.value)} placeholder="0" />
            <div className="offline-calc-grid">
              {scientificButtons.map((button) => (
                <button key={button} type="button" onClick={() => pressCalc(button)}>{button}</button>
              ))}
              <button type="button" onClick={() => setCalcValue((value) => value.slice(0, -1))}>DEL</button>
              <button type="button" onClick={calculate}>=</button>
            </div>
          </div>
        )}

        {/* ========================================================
            EXAMINATION START CONFIRMATION MODAL
           ======================================================== */}
        {pendingExam && (
          <div className="offline-confirm" role="dialog" aria-modal="true">
            <div className="offline-confirm-card">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="badge bg-primary" style={{ background: "#033987", fontSize: 12 }}>
                  {pendingExam.subject?.name || "Subject"}
                </span>
                <span className="text-muted small fw-bold">
                  Duration: {pendingExam.duration_minutes} Minutes
                </span>
              </div>
              <h2 className="fs-4 fw-bold text-dark mb-1">{pendingExam.title}</h2>
              <p className="text-muted small mb-3">
                Candidate: <strong>{student?.name}</strong> ({student?.reg_no})
              </p>

              <div className="p-3 bg-light rounded border mb-4" style={{ fontSize: 13, lineHeight: 1.6, color: "#334155" }}>
                <strong>Important Examination Rules:</strong>
                <ul className="mb-0 mt-2 ps-3">
                  <li>The examination will launch in full-screen mode.</li>
                  <li>Your countdown timer begins immediately upon clicking start.</li>
                  <li>Do not switch tabs, minimize the window, or exit full screen.</li>
                  <li>All answers are saved automatically on the local offline server.</li>
                </ul>
              </div>

              <div className="d-flex align-items-center justify-content-end gap-2">
                <button
                  className="btn btn-light border rounded-pill px-4 py-2 fw-bold text-secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => setPendingExam(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary rounded-pill px-4 py-2 fw-bold shadow-sm"
                  style={{ background: "#033987", borderColor: "#033987" }}
                  type="button"
                  disabled={busy}
                  onClick={() => startExam(pendingExam)}
                >
                  {busy ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" /> Starting Exam...
                    </>
                  ) : (
                    <>
                      I Understand, Start Exam Now <i className="bi bi-arrow-right ms-1" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Submit Confirmation Modal */}
        {confirmingSubmit && examPaper && (
          <div className="offline-confirm" role="dialog" aria-modal="true">
            <div className="offline-confirm-card">
              <h2 className="fs-4 fw-bold text-dark mb-2">Submit Examination?</h2>
              <p className="text-muted small mb-3">
                You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> question(s).
                Are you sure you want to finish and submit your answers to the offline CBT server?
              </p>
              <div className="d-flex align-items-center justify-content-end gap-2">
                <button
                  className="btn btn-light border rounded-pill px-4 py-2 fw-bold text-secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmingSubmit(false)}
                >
                  Continue Writing
                </button>
                <button
                  className="btn btn-danger rounded-pill px-4 py-2 fw-bold shadow-sm"
                  type="button"
                  disabled={busy}
                  onClick={() => submitExam(true)}
                >
                  {busy ? "Submitting..." : "Yes, Submit Exam"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
