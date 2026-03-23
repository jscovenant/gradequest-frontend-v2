import { Link } from "react-router";
import { useEffect, useRef, useState } from "react";

/**
 * Navbar.tsx — wired to Bootstrap Sass variables
 *
 * Color hierarchy (no riot):
 *   $dark   (#050008)  → scrolled bg, drawer bg, all surfaces        [~85%]
 *   $secondary (amber) → logo mark gradient, progress bar, active
 *                        link, active dot, primary CTA btn, drawer
 *                        active state, logo pill, scroll glow         [~10%]
 *   $primary (magenta) → absent from navbar (dark context throughout;
 *                        magenta reserved for light-bg italic text)   [0%]
 *   white alphas       → link text, borders, ghost buttons            [text]
 *
 * Bootstrap classes used:
 *   Layout:  container-xl (nb-inner still custom — fixed nav needs tight control)
 *   Display: d-flex, align-items-center, justify-content-between, flex-shrink-0
 *   Spacing: gap-2/3
 *   Misc:    position-fixed (via .nb)
 *
 * Note: Most layout stays custom-CSS — fixed navbars with scroll-state
 * transitions are one case where Bootstrap's navbar component would
 * add more overrides than it saves. We wire only the colour tokens.
 */

const NAV_LINKS = [
  { label: "Features",     href: "#features" },
  { label: "Schools",      href: "#schools" },
  { label: "Pricing",      href: "#pricing" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "FAQ",          href: "#faq" },
];

export default function Navbar() {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [activeLink, setActive]   = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  /* Scroll detection */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Active section via IntersectionObserver */
  useEffect(() => {
    const ids = NAV_LINKS.map(l => l.href.slice(1));
    const sections = ids.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!sections.length) return;

    const io = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length) setActive(visible[0].target.id);
      },
      { threshold: 0.3 }
    );
    sections.forEach(s => io.observe(s));
    return () => io.disconnect();
  }, []);

  /* Close menu on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  /* Lock body scroll when menu open */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500&display=swap');

        /*
         * Token bridge — Bootstrap compiles your Sass vars to these.
         * Fallbacks ensure it works regardless of BS CSS var emission.
         */
        :root {
          --nb-dark:    var(--bs-dark,      #050008);
          --nb-accent:  var(--bs-secondary, rgb(255,200,87));   /* amber — $secondary */
          /* $primary (magenta) intentionally absent:
             navbar is always on a dark bg (transparent or $dark blur).
             Magenta on dark = too harsh; amber handles all signalling. */

          --nb-border:  rgba(255,255,255,0.07);
          --nb-surface: rgba(255,255,255,0.05);
          --nb-muted:   rgba(255,255,255,0.62);

          --nb-accent-dim:    rgba(255,200,87,0.10);
          --nb-accent-border: rgba(255,200,87,0.25);
          --nb-accent-glow:   rgba(255,200,87,0.30);
        }

        /* ── Base nav ── */
        .nb {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 1000;
          font-family: 'DM Sans', sans-serif;
          transition: background .35s ease, box-shadow .35s ease, padding .35s ease;
          padding: 22px 0;
        }

        /* Transparent when at top */
        .nb--top { background: transparent; }

        /* Solid + blur once scrolled — $dark bg with blur */
        .nb--scrolled {
          background: rgba(5,0,8,0.90);   /* $dark at 90% */
          backdrop-filter: blur(18px) saturate(1.4);
          -webkit-backdrop-filter: blur(18px) saturate(1.4);
          box-shadow: 0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.28);
          padding: 14px 0;
        }

        /* Amber scroll progress bar — $secondary */
        .nb-progress {
          position: absolute;
          bottom: 0; left: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--nb-accent), #ffe0a0);
          transition: width 0.1s linear;
          border-radius: 0 2px 2px 0;
        }

        .nb-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 40px;
        }
        @media (max-width: 640px) { .nb-inner { padding: 0 20px; } }

        /* ── Logo ── */
        .nb-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          flex-shrink: 0;
        }
        .nb-logo-mark {
          width: 34px; height: 34px;
          border-radius: 9px;
          /* Amber gradient — $secondary, matches footer + hero badge */
          background: linear-gradient(135deg, var(--nb-accent) 0%, #ffe0a0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform .25s cubic-bezier(.34,1.56,.64,1);
        }
        .nb-logo:hover .nb-logo-mark { transform: rotate(-6deg) scale(1.08); }

        .nb-logo-name {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 19px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.01em;
          line-height: 1;
        }

        /* "AI" pill — amber tint, consistent with logo-mark colour */
        .nb-logo-pill {
          font-size: 9.5px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--nb-accent);
          background: var(--nb-accent-dim);
          border: 1px solid var(--nb-accent-border);
          border-radius: 100px;
          padding: 2px 7px;
          line-height: 1.4;
        }

        /* ── Desktop nav links ── */
        .nb-links {
          display: flex;
          align-items: center;
          gap: 2px;
          list-style: none;
          padding: 0; margin: 0;
        }
        @media (max-width: 860px) {
          .nb-links  { display: none; }
          .nb-actions { display: none; }
        }

        .nb-link {
          position: relative;
          padding: 7px 14px;
          font-size: 14px;
          font-weight: 400;
          color: var(--nb-muted);
          text-decoration: none;
          border-radius: 6px;
          transition: color .2s, background .2s;
          white-space: nowrap;
          letter-spacing: 0.01em;
        }
        .nb-link:hover {
          color: rgba(255,255,255,0.95);
          background: var(--nb-surface);
        }

        /* Active = amber — $secondary, small text won't riot */
        .nb-link--active {
          color: var(--nb-accent) !important;
          background: var(--nb-accent-dim) !important;
        }

        /* Active underline dot — amber ($secondary) */
        .nb-link::after {
          content: '';
          position: absolute;
          bottom: 4px; left: 50%;
          transform: translateX(-50%);
          width: 3px; height: 3px;
          border-radius: 50%;
          background: var(--nb-accent);
          opacity: 0;
          transition: opacity .2s;
        }
        .nb-link--active::after { opacity: 1; }

        /* ── Desktop action buttons ── */
        .nb-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        /* Ghost — white border on dark, consistent with hero ghost */
        .nb-btn-ghost {
          display: inline-flex;
          align-items: center;
          padding: 8px 18px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 400;
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 7px;
          transition: color .2s, border-color .2s, background .2s;
          white-space: nowrap;
        }
        .nb-btn-ghost:hover {
          color: #ffffff;
          border-color: rgba(255,255,255,0.3);
          background: var(--nb-surface);
        }

        /* Primary CTA — amber ($secondary), universal CTA colour */
        .nb-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 20px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--nb-dark);
          background: var(--nb-accent);
          border-radius: 7px;
          text-decoration: none;
          transition: background .2s, transform .2s, box-shadow .2s;
          white-space: nowrap;
        }
        .nb-btn-primary:hover {
          background: #ffe0a0;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px var(--nb-accent-glow);
        }

        /* ── Hamburger toggle ── */
        .nb-toggle {
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 5px;
          width: 38px; height: 38px;
          background: var(--nb-surface);
          border: 1px solid var(--nb-border);
          border-radius: 8px;
          cursor: pointer;
          padding: 0;
          transition: background .2s, border-color .2s;
          flex-shrink: 0;
        }
        .nb-toggle:hover {
          background: rgba(255,255,255,0.09);
          border-color: rgba(255,255,255,0.16);
        }
        @media (max-width: 860px) { .nb-toggle { display: flex; } }

        .nb-bar {
          display: block;
          width: 18px; height: 1.5px;
          background: rgba(255,255,255,0.8);
          border-radius: 2px;
          transition: transform .3s ease, opacity .3s ease;
          transform-origin: center;
        }
        .nb-toggle--open .nb-bar:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
        .nb-toggle--open .nb-bar:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .nb-toggle--open .nb-bar:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }

        /* ── Mobile drawer overlay ── */
        .nb-drawer-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          z-index: 998;
          opacity: 0; pointer-events: none;
          transition: opacity .3s ease;
        }
        .nb-drawer-overlay--open { opacity: 1; pointer-events: all; }

        /* ── Mobile drawer ── */
        .nb-drawer {
          position: fixed;
          top: 0; right: 0; bottom: 0;
          width: 300px;
          background: var(--nb-dark);       /* $dark — consistent with scrolled nav bg */
          border-left: 1px solid var(--nb-border);
          z-index: 999;
          transform: translateX(100%);
          transition: transform .35s cubic-bezier(.4,0,.2,1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .nb-drawer--open { transform: translateX(0); }

        .nb-drawer-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--nb-border);
          flex-shrink: 0;
        }

        .nb-drawer-close {
          width: 32px; height: 32px;
          background: var(--nb-surface);
          border: 1px solid var(--nb-border);
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: rgba(255,255,255,0.6);
          transition: background .2s, color .2s;
        }
        .nb-drawer-close:hover { background: rgba(255,255,255,0.1); color: #ffffff; }

        .nb-drawer-nav {
          flex: 1;
          overflow-y: auto;
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        /* Drawer links — staggered entrance */
        .nb-drawer-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          font-size: 15px;
          font-weight: 400;
          color: rgba(255,255,255,0.65);
          text-decoration: none;
          border-radius: 8px;
          opacity: 0;
          transform: translateX(12px);
          transition: background .2s, color .2s, opacity .3s ease, transform .3s ease;
          letter-spacing: 0.01em;
        }
        .nb-drawer-link:hover {
          background: var(--nb-surface);
          color: #ffffff;
        }
        /* Active = amber — consistent with desktop active state */
        .nb-drawer-link--active {
          color: var(--nb-accent) !important;
          background: var(--nb-accent-dim) !important;
        }
        .nb-drawer--open .nb-drawer-link {
          opacity: 1;
          transform: translateX(0);
        }
        ${NAV_LINKS.map((_, i) => `
          .nb-drawer--open .nb-drawer-link:nth-child(${i + 1}) {
            transition-delay: ${0.05 + i * 0.04}s;
          }
        `).join("")}

        .nb-drawer-link-arrow { color: rgba(255,255,255,0.2); transition: color .2s; }
        .nb-drawer-link:hover .nb-drawer-link-arrow { color: rgba(255,255,255,0.5); }
        .nb-drawer-link--active .nb-drawer-link-arrow { color: rgba(255,200,87,0.5); }

        .nb-drawer-footer {
          padding: 20px 16px 32px;
          border-top: 1px solid var(--nb-border);
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex-shrink: 0;
        }

        /* Drawer ghost — white ghost, consistent with desktop + FAQ ghost */
        .nb-drawer-btn-ghost {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: rgba(255,255,255,0.65);
          text-decoration: none;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          transition: background .2s, color .2s;
        }
        .nb-drawer-btn-ghost:hover { background: var(--nb-surface); color: #ffffff; }

        /* Drawer primary — amber ($secondary), universal CTA */
        .nb-drawer-btn-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 13px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: var(--nb-dark);
          background: var(--nb-accent);
          border-radius: 8px;
          text-decoration: none;
          transition: background .2s;
        }
        .nb-drawer-btn-primary:hover { background: #ffe0a0; }
      `}</style>

      {/* ── Navbar ── */}
      <nav
        className={`nb ${scrolled ? "nb--scrolled" : "nb--top"}`}
        aria-label="Main navigation"
      >
        <ScrollProgress />

        <div className="nb-inner">

          {/* Logo */}
          <a href="#" className="nb-logo" aria-label="GradeQuest home">
            <span className="nb-logo-mark" aria-hidden="true">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <polygon points="12,2 22,19 2,19"
                  stroke="var(--nb-dark)" strokeWidth="2"
                  strokeLinejoin="round" fill="none"/>
                <path d="M12 8v5M12 15.5v.5"
                  stroke="var(--nb-dark)" strokeWidth="2.2"
                  strokeLinecap="round"/>
              </svg>
            </span>
            <span className="nb-logo-name">GradeQuest</span>
            <span className="nb-logo-pill">AI</span>
          </a>

          {/* Desktop links */}
          <ul className="nb-links" role="list">
            {NAV_LINKS.map(link => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={`nb-link ${activeLink === link.href.slice(1) ? "nb-link--active" : ""}`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Desktop actions */}
          <div className="nb-actions d-flex align-items-center gap-2">
         
               <Link to="/book-demo" className="nb-btn-ghost">
             Live Demo
             
            </Link>
            <Link to="/login" className="nb-btn-primary">
              Sign In
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M1 7h12M7 1l6 6-6 6"
                  stroke="currentColor" strokeWidth="1.7"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className={`nb-toggle ${menuOpen ? "nb-toggle--open" : ""}`}
            onClick={() => setMenuOpen(v => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            <span className="nb-bar" />
            <span className="nb-bar" />
            <span className="nb-bar" />
          </button>

        </div>
      </nav>

      {/* ── Mobile drawer overlay ── */}
      <div
        className={`nb-drawer-overlay ${menuOpen ? "nb-drawer-overlay--open" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      {/* ── Mobile drawer ── */}
      <div
        ref={menuRef}
        className={`nb-drawer ${menuOpen ? "nb-drawer--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Drawer header */}
        <div className="nb-drawer-head">
          <a href="#" className="nb-logo" aria-label="GradeQuest home"
            onClick={() => setMenuOpen(false)}>
            <span className="nb-logo-mark" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <polygon points="12,2 22,19 2,19"
                  stroke="var(--nb-dark)" strokeWidth="2"
                  strokeLinejoin="round" fill="none"/>
                <path d="M12 8v5M12 15.5v.5"
                  stroke="var(--nb-dark)" strokeWidth="2.2"
                  strokeLinecap="round"/>
              </svg>
            </span>
            <span className="nb-logo-name" style={{ fontSize: 17 }}>GradeQuest</span>
          </a>
          <button
            className="nb-drawer-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Drawer links */}
        <nav className="nb-drawer-nav" aria-label="Mobile navigation">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              className={`nb-drawer-link ${activeLink === link.href.slice(1) ? "nb-drawer-link--active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
              <span className="nb-drawer-link-arrow" aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M1 7h12M7 1l6 6-6 6"
                    stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </a>
          ))}
        </nav>

        {/* Drawer footer CTAs */}
        <div className="nb-drawer-footer">
          <a href="#demo" className="nb-drawer-btn-ghost"
            onClick={() => setMenuOpen(false)}>
            Watch Live Demo
          </a>
          <Link to="/login" className="nb-drawer-btn-primary"
            onClick={() => setMenuOpen(false)}>
            Sign In to Dashboard
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 7h12M7 1l6 6-6 6"
                stroke="currentColor" strokeWidth="1.7"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </div>
    </>
  );
}

/* ── Scroll progress bar ── */
function ScrollProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setPct(total > 0 ? (scrolled / total) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pct < 1) return null;

  return (
    <div
      className="nb-progress"
      style={{ width: `${pct}%` }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page scroll progress"
    />
  );
}