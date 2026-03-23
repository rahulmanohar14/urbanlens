"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const navItems = [
  { href: "/", label: "🗺️ Dashboard" },
  { href: "/trends", label: "📊 Trends" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      className="border-b px-6 py-3 flex items-center gap-6"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <Link href="/" className="text-lg font-bold mr-4">
        🏙️ UrbanLens
      </Link>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-sm px-3 py-1.5 rounded-lg transition-colors"
          style={{
            background: pathname === item.href ? "var(--accent)" : "transparent",
            color: pathname === item.href ? "#fff" : "var(--muted)",
          }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}