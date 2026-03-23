/* ── Full-screen splash loader ── */
export default function AppLoader({ role }: { role: string }) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=DM+Sans:wght@300;400&display=swap');

        :root {
          --dl-dark:   var(--bs-dark,      #050008);
          --dl-accent: var(--bs-secondary, rgb(255,200,87));
          --dl-light:  var(--bs-light,     #fcf8f8);
        }

        .dl-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: var(--dl-dark);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 28px;
          animation: dlFadeIn .18s ease both;
        }
        @keyframes dlFadeIn { from { opacity: 0 } to { opacity: 1 } }

        /* Dot grid texture — same as hero sections */
        .dl-overlay::before {
          content: ''; position: absolute; inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,.045) 1px, transparent 1px);
          background-size: 24px 24px; pointer-events: none;
        }
        /* Amber glow */
        .dl-glow {
          position: absolute; top: -80px; right: -80px;
          width: 420px; height: 420px; border-radius: 50%;
          background: radial-gradient(circle, rgba(255,200,87,.09) 0%, transparent 65%);
          pointer-events: none;
        }
        /* Magenta glow */
        .dl-glow2 {
          position: absolute; bottom: -60px; left: 20%;
          width: 300px; height: 300px; border-radius: 50%;
          background: radial-gradient(circle, rgba(211,0,176,.06) 0%, transparent 70%);
          pointer-events: none;
        }

        .dl-content {
          position: relative; z-index: 1;
          display: flex; flex-direction: column; align-items: center; gap: 20px;
        }

        /* Spinner ring */
        .dl-ring {
          width: 52px; height: 52px; border-radius: 50%;
          border: 3px solid rgba(255,200,87,.18);
          border-top-color: var(--dl-accent);
          animation: dlSpin .8s linear infinite;
        }
        @keyframes dlSpin { to { transform: rotate(360deg) } }

        /* Logo mark — small amber square with magenta dot */
        .dl-mark {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
          width: 22px; height: 22px; border-radius: 6px;
          background: rgba(255,200,87,.12);
          display: flex; align-items: center; justify-content: center;
        }
        .dl-mark-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--dl-accent);
          box-shadow: 0 0 8px rgba(255,200,87,.5);
        }

        .dl-label {
          font-family: 'Playfair Display', serif;
          font-size: 17px; font-weight: 700; color: #fff;
          letter-spacing: .01em;
        }
        .dl-label em { font-style: italic; color: var(--dl-accent); }

        .dl-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px; font-weight: 300;
          color: rgba(255,255,255,.28);
          letter-spacing: .08em; text-transform: uppercase;
        }

        /* Progress bar */
        .dl-bar-track {
          width: 160px; height: 3px;
          background: rgba(255,255,255,.07);
          border-radius: 999px; overflow: hidden;
        }
        .dl-bar-fill {
          height: 3px;
          background: linear-gradient(90deg, var(--dl-accent), #ffe0a0);
          border-radius: 999px;
          animation: dlBar 1.2s cubic-bezier(.4,0,.2,1) forwards;
        }
        @keyframes dlBar { from { width: 0% } to { width: 92% } }

        /* Fade out when done */
        .dl-overlay--out {
          animation: dlFadeOut .3s ease forwards;
        }
        @keyframes dlFadeOut { from { opacity: 1 } to { opacity: 0; pointer-events: none } }
      `}</style>

      <div className="dl-overlay">
        <div className="dl-glow"  aria-hidden="true" />
        <div className="dl-glow2" aria-hidden="true" />

        <div className="dl-content">
          {/* Spinner + mark */}
          <div style={{ position: "relative", width: 52, height: 52 }}>
            <div className="dl-ring" />
            <div className="dl-mark"><div className="dl-mark-dot" /></div>
          </div>

          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
            <div className="dl-label">
              Loading <em>{role}</em> Dashboard
            </div>
            <div className="dl-sub">GradeQuest · Please wait</div>
          </div>

          <div className="dl-bar-track">
            <div className="dl-bar-fill" />
          </div>
        </div>
      </div>
    </>
  );
}