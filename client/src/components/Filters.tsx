"use client";

import { useEffect, useState } from "react";
import { getIncidentCategories, getCrimesByOffense } from "@/lib/api";

interface Props {
  onCategoryChange: (category: string | null, type: "incident" | "crime" | null) => void;
  selectedCategory: string | null;
  selectedType: "incident" | "crime" | null;
  mode: "both" | "incidents" | "crimes";
}

export default function Filters({ onCategoryChange, selectedCategory, selectedType, mode }: Props) {
  const [incidentCats, setIncidentCats] = useState<{ category: string; count: number }[]>([]);
  const [crimeOffenses, setCrimeOffenses] = useState<{ offense_description: string; count: number }[]>([]);

  useEffect(() => {
    getIncidentCategories()
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : (r.data?.data || []);
        setIncidentCats(data);
      })
      .catch(console.error);

    getCrimesByOffense()
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : (r.data?.data || []);
        setCrimeOffenses(data);
      })
      .catch(console.error);
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
    const [type, ...rest] = val.split("::");
    onCategoryChange(rest.join("::"), type as "incident" | "crime");
  };

  // Use actual selectedType to build the current value — fixes "both" mode bug
  const currentValue = selectedCategory && selectedType
    ? `${selectedType}::${selectedCategory}`
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

        {(mode === "incidents" || mode === "both") && incidentCats.length > 0 && (
          <optgroup label="── 311 Incidents">
            {incidentCats.slice(0, 12).map((c) => (
              <option key={`incident::${c.category}`} value={`incident::${c.category}`}>
                {c.category} ({c.count.toLocaleString()})
              </option>
            ))}
          </optgroup>
        )}

        {(mode === "crimes" || mode === "both") && crimeOffenses.length > 0 && (
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