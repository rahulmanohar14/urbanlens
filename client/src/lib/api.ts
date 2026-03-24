import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api/v1",
  headers: { "Content-Type": "application/json" },
});

export const getIncidents = (params?: Record<string, any>) =>
  api.get("/incidents/", { params });

export const getIncidentsNearby = (lat: number, lng: number, radius: number = 500) =>
  api.get("/incidents/nearby", { params: { lat, lng, radius } });

export const getIncidentCategories = () =>
  api.get("/incidents/categories");

export const getHeatmapData = (params?: Record<string, any>) =>
  api.get("/incidents/heatmap", { params });

export const getCrimesNearby = (lat: number, lng: number, radius: number = 500) =>
  api.get("/crimes/nearby", { params: { lat, lng, radius } });

export const getCrimesByOffense = () =>
  api.get("/crimes/by-offense");

export const getNeighborhoods = () =>
  api.get("/neighborhoods/");

export const getNeighborhoodGeoJSON = () =>
  api.get("/neighborhoods/geojson");

export const getNeighborhoodIncidents = (id: number) =>
  api.get(`/neighborhoods/${id}/incidents`);

export const getSummary = () =>
  api.get("/analytics/summary");

export const getTrends = (params?: Record<string, any>) =>
  api.get("/analytics/trends", { params });

export const getComparison = (params?: Record<string, any>) =>
  api.get("/analytics/comparison", { params });

export const getResolutionTimes = () =>
  api.get("/analytics/resolution-time");

export const getCategoryBreakdown = (params?: Record<string, any>) =>
  api.get("/analytics/categories", { params });

export default api;