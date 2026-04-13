"use client";

import { useEffect, useState } from "react";
import { getSummary } from "@/lib/api";

interface Summary {
  total_incidents: number;
  total_crimes: number;
  open_incidents: number;
  avg_resolution_hours: number;
  total_shootings: number;
  top_categories: { category: string; count: number }[];
  top_neighborhoods: { name: string; count: number }[];
}

function SkeletonCard() {
  return (
    <div style={{
      background: "#12121a",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "12px",
      padding: "20px",
      height: "90px",
      overflow: "hidden",
      position: "relative",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)",
        animation: "shimmer 1.8s infinite",
        backgroundSize: "200% 100%",
      }} />
      <div style={{ width: "60%", height: "10px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", marginBottom: "14px" }} />
      <div style={{ width: "40%", height: "18px", background: "rgba(255,255,255,0.07)", borderRadius: "4px" }} />
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

export default function StatsCards() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    getSummary().then((r) => setData(r.data)).catch(console.error);
  }, []);

  if (!data) {
    return (
      <div className="layout-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const cards = [
    { label: "Total Incidents", value: data.total_incidents.toLocaleString(), dot: "#6c5ce7" },
    { label: "Total Crimes", value: data.total_crimes.toLocaleString(), dot: "#ff6b6b" },
    { label: "Neighborhoods", value: "26", dot: "#00b894" },
    { label: "Shootings", value: (data.total_shootings || 0).toLocaleString(), dot: "#fdcb6e" },
  ];

  return (
    <div className="layout-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
      {cards.map((c) => (
        <div key={c.label} style={{
          background: "#12121a",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "12px",
          padding: "20px",
          transition: "border-color 0.2s",
          cursor: "default",
        }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = c.dot}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: c.dot }} />
            <span style={{ fontSize: "11px", fontWeight: 500, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.5px" }}>{c.label}</span>
          </div>
          <p style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.5px" }}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}