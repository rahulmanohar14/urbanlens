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
    getIncidentCategories()
      .then((res) => setCategories(res.data))
      .catch((err) => console.error("Failed to load categories:", err));
  }, []);

  return (
    <div
      className="rounded-xl border p-4 mb-4 flex items-center gap-3 flex-wrap"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <span className="text-sm font-medium" style={{ color: "var(--muted)" }}>
        Filter by:
      </span>
      <button
        onClick={() => onCategoryChange(null)}
        className="text-xs px-3 py-1.5 rounded-lg transition-colors"
        style={{
          background: selectedCategory === null ? "var(--accent)" : "transparent",
          color: selectedCategory === null ? "#fff" : "var(--muted)",
          border: `1px solid ${selectedCategory === null ? "var(--accent)" : "var(--border)"}`,
        }}
      >
        All ({categories.reduce((sum, c) => sum + c.count, 0).toLocaleString()})
      </button>
      {categories.slice(0, 8).map((cat) => (
        <button
          key={cat.category}
          onClick={() => onCategoryChange(cat.category)}
          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{
            background: selectedCategory === cat.category ? "var(--accent)" : "transparent",
            color: selectedCategory === cat.category ? "#fff" : "var(--muted)",
            border: `1px solid ${selectedCategory === cat.category ? "var(--accent)" : "var(--border)"}`,
          }}
        >
          {cat.category} ({cat.count.toLocaleString()})
        </button>
      ))}
    </div>
  );
}