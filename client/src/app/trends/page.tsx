"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { getTrends, getCategoryBreakdown, getResolutionTimes, getComparison, getNeighborhoods, getCrimesByOffense } from "@/lib/api";

const COLORS = ["#6c5ce7", "#ff6b6b", "#00b894", "#fdcb6e", "#a29bfe", "#fd79a8", "#00cec9", "#e17055", "#55efc4", "#74b9ff"];
const card = { background: "#12121a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "24px" };
const tt = { contentStyle: { background: "#12121a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", fontSize: "11px", fontFamily: "Inter" } };
const sectionTitle = { fontSize: "11px", fontWeight: 600, color: "#55556a", textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: "16px" };

export default function TrendsPage() {
  const [trends, setTrends] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [resolution, setResolution] = useState<any[]>([]);
  const [comparison, setComparison] = useState<any[]>([]);
  const [hoods, setHoods] = useState<any[]>([]);
  const [crimeOffenses, setCrimeOffenses] = useState<any[]>([]);
  const [selHood, setSelHood] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTrends({ days: 365 }), getCategoryBreakdown({ days: 365 }), getResolutionTimes(), getComparison({ days: 365 }), getNeighborhoods(), getCrimesByOffense()])
      .then(([t, c, r, comp, h, crimes]) => { setTrends(t.data.data || []); setCategories(c.data || []); setResolution(r.data || []); setComparison(comp.data || []); setHoods(h.data || []); setCrimeOffenses(crimes.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filterByHood = async (id: string) => {
    setSelHood(id);
    const params: any = { days: 365 };
    if (id) params.neighborhood_id = parseInt(id);
    const res = await getTrends(params);
    setTrends(res.data.data || []);
  };

  if (loading) return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
      <div style={{ ...card, height: "400px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "13px", color: "#55556a" }}>Loading analytics...</p>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 600, letterSpacing: "-0.3px" }}>Analytics</h1>
          <p style={{ fontSize: "12px", color: "#55556a", marginTop: "4px" }}>Time-series analysis, category breakdown, and neighborhood comparison</p>
        </div>
        <select value={selHood} onChange={(e) => filterByHood(e.target.value)} style={{ fontSize: "12px", padding: "8px 14px", borderRadius: "8px", background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", color: "#eeeef0", cursor: "pointer", minWidth: "180px" }}>
          <option value="">All Neighborhoods</option>
          {hoods.map((n: any) => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
      </div>

      {/* Trends */}
      <div style={{ ...card, marginBottom: "16px" }}>
        <p style={sectionTitle}>Incident Trends</p>
        {trends.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" stroke="#55556a" fontSize={10} tickFormatter={(v) => v.slice(5)} />
              <YAxis stroke="#55556a" fontSize={10} />
              <Tooltip {...tt} />
              <Line type="monotone" dataKey="count" stroke="#6c5ce7" strokeWidth={1} dot={false} name="Daily" />
              <Line type="monotone" dataKey="rolling_avg_7d" stroke="#fdcb6e" strokeWidth={2} dot={false} name="7-day Avg" />
            </LineChart>
          </ResponsiveContainer>
        ) : <p style={{ fontSize: "12px", color: "#55556a" }}>No data available</p>}
      </div>

      {/* Category + Crimes by Offense */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div style={card}>
          <p style={sectionTitle}>311 Incidents by Category</p>
          {categories.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={categories.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" stroke="#55556a" fontSize={10} />
                <YAxis type="category" dataKey="category" stroke="#55556a" fontSize={9} width={130} tickFormatter={(v) => v.length > 18 ? v.slice(0, 18) + "..." : v} />
                <Tooltip {...tt} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>{categories.slice(0, 10).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={{ fontSize: "12px", color: "#55556a" }}>No data</p>}
        </div>

        <div style={card}>
          <p style={sectionTitle}>Crimes by Offense Type</p>
          {crimeOffenses.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={crimeOffenses.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" stroke="#55556a" fontSize={10} />
                <YAxis type="category" dataKey="offense_description" stroke="#55556a" fontSize={9} width={130} tickFormatter={(v) => v.length > 18 ? v.slice(0, 18) + "..." : v} />
                <Tooltip {...tt} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>{crimeOffenses.slice(0, 10).map((_, i) => <Cell key={i} fill={["#ff6b6b", "#e17055", "#fd79a8", "#d63031", "#ff7675", "#fab1a0", "#e55039", "#eb4d4b", "#f19066", "#ea8685"][i % 10]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={{ fontSize: "12px", color: "#55556a" }}>No crime data</p>}
        </div>
      </div>

      {/* Resolution Time */}
      <div style={{ ...card, marginBottom: "16px" }}>
        <p style={sectionTitle}>Resolution Time (hours)</p>
        {resolution.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={resolution.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" stroke="#55556a" fontSize={10} />
              <YAxis type="category" dataKey="category" stroke="#55556a" fontSize={9} width={130} tickFormatter={(v) => v.length > 18 ? v.slice(0, 18) + "..." : v} />
              <Tooltip {...tt} formatter={(value: any) => [`${value}h`, "Avg Time"]} />
              <Bar dataKey="avg_hours" radius={[0, 4, 4, 0]}>{resolution.slice(0, 10).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <p style={{ fontSize: "12px", color: "#55556a" }}>No data</p>}
      </div>

      {/* Neighborhood Comparison */}
      <div style={card}>
        <p style={sectionTitle}>Neighborhood Comparison</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 500, color: "#55556a" }}>Neighborhood</th>
                <th style={{ textAlign: "right", padding: "12px 16px", fontWeight: 500, color: "#55556a" }}>Current</th>
                <th style={{ textAlign: "right", padding: "12px 16px", fontWeight: 500, color: "#55556a" }}>Previous</th>
                <th style={{ textAlign: "right", padding: "12px 16px", fontWeight: 500, color: "#55556a" }}>Change</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((r: any) => (
                <tr key={r.neighborhood_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "12px 16px", fontWeight: 500 }}>{r.name}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>{r.current_count.toLocaleString()}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", color: "#55556a" }}>{r.previous_count.toLocaleString()}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    {r.pct_change !== null ? (
                      <span style={{ color: r.pct_change > 0 ? "#ff6b6b" : r.pct_change < 0 ? "#00b894" : "#55556a", fontWeight: 500 }}>
                        {r.pct_change > 0 ? "+" : ""}{r.pct_change}%
                      </span>
                    ) : <span style={{ color: "#55556a" }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}