import { useEffect, useMemo, useState } from "react";
import PageTitle from "../../../components/PageTitle";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import { getUser } from "../../../utils/token";
import { resolveMediaUrl } from "../../../utils/apiUrl";

type TemplateKey = "classic_academic" | "modern_scholar" | "premium_letterhead" | "custom_builder";

type TemplateOption = {
  key: TemplateKey;
  name: string;
  description: string;
};

type DisplayOptions = {
  show_position: boolean;
  show_grade: boolean;
  show_remarks: boolean;
  show_attendance: boolean;
  show_domains: boolean;
  show_qr_code: boolean;
  show_signature: boolean;
  show_student_photo: boolean;
  show_watermark: boolean;
  report_column_rules: ReportColumnRule[];
  custom_report_layout: CustomReportLayout;
};

type CustomReportBlock = {
  id: string;
  label: string;
  type: string;
  width: "full" | "half";
  visible: boolean;
};

type CustomReportLayout = {
  enabled: boolean;
  blocks: CustomReportBlock[];
};

type ReportColumnOptions = {
  show_position: boolean;
  show_grade: boolean;
  show_remarks: boolean;
  show_first_term: boolean;
  show_second_term: boolean;
  show_cumulative_total: boolean;
  show_cumulative_average: boolean;
};

type ReportColumnRule = {
  id: string;
  section_id: number | "all";
  section_name: string;
  term: string;
  columns: ReportColumnOptions;
};

type SectionOption = {
  id: number;
  name: string;
};

type TermOption = {
  id?: number;
  name: string;
};

type TemplateSetting = {
  template_key: TemplateKey;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  font_family: string;
  display_options: DisplayOptions;
};

const defaultOptions: DisplayOptions = {
  show_position: true,
  show_grade: true,
  show_remarks: true,
  show_attendance: true,
  show_domains: true,
  show_qr_code: true,
  show_signature: true,
  show_student_photo: true,
  show_watermark: true,
  report_column_rules: [],
  custom_report_layout: {
    enabled: false,
    blocks: [
      { id: "student_info", label: "Student Information", type: "student_info", width: "full", visible: true },
      { id: "scores_table", label: "Subject Scores", type: "scores_table", width: "full", visible: true },
      { id: "performance_chart", label: "Performance Chart", type: "performance_chart", width: "half", visible: true },
      { id: "domains", label: "Affective and Psychomotor", type: "domains", width: "half", visible: true },
      { id: "comments", label: "Comments and Remarks", type: "comments", width: "full", visible: true },
      { id: "signature", label: "Signature and QR Code", type: "signature", width: "full", visible: true },
    ],
  },
};

const defaultReportColumnOptions: ReportColumnOptions = {
  show_position: true,
  show_grade: true,
  show_remarks: true,
  show_first_term: false,
  show_second_term: false,
  show_cumulative_total: false,
  show_cumulative_average: false,
};

const fallbackTemplates: TemplateOption[] = [
  {
    key: "custom_builder",
    name: "Custom Builder",
    description: "Arrange report-card blocks with a simple drag-and-drop builder.",
  },
  {
    key: "classic_academic",
    name: "Classic Academic",
    description: "Formal report card with strong borders and a traditional school feel.",
  },
  {
    key: "modern_scholar",
    name: "Modern Scholar",
    description: "Clean colorful layout with soft sections and easier scanning.",
  },
  {
    key: "premium_letterhead",
    name: "Premium Letterhead",
    description: "Elegant certificate-style result with school branding emphasis.",
  },
];

const sampleSubjects = [
  ["Mathematics", 18, 16, 54, 88, "A", "Excellent"],
  ["English Language", 15, 14, 50, 79, "B", "Very Good"],
  ["Basic Science", 17, 15, 52, 84, "A", "Excellent"],
  ["Civic Education", 14, 13, 45, 72, "B", "Good"],
  ["Social Studies", 16, 14, 48, 78, "B", "Very Good"],
  ["Business Studies", 15, 15, 46, 76, "B", "Very Good"],
  ["Computer Studies", 19, 17, 56, 92, "A", "Outstanding"],
  ["Agricultural Science", 13, 14, 44, 71, "B", "Good"],
  ["Home Economics", 14, 15, 43, 72, "B", "Good"],
  ["Christian Religious Studies", 17, 16, 50, 83, "A", "Excellent"],
  ["Yoruba Language", 12, 13, 42, 67, "C", "Credit"],
  ["French", 11, 14, 39, 64, "C", "Credit"],
  ["Physical & Health Education", 18, 18, 51, 87, "A", "Excellent"],
  ["Creative Arts", 16, 17, 49, 82, "A", "Excellent"],
  ["Security Education", 15, 16, 47, 78, "B", "Very Good"],
];

const sampleAffective = [
  ["Punctuality", "Excellent"],
  ["Attentiveness", "Very Good"],
  ["Neatness", "Excellent"],
  ["Politeness", "Very Good"],
  ["Self Control", "Good"],
];

const samplePsychomotor = [
  ["Handwriting", "Very Good"],
  ["Verbal Fluency", "Excellent"],
  ["Sports", "Good"],
  ["Drawing", "Very Good"],
  ["Craft", "Excellent"],
];

const ratingScore: Record<string, number> = {
  Outstanding: 100,
  Excellent: 92,
  "Very Good": 82,
  Good: 72,
  Credit: 62,
  Fair: 52,
};

const chartColors = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];
const analyticColors = ["#0f766e", "#9333ea", "#ea580c", "#0284c7"];

function readableText(bg: string) {
  const hex = bg.replace("#", "");
  if (hex.length !== 6) return "#fff";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 145 ? "#111827" : "#ffffff";
}

