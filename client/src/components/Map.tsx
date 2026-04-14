"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Circle, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { getNeighborhoodGeoJSON, getIncidentsNearby, getCrimesNearby } from "@/lib/api";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Dynamic color scale based on max value in current dataset
const getColor = (count: number, max: number) => {
  if (max === 0) return "#00b894";
  const ratio = count / max;
  if (ratio > 0.8) return "#6c0000";
  if (ratio > 0.6) return "#d63031";
  if (ratio > 0.4) return "#e17055";
  if (ratio > 0.25) return "#fdcb6e";
  if (ratio > 0.1) return "#ffeaa7";
  return "#00b894";
};

interface NearbyItem {
  id: number;
  type: "incident" | "crime";
  category: string;
  status: string;
  street_address: string;
  open_dt?: string;
  occurred_on?: string;
  latitude: number;
  longitude: number;
  distance_meters?: number;
  neighborhood_name?: string;
}

interface MapProps {
  mode: "both" | "incidents" | "crimes";
  onNeighborhoodClick?: (name: string, id: number) => void;
  onNearbySearch?: (items: NearbyItem[]) => void;
}

function RadiusSearch({ mode, onSearch }: { mode: string; onSearch: (lat: number, lng: number, items: NearbyItem[]) => void }) {
  const [center, setCenter] = useState<[number, number] | null>(null);

  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setCenter([lat, lng]);
      try {
        const results: NearbyItem[] = [];

        if (mode === "incidents" || mode === "both") {
          const incRes = await getIncidentsNearby(lat, lng, 500);
          const incidents = (incRes.data.data || []).map((i: any) => ({
            ...i, type: "incident" as const,
          }));
          results.push(...incidents);
        }

        if (mode === "crimes" || mode === "both") {
          const crimeRes = await getCrimesNearby(lat, lng, 500);
          const crimes = (crimeRes.data.data || []).map((c: any) => ({
            id: c.id, type: "crime" as const,
            category: c.offense_description || "Unknown",
            status: c.shooting ? "Shooting" : "Reported",
            street_address: c.street || "Unknown location",
            occurred_on: c.occurred_on,
            latitude: c.latitude, longitude: c.longitude,
            distance_meters: c.distance_meters,
            neighborhood_name: c.neighborhood_name,
          }));
          results.push(...crimes);
        }

        results.sort((a, b) => (a.distance_meters || 0) - (b.distance_meters || 0));
        onSearch(lat, lng, results);
      } catch (err) {
        console.error("Nearby search failed:", err);
      }
    },
  });

  return center ? (
    <Circle center={center} radius={500} pathOptions={{ color: "#6c5ce7", fillColor: "#6c5ce7", fillOpacity: 0.08, weight: 1.5, dashArray: "6, 8" }} />
  ) : null;
}

export default function Map({ mode, onNeighborhoodClick, onNearbySearch }: MapProps) {
  const [geojson, setGeojson] = useState<any>(null);
  const [nearby, setNearby] = useState<NearbyItem[]>([]);

  useEffect(() => {
    getNeighborhoodGeoJSON().then((r) => setGeojson(r.data)).catch(console.error);
  }, []);

  const handleSearch = (lat: number, lng: number, items: NearbyItem[]) => {
    setNearby(items);
    onNearbySearch?.(items);
  };

  const getDensityValue = (p: any) => {
    if (mode === "incidents") return p.total_incidents || 0;
    if (mode === "crimes") return p.total_crimes || 0;
    return (p.total_incidents || 0) + (p.total_crimes || 0);
  };

  // Compute max across all neighborhoods for dynamic color scaling
  const getMax = () => {
    if (!geojson?.features) return 1;
    return Math.max(...geojson.features.map((f: any) => getDensityValue(f.properties)), 1);
  };

  const styleNeighborhood = (feature: any, layer: L.Layer) => {
    const p = feature.properties;
    const density = getDensityValue(p);
    const max = getMax();

    (layer as L.Path).setStyle({
      fillColor: getColor(density, max),
      weight: 1, opacity: 0.8,
      color: "rgba(255,255,255,0.08)",
      fillOpacity: 0.55,
    });

    const activeLabel = mode === "incidents" ? "Incidents" : mode === "crimes" ? "Crimes" : "Total";

    layer.bindTooltip(
      `<div style="font-size:11px;font-family:Inter,sans-serif">
        <strong>${p.name}</strong><br/>
        <span style="color:${mode === "crimes" ? "#ff6b6b" : mode === "incidents" ? "#a29bfe" : "#ffeaa7"}">${activeLabel}: ${density.toLocaleString()}</span>
        ${mode === "both" ? `<br/><span style="color:#a29bfe">311: ${(p.total_incidents || 0).toLocaleString()}</span> · <span style="color:#ff6b6b">Crime: ${(p.total_crimes || 0).toLocaleString()}</span>` : ""}
      </div>`,
      { sticky: true }
    );

    layer.on({
      mouseover: (e: L.LeafletMouseEvent) => (e.target as L.Path).setStyle({ weight: 2, fillOpacity: 0.75, color: "rgba(255,255,255,0.2)" }),
      mouseout: (e: L.LeafletMouseEvent) => (e.target as L.Path).setStyle({ weight: 1, fillOpacity: 0.55, color: "rgba(255,255,255,0.08)" }),
      click: () => onNeighborhoodClick?.(p.name, p.id),
    });
  };

  const geojsonKey = geojson ? `hoods-${mode}` : "loading";

  return (
    <MapContainer center={[42.3601, -71.0589]} zoom={12} style={{ height: "100%", width: "100%" }} zoomControl={true}>
      <TileLayer attribution="OSM" url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      {geojson && <GeoJSON key={geojsonKey} data={geojson} onEachFeature={styleNeighborhood} />}
      <RadiusSearch mode={mode} onSearch={handleSearch} />
      {nearby.map((item, idx) => (
        <CircleMarker key={`${item.type}-${item.id}-${idx}`} center={[item.latitude, item.longitude]} radius={5} pathOptions={{
          color: "#fff", weight: 0.5, fillOpacity: 0.9,
          fillColor: item.type === "crime" ? "#ff6b6b" : "#6c5ce7",
        }}>
          <Popup>
            <div style={{ fontSize: "11px", fontFamily: "Inter, sans-serif", lineHeight: 1.5 }}>
              <span style={{ fontSize: "9px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px", background: item.type === "crime" ? "rgba(255,107,107,0.15)" : "rgba(108,92,231,0.15)", color: item.type === "crime" ? "#ff6b6b" : "#a29bfe" }}>
                {item.type === "crime" ? "CRIME" : "311"}
              </span>
              <br />
              <strong>{item.category}</strong><br />
              <span style={{ color: "#9898a6" }}>{item.street_address}</span>
              {item.distance_meters && <span style={{ color: "#55556a" }}>{" · "}{item.distance_meters}m</span>}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}