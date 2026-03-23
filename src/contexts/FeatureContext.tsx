import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { authApi } from "../utils/axios";
import { getToken } from "../utils/token"; // or however you store token

type FeatureState = {
  loading: boolean;
  features: string[];
  can: (featureKey?: string) => boolean;
  refresh: () => Promise<void>;
};

const FeatureContext = createContext<FeatureState | null>(null);

const PUBLIC_PATHS = new Set(["/", "/login", "/register", "/check-result", "/unauthorized"]);

export function FeatureProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [features, setFeatures] = useState<string[]>([]);

  const load = async () => {
    const token = getToken?.(); // must return null/undefined when not logged in
    const isPublic = PUBLIC_PATHS.has(location.pathname);

    if (!token || isPublic) {
      setLoading(false);
      setFeatures([]);
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.get("/user/features");
      const list: string[] = Array.isArray(res.data?.features) ? res.data.features : [];
      setFeatures(list.map((x) => String(x).trim()).filter(Boolean));
    } catch (e) {
      // IMPORTANT: do not redirect here. just fail closed.
      setFeatures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // reload when route changes (optional)
  }, [location.pathname]);

  const featureSet = useMemo(() => new Set(features), [features]);

  const value = useMemo<FeatureState>(
    () => ({
      loading,
      features,
      refresh: load,
      can: (featureKey?: string) => {
        if (!featureKey) return true;
        if (loading) return false;
        return featureSet.has(featureKey);
      },
    }),
    [loading, features, featureSet]
  );

  return <FeatureContext.Provider value={value}>{children}</FeatureContext.Provider>;
}

export function useFeatures() {
  const ctx = useContext(FeatureContext);
  if (!ctx) throw new Error("useFeatures must be used inside <FeatureProvider />");
  return ctx;
}