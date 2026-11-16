import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plasmex Genomics — Huella Espectral RGB",
  description: "Proyección espectral RGB de secuencias genómicas por accession ID del NCBI.",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-[#09090b] antialiased">{children}</body>
    </html>
  );
}
