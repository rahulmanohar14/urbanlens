"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import StatsCards from "@/components/StatsCards";
import IncidentList from "@/components/IncidentList";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-xl flex items-center justify-center"
      style={{
        height: "500px",
        background: "var(--card)",
        color: "var(--muted)",
      }}
    >
      Loading map...
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
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null >(null);

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">
          🏙️ UrbanLens
        </h1>
        <p style={{ color: "var(--muted)" }}>
          Boston Urban Analytics & Geospatial Intelligence Platform
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-6">
        <StatsCards />
      </div>

      {/* Map + Incident List */}
      <div className="grid grid-cols-3 gap-6">
        {/* Map — takes 2/3 width */}
        <div className="col-span-2">
          <div
            className="rounded-xl overflow-hidden border"
            style={{
              height: "500px",
              borderColor: "var(--border)",
            }}
          >
            <Map
              onNearbySearch={(incidents) => setNearbyIncidents(incidents)}
              onNeighborhoodClick={(name, id) =>
                setSelectedNeighborhood(name)
              }
            />
          </div>
          {selectedNeighborhood && (
            <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
              Selected: <strong>{selectedNeighborhood}</strong>
            </p>
          )}
          <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
            Click anywhere on the map to search for 311 incidents within 500m
          </p>
        </div>

        {/* Incident List — takes 1/3 width */}
        <div className="col-span-1">
          <IncidentList incidents={nearbyIncidents} />
        </div>
      </div>
    </div>
  );
}