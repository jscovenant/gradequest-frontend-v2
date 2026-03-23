import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authApi } from "../utils/axios";
import { getOnboardingStatus } from "../auth/activationApi";
import AppLoader from "../components/ui/AppLoader";

type User = {
  id: number;
  role?: string;
};

export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState("User");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const userRes = await authApi.get<User>("/user-profile");
        const user = userRes.data;

        const userRole = user.role || "User";
        const admin = userRole === "Admin";

        if (!mounted) return;

        setRole(userRole);
        setIsAdmin(admin);

        if (!admin) {
          setNeedsOnboarding(false);
          setLoading(false);
          return;
        }

        const s = await getOnboardingStatus();
        const complete = !!s.bonus_given;

        if (mounted) {
          setNeedsOnboarding(!complete);
        }
      } catch {
        if (mounted) {
          setNeedsOnboarding(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <AppLoader role={role} />;
  }

  if (isAdmin && needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}