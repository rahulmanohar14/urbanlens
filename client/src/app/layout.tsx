import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "UrbanLens — Boston Urban Analytics",
  description: "Geospatial analytics platform for Boston city data",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="" />
      </head>
      <body className="antialiased">
        <Navbar />
        <main className="max-w-7xl mx-auto">{children}</main>
        <footer className="border-t mt-20 py-8 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Built by Rahul Manohar Durshinapally</p>
          <p className="text-xs mt-1" style={{ color: "var(--border)" }}>FastAPI · PostGIS · Next.js · Recharts · Holt-Winters</p>
        </footer>
      </body>
    </html>
  );
}