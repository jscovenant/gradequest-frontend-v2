import Loader from "./dashboardLoader";

export default function AppLoader({ role }: { role: string }) {
  const label = role && role !== "User" ? `${role} workspace` : "Secure workspace";
  return <Loader eyebrow={label} message="Preparing your dashboard…" />;
}
