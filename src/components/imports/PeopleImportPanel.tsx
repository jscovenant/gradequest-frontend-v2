import { useRef, useState } from "react";
import { authApi } from "../../utils/axios";
import { useToast } from "../../contexts/ToastContext";

type ImportKind = "teachers" | "parents";

type ImportPreview = {
  summary: {
    total_rows: number;
    ready_rows: number;
    errors_count: number;
    warnings_count: number;
    can_import: boolean;
  };
  rows: Array<{
    row: number;
    firstname?: string;
    surname?: string;
    email?: string;
    class_name?: string;
    student_admission_numbers?: string[];
    status: string;
  }>;
  errors: string[];
};

export default function PeopleImportPanel({
  kind,
  onImported,
}: {
  kind: ImportKind;
  onImported: () => void | Promise<void>;
}) {
  const { showSuccess, showError, showWarning } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [downloading, setDownloading] = useState<"xlsx" | "csv" | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const singular = kind === "teachers" ? "teacher" : "parent";
  const endpoint = kind === "teachers" ? "/teachers/import" : "/parents/import";
  const helper =
    kind === "teachers"
      ? "Use class name or class ID in the class column. Staff login details are created automatically."
      : "Add child admission numbers separated by commas. You may also import parents without linked children.";

  const downloadTemplate = async (format: "xlsx" | "csv") => {
    setDownloading(format);
    try {
      const res = await authApi.get(`${endpoint}/template`, {
        params: { format },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${singular}_upload_template.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      showError(err?.response?.data?.message ?? "Could not download template");
    } finally {
      setDownloading(null);
    }
  };

  const handleFile = (nextFile?: File | null) => {
    setFile(nextFile ?? null);
    setPreview(null);
    if (nextFile) {
      showSuccess(`${nextFile.name} selected. Preview it before importing.`);
      window.setTimeout(() => window.focus(), 100);
    }
  };

  const previewFile = async () => {
    if (!file) {
      showWarning("Choose an Excel or CSV file first.");
      return;
    }

    setPreviewing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await authApi.post(`${endpoint}/preview`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPreview(res.data);
      if (res.data?.summary?.errors_count > 0) showWarning("Some rows need correction before import.");
      else showSuccess("File looks good. You can import now.");
    } catch (err: any) {
      showError(err?.response?.data?.message ?? "Could not preview file");
    } finally {
      setPreviewing(false);
    }
  };

  const importFile = async () => {
    if (!file || !preview?.summary?.can_import) {
      showWarning("Preview a valid file before importing.");
      return;
    }

    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await authApi.post(endpoint, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showSuccess(res.data?.message ?? `${titleCase(singular)}s imported successfully.`);
      setFile(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      await onImported();
    } catch (err: any) {
      setPreview(err?.response?.data?.preview ?? preview);
      showError(err?.response?.data?.message ?? "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="people-import-panel">
      <style>{`
        .people-import-panel { margin:16px 0; border:1px solid var(--bs-border-color,#ede8e0); border-radius:14px; background:linear-gradient(180deg,#fff,var(--bs-light,#fcf8f8)); padding:18px; }
        .people-import-grid { display:grid; grid-template-columns:minmax(220px,1fr) minmax(280px,1.2fr); gap:16px; align-items:start; }
        @media(max-width:800px){ .people-import-grid{grid-template-columns:1fr;} }
        .people-import-title { font-family:"Lora","Playfair Display",serif; font-size:16px; font-weight:700; color:#1a1a2e; margin:0 0 4px; }
        .people-import-sub { color:#8b7b6b; font-size:12.5px; line-height:1.55; margin:0 0 12px; }
        .people-import-actions { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
        .people-import-btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; min-height:36px; border:1px solid var(--bs-border-color,#ede8e0); background:#fff; color:#4b5563; border-radius:9px; padding:8px 13px; font-size:12.5px; font-weight:700; cursor:pointer; }
        .people-import-btn:hover { background:var(--bs-light,#fcf8f8); }
        .people-import-btn:disabled { opacity:.55; cursor:not-allowed; }
        .people-import-btn--primary { background:#1a1a2e; color:#fff; border-color:#1a1a2e; }
        .people-import-file { border:1.5px dashed rgba(255,200,87,.35); background:#fff; border-radius:12px; padding:15px; cursor:pointer; display:flex; gap:12px; align-items:center; min-height:78px; }
        .people-import-file:hover { background:rgba(255,200,87,.08); }
        .people-import-icon { width:40px; height:40px; border-radius:10px; background:rgba(255,200,87,.14); color:#b45309; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .people-import-file-name { display:block; color:#1a1a2e; font-size:13px; font-weight:800; word-break:break-word; }
        .people-import-file-hint { display:block; color:#9a8a7a; font-size:12px; margin-top:3px; }
        .people-import-summary { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
        @media(max-width:700px){ .people-import-summary{grid-template-columns:repeat(2,1fr);} }
        .people-import-metric { background:#fff; border:1px solid var(--bs-border-color,#ede8e0); border-radius:10px; padding:10px; }
        .people-import-metric span { display:block; color:#9a8a7a; font-size:10.5px; text-transform:uppercase; letter-spacing:.08em; }
        .people-import-metric strong { display:block; color:#1a1a2e; font-size:20px; margin-top:2px; }
        .people-import-errors { max-height:145px; overflow:auto; margin-top:10px; border-radius:10px; border:1px solid rgba(239,68,68,.16); background:rgba(239,68,68,.04); padding:10px 12px; color:rgb(185,28,28); font-size:12px; line-height:1.55; }
        .people-import-table { max-height:220px; overflow:auto; border:1px solid var(--bs-border-color,#ede8e0); border-radius:10px; margin-top:12px; background:#fff; }
        .people-import-table table { width:100%; border-collapse:collapse; }
        .people-import-table th, .people-import-table td { padding:8px 10px; font-size:12px; border-bottom:1px solid rgba(0,0,0,.05); white-space:nowrap; }
        .people-import-table th { color:#9a8a7a; background:var(--bs-light,#fcf8f8); text-transform:uppercase; letter-spacing:.08em; font-size:10px; }
        .people-import-badge { display:inline-flex; border-radius:999px; padding:3px 9px; font-size:11px; font-weight:800; background:rgba(100,116,139,.1); color:#64748b; }
        .people-import-badge--ready { background:rgba(34,197,94,.1); color:#15803d; }
        .people-import-empty { padding:24px; text-align:center; color:#9a8a7a; }
        .people-import-empty strong { display:block; color:#1a1a2e; margin-bottom:4px; }
      `}</style>

      <div className="people-import-grid">
        <div>
          <p className="people-import-title">Upload {kind}</p>
          <p className="people-import-sub">{helper}</p>
          <div className="people-import-actions">
            <button className="people-import-btn" type="button" onClick={() => downloadTemplate("xlsx")} disabled={!!downloading}>
              {downloading === "xlsx" ? "Preparing..." : "Download Excel"}
            </button>
            <button className="people-import-btn" type="button" onClick={() => downloadTemplate("csv")} disabled={!!downloading}>
              {downloading === "csv" ? "Preparing..." : "Download CSV"}
            </button>
          </div>
          <label className="people-import-file">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
            <span className="people-import-icon">↑</span>
            <span>
              <span className="people-import-file-name">{file?.name || "Choose Excel or CSV file"}</span>
              <span className="people-import-file-hint">Accepted formats: xlsx, xls, csv</span>
            </span>
          </label>
          <div className="people-import-actions" style={{ marginTop: 12, marginBottom: 0 }}>
            <button className="people-import-btn" type="button" onClick={previewFile} disabled={!file || previewing}>
              {previewing ? "Checking..." : "Preview File"}
            </button>
            <button className="people-import-btn people-import-btn--primary" type="button" onClick={importFile} disabled={!preview?.summary?.can_import || importing}>
              {importing ? "Importing..." : `Import ${titleCase(singular)}s`}
            </button>
          </div>
        </div>

        <div>
          {preview ? (
            <>
              <div className="people-import-summary">
                <div className="people-import-metric"><span>Rows</span><strong>{preview.summary.total_rows}</strong></div>
                <div className="people-import-metric"><span>Ready</span><strong>{preview.summary.ready_rows}</strong></div>
                <div className="people-import-metric"><span>Errors</span><strong>{preview.summary.errors_count}</strong></div>
                <div className="people-import-metric"><span>Warnings</span><strong>{preview.summary.warnings_count}</strong></div>
              </div>
              {preview.errors?.length > 0 && (
                <div className="people-import-errors">
                  {preview.errors.slice(0, 8).map((error, index) => <div key={index}>{error}</div>)}
                  {preview.errors.length > 8 && <div>And {preview.errors.length - 8} more error(s).</div>}
                </div>
              )}
              <div className="people-import-table">
                <table>
                  <thead>
                    <tr><th>Row</th><th>Name</th><th>Email</th><th>{kind === "teachers" ? "Class" : "Children"}</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 10).map(row => (
                      <tr key={row.row}>
                        <td>{row.row}</td>
                        <td>{[row.firstname, row.surname].filter(Boolean).join(" ") || "N/A"}</td>
                        <td>{row.email || "N/A"}</td>
                        <td>{kind === "teachers" ? (row.class_name || "N/A") : (row.student_admission_numbers?.join(", ") || "None")}</td>
                        <td><span className={`people-import-badge ${row.status === "ready" ? "people-import-badge--ready" : ""}`}>{row.status === "ready" ? "Ready" : "Fix"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="people-import-empty">
              <strong>Preview will appear here</strong>
              <span>The system checks duplicate email, phone, names, and linked records before import.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function titleCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}
