"use client";

import { useEffect, useState } from "react";
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { getNeighborhoods, getTrends } from "@/lib/api";
import api from "@/lib/api";

interface ForecastPoint { date: string; predicted: number; lower_bound: number; upper_bound: number; }
interface HistoricalPoint { date: string; count: number; }

const card = { background: "#12121a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "24px" };
const tt = { contentStyle: { background: "#12121a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", fontSize: "11px", fontFamily: "Inter" } };

export default function ForecastPage() {
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
  const [selectedHood, setSelectedHood] = useState<string>("");
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [historical, setHistorical] = useState<HistoricalPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getNeighborhoods().then((res) => setNeighborhoods(res.data || [])).catch(console.error);
  }, []);

  const runForecast = async (neighborhoodId: string) => {
    setSelectedHood(neighborhoodId);
    if (!neighborhoodId) { setForecast([]); setHistorical([]); return; }
    setLoading(true);
    setError(null);
    try {
      const trendsRes = await getTrends({ neighborhood_id: parseInt(neighborhoodId), days: 365 });
      setHistorical(trendsRes.data.data || []);
      const forecastRes = await api.post("/predictions/forecast", { neighborhood_id: parseInt(neighborhoodId), days_ahead: 30 });
      if (forecastRes.data.error) { setError(forecastRes.data.error); setForecast([]); }
      else { setForecast(forecastRes.data.forecast || []); }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Forecast failed");
      setForecast([]);
    } finally { setLoading(false); }
  };

  const combinedData = [
    ...historical.map((h) => ({ date: h.date, actual: h.count, predicted: null as number | null, lower: null as number | null, upper: null as number | null })),
    ...forecast.map((f) => ({ date: f.date, actual: null as number | null, predicted: f.predicted, lower: f.lower_bound, upper: f.upper_bound })),
  ];

  const selectedName = neighborhoods.find((n: any) => n.id === parseInt(selectedHood))?.name;

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 600, letterSpacing: "-0.3px" }}>Forecast</h1>
        <p style={{ fontSize: "12px", color: "#55556a", marginTop: "4px" }}>Holt-Winters exponential smoothing with confidence intervals</p>
      </div>

      <div style={{ ...card, marginBottom: "16px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "12px", fontWeight: 500, color: "#9898a6" }}>Neighborhood</span>
        <select value={selectedHood} onChange={(e) => runForecast(e.target.value)} style={{ fontSize: "12px", padding: "8px 14px", borderRadius: "8px", background: "#0a0a0f", border: "1px solid rgba(255,255,255,0.08)", color: "#eeeef0", cursor: "pointer", minWidth: "220px", flex: "1", maxWidth: "320px" }}>
          <option value="">Choose a neighborhood...</option>
          {neighborhoods.filter((n: any) => n.total_incidents > 0).map((n: any) => (
            <option key={n.id} value={n.id}>{n.name} ({n.total_incidents} incidents)</option>
          ))}
        </select>
        {loading && <span style={{ fontSize: "12px", color: "#6c5ce7" }}>Running forecast...</span>}
      </div>

      {error && (
        <div style={{ ...card, marginBottom: "16px", borderColor: "rgba(255,107,107,0.3)", background: "rgba(255,107,107,0.05)" }}>
          <p style={{ fontSize: "12px", color: "#ff6b6b" }}>{error}</p>
        </div>
      )}

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
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" stroke="#55556a" fontSize={10} tickFormatter={(val) => val.slice(5)} />
              <YAxis stroke="#55556a" fontSize={10} />
              <Tooltip {...tt} />
              <Area type="monotone" dataKey="upper" stroke="none" fill="#00b894" fillOpacity={0.1} name="Upper Bound" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="#0a0a0f" fillOpacity={1} name="Lower Bound" />
              <Line type="monotone" dataKey="actual" stroke="#6c5ce7" strokeWidth={1.5} dot={false} name="Actual" connectNulls={false} />
              <Line type="monotone" dataKey="predicted" stroke="#00b894" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Predicted" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {!selectedHood && !loading && (
        <div style={{ ...card, textAlign: "center", padding: "60px 24px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(108,92,231,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "20px", color: "#6c5ce7" }}>
            {"◈"}
          </div>
          <p style={{ fontSize: "14px", fontWeight: 500, marginBottom: "6px" }}>Select a neighborhood</p>
          <p style={{ fontSize: "12px", color: "#55556a", maxWidth: "300px", margin: "0 auto" }}>The model will analyze historical patterns and predict incident volumes for the next 30 days</p>
        </div>
      )}

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