import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { acceptTerms, getOnboardingStatus } from "../auth/activationApi";
import { useToast } from "../contexts/ToastContext";

export default function TermsAcceptancePrompt() {
  const { showToast } = useToast();
  const [required, setRequired] = useState(false);
  const [version, setVersion] = useState("");
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    getOnboardingStatus().then((status) => {
      if (!mounted) return;
      setVersion(status.terms_version);
      setRequired(!status.terms_accepted);
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  if (!required) return null;

  const submit = async () => {
    if (!checked) return;
    setSaving(true);
    try {
      await acceptTerms();
      setRequired(false);
      showToast("Terms and Conditions accepted successfully.", "success");
    } catch (error: any) {
      showToast(error?.response?.data?.message || "Unable to record your acceptance. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="ta-banner" role="region" aria-labelledby="terms-acceptance-title">
      <style>{`
        .ta-banner { position:relative; margin:0 0 22px; padding:22px 24px; overflow:hidden; border:1px solid #f2ca72; border-radius:16px; background:linear-gradient(120deg,#fffaf0,#fff 58%,#f8fbff); box-shadow:0 10px 30px rgba(146,64,14,.08); }
        .ta-banner::after { content:""; position:absolute; width:180px; height:180px; right:-65px; top:-95px; border-radius:50%; background:rgba(245,158,11,.1); pointer-events:none; }
        .ta-layout { position:relative; z-index:1; display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:22px; }
        .ta-copy-wrap { display:flex; align-items:flex-start; gap:15px; }
        .ta-icon { width:44px; height:44px; flex:0 0 auto; display:grid; place-items:center; border-radius:13px; color:#92400e; background:#fef3c7; border:1px solid #f6d477; font-size:20px; }
        .ta-kicker { color:#b45309; font-size:10px; font-weight:900; letter-spacing:.14em; text-transform:uppercase; }
        .ta-title { margin:4px 0 5px; color:#172033; font-size:18px; font-weight:850; letter-spacing:-.02em; }
        .ta-copy { margin:0; color:#64748b; font-size:13px; line-height:1.6; max-width:720px; }
        .ta-action { min-width:300px; }
        .ta-check { display:flex; align-items:flex-start; gap:9px; color:#475569; font-size:12.5px; line-height:1.45; cursor:pointer; }
        .ta-check input { width:17px; height:17px; margin-top:1px; accent-color:#b45309; flex:0 0 auto; }
        .ta-check a { color:#92400e; font-weight:800; }
        .ta-button { width:100%; margin-top:11px; border:0; border-radius:9px; padding:11px 16px; background:#172033; color:#fff; font-size:13px; font-weight:800; transition:transform .18s ease,box-shadow .18s ease; }
        .ta-button:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 18px rgba(15,23,42,.18); }
        .ta-button:disabled { opacity:.5; cursor:not-allowed; }
        @media(max-width:900px){.ta-layout{grid-template-columns:1fr}.ta-action{min-width:0}.ta-banner{padding:19px}.ta-copy-wrap{gap:12px}}
      `}</style>
      <div className="ta-layout">
        <div className="ta-copy-wrap">
          <div className="ta-icon" aria-hidden="true"><i className="bi bi-shield-check" /></div>
          <div>
            <div className="ta-kicker">Action required</div>
            <h2 className="ta-title" id="terms-acceptance-title">Accept GradeQuest’s Terms and Conditions</h2>
            <p className="ta-copy">An authorized school administrator must accept the current agreement to keep the school’s GradeQuest account compliant.</p>
          </div>
        </div>
        <div className="ta-action">
          <label className="ta-check">
            <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
            <span>I am authorized to act for this school and accept the <Link to="/terms-and-conditions" target="_blank">Terms and Conditions</Link>{version ? ` (version ${version})` : ""}.</span>
          </label>
          <button className="ta-button" type="button" onClick={submit} disabled={!checked || saving}>
            {saving ? "Recording acceptance…" : "Accept terms"}
          </button>
        </div>
      </div>
    </section>
  );
}
