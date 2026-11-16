"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Fingerprint } from "../lib/processor";

const SPRING = { type: "spring" as const, stiffness: 400, damping: 30 };

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] py-2.5 last:border-0">
      <span className="text-xs text-zinc-500">{k}</span>
      <span className="font-mono text-xs text-zinc-200">{v}</span>
    </div>
  );
}

export default function MetadataPanel({ fp, accession }: { fp: Fingerprint | null; accession: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
      <button onClick={() => setOpen(!open)} aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left sm:px-5">
        <span className="text-sm font-medium text-zinc-200">Metadatos</span>
        <span className="flex items-center gap-2 text-xs text-zinc-500">
          <i className={`inline-block h-2 w-2 rounded-full ${fp ? "bg-emerald-400" : "bg-zinc-600"}`} />
          {fp ? "Sincronizado" : "En espera"}
          <span className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}>⌄</span>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={SPRING} className="overflow-hidden">
            <div className="px-4 pb-4 sm:px-5">
              {!fp ? (
                <p className="py-2 text-xs leading-relaxed text-zinc-500">Sin análisis todavía. La longitud, la resolución de la matriz y el estado de sincronización aparecerán aquí.</p>
              ) : (
                <>
                  <Row k="Accession" v={accession} />
                  <Row k="Longitud" v={`${fp.lengthBp.toLocaleString()} pb`} />
                  <Row k="Resolución de matriz" v={`${fp.side} × ${fp.side}`} />
                  <Row k="Píxeles" v={`${(fp.side * fp.side).toLocaleString()}`} />
                  <Row k="Padding simétrico" v={`${fp.padLeft} + ${fp.padRight}`} />
                  <Row k="GC%" v={`${fp.gcPercent}%`} />
                  <Row k="Conteos" v={`A ${fp.counts.A} · C ${fp.counts.C} · G ${fp.counts.G} · T ${fp.counts.T}`} />
                  <Row k="Sincronización" v="Sincronizado" />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
