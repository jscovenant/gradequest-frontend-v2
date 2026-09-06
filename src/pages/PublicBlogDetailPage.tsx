import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "../features/frontend/Navbar";
import Footer from "../features/frontend/footer";
import FrontendLoader from "../components/ui/FrontendLoader";
import { api } from "../utils/api";
import PageTitle from "../components/PageTitle";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  category: string;
  excerpt?: string | null;
  body?: string | null;
  youtube_url?: string | null;
  thumbnail?: string | null;
  thumbnail_url?: string | null;
  created_at?: string | null;
}

export default function PublicBlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [relatedBlogs, setRelatedBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchBlog = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get(`/blog/${slug}`);
        if (response.data?.status && response.data?.data) {
          setBlog(response.data.data);
        } else {
          setError("The requested article could not be found.");
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || "Article not found or has been moved.");
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchBlog();
    }
  }, [slug]);

  useEffect(() => {
    const fetchRelated = async () => {
      try {
        const response = await api.get("/frontend-blogs");
        const list: BlogPost[] = response.data?.data || [];
        setRelatedBlogs(list.filter((b) => b.slug !== slug).slice(0, 3));
      } catch {
        // ignore
      }
    };
    fetchRelated();
  }, [slug]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getYoutubeEmbedUrl = (url?: string | null) => {
    if (!url) return null;
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
    } catch {
      return null;
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Recent";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "Recent";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const calculateReadTime = (text?: string | null) => {
    if (!text) return "3 min read";
    const words = text.replace(/<[^>]*>/g, "").split(/\s+/).length;
    const mins = Math.max(1, Math.ceil(words / 200));
    return `${mins} min read`;
  };

  if (loading) {
    return <FrontendLoader />;
  }

  return (
    <>
      <PageTitle title={blog ? `${blog.title} — SchoolProfit Insights` : "Article — SchoolProfit Insights"} />
      <style>{`
        .gq-blog-detail-root {
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          background: #FAFAFA;
          color: #1E293B;
          min-height: 100vh;
        }

        .gq-article-hero {
          background: linear-gradient(135deg, #0A192F 0%, #0F2744 100%);
          color: #FFFFFF;
          padding: 80px 20px 60px 20px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .gq-article-hero::after {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 80% 20%, rgba(251, 191, 36, 0.1) 0%, transparent 60%);
          pointer-events: none;
        }

        .gq-article-category {
          display: inline-block;
          background: rgba(251, 191, 36, 0.15);
          border: 1px solid rgba(251, 191, 36, 0.35);
          color: #FBBF24;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 6px 14px;
          border-radius: 999px;
          margin-bottom: 16px;
        }

        .gq-article-title {
          font-family: 'Lora', 'Playfair Display', serif;
          font-size: 38px;
          font-weight: 800;
          line-height: 1.3;
          max-width: 860px;
          margin: 0 auto 20px auto;
          color: #FFFFFF;
        }

        @media (max-width: 768px) {
          .gq-article-title {
            font-size: 28px;
          }
        }

        .gq-article-meta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 18px;
          font-size: 14px;
          color: #94A3B8;
          flex-wrap: wrap;
        }

        .gq-article-container {
          max-width: 820px;
          margin: -40px auto 60px auto;
          background: #FFFFFF;
          border-radius: 20px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 16px 40px -10px rgba(15, 39, 68, 0.08);
          padding: 40px 48px;
          position: relative;
          z-index: 5;
        }

        @media (max-width: 768px) {
          .gq-article-container {
            margin: -20px 14px 40px 14px;
            padding: 24px 20px;
          }
        }

        .gq-article-thumbnail {
          width: 100%;
          max-height: 440px;
          object-fit: cover;
          border-radius: 14px;
          margin-bottom: 32px;
          border: 1px solid #E2E8F0;
        }

        .gq-article-body {
          font-size: 17px;
          line-height: 1.85;
          color: #334155;
        }

        .gq-article-body p {
          margin-bottom: 22px;
        }

        .gq-article-body h2 {
          font-size: 24px;
          font-weight: 800;
          color: #0F2744;
          margin: 36px 0 16px 0;
        }

        .gq-article-body h3 {
          font-size: 20px;
          font-weight: 700;
          color: #0F2744;
          margin: 28px 0 12px 0;
        }

        .gq-article-body blockquote {
          border-left: 4px solid #D97706;
          padding: 12px 20px;
          background: #FFFBEB;
          border-radius: 0 10px 10px 0;
          font-style: italic;
          color: #92400E;
          margin: 24px 0;
        }

        .gq-article-body ul, .gq-article-body ol {
          margin-bottom: 24px;
          padding-left: 24px;
        }

        .gq-article-body li {
          margin-bottom: 8px;
        }

        .gq-share-bar {
          border-top: 1px solid #E2E8F0;
          border-bottom: 1px solid #E2E8F0;
          padding: 18px 0;
          margin: 40px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
        }

        .gq-share-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s ease;
          border: 1px solid #E2E8F0;
          color: #334155;
          background: #F8FAFC;
        }

        .gq-share-btn:hover {
          background: #0F2744;
          color: #FFFFFF;
          border-color: #0F2744;
        }

        .gq-cta-card {
          background: linear-gradient(135deg, #0F2744 0%, #1D4ED8 100%);
          border-radius: 16px;
          color: #FFFFFF;
          padding: 36px;
          text-align: center;
          margin: 40px 0 0 0;
        }
      `}</style>

      <div className="gq-blog-detail-root">
        <Navbar />

        {error || !blog ? (
          <div className="container py-5 text-center" style={{ minHeight: "60vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
            <i className="bi bi-file-earmark-x fs-1 text-danger mb-3" />
            <h2 className="fw-bold mb-2">Article Not Found</h2>
            <p className="text-muted mb-4">{error || "The article you are looking for does not exist or has been unpublished."}</p>
            <Link to="/" className="btn btn-primary fw-bold px-4 py-2" style={{ borderRadius: "10px" }}>
              ← Return to Homepage
            </Link>
          </div>
        ) : (
          <>
            {/* Header / Hero */}
            <section className="gq-article-hero">
              <div className="container">
                <span className="gq-article-category">
                  {blog.category || "Education Insight"}
                </span>
                <h1 className="gq-article-title">{blog.title}</h1>
                <div className="gq-article-meta">
                  <span>
                    <i className="bi bi-calendar3 me-1.5 text-warning" /> {formatDate(blog.created_at)}
                  </span>
                  <span>•</span>
                  <span>
                    <i className="bi bi-clock me-1.5 text-warning" /> {calculateReadTime(blog.body)}
                  </span>
                  <span>•</span>
                  <span>
                    <i className="bi bi-person-check me-1.5 text-warning" /> SchoolProfit Editorial
                  </span>
                </div>
              </div>
            </section>

            {/* Main Content */}
            <main className="container">
              <article className="gq-article-container">
                {blog.thumbnail && (
                  <img
                    src={blog.thumbnail_url || `/${blog.thumbnail}`}
                    alt={blog.title}
                    className="gq-article-thumbnail"
                  />
                )}

                {/* Body Content */}
                <div
                  className="gq-article-body"
                  dangerouslySetInnerHTML={{ __html: blog.body || blog.excerpt || "<p>No content available.</p>" }}
                />

                {/* YouTube Video Embed if present */}
                {blog.youtube_url && getYoutubeEmbedUrl(blog.youtube_url) && (
                  <div style={{ marginTop: "36px", marginBottom: "36px" }}>
                    <h4 style={{ fontWeight: 800, color: "#0F2744", marginBottom: "14px", fontSize: "18px" }}>
                      <i className="bi bi-youtube text-danger me-2" />
                      Watch Video Presentation
                    </h4>
                    <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
                      <iframe
                        src={getYoutubeEmbedUrl(blog.youtube_url)!}
                        title={blog.title}
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                {/* Social Share & Link Copy */}
                <div className="gq-share-bar">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>Share article:</span>
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${blog.title} - Read more on SchoolProfit: ${window.location.href}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gq-share-btn"
                    >
                      <i className="bi bi-whatsapp text-success" /> WhatsApp
                    </a>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(window.location.href)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gq-share-btn"
                    >
                      <i className="bi bi-twitter-x" /> Share
                    </a>
                  </div>

                  <button type="button" onClick={handleCopyLink} className="gq-share-btn">
                    <i className={copied ? "bi bi-check2 text-success" : "bi bi-link-45deg"} />
                    {copied ? "Link Copied!" : "Copy Link"}
                  </button>
                </div>

                {/* Navigation Back */}
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                  <Link to="/" className="text-decoration-none fw-bold text-primary d-inline-flex align-items-center gap-1.5" style={{ fontSize: "14px" }}>
                    ← Back to SchoolProfit Homepage
                  </Link>
                  <a href="#more-articles" className="text-decoration-none fw-bold text-secondary" style={{ fontSize: "14px" }}>
                    Explore More Insights ↓
                  </a>
                </div>

                {/* SchoolProfit Conversion Callout */}
                <div className="gq-cta-card">
                  <span className="badge px-3 py-1.5 mb-2" style={{ background: "#FBBF24", color: "#0F2744", fontWeight: 800, fontSize: "12px" }}>
                    Transform Your School
                  </span>
                  <h3 className="fw-bold mb-2 text-white" style={{ fontSize: "22px" }}>
                    Ready to modernize your academic & financial operations?
                  </h3>
                  <p className="text-white-50 mb-4" style={{ fontSize: "14.5px", maxWidth: "520px", margin: "0 auto 20px auto" }}>
                    Join hundreds of leading schools already using SchoolProfit for computerized report cards, instant fee collection, and offline CBT exams.
                  </p>
                  <div className="d-flex justify-content-center gap-3 flex-wrap">
                    <Link to="/register" className="btn btn-warning fw-bold px-4 py-2.5 text-dark" style={{ borderRadius: "10px" }}>
                      Get Started Free →
                    </Link>
                    <Link to="/book-demo" className="btn btn-outline-light fw-bold px-4 py-2.5" style={{ borderRadius: "10px" }}>
                      Book a Live Demo
                    </Link>
                  </div>
                </div>
              </article>
            </main>

            {/* Related Articles Section */}
            {relatedBlogs.length > 0 && (
              <section id="more-articles" className="py-5" style={{ background: "#F1F5F9", borderTop: "1px solid #E2E8F0" }}>
                <div className="container" style={{ maxWidth: "1080px" }}>
                  <div className="text-center mb-4">
                    <span style={{ color: "#D97706", fontWeight: 800, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Related Insights
                    </span>
                    <h3 className="fw-bold text-dark mb-0" style={{ fontSize: "24px" }}>
                      More Articles You May Like
                    </h3>
                  </div>

                  <div className="row g-4 justify-content-center">
                    {relatedBlogs.map((item) => (
                      <div key={item.id} className="col-12 col-md-6 col-lg-4">
                        <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: "14px", overflow: "hidden", transition: "transform 0.2s ease" }}>
                          {item.thumbnail ? (
                            <img src={item.thumbnail_url || `/${item.thumbnail}`} alt={item.title} style={{ height: "160px", objectFit: "cover", width: "100%" }} />
                          ) : (
                            <div style={{ height: "160px", background: "linear-gradient(135deg, #0F2744 0%, #1E3A8A 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FBBF24" }}>
                              <i className="bi bi-journal-text fs-1" />
                            </div>
                          )}
                          <div className="card-body p-3.5 d-flex flex-column">
                            <span className="badge bg-light text-primary align-self-start mb-2 fw-bold" style={{ fontSize: "11px" }}>
                              {item.category || "General"}
                            </span>
                            <h5 className="card-title fw-bold text-dark mb-2" style={{ fontSize: "16px", lineHeight: "1.4" }}>
                              {item.title}
                            </h5>
                            <p className="card-text text-muted flex-grow-1" style={{ fontSize: "13px", lineHeight: "1.5" }}>
                              {item.excerpt ? item.excerpt.slice(0, 100) + "..." : "Discover key insights and best practices in school administration."}
                            </p>
                            <Link to={`/blog/${item.slug}`} className="fw-bold text-primary text-decoration-none mt-2 d-inline-flex align-items-center gap-1" style={{ fontSize: "13px" }}>
                              Read Article →
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        <Footer />
      </div>
    </>
  );
}
