"use client";

import { useEffect, useState } from "react";
import { getIncidentCategories, getCrimesByOffense } from "@/lib/api";

interface Props {
  onCategoryChange: (category: string | null, type: "incident" | "crime" | null) => void;
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
    onCategoryChange(null, null);
  }, [mode]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      onCategoryChange(null, null);
      return;
    }
    // Value format: "type::category"
    const [type, ...rest] = val.split("::");
    onCategoryChange(rest.join("::"), type as "incident" | "crime");
  };

  const currentValue = selectedCategory
    ? `${mode === "crimes" ? "crime" : "incident"}::${selectedCategory}`
    : "";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <span style={{ fontSize: "11px", color: "#55556a", whiteSpace: "nowrap" }}>Filter by</span>
      <select
        value={currentValue}
        onChange={handleChange}
        style={{
          fontSize: "12px",
          padding: "8px 14px",
          borderRadius: "8px",
          background: "#12121a",
          border: "1px solid rgba(255,255,255,0.08)",
          color: selectedCategory ? "#a29bfe" : "#eeeef0",
          cursor: "pointer",
          minWidth: "200px",
          maxWidth: "320px",
          outline: "none",
        }}
      >
        <option value="">All Categories</option>

        {(mode === "incidents" || mode === "both") && (
          <optgroup label="── 311 Incidents">
            {incidentCats.slice(0, 12).map((c) => (
              <option key={`incident::${c.category}`} value={`incident::${c.category}`}>
                {c.category} ({c.count.toLocaleString()})
              </option>
            ))}
          </optgroup>
        )}

        {(mode === "crimes" || mode === "both") && (
          <optgroup label="── Crimes">
            {crimeOffenses.slice(0, 12).map((c) => (
              <option key={`crime::${c.offense_description}`} value={`crime::${c.offense_description}`}>
                {c.offense_description} ({c.count.toLocaleString()})
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}