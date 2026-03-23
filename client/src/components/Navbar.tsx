"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const navItems = [
  { href: "/", label: "Dashboard", icon: "◉" },
  { href: "/trends", label: "Analytics", icon: "◈" },
  { href: "/forecast", label: "Forecast", icon: "◇" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b backdrop-blur-xl" style={{ background: "rgba(9,9,11,0.85)", borderColor: "var(--border)" }}>
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: "var(--accent)", color: "#fff" }}>U</div>
          <span className="text-sm font-semibold tracking-tight">UrbanLens</span>
        </Link>
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm px-4 py-1.5 rounded-md transition-all duration-200"
                style={{
                  background: isActive ? "var(--accent-glow)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--muted)",
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <a href="https://github.com/rahulmanohar14/urbanlens" target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-md border transition-colors hover:bg-white/5" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
            Source Code
          </a>
        </div>
      </div>
    </nav>
  );
}