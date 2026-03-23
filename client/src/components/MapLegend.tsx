"use client";

export default function MapLegend() {
  const items = [
    { color: "#22c55e", label: "< 100 incidents" },
    { color: "#facc15", label: "100–300" },
    { color: "#f97316", label: "300–500" },
    { color: "#dc2626", label: "500–700" },
    { color: "#991b1b", label: "700–1000" },
    { color: "#7f1d1d", label: "1000+" },
  ];

  return (
    <div
      className="rounded-lg border p-3 mt-3 inline-flex items-center gap-4 text-xs"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <span style={{ color: "var(--muted)" }}>Incident density:</span>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ background: item.color }}
          />
          <span style={{ color: "var(--muted)" }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}