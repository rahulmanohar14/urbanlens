"use client";

import { useEffect, useState } from "react";
import { getSummary } from "@/lib/api";

interface Summary {
  total_incidents: number;
  total_crimes: number;
  open_incidents: number;
  avg_resolution_hours: number;
  top_categories: { category: string; count: number }[];
  top_neighborhoods: { name: string; count: number }[];
}

export default function StatsCards() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    getSummary()
      .then((res) => setData(res.data))
      .catch((err) => console.error("Failed to load summary:", err));
  }, []);

  if (!data) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-xl p-5 animate-pulse">
            <div className="h-3 w-20 rounded mb-3" style={{ background: "var(--border)" }} />
            <div className="h-7 w-14 rounded" style={{ background: "var(--border)" }} />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Total Incidents", value: data.total_incidents.toLocaleString(), change: null, color: "#6366f1" },
    { label: "Open Cases", value: data.open_incidents.toLocaleString(), change: null, color: "#ef4444" },
    { label: "Avg Resolution", value: `${data.avg_resolution_hours}h`, change: null, color: "#f59e0b" },
    { label: "Neighborhoods", value: "26", change: null, color: "#10b981" },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 fade-in">
      {cards.map((card) => (
        <div key={card.label} className="stat-card glass rounded-xl p-5 transition-all duration-200 hover:bg-white/[0.03]">
          <p className="text-xs font-medium tracking-wide uppercase mb-2" style={{ color: "var(--muted)" }}>{card.label}</p>
          <p className="text-2xl font-semibold tracking-tight" style={{ color: card.color }}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}