function templateClass(key: string) {
  if (key === "custom_builder") return "rts-preview--custom";
  if (key === "modern_scholar") return "rts-preview--modern";
  if (key === "premium_letterhead") return "rts-preview--premium";
  return "rts-preview--classic";
}

function normalizeTerm(term: string) {
  return (term || "all").trim().toLowerCase();
}

function normalizeRule(rule: any): ReportColumnRule {
  return {
    id: String(rule?.id || `rule_${Date.now()}_${Math.random().toString(16).slice(2)}`),
    section_id: rule?.section_id && rule.section_id !== "all" ? Number(rule.section_id) : "all",
    section_name: rule?.section_name || "All sections",
    term: rule?.term || "all",
    columns: { ...defaultReportColumnOptions, ...(rule?.columns || {}) },
  };
}

function ruleScore(rule: ReportColumnRule, sectionId: number | "all", term: string) {
  const sectionMatches = rule.section_id === "all" || Number(rule.section_id) === Number(sectionId);
  const termMatches = normalizeTerm(rule.term) === "all" || normalizeTerm(rule.term) === normalizeTerm(term);
  if (!sectionMatches || !termMatches) return -1;
  return (rule.section_id === "all" ? 0 : 2) + (normalizeTerm(rule.term) === "all" ? 0 : 1);
}

function resolveReportColumns(rules: ReportColumnRule[], sectionId: number | "all", term: string) {
  const matched = [...rules]
    .map((rule) => ({ rule, score: ruleScore(rule, sectionId, term) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => a.score - b.score);

  return matched.reduce(
    (columns, item) => ({ ...columns, ...item.rule.columns }),
    { ...defaultReportColumnOptions }
  );
}

function extractList<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.terms)) return payload.terms;
  return [];
}

function normalizeCustomLayout(raw: any): CustomReportLayout {
  const fallback = defaultOptions.custom_report_layout;
  return {
    enabled: Boolean(raw?.enabled),
    blocks: extractList<CustomReportBlock>(raw?.blocks).length
      ? extractList<CustomReportBlock>(raw.blocks).map((block) => ({
          id: String(block.id),
          label: String(block.label || "Report Block"),
          type: String(block.type || "custom"),
          width: block.width === "half" ? "half" : "full",
          visible: block.visible !== false,
        }))
      : fallback.blocks,
  };
}

