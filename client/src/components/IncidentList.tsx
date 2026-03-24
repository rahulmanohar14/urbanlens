"use client";

interface NearbyItem {
  id: number;
  type: "incident" | "crime";
  category: string;
  status: string;
  street_address: string;
  distance_meters?: number;
  open_dt?: string;
  occurred_on?: string;
}

interface Props {
  incidents: NearbyItem[];
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export default function IncidentList({ incidents }: Props) {
  if (incidents.length === 0) {
    return (
      <div style={{ height: "100%", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)", background: "#12121a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(108,92,231,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px", fontSize: "18px", color: "#6c5ce7" }}>{"◎"}</div>
        <p style={{ fontSize: "13px", fontWeight: 500, marginBottom: "4px" }}>Radius Search</p>
        <p style={{ fontSize: "11px", color: "#55556a", maxWidth: "200px" }}>Click anywhere on the map to discover nearby incidents and crimes</p>
      </div>
    );
  }

  const crimeCount = incidents.filter((i) => i.type === "crime").length;
  const incidentCount = incidents.filter((i) => i.type === "incident").length;

  return (
    <div style={{ height: "100%", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)", background: "#12121a", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: "11px", fontWeight: 600, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.5px" }}>Nearby</span>
        <div style={{ display: "flex", gap: "6px" }}>
          {incidentCount > 0 && (
            <span style={{ fontSize: "10px", fontWeight: 500, padding: "2px 8px", borderRadius: "10px", background: "rgba(108,92,231,0.12)", color: "#a29bfe" }}>{incidentCount} 311</span>
          )}
          {crimeCount > 0 && (
            <span style={{ fontSize: "10px", fontWeight: 500, padding: "2px 8px", borderRadius: "10px", background: "rgba(255,107,107,0.12)", color: "#ff6b6b" }}>{crimeCount} crimes</span>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {incidents.map((inc, i) => {
          const dateStr = inc.type === "incident" ? formatDate(inc.open_dt) : formatDate(inc.occurred_on);
          return (
            <div key={`${inc.type}-${inc.id}-${i}`} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s", cursor: "default" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                    <span style={{
                      fontSize: "9px", fontWeight: 600, padding: "1px 5px", borderRadius: "3px",
                      background: inc.type === "crime" ? "rgba(255,107,107,0.12)" : "rgba(108,92,231,0.12)",
                      color: inc.type === "crime" ? "#ff6b6b" : "#a29bfe",
                    }}>
                      {inc.type === "crime" ? "CRIME" : "311"}
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inc.category}</span>
                  </div>
                  <p style={{ fontSize: "11px", color: "#55556a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inc.street_address || "Unknown location"}</p>
                  {dateStr && <p style={{ fontSize: "10px", color: "#44445a", marginTop: "2px" }}>{dateStr}</p>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                  <span style={{
                    fontSize: "10px", fontWeight: 500, padding: "2px 6px", borderRadius: "4px",
                    background: inc.status === "Open" || inc.status === "Shooting" ? "rgba(255,107,107,0.1)" : "rgba(0,184,148,0.1)",
                    color: inc.status === "Open" || inc.status === "Shooting" ? "#ff6b6b" : "#00b894",
                  }}>{inc.status}</span>
                  {inc.distance_meters && <span style={{ fontSize: "10px", color: "#55556a" }}>{inc.distance_meters}m</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}