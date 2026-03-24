"use client";

export default function MapLegend() {
  const items = [
    { color: "#00b894", label: "Low" },
    { color: "#fdcb6e", label: "Med" },
    { color: "#e17055", label: "High" },
    { color: "#d63031", label: "V.High" },
    { color: "#6c0000", label: "Critical" },
  ];

  return (
    <div className="flex items-center gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
          <span className="text-[10px]" style={{ color: "var(--text-3)" }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}