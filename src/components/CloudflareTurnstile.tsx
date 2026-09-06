import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: (error?: any) => void;
          action?: string;
          size?: "normal" | "compact" | "flexible";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export interface CloudflareTurnstileRef {
  reset: () => void;
}

interface CloudflareTurnstileProps {
  siteKey?: string;
  onVerify?: (token: string) => void;
  onSuccess?: (token: string) => void;
  onExpire?: () => void;
  onError?: (error?: any) => void;
  theme?: "light" | "dark" | "auto";
  action?: string;
  className?: string;
}

const DEFAULT_TEST_SITE_KEY = "1x00000000000000000000AA"; // Cloudflare official testing sitekey

export const CloudflareTurnstile = forwardRef<CloudflareTurnstileRef, CloudflareTurnstileProps>(
  (
    {
      siteKey = import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY || DEFAULT_TEST_SITE_KEY,
      onVerify,
      onSuccess,
      onExpire,
      onError,
      theme = "light",
      action = "login",
      className = "",
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [scriptFailed, setScriptFailed] = useState(false);

    const renderWidget = () => {
      if (!containerRef.current || widgetIdRef.current) return;
      if (!window.turnstile || typeof window.turnstile.render !== "function") return;

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          action,
          size: "normal",
          callback: (token: string) => {
            onVerify?.(token);
            onSuccess?.(token);
          },
          "expired-callback": () => {
            onExpire?.();
          },
          "error-callback": (err?: any) => {
            console.warn("Turnstile verification error:", err);
            onError?.(err);
          },
        });
      } catch (e) {
        console.warn("Turnstile render error:", e);
      }
    };

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.reset(widgetIdRef.current);
          } catch {
            // ignore
          }
        }
      },
    }));

    useEffect(() => {
      let isMounted = true;
      let checkInterval: any = null;

      const initTurnstile = () => {
        if (window.turnstile && typeof window.turnstile.render === "function") {
          renderWidget();
          return;
        }

        // Poll for window.turnstile up to 4 seconds
        let attempts = 0;
        checkInterval = setInterval(() => {
          attempts++;
          if (window.turnstile && typeof window.turnstile.render === "function") {
            clearInterval(checkInterval);
            if (isMounted) renderWidget();
          } else if (attempts > 40) {
            clearInterval(checkInterval);
            if (isMounted) setScriptFailed(true);
          }
        }, 100);
      };

      const existingScript = document.getElementById("cf-turnstile-script");

      if (window.turnstile) {
        initTurnstile();
      } else if (!existingScript) {
        const script = document.createElement("script");
        script.id = "cf-turnstile-script";
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (isMounted) initTurnstile();
        };
        script.onerror = () => {
          if (isMounted) setScriptFailed(true);
        };
        document.head.appendChild(script);
      } else {
        initTurnstile();
      }

      return () => {
        isMounted = false;
        if (checkInterval) clearInterval(checkInterval);
        if (window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // ignore
          }
          widgetIdRef.current = null;
        }
      };
    }, [siteKey]);

    if (scriptFailed) {
      return null;
    }

    return (
      <div className={`cf-turnstile-wrap ${className}`} style={{ minHeight: 65, margin: "12px 0", display: "flex", justifyContent: "center" }}>
        <div ref={containerRef} />
      </div>
    );
  }
);

CloudflareTurnstile.displayName = "CloudflareTurnstile";
export default CloudflareTurnstile;