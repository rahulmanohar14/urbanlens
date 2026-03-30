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

interface NearbyItem {
  id: number;
  type: "incident" | "crime";
  category: string;
  status: string;
  street_address: string;
  distance_meters?: number;
  open_dt?: string;
  occurred_on?: string;
  latitude: number;
  longitude: number;
}

type MapMode = "both" | "incidents" | "crimes";

export default function Dashboard() {
  const [nearbyItems, setNearbyItems] = useState<NearbyItem[]>([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>("both");

  const filtered = selectedCategory ? nearbyItems.filter((i) => i.category === selectedCategory) : nearbyItems;

  const toggleStyle = (active: boolean) => ({
    padding: "6px 14px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: active ? 600 : 400,
    background: active ? "rgba(108,92,231,0.15)" : "transparent",
    color: active ? "#a29bfe" : "#55556a",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s",
  });

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
      <div style={{ marginBottom: "20px" }}>
        <h1 className="text-lg sm:text-xl font-semibold" style={{ letterSpacing: "-0.3px" }}>Dashboard</h1>
        <p className="text-xs mt-1" style={{ color: "#55556a" }}>Real-time geospatial analytics across 19,000+ Boston incidents and crime reports</p>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <StatsCards />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <Filters onCategoryChange={setSelectedCategory} selectedCategory={selectedCategory} mode={mapMode} />
        <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "3px", flexShrink: 0 }}>
          <button onClick={() => setMapMode("both")} style={toggleStyle(mapMode === "both")}>Both</button>
          <button onClick={() => setMapMode("incidents")} style={toggleStyle(mapMode === "incidents")}>311 Only</button>
          <button onClick={() => setMapMode("crimes")} style={toggleStyle(mapMode === "crimes")}>Crimes Only</button>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <div className="rounded-xl overflow-hidden border h-[350px] sm:h-[450px] lg:h-[540px]" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <Map mode={mapMode} onNearbySearch={setNearbyItems} onNeighborhoodClick={(name) => setSelectedNeighborhood(name)} />
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <div className="flex items-center gap-4">
              <MapLegend />
              <div className="hidden sm:flex items-center gap-3" style={{ fontSize: "10px", color: "#55556a" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#6c5ce7" }} />
                  <span>311</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ff6b6b" }} />
                  <span>Crime</span>
                </div>
              </div>
            </div>
            {selectedNeighborhood && <p className="text-xs hidden sm:block" style={{ color: "#55556a" }}>Selected: <span style={{ color: "#6c5ce7" }}>{selectedNeighborhood}</span></p>}
          </div>
        </div>
        <div className="lg:col-span-4 h-[400px] lg:h-[540px]">
          <IncidentList incidents={filtered} />
        </div>
      </div>
    </div>
  );
}