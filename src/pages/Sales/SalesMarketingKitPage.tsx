import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import { useToast } from "../../contexts/ToastContext";
import { salesApi } from "./salesApi";
import type { SalesMarketingMaterial, SalesRepresentative } from "./salesApi";
import "./SalesWorkspace.css";

export default function SalesMarketingKitPage() {
  const { showError, showSuccess } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rep, setRep] = useState<SalesRepresentative | null>(null);
  const [materials, setMaterials] = useState<SalesMarketingMaterial[]>([]);

  const salesPageUrl = (() => {
    if (!rep?.sales_page_url) return "";

    try {
      const referralUrl = new URL(rep.sales_page_url, window.location.origin);
      return `${window.location.origin}${referralUrl.pathname}${referralUrl.search}${referralUrl.hash}`;
    } catch {
      return rep.sales_page_url;
    }
  })();

  useEffect(() => {
    Promise.all([salesApi.workspace(), salesApi.materials()])
      .then(([workspace, kit]) => { setRep(workspace.representative); setMaterials(kit.materials || []); })
      .catch((e) => showError(e?.response?.data?.message || "Failed to load your marketing kit."))
      .finally(() => setLoading(false));
  }, []);

  const copy = async (text: string, message = "Copied.") => {
    await navigator.clipboard.writeText(text);
    showSuccess(message);
  };

  return <><TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Marketing Kit" /><div className="container-fluid"><div className="row"><Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} /><main className="col-md-9 col-lg-10 ms-auto db-main sales-work-main">{loading && <Loader message="Loading marketing kit..." />}<div className="sales-work-shell">
    <section className="sales-work-hero"><div><div className="sales-work-eyebrow"><i className="bi bi-megaphone" /> Representative Growth Kit</div><h1>Share GradeQuest. Own every lead.</h1><p>Use your verified sales page, QR code, banners, and approved copy. Leads submitted through your link stay attributed to you.</p></div></section>
    <section className="sales-work-content"><div className="sales-work-panel"><div className="sales-work-head"><div><h2>My GradeQuest sales page</h2><p>Your permanent referral link.</p></div></div><div className="sales-work-list"><div className="sales-page-share"><div className="sales-page-qr"><QRCodeSVG value={salesPageUrl || window.location.origin} size={132} level="M" /></div><div className="sales-page-details"><h3>{salesPageUrl || "Loading link..."}</h3><p>Schools can learn about GradeQuest, contact you, and start registration here.</p><div className="sales-work-actions"><button className="sales-work-btn sales-work-btn-primary" disabled={!salesPageUrl} onClick={() => salesPageUrl && copy(salesPageUrl, "Sales page link copied.")}><i className="bi bi-copy" /> Copy link</button><a className="sales-work-btn sales-work-btn-light" href={salesPageUrl || undefined} target="_blank" rel="noreferrer" aria-disabled={!salesPageUrl}><i className="bi bi-box-arrow-up-right" /> Preview</a></div></div></div></div></div>
      <aside className="sales-work-panel"><div className="sales-work-head"><div><h2>Sharing rule</h2><p>Protect your attribution.</p></div></div><div className="sales-work-empty" style={{textAlign:"left"}}>Always send schools your personal sales-page link. A secure invitation created from a lead also preserves your attribution through registration.</div></aside></section>
    <section className="sales-work-panel"><div className="sales-work-head"><div><h2>Approved marketing materials</h2><p>Only active materials published by GradeQuest are shown.</p></div></div><div className="mk-grid">{materials.length === 0 && <div className="sales-work-empty">No approved material has been published yet.</div>}{materials.map((m) => <article className="mk-card" key={m.id}>{m.asset_url && (m.type === "video" ? <video controls src={m.asset_url} /> : <img src={m.asset_url} alt={m.title} />)}<div className="mk-body"><span className="sales-work-pill sales-work-gold">{m.type}</span><h3>{m.title}</h3><p>{m.description}</p>{m.share_caption && <div className="mk-caption">{m.share_caption}</div>}<div className="sales-work-actions">{m.asset_url && <a className="sales-work-btn sales-work-btn-light" href={m.asset_url} download target="_blank" rel="noreferrer"><i className="bi bi-download" /> Download</a>}{m.share_caption && <button className="sales-work-btn sales-work-btn-primary" onClick={() => copy(`${m.share_caption}\n\n${salesPageUrl}`, "Caption and referral link copied.")}><i className="bi bi-copy" /> Copy post</button>}</div></div></article>)}</div></section><style>{`.mk-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:18px}.mk-card{overflow:hidden;border:1px solid #e5e7eb;border-radius:18px;background:#fff}.mk-card img,.mk-card video{width:100%;height:190px;object-fit:cover;background:#111827}.mk-body{padding:18px;display:grid;gap:10px}.mk-body h3,.mk-body p{margin:0}.mk-caption{padding:12px;border-radius:12px;background:#f8fafc;white-space:pre-wrap;color:#475569;font-size:13px}`}</style><Footer /></div></main></div></div></>;
}
