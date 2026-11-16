"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import AccessionInput from "../components/AccessionInput";
import FingerprintViewer from "../components/FingerprintViewer";
import MetadataPanel from "../components/MetadataPanel";
import { buildFingerprint, demoSequence, validateAccession, type Fingerprint } from "../lib/processor";

const SPRING = { type: "spring" as const, stiffness: 400, damping: 30 };

export default function Page() {
  const [accession, setAccession] = useState("NC_045512.2");
  const [fp, setFp] = useState<Fingerprint | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const analyze = async () => {
    if (!validateAccession(accession) || loading) return;
    setLoading(true); setProgress(8);
    // En producción: fetch(`/api/v1/analyze?accession_id=${accession}&format=json`)
    // Aquí: mismo algoritmo en cliente (lib/processor.ts) para demo inmediata.
    timer.current = setInterval(() => setProgress((p) => Math.min(92, p + 12)), 120);
    await new Promise((r) => setTimeout(r, 650));
    const seq = demoSequence(accession.trim().toUpperCase(), 4096);
    setFp(buildFingerprint(seq, accession));
    if (timer.current) clearInterval(timer.current);
    setProgress(100);
    setTimeout(() => setLoading(false), 250);
  };
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
        <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}>
          <p className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase">Plasmex Genomics</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Huella espectral RGB
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-zinc-400">
            Una secuencia, una imagen. Cada base es un píxel — A, C, G y T
            proyectadas en color para ver el genoma de un vistazo.
          </p>
        </motion.header>

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.05 }}
          className="mt-8">
          <AccessionInput value={accession} onChange={setAccession} onAnalyze={analyze} loading={loading} />
        </motion.section>

        {/* Móvil: apilado. Desktop: visor + panel lateral */}
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
          <FingerprintViewer fp={fp} accession={accession} loading={loading} progress={progress} />
          <div className="space-y-4">
            <MetadataPanel fp={fp} accession={accession} />
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl sm:p-5">
              <h3 className="text-sm font-medium text-zinc-200">Cómo se construye</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                Padding simétrico hasta el cuadrado perfecto, reshape a (H, W, 3)
                con NumPy y render a PNG con PIL. El endpoint es{" "}
                <code className="font-mono text-zinc-300">GET /api/v1/analyze?accession_id=…</code>
              </p>
            </div>
          </div>
        </div>
        <footer className="mt-10 text-center text-[11px] text-zinc-600">
          Plasmex Genomics · Motor de Proyección Espectral RGB · FastAPI + Next.js
        </footer>
      </div>
    </main>
  );
}
