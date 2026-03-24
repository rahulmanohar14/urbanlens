"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import StatsCards from "@/components/StatsCards";
import IncidentList from "@/components/IncidentList";
import Filters from "@/components/Filters";
import MapLegend from "@/components/MapLegend";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div style={{ height: "100%", background: "#12121a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontSize: "12px", color: "#55556a" }}>Loading map...</p>
    </div>
  ),
});

interface Incident {
  id: number; category: string; status: string; street_address: string;
  distance_meters?: number; open_dt: string; latitude: number; longitude: number;
}

export default function Dashboard() {
  const [nearbyIncidents, setNearbyIncidents] = useState<Incident[]>([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filtered = selectedCategory ? nearbyIncidents.filter((i) => i.category === selectedCategory) : nearbyIncidents;

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 600, letterSpacing: "-0.3px" }}>Dashboard</h1>
        <p style={{ fontSize: "12px", color: "#55556a", marginTop: "4px" }}>Real-time geospatial analytics across 9,800+ Boston 311 service requests</p>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <StatsCards />
      </div>

      <Filters onCategoryChange={setSelectedCategory} selectedCategory={selectedCategory} />

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
        <div>
          <div style={{ height: "540px", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Map onNearbySearch={setNearbyIncidents} onNeighborhoodClick={(name) => setSelectedNeighborhood(name)} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px", padding: "0 4px" }}>
            <MapLegend />
            {selectedNeighborhood && <p style={{ fontSize: "11px", color: "#55556a" }}>Selected: <span style={{ color: "#6c5ce7" }}>{selectedNeighborhood}</span></p>}
          </div>
        </div>
        <div style={{ height: "540px" }}>
          <IncidentList incidents={filtered} />
        </div>
      </div>
    </div>
  );
}