export default function SubmitButton({ loading }: { loading: boolean }) {
  return (
    <button className="btn btn-primary d-flex align-items-center justify-content-center gap-2" disabled={loading} aria-busy={loading}>
      {loading && <span className="gq-button-spinner" aria-hidden="true" />}
      <style>{`
        .gq-button-spinner { width:16px; height:16px; border-radius:50%; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; animation:gq-button-spin .7s linear infinite; }
        @keyframes gq-button-spin { to { transform:rotate(360deg); } }
      `}</style>
      {loading ? "Processing…" : "Submit"}
    </button>
  );
}
