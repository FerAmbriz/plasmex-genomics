"use client";

import { useMemo, useState } from "react";
import {
  atContent,
  baseCounts,
  cleanSequence,
  cpgIslands,
  distanceMatrix,
  findInvalidChars,
  findMotifs,
  findOrfs,
  gcContent,
  kmerCounts,
  neighborJoining,
  reverseComplement,
  transcribe,
  translate,
  type SequenceEntry,
} from "../lib/genomics";
import { EXAMPLE_DESCRIPTIONS, EXAMPLE_SEQUENCES } from "../lib/examples";
import TreeView from "../components/TreeView";

type Tab = "conteos" | "arbol" | "relaciones" | "regulacion";

const TABS: { id: Tab; label: string }[] = [
  { id: "conteos", label: "Conteos" },
  { id: "arbol", label: "Árbol filogenético" },
  { id: "relaciones", label: "Relaciones distantes" },
  { id: "regulacion", label: "Regulación" },
];

function heatColor(d: number, max: number): string {
  const t = max > 0 ? d / max : 0;
  const r = Math.round(60 + 180 * t);
  const g = Math.round(180 - 120 * t);
  return `rgb(${r},${g},120)`;
}

export default function Home() {
  const [input, setInput] = useState(EXAMPLE_SEQUENCES[0].sequence);
  const [activeExample, setActiveExample] = useState(EXAMPLE_SEQUENCES[0].id);
  const [tab, setTab] = useState<Tab>("conteos");

  const invalid = useMemo(() => findInvalidChars(input), [input]);
  const seq = useMemo(() => cleanSequence(input), [input]);
  const counts = useMemo(() => baseCounts(seq), [seq]);
  const gc = useMemo(() => gcContent(seq), [seq]);
  const kmers2 = useMemo(() => kmerCounts(seq, 2).slice(0, 10), [seq]);
  const kmers3 = useMemo(() => kmerCounts(seq, 3).slice(0, 10), [seq]);
  const motifs = useMemo(() => findMotifs(seq), [seq]);
  const orfs = useMemo(() => findOrfs(seq, 30), [seq]);
  const islands = useMemo(() => cpgIslands(seq), [seq]);

  const entries: SequenceEntry[] = useMemo(() => {
    const list = [...EXAMPLE_SEQUENCES];
    if (seq.length >= 50 && !EXAMPLE_SEQUENCES.some((e) => e.sequence === seq)) {
      list.push({ id: "usuario", label: "Tu secuencia", sequence: seq });
    }
    return list;
  }, [seq]);

  const matrix = useMemo(() => distanceMatrix(entries), [entries]);
  const tree = useMemo(() => neighborJoining(entries), [entries]);

  const pairs = useMemo(() => {
    const out: { a: string; b: string; d: number }[] = [];
    for (let i = 0; i < entries.length; i++)
      for (let j = i + 1; j < entries.length; j++)
        out.push({ a: entries[i].label, b: entries[j].label, d: matrix.matrix[i][j] });
    return out.sort((x, y) => x.d - y.d);
  }, [entries, matrix]);

  const closest = pairs[0];
  const farthest = pairs[pairs.length - 1];
  const maxDist = Math.max(...matrix.matrix.flat(), 0.001);

  function loadExample(id: string) {
    const ex = EXAMPLE_SEQUENCES.find((e) => e.id === id);
    if (!ex) return;
    setActiveExample(id);
    setInput(ex.sequence);
  }

  return (
    <>
      <header className="hero">
        <h1>Plasmex Genomics</h1>
        <p>
          Plataforma de procesamiento genómico básico. Pega una secuencia de ADN
          o usa un ejemplo sintético y explora sus patrones: conteos, árbol
          filogenético, relaciones distantes y regulación. Todo el análisis se
          hace en tu navegador, sin enviar datos a ningún servidor.
        </p>
      </header>
      <main>
        <section className="card">
          <h2>Secuencia de ADN</h2>
          <p className="muted">
            Solo se admiten las bases A, C, G, T y N. Los ejemplos son
            sintéticos, no datos reales de ningún organismo.
          </p>
          <div>
            {EXAMPLE_SEQUENCES.map((e) => (
              <button
                key={e.id}
                className={activeExample === e.id ? "secondary active" : "secondary"}
                onClick={() => loadExample(e.id)}
              >
                {e.label}
              </button>
            ))}
            <button className="secondary" onClick={() => { setInput(""); setActiveExample(""); }}>
              Limpiar
            </button>
          </div>
          {activeExample && (
            <p className="muted">{EXAMPLE_DESCRIPTIONS[activeExample]}</p>
          )}
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); setActiveExample(""); }}
            placeholder="Pega aquí una secuencia de ADN, por ejemplo ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG"
            aria-label="Secuencia de ADN"
          />
          {invalid.length > 0 && (
            <p className="error">
              Caracteres no válidos (se ignoran): {invalid.join(", ")}
            </p>
          )}
          <p className="muted">Longitud limpia: {seq.length} nucleótidos.</p>
        </section>

        <nav className="tabs" aria-label="Análisis">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "active" : "secondary"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {seq.length === 0 && (
          <section className="card">
            <p>Escribe o carga una secuencia para ver los análisis.</p>
          </section>
        )}

        {seq.length > 0 && tab === "conteos" && (
          <section className="card">
            <h2>Conteos</h2>
            <div className="grid">
              <div><div className="stat">{seq.length}</div><div className="stat-label">Longitud (nt)</div></div>
              <div><div className="stat">{gc.toFixed(1)}%</div><div className="stat-label">Contenido GC</div></div>
              <div><div className="stat">{atContent(seq).toFixed(1)}%</div><div className="stat-label">Contenido AT</div></div>
              <div><div className="stat">{orfs.length}</div><div className="stat-label">ORFs (≥30 nt)</div></div>
            </div>
            <h3>Conteo de bases</h3>
            {(["A", "T", "G", "C", "N"] as const).map((b) => (
              <div className="bar-row" key={b}>
                <span>{b}</span>
                <div className="bar" style={{ width: `${seq.length ? (counts[b] / seq.length) * 100 * 3 : 0}%` }} />
                <span>{counts[b]} ({seq.length ? ((counts[b] / seq.length) * 100).toFixed(1) : "0"}%)</span>
              </div>
            ))}
            <h3>Reverso complementario</h3>
            <p className="mono">{reverseComplement(seq).slice(0, 300)}{seq.length > 300 ? "…" : ""}</p>
            <h3>Transcripción (ARN)</h3>
            <p className="mono">{transcribe(seq).slice(0, 300)}{seq.length > 300 ? "…" : ""}</p>
            <h3>Traducción (proteína, marco 1)</h3>
            <p className="mono">{translate(seq).slice(0, 300)}{translate(seq).length > 300 ? "…" : ""}</p>
            <div className="grid">
              <div>
                <h3>2-mers más frecuentes</h3>
                <table><thead><tr><th>2-mer</th><th>Conteo</th></tr></thead>
                <tbody>{kmers2.map((k) => (<tr key={k.kmer}><td>{k.kmer}</td><td>{k.count}</td></tr>))}</tbody></table>
              </div>
              <div>
                <h3>3-mers más frecuentes</h3>
                <table><thead><tr><th>3-mer</th><th>Conteo</th></tr></thead>
                <tbody>{kmers3.map((k) => (<tr key={k.kmer}><td>{k.kmer}</td><td>{k.count}</td></tr>))}</tbody></table>
              </div>
            </div>
          </section>
        )}

        {seq.length > 0 && tab === "arbol" && (
          <section className="card">
            <h2>Árbol filogenético (neighbor-joining)</h2>
            <p className="muted">
              Distancias de Jukes-Cantor entre las secuencias de ejemplo
              {entries.some((e) => e.id === "usuario") ? " y tu secuencia" : ""}.
              Los números entre paréntesis son longitudes de rama.
            </p>
            <TreeView tree={tree} />
            <h3>Matriz de distancias (Jukes-Cantor)</h3>
            <table>
              <thead><tr><th></th>{matrix.labels.map((l) => (<th key={l}>{l}</th>))}</tr></thead>
              <tbody>
                {matrix.labels.map((l, i) => (
                  <tr key={l}><th>{l}</th>
                    {matrix.matrix[i].map((d, j) => (<td key={j}>{d.toFixed(3)}</td>))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {seq.length > 0 && tab === "relaciones" && (
          <section className="card">
            <h2>Relaciones distantes</h2>
            <p className="muted">
              Mapa de calor de distancias de Jukes-Cantor: verde = secuencias
              cercanas, rojo = secuencias distantes.
            </p>
            <table>
              <thead><tr><th></th>{matrix.labels.map((l) => (<th key={l}>{l}</th>))}</tr></thead>
              <tbody>
                {matrix.labels.map((l, i) => (
                  <tr key={l}><th>{l}</th>
                    {matrix.matrix[i].map((d, j) => (
                      <td key={j} style={{ background: i === j ? "transparent" : heatColor(d, maxDist) }}>
                        {d.toFixed(3)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {closest && farthest && (
              <>
                <h3>Interpretación</h3>
                <p>
                  Par más cercano: <strong>{closest.a} – {closest.b}</strong> (distancia {closest.d.toFixed(3)}).
                  Par más distante: <strong>{farthest.a} – {farthest.b}</strong> (distancia {farthest.d.toFixed(3)}).
                </p>
                <p className="muted">
                  Las parejas cercanas comparten más bloques de secuencia y
                  probablemente un origen común reciente en estos ejemplos
                  sintéticos; las distantes difieren en más posiciones y
                  representan linajes más separados.
                </p>
              </>
            )}
          </section>
        )}

        {seq.length > 0 && tab === "regulacion" && (
          <section className="card">
            <h2>Regulación</h2>
            <p className="muted">
              Patrones predichos sobre la secuencia, no evidencia experimental.
              Las cajas TATA/CAAT/GC son motivos típicos de promotores.
            </p>
            <h3>Motivos encontrados ({motifs.length})</h3>
            {motifs.length === 0 ? <p>No se encontraron motivos conocidos.</p> : (
              <table>
                <thead><tr><th>Motivo</th><th>Patrón</th><th>Posición</th><th>Hebra</th></tr></thead>
                <tbody>
                  {motifs.slice(0, 100).map((m, i) => (
                    <tr key={i}><td>{m.motif}</td><td className="mono">{m.pattern}</td><td>{m.position}</td><td>{m.strand}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            <h3>ORFs (≥30 nt, ambas hebras)</h3>
            {orfs.length === 0 ? <p>No se encontraron ORFs de al menos 30 nt.</p> : (
              <table>
                <thead><tr><th>Inicio</th><th>Fin</th><th>Longitud</th><th>Marco</th><th>Hebra</th></tr></thead>
                <tbody>
                  {orfs.map((o, i) => (
                    <tr key={i}><td>{o.start}</td><td>{o.end}</td><td>{o.length}</td><td>{o.frame}</td><td>{o.strand}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            <h3>Islas CpG</h3>
            {islands.length === 0 ? <p>No se detectaron islas CpG con los criterios usados (GC ≥ 50% y CpG observado/esperado ≥ 0.6).</p> : (
              <table>
                <thead><tr><th>Inicio</th><th>Fin</th><th>Longitud</th><th>GC %</th><th>CpG obs/esp</th></tr></thead>
                <tbody>
                  {islands.map((c, i) => (
                    <tr key={i}><td>{c.start}</td><td>{c.end}</td><td>{c.length}</td><td>{c.gcContent.toFixed(1)}</td><td>{c.obsExpCpg.toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}
      </main>
      <footer>
        Plasmex Genomics v0.1 — Análisis 100% en el navegador. Los ejemplos son
        sintéticos y los motivos/ORFs son predicciones de patrones, no evidencia
        experimental. Código fuente en{" "}
        <a href="https://github.com/FerAmbriz/plasmex-genomics">github.com/FerAmbriz/plasmex-genomics</a>.
      </footer>
    </>
  );
}
