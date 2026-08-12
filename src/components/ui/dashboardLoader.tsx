interface LoaderProps {
  message?: string;
  eyebrow?: string;
}

export default function Loader({ message = "Loading…", eyebrow = "GradeQuest workspace" }: LoaderProps) {
  return (
    <div className="gql-overlay" role="status" aria-live="polite" aria-label={message}>
      <style>{`
        .gql-overlay {
          --gql-gold:#f3c969; --gql-ink:#07101f; --gql-blue:#60a5fa;
          position:fixed; inset:0; z-index:9999; display:grid; place-items:center;
          padding:24px; overflow:hidden; isolation:isolate;
          background:rgba(4,10,22,.74); backdrop-filter:blur(14px) saturate(120%);
          -webkit-backdrop-filter:blur(14px) saturate(120%); animation:gql-fade .22s ease-out both;
        }
        .gql-overlay::before { content:""; position:absolute; inset:-35%; z-index:-2;
          background:radial-gradient(circle at 35% 40%,rgba(59,130,246,.16),transparent 28%),
                     radial-gradient(circle at 68% 60%,rgba(243,201,105,.15),transparent 25%);
          animation:gql-aurora 8s ease-in-out infinite alternate; }
        .gql-overlay::after { content:""; position:absolute; inset:0; z-index:-1; opacity:.22;
          background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);
          background-size:42px 42px; mask-image:radial-gradient(circle,#000 10%,transparent 72%); }
        .gql-card { position:relative; width:min(390px,100%); padding:30px 30px 27px; overflow:hidden;
          border:1px solid rgba(255,255,255,.13); border-radius:26px;
          background:linear-gradient(145deg,rgba(18,30,52,.94),rgba(8,16,31,.96));
          box-shadow:0 32px 90px rgba(0,0,0,.46),inset 0 1px rgba(255,255,255,.08);
          animation:gql-rise .38s cubic-bezier(.2,.8,.2,1) both; }
        .gql-card::before { content:""; position:absolute; width:180px; height:180px; top:-110px; right:-65px;
          border-radius:50%; background:rgba(243,201,105,.12); filter:blur(35px); }
        .gql-brand { display:flex; align-items:center; gap:11px; position:relative; }
        .gql-logo { width:40px; height:40px; padding:7px; border-radius:12px; object-fit:contain;
          background:#fff; box-shadow:0 8px 24px rgba(0,0,0,.24); }
        .gql-brand-name { color:#fff; font-size:15px; font-weight:800; letter-spacing:.01em; }
        .gql-brand-tag { color:rgba(255,255,255,.42); font-size:10px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; margin-top:2px; }
        .gql-stage { display:grid; place-items:center; min-height:178px; position:relative; }
        .gql-orbit { position:relative; width:104px; height:104px; display:grid; place-items:center; }
        .gql-ring { position:absolute; inset:0; border-radius:50%; border:1px solid rgba(255,255,255,.09); }
        .gql-ring-one { border-top-color:var(--gql-gold); border-right-color:rgba(243,201,105,.38); animation:gql-spin 1.8s linear infinite; }
        .gql-ring-two { inset:12px; border-left-color:var(--gql-blue); animation:gql-spin 2.6s linear infinite reverse; }
        .gql-ring-three { inset:26px; background:radial-gradient(circle at 35% 30%,#fff,var(--gql-gold) 20%,#bb7c22 72%);
          border:0; box-shadow:0 0 0 8px rgba(243,201,105,.06),0 0 35px rgba(243,201,105,.34); animation:gql-breathe 1.8s ease-in-out infinite; }
        .gql-satellite { position:absolute; inset:-5px; animation:gql-spin 3.6s linear infinite; }
        .gql-satellite::after { content:""; position:absolute; left:50%; top:-2px; width:7px; height:7px; border-radius:50%;
          background:#fff; box-shadow:0 0 14px var(--gql-blue); }
        .gql-copy { position:relative; text-align:center; }
        .gql-eyebrow { color:var(--gql-gold); font-size:10px; font-weight:800; letter-spacing:.16em; text-transform:uppercase; }
        .gql-message { margin:7px 0 0; color:#f8fafc; font-size:16px; font-weight:700; letter-spacing:-.01em; }
        .gql-progress { height:4px; margin-top:20px; border-radius:999px; overflow:hidden; background:rgba(255,255,255,.07); }
        .gql-progress::after { content:""; display:block; width:42%; height:100%; border-radius:inherit;
          background:linear-gradient(90deg,transparent,var(--gql-blue),var(--gql-gold),transparent); animation:gql-slide 1.45s ease-in-out infinite; }
        .gql-foot { display:flex; justify-content:center; gap:5px; margin-top:14px; }
        .gql-foot span { width:4px; height:4px; border-radius:50%; background:rgba(255,255,255,.22); animation:gql-dot 1.2s ease-in-out infinite; }
        .gql-foot span:nth-child(2){animation-delay:.15s}.gql-foot span:nth-child(3){animation-delay:.3s}
        @keyframes gql-fade{from{opacity:0}to{opacity:1}} @keyframes gql-rise{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
        @keyframes gql-spin{to{transform:rotate(360deg)}} @keyframes gql-breathe{50%{transform:scale(.86);filter:brightness(1.12)}}
        @keyframes gql-slide{from{transform:translateX(-110%)}to{transform:translateX(340%)}} @keyframes gql-dot{50%{background:var(--gql-gold);transform:translateY(-3px)}}
        @keyframes gql-aurora{to{transform:translate3d(5%,3%,0) rotate(4deg)}}
        @media(max-width:480px){.gql-card{padding:24px 22px 23px;border-radius:22px}.gql-stage{min-height:160px}.gql-orbit{transform:scale(.9)}}
        @media(prefers-reduced-motion:reduce){.gql-overlay,.gql-card,.gql-overlay::before,.gql-ring,.gql-satellite,.gql-ring-three,.gql-progress::after,.gql-foot span{animation-duration:3s;animation-iteration-count:1}}
      `}</style>
      <section className="gql-card">
        <div className="gql-brand">
          <img className="gql-logo" src="/media/logo/gradequest-logo.png" alt="" />
          <div><div className="gql-brand-name">GradeQuest</div><div className="gql-brand-tag">School intelligence</div></div>
        </div>
        <div className="gql-stage" aria-hidden="true">
          <div className="gql-orbit">
            <span className="gql-ring gql-ring-one" /><span className="gql-ring gql-ring-two" />
            <span className="gql-ring gql-ring-three" /><span className="gql-satellite" />
          </div>
        </div>
        <div className="gql-copy"><div className="gql-eyebrow">{eyebrow}</div><p className="gql-message">{message}</p></div>
        <div className="gql-progress" aria-hidden="true" />
        <div className="gql-foot" aria-hidden="true"><span/><span/><span/></div>
      </section>
    </div>
  );
}
