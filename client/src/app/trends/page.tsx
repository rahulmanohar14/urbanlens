"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { getTrends, getCategoryBreakdown, getResolutionTimes, getNeighborhoods, getCrimesByOffense, getTimePatterns, getTopStreets } from "@/lib/api";

const COLORS = ["#6c5ce7", "#ff6b6b", "#00b894", "#fdcb6e", "#a29bfe", "#fd79a8", "#00cec9", "#e17055", "#55efc4", "#74b9ff"];
const card = { background: "#12121a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "24px" };
const tt = { contentStyle: { background: "#12121a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", fontSize: "11px", fontFamily: "Inter" } };
const sectionTitle = { fontSize: "11px", fontWeight: 600, color: "#55556a", textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: "16px" };

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT: Record<string, string> = { "Monday": "Mon", "Tuesday": "Tue", "Wednesday": "Wed", "Thursday": "Thu", "Friday": "Fri", "Saturday": "Sat", "Sunday": "Sun" };

function getHeatColor(count: number, max: number): string {
  if (max === 0) return "rgba(108,92,231,0.05)";
  const ratio = count / max;
  if (ratio > 0.8) return "rgba(255,107,107,0.9)";
  if (ratio > 0.6) return "rgba(255,107,107,0.6)";
  if (ratio > 0.4) return "rgba(253,203,110,0.6)";
  if (ratio > 0.2) return "rgba(108,92,231,0.4)";
  if (ratio > 0.05) return "rgba(108,92,231,0.2)";
  return "rgba(108,92,231,0.05)";
}

function formatStreet(street: string): string {
  if (!street) return "Unknown";
  return street
    .replace(/&amp;/g, "&")
    .replace(/^INTERSECTION\s+/i, "")
    .trim();
}

function SkeletonCard({ height }: { height: number }) {
  return (
    <div style={{ ...card, height: `${height}px`, marginBottom: "16px", position: "relative", overflow: "hidden" }}>
      <div style={{ width: "140px", height: "11px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", marginBottom: "20px" }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.02) 50%, transparent 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.8s infinite",
      }} />
      <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
    </div>
  );
}

