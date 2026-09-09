import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { usePlatformInfo } from "../../hooks/usePlatformInfo";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Why SchoolProfit", href: "#why-schoolprofit" },
  { label: "Our Schools", href: "#schools" },
  { label: "Pricing", href: "#pricing" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Blog", href: "#blog" },
  { label: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const { whatsappLink } = usePlatformInfo();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeLink, setActive] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  /* Scroll detection */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Active section tracking */
  useEffect(() => {
    const ids = NAV_LINKS.map((l) => l.href.slice(1)).filter(Boolean);
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActive(visible[0].target.id);
      },
      { threshold: 0.25 }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  /* Close menu on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  /* Lock body scroll when mobile drawer is open */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,800;1,600&display=swap');

        :root {
          --gq-nav-bg-scrolled: rgba(255, 255, 255, 0.96);
          --gq-nav-bg-top: rgba(255, 255, 255, 0.92);
          --gq-nav-navy: #0F2744;
          --gq-nav-gold: #D97706;
          --gq-nav-gold-light: #F59E0B;
          --gq-nav-cobalt: #1D4ED8;
          --gq-nav-text: #0F172A;
          --gq-nav-muted: #64748B;
          --gq-nav-border: rgba(15, 39, 68, 0.08);
        }

        /* ── Base Navigation Bar ── */
        .gq-navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1100;
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          transition: background 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      padding 0.3s ease;
          padding-top: max(12px, env(safe-area-inset-top));
          padding-bottom: 12px;
        }

        .gq-navbar--top {
          background: var(--gq-nav-bg-top);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--gq-nav-border);
        }

        .gq-navbar--scrolled {
          background: var(--gq-nav-bg-scrolled);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(15, 39, 68, 0.12);
          box-shadow: 0 4px 24px rgba(15, 39, 68, 0.07);
          padding-top: max(10px, env(safe-area-inset-top));
          padding-bottom: 10px;
        }

        .gq-nav-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: nowrap;
          width: 100%;
          box-sizing: border-box;
        }

        @media (max-width: 640px) {
          .gq-nav-container {
            padding: 0 16px;
          }
        }

        /* ── Logo ── */
        .gq-logo-link {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          user-select: none;
          flex-shrink: 0;
        }

        .gq-logo-badge {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #0F2744 0%, #1E3A8A 100%);
          border: 1px solid rgba(217, 119, 6, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(15, 39, 68, 0.18);
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
          transition: transform 0.25s ease, border-color 0.25s ease;
        }

        .gq-logo-badge::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 30% 20%, rgba(217, 119, 6, 0.25), transparent 70%);
        }

        .gq-logo-link:hover .gq-logo-badge {
          transform: scale(1.05);
          border-color: var(--gq-nav-gold);
        }

        .gq-logo-img {
          width: 26px;
          height: 26px;
          object-fit: contain;
          position: relative;
          z-index: 1;
          display: block;
        }

        .gq-logo-text-block {
          display: flex;
          flex-direction: column;
        }

        .gq-brand-name {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 19px;
          font-weight: 800;
          color: #0F2744;
          letter-spacing: -0.02em;
          line-height: 1.1;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .gq-brand-name span {
          color: #D97706;
          background: linear-gradient(135deg, #D97706, #B45309);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .gq-brand-tagline {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #64748B;
        }

        /* ── Desktop Links ── */
        .gq-nav-links {
          display: flex;
          align-items: center;
          gap: 2px;
          list-style: none;
          padding: 0;
          margin: 0;
          flex-shrink: 1;
        }

        @media (max-width: 1040px) {
          .gq-nav-links,
          .gq-nav-actions-desktop {
            display: none !important;
          }
          .gq-nav-hamburger {
            display: flex !important;
          }
        }

        .gq-nav-item {
          display: inline-block;
        }

        .gq-nav-item a {
          display: inline-block;
          padding: 7px 12px;
          font-size: 13.5px;
          font-weight: 600;
          color: #475569;
          text-decoration: none;
          border-radius: 8px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .gq-nav-item a:hover {
          color: #0F2744;
          background: rgba(15, 39, 68, 0.05);
        }

        .gq-nav-item a.active {
          color: #1D4ED8;
          background: rgba(29, 78, 216, 0.07);
          font-weight: 700;
        }

        /* ── Actions Desktop ── */
        .gq-nav-actions-desktop {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .gq-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 15px;
          font-size: 13px;
          font-weight: 600;
          color: #0F2744;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 9px;
          text-decoration: none;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(15, 39, 68, 0.05);
          white-space: nowrap;
        }

        .gq-btn-ghost:hover {
          color: #1D4ED8;
          border-color: #CBD5E1;
          background: #F8FAFC;
          transform: translateY(-1px);
        }

        .gq-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 18px;
          font-size: 13.5px;
          font-weight: 700;
          color: #FFFFFF;
          background: linear-gradient(135deg, #0F2744 0%, #1E3A8A 100%);
          border-radius: 9px;
          text-decoration: none;
          box-shadow: 0 4px 14px rgba(15, 39, 68, 0.2);
          transition: all 0.25s ease;
          border: 1px solid rgba(255, 255, 255, 0.1);
          white-space: nowrap;
        }

        .gq-btn-primary:hover {
          color: #FFFFFF;
          background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.3);
          transform: translateY(-1px);
        }

        /* ── Hamburger ── */
        .gq-nav-hamburger {
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 5px;
          width: 40px;
          height: 40px;
          padding: 0;
          border-radius: 10px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .gq-hamburger-line {
          width: 20px;
          height: 2px;
          background: #0F2744;
          border-radius: 99px;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .gq-nav-hamburger--open .gq-hamburger-line:nth-child(1) {
          transform: translateY(7px) rotate(45deg);
        }
        .gq-nav-hamburger--open .gq-hamburger-line:nth-child(2) {
          opacity: 0;
          transform: scaleX(0);
        }
        .gq-nav-hamburger--open .gq-hamburger-line:nth-child(3) {
          transform: translateY(-7px) rotate(-45deg);
        }

        /* ── Mobile Drawer ── */
        .gq-drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(4px);
          z-index: 1200;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }

        .gq-drawer-backdrop--open {
          opacity: 1;
          pointer-events: auto;
        }

        .gq-mobile-drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: min(340px, 85vw);
          background: #FFFFFF;
          border-left: 1px solid #E2E8F0;
          z-index: 1250;
          display: flex;
          flex-direction: column;
          transform: translateX(100%);
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: -10px 0 35px rgba(15, 39, 68, 0.15);
        }

        .gq-mobile-drawer--open {
          transform: translateX(0);
        }

        .gq-drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 22px;
          border-bottom: 1px solid #F1F5F9;
        }

        .gq-drawer-close {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .gq-drawer-body {
          flex: 1;
          padding: 18px 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .gq-drawer-nav-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94A3B8;
          margin-bottom: 6px;
        }

        .gq-drawer-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          font-size: 14px;
          font-weight: 600;
          color: #1E293B;
          text-decoration: none;
          border-radius: 8px;
          transition: all 0.15s ease;
        }

        .gq-drawer-link:hover,
        .gq-drawer-link.active {
          background: #F1F5F9;
          color: #1D4ED8;
        }

        .gq-drawer-footer {
          padding: 18px 20px;
          border-top: 1px solid #F1F5F9;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .gq-drawer-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          font-size: 14px;
          font-weight: 700;
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .gq-drawer-btn--primary {
          background: linear-gradient(135deg, #0F2744 0%, #1E3A8A 100%);
          color: #FFFFFF;
          box-shadow: 0 4px 14px rgba(15, 39, 68, 0.15);
        }

        .gq-drawer-btn--secondary {
          background: #F8FAFC;
          color: #0F2744;
          border: 1px solid #E2E8F0;
        }

        .gq-drawer-whatsapp {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 12.5px;
          font-weight: 600;
          color: #059669;
          text-decoration: none;
          margin-top: 4px;
        }
      `}</style>

      {/* ── Fixed Navigation Bar ── */}
      <nav
        className={`gq-navbar ${scrolled ? "gq-navbar--scrolled" : "gq-navbar--top"}`}
        aria-label="Main SchoolProfit navigation"
      >
        <div className="gq-nav-container">
          {/* Brand Logo */}
          <Link to="/" className="gq-logo-link" aria-label="SchoolProfit Homepage">
            <div className="gq-logo-badge" style={{ background: "transparent", border: "none", boxShadow: "none" }}>
              <img
                src="/media/logo/schoolprofit-logo.svg"
                alt="SchoolProfit Logo"
                className="gq-logo-img"
                style={{ width: "auto", height: "38px", objectFit: "contain" }}
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                }}
              />
            </div>
            <div className="gq-logo-text-block">
              <div className="gq-brand-name">
                School<span style={{ color: "#059669" }}>Profit</span>
              </div>
              <span className="gq-brand-tagline">Growth &amp; Profit OS</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <ul className="gq-nav-links" role="list">
            {NAV_LINKS.map((item) => (
              <li key={item.href} className="gq-nav-item">
                <a
                  href={item.href}
                  className={activeLink === item.href.slice(1) ? "active" : ""}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Desktop Call to Actions */}
          <div className="gq-nav-actions-desktop">
            <a
              href="https://web.facebook.com/profile.php?id=61585446674333"
              target="_blank"
              rel="noopener noreferrer"
              className="gq-btn-ghost"
              style={{ padding: "8px 12px", color: "#1877F2" }}
              aria-label="SchoolProfit Facebook Page"
              title="Follow SchoolProfit on Facebook"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3V2z" />
              </svg>
            </a>
            <Link to="/check-result" className="gq-btn-ghost">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.2">
                <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Check Result
            </Link>
            <Link to="/login" className="gq-btn-primary">
              Portal Sign In
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 7h12M7 1l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            className={`gq-nav-hamburger ${menuOpen ? "gq-nav-hamburger--open" : ""}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            <span className="gq-hamburger-line" />
            <span className="gq-hamburger-line" />
            <span className="gq-hamburger-line" />
          </button>
        </div>
      </nav>

      {/* ── Mobile Drawer Backdrop ── */}
      <div
        className={`gq-drawer-backdrop ${menuOpen ? "gq-drawer-backdrop--open" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      {/* ── Mobile Navigation Drawer ── */}
      <div
        ref={menuRef}
        className={`gq-mobile-drawer ${menuOpen ? "gq-mobile-drawer--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Menu"
      >
        <div className="gq-drawer-header">
          <div className="gq-brand-name" style={{ fontSize: 18 }}>
            School<span style={{ color: "#059669" }}>Profit</span>
          </div>
          <button
            className="gq-drawer-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="gq-drawer-body">
          <div className="gq-drawer-nav-label">Explore System</div>
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`gq-drawer-link ${activeLink === item.href.slice(1) ? "active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              <span>{item.label}</span>
              <span className="gq-drawer-link-arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </a>
          ))}

          <div className="gq-drawer-nav-label" style={{ marginTop: 16 }}>Partnership</div>
          <Link
            to="/sales-representative/register"
            className="gq-drawer-link"
            onClick={() => setMenuOpen(false)}
          >
            <span style={{ color: "#D97706", fontWeight: 700 }}>💼 Become a Sales Partner (30%)</span>
            <span className="gq-drawer-link-arrow">→</span>
          </Link>

          <div className="gq-drawer-nav-label" style={{ marginTop: 16 }}>Student & Parent Portals</div>
          <Link
            to="/check-result"
            className="gq-drawer-link"
            onClick={() => setMenuOpen(false)}
          >
            <span>📜 Check Term Result / PIN</span>
            <span className="gq-drawer-link-arrow">→</span>
          </Link>
        </div>

        <div className="gq-drawer-footer">
          <Link
            to="/login"
            className="gq-drawer-btn gq-drawer-btn--primary"
            onClick={() => setMenuOpen(false)}
          >
            School Portal Sign In
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 7h12M7 1l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <Link
            to="/book-demo"
            className="gq-drawer-btn gq-drawer-btn--secondary"
            onClick={() => setMenuOpen(false)}
          >
            Book a Free Demo
          </Link>
          <a
            href={whatsappLink("Hello SchoolProfit, I want to learn more about your school software")}
            target="_blank"
            rel="noopener noreferrer"
            className="gq-drawer-whatsapp"
          >
            <span>💬 Chat on WhatsApp with an Expert</span>
          </a>
          <a
            href="https://web.facebook.com/profile.php?id=61585446674333"
            target="_blank"
            rel="noopener noreferrer"
            className="gq-drawer-facebook"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "11px 16px",
              background: "#1877F2",
              color: "#FFFFFF",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "13.5px",
              textDecoration: "none",
              marginTop: "8px",
              boxShadow: "0 2px 8px rgba(24, 119, 242, 0.25)",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3V2z" />
            </svg>
            <span>Follow Us on Facebook</span>
          </a>
        </div>
      </div>
    </>
  );
}
