"use client";

import { useEffect, useState } from "react";

interface SplashScreenProps {
  onReady: () => void;
}

export default function SplashScreen({ onReady }: SplashScreenProps) {
  const [status, setStatus] = useState<"waking" | "ready">("waking");

  // If backend already confirmed alive this session, skip immediately
  useEffect(() => {
    if (sessionStorage.getItem("backend_ready") === "true") {
      onReady();
    }
  }, [onReady]);
  const [dots, setDots] = useState("");
  const [elapsed, setElapsed] = useState(0);

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll /health until backend responds
  useEffect(() => {
    let cancelled = false;

    const ping = async () => {
      try {
        const res = await fetch("https://urbanlens-api.onrender.com/health", {
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok && !cancelled) {
          sessionStorage.setItem("backend_ready", "true");
          setStatus("ready");
          setTimeout(onReady, 800); // brief "ready" flash before dismissing
        } else {
          if (!cancelled) setTimeout(ping, 4000);
        }
      } catch {
        if (!cancelled) setTimeout(ping, 4000);
      }
    };

    ping();
    return () => { cancelled = true; };
  }, [onReady]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#0a0a12",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "Inter, sans-serif",
      transition: "opacity 0.6s ease",
    }}>
      {/* Logo */}
      <div style={{
        width: "56px", height: "56px", borderRadius: "16px",
        background: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "22px", fontWeight: 700, color: "#fff",
        marginBottom: "20px", boxShadow: "0 0 40px rgba(108,92,231,0.3)",
      }}>U</div>

      <h1 style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-0.5px", marginBottom: "6px" }}>
        UrbanLens
      </h1>
      <p style={{ fontSize: "13px", color: "#55556a", marginBottom: "48px" }}>
        Boston Urban Analytics Platform
      </p>

      {/* Feature pills */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "48px", flexWrap: "wrap", justifyContent: "center", padding: "0 24px" }}>
        {[
          { icon: "🗺️", label: "Geospatial Map" },
          { icon: "📊", label: "Live Analytics" },
          { icon: "🔮", label: "Forecasting" },
          { icon: "🚔", label: "Crime + 311 Data" },
        ].map((f) => (
          <div key={f.label} style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "20px", padding: "6px 14px",
            fontSize: "12px", color: "#9898a6",
          }}>
            <span>{f.icon}</span>
            <span>{f.label}</span>
          </div>
        ))}
      </div>

      {/* Status indicator */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${status === "ready" ? "rgba(0,184,148,0.3)" : "rgba(108,92,231,0.2)"}`,
        borderRadius: "24px", padding: "10px 20px",
        transition: "border-color 0.4s",
      }}>
        <div style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: status === "ready" ? "#00b894" : "#6c5ce7",
          boxShadow: status === "ready" ? "0 0 8px #00b894" : "0 0 8px #6c5ce7",
          animation: status === "waking" ? "pulse 1.5s infinite" : "none",
        }} />
        <span style={{ fontSize: "12px", color: status === "ready" ? "#00b894" : "#9898a6" }}>
          {status === "ready"
            ? "Backend ready — loading dashboard…"
            : `Waking up backend${dots} (${elapsed}s)`}
        </span>
      </div>

      {elapsed > 15 && status === "waking" && (
        <p style={{ fontSize: "11px", color: "#35354a", marginTop: "16px", textAlign: "center" }}>
          Running on a free tier — usually takes 30–60s on first load
        </p>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}