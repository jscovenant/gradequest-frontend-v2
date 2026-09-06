import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../utils/api";

interface BlogItem {
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

const DEFAULT_FEATURED_ARTICLES: BlogItem[] = [
  {
    id: 991,
    title: "5 Proven Strategies to Achieve 95%+ School Fees Collection On Time",
    slug: "proven-strategies-school-fees-collection",
    category: "Fee Management",
    excerpt:
      "Discover how automated WhatsApp billing reminders, installment plans, and instant Monnify/Paystack reconciliation help school owners recover unpaid term fees effortlessly.",
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    thumbnail_url: "/images/blog/blog-fees-collection.jpg",
  },
  {
    id: 992,
    title: "How Offline CBT Exams Eliminate Paper Waste and Protect Academic Integrity",
    slug: "offline-cbt-exams-school-management",
    category: "CBT & Exams",
    excerpt:
      "Transition your termly examinations to computer-based testing without needing expensive campus internet bandwidth or subscription downtime.",
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    thumbnail_url: "/images/blog/blog-cbt-exams.jpg",
  },
  {
    id: 993,
    title: "Why High-Performing Schools Are Switching to Digital Report Cards & Scratch PINs",
    slug: "digital-report-cards-scratch-pins-schools",
    category: "Academic Operations",
    excerpt:
      "Eliminate manual transcript errors and provide parents 24/7 online portal access with customizable, tamper-proof GradiosEdu result templates.",
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    thumbnail_url: "/images/blog/blog-digital-report-cards.jpg",
  },
];

export default function BlogSection() {
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await api.get("/frontend-blogs");
        if (res.data?.status && Array.isArray(res.data?.data) && res.data.data.length > 0) {
          setBlogs(res.data.data.slice(0, 3));
        } else {
          setBlogs(DEFAULT_FEATURED_ARTICLES);
        }
      } catch {
        setBlogs(DEFAULT_FEATURED_ARTICLES);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Recent";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "Recent";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getCategoryColor = (cat?: string) => {
    const c = (cat || "").toLowerCase();
    if (c.includes("fee")) return { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" };
    if (c.includes("cbt") || c.includes("exam")) return { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE" };
    if (c.includes("operat") || c.includes("acad")) return { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" };
    return { bg: "#F3F4F6", text: "#374151", border: "#E5E7EB" };
  };

  return (
    <>
      <style>{`
        .gq-blog-sec {
          background: #FFFFFF;
          padding: 90px 20px;
          position: relative;
          overflow: hidden;
        }

        .gq-blog-sec::before {
          content: "";
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 80%;
          height: 1px;
          background: linear-gradient(90deg, transparent, #E2E8F0 20%, #E2E8F0 80%, transparent);
        }

        .gq-blog-kicker {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #FEF3C7;
          border: 1px solid #FDE68A;
          color: #B45309;
          font-size: 11.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 5px 14px;
          border-radius: 999px;
          margin-bottom: 14px;
        }

        .gq-blog-title {
          font-family: 'Playfair Display', 'Lora', serif;
          font-size: 36px;
          font-weight: 800;
          color: #0F2744;
          letter-spacing: -0.02em;
          margin-bottom: 14px;
        }

        @media (max-width: 768px) {
          .gq-blog-title {
            font-size: 28px;
          }
        }

        .gq-blog-sub {
          font-size: 15.5px;
          color: #64748B;
          max-width: 650px;
          margin: 0 auto 50px auto;
          line-height: 1.6;
        }

        .gq-blog-card {
          background: #FFFFFF;
          border-radius: 18px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 4px 20px -4px rgba(15, 39, 68, 0.05);
          display: flex;
          flex-direction: column;
          height: 100%;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
          text-decoration: none;
        }

        .gq-blog-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 36px -8px rgba(15, 39, 68, 0.12);
          border-color: #CBD5E1;
        }

        .gq-blog-thumb-wrap {
          height: 200px;
          width: 100%;
          position: relative;
          background: linear-gradient(135deg, #0F2744 0%, #1E3A8A 100%);
          overflow: hidden;
        }

        .gq-blog-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }

        .gq-blog-card:hover .gq-blog-thumb-img {
          transform: scale(1.05);
        }

        .gq-blog-thumb-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FBBF24;
          background: radial-gradient(circle at center, #1E3A8A 0%, #0F2744 100%);
        }

        .gq-blog-body {
          padding: 24px 24px 20px 24px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }

        .gq-blog-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          font-size: 12.5px;
          color: #94A3B8;
        }

        .gq-blog-cat-pill {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 3px 10px;
          border-radius: 999px;
          border-width: 1px;
          border-style: solid;
        }

        .gq-blog-card-title {
          font-size: 18px;
          font-weight: 800;
          color: #0F2744;
          line-height: 1.4;
          margin-bottom: 12px;
          transition: color 0.2s ease;
        }

        .gq-blog-card:hover .gq-blog-card-title {
          color: #D97706;
        }

        .gq-blog-excerpt {
          font-size: 13.5px;
          line-height: 1.6;
          color: #64748B;
          flex-grow: 1;
          margin-bottom: 20px;
        }

        .gq-blog-footer {
          border-top: 1px solid #F1F5F9;
          padding-top: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 700;
          color: #D97706;
        }

        .gq-blog-explore-box {
          background: linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.9) 100%);
          border: 1px dashed #CBD5E1;
          border-radius: 16px;
          padding: 22px 28px;
          margin-top: 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
      `}</style>

      <section id="blog" className="gq-blog-sec">
        <div className="container" style={{ maxWidth: "1140px" }}>
          {/* Header */}
          <div className="text-center">
            <div className="gq-blog-kicker">
              <i className="bi bi-journal-bookmark-fill" /> Educational Insights & Updates
            </div>
            <h2 className="gq-blog-title">
              From Our Blog: <span>Modern School Leadership</span>
            </h2>
            <p className="gq-blog-sub">
              Actionable insights, fee collection strategies, computerized examination techniques, and administrative best practices from the GradiosEdu team.
            </p>
          </div>

          {/* Grid */}
          <div className="row g-4">
            {blogs.map((item) => {
              const catColors = getCategoryColor(item.category);
              const readUrl = `/blog/${item.slug}`;

              return (
                <div key={item.id} className="col-12 col-md-6 col-lg-4">
                  <Link to={readUrl} className="gq-blog-card">
                    <div className="gq-blog-thumb-wrap">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail_url || `/${item.thumbnail}`}
                          alt={item.title}
                          className="gq-blog-thumb-img"
                          loading="lazy"
                        />
                      ) : (
                        <div className="gq-blog-thumb-fallback">
                          <i className="bi bi-mortarboard fs-1 opacity-75" />
                        </div>
                      )}
                    </div>

                    <div className="gq-blog-body">
                      <div className="gq-blog-meta">
                        <span
                          className="gq-blog-cat-pill"
                          style={{
                            background: catColors.bg,
                            color: catColors.text,
                            borderColor: catColors.border,
                          }}
                        >
                          {item.category || "Insight"}
                        </span>
                        <span>•</span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>

                      <h3 className="gq-blog-card-title">{item.title}</h3>

                      <p className="gq-blog-excerpt">
                        {item.excerpt
                          ? item.excerpt.length > 140
                            ? `${item.excerpt.slice(0, 140)}…`
                            : item.excerpt
                          : "Explore key school management techniques and educational leadership strategies."}
                      </p>

                      <div className="gq-blog-footer">
                        <span>Read Full Article</span>
                        <i className="bi bi-arrow-right" />
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Bottom Explore Banner */}
          <div className="gq-blog-explore-box">
            <div className="d-flex align-items-center gap-3">
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "#0F2744",
                  color: "#FBBF24",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  flexShrink: 0,
                }}
              >
                <i className="bi bi-envelope-check" />
              </div>
              <div>
                <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: "15px" }}>
                  Want new school management strategies delivered to your inbox?
                </h5>
                <p className="mb-0 text-muted" style={{ fontSize: "13px" }}>
                  Subscribe in the footer below for monthly product updates and administrator toolkits.
                </p>
              </div>
            </div>

            <a
              href="#footer-subscribe"
              className="btn btn-dark fw-bold px-3.5 py-2 d-inline-flex align-items-center gap-2"
              style={{ borderRadius: "8px", fontSize: "13px" }}
            >
              Subscribe Below ↓
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
