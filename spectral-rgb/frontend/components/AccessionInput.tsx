"use client";
import { motion } from "framer-motion";
import { validateAccession } from "../lib/processor";

const SPRING = { type: "spring" as const, stiffness: 400, damping: 30 };

export default function AccessionInput({
  value, onChange, onAnalyze, loading,
}: { value: string; onChange: (v: string) => void; onAnalyze: () => void; loading: boolean }) {
  const valid = validateAccession(value);
  const touched = value.length > 0;
  return (
    <div className="w-full">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && valid && !loading && onAnalyze()}
          placeholder="NC_045512.2"
          spellCheck={false}
          aria-label="Accession ID del NCBI"
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[15px] tracking-wide text-zinc-100 placeholder:text-zinc-600 outline-none backdrop-blur-xl transition focus:border-white/25 focus:bg-white/[0.06]"
        />
        <motion.button
          {...SPRING} whileTap={{ scale: 0.98 }}
          disabled={!valid || loading}
          onClick={onAnalyze}
          className="shrink-0 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950 transition active:scale-[0.98] disabled:opacity-30 sm:px-5"
        >
          {loading ? "Analizando…" : "Analizar"}
        </motion.button>
      </div>
      <p className={`mt-2 text-xs ${!touched ? "text-zinc-500" : valid ? "text-emerald-400" : "text-rose-400"}`}>
        {!touched ? "Formato NCBI: NC_045512.2 · NM_001234567 · NZ_CP123456.1"
          : valid ? "✓ Accession válido" : "Formato no válido — revisa el accession ID"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {["NC_045512.2", "NC_000913.3", "NM_001234567"].map((ex) => (
          <button key={ex} onClick={() => onChange(ex)}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-400 transition hover:border-white/20 hover:text-zinc-200">
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
