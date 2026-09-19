import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';

interface BlogItem {
  id: number;
  title: string;
  slug: string;
  category: string;
  excerpt?: string | null;
  created_at?: string | null;
}

const DEFAULT_ARTICLES: BlogItem[] = [
  {
    id: 991,
    title: '5 Proven Strategies to Achieve 95%+ School Fees Collection On Time',
    slug: 'proven-strategies-school-fees-collection',
    category: 'Fee Governance',
    excerpt:
      'Discover how automated WhatsApp billing reminders, installment plans, and instant Monnify/Paystack reconciliation help school owners recover unpaid term fees effortlessly.',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 992,
    title: 'How Offline CBT Exams Eliminate Paper Waste and Protect Academic Integrity',
    slug: 'offline-cbt-exams-school-management',
    category: 'CBT & Testing',
    excerpt:
      'Transition your termly examinations to computer-based testing without needing expensive campus internet bandwidth or subscription downtime.',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 993,
    title: 'Why High-Performing Schools Are Switching to Digital Report Cards & Scratch PINs',
    slug: 'digital-report-cards-scratch-pins-schools',
    category: 'Academic Operations',
    excerpt:
      'Eliminate manual transcript errors and provide parents 24/7 online portal access with customizable, tamper-proof SchoolProfit result templates.',
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
];

export default function BlogSection() {
  const [blogs, setBlogs] = useState<BlogItem[]>(DEFAULT_ARTICLES);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await api.get('/frontend-blogs');
        if (res.data?.status && Array.isArray(res.data?.data) && res.data.data.length > 0) {
          setBlogs(res.data.data.slice(0, 3));
        }
      } catch {
        // Fallback initialized
      }
    };
    fetchBlogs();
  }, []);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Recent';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 'Recent';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <section id="blog" className="sp-blog-section">
      <style>{`
        .sp-blog-section {
          background-color: #F8FAFC;
          padding: 100px 0 110px;
          position: relative;
          overflow: hidden;
          border-top: 1px solid #E2E8F0;
        }

        .sp-blog-container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .sp-blog-header {
          text-align: center;
          max-width: 760px;
          margin: 0 auto 60px;
        }

        .sp-blog-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 999px;
          background: #EFF6FF;
          border: 1px solid #BFDBFE;
          color: #1D4ED8;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .sp-blog-title {
          font-size: clamp(28px, 3.8vw, 44px);
          font-weight: 800;
          color: #0A192F;
          line-height: 1.2;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
        }

        .sp-blog-title span {
          color: #D97706;
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .sp-blog-desc {
          font-size: 16px;
          line-height: 1.7;
          color: #64748B;
          margin: 0;
        }

        /* ── 3 Column Grid ── */
        .sp-blog-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
        }

        @media (max-width: 1024px) {
          .sp-blog-grid {
            grid-template-columns: 1fr;
            max-width: 500px;
            margin: 0 auto;
          }
        }

        .sp-blog-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 16px rgba(10, 25, 47, 0.04);
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
        }

        .sp-blog-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 36px rgba(10, 25, 47, 0.08);
          border-color: #CBD5E1;
        }

        .sp-blog-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .sp-blog-cat {
          font-size: 11.5px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          background: #FEF3C7;
          color: #B45309;
        }

        .sp-blog-date {
          font-size: 12px;
          color: #94A3B8;
          font-weight: 600;
        }

        .sp-blog-heading {
          font-size: 18px;
          font-weight: 800;
          color: #0A192F;
          line-height: 1.4;
          margin-bottom: 12px;
        }

        .sp-blog-excerpt {
          font-size: 14px;
          line-height: 1.6;
          color: #64748B;
          margin-bottom: 24px;
          flex: 1;
        }

        .sp-blog-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13.5px;
          font-weight: 800;
          color: #1D4ED8;
          text-decoration: none;
          margin-top: auto;
          transition: gap 0.2s ease;
        }

        .sp-blog-link:hover {
          gap: 10px;
          color: #0A192F;
        }
      `}</style>

      <div className="sp-blog-container">
        <div className="sp-blog-header">
          <div className="sp-blog-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span>Educational Insights & Best Practices</span>
          </div>
          <h2 className="sp-blog-title">
            Actionable Strategies for <span>School Growth</span>
          </h2>
          <p className="sp-blog-desc">
            Expert articles and case studies to guide proprietors on digital transformation and bursary financial health.
          </p>
        </div>

        <div className="sp-blog-grid">
          {blogs.map((b) => (
            <div key={b.id} className="sp-blog-card">
              <div className="sp-blog-meta">
                <span className="sp-blog-cat">{b.category || 'School Leadership'}</span>
                <span className="sp-blog-date">{formatDate(b.created_at)}</span>
              </div>
              <h3 className="sp-blog-heading">{b.title}</h3>
              <p className="sp-blog-excerpt">{b.excerpt}</p>
              <Link to={`/blog/${b.slug || b.id}`} className="sp-blog-link">
                <span>Read Full Guide</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
