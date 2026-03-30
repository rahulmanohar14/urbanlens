"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/trends", label: "Analytics" },
  { href: "/forecast", label: "Forecast" },
];

export default function TopBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navBg = "rgba(255,255,255,0.03)";
  const navBorder = "1px solid rgba(255,255,255,0.06)";
  const headerStyle = { background: "rgba(10,10,15,0.75)", backdropFilter: "blur(20px) saturate(180%)", borderBottom: "1px solid rgba(255,255,255,0.08)" };
  const logoBg = { background: "linear-gradient(135deg, #6c5ce7, #a29bfe)", color: "#fff", boxShadow: "0 4px 15px rgba(108,92,231,0.3)" };

  const getNavStyle = (active: boolean) => ({
    fontSize: "13px",
    background: active ? "rgba(108,92,231,0.15)" : "transparent",
    color: active ? "#a29bfe" : "#9898a6",
    fontWeight: active ? 600 : 400,
  });

  const ghStyle = { fontSize: "12px", borderColor: "rgba(255,255,255,0.08)", color: "#9898a6" };

  return (
    <header className="sticky top-0 z-[999]" style={headerStyle}>
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 20px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none", color: "inherit" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, ...logoBg }}>U</div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.3px" }}>UrbanLens</div>
            <div style={{ fontSize: "10px", color: "#55556a" }}>Boston Analytics</div>
          </div>
        </Link>

        <nav className="topbar-nav" style={{ display: "flex", alignItems: "center", gap: "4px", background: navBg, border: navBorder, borderRadius: "12px", padding: "4px" }}>
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link key={l.href} href={l.href} className="hover:bg-white/[0.04]" style={{ padding: "8px 20px", borderRadius: "8px", textDecoration: "none", transition: "all 0.2s", ...getNavStyle(active) }}>
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <GithubLink style={ghStyle} />
          <button className="topbar-menu-btn" onClick={() => setMenuOpen(!menuOpen)} style={{ display: "none", width: "40px", height: "40px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "5px", cursor: "pointer" }}>
            {menuOpen ? (
              <span style={{ fontSize: "18px", color: "#9898a6", lineHeight: 1 }}>{"✕"}</span>
            ) : (
              <>
                <span style={{ width: "16px", height: "2px", borderRadius: "1px", background: "#9898a6" }} />
                <span style={{ width: "12px", height: "2px", borderRadius: "1px", background: "#9898a6" }} />
                <span style={{ width: "16px", height: "2px", borderRadius: "1px", background: "#9898a6" }} />
              </>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="topbar-mobile-menu" style={{ padding: "8px 20px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "12px 16px", borderRadius: "10px", textDecoration: "none", marginBottom: "4px", fontSize: "14px", background: active ? "rgba(108,92,231,0.12)" : "transparent", color: active ? "#a29bfe" : "#9898a6", fontWeight: active ? 600 : 400 }}>
                {l.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}

function GithubLink({ style }: { style: React.CSSProperties }) {
  return (
    <a className="topbar-github" href="https://github.com/rahulmanohar14/urbanlens" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none", transition: "all 0.2s", ...style }}>
      <GithubIcon />
      <span>GitHub</span>
    </a>
  );
}

function GithubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}