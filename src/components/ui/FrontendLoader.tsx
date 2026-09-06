import { useEffect, useState } from "react";
import Loader from "./dashboardLoader";

const messages = [
  "Opening GradiosEdu…",
  "Preparing your experience…",
  "Almost ready…",
];

export default function FrontendLoader() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((current) => Math.min(current + 1, messages.length - 1));
    }, 650);

    return () => window.clearInterval(interval);
  }, []);

  return <Loader eyebrow="GradiosEdu platform" message={messages[messageIndex]} />;
}
