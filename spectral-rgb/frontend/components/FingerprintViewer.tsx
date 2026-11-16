"use client";
import { motion } from "framer-motion";
import type { Fingerprint } from "../lib/processor";

const SPRING = { type: "spring" as const, stiffness: 400, damping: 30 };

export default function FingerprintViewer({
  fp, accession, loading, progress,
}: { fp: Fingerprint | null; accession: string; loading: boolean; progress: number }) {
  const download = () => {
    if (!fp) return;
    const a = document.createElement("a");
    a.href = fp.dataUrl; a.download = `${accession}_fingerprint.png`; a.click();
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl sm:p-6"
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100"
        style={{ background: "radial-gradient(600px circle at 50% 0%, rgba(255,255,255,0.08), transparent 65%)" }} />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-zinc-300">Huella RGB</h2>
          {fp && <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-zinc-400">{fp.side}×{fp.side} px</span>}
        </div>

        {loading && (
          <div className="mt-6">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full rounded-full bg-white" animate={{ width: `${progress}%` }} transition={{ ease: "easeOut", duration: 0.3 }} />
            </div>
            <p className="mt-2 text-xs text-zinc-500">Proyectando secuencia… {Math.round(progress)}%</p>
          </div>
        )}

        {!fp && !loading && (
          <div className="mt-6 flex aspect-square items-center justify-center rounded-2xl border border-dashed border-white/10 text-center text-sm text-zinc-600">
            Introduce un accession ID<br />para generar la huella
          </div>
        )}

        {fp && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING} className="mt-4">
            {/* image-rendering: pixelated = píxeles nítidos, como PIL NEAREST */}
            <img src={fp.dataUrl} alt={`Huella RGB de ${accession}`}
              className="aspect-square w-full rounded-2xl [image-rendering:pixelated]" />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <motion.button {...SPRING} whileTap={{ scale: 0.98 }} onClick={download}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 active:scale-[0.98]">
                Descargar PNG
              </motion.button>
              <span className="text-xs text-zinc-500">A · C · G · T · N — 1 píxel por base</span>
            </div>
            <div className="mt-4 flex gap-3 text-xs">
              {[["A", "#FF5C5C"], ["C", "#5CB8FF"], ["G", "#4ADE80"], ["T", "#FACC15"]].map(([b, c]) => (
                <span key={b} className="flex items-center gap-1.5 text-zinc-400">
                  <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} />{b}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