export default function TrendsPage() {
  const [trends, setTrends] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [resolution, setResolution] = useState<any[]>([]);
  const [crimeOffenses, setCrimeOffenses] = useState<any[]>([]);
  const [timePatterns, setTimePatterns] = useState<any[]>([]);
  const [topStreets, setTopStreets] = useState<any>({ incidents: [], crimes: [] });
  const [hoods, setHoods] = useState<any[]>([]);
  const [selHood, setSelHood] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getTrends({ days: 180 }),
      getCategoryBreakdown({ days: 180 }),
      getResolutionTimes(),
      getNeighborhoods(),
      getCrimesByOffense(),
      getTimePatterns(),
      getTopStreets(),
    ])
      .then(([t, c, r, h, crimes, tp, ts]) => {
        setTrends(t.data.data || []);
        setCategories(c.data || []);
        setResolution(r.data || []);
        setHoods(h.data || []);
        setCrimeOffenses(crimes.data || []);
        setTimePatterns(tp.data || []);
        setTopStreets(ts.data || { incidents: [], crimes: [] });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filterByHood = async (id: string) => {
    setSelHood(id);
    const params: any = { days: 180 };
    if (id) params.neighborhood_id = parseInt(id);
    const res = await getTrends(params);
    setTrends(res.data.data || []);
  };

  // Build heatmap grid
  const heatmapGrid: Record<string, Record<number, number>> = {};
  let maxCount = 0;
  DAYS_ORDER.forEach((day) => { heatmapGrid[day] = {}; for (let h = 0; h < 24; h++) heatmapGrid[day][h] = 0; });
  timePatterns.forEach((tp: any) => {
    const day = tp.day_of_week?.trim();
    if (day && heatmapGrid[day] !== undefined) {
      heatmapGrid[day][tp.hour] = tp.count;
      if (tp.count > maxCount) maxCount = tp.count;
    }
  });

  if (loading) return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <div style={{ width: "120px", height: "20px", background: "rgba(255,255,255,0.05)", borderRadius: "6px", marginBottom: "8px" }} />
        <div style={{ width: "280px", height: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "4px" }} />
      </div>
      <SkeletonCard height={400} />
      <SkeletonCard height={320} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <SkeletonCard height={320} />
        <SkeletonCard height={320} />
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 600, letterSpacing: "-0.3px" }}>Analytics</h1>
          <p style={{ fontSize: "12px", color: "#55556a", marginTop: "4px" }}>Time-series analysis, temporal patterns, and street-level insights</p>
        </div>
        <select value={selHood} onChange={(e) => filterByHood(e.target.value)} style={{ fontSize: "12px", padding: "8px 14px", borderRadius: "8px", background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", color: "#eeeef0", cursor: "pointer", minWidth: "180px" }}>
          <option value="">All Neighborhoods</option>
          {hoods.map((n: any) => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
      </div>

      {/* Trends */}
      <div style={{ ...card, marginBottom: "16px" }}>
        <p style={sectionTitle}>Incident Trends — Last 180 Days</p>
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

      {/* Time Pattern Heatmap */}
      <div style={{ ...card, marginBottom: "16px" }}>
        <p style={sectionTitle}>Crime Time Patterns</p>
        <p style={{ fontSize: "11px", color: "#55556a", marginBottom: "16px", marginTop: "-8px" }}>When do crimes happen? Darker = more crimes at that hour and day.</p>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: "700px" }}>
            <div style={{ display: "flex", paddingLeft: "50px", marginBottom: "4px" }}>
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} style={{ flex: 1, textAlign: "center", fontSize: "9px", color: "#55556a" }}>
                  {h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`}
                </div>
              ))}
            </div>
            {DAYS_ORDER.map((day) => (
              <div key={day} style={{ display: "flex", alignItems: "center", marginBottom: "2px" }}>
                <div style={{ width: "50px", fontSize: "10px", color: "#9898a6", fontWeight: 500, flexShrink: 0 }}>{DAY_SHORT[day]}</div>
                <div style={{ display: "flex", flex: 1, gap: "2px" }}>
                  {Array.from({ length: 24 }, (_, h) => {
                    const count = heatmapGrid[day]?.[h] || 0;
                    return (
                      <div key={h} title={`${day} ${h}:00 — ${count} crimes`} style={{
                        flex: 1, height: "28px", borderRadius: "3px",
                        background: getHeatColor(count, maxCount),
                        cursor: "default",
                        transition: "transform 0.15s",
                      }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.zIndex = "10"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.zIndex = "1"; }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", paddingLeft: "50px" }}>
              <span style={{ fontSize: "9px", color: "#55556a" }}>Less</span>
              {["rgba(108,92,231,0.05)", "rgba(108,92,231,0.2)", "rgba(108,92,231,0.4)", "rgba(253,203,110,0.6)", "rgba(255,107,107,0.6)", "rgba(255,107,107,0.9)"].map((c, i) => (
                <div key={i} style={{ width: "16px", height: "10px", borderRadius: "2px", background: c }} />
              ))}
              <span style={{ fontSize: "9px", color: "#55556a" }}>More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category + Crimes by Offense */}
      <div className="layout-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
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

      {/* Top Streets */}
      <div className="layout-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div style={card}>
          <p style={sectionTitle}>Top Streets — 311 Incidents</p>
          {(topStreets.incidents || []).length > 0 ? (
            <div>
              {topStreets.incidents.map((s: any, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#6c5ce7", background: "rgba(108,92,231,0.1)", padding: "2px 8px", borderRadius: "6px", minWidth: "28px", textAlign: "center" }}>{i + 1}</span>
                    <span style={{ fontSize: "12px", fontWeight: 500 }}>{formatStreet(s.street)}</span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#a29bfe" }}>{s.count}</span>
                </div>
              ))}
            </div>
          ) : <p style={{ fontSize: "12px", color: "#55556a" }}>No data</p>}
        </div>

        <div style={card}>
          <p style={sectionTitle}>Top Streets — Crimes</p>
          {(topStreets.crimes || []).length > 0 ? (
            <div>
              {topStreets.crimes.map((s: any, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#ff6b6b", background: "rgba(255,107,107,0.1)", padding: "2px 8px", borderRadius: "6px", minWidth: "28px", textAlign: "center" }}>{i + 1}</span>
                    <span style={{ fontSize: "12px", fontWeight: 500 }}>{formatStreet(s.street)}</span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#ff6b6b" }}>{s.count}</span>
                </div>
              ))}
            </div>
          ) : <p style={{ fontSize: "12px", color: "#55556a" }}>No data</p>}
        </div>
      </div>

      {/* Resolution Time */}
      <div style={card}>
        <p style={sectionTitle}>Resolution Time by Category (hours)</p>
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
    </div>
  );
}