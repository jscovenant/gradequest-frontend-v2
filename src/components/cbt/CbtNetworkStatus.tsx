import { useEffect, useRef, useState } from "react";

interface CbtNetworkStatusProps {
  pingUrl?: string;
  serverLabel?: string;
  isHostServer?: boolean;
  onStatusChange?: (connected: boolean) => void;
}

export default function CbtNetworkStatus({
  pingUrl = "/offline-cbt/ping",
  serverLabel = "CBT Server",
  isHostServer = false,
  onStatusChange,
}: CbtNetworkStatusProps) {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());
  const failCountRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    async function checkConnection() {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (isMounted) {
          setIsConnected(false);
          setLatencyMs(null);
          onStatusChange?.(false);
        }
        return;
      }

      const start = performance.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2800);

        // Resolve absolute or relative URL
        const targetUrl = pingUrl.startsWith("http")
          ? pingUrl
          : `${window.location.origin}${pingUrl.startsWith("/") ? "" : "/"}${pingUrl}`;

        const res = await fetch(targetUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const end = performance.now();
          failCountRef.current = 0;
          if (isMounted) {
            setIsConnected(true);
            setLatencyMs(Math.round(end - start));
            setLastCheckTime(new Date());
            onStatusChange?.(true);
          }
        } else {
          throw new Error("Bad status");
        }
      } catch {
        failCountRef.current += 1;
        // Only mark disconnected after 1 confirmed failed check
        if (failCountRef.current >= 1 && isMounted) {
          setIsConnected(false);
          setLatencyMs(null);
          setLastCheckTime(new Date());
          onStatusChange?.(false);
        }
      }
    }

    // Immediate check
    void checkConnection();

    // Listen to browser network hardware events
    const handleOnline = () => {
      void checkConnection();
    };
    const handleOffline = () => {
      setIsConnected(false);
      onStatusChange?.(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Heartbeat every 3.5 seconds
    const interval = setInterval(checkConnection, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [pingUrl, onStatusChange]);

  return (
    <>
      <style>{`
        .cbt-net-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 18px;
          border-radius: 12px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 700;
          transition: all 0.3s ease;
          border: 1px solid transparent;
        }
        .cbt-net-bar.connected {
          background: #ecfdf5;
          border-color: #a7f3d0;
          color: #065f46;
        }
        .cbt-net-bar.disconnected {
          background: #fef2f2;
          border-color: #fecaca;
          color: #991b1b;
          animation: pulseBorder 2s infinite;
        }
        .cbt-net-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .cbt-net-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
          flex-shrink: 0;
        }
        .cbt-net-indicator.connected {
          background: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
          animation: greenPulse 2s infinite;
        }
        .cbt-net-indicator.disconnected {
          background: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.3);
          animation: redPulse 1.2s infinite;
        }
        .cbt-net-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 3px 10px;
          border-radius: 999px;
        }
        .cbt-net-badge.connected {
          background: #d1fae5;
          color: #047857;
        }
        .cbt-net-badge.disconnected {
          background: #fee2e2;
          color: #b91c1c;
        }
        .cbt-net-warning-banner {
          background: linear-gradient(135deg, #b91c1c, #dc2626);
          color: #ffffff;
          padding: 12px 18px;
          border-radius: 12px;
          margin-bottom: 16px;
          box-shadow: 0 4px 16px rgba(220, 38, 38, 0.25);
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13.5px;
          font-weight: 700;
          animation: slideDown 0.3s ease;
        }
        @keyframes greenPulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
          70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        @keyframes redPulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
          70% { box-shadow: 0 0 0 7px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes slideDown {
          from { transform: translateY(-8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* STICKY CONNECTION LOST WARNING BANNER */}
      {!isConnected && (
        <div className="cbt-net-warning-banner">
          <i className="bi bi-wifi-off fs-5" />
          <div style={{ flex: 1 }}>
            <strong>Connection Lost:</strong> This computer is currently disconnected from the CBT server.
            Please verify that your Wi-Fi or LAN cable is connected to the same network as the server.
            Any answers you have already selected are safely stored and will synchronize once reconnected.
          </div>
        </div>
      )}

      {/* TOP HEADER NETWORK STATUS INDICATOR */}
      <div className={`cbt-net-bar ${isConnected ? "connected" : "disconnected"}`}>
        <div className="cbt-net-left">
          <span className={`cbt-net-indicator ${isConnected ? "connected" : "disconnected"}`} />
          <span>
            {isConnected ? (
              <>
                <strong>{isHostServer ? "Host Server Active" : `Connected to ${serverLabel}`}</strong>
                {latencyMs !== null && (
                  <span className="text-muted ms-2" style={{ fontSize: 11.5 }}>
                    ({latencyMs}ms latency)
                  </span>
                )}
                <span className="ms-2 d-none d-md-inline" style={{ color: "#059669", fontSize: 12 }}>
                  • Same Network Verified
                </span>
              </>
            ) : (
              <>
                <strong>Not Connected</strong> — Cannot reach {serverLabel}
                <span className="ms-2 d-none d-md-inline" style={{ color: "#b91c1c", fontSize: 12 }}>
                  (Check local Wi-Fi or network cable)
                </span>
              </>
            )}
          </span>
        </div>

        <div>
          <span className={`cbt-net-badge ${isConnected ? "connected" : "disconnected"}`}>
            <i className={`bi ${isConnected ? "bi-wifi" : "bi-wifi-off"}`} />
            {isConnected ? "Connected" : "Not Connected"}
          </span>
        </div>
      </div>
    </>
  );
}
