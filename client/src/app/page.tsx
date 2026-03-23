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
    <div className="rounded-xl flex items-center justify-center" style={{ height: "550px", background: "var(--card-solid)", color: "var(--muted)" }}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
        <p className="text-xs">Loading map</p>
      </div>
    </div>
  ),
});

interface Incident {
  id: number;
  category: string;
  status: string;
  street_address: string;
  distance_meters?: number;
  open_dt: string;
  latitude: number;
  longitude: number;
}

export default function Dashboard() {
  const [nearbyIncidents, setNearbyIncidents] = useState<Incident[]>([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredIncidents = selectedCategory
    ? nearbyIncidents.filter((inc) => inc.category === selectedCategory)
    : nearbyIncidents;

  return (
    <div className="px-6 py-8 fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Dashboard</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>Real-time geospatial analytics across 9,800+ Boston 311 service requests</p>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <StatsCards />
      </div>

      {/* Filters */}
      <Filters onCategoryChange={(cat) => setSelectedCategory(cat)} selectedCategory={selectedCategory} />

      {/* Map + Sidebar */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8">
          <div className="rounded-xl overflow-hidden glow-border" style={{ height: "550px" }}>
            <Map
              onNearbySearch={(incidents) => setNearbyIncidents(incidents)}
              onNeighborhoodClick={(name, id) => setSelectedNeighborhood(name)}
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            <MapLegend />
            {selectedNeighborhood && (
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Selected: <span style={{ color: "var(--accent)" }}>{selectedNeighborhood}</span>
              </p>
            )}
          </div>
        </div>
        <div className="col-span-4">
          <IncidentList incidents={filteredIncidents} />
        </div>
      </div>
    </div>
  );
}