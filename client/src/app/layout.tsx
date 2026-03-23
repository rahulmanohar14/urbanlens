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
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="" />
      </head>
      <body className="antialiased">
        <Navbar />
        <main>{children}</main>
        <footer className="border-t px-6 py-4 mt-12 text-center text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
          {"UrbanLens — Built by Rahul Manohar Durshinapally | FastAPI + PostGIS + Next.js + Recharts | "}
          <a href="https://github.com/rahulmanohar14/urbanlens" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>GitHub</a>
        </footer>
      </body>
    </html>
  );
}