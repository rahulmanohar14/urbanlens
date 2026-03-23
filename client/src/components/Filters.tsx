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
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <span className="text-xs font-medium uppercase tracking-wide mr-1" style={{ color: "var(--muted)" }}>Filter</span>
      <button
        onClick={() => onCategoryChange(null)}
        className="text-xs px-3 py-1.5 rounded-md transition-all duration-200"
        style={{
          background: selectedCategory === null ? "var(--accent)" : "transparent",
          color: selectedCategory === null ? "#fff" : "var(--muted-foreground)",
          border: `1px solid ${selectedCategory === null ? "var(--accent)" : "var(--border)"}`,
        }}
      >
        All
      </button>
      {categories.slice(0, 8).map((cat) => (
        <button
          key={cat.category}
          onClick={() => onCategoryChange(cat.category)}
          className="text-xs px-3 py-1.5 rounded-md transition-all duration-200"
          style={{
            background: selectedCategory === cat.category ? "var(--accent)" : "transparent",
            color: selectedCategory === cat.category ? "#fff" : "var(--muted-foreground)",
            border: `1px solid ${selectedCategory === cat.category ? "var(--accent)" : "var(--border)"}`,
          }}
        >
          {cat.category}
        </button>
      ))}
    </div>
  );
}