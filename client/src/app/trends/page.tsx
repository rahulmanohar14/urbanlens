"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  getTrends,
  getCategoryBreakdown,
  getResolutionTimes,
  getComparison,
  getNeighborhoods,
} from "@/lib/api";

// Colors for the bar charts
const COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1",
];

export default function TrendsPage() {
  const [trends, setTrends] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [resolutionTimes, setResolutionTimes] = useState<any[]>([]);
  const [comparison, setComparison] = useState<any[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Load all data on page load
  useEffect(() => {
    Promise.all([
      getTrends({ days: 365 }),
      getCategoryBreakdown({ days: 365 }),
      getResolutionTimes(),
      getComparison({ days: 365 }),
      getNeighborhoods(),
    ])
      .then(([trendsRes, catRes, resRes, compRes, hoodRes]) => {
        setTrends(trendsRes.data.data || []);
        setCategories(catRes.data || []);
        setResolutionTimes(resRes.data || []);
        setComparison(compRes.data || []);
        setNeighborhoods(hoodRes.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load analytics:", err);
        setLoading(false);
      });
  }, []);

  // Reload trends when neighborhood filter changes
  const handleNeighborhoodChange = async (neighborhoodId: string) => {
    setSelectedNeighborhood(neighborhoodId);
    try {
      const params: any = { days: 365 };
      if (neighborhoodId) params.neighborhood_id = parseInt(neighborhoodId);
      const res = await getTrends(params);
      setTrends(res.data.data || []);
    } catch (err) {
      console.error("Failed to filter trends:", err);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen p-6 flex items-center justify-center"
        style={{ color: "var(--muted)" }}
      >
        <p className="text-xl">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header with back link */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <a href="/" className="text-sm mb-2 inline-block" style={{ color: "var(--accent)" }}>
            ← Back to Dashboard
          </a>
          <h1 className="text-3xl font-bold">📊 Trends & Analytics</h1>
          <p style={{ color: "var(--muted)" }}>
            Time-series analysis, category breakdowns, and neighborhood comparisons
          </p>
        </div>

        {/* Neighborhood filter */}
        <select
          value={selectedNeighborhood}
          onChange={(e) => handleNeighborhoodChange(e.target.value)}
          className="px-4 py-2 rounded-lg border text-sm"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          <option value="">All Neighborhoods</option>
          {neighborhoods.map((n: any) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </div>

      {/* Row 1: Trends Line Chart */}
      <div
        className="rounded-xl border p-5 mb-6"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <h2 className="text-lg font-semibold mb-4">
          Incident Trends (with 7-day Rolling Average)
        </h2>
        {trends.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis
                dataKey="date"
                stroke="#737373"
                fontSize={11}
                tickFormatter={(val) => val.slice(5)}
              />
              <YAxis stroke="#737373" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={1}
                dot={false}
                name="Daily Count"
              />
              <Line
                type="monotone"
                dataKey="rolling_avg_7d"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="7-day Avg"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: "var(--muted)" }}>No trend data available</p>
        )}
      </div>

      {/* Row 2: Category Breakdown + Resolution Times */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Category Breakdown */}
        <div
          className="rounded-xl border p-5"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <h2 className="text-lg font-semibold mb-4">Incidents by Category</h2>
          {categories.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={categories.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis type="number" stroke="#737373" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="category"
                  stroke="#737373"
                  fontSize={10}
                  width={150}
                  tickFormatter={(val) =>
                    val.length > 20 ? val.slice(0, 20) + "..." : val
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" name="Incidents" radius={[0, 4, 4, 0]}>
                  {categories.slice(0, 10).map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: "var(--muted)" }}>No category data available</p>
          )}
        </div>

        {/* Resolution Times */}
        <div
          className="rounded-xl border p-5"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <h2 className="text-lg font-semibold mb-4">
            Avg Resolution Time by Category (hours)
          </h2>
          {resolutionTimes.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={resolutionTimes.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis type="number" stroke="#737373" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="category"
                  stroke="#737373"
                  fontSize={10}
                  width={150}
                  tickFormatter={(val) =>
                    val.length > 20 ? val.slice(0, 20) + "..." : val
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: any) => [`${value}h`, "Avg Time"]}
                />
                <Bar dataKey="avg_hours" name="Avg Hours" radius={[0, 4, 4, 0]}>
                  {resolutionTimes.slice(0, 10).map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: "var(--muted)" }}>No resolution data available</p>
          )}
        </div>
      </div>

      {/* Row 3: Neighborhood Comparison Table */}
      <div
        className="rounded-xl border p-5"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <h2 className="text-lg font-semibold mb-4">
          Neighborhood Comparison (Current vs Previous Period)
        </h2>
        {comparison.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left p-3">Neighborhood</th>
                  <th className="text-right p-3">Current Period</th>
                  <th className="text-right p-3">Previous Period</th>
                  <th className="text-right p-3">Change</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row: any) => (
                  <tr
                    key={row.neighborhood_id}
                    className="hover:bg-white/5 transition-colors"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td className="p-3 font-medium">{row.name}</td>
                    <td className="p-3 text-right">
                      {row.current_count.toLocaleString()}
                    </td>
                    <td className="p-3 text-right" style={{ color: "var(--muted)" }}>
                      {row.previous_count.toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      {row.pct_change !== null ? (
                        <span
                          style={{
                            color:
                              row.pct_change > 0
                                ? "#ef4444"
                                : row.pct_change < 0
                                ? "#22c55e"
                                : "var(--muted)",
                          }}
                        >
                          {row.pct_change > 0 ? "+" : ""}
                          {row.pct_change}%
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: "var(--muted)" }}>No comparison data available</p>
        )}
      </div>
    </div>
  );
}