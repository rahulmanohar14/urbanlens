"use client";

import { useEffect, useState } from "react";
import { getIncidentCategories, getCrimesByOffense } from "@/lib/api";

interface Props {
  onCategoryChange: (category: string | null) => void;
  selectedCategory: string | null;
  mode: "both" | "incidents" | "crimes";
}

export default function Filters({ onCategoryChange, selectedCategory, mode }: Props) {
  const [incidentCats, setIncidentCats] = useState<{ category: string; count: number }[]>([]);
  const [crimeOffenses, setCrimeOffenses] = useState<{ offense_description: string; count: number }[]>([]);

  useEffect(() => {
    getIncidentCategories().then((r) => setIncidentCats(r.data)).catch(console.error);
    getCrimesByOffense().then((r) => setCrimeOffenses(r.data)).catch(console.error);
  }, []);

  // Reset filter when mode changes
  useEffect(() => {
    onCategoryChange(null);
  }, [mode]);

  const btnStyle = (active: boolean) => ({
    padding: "6px 14px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: active ? 600 : 400,
    background: active ? "#6c5ce7" : "transparent",
    color: active ? "#fff" : "#9898a6",
    border: active ? "1px solid #6c5ce7" : "1px solid rgba(255,255,255,0.08)",
    cursor: "pointer",
    transition: "all 0.2s",
    whiteSpace: "nowrap" as const,
  });

  let items: string[] = [];
  if (mode === "incidents") {
    items = incidentCats.slice(0, 8).map((c) => c.category);
  } else if (mode === "crimes") {
    items = crimeOffenses.slice(0, 8).map((c) => c.offense_description);
  } else {
    items = incidentCats.slice(0, 5).map((c) => c.category);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", overflowX: "auto", paddingBottom: "4px", flex: 1 }}>
      <button onClick={() => onCategoryChange(null)} style={btnStyle(!selectedCategory)}>All</button>
      {items.map((name) => (
        <button key={name} onClick={() => onCategoryChange(name)} style={btnStyle(selectedCategory === name)}>
          {name}
        </button>
      ))}
    </div>
  );
}