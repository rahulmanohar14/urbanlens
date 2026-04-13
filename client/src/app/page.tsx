"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import StatsCards from "@/components/StatsCards";
import IncidentList from "@/components/IncidentList";
import Filters from "@/components/Filters";
import MapLegend from "@/components/MapLegend";
import SplashScreen from "@/components/SplashScreen";

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
  const [showSplash, setShowSplash] = useState(true);
  // allNearbyItems = raw results from last map click (never filtered)
  const [allNearbyItems, setAllNearbyItems] = useState<NearbyItem[]>([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"incident" | "crime" | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>("both");

  const handleReady = useCallback(() => setShowSplash(false), []);

  const handleCategoryChange = (category: string | null, type: "incident" | "crime" | null) => {
    setSelectedCategory(category);
    setSelectedType(type);
  };

  const handleModeChange = (mode: MapMode) => {
    setMapMode(mode);
    setSelectedCategory(null);
    setSelectedType(null);
  };

  // Derive displayed list from raw results + current mode + current filter
  const displayed = allNearbyItems.filter((item) => {
    // First filter by map mode
    if (mapMode === "incidents" && item.type !== "incident") return false;
    if (mapMode === "crimes" && item.type !== "crime") return false;
    // Then filter by selected category
    if (selectedCategory && selectedType) {
      return item.type === selectedType && item.category === selectedCategory;
    }
    return true;
  });

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
    <>
      {showSplash && <SplashScreen onReady={handleReady} />}

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 600, letterSpacing: "-0.3px" }}>Dashboard</h1>
          <p style={{ fontSize: "12px", color: "#55556a", marginTop: "4px" }}>
            Live geospatial analytics across Boston — updated daily from{" "}
            <a href="https://data.boston.gov" target="_blank" rel="noreferrer"
              style={{ color: "#6c5ce7", textDecoration: "none" }}>
              Analyze Boston
            </a>
          </p>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <StatsCards />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
          <Filters
            onCategoryChange={handleCategoryChange}
            selectedCategory={selectedCategory}
            mode={mapMode}
          />
          <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "3px", flexShrink: 0 }}>
            <button onClick={() => handleModeChange("both")} style={toggleStyle(mapMode === "both")}>Both</button>
            <button onClick={() => handleModeChange("incidents")} style={toggleStyle(mapMode === "incidents")}>311 Only</button>
            <button onClick={() => handleModeChange("crimes")} style={toggleStyle(mapMode === "crimes")}>Crimes Only</button>
          </div>
        </div>

        <div className="layout-map-sidebar" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
          <div>
            <div className="map-container" style={{ height: "540px", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Map
                mode={mapMode}
                onNearbySearch={setAllNearbyItems}
                onNeighborhoodClick={(name) => setSelectedNeighborhood(name)}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px", padding: "0 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <MapLegend />
                <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "10px", color: "#55556a" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#6c5ce7" }} />
                    <span>311 Incident</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ff6b6b" }} />
                    <span>Crime</span>
                  </div>
                </div>
              </div>
              {selectedNeighborhood && (
                <p style={{ fontSize: "11px", color: "#55556a" }}>
                  Selected: <span style={{ color: "#6c5ce7" }}>{selectedNeighborhood}</span>
                </p>
              )}
            </div>
          </div>
          <div className="sidebar-container" style={{ height: "540px" }}>
            <IncidentList incidents={displayed} mode={mapMode} />
          </div>
        </div>
      </div>
    </>
  );
}