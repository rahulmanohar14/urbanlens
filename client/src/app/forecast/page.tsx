"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { getNeighborhoods, getTrends } from "@/lib/api";
import api from "@/lib/api";

interface ForecastPoint {
  date: string;
  predicted: number;
  lower_bound: number;
  upper_bound: number;
}

interface HistoricalPoint {
  date: string;
  count: number;
}

export default function ForecastPage() {
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
  const [selectedHood, setSelectedHood] = useState<string>("");
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [historical, setHistorical] = useState<HistoricalPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getNeighborhoods()
      .then((res) => setNeighborhoods(res.data || []))
      .catch((err) => console.error("Failed to load neighborhoods:", err));
  }, []);

  const runForecast = async (neighborhoodId: string) => {
    setSelectedHood(neighborhoodId);
    if (!neighborhoodId) {
      setForecast([]);
      setHistorical([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const trendsRes = await getTrends({ neighborhood_id: parseInt(neighborhoodId), days: 365 });
      setHistorical(trendsRes.data.data || []);

      const forecastRes = await api.post("/predictions/forecast", { neighborhood_id: parseInt(neighborhoodId), days_ahead: 30 });

      if (forecastRes.data.error) {
        setError(forecastRes.data.error);
        setForecast([]);
      } else {
        setForecast(forecastRes.data.forecast || []);
      }
    } catch (err: any) {
      console.error("Forecast failed:", err);
      setError(err.response?.data?.detail || "Forecast failed — statsmodels may not be installed");
      setForecast([]);
    } finally {
      setLoading(false);
    }
  };

  const combinedData = [
    ...historical.map((h) => ({ date: h.date, actual: h.count, predicted: null as number | null, lower: null as number | null, upper: null as number | null })),
    ...forecast.map((f) => ({ date: f.date, actual: null as number | null, predicted: f.predicted, lower: f.lower_bound, upper: f.upper_bound })),
  ];

  const selectedName = neighborhoods.find((n: any) => n.id === parseInt(selectedHood))?.name;

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <a href="/" className="text-sm mb-2 inline-block" style={{ color: "var(--accent)" }}>{"← Back to Dashboard"}</a>
        <h1 className="text-3xl font-bold">{"🔮 Incident Forecast"}</h1>
        <p style={{ color: "var(--muted)" }}>Holt-Winters exponential smoothing forecasting with confidence intervals</p>
      </div>

      <div className="rounded-xl border p-5 mb-6 flex items-center gap-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <label className="text-sm font-medium">Select Neighborhood:</label>
        <select value={selectedHood} onChange={(e) => runForecast(e.target.value)} className="px-4 py-2 rounded-lg border text-sm flex-1 max-w-xs" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}>
          <option value="">Choose a neighborhood...</option>
          {neighborhoods.filter((n: any) => n.total_incidents > 0).map((n: any) => (
            <option key={n.id} value={n.id}>{n.name} ({n.total_incidents} incidents)</option>
          ))}
        </select>
        {loading && <span className="text-sm" style={{ color: "var(--accent)" }}>Running forecast...</span>}
      </div>

      {error && (
        <div className="rounded-xl border p-4 mb-6" style={{ background: "rgba(239,68,68,0.1)", borderColor: "#ef4444", color: "#ef4444" }}>
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Make sure statsmodels is installed: pip install statsmodels</p>
        </div>
      )}

      {combinedData.length > 0 && (
        <div className="rounded-xl border p-5 mb-6" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <h2 className="text-lg font-semibold mb-1">
            {"30-Day Incident Forecast"}
            {selectedName && <span style={{ color: "var(--accent)" }}>{" — " + selectedName}</span>}
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>Blue = actual data | Green = forecast prediction | Shaded = 80% confidence interval</p>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="date" stroke="#737373" fontSize={11} tickFormatter={(val) => val.slice(5)} />
              <YAxis stroke="#737373" fontSize={11} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", fontSize: "12px" }} />
              <Area type="monotone" dataKey="upper" stroke="none" fill="#22c55e" fillOpacity={0.1} name="Upper Bound" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="#0a0a0a" fillOpacity={1} name="Lower Bound" />
              <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Actual" connectNulls={false} />
              <Line type="monotone" dataKey="predicted" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Predicted" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {!selectedHood && !loading && (
        <div className="rounded-xl border p-12 text-center" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--muted)" }}>
          <p className="text-4xl mb-4">{"🔮"}</p>
          <p className="text-lg mb-2">Select a neighborhood to generate a forecast</p>
          <p className="text-sm">The model will analyze historical incident patterns and predict the next 30 days</p>
        </div>
      )}

      <div className="rounded-xl border p-5 mt-6" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <h3 className="font-semibold mb-3">How This Works</h3>
        <div className="grid grid-cols-3 gap-4 text-sm" style={{ color: "var(--muted)" }}>
          <div>
            <p className="font-medium mb-1" style={{ color: "var(--foreground)" }}>1. Historical Data</p>
            <p>Daily incident counts from your PostGIS database, aggregated from the materialized view using window functions.</p>
          </div>
          <div>
            <p className="font-medium mb-1" style={{ color: "var(--foreground)" }}>2. Forecasting Model</p>
            <p>Holt-Winters Exponential Smoothing decomposes the time series into trend + weekly seasonality components, capturing recurring 7-day patterns in incident data.</p>
          </div>
          <div>
            <p className="font-medium mb-1" style={{ color: "var(--foreground)" }}>3. Confidence Intervals</p>
            <p>The shaded region shows 80% confidence bounds — the model is 80% sure the actual value will fall within this range.</p>
          </div>
        </div>
      </div>
    </div>
  );
}