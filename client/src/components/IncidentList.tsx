"use client";

interface Incident {
  id: number;
  category: string;
  status: string;
  street_address: string;
  distance_meters?: number;
  open_dt: string;
}

interface Props {
  incidents: Incident[];
}

export default function IncidentList({ incidents }: Props) {
  if (incidents.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>
          <span className="text-lg">+</span>
        </div>
        <p className="text-sm font-medium mb-1">Radius Search</p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>Click anywhere on the map to find incidents within 500m</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-sm font-medium">Nearby Results</h3>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>{incidents.length}</span>
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        {incidents.map((inc, index) => (
          <div
            key={inc.id}
            className="px-4 py-3 border-b transition-colors hover:bg-white/[0.02] fade-in"
            style={{ borderColor: "var(--border)", animationDelay: `${index * 30}ms` }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium">{inc.category}</p>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: inc.status === "Open" ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                  color: inc.status === "Open" ? "#ef4444" : "#10b981",
                }}
              >
                {inc.status}
              </span>
            </div>
            <p className="text-xs truncate" style={{ color: "var(--muted)" }}>{inc.street_address || "No address available"}</p>
            {inc.distance_meters && (
              <p className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>{inc.distance_meters}m away</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}