"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Circle, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { getNeighborhoodGeoJSON, getIncidentsNearby } from "@/lib/api";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const getColor = (count: number) => {
  if (count > 1000) return "#6c0000";
  if (count > 700) return "#d63031";
  if (count > 500) return "#e17055";
  if (count > 300) return "#fdcb6e";
  if (count > 100) return "#ffeaa7";
  return "#00b894";
};

const catColor: Record<string, string> = {
  "Highway Maintenance": "#6c5ce7",
  "Sanitation": "#00b894",
  "Code Enforcement": "#fdcb6e",
  "Enforcement & Abandoned Vehicles": "#ff6b6b",
  "Street Cleaning": "#a29bfe",
  "Signs & Signals": "#fd79a8",
  "Noise Disturbance": "#e17055",
  "Housing": "#00cec9",
  "Animal Issues": "#55efc4",
  default: "#636e72",
};

interface Incident {
  id: number; case_id: string; category: string; status: string;
  street_address: string; open_dt: string; latitude: number;
  longitude: number; distance_meters?: number; neighborhood_name?: string;
}

interface MapProps {
  onNeighborhoodClick?: (name: string, id: number) => void;
  onNearbySearch?: (incidents: Incident[]) => void;
}

function RadiusSearch({ onSearch }: { onSearch: (lat: number, lng: number, incidents: Incident[]) => void }) {
  const [center, setCenter] = useState<[number, number] | null>(null);

  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setCenter([lat, lng]);
      try {
        const res = await getIncidentsNearby(lat, lng, 500);
        onSearch(lat, lng, res.data.data);
      } catch (err) {
        console.error("Nearby search failed:", err);
      }
    },
  });

  return center ? (
    <Circle center={center} radius={500} pathOptions={{ color: "#6c5ce7", fillColor: "#6c5ce7", fillOpacity: 0.08, weight: 1.5, dashArray: "6, 8" }} />
  ) : null;
}

export default function Map({ onNeighborhoodClick, onNearbySearch }: MapProps) {
  const [geojson, setGeojson] = useState<any>(null);
  const [nearby, setNearby] = useState<Incident[]>([]);

  useEffect(() => {
    getNeighborhoodGeoJSON().then((r) => setGeojson(r.data)).catch(console.error);
  }, []);

  const handleSearch = (lat: number, lng: number, incidents: Incident[]) => {
    setNearby(incidents);
    onNearbySearch?.(incidents);
  };

  const styleNeighborhood = (feature: any, layer: L.Layer) => {
    const p = feature.properties;
    (layer as L.Path).setStyle({ fillColor: getColor(p.total_incidents), weight: 1, opacity: 0.8, color: "rgba(255,255,255,0.08)", fillOpacity: 0.55 });
    layer.bindTooltip(`<div style="font-size:11px;font-family:Inter,sans-serif"><strong>${p.name}</strong><br/><span style="color:#9898a6">Incidents: ${p.total_incidents}</span></div>`, { sticky: true });
    layer.on({
      mouseover: (e: L.LeafletMouseEvent) => (e.target as L.Path).setStyle({ weight: 2, fillOpacity: 0.75, color: "rgba(255,255,255,0.2)" }),
      mouseout: (e: L.LeafletMouseEvent) => (e.target as L.Path).setStyle({ weight: 1, fillOpacity: 0.55, color: "rgba(255,255,255,0.08)" }),
      click: () => onNeighborhoodClick?.(p.name, p.id),
    });
  };

  return (
    <MapContainer center={[42.3601, -71.0589]} zoom={12} style={{ height: "100%", width: "100%" }} zoomControl={true}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      {geojson && <GeoJSON key="hoods" data={geojson} onEachFeature={styleNeighborhood} />}
      <RadiusSearch onSearch={handleSearch} />
      {nearby.map((inc) => (
        <CircleMarker key={inc.id} center={[inc.latitude, inc.longitude]} radius={5} pathOptions={{ color: "#fff", weight: 0.5, fillColor: catColor[inc.category] || catColor.default, fillOpacity: 0.9 }}>
          <Popup>
            <div style={{ fontSize: "11px", fontFamily: "Inter, sans-serif", lineHeight: 1.5 }}>
              <strong>{inc.category}</strong><br />
              <span style={{ color: "#9898a6" }}>{inc.street_address}</span><br />
              <span style={{ color: inc.status === "Open" ? "#ff6b6b" : "#00b894" }}>{inc.status}</span>
              {inc.distance_meters && <span style={{ color: "#55556a" }}>{" · "}{inc.distance_meters}m</span>}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}