"use client";

import { useEffect, useState } from "react";
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { getNeighborhoods, getTrends } from "@/lib/api";
import api from "@/lib/api";

interface ForecastPoint { date: string; predicted: number; lower_bound: number; upper_bound: number; }
interface HistoricalPoint { date: string; count: number; }

const card = { background: "#12121a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "24px" };
const tt = { contentStyle: { background: "#12121a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", fontSize: "11px", fontFamily: "Inter" } };

type ForecastScope = "citywide" | "neighborhood";

export default function ForecastPage() {
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
  const [selectedHood, setSelectedHood] = useState<string>("");
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [historical, setHistorical] = useState<HistoricalPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<ForecastScope>("citywide");
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    getNeighborhoods().then((res) => setNeighborhoods(res.data || [])).catch(console.error);
  }, []);

  // Auto-run city-wide forecast on load
  useEffect(() => {
    if (scope === "citywide" && !hasRun) {
      runForecast(null);
    }
  }, [scope]);

  const runForecast = async (neighborhoodId: string | null) => {
    setLoading(true);
    setError(null);
    setHasRun(true);

    try {
      // Get historical trends
      const trendsParams: any = { days: 365 };
      if (neighborhoodId) trendsParams.neighborhood_id = parseInt(neighborhoodId);
      const trendsRes = await getTrends(trendsParams);
      setHistorical(trendsRes.data.data || []);

      // Run forecast
      const body: any = { days_ahead: 30, aggregation: "daily" };
      if (neighborhoodId) body.neighborhood_id = parseInt(neighborhoodId);

      const forecastRes = await api.post("/predictions/forecast", body);
      if (forecastRes.data.error) {
        setError(forecastRes.data.error);
        setForecast([]);
      } else {
        setForecast(forecastRes.data.forecast || []);
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d: any) => d.msg || JSON.stringify(d)).join(", "));
      } else if (detail) {
        setError(JSON.stringify(detail));
      } else {
        setError("Forecast failed — check backend logs");
      }
      setForecast([]);
    } finally {
      setLoading(false);
    }
  };

  const handleScopeChange = (newScope: ForecastScope) => {
    setScope(newScope);
    setForecast([]);
    setHistorical([]);
    setSelectedHood("");
    setHasRun(false);
    if (newScope === "citywide") {
      runForecast(null);
    }
  };

  const handleNeighborhoodChange = (id: string) => {
    setSelectedHood(id);
    if (id) runForecast(id);
  };

  const combinedData = [
    ...historical.map((h) => ({ date: h.date, actual: h.count, predicted: null as number | null, lower: null as number | null, upper: null as number | null })),
    ...forecast.map((f) => ({ date: f.date, actual: null as number | null, predicted: f.predicted, lower: f.lower_bound, upper: f.upper_bound })),
  ];

  const selectedName = scope === "citywide" ? "All Boston" : neighborhoods.find((n: any) => n.id === parseInt(selectedHood))?.name;

  const toggleStyle = (active: boolean) => ({
    padding: "8px 18px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: active ? 600 : 400,
    background: active ? "rgba(108,92,231,0.15)" : "transparent",
    color: active ? "#a29bfe" : "#55556a",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s",
  });

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 600, letterSpacing: "-0.3px" }}>Forecast</h1>
        <p style={{ fontSize: "12px", color: "#55556a", marginTop: "4px" }}>Holt-Winters exponential smoothing with confidence intervals</p>
      </div>

      {/* Controls */}
      <div style={{ ...card, marginBottom: "16px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        {/* Scope toggle */}
        <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "3px" }}>
          <button onClick={() => handleScopeChange("citywide")} style={toggleStyle(scope === "citywide")}>City-wide</button>
          <button onClick={() => handleScopeChange("neighborhood")} style={toggleStyle(scope === "neighborhood")}>By Neighborhood</button>
        </div>

        {/* Neighborhood selector (only when in neighborhood mode) */}
        {scope === "neighborhood" && (
          <select value={selectedHood} onChange={(e) => handleNeighborhoodChange(e.target.value)} style={{ fontSize: "12px", padding: "8px 14px", borderRadius: "8px", background: "#0a0a0f", border: "1px solid rgba(255,255,255,0.08)", color: "#eeeef0", cursor: "pointer", minWidth: "220px" }}>
            <option value="">Choose a neighborhood...</option>
            {neighborhoods.filter((n: any) => n.total_incidents > 0).map((n: any) => (
              <option key={n.id} value={n.id}>{n.name} ({n.total_incidents} incidents)</option>
            ))}
          </select>
        )}

        {loading && <span style={{ fontSize: "12px", color: "#6c5ce7" }}>Running forecast...</span>}
      </div>

      {/* Error */}
      {error && (
        <div style={{ ...card, marginBottom: "16px", borderColor: "rgba(255,107,107,0.3)", background: "rgba(255,107,107,0.05)" }}>
          <p style={{ fontSize: "12px", color: "#ff6b6b" }}>{error}</p>
        </div>
      )}

      {/* Chart */}
      {combinedData.length > 0 && (
        <div style={{ ...card, marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "4px" }}>
            <p style={{ fontSize: "14px", fontWeight: 600 }}>30-Day Forecast</p>
            {selectedName && <span style={{ fontSize: "13px", color: "#6c5ce7" }}>{selectedName}</span>}
          </div>
          <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "12px", height: "2px", background: "#6c5ce7", borderRadius: "1px" }} />
              <span style={{ fontSize: "10px", color: "#55556a" }}>Actual</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "12px", height: "2px", background: "#00b894", borderRadius: "1px" }} />
              <span style={{ fontSize: "10px", color: "#55556a" }}>Predicted</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "12px", height: "8px", background: "rgba(0,184,148,0.15)", borderRadius: "2px" }} />
              <span style={{ fontSize: "10px", color: "#55556a" }}>80% Confidence</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" stroke="#55556a" fontSize={10} tickFormatter={(val) => val.slice(5)} />
              <YAxis stroke="#55556a" fontSize={10} />
              <Tooltip {...tt} />
              <Area type="monotone" dataKey="upper" stroke="none" fill="#00b894" fillOpacity={0.15} name="Upper Bound" legendType="none" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="#0a0a0f" fillOpacity={1} name="Lower Bound" legendType="none" hide />
              <Line type="monotone" dataKey="actual" stroke="#6c5ce7" strokeWidth={1.5} dot={false} name="Actual" connectNulls={false} />
              <Line type="monotone" dataKey="predicted" stroke="#00b894" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Predicted" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty state for neighborhood mode */}
      {scope === "neighborhood" && !selectedHood && !loading && (
        <div style={{ ...card, textAlign: "center", padding: "60px 24px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(108,92,231,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "20px", color: "#6c5ce7" }}>{"◈"}</div>
          <p style={{ fontSize: "14px", fontWeight: 500, marginBottom: "6px" }}>Select a neighborhood</p>
          <p style={{ fontSize: "12px", color: "#55556a", maxWidth: "300px", margin: "0 auto" }}>Choose a neighborhood from the dropdown to see a localized forecast</p>
        </div>
      )}

      {/* How It Works */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginTop: "16px" }}>
        {[
          { num: "01", title: "Historical Data", desc: "Daily incident counts from PostGIS, aggregated via materialized views with window functions" },
          { num: "02", title: "Forecasting Model", desc: "Holt-Winters Exponential Smoothing captures trend and weekly seasonality in 7-day cycles" },
          { num: "03", title: "Confidence Intervals", desc: "80% confidence bounds calculated from residual standard deviation of the fitted model" },
        ].map((item) => (
          <div key={item.num} style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#6c5ce7", background: "rgba(108,92,231,0.1)", padding: "4px 8px", borderRadius: "6px" }}>{item.num}</span>
              <span style={{ fontSize: "13px", fontWeight: 600 }}>{item.title}</span>
            </div>
            <p style={{ fontSize: "12px", color: "#55556a", lineHeight: "1.6" }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}