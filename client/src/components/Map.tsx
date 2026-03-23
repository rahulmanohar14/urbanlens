"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Popup,
  Circle,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { getNeighborhoodGeoJSON, getIncidentsNearby } from "@/lib/api";

// Fix Leaflet default icon issue with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Color scale for choropleth
const getColor = (count: number) => {
  if (count > 1000) return "#7f1d1d";
  if (count > 700) return "#991b1b";
  if (count > 500) return "#dc2626";
  if (count > 300) return "#f97316";
  if (count > 100) return "#facc15";
  return "#22c55e";
};

const categoryColors: Record<string, string> = {
  "Highway Maintenance": "#3b82f6",
  "Sanitation": "#22c55e",
  "Code Enforcement": "#f59e0b",
  "Enforcement & Abandoned Vehicles": "#ef4444",
  "Street Cleaning": "#8b5cf6",
  "Signs & Signals": "#ec4899",
  "Noise Disturbance": "#f97316",
  "Housing": "#06b6d4",
  "Animal Issues": "#84cc16",
  default: "#6b7280",
};

interface Incident {
  id: number;
  case_id: string;
  category: string;
  status: string;
  street_address: string;
  open_dt: string;
  latitude: number;
  longitude: number;
  distance_meters?: number;
  neighborhood_name?: string;
}

interface MapProps {
  onNeighborhoodClick?: (name: string, id: number) => void;
  onNearbySearch?: (incidents: Incident[]) => void;
}

function RadiusSearch({
  onSearch,
}: {
  onSearch: (lat: number, lng: number, incidents: Incident[]) => void;
}) {
  const [searchCenter, setSearchCenter] = useState<[number, number] | null>(
    null
  );

  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setSearchCenter([lat, lng]);
      try {
        const res = await getIncidentsNearby(lat, lng, 500);
        onSearch(lat, lng, res.data.data);
      } catch (err) {
        console.error("Nearby search failed:", err);
      }
    },
  });

  return searchCenter ? (
    <Circle
      center={searchCenter}
      radius={500}
      pathOptions={{
        color: "#3b82f6",
        fillColor: "#3b82f6",
        fillOpacity: 0.1,
        weight: 2,
        dashArray: "5, 10",
      }}
    />
  ) : null;
}

export default function Map({ onNeighborhoodClick, onNearbySearch }: MapProps) {
  const [geojson, setGeojson] = useState<any>(null);
  const [nearbyIncidents, setNearbyIncidents] = useState<Incident[]>([]);
  const [searchCenter, setSearchCenter] = useState<[number, number] | null>(
    null
  );

  useEffect(() => {
    getNeighborhoodGeoJSON()
      .then((res) => setGeojson(res.data))
      .catch((err) => console.error("Failed to load GeoJSON:", err));
  }, []);

  const handleNearbySearch = (
    lat: number,
    lng: number,
    incidents: Incident[]
  ) => {
    setSearchCenter([lat, lng]);
    setNearbyIncidents(incidents);
    onNearbySearch?.(incidents);
  };

  const onEachNeighborhood = (feature: any, layer: L.Layer) => {
    const props = feature.properties;
    (layer as L.Path).setStyle({
      fillColor: getColor(props.total_incidents),
      weight: 1.5,
      opacity: 1,
      color: "#374151",
      fillOpacity: 0.6,
    });

    layer.bindTooltip(
      `<div style="font-size:13px">
        <strong>${props.name}</strong><br/>
        Incidents: ${props.total_incidents}<br/>
        Crimes: ${props.total_crimes}
      </div>`,
      { sticky: true }
    );

    layer.on({
      mouseover: (e: L.LeafletMouseEvent) => {
        (e.target as L.Path).setStyle({
          weight: 3,
          fillOpacity: 0.8,
        });
      },
      mouseout: (e: L.LeafletMouseEvent) => {
        (e.target as L.Path).setStyle({
          weight: 1.5,
          fillOpacity: 0.6,
        });
      },
      click: () => {
        onNeighborhoodClick?.(props.name, props.id);
      },
    });
  };

  return (
    <MapContainer
      center={[42.3601, -71.0589]}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {geojson && (
        <GeoJSON
          key="neighborhoods"
          data={geojson}
          onEachFeature={onEachNeighborhood}
        />
      )}

      <RadiusSearch onSearch={handleNearbySearch} />

      {nearbyIncidents.map((incident) => (
        <CircleMarker
          key={incident.id}
          center={[incident.latitude, incident.longitude]}
          radius={6}
          pathOptions={{
            color: "#fff",
            weight: 1,
            fillColor:
              categoryColors[incident.category] || categoryColors.default,
            fillOpacity: 0.9,
          }}
        >
          <Popup>
            <div style={{ fontSize: "12px", minWidth: "200px" }}>
              <strong>{incident.category}</strong>
              <br />
              {incident.street_address}
              <br />
              <span
                style={{
                  color: incident.status === "Open" ? "#ef4444" : "#22c55e",
                }}
              >
                {incident.status}
              </span>
              {incident.distance_meters && (
                <>
                  <br />
                  {incident.distance_meters}m away
                </>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}