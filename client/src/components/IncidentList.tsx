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
      <div className="h-full rounded-xl border flex flex-col items-center justify-center p-6 text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: "var(--accent-light)" }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "var(--accent)" }}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
        </div>
        <p className="text-sm font-medium mb-1">Radius Search</p>
        <p className="text-[11px] leading-relaxed max-w-[200px]" style={{ color: "var(--text-3)" }}>Click anywhere on the map to discover nearby incidents</p>
      </div>
    );
  }

  return (
    <div className="h-full rounded-xl border overflow-hidden flex flex-col" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="px-4 py-3 border-b flex items-center justify-between shrink-0" style={{ borderColor: "var(--border)" }}>
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Nearby</span>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>{incidents.length} found</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {incidents.map((inc, i) => (
          <div key={inc.id} className="px-4 py-3 border-b transition-colors hover:bg-white/[0.02] anim-fade" style={{ borderColor: "var(--border)", animationDelay: `${i * 15}ms` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium truncate">{inc.category}</p>
                <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-3)" }}>{inc.street_address || "Unknown location"}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: inc.status === "Open" ? "var(--red-light)" : "var(--green-light)", color: inc.status === "Open" ? "var(--red)" : "var(--green)" }}>{inc.status}</span>
                {inc.distance_meters && <span className="text-[10px]" style={{ color: "var(--text-3)" }}>{inc.distance_meters}m</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}