export default function ResultTemplateSettingsPage() {
  const { showSuccess, showError } = useToast();
  const adminUser = getUser();
  const schoolLogo = resolveMediaUrl(adminUser?.school?.logo, "/media/logo/schoolprofit-logo.svg");
  const schoolName = adminUser?.school?.name || "SchoolProfit International School";
  const studentAvatar = resolveMediaUrl("2411221407avatar-2.png", "/media/profile.jpg");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<TemplateOption[]>(fallbackTemplates);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [previewSectionId, setPreviewSectionId] = useState<number | "all">("all");
  const [previewTerm, setPreviewTerm] = useState("Third Term");
  const [setting, setSetting] = useState<TemplateSetting>({
    template_key: "classic_academic",
    primary_color: "#0f3d7a",
    secondary_color: "#c9a84c",
    background_color: "#ffffff",
    font_family: "Arial",
    display_options: defaultOptions,
  });

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.key === setting.template_key) || templates[0],
    [templates, setting.template_key]
  );

  const activeReportColumns = useMemo(
    () => resolveReportColumns(setting.display_options.report_column_rules || [], previewSectionId, previewTerm),
    [setting.display_options.report_column_rules, previewSectionId, previewTerm]
  );

  const selectedSectionName = useMemo(() => {
    if (previewSectionId === "all") return "JSS 2 Gold";
    return sections.find((section) => Number(section.id) === Number(previewSectionId))?.name || "Selected Section";
  }, [previewSectionId, sections]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.allSettled([
      authApi.get("/result-template-settings"),
      authApi.get("/sections"),
      authApi.get("/get-terms"),
    ])
      .then(([settingsRes, sectionsRes, termsRes]) => {
        if (!mounted) return;

        if (settingsRes.status === "fulfilled") {
          const res = settingsRes.value;
          setTemplates(Array.isArray(res.data.templates) ? res.data.templates : fallbackTemplates);
          const displayOptions = res.data.setting?.display_options || {};
          setSetting({
            template_key: res.data.setting?.template_key || "classic_academic",
            primary_color: res.data.setting?.primary_color || "#0f3d7a",
            secondary_color: res.data.setting?.secondary_color || "#c9a84c",
            background_color: res.data.setting?.background_color || "#ffffff",
            font_family: res.data.setting?.font_family || "Arial",
              display_options: {
              ...defaultOptions,
              ...displayOptions,
              report_column_rules: extractList(displayOptions.report_column_rules).map(normalizeRule),
              custom_report_layout: normalizeCustomLayout(displayOptions.custom_report_layout),
            },
          });
        } else {
          throw settingsRes.reason;
        }

        if (sectionsRes.status === "fulfilled") {
          setSections(extractList<SectionOption>(sectionsRes.value.data));
        }

        if (termsRes.status === "fulfilled") {
          const termList = extractList<TermOption>(termsRes.value.data).filter((term) => term?.name);
          setTerms(termList);
          setPreviewTerm((current) => current || termList[0]?.name || "Third Term");
        }
      })
      .catch((err) => {
        console.error(err);
        showError(err?.response?.data?.message || "Unable to load result design settings.");
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [showError]);

  const updateOption = (key: keyof DisplayOptions) => {
    setSetting((current) => ({
      ...current,
      display_options: {
        ...current.display_options,
        [key]: !current.display_options[key],
      },
    }));
  };

  const updateColumnRule = (ruleId: string, changes: Partial<ReportColumnRule>) => {
    setSetting((current) => ({
      ...current,
      display_options: {
        ...current.display_options,
        report_column_rules: current.display_options.report_column_rules.map((rule) =>
          rule.id === ruleId ? { ...rule, ...changes, columns: { ...rule.columns, ...(changes.columns || {}) } } : rule
        ),
      },
    }));
  };

  const addColumnRule = () => {
    const section = previewSectionId === "all"
      ? null
      : sections.find((item) => Number(item.id) === Number(previewSectionId));
    const newRule: ReportColumnRule = {
      id: `rule_${Date.now()}`,
      section_id: previewSectionId,
      section_name: section?.name || "All sections",
      term: previewTerm || "all",
      columns: {
        ...defaultReportColumnOptions,
        show_first_term: normalizeTerm(previewTerm).includes("third"),
        show_second_term: normalizeTerm(previewTerm).includes("third"),
        show_cumulative_total: normalizeTerm(previewTerm).includes("third"),
        show_cumulative_average: normalizeTerm(previewTerm).includes("third"),
      },
    };

    setSetting((current) => ({
      ...current,
      display_options: {
        ...current.display_options,
        report_column_rules: [...(current.display_options.report_column_rules || []), newRule],
      },
    }));
  };

  const removeColumnRule = (ruleId: string) => {
    setSetting((current) => ({
      ...current,
      display_options: {
        ...current.display_options,
        report_column_rules: current.display_options.report_column_rules.filter((rule) => rule.id !== ruleId),
      },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await authApi.put("/result-template-settings", setting);
      const displayOptions = res.data.setting?.display_options || setting.display_options;
      setSetting({
        ...setting,
        ...(res.data.setting || {}),
        display_options: {
          ...defaultOptions,
          ...displayOptions,
          report_column_rules: extractList(displayOptions.report_column_rules).map(normalizeRule),
          custom_report_layout: normalizeCustomLayout(displayOptions.custom_report_layout),
        },
      });
      showSuccess(res.data.message || "Result design saved successfully.");
    } catch (err: any) {
      console.error(err);
      showError(err?.response?.data?.message || "Unable to save result design.");
    } finally {
      setSaving(false);
    }
  };

  const previewVars = {
    "--rts-primary": setting.primary_color,
    "--rts-secondary": setting.secondary_color,
    "--rts-bg": setting.background_color,
    "--rts-text": readableText(setting.primary_color),
    fontFamily: setting.font_family,
  } as React.CSSProperties;
  const showPreviewPosition = setting.display_options.show_position && activeReportColumns.show_position;
  const showPreviewGrade = setting.display_options.show_grade && activeReportColumns.show_grade;
  const showPreviewRemarks = setting.display_options.show_remarks && activeReportColumns.show_remarks;
  const customBlocks = setting.template_key === "custom_builder"
    ? setting.display_options.custom_report_layout.blocks.filter((block) => block.visible)
    : [];

  const moveCustomBlock = (from: number, to: number) => {
    setSetting((current) => {
      const blocks = [...current.display_options.custom_report_layout.blocks];
      const [item] = blocks.splice(from, 1);
      if (!item) return current;
      blocks.splice(Math.max(0, Math.min(to, blocks.length)), 0, item);
      return {
        ...current,
        display_options: {
          ...current.display_options,
          custom_report_layout: { ...current.display_options.custom_report_layout, enabled: true, blocks },
        },
      };
    });
  };

  const updateCustomBlock = (id: string, changes: Partial<CustomReportBlock>) => {
    setSetting((current) => ({
      ...current,
      display_options: {
        ...current.display_options,
        custom_report_layout: {
          ...current.display_options.custom_report_layout,
          enabled: true,
          blocks: current.display_options.custom_report_layout.blocks.map((block) =>
            block.id === id ? { ...block, ...changes } : block
          ),
        },
      },
    }));
  };

  const studentInfoPreview = (
    <div className="rts-info">
      <div><b>Name:</b> Amina Bello Grace</div>
      <div><b>Admission No:</b> GQ872114</div>
      <div><b>Class:</b> {selectedSectionName}</div>
      <div><b>Session:</b> 2026/2027</div>
      {setting.display_options.show_attendance && <div><b>Present:</b> 68 of 72 days</div>}
      {showPreviewPosition && <div><b>Position:</b> 2nd of 35</div>}
    </div>
  );

  const scoresTablePreview = (
    <>
      <table className="rts-table">
        <thead>
          <tr>
            <th>Subject</th><th>CA1</th><th>CA2</th><th>Exam</th><th>Total</th>
            {activeReportColumns.show_first_term && <th>First Term</th>}
            {activeReportColumns.show_second_term && <th>Second Term</th>}
            {activeReportColumns.show_cumulative_total && <th>Total Score</th>}
            {activeReportColumns.show_cumulative_average && <th>Average</th>}
            {showPreviewGrade && <th>Grade</th>}
            {showPreviewRemarks && <th>Remark</th>}
          </tr>
        </thead>
        <tbody>
          {sampleSubjects.map((row) => (
            <tr key={row[0]}>
              <td>{row[0]}</td><td>{row[1]}</td><td>{row[2]}</td><td>{row[3]}</td><td>{row[4]}</td>
              {activeReportColumns.show_first_term && <td>{Math.max(40, Number(row[4]) - 6)}</td>}
              {activeReportColumns.show_second_term && <td>{Math.max(40, Number(row[4]) - 2)}</td>}
              {activeReportColumns.show_cumulative_total && <td>{Number(row[4]) + Math.max(40, Number(row[4]) - 6) + Math.max(40, Number(row[4]) - 2)}</td>}
              {activeReportColumns.show_cumulative_average && <td>{Math.round((Number(row[4]) + Math.max(40, Number(row[4]) - 6) + Math.max(40, Number(row[4]) - 2)) / 3)}</td>}
              {showPreviewGrade && <td>{row[5]}</td>}
              {showPreviewRemarks && <td>{row[6]}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="rts-summary">
        <span className="rts-chip">Average: 80.75%</span>
        {showPreviewGrade && <span className="rts-chip">Grade: A</span>}
        <span className="rts-chip">Status: Excellent</span>
      </div>
    </>
  );

  const performancePreview = (
    <div className="rts-analytics">
      <div className="rts-analytics-card">
        <div className="rts-analytics-title">Subject performance</div>
        {sampleSubjects.slice(0, 6).map((row, index) => (
          <div className="rts-bar-row" key={row[0]}>
            <span>{row[0]}</span>
            <span className="rts-bar-track">
              <span
                className="rts-bar-fill"
                style={{ width: `${row[4]}%`, background: chartColors[index % chartColors.length] }}
              />
            </span>
            <b>{row[4]}%</b>
          </div>
        ))}
      </div>
      <div className="rts-analytics-card">
        <div className="rts-analytics-title">Result analytics</div>
        {[
          ["A grades", 6, 40],
          ["B grades", 6, 40],
          ["C grades", 3, 20],
          ["Attendance", 68, 94],
        ].map(([label, value, percent], index) => (
          <div className="rts-bar-row" key={label as string}>
            <span>{label}</span>
            <span className="rts-bar-track">
              <span
                className="rts-bar-fill"
                style={{ width: `${percent}%`, background: analyticColors[index % analyticColors.length] }}
              />
            </span>
            <b>{value}</b>
          </div>
        ))}
      </div>
    </div>
  );

  const domainsPreview = (
    <div className="rts-domain-grid">
      <table className="rts-domain-table">
        <caption>Affective Domain</caption>
        <tbody>
          {sampleAffective.map(([label, rating]) => (
            <tr key={label}>
              <td>{label}</td>
              <td>{rating}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="rts-domain-table">
        <caption>Psychomotor Skills</caption>
        <tbody>
          {samplePsychomotor.map(([label, rating]) => (
            <tr key={label}>
              <td>{label}</td>
              <td>{rating}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const remarksPreview = setting.display_options.show_remarks ? (
    <div className="rts-remarks">
      Teacher: Amina is focused and consistent. Principal: Excellent performance. Keep it up.
    </div>
  ) : null;

  const signaturePreview = (
    <div className="rts-foot">
      {setting.display_options.show_signature ? (
        <>
          <span className="rts-signature">
            <img src="/media/result/default-signature.svg" alt="Principal signature" />
            <span style={{ display: "block", marginTop: 4 }}>Principal/HM</span>
          </span>
          <img className="rts-stamp" src="/media/result/default-stamp.svg" alt="School stamp" />
        </>
      ) : <span />}
      {setting.display_options.show_qr_code && (
        <img className="rts-qr" src="/media/result/default-qrcode.svg" alt="Default QR code" />
      )}
    </div>
  );

  const renderCustomBlock = (block: CustomReportBlock) => {
    if (block.type === "student_info") return studentInfoPreview;
    if (block.type === "scores_table") return scoresTablePreview;
    if (block.type === "performance_chart") return performancePreview;
    if (block.type === "domains") return setting.display_options.show_domains ? domainsPreview : null;
    if (block.type === "comments") return remarksPreview;
    if (block.type === "signature") return signaturePreview;
    return <p className="rts-builder-note">This block is ready for school-specific content.</p>;
  };

  return (
    <>
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
.rts-main{background:#F8FAFC;min-height:100vh;padding:24px 28px 40px;font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif;}
@media (max-width:767.98px){.rts-main{padding:18px 14px 0;width:100%;}}
.rts-hero{background:linear-gradient(135deg,#0A192F 0%,#0F2744 60%,#1E3A8A 100%);color:#fff;border-radius:18px;padding:32px 36px;margin-bottom:24px;position:relative;overflow:hidden;box-shadow:0 10px 30px -5px rgba(15,39,68,0.15);}
.rts-hero:after{content:"";position:absolute;top:-60px;right:-60px;width:320px;height:320px;border-radius:50%;background:radial-gradient(circle,rgba(217,119,6,0.15) 0%,transparent 65%);pointer-events:none;}
.rts-hero>*{position:relative;z-index:1}
.rts-eyebrow{display:inline-flex;align-items:center;gap:7px;color:#FBBF24;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:rgba(217,119,6,0.20);border:1px solid rgba(217,119,6,0.35);border-radius:100px;padding:4px 12px;margin-bottom:12px;}
.rts-title{font-size:26px;font-weight:800;margin:0;color:#fff;line-height:1.1;}
.rts-sub{color:#CBD5E1;max-width:760px;margin:8px 0 0;line-height:1.6;font-size:13.5px;}
.rts-grid{display:grid;grid-template-columns:minmax(310px,420px) minmax(0,1fr);gap:20px;align-items:start}
.rts-panel{background:#fff;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(15,39,68,0.03);}
.rts-panel-head{padding:18px 20px;border-bottom:1px solid #E2E8F0;}
.rts-panel-title{font-size:16px;font-weight:800;color:#0F2744;margin:0;}
.rts-panel-sub{color:#64748B;font-size:12px;margin:4px 0 0;}
.rts-panel-body{padding:18px 20px}
.rts-template{width:100%;border:1px solid #E2E8F0;background:#F8FAFC;border-radius:12px;padding:14px;text-align:left;margin-bottom:10px;cursor:pointer;transition:all .2s ease;}
.rts-template:hover{transform:translateY(-1px);background:#fff;border-color:#D97706;}
.rts-template--active{border-color:#D97706;background:#0F2744;color:#fff;}
.rts-template b{display:block;font-size:13.5px;font-weight:700;}
.rts-template span{display:block;font-size:12px;opacity:.8;margin-top:4px;line-height:1.5;}
.rts-builder{border:1px solid #E2E8F0;background:#F8FAFC;border-radius:14px;padding:14px;margin:14px 0;}
.rts-builder-note{font-size:12px;color:#64748B;line-height:1.55;margin-bottom:10px;}
.rts-block-list{display:grid;gap:8px;}
.rts-block{border:1px solid #E2E8F0;background:#fff;border-radius:12px;padding:12px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;cursor:grab;}
.rts-block b{display:block;font-size:13px;font-weight:700;color:#0F2744;}
.rts-block span{font-size:11.5px;color:#64748B;}
.rts-block-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;}
.rts-mini-btn{border:1px solid #E2E8F0;background:#fff;border-radius:8px;min-height:30px;padding:0 10px;font-size:11.5px;font-weight:700;color:#0F2744;}
.rts-mini-btn--active{background:#0F2744;color:#fff;border-color:#0F2744;}
.rts-custom-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px;}
.rts-custom-block{border:1px dashed color-mix(in srgb,var(--rts-primary),transparent 35%);background:rgba(255,255,255,.68);border-radius:12px;padding:10px;min-height:78px;}
.rts-custom-block--full{grid-column:1/-1;}
.rts-custom-title{font-size:11px;font-weight:800;color:var(--rts-primary);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;}
.rts-field{margin-top:14px;}
.rts-label{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#64748B;margin-bottom:7px;}
.rts-color-row{display:flex;gap:10px;align-items:center;}
.rts-color-row input[type=color]{width:42px;height:40px;border:1px solid #E2E8F0;border-radius:10px;background:#fff;padding:4px;}
.rts-input,.rts-select{width:100%;border:1px solid #E2E8F0;background:#fff;border-radius:10px;min-height:40px;padding:9px 12px;font-size:13px;color:#0F2744;font-weight:600;outline:none;}
.rts-input:focus,.rts-select:focus{border-color:#D97706;box-shadow:0 0 0 3px rgba(217,119,6,0.12);}
.rts-toggles{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.rts-toggle{display:flex;align-items:center;gap:8px;border:1px solid #E2E8F0;border-radius:10px;padding:9px 12px;color:#0F2744;font-size:12.5px;font-weight:600;background:#F8FAFC;}
.rts-toggle input{accent-color:#D97706;}
.rts-rule-panel{border:1px solid #E2E8F0;background:#F8FAFC;border-radius:12px;padding:14px;margin-top:12px;}
.rts-rule-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.rts-rule-actions{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-top:10px;}
.rts-rule-add{border:0;border-radius:10px;background:#0F2744;color:#fff;min-height:38px;padding:0 14px;font-weight:700;font-size:12.5px;}
.rts-rule-remove{border:1px solid #FECACA;background:#FEE2E2;color:#991B1B;border-radius:9px;min-height:34px;padding:0 12px;font-weight:700;font-size:12px;}
.rts-rule-list{display:grid;gap:10px;margin-top:12px;}
.rts-rule-card{border:1px solid #E2E8F0;border-radius:12px;background:#fff;padding:12px;}
.rts-rule-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px;}
.rts-rule-title{font-weight:700;color:#0F2744;font-size:13px;}
.rts-rule-sub{font-size:11.5px;color:#64748B;margin-top:2px;}
.rts-rule-empty{border:1px dashed #CBD5E1;border-radius:12px;color:#64748B;background:#fff;padding:14px;font-size:12.5px;line-height:1.6;}
.rts-save{width:100%;border:0;background:#D97706;color:#FFFFFF;border-radius:10px;min-height:44px;font-weight:700;font-size:13.5px;margin-top:18px;cursor:pointer;transition:all 0.2s ease;}
.rts-save:hover{background:#B45309;transform:translateY(-1px);}
.rts-save:disabled{opacity:.6;cursor:not-allowed;transform:none;}
.rts-catalog{display:grid;grid-template-columns:minmax(0,780px);justify-content:center;gap:14px;}
.rts-preview{background:var(--rts-bg);border:3px solid var(--rts-primary);border-radius:14px;padding:18px;color:#111827;min-height:unset;position:relative;overflow:visible;box-shadow:0 16px 40px rgba(15,23,42,.08);width:100%;box-sizing:border-box;}
.rts-preview--modern{border-radius:22px;border-width:0;box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--rts-primary),transparent 15%),0 16px 40px rgba(15,23,42,.08);}
.rts-preview--premium{border-width:1px;border-top:10px solid var(--rts-primary);}
.rts-watermark{position:absolute;inset:0;background-repeat:repeat;background-size:140px 140px;opacity:.045;transform:rotate(-25deg);pointer-events:none}.rts-preview-inner{position:relative;z-index:1}.rts-preview-head{display:grid;grid-template-columns:54px 1fr 54px;gap:10px;align-items:center;border-bottom:2px solid var(--rts-primary);padding-bottom:10px}.rts-logo,.rts-photo{width:54px;height:54px;border-radius:10px;background:var(--rts-secondary);display:flex;align-items:center;justify-content:center;font-weight:900;color:#111827;overflow:hidden;border:1px solid color-mix(in srgb,var(--rts-primary),transparent 45%)}.rts-logo img,.rts-photo img{width:100%;height:100%;object-fit:cover}.rts-school{text-align:center}.rts-school h3{font-size:17px;margin:0;color:var(--rts-primary);font-weight:900}.rts-school p{font-size:10.5px;margin:3px 0;color:#475569}.rts-band{background:var(--rts-primary);color:var(--rts-text);padding:7px 10px;border-radius:10px;text-align:center;font-size:12px;font-weight:900;margin-top:10px;letter-spacing:.08em}
.rts-info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.rts-info div{border:1px solid color-mix(in srgb,var(--rts-primary),transparent 45%);border-left:4px solid var(--rts-primary);border-radius:9px;padding:8px;font-size:11px;background:color-mix(in srgb,var(--rts-secondary),#fff 82%)}.rts-info b{color:var(--rts-primary)}
.rts-layout-body{display:grid;grid-template-columns:1fr;gap:12px}.rts-preview--modern .rts-layout-body{grid-template-columns:minmax(0,1.25fr) minmax(245px,.75fr);align-items:start}.rts-preview--premium .rts-layout-body{border-top:1px solid color-mix(in srgb,var(--rts-primary),transparent 55%);margin-top:12px;padding-top:2px}.rts-score-area{min-width:0}.rts-insight-area{min-width:0}.rts-preview--modern .rts-insight-area{margin-top:12px}.rts-preview--modern .rts-analytics{grid-template-columns:1fr}.rts-preview--modern .rts-domain-grid{grid-template-columns:1fr}.rts-preview--premium .rts-insight-area{display:grid;grid-template-columns:1.2fr .8fr;gap:10px;align-items:start}.rts-preview--premium .rts-domain-grid{margin-top:0}.rts-table{width:100%;border-collapse:collapse;margin-top:12px;font-size:10.5px}.rts-table th{background:var(--rts-primary);color:var(--rts-text);padding:7px 5px;border:1px solid var(--rts-primary)}.rts-table td{border:1px solid color-mix(in srgb,var(--rts-primary),transparent 45%);padding:6px 5px;text-align:center}.rts-table td:first-child{text-align:left;font-weight:700}.rts-summary{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.rts-preview--premium .rts-summary{justify-content:center}.rts-chip{background:var(--rts-secondary);border:1px solid var(--rts-primary);border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900}.rts-analytics{display:grid;grid-template-columns:1.2fr .8fr;gap:10px;margin-top:12px}.rts-analytics-card{border:1px solid color-mix(in srgb,var(--rts-primary),transparent 55%);border-radius:12px;padding:10px;background:rgba(255,255,255,.62)}.rts-analytics-title{font-size:11px;font-weight:900;color:var(--rts-primary);border-left:4px solid var(--rts-primary);padding-left:7px;margin-bottom:8px;text-transform:uppercase;letter-spacing:.08em}.rts-bar-row{display:grid;grid-template-columns:105px 1fr 38px;gap:7px;align-items:center;font-size:10.5px;margin:6px 0}.rts-bar-track{height:8px;background:rgba(15,23,42,.08);border-radius:999px;overflow:hidden}.rts-bar-fill{display:block;height:100%;border-radius:999px}.rts-domain-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.rts-domain-table{width:100%;border-collapse:collapse;font-size:10.5px}.rts-domain-table caption{font-weight:900;color:var(--rts-primary);border-bottom:2px solid var(--rts-primary);padding-bottom:6px}.rts-domain-table td{border:1px solid color-mix(in srgb,var(--rts-primary),transparent 50%);padding:6px}.rts-domain-table td:last-child{text-align:center;font-weight:800}.rts-remarks{margin-top:12px;font-size:11px;line-height:1.6}.rts-remarks strong{color:var(--rts-primary)}.rts-foot{display:flex;justify-content:space-between;align-items:end;margin-top:16px;font-size:10.5px;color:var(--rts-primary);font-weight:900}.rts-preview--premium .rts-foot{border-top:1px solid color-mix(in srgb,var(--rts-primary),transparent 55%);padding-top:12px}.rts-signature{min-width:150px;text-align:center}.rts-signature img{width:130px;height:48px;object-fit:contain}.rts-stamp{width:68px;height:68px;object-fit:contain;transform:rotate(-8deg);opacity:.92}.rts-qr{width:58px;height:58px;object-fit:contain;border:2px solid var(--rts-primary);background:#fff}
@media(max-width:1199.98px){.rts-grid{grid-template-columns:1fr}.rts-catalog{grid-template-columns:minmax(0,780px)}}@media(max-width:575.98px){.rts-toggles{grid-template-columns:1fr}.rts-preview{padding:12px}.rts-preview-head{grid-template-columns:46px 1fr 46px}.rts-logo,.rts-photo{width:46px;height:46px}.rts-school h3{font-size:14px}.rts-table{font-size:9.5px}.rts-table th,.rts-table td{padding:5px 3px}.rts-analytics,.rts-domain-grid{grid-template-columns:1fr}.rts-bar-row{grid-template-columns:88px 1fr 32px}}
.rts-preview,.rts-preview *{box-sizing:border-box}.rts-preview{overflow:hidden}.rts-preview .rts-layout-body,.rts-preview .rts-insight-area,.rts-preview .rts-score-area,.rts-preview .rts-analytics-card,.rts-preview .rts-domain-table{min-width:0;max-width:100%}.rts-preview--modern .rts-layout-body{grid-template-columns:1fr}.rts-preview--modern .rts-insight-area{margin-top:0}.rts-preview--premium .rts-insight-area{display:block}.rts-preview--premium .rts-domain-grid{margin-top:12px}.rts-preview .rts-analytics{grid-template-columns:repeat(2,minmax(0,1fr))}.rts-preview .rts-domain-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rts-preview .rts-bar-row{grid-template-columns:minmax(0,96px) minmax(70px,1fr) 34px}.rts-preview .rts-bar-row span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rts-preview .rts-domain-table{table-layout:fixed}.rts-preview .rts-domain-table td{word-break:break-word}.rts-preview .rts-table{table-layout:fixed}.rts-preview .rts-table th,.rts-preview .rts-table td{word-break:break-word}@media(max-width:900px){.rts-preview .rts-analytics,.rts-preview .rts-domain-grid,.rts-custom-grid{grid-template-columns:1fr}.rts-preview .rts-info{grid-template-columns:1fr}.rts-preview .rts-foot{gap:10px;flex-wrap:wrap}.rts-preview .rts-signature{min-width:120px}}
      `}</style>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <PageTitle title="Result Design" />

      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} />
          <main className="rts-main">
            {(loading || saving) && <Loader message={saving ? "Saving result design..." : "Loading result design..."} />}

            <section className="rts-hero">
              <div className="rts-eyebrow">Result template studio</div>
              <h1 className="rts-title">Choose how your school result should look.</h1>
              <p className="rts-sub">
                Select a professional report-card design, adjust school colors, and control what appears before parents
                and students view published results.
              </p>
            </section>

            <div className="rts-grid">
              <section className="rts-panel">
                <div className="rts-panel-head">
                  <p className="rts-panel-title">Design Controls</p>
                  <p className="rts-panel-sub">Changes reflect immediately in the preview.</p>
                </div>
                <div className="rts-panel-body">
                  {templates.map((template) => (
                    <button
                      key={template.key}
                      className={`rts-template ${setting.template_key === template.key ? "rts-template--active" : ""}`}
                      onClick={() => setSetting((current) => ({
                        ...current,
                        template_key: template.key,
                        display_options: {
                          ...current.display_options,
                          custom_report_layout: {
                            ...current.display_options.custom_report_layout,
                            enabled: template.key === "custom_builder",
                          },
                        },
                      }))}
                    >
                      <b>{template.name}</b>
                      <span>{template.description}</span>
                    </button>
                  ))}

                  {setting.template_key === "custom_builder" && (
                    <div className="rts-builder">
                      <div className="rts-label">Custom report blocks</div>
                      <p className="rts-builder-note">
                        Arrange the report card using school-safe blocks. Drag a block over another block to reorder it,
                        then choose full or half width.
                      </p>
                      <div className="rts-block-list">
                        {setting.display_options.custom_report_layout.blocks.map((block, index) => (
                          <div
                            className="rts-block"
                            key={block.id}
                            draggable
                            onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                              event.preventDefault();
                              const from = Number(event.dataTransfer.getData("text/plain"));
                              if (!Number.isNaN(from)) moveCustomBlock(from, index);
                            }}
                          >
                            <div>
                              <b>{block.label}</b>
                              <span>{block.visible ? `${block.width} width` : "Hidden from result"}</span>
                            </div>
                            <div className="rts-block-actions">
                              <button className="rts-mini-btn" type="button" disabled={index === 0} onClick={() => moveCustomBlock(index, index - 1)}>Up</button>
                              <button className="rts-mini-btn" type="button" disabled={index === setting.display_options.custom_report_layout.blocks.length - 1} onClick={() => moveCustomBlock(index, index + 1)}>Down</button>
                              <button className={`rts-mini-btn ${block.width === "full" ? "rts-mini-btn--active" : ""}`} type="button" onClick={() => updateCustomBlock(block.id, { width: "full" })}>Full</button>
                              <button className={`rts-mini-btn ${block.width === "half" ? "rts-mini-btn--active" : ""}`} type="button" onClick={() => updateCustomBlock(block.id, { width: "half" })}>Half</button>
                              <button className="rts-mini-btn" type="button" onClick={() => updateCustomBlock(block.id, { visible: !block.visible })}>{block.visible ? "Hide" : "Show"}</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {[
                    ["primary_color", "Primary color"],
                    ["secondary_color", "Accent color"],
                    ["background_color", "Paper color"],
                  ].map(([key, label]) => (
                    <div className="rts-field" key={key}>
                      <div className="rts-label">{label}</div>
                      <div className="rts-color-row">
                        <input
                          type="color"
                          value={(setting as any)[key]}
                          onChange={(e) => setSetting((current) => ({ ...current, [key]: e.target.value }))}
                        />
                        <input
                          className="rts-input"
                          value={(setting as any)[key]}
                          onChange={(e) => setSetting((current) => ({ ...current, [key]: e.target.value }))}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="rts-field">
                    <div className="rts-label">Font style</div>
                    <select
                      className="rts-select"
                      value={setting.font_family}
                      onChange={(e) => setSetting((current) => ({ ...current, font_family: e.target.value }))}
                    >
                      <option value="Arial">Arial</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Trebuchet MS">Trebuchet MS</option>
                    </select>
                  </div>

                  <div className="rts-field">
                    <div className="rts-label">Display on result</div>
                    <div className="rts-toggles">
                      {[
                        ["show_position", "Position"],
                        ["show_grade", "Grade"],
                        ["show_remarks", "Remarks"],
                        ["show_attendance", "Attendance"],
                        ["show_domains", "Domains"],
                        ["show_qr_code", "QR code"],
                        ["show_signature", "Signature"],
                        ["show_student_photo", "Student photo"],
                        ["show_watermark", "Watermark"],
                      ].map(([key, label]) => (
                        <label className="rts-toggle" key={key}>
                          <input
                            type="checkbox"
                            checked={Boolean(setting.display_options[key as keyof DisplayOptions])}
                            onChange={() => updateOption(key as keyof DisplayOptions)}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="rts-field">
                    <div className="rts-label">Special columns by section and term</div>
                    <div className="rts-rule-panel">
                      <div className="rts-rule-row">
                        <select
                          className="rts-select"
                          value={previewSectionId}
                          onChange={(e) => setPreviewSectionId(e.target.value === "all" ? "all" : Number(e.target.value))}
                        >
                          <option value="all">All sections</option>
                          {sections.map((section) => (
                            <option value={section.id} key={section.id}>
                              {section.name}
                            </option>
                          ))}
                        </select>
                        <select
                          className="rts-select"
                          value={previewTerm}
                          onChange={(e) => setPreviewTerm(e.target.value)}
                        >
                          <option value="all">All terms</option>
                          {terms.length > 0 ? (
                            terms.map((term) => (
                              <option value={term.name} key={term.id || term.name}>
                                {term.name}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="First Term">First Term</option>
                              <option value="Second Term">Second Term</option>
                              <option value="Third Term">Third Term</option>
                            </>
                          )}
                        </select>
                      </div>
                      <div className="rts-rule-actions">
                        <span className="rts-rule-sub">Preview and create rules for the selected section/term.</span>
                        <button type="button" className="rts-rule-add" onClick={addColumnRule}>
                          Add Rule
                        </button>
                      </div>
                    </div>

                    <div className="rts-rule-list">
                      {setting.display_options.report_column_rules.length === 0 && (
                        <div className="rts-rule-empty">
                          No special rule yet. The general display switches above will be used for every section and term.
                        </div>
                      )}
                      {setting.display_options.report_column_rules.map((rule) => (
                        <div className="rts-rule-card" key={rule.id}>
                          <div className="rts-rule-card-head">
                            <div>
                              <div className="rts-rule-title">{rule.section_name || "All sections"}</div>
                              <div className="rts-rule-sub">{rule.term === "all" ? "All terms" : rule.term}</div>
                            </div>
                            <button type="button" className="rts-rule-remove" onClick={() => removeColumnRule(rule.id)}>
                              Remove
                            </button>
                          </div>
                          <div className="rts-toggles">
                            {[
                              ["show_position", "Position"],
                              ["show_grade", "Grade"],
                              ["show_remarks", "Remarks"],
                              ["show_first_term", "First Term"],
                              ["show_second_term", "Second Term"],
                              ["show_cumulative_total", "Total Score"],
                              ["show_cumulative_average", "Average"],
                            ].map(([key, label]) => (
                              <label className="rts-toggle" key={key}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(rule.columns[key as keyof ReportColumnOptions])}
                                  onChange={() =>
                                    updateColumnRule(rule.id, {
                                      columns: {
                                        ...rule.columns,
                                        [key]: !rule.columns[key as keyof ReportColumnOptions],
                                      },
                                    })
                                  }
                                />
                                {label}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button className="rts-save" onClick={save} disabled={saving}>
                    {saving ? "Saving..." : "Save Result Design"}
                  </button>
                </div>
              </section>

              <section className="rts-panel">
                <div className="rts-panel-head">
                  <p className="rts-panel-title">Live Preview</p>
                  <p className="rts-panel-sub">{selectedTemplate?.name} using sample student data.</p>
                </div>
                <div className="rts-panel-body">
                  <div className="rts-catalog">
                    <div className={`rts-preview ${templateClass(setting.template_key)}`} style={previewVars}>
                      {setting.display_options.show_watermark && (
                        <div className="rts-watermark" style={{ backgroundImage: `url(${schoolLogo})` }} />
                      )}
                      <div className="rts-preview-inner">
                        <div className="rts-preview-head">
                          <div className="rts-logo">
                            <img src={schoolLogo} alt={schoolName} />
                          </div>
                          <div className="rts-school">
                            <h3>{schoolName}</h3>
                            <p>12 School Road, Lagos | 08030000000</p>
                          </div>
                          {setting.display_options.show_student_photo ? (
                            <div className="rts-photo">
                              <img src={studentAvatar} alt="Student avatar" />
                            </div>
                          ) : <div />}
                        </div>
                        <div className="rts-band">{(previewTerm === "all" ? "TERM" : previewTerm).toUpperCase()} REPORT SHEET</div>
                        {setting.template_key === "custom_builder" ? (
                          <div className="rts-custom-grid">
                            {customBlocks.map((block) => (
                              <section
                                className={`rts-custom-block ${block.width === "full" ? "rts-custom-block--full" : ""}`}
                                key={block.id}
                              >
                                <div className="rts-custom-title">{block.label}</div>
                                {renderCustomBlock(block)}
                              </section>
                            ))}
                          </div>
                        ) : (
                          <>
                            {studentInfoPreview}
                            <div className="rts-layout-body">
                              <section className="rts-score-area">{scoresTablePreview}</section>
                              <aside className="rts-insight-area">
                                {setting.display_options.show_domains && (
                                  <>
                                    {performancePreview}
                                    {domainsPreview}
                                  </>
                                )}
                              </aside>
                            </div>
                            {remarksPreview}
                            {signaturePreview}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-auto" style={{ paddingTop: 18 }}>
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
