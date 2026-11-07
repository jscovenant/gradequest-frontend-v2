import React from "react";
import StudentCbtClientPage from "./StudentCbtClientPage";
import OfflineCbtServerPage from "./OfflineCbtServerPage";

/**
 * Offline CBT Dispatcher:
 * - /cbt/offline-runner (default): GradeQuest Student CBT (Student Client Application)
 * - /cbt/offline-runner?app=server or /cbt/offline-server: GradeQuest Offline CBT (Server Runner Application)
 */
export default function OfflineCbtRunnerPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const isServer =
    searchParams.get("app") === "server" ||
    searchParams.get("server") === "1" ||
    window.location.pathname.includes("/cbt/offline-server");

  if (isServer) {
    return <OfflineCbtServerPage />;
  }

  return <StudentCbtClientPage />;
}
