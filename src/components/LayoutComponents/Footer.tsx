export default function Footer() {
  return (
    <footer
      className="fixed-bottom text-center text-muted py-2 bg-light"
      style={{
        zIndex: 1000,
      }}
    >
      © {new Date().getFullYear()} <strong>GradeQuest</strong> — Smart
      School Management System
    </footer>
  );
}
