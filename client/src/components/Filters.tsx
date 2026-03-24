"use client";

import { useEffect, useState } from "react";
import { getIncidentCategories } from "@/lib/api";

interface Props {
  onCategoryChange: (category: string | null) => void;
  selectedCategory: string | null;
}

export default function Filters({ onCategoryChange, selectedCategory }: Props) {
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);

  useEffect(() => {
    getIncidentCategories().then((r) => setCategories(r.data)).catch(console.error);
  }, []);

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

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", overflowX: "auto", paddingBottom: "4px" }}>
      <button onClick={() => onCategoryChange(null)} style={btnStyle(!selectedCategory)}>All</button>
      {categories.slice(0, 8).map((c) => (
        <button key={c.category} onClick={() => onCategoryChange(c.category)} style={btnStyle(selectedCategory === c.category)}>
          {c.category}
        </button>
      ))}
    </div>
  );
}