import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import { authApi } from "../../../utils/axios";
import { useToast } from "../../../contexts/ToastContext";
import "./AcademicRecords.css";
import "./AcademicRecordsLayoutFix.css";

export default function TranscriptsPage() {
  const [params] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [term, setTerm] = useState("all");
  const [terms, setTerms] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const { showError } = useToast();

  const openPreview = async (id: number) => {
    setPreviewing(true);
    try {
      const res = await authApi.get(`/admin/transcripts/${id}`, { params: { term } });
      setPreview(res.data);
    } catch (e: any) {
      showError(e?.response?.data?.message || "Could not load transcript.");
    } finally {
      setPreviewing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await authApi.get("/admin/transcripts", { params: { search, status, term, page, per_page: 15 } });
        setData(res.data.students);
        setTerms(Array.isArray(res.data.terms) ? res.data.terms : []);
      } catch (e: any) {
        showError(e?.response?.data?.message || "Could not load transcript tracker.");
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search, status, term, page]);

  useEffect(() => {
    const id = Number(params.get("student"));
    if (id) openPreview(id);
  }, []);

  const download = async (student: any) => {
    setDownloading(student.id);
    try {
      const res = await authApi.get(`/admin/transcripts/${student.id}/pdf`, { params: { term }, responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      const termLabel = term === "all" ? "all-terms" : term.toLowerCase().replace(/\s+/g, "-");
      link.download = `transcript-${student.reg_no || student.id}-${termLabel}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setData((old: any) => ({ ...old, data: old.data.map((item: any) => item.id === student.id
        ? { ...item, transcript_downloads: (item.transcript_downloads || 0) + 1, last_transcript_downloaded_at: new Date().toISOString() }
        : item) }));
    } catch (e: any) {
      showError(e?.response?.data?.message || "Transcript PDF could not be generated for the selected term.");
    } finally {
      setDownloading(null);
    }
  };

  return <div className="ar-page">
    <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
    <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
    <main className="col-md-9 col-lg-10 ms-auto ar-main">
      <section className="ar-hero"><div><h1>Student Transcript Tracker</h1><p>Choose a term, review published academic history, and download official student transcripts.</p></div><span className="ar-pill">Published results only</span></section>
      <section className="ar-panel">
        <div className="ar-toolbar">
          <input className="ar-search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Enter student admission number" aria-label="Student admission number" />
          <select className="ar-filter" value={term} onChange={e => { setTerm(e.target.value); setPage(1); setPreview(null); }} aria-label="Transcript term">
            <option value="all">All terms</option>
            {terms.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="ar-filter" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} aria-label="Student status">
            <option value="all">All students</option><option value="active">Active</option><option value="graduate">Graduate</option><option value="alumni">Alumni</option><option value="withdrawn">Withdrawn</option>
          </select>
        </div>
        {loading ? <Loader message="Loading transcript tracker..." /> : <div className="ar-table-wrap"><table className="ar-table"><thead><tr><th>Student</th><th>Status</th><th>{term === "all" ? "Published records" : `${term} records`}</th><th>Download tracking</th><th>Actions</th></tr></thead><tbody>
          {(data?.data || []).map((student: any) => <tr key={student.id}><td><div className="ar-name">{[student.surname, student.firstname, student.third_name].filter(Boolean).join(" ")}</div><div className="ar-muted">{student.reg_no || "No admission number"} · {student.level?.name || "No class"}</div></td><td><span className={`ar-badge ${student.student_status}`}>{student.student_status || "active"}</span></td><td>{student.published_result_count}</td><td>{student.transcript_downloads || 0} download(s)<div className="ar-muted">{student.last_transcript_downloaded_at ? `Last: ${new Date(student.last_transcript_downloaded_at).toLocaleString()}` : "Never downloaded"}</div></td><td><div className="ar-result"><button className="ar-btn secondary" disabled={!student.published_result_count || previewing} onClick={() => openPreview(student.id)}>Preview</button><button className="ar-btn" disabled={!student.published_result_count || downloading === student.id} onClick={() => download(student)}>{downloading === student.id ? "Generating..." : "Download PDF"}</button></div></td></tr>)}
        </tbody></table>{!data?.data?.length && <div className="ar-empty">{search.trim() ? "No student was found with that admission number and selected filters." : "Enter a student admission number to load their transcript."}</div>}</div>}
        <div className="ar-pagination"><button className="ar-btn secondary" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><span className="ar-muted">Page {data?.current_page || 1} of {data?.last_page || 1}</span><button className="ar-btn secondary" disabled={page >= (data?.last_page || 1)} onClick={() => setPage(value => value + 1)}>Next</button></div>
      </section><Footer />
    </main>
    {preview && <div className="ar-modal-backdrop" onClick={() => setPreview(null)}><div className="ar-modal" onClick={e => e.stopPropagation()}><div className="ar-modal-head"><div><div className="ar-name">{[preview.student?.surname, preview.student?.firstname].filter(Boolean).join(" ")}</div><div className="ar-muted">{preview.term || "All terms"} · published records only</div></div><button className="ar-btn secondary" onClick={() => setPreview(null)}>Close</button></div><div className="ar-modal-body">{preview.records?.map((record: any) => <div className="ar-record-card" key={record.result_id}><div className="ar-record-head">{record.session} · {record.term} · {record.class_name || "Class"} — Average: {record.average || "N/A"}</div><table className="ar-subjects"><thead><tr><th>Subject</th><th>CA</th><th>Exam</th><th>Total</th><th>Grade</th></tr></thead><tbody>{record.subjects.map((subject: any, index: number) => <tr key={index}><td>{subject.name}</td><td>{subject.ca}</td><td>{subject.exam}</td><td>{subject.total}</td><td>{subject.grade}</td></tr>)}</tbody></table></div>)}</div></div></div>}
  </div>;
}
