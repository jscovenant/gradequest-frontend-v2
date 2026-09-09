// src/components/common/PageTitle.tsx
import { useEffect } from "react";

interface PageTitleProps {
  title: string;
  suffix?: string;
}

export default function PageTitle({
  title,
  suffix = "SchoolProfit",
}: PageTitleProps) {
  useEffect(() => {
    document.title = title ? `${title} | ${suffix}` : suffix;

    return () => {
      document.title = suffix;
    };
  }, [title, suffix]);

  return null;
}