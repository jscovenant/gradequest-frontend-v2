import { useEffect, useState } from "react";
import TopNav from "../../components/LayoutComponents/TopNav";
import Sidebar from "../../components/LayoutComponents/Sidebar";
import Footer from "../../components/LayoutComponents/Footer";
import Loader from "../../components/ui/dashboardLoader";
import { authApi } from "../../utils/axios";
import { useToast } from "../../contexts/ToastContext";
import type { SalesMarketingMaterial } from "../Sales/salesApi";
import "../Sales/SalesWorkspace.css";

const initial = { title: "", description: "", type: "banner", external_url: "", share_caption: "", cta_label: "Learn more", cta_url: "", starts_at: "", ends_at: "" };

export default function SalesMarketingMaterialsPage() {
  const { showError, showSuccess } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [materials, setMaterials] = useState<SalesMarketingMaterial[]>([]);
  const [analytics, setAnalytics] = useState({ page_views: 0, leads: 0, material_engagements: 0 });
  const [form, setForm] = useState(initial);
  const [asset, setAsset] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await authApi.get("/superadmin/sales-marketing-materials");
      setMaterials(res.data.materials || []);
      setAnalytics(res.data.analytics || { page_views: 0, leads: 0, material_engagements: 0 });
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to load marketing materials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) data.append(k, v); });
      data.append("is_active", "1");
      if (asset) data.append("asset", asset);
      await authApi.post("/superadmin/sales-marketing-materials", data);
      setForm(initial);
      setAsset(null);
      showSuccess("Marketing material published.");
      await load();
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to publish material.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (m: SalesMarketingMaterial) => {
    try {
      const data = new FormData();
      data.append("is_active", m.is_active ? "0" : "1");
      await authApi.post(`/superadmin/sales-marketing-materials/${m.id}`, data);
      showSuccess(m.is_active ? "Material paused." : "Material activated.");
      await load();
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to update material.");
    }
  };

  const remove = async (m: SalesMarketingMaterial) => {
    if (!window.confirm(`Remove ${m.title}?`)) return;
    try {
      await authApi.delete(`/superadmin/sales-marketing-materials/${m.id}`);
      showSuccess("Material removed.");
      await load();
    } catch (e: any) {
      showError(e?.response?.data?.message || "Failed to remove material.");
    }
  };

  return (
    <>
      <TopNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} title="Sales Marketing Materials" />
      <div className="container-fluid">
        <div className="row">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="col-md-9 col-lg-10 ms-auto db-main sales-work-main">
            {loading && <Loader message="Loading marketing materials..." />}
            <div className="sales-work-shell">
              <section className="sales-work-hero">
                <div>
                  <div className="sales-work-eyebrow"><i className="bi bi-badge-ad" /> Campaign Control</div>
                  <h1>Sales marketing materials</h1>
                  <p>Publish approved banners, flyers, videos, and sales copy to every representative dashboard and public sales page.</p>
                </div>
              </section>

              {/* ── OFFICIAL PDF BROCHURE SECTION FOR SUPER ADMIN ── */}
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
                      <i className="bi bi-file-earmark-pdf-fill" /> Master Collateral
                    </div>
                    <h2 style={{ color: "#fff", fontSize: 22, margin: "0 0 8px", fontWeight: 900 }}>
                      SchoolProfit Master Marketing Brochure (PDF)
                    </h2>
                    <p style={{ color: "rgba(255,255,255,0.85)", margin: 0, fontSize: 13, maxWidth: 640, lineHeight: 1.6 }}>
                      The official 4-page executive prospectus detailing automated results, direct split fees, AI lesson planning, hybrid CBT, and edition pricing. Ready for digital distribution or professional printing.
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
                      href="/api/superadmin/marketing-brochure"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <i className="bi bi-download me-1" /> Download Master PDF
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
                      href="/api/superadmin/marketing-brochure?stream=1"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <i className="bi bi-eye me-1" /> Preview
                    </a>
                  </div>
                </div>
              </section>

              <section className="sales-work-grid">
                <article className="sales-work-card">
                  <span className="sales-work-icon"><i className="bi bi-eye" /></span>
                  <div>
                    <p>Sales-page views</p>
                    <h3>{analytics.page_views}</h3>
                    <small>Tracked visits</small>
                  </div>
                </article>
                <article className="sales-work-card">
                  <span className="sales-work-icon"><i className="bi bi-person-plus" /></span>
                  <div>
                    <p>Captured leads</p>
                    <h3>{analytics.leads}</h3>
                    <small>Submitted through representative pages</small>
                  </div>
                </article>
                <article className="sales-work-card">
                  <span className="sales-work-icon"><i className="bi bi-cursor" /></span>
                  <div>
                    <p>Material engagements</p>
                    <h3>{analytics.material_engagements}</h3>
                    <small>Clicks and downloads</small>
                  </div>
                </article>
              </section>

              <section className="sales-work-content">
                <form className="sales-work-panel mm-form" onSubmit={submit}>
                  <div className="sales-work-head">
                    <div>
                      <h2>Publish material</h2>
                      <p>Upload a file or provide an external URL.</p>
                    </div>
                  </div>
                  <label>Title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
                  <label>Type
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      <option value="banner">Banner</option>
                      <option value="flyer">Flyer</option>
                      <option value="video">Video</option>
                      <option value="copy">Sales copy</option>
                    </select>
                  </label>
                  <label className="full">Description<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
                  <label className="full">Approved share caption<textarea rows={5} value={form.share_caption} onChange={(e) => setForm({ ...form, share_caption: e.target.value })} /></label>
                  <label>Upload asset<input type="file" accept="image/*,application/pdf,video/mp4" onChange={(e) => setAsset(e.target.files?.[0] || null)} /></label>
                  <label>External asset URL<input type="url" value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} /></label>
                  <label>Campaign starts<input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></label>
                  <label>Campaign ends<input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></label>
                  <button className="sales-work-btn sales-work-btn-primary full" disabled={saving}>{saving ? "Publishing..." : "Publish to dashboards"}</button>
                </form>
                <aside className="sales-work-panel">
                  <div className="sales-work-head">
                    <div>
                      <h2>Publishing standard</h2>
                      <p>Keep representatives on-message.</p>
                    </div>
                  </div>
                  <div className="sales-work-list">
                    <div className="sales-work-empty" style={{ textAlign: "left" }}>
                      Use one clear benefit, one call-to-action, and the representative’s personal link. Pause expired offers immediately. Avoid putting prices into images when pricing may change.
                    </div>
                  </div>
                </aside>
              </section>

              <section className="sales-work-panel">
                <div className="sales-work-head">
                  <div>
                    <h2>Published library</h2>
                    <p>{materials.length} material(s)</p>
                  </div>
                </div>
                <div className="mm-grid">
                  {materials.map((m) => (
                    <article className="mm-card" key={m.id}>
                      {m.asset_url && (m.type === "video" ? <video controls src={m.asset_url} /> : m.type !== "copy" ? <img src={m.asset_url} alt={m.title} /> : null)}
                      <div>
                        <span className={`sales-work-pill ${m.is_active ? "sales-work-green" : ""}`}>{m.is_active ? "Active" : "Paused"}</span>
                        <h3>{m.title}</h3>
                        <p>{m.description}</p>
                        <div className="sales-work-actions">
                          <button className="sales-work-btn sales-work-btn-light" onClick={() => toggle(m)}>{m.is_active ? "Pause" : "Activate"}</button>
                          <button className="sales-work-btn" onClick={() => remove(m)}>Remove</button>
                        </div>
                      </div>
                    </article>
                  ))}
                  {materials.length === 0 && <div className="sales-work-empty">No marketing materials published yet.</div>}
                </div>
              </section>
              <style>{`.mm-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}.mm-form .sales-work-head,.mm-form .full{grid-column:1/-1}.mm-form label{display:grid;gap:6px;font-weight:800;font-size:13px}.mm-form input,.mm-form select,.mm-form textarea{padding:11px;border:1px solid #cbd5e1;border-radius:10px;font:inherit}.mm-grid{display:grid;gap:14px}.mm-card{display:grid;grid-template-columns:190px 1fr;gap:18px;padding:14px;border:1px solid #e5e7eb;border-radius:16px}.mm-card img,.mm-card video{width:190px;height:130px;object-fit:cover;border-radius:12px;background:#111827}@media(max-width:700px){.mm-form{grid-template-columns:1fr}.mm-form .full{grid-column:auto}.mm-card{grid-template-columns:1fr}.mm-card img,.mm-card video{width:100%}}`}</style>
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
