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

const categoryEmoji: Record<string, string> = {
  "Highway Maintenance": "🛣️",
  Sanitation: "🗑️",
  "Code Enforcement": "📋",
  "Enforcement & Abandoned Vehicles": "🚗",
  "Street Cleaning": "🧹",
  "Signs & Signals": "🚦",
  "Noise Disturbance": "🔊",
  Housing: "🏠",
  "Animal Issues": "🐾",
};

export default function IncidentList({ incidents }: Props) {
  if (incidents.length === 0) {
    return (
      <div
        className="rounded-xl p-6 border text-center"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
          color: "var(--muted)",
        }}
      >
        <p className="text-lg mb-2">📍 Click anywhere on the map</p>
        <p className="text-sm">
          to search for incidents within 500m of that location
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
        <h3 className="font-semibold">
          Nearby Incidents ({incidents.length})
        </h3>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {incidents.map((inc) => (
          <div
            key={inc.id}
            className="p-3 border-b flex items-start gap-3 transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="text-lg">
              {categoryEmoji[inc.category] || "📌"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{inc.category}</p>
              <p
                className="text-xs truncate"
                style={{ color: "var(--muted)" }}
              >
                {inc.street_address || "No address"}
              </p>
            </div>
            <div className="text-right">
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background:
                    inc.status === "Open"
                      ? "rgba(239,68,68,0.15)"
                      : "rgba(34,197,94,0.15)",
                  color: inc.status === "Open" ? "#ef4444" : "#22c55e",
                }}
              >
                {inc.status}
              </span>
              {inc.distance_meters && (
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--muted)" }}
                >
                  {inc.distance_meters}m
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}