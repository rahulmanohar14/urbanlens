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

export default function StatsCards() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    getSummary().then((r) => setData(r.data)).catch(console.error);
  }, []);

  if (!data) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ background: "#12121a", borderRadius: "12px", padding: "16px", height: "80px" }} />
        ))}
      </div>
    );
  }

  const shootings = data.total_shootings !== undefined ? data.total_shootings : 0;

  const cards = [
    { label: "Total Incidents", value: data.total_incidents.toLocaleString(), dot: "#6c5ce7" },
    { label: "Total Crimes", value: data.total_crimes.toLocaleString(), dot: "#ff6b6b" },
    { label: "Neighborhoods", value: "26", dot: "#00b894" },
    { label: "Shootings", value: shootings.toLocaleString(), dot: "#fdcb6e" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {cards.map((c) => (
        <div key={c.label} style={{
          background: "#12121a",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "12px",
          padding: "16px",
          transition: "border-color 0.2s",
          cursor: "default",
        }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = c.dot}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: c.dot }} />
            <span style={{ fontSize: "10px", fontWeight: 500, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.5px" }}>{c.label}</span>
          </div>
          <p className="text-lg sm:text-xl font-semibold" style={{ letterSpacing: "-0.5px" }}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}