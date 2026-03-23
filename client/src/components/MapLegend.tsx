"use client";

export default function MapLegend() {
  const items = [
    { color: "#10b981", label: "Low" },
    { color: "#facc15", label: "Medium" },
    { color: "#f97316", label: "High" },
    { color: "#dc2626", label: "Very High" },
    { color: "#7f1d1d", label: "Critical" },
  ];

  return (
    <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: "var(--muted)" }}>
      <span className="font-medium uppercase tracking-wide">Density</span>
      <div className="flex items-center gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}