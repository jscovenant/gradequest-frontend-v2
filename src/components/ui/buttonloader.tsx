import ClipLoader from "react-spinners/ClipLoader";

export default function SubmitButton({ loading }) {
  return (
    <button className="btn btn-primary d-flex align-items-center gap-2" disabled={loading}>
      {loading && <ClipLoader size={18} color="#fff" />}
      {loading ? "Processing..." : "Submit"}
    </button>
  );
}
