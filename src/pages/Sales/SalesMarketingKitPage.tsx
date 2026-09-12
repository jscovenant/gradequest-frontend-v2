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

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Marketing Kit" />
      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="col-md-9 col-lg-10 ms-auto db-main sales-work-main">
            {loading && <Loader message="Loading marketing kit..." />}
            <div className="sales-work-shell">
              <section className="sales-work-hero">
                <div>
                  <div className="sales-work-eyebrow"><i className="bi bi-megaphone" /> Representative Growth Kit</div>
                  <h1>Share SchoolProfit. Own every lead.</h1>
                  <p>Use your personalized brochure, verified sales page, QR code, and approved copy. Leads submitted through your link stay attributed to you.</p>
                </div>
              </section>

              {/* ── OFFICIAL PDF BROCHURE SECTION ── */}
              <section
                className="sales-work-panel"
                style={{
                  background: "linear-gradient(135deg, #0F2744 0%, #1e1b4b 100%)",
                  color: "#fff",
                  padding: "24px",
                  borderRadius: "18px",
                  boxShadow: "0 10px 25px rgba(15, 39, 68, 0.25)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 12px",
                        borderRadius: 20,
                        background: "rgba(255, 200, 87, 0.2)",
                        color: "#ffc857",
                        fontSize: 11,
                        fontWeight: 800,
                        marginBottom: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      <i className="bi bi-file-earmark-pdf-fill" /> Official Presentation Material
                    </div>
                    <h2 style={{ color: "#fff", fontSize: 22, margin: "0 0 8px", fontWeight: 900 }}>
                      SchoolProfit Marketing &amp; Solution Brochure (PDF)
                    </h2>
                    <p style={{ color: "rgba(255,255,255,0.85)", margin: 0, fontSize: 13, maxWidth: 640, lineHeight: 1.6 }}>
                      A 4-page executive prospectus detailing automated results, direct split fees, AI lesson planning, hybrid CBT, and edition pricing. <strong>Automatically personalized with your name, phone number, and referral link on Page 4!</strong>
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <a
                      className="sales-work-btn sales-work-btn-primary"
                      style={{
                        background: "#ffc857",
                        color: "#0F2744",
                        border: "none",
                        fontWeight: 900,
                        padding: "12px 20px",
                        borderRadius: "10px",
                        fontSize: "14px",
                      }}
                      href={rep?.code ? `/api/sales/marketing-brochure?rep_code=${encodeURIComponent(rep.code)}` : `/api/sales/marketing-brochure`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <i className="bi bi-download me-1" /> Download Personalized PDF
                    </a>
                    <a
                      className="sales-work-btn sales-work-btn-light"
                      style={{
                        background: "rgba(255,255,255,0.12)",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.3)",
                        fontWeight: 700,
                        padding: "12px 18px",
                        borderRadius: "10px",
                        fontSize: "14px",
                      }}
                      href={rep?.code ? `/api/sales/marketing-brochure?rep_code=${encodeURIComponent(rep.code)}&stream=1` : `/api/sales/marketing-brochure?stream=1`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <i className="bi bi-eye me-1" /> Preview PDF
                    </a>
                    <a
                      className="sales-work-btn sales-work-btn-light"
                      style={{
                        background: "#0284c7",
                        color: "#fff",
                        border: "none",
                        fontWeight: 700,
                        padding: "12px 18px",
                        borderRadius: "10px",
                        fontSize: "14px",
                      }}
                      href="/downloads/SchoolProfit-Comprehensive-Platform-Guide.docx"
                      download
                      target="_blank"
                      rel="noreferrer"
                    >
                      <i className="bi bi-file-earmark-word me-1" /> Full Manual & Pitch Playbook (.DOCX)
                    </a>
                  </div>
                </div>
              </section>

              <section className="sales-work-content">
                <div className="sales-work-panel">
                  <div className="sales-work-head">
                    <div>
                      <h2>My SchoolProfit sales page</h2>
                      <p>Your permanent referral link.</p>
                    </div>
                  </div>
                  <div className="sales-work-list">
                    <div className="sales-page-share">
                      <div className="sales-page-qr">
                        <QRCodeSVG value={salesPageUrl || window.location.origin} size={132} level="M" />
                      </div>
                      <div className="sales-page-details">
                        <h3>{salesPageUrl || "Loading link..."}</h3>
                        <p>Schools can learn about SchoolProfit, contact you, and start registration here.</p>
                        <div className="sales-work-actions">
                          <button className="sales-work-btn sales-work-btn-primary" disabled={!salesPageUrl} onClick={() => salesPageUrl && copy(salesPageUrl, "Sales page link copied.")}>
                            <i className="bi bi-copy" /> Copy link
                          </button>
                          <a className="sales-work-btn sales-work-btn-light" href={salesPageUrl || undefined} target="_blank" rel="noreferrer" aria-disabled={!salesPageUrl}>
                            <i className="bi bi-box-arrow-up-right" /> Preview
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <aside className="sales-work-panel">
                  <div className="sales-work-head">
                    <div>
                      <h2>Sharing rule</h2>
                      <p>Protect your attribution.</p>
                    </div>
                  </div>
                  <div className="sales-work-empty" style={{ textAlign: "left" }}>
                    Always share your personal brochure and sales page link with schools. Leads submitted through your link or brochure stay assigned to you for life.
                  </div>
                </aside>
              </section>

              <section className="sales-work-panel">
                <div className="sales-work-head">
                  <div>
                    <h2>Approved marketing materials</h2>
                    <p>Only active materials published by SchoolProfit are shown.</p>
                  </div>
                </div>
                <div className="mk-grid">
                  {materials.length === 0 && <div className="sales-work-empty">No approved material has been published yet.</div>}
                  {materials.map((m) => (
                    <article className="mk-card" key={m.id}>
                      {m.asset_url && (m.type === "video" ? <video controls src={m.asset_url} /> : <img src={m.asset_url} alt={m.title} />)}
                      <div className="mk-body">
                        <span className="sales-work-pill sales-work-gold">{m.type}</span>
                        <h3>{m.title}</h3>
                        <p>{m.description}</p>
                        {m.share_caption && <div className="mk-caption">{m.share_caption}</div>}
                        <div className="sales-work-actions">
                          {m.asset_url && (
                            <a className="sales-work-btn sales-work-btn-light" href={m.asset_url} download target="_blank" rel="noreferrer">
                              <i className="bi bi-download" /> Download
                            </a>
                          )}
                          {m.share_caption && (
                            <button className="sales-work-btn sales-work-btn-primary" onClick={() => copy(`${m.share_caption}\n\n${salesPageUrl}`, "Caption and referral link copied.")}>
                              <i className="bi bi-copy" /> Copy post
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
              <style>{`.mk-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:18px}.mk-card{overflow:hidden;border:1px solid #e5e7eb;border-radius:18px;background:#fff}.mk-card img,.mk-card video{width:100%;height:190px;object-fit:cover;background:#111827}.mk-body{padding:18px;display:grid;gap:10px}.mk-body h3,.mk-body p{margin:0}.mk-caption{padding:12px;border-radius:12px;background:#f8fafc;white-space:pre-wrap;color:#475569;font-size:13px}`}</style>
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
