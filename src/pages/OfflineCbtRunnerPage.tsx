import { FormEvent, useEffect, useMemo, useState } from "react";
import PageTitle from "../components/PageTitle";
import CbtHtml from "../components/cbt/CbtHtml";

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
};

type Attempt = {
  offline_attempt_uuid: string;
  status: string;
  answers?: Answer[];
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
    throw new Error(payload?.message || "Offline CBT request failed.");
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
  const [message, setMessage] = useState("");
  const isServerConsole = ["localhost", "127.0.0.1"].includes(window.location.hostname) || window.location.search.includes("server=1");

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
    setBusy(true);
    try {
      const res = await apiFetch<{ student: Student; exams: ExamSummary[]; school?: { name?: string } }>("/offline-cbt/students/lookup", {
        method: "POST",
        body: JSON.stringify({ student_reg_no: regNo }),
      });
      setStudent(res.student);
      setExams(res.exams || []);
      setMessage("");
    } catch (err: any) {
      setStudent(null);
      setExams([]);
      setMessage(err.message || "Admission number was not found.");
    } finally {
      setBusy(false);
    }
  }

  async function lookupStudent(e: FormEvent) {
    e.preventDefault();
    await refreshStudentExams();
  }

  async function startExam(exam: ExamSummary) {
    if (!student) return;
    setBusy(true);
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
      setMessage("");
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
        : current.filter((id) => id !== optionId)
      : [optionId];

    void saveAnswer({
      question_id: activeQuestion.id,
      selected_option_ids: selected,
      answer_text: answers[activeQuestion.id]?.answer_text || null,
    });
  }

  function writeAnswer(value: string) {
    if (!activeQuestion) return;
    void saveAnswer({
      question_id: activeQuestion.id,
      selected_option_ids: answers[activeQuestion.id]?.selected_option_ids || [],
      answer_text: value,
    });
  }

  async function submitExam() {
    if (!attempt) return;
    const ok = window.confirm("Submit this CBT exam now?");
    if (!ok) return;

    setBusy(true);
    try {
      await apiFetch("/offline-cbt/attempts/" + attempt.offline_attempt_uuid + "/submit", { method: "POST" });
      setMessage("Exam submitted on the local server.");
      setAttempt(null);
      setExamPaper(null);
      setAnswers({});
      setActiveIndex(0);
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

  return (
    <>
      <PageTitle title="Offline CBT Server" />
      <style>{`
        .offline-cbt{min-height:100vh;background:#eef2f7;color:#0f172a;padding:24px}.offline-shell{max-width:1180px;margin:0 auto}.offline-hero{background:linear-gradient(135deg,#101827,#4a1240);color:#fff;border-radius:20px;padding:26px;display:flex;justify-content:space-between;gap:16px;align-items:flex-end}.offline-hero h1{font-size:clamp(30px,5vw,50px);font-weight:900;margin:0}.offline-hero p{margin:8px 0 0;color:rgba(255,255,255,.78);line-height:1.6}.offline-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 18px 44px rgba(15,23,42,.08);padding:18px}.offline-grid{display:grid;grid-template-columns:360px minmax(0,1fr);gap:16px;margin-top:16px}.offline-label{font-size:12px;text-transform:uppercase;font-weight:900;color:#475569;margin-bottom:6px}.offline-input{width:100%;border:1px solid #dbe3ef;border-radius:12px;padding:11px 12px;margin-bottom:12px;background:#fff}.offline-btn{border:0;border-radius:12px;padding:11px 15px;font-weight:900;background:var(--bs-primary,#d300b0);color:#fff;display:inline-flex;gap:8px;align-items:center;text-decoration:none}.offline-btn:disabled{opacity:.55}.offline-btn-soft{background:#f1f5f9;color:#0f172a}.offline-title{font-size:20px;font-weight:900;margin:0;color:#111827}.offline-sub{font-size:13px;color:#64748b;line-height:1.55}.offline-list{display:grid;gap:10px}.offline-pill{display:inline-flex;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900;background:#eef2ff;color:#3730a3}.offline-pill-danger{background:#fee2e2;color:#991b1b}.offline-meta{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.offline-alert{background:#fff7ed;border:1px solid #fed7aa;color:#7c2d12;border-radius:14px;padding:12px;margin-top:14px;font-weight:800}.offline-good{background:#ecfdf5;border-color:#bbf7d0;color:#065f46}.offline-danger{background:#fef2f2;border-color:#fecaca;color:#991b1b}.offline-kv{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}.offline-kv div{border:1px solid #e5e7eb;border-radius:12px;padding:10px;background:#f8fafc}.offline-kv strong{display:block;font-size:12px;text-transform:uppercase;color:#64748b}.offline-kv span{display:block;font-weight:900;color:#0f172a;margin-top:3px}.offline-paper{margin-top:16px;background:#fff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden}.offline-paper-head{padding:18px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;gap:12px}.offline-body{padding:18px 20px}.offline-group{background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin-bottom:14px}.offline-option{display:flex;gap:10px;border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-bottom:10px}.offline-textarea{width:100%;min-height:120px;border:1px solid #dbe3ef;border-radius:12px;padding:12px}.offline-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:12px}.cbt-html{line-height:1.6}.cbt-html table{width:100%;border-collapse:collapse;margin:10px 0}.cbt-html td,.cbt-html th{border:1px solid #cbd5e1;padding:8px}.cbt-html img{max-width:100%;height:auto;border-radius:10px;border:1px solid #e5e7eb}@media(max-width:900px){.offline-cbt{padding:14px}.offline-grid{grid-template-columns:1fr}.offline-hero,.offline-paper-head{flex-direction:column;align-items:flex-start}.offline-kv{grid-template-columns:1fr}}
      `}</style>

      <main className="offline-cbt">
        <div className="offline-shell">
          <section className="offline-hero">
            <div>
              <h1>{isServerConsole ? "Offline CBT Control Room" : "Student CBT Access"}</h1>
              <p>
                {isServerConsole
                  ? bundle?.school_name || "Upload the offline exam package on this server computer, then share the student link with devices on the same WiFi."
                  : bundle?.school_name || "Enter your admission number to load the exam assigned to you by your school."}
              </p>
            </div>
            {isServerConsole && <button className="offline-btn offline-btn-soft" type="button" disabled={!bundle || busy} onClick={exportResults}>Export Results</button>}
          </section>

          {message && <div className="offline-alert">{message}</div>}
          {loading && <div className="offline-alert">Checking local CBT server...</div>}

          {!examPaper && (
            <section className="offline-grid">
              <aside className="offline-card">
                <h2 className="offline-title">{isServerConsole ? "Server setup" : "Find your exam"}</h2>
                <p className="offline-sub">
                  {isServerConsole
                    ? "Upload the package once on this computer. Students should use the network link below on their own devices."
                    : "Ask your invigilator for the correct admission number if your exam does not appear."}
                </p>

                {isServerConsole && (
                  <>
                    <label className="offline-label">Import offline bundle</label>
                    <input className="offline-input" type="file" accept="application/json,.json" disabled={busy} onChange={importBundle} />
                  </>
                )}

                <div className="offline-meta">
                  <span className="offline-pill">{bundle?.exams_count || 0} exam(s)</span>
                  <span className="offline-pill">{bundle?.students_count || 0} student(s)</span>
                  <span className="offline-pill">{bundle?.eligible_students_count || 0} eligible</span>
                  {!!bundle?.blocked_students_count && <span className="offline-pill offline-pill-danger">{bundle.blocked_students_count} blocked</span>}
                  <span className="offline-pill">{attemptStats.submitted} submitted</span>
                  <span className="offline-pill">{attemptStats.in_progress} active</span>
                </div>

                {bundle && (
                  <>
                    <div className="offline-kv">
                      <div><strong>Generated</strong><span>{formatDateTime(bundle.generated_at)}</span></div>
                      <div><strong>Expires</strong><span>{formatDateTime(bundle.expires_at)}</span></div>
                    </div>
                    <div className={`offline-alert ${bundle.is_expired ? "offline-danger" : "offline-good"}`}>
                      {bundle.is_expired
                        ? "This package has expired. Import a fresh package before students continue."
                        : "Access rules were checked when this package was generated. If payments, classes or exam settings changed, download a fresh package from the main portal."}
                    </div>
                  </>
                )}

                {isServerConsole ? (
                  <div className="offline-alert offline-good">
                    <div className="offline-label">Student access link</div>
                    {(serverInfo?.student_urls || []).length > 0 ? (
                      (serverInfo?.student_urls || []).map((url) => (
                        <div key={url} style={{ wordBreak: "break-all", marginTop: 6 }}>
                          <strong>{url}</strong>
                        </div>
                      ))
                    ) : (
                      <div>Connect this computer to WiFi or hotspot to show the student access link.</div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={lookupStudent}>
                    <label className="offline-label">Admission number</label>
                    <input className="offline-input" value={studentRegNo} onChange={(e) => setStudentRegNo(e.target.value)} placeholder="Enter admission number" required />
                    <button className="offline-btn" type="submit" disabled={busy || !bundle}>{busy ? "Checking..." : "Find Student"}</button>
                  </form>
                )}
              </aside>

              <section className="offline-card">
                {isServerConsole ? (
                  <>
                    <h2 className="offline-title">{bundle ? "Package dashboard" : "No package imported"}</h2>
                    <p className="offline-sub">
                      {bundle
                        ? "This is what the local server currently has ready for student devices."
                        : "Download an offline CBT package from the main GradeQuest portal, then import it here."}
                    </p>
                    <div className="offline-kv">
                      <div><strong>School</strong><span>{bundle?.school_name || "Not set"}</span></div>
                      <div><strong>Exams</strong><span>{bundle?.exams_count || 0}</span></div>
                      <div><strong>Students</strong><span>{bundle?.students_count || 0}</span></div>
                      <div><strong>Eligible</strong><span>{bundle?.eligible_students_count || 0}</span></div>
                      <div><strong>Blocked</strong><span>{bundle?.blocked_students_count || 0}</span></div>
                      <div><strong>Submitted</strong><span>{attemptStats.submitted}</span></div>
                    </div>
                    <div className="offline-alert">
                      If a verified student sees no exam, check that the exam is published, set to Offline/Hybrid, assigned to the student class/section/department, scheduled for the right time, and that the student is not blocked by the fee access rule used when the package was generated.
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="offline-title">{student ? student.name : "Student exams"}</h2>
                    {student && <p className="offline-sub">{student.reg_no} - {student.class || "Class not set"}</p>}
                    <div className="offline-list">
                      {!student ? <p className="offline-sub mb-0">Enter your admission number to load your available exams.</p> : exams.length === 0 ? (
                        <p className="offline-sub mb-0">No exam is available for this student. Please call the invigilator.</p>
                      ) : exams.map((exam) => (
                        <article className="offline-card" key={exam.id}>
                          <h3 className="offline-title">{exam.title}</h3>
                          <p className="offline-sub">{exam.subject?.name || "Subject"} - {exam.class?.name || student.class || "Class"} - {exam.duration_minutes} minutes</p>
                          <div className="offline-meta">
                            <span className="offline-pill">{exam.questions_count || 0} question(s)</span>
                            <span className="offline-pill">{exam.is_open ? "Open now" : "Not scheduled now"}</span>
                            {exam.submitted && <span className="offline-pill">Submitted</span>}
                          </div>
                          <button className="offline-btn" type="button" disabled={busy || !exam.is_open || exam.submitted} onClick={() => startExam(exam)}>
                            {exam.submitted ? "Submitted" : "Start Exam"}
                          </button>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </section>
            </section>
          )}

          {examPaper && attempt && activeQuestion && (
            <section className="offline-paper">
              <div className="offline-paper-head">
                <div>
                  <h2 className="offline-title">{examPaper.title}</h2>
                  <p className="offline-sub mb-0">{student?.name} - Question {activeIndex + 1} of {questions.length}</p>
                </div>
                <div className="offline-actions">
                  <span className="offline-pill">{answeredCount}/{questions.length} answered</span>
                  <button className="offline-btn offline-btn-soft" type="button" disabled={busy} onClick={() => setExamPaper(null)}>Pause</button>
                  <button className="offline-btn" type="button" disabled={busy} onClick={submitExam}>Submit</button>
                </div>
              </div>

              <div className="offline-body">
                {examPaper.general_instructions && <div className="offline-alert">{examPaper.general_instructions}</div>}

                {activeGroup && (
                  <div className="offline-group">
                    <span className="offline-pill">{activeGroup.group_type || "Passage"}</span>
                    <h3 className="offline-title">{activeGroup.title || "Read and answer"}</h3>
                    {activeGroup.instructions && <CbtHtml html={activeGroup.instructions} />}
                    {activeGroup.passage && <CbtHtml html={activeGroup.passage} />}
                  </div>
                )}

                <CbtHtml html={activeQuestion.question_text} />
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
                      <strong>{String.fromCharCode(65 + index)}.</strong>
                      <CbtHtml html={option.option_text} />
                    </label>
                  ))
                ) : (
                  <textarea className="offline-textarea" value={answers[activeQuestion.id]?.answer_text || ""} onChange={(e) => writeAnswer(e.target.value)} placeholder="Type your answer here." />
                )}

                <div className="offline-actions">
                  <button className="offline-btn offline-btn-soft" disabled={activeIndex === 0 || busy} type="button" onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}>Previous</button>
                  {activeIndex >= questions.length - 1 ? (
                    <button className="offline-btn" type="button" disabled={busy} onClick={submitExam}>Submit Exam</button>
                  ) : (
                    <button className="offline-btn" type="button" disabled={busy} onClick={() => setActiveIndex((index) => Math.min(questions.length - 1, index + 1))}>Next</button>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
