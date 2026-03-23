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
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-5 animate-pulse"
            style={{ background: "var(--card)" }}
          >
            <div
              className="h-4 w-24 rounded mb-3"
              style={{ background: "var(--border)" }}
            />
            <div
              className="h-8 w-16 rounded"
              style={{ background: "var(--border)" }}
            />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total Incidents",
      value: data.total_incidents.toLocaleString(),
      color: "#3b82f6",
    },
    {
      label: "Open Incidents",
      value: data.open_incidents.toLocaleString(),
      color: "#ef4444",
    },
    {
      label: "Avg Resolution",
      value: `${data.avg_resolution_hours}h`,
      color: "#f59e0b",
    },
    {
      label: "Total Crimes",
      value: data.total_crimes.toLocaleString(),
      color: "#8b5cf6",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl p-5 border transition-colors"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>
            {card.label}
          </p>
          <p className="text-2xl font-bold" style={{ color: card.color }}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}