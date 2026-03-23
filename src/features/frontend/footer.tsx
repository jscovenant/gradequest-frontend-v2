/**
 * Footer.tsx — wired to Bootstrap Sass variables
 *
 * Color hierarchy (no riot):
 *   $dark   (#050008)  → footer bg, dot grid, all surfaces           [~85%]
 *   $secondary (amber) → logo-mark gradient, nav headings, badge
 *                        icons, social hover, newsletter btn,
 *                        gradient rule, top glow                     [~10%]
 *   $primary (magenta) → intentionally absent from footer:
 *                        magenta is only used as italic colour on
 *                        light backgrounds; on $dark it reads harsh  [0%]
 *   white alphas       → all text, borders, muted states             [text]
 *
 * Bootstrap classes used:
 *   Layout:  container-xl, row, col-6, col-md-4, col-lg-3, col-lg-9
 *   Display: d-flex, flex-column, flex-wrap, align-items-*,
 *            justify-content-between
 *   Spacing: gap-2/3/4/5, mb-3/4, mt-auto, py-4/5
 *   Misc:    position-relative, h-100
 */

const NAV_LINKS = {
  Product: [
    { label: "Student Management",   href: "#features" },
    { label: "Results & PIN System",  href: "#features" },
    { label: "School Fees Tracking",  href: "#features" },
    { label: "AI Monitoring",         href: "#features" },
    { label: "Analytics",             href: "#features" },
    { label: "Parent Portal",         href: "#features" },
  ],
  Company: [
    { label: "About Us",      href: "#" },
    { label: "Our Schools",   href: "#schools" },
    { label: "Pricing",       href: "#pricing" },
    { label: "Testimonials",  href: "#testimonials" },
    { label: "Blog",          href: "#" },
    { label: "Careers",       href: "#" },
  ],
  Support: [
    { label: "Help Centre",      href: "#" },
    { label: "Book a Demo",      href: "#" },
    { label: "WhatsApp Support", href: "#" },
    { label: "System Status",    href: "#" },
    { label: "Privacy Policy",   href: "#" },
    { label: "Terms of Service", href: "#" },
  ],
};

const SOCIALS = [
  {
    label: "Twitter / X",
    href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 4l16 16M4 20L20 4" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M7 10v7M7 7v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M12 17v-4a2 2 0 014 0v4M12 10v7" stroke="currentColor" strokeWidth="1.6"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "WhatsApp",
    href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.6"/>
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>
      </svg>
    ),
  },
];

const TRUST_BADGES = [
  {
    label: "99.9% uptime SLA",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 2l2 4h4l-3 2.6 1.2 4L8 10.3 3.8 12.6 5 8.6 2 6h4z"
          stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "End-to-end encrypted",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 2l5 2v4c0 3.5-2.5 6-5 7C5.5 14 3 11.5 3 8V4l5-2z"
          stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        <path d="M5.5 8l2 2 3-3" stroke="currentColor" strokeWidth="1.3"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Daily automated backups",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M13 8A5 5 0 113 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M13 4v4h-4" stroke="currentColor" strokeWidth="1.3"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "NDPR compliant",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.3"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500&display=swap');

        /*
         * Token bridge — Bootstrap compiles your Sass vars to these.
         * Fallbacks ensure it works regardless of BS CSS var emission.
         */
        :root {
          --ft-dark:    var(--bs-dark,      #050008);
          --ft-accent:  var(--bs-secondary, rgb(255,200,87));  /* amber — $secondary */

          /* $primary (magenta) deliberately unused in footer:
             magenta = italic accent on light backgrounds only.
             At full-opacity on a $dark surface it would be garish. */

          --ft-slate:   rgba(255,255,255,0.32);
          --ft-muted:   rgba(255,255,255,0.18);
          --ft-border:  rgba(255,255,255,0.06);
          --ft-surface: rgba(255,255,255,0.04);

          --ft-accent-glow:   rgba(255,200,87,0.06);
          --ft-accent-border: rgba(255,200,87,0.22);
          --ft-accent-dim:    rgba(255,200,87,0.10);
        }

        /* ── Wave from FAQ linen (#f7f3ed) ── */
        .ft-wave {
          display: block;
          width: 100%;
          overflow: hidden;
          line-height: 0;
          background: #f7f3ed;
        }
        .ft-wave svg { display: block; width: 100%; height: 56px; }

        /* ── Footer shell ── */
        .ft-footer {
          background: var(--ft-dark);
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* Fine dot grid — same as hero/pricing dark sections */
        .ft-footer::before {
          content: '';
          position: absolute; inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
          z-index: 0;
        }

        /* Amber top glow — $secondary, ties to hero/pricing glow pattern */
        .ft-footer::after {
          content: '';
          position: absolute;
          top: -60px; left: 50%;
          transform: translateX(-50%);
          width: 800px; height: 300px;
          border-radius: 50%;
          background: radial-gradient(ellipse, var(--ft-accent-glow) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .ft-z { position: relative; z-index: 1; }

        /* ── Top band border ── */
        .ft-top { border-bottom: 1px solid var(--ft-border); }

        /* Logo */
        .ft-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .ft-logo-mark {
          width: 36px; height: 36px;
          border-radius: 9px;
          /* Amber gradient — $secondary, matches hero SVG badge gradient */
          background: linear-gradient(135deg, var(--ft-accent), #ffe0a0);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ft-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.01em;
        }

        .ft-tagline {
          font-size: 14px;
          font-weight: 300;
          color: var(--ft-slate);
          line-height: 1.75;
          max-width: 280px;
        }

        /* Social icon buttons */
        .ft-social-btn {
          width: 36px; height: 36px;
          border-radius: 8px;
          background: var(--ft-surface);
          border: 1px solid var(--ft-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.25);
          text-decoration: none;
          transition: background .2s, color .2s, border-color .2s, transform .2s;
        }
        .ft-social-btn:hover {
          background: var(--ft-accent-dim);
          border-color: var(--ft-accent-border);
          color: var(--ft-accent);          /* amber on hover — $secondary */
          transform: translateY(-2px);
        }

        /* Nav column headings — amber ($secondary) at small text scale, won't riot */
        .ft-nav-heading {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ft-accent);
          display: block;
        }

        .ft-nav-list {
          list-style: none;
          padding: 0; margin: 0;
          display: flex;
          flex-direction: column;
          gap: 11px;
        }
        .ft-nav-list a {
          font-size: 13.5px;
          font-weight: 300;
          color: var(--ft-slate);
          text-decoration: none;
          transition: color .2s;
        }
        .ft-nav-list a:hover { color: rgba(255,255,255,0.85); }

        /* ── Trust band ── */
        .ft-trust { border-bottom: 1px solid var(--ft-border); }

        .ft-badge {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 13px;
          font-weight: 300;
          color: rgba(255,255,255,0.25);
        }
        .ft-badge-icon {
          width: 30px; height: 30px;
          border-radius: 7px;
          background: var(--ft-surface);
          border: 1px solid var(--ft-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ft-accent);          /* amber icons — $secondary */
          flex-shrink: 0;
        }

        /* Newsletter input */
        .ft-newsletter-label {
          font-size: 12px;
          font-weight: 400;
          color: rgba(255,255,255,0.25);
          white-space: nowrap;
        }
        .ft-newsletter-input {
          background: var(--ft-surface);
          border: 1px solid rgba(255,255,255,0.09);
          border-right: none;
          border-radius: 7px 0 0 7px;
          padding: 9px 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #e2e8f0;
          outline: none;
          width: 200px;
          transition: border-color .2s;
        }
        .ft-newsletter-input::placeholder { color: rgba(255,255,255,0.18); }
        .ft-newsletter-input:focus { border-color: var(--ft-accent-border); }

        /* Newsletter CTA — amber, consistent with all primary CTAs */
        .ft-newsletter-btn {
          padding: 9px 16px;
          background: var(--ft-accent);
          color: var(--ft-dark);
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          border: none;
          border-radius: 0 7px 7px 0;
          cursor: pointer;
          transition: background .2s;
          white-space: nowrap;
        }
        .ft-newsletter-btn:hover { background: #ffe0a0; }

        @media (max-width: 760px) { .ft-newsletter-wrap { display: none !important; } }

        /* ── Gradient rule — amber thread ── */
        .ft-rule {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,200,87,0.20), transparent);
          border: none;
          margin: 0;
        }

        /* ── Bottom bar ── */
        .ft-copy {
          font-size: 12.5px;
          font-weight: 300;
          color: var(--ft-muted);
          line-height: 1.6;
        }
        .ft-copy a { color: rgba(255,255,255,0.22); text-decoration: none; transition: color .2s; }
        .ft-copy a:hover { color: rgba(255,255,255,0.5); }

        .ft-bottom-links a {
          font-size: 12px;
          font-weight: 300;
          color: var(--ft-muted);
          text-decoration: none;
          transition: color .2s;
        }
        .ft-bottom-links a:hover { color: rgba(255,255,255,0.5); }

        .ft-origin {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 400;
          color: var(--ft-muted);
        }
      `}</style>

      {/* Wave from FAQ linen section */}
      <div className="ft-wave">
        <svg viewBox="0 0 1440 56" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0,8 C240,56 480,0 720,24 C960,48 1200,12 1440,28 L1440,56 L0,56 Z"
            fill="var(--ft-dark, #050008)"
          />
        </svg>
      </div>

      <footer className="ft-footer" aria-label="Site footer">
        <div className="ft-z container-xl">

          {/* ── Top: brand + nav ── */}
          <div className="ft-top py-5">
            <div className="row g-5">

              {/* Brand column */}
              <div className="col-12 col-lg-3">
                <div className="d-flex flex-column h-100">
                  <a href="#" className="ft-logo mb-4" aria-label="GradeQuest home">
                    <span className="ft-logo-mark" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <polygon points="12,2 22,19 2,19"
                          stroke="var(--ft-dark)" strokeWidth="1.8"
                          strokeLinejoin="round" fill="none"/>
                        <path d="M12 8v5M12 15.5v.5"
                          stroke="var(--ft-dark)" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </span>
                    <span className="ft-logo-text">GradeQuest</span>
                  </a>

                  <p className="ft-tagline mb-4">
                    The school management platform built for Nigerian institutions —
                    from results to fees to analytics.
                  </p>

                  {/* Socials — Bootstrap gap utility */}
                  <div className="d-flex gap-2 mt-auto">
                    {SOCIALS.map(s => (
                      <a key={s.label} href={s.href}
                        className="ft-social-btn" aria-label={s.label}>
                        {s.icon}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nav columns — Bootstrap grid */}
              <div className="col-12 col-lg-9">
                <nav aria-label="Footer navigation">
                  <div className="row g-4">
                    {Object.entries(NAV_LINKS).map(([heading, links]) => (
                      <div key={heading} className="col-6 col-md-4">
                        <span className="ft-nav-heading mb-3">{heading}</span>
                        <ul className="ft-nav-list">
                          {links.map(link => (
                            <li key={link.label}>
                              <a href={link.href}>{link.label}</a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </nav>
              </div>

            </div>
          </div>

          {/* ── Trust band ── */}
          <div className="ft-trust py-4 d-flex align-items-center justify-content-between flex-wrap gap-4">

            <div className="d-flex flex-wrap gap-4">
              {TRUST_BADGES.map(b => (
                <span key={b.label} className="ft-badge">
                  <span className="ft-badge-icon">{b.icon}</span>
                  {b.label}
                </span>
              ))}
            </div>

            {/* Newsletter — hidden on mobile */}
            <div className="ft-newsletter-wrap d-flex align-items-center gap-3">
              <span className="ft-newsletter-label">School updates →</span>
              <div className="d-flex">
                <input
                  type="email"
                  className="ft-newsletter-input"
                  placeholder="Your email address"
                  aria-label="Subscribe to GradeQuest updates"
                />
                <button className="ft-newsletter-btn">Subscribe</button>
              </div>
            </div>

          </div>

          {/* Amber gradient rule */}
          <hr className="ft-rule" />

          {/* ── Bottom bar ── */}
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 py-4">

            <p className="ft-copy mb-0">
              © {year} GradeQuest. All rights reserved.
              Built with care for Nigerian schools.
            </p>

            <span className="ft-origin" aria-label="Made in Nigeria">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <rect x="1"  y="4" width="6" height="12" rx="1" fill="#008751"/>
                <rect x="7"  y="4" width="6" height="12"        fill="#ffffff"/>
                <rect x="13" y="4" width="6" height="12" rx="1" fill="#008751"/>
              </svg>
              Made in Nigeria
            </span>

            <div className="ft-bottom-links d-flex flex-wrap gap-4">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Cookies</a>
              <a href="#">Sitemap</a>
            </div>

          </div>

        </div>
      </footer>
    </>
  );
}