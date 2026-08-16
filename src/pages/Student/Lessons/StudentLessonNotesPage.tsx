import { useEffect, useState } from "react";
import TopNav from "../../../components/LayoutComponents/TopNav";
import Sidebar from "../../../components/LayoutComponents/Sidebar";
import Footer from "../../../components/LayoutComponents/Footer";
import Loader from "../../../components/ui/dashboardLoader";
import PageTitle from "../../../components/PageTitle";
import { authApi } from "../../../utils/axios";

type CurrentPeriod = { academic_session_name?: string | null; term_name?: string | null };

type LessonNote = {
  id: number;
  title: string;
  subject: string;
  class_name: string;
  topic: string;
  content?: {
    sections?: { heading: string; body: string }[];
    examples?: string[];
    summary?: string[];
    homework?: string[];
    youtube_search_terms?: string[];
  };
  youtube_videos?: string[];
  published_at?: string;
};

function List({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return <section className="sln-block"><h3>{title}</h3><ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul></section>;
}

export default function StudentLessonNotesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [selected, setSelected] = useState<LessonNote | null>(null);
  const [error, setError] = useState("");
  const [currentPeriod, setCurrentPeriod] = useState<CurrentPeriod | null>(null);

  useEffect(() => {
    let mounted = true;
    authApi.get("/student/lesson-notes")
      .then((res) => {
        if (!mounted) return;
        const rows = res.data?.lesson_notes?.data || [];
        setNotes(rows);
        setSelected(rows[0] || null);
        setCurrentPeriod(res.data?.current_period || null);
      })
      .catch((err) => mounted && setError(err?.response?.data?.message || "Unable to load lesson notes."))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  return <>
    <style>{`
      .sln-main{background:#fcf8f8;min-height:100vh;padding:28px 28px 0;overflow-x:hidden}.sln-hero{background:#050008;color:#fff;border-radius:16px;padding:25px;margin-bottom:18px}.sln-hero h1{font-size:clamp(24px,3vw,34px);font-weight:900;margin:0 0 8px}.sln-hero p{color:rgba(255,255,255,.68);margin:0;max-width:760px}.sln-grid{display:grid;grid-template-columns:340px 1fr;gap:18px;align-items:start}.sln-card{background:#fff;border:1px solid rgba(5,0,8,.08);border-radius:14px;box-shadow:0 12px 34px rgba(5,0,8,.055);overflow:hidden}.sln-pad{padding:18px}.sln-list{display:grid;gap:10px}.sln-item{border:1px solid rgba(5,0,8,.08);background:#fff;border-radius:12px;padding:13px;text-align:left}.sln-item.active{border-color:rgba(211,0,176,.45);box-shadow:0 0 0 4px rgba(211,0,176,.08)}.sln-title{font-weight:900;color:#1a1a2e}.sln-muted{font-size:12px;color:#8d7d70;line-height:1.6}.sln-block{border:1px solid rgba(5,0,8,.08);border-radius:12px;padding:14px;margin-top:12px}.sln-block h3{font-size:14px;font-weight:900;color:var(--bs-primary,rgb(211,0,176));margin:0 0 8px}.sln-block p,.sln-block li{font-size:13px;line-height:1.75;color:#322739}.sln-video{display:block;color:#0f766e;font-weight:850;margin-top:8px;word-break:break-all}.sln-empty{border:1px dashed rgba(5,0,8,.16);border-radius:12px;padding:24px;text-align:center;color:#8d7d70}@media(max-width:991px){.sln-grid{grid-template-columns:1fr}}@media(max-width:767px){.sln-main{padding:78px 12px 0}}
    `}</style>
    <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Lesson Notes" />
    <div className="container-fluid"><div className="row"><Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <main className="col-md-9 col-lg-10 ms-auto gq-app-main sln-main">
        <PageTitle title="Lesson Notes" />
        {loading && <Loader message="Loading lesson notes..." />}
        <section className="sln-hero"><h1>Lesson Notes</h1><p>Read lesson notes published for your current class, department, term and academic session.</p><p className="sln-muted" style={{color:"rgba(255,255,255,.72)",marginTop:8}}>Current period: <strong>{currentPeriod?.term_name || "Term not set"}</strong> - {currentPeriod?.academic_session_name || "Session not set"}</p></section>
        {error && <div className="sln-empty">{error}</div>}
        {!error && <div className="sln-grid">
          <section className="sln-card"><div className="sln-pad"><h2 className="sln-title">Published Notes</h2><p className="sln-muted">Only notes for the active term and session are shown.</p><div className="sln-list mt-3">{notes.map((note) => <button key={note.id} className={`sln-item ${selected?.id === note.id ? "active" : ""}`} onClick={() => setSelected(note)}><div className="sln-title">{note.title}</div><div className="sln-muted">{note.subject} - {note.topic}</div></button>)}{notes.length === 0 && <div className="sln-empty">No lesson note has been published for the current term yet.</div>}</div></div></section>
          <section className="sln-card"><div className="sln-pad">{selected ? <><h2 className="sln-title">{selected.title}</h2><p className="sln-muted">{selected.subject} - {selected.class_name} - {selected.topic}</p>{(selected.content?.sections || []).map((section, i) => <section className="sln-block" key={i}><h3>{section.heading}</h3><p>{section.body}</p></section>)}<List title="Examples" items={selected.content?.examples} /><List title="Summary" items={selected.content?.summary} /><List title="Homework" items={selected.content?.homework} />{selected.youtube_videos?.length ? <section className="sln-block"><h3>Videos</h3>{selected.youtube_videos.map((url, i) => <a className="sln-video" href={url} target="_blank" rel="noreferrer" key={i}>{url}</a>)}</section> : null}<List title="Suggested YouTube Searches" items={selected.content?.youtube_search_terms} /></> : <div className="sln-empty">Select a lesson note to read.</div>}</div></section>
        </div>}
        <Footer />
      </main>
    </div></div>
  </>;
}