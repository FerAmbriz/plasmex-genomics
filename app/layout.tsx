import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plasmex Genomics — Plataforma de procesamiento genómico",
  description:
    "Análisis genómico básico en el navegador: conteos, árboles filogenéticos, relaciones distantes y regulación.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
