// Plasmex Genomics — funciones puras de análisis de secuencias.
// Todo el cómputo es local: no hay llamadas a APIs ni datos externos.

export interface BaseCounts {
  A: number;
  T: number;
  G: number;
  C: number;
  N: number;
  total: number;
}

export interface KmerCount {
  kmer: string;
  count: number;
}

export interface Orf {
  strand: "+" | "-";
  frame: number;
  start: number; // 1-based, en la secuencia original
  end: number; // 1-based, inclusivo
  length: number; // en nucleótidos
  sequence: string;
}

export interface MotifHit {
  motif: string;
  pattern: string;
  position: number; // 1-based, en la secuencia original
  strand: "+" | "-";
  sequence: string;
}

export interface CpgIsland {
  start: number; // 1-based
  end: number; // 1-based, inclusivo
  length: number;
  gcContent: number; // porcentaje
  obsExpCpg: number;
}

export interface TreeNode {
  name?: string;
  length: number; // longitud de rama desde el padre
  children?: TreeNode[];
}

export interface SequenceEntry {
  id: string;
  label: string;
  sequence: string;
}

/** Limpia una secuencia: mayúsculas, sin espacios, solo A/C/G/T/N. */
export function cleanSequence(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s\d]/g, "")
    .replace(/[^ACGTN]/g, "");
}

/** Caracteres no válidos presentes en la entrada (sin contar espacios). */
export function findInvalidChars(input: string): string[] {
  const chars = input.toUpperCase().replace(/[\s]/g, "").split("");
  return [...new Set(chars.filter((c) => !/[ACGTN]/.test(c)))];
}

export function baseCounts(seq: string): BaseCounts {
  const counts: BaseCounts = { A: 0, T: 0, G: 0, C: 0, N: 0, total: seq.length };
  for (const base of seq) {
    if (base === "A" || base === "T" || base === "G" || base === "C" || base === "N") {
      counts[base] += 1;
    }
  }
  return counts;
}

/** Porcentaje de GC (0–100). */
export function gcContent(seq: string): number {
  if (seq.length === 0) return 0;
  const c = baseCounts(seq);
  return ((c.G + c.C) / seq.length) * 100;
}

/** Porcentaje de AT (0–100). */
export function atContent(seq: string): number {
  if (seq.length === 0) return 0;
  const c = baseCounts(seq);
  return ((c.A + c.T) / seq.length) * 100;
}

const COMPLEMENT: Record<string, string> = { A: "T", T: "A", G: "C", C: "G", N: "N" };

export function reverseComplement(seq: string): string {
  return seq
    .split("")
    .reverse()
    .map((b) => COMPLEMENT[b] ?? "N")
    .join("");
}

/** Transcripción ADN -> ARN (T por U). */
export function transcribe(seq: string): string {
  return seq.replace(/T/g, "U");
}

const CODON_TABLE: Record<string, string> = {
  TTT: "F", TTC: "F", TTA: "L", TTG: "L",
  CTT: "L", CTC: "L", CTA: "L", CTG: "L",
  ATT: "I", ATC: "I", ATA: "I", ATG: "M",
  GTT: "V", GTC: "V", GTA: "V", GTG: "V",
  TCT: "S", TCC: "S", TCA: "S", TCG: "S",
  CCT: "P", CCC: "P", CCA: "P", CCG: "P",
  ACT: "T", ACC: "T", ACA: "T", ACG: "T",
  GCT: "A", GCC: "A", GCA: "A", GCG: "A",
  TAT: "Y", TAC: "Y", TAA: "*", TAG: "*",
  CAT: "H", CAC: "H", CAA: "Q", CAG: "Q",
  AAT: "N", AAC: "N", AAA: "K", AAG: "K",
  GAT: "D", GAC: "D", GAA: "E", GAG: "E",
  TGT: "C", TGC: "C", TGA: "*", TGG: "W",
  CGT: "R", CGC: "R", CGA: "R", CGG: "R",
  AGT: "S", AGC: "S", AGA: "R", AGG: "R",
  GGT: "G", GGC: "G", GGA: "G", GGG: "G",
};

/** Traducción con la tabla estándar de codones. "*" = codón de parada. */
export function translate(seq: string): string {
  let protein = "";
  for (let i = 0; i + 3 <= seq.length; i += 3) {
    const codon = seq.slice(i, i + 3);
    protein += CODON_TABLE[codon] ?? "X";
  }
  return protein;
}

/** Conteos de k-mers, ordenados de mayor a menor frecuencia. */
export function kmerCounts(seq: string, k: number): KmerCount[] {
  const counts = new Map<string, number>();
  for (let i = 0; i + k <= seq.length; i++) {
    const kmer = seq.slice(i, i + k);
    if (/^[ACGT]+$/.test(kmer)) {
      counts.set(kmer, (counts.get(kmer) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([kmer, count]) => ({ kmer, count }))
    .sort((a, b) => b.count - a.count || a.kmer.localeCompare(b.kmer));
}

const STOP_CODONS = new Set(["TAA", "TAG", "TGA"]);

function findOrfsOnStrand(seq: string, strand: "+" | "-", minLength: number): Orf[] {
  const orfs: Orf[] = [];
  for (let frame = 0; frame < 3; frame++) {
    let i = frame;
    while (i + 3 <= seq.length) {
      if (seq.slice(i, i + 3) === "ATG") {
        let j = i;
        let foundStop = -1;
        while (j + 3 <= seq.length) {
          if (STOP_CODONS.has(seq.slice(j, j + 3))) {
            foundStop = j;
            break;
          }
          j += 3;
        }
        if (foundStop !== -1) {
          const length = foundStop + 3 - i;
          if (length >= minLength) {
            orfs.push({
              strand,
              frame,
              start: i + 1,
              end: foundStop + 3,
              length,
              sequence: seq.slice(i, foundStop + 3),
            });
          }
          i = foundStop + 3;
        } else {
          i += 3;
        }
      } else {
        i += 3;
      }
    }
  }
  return orfs;
}

/**
 * ORFs (marcos abiertos de lectura) de longitud mínima `minLength` nt,
 * en los 3 marcos y en ambas hebras. Las coordenadas son 1-based
 * sobre la secuencia original.
 */
export function findOrfs(seq: string, minLength = 30): Orf[] {
  const plus = findOrfsOnStrand(seq, "+", minLength);
  const rc = reverseComplement(seq);
  const minusOnRc = findOrfsOnStrand(rc, "-", minLength);
  const minus: Orf[] = minusOnRc.map((orf) => {
    // Coordenadas en la hebra reversa complementaria -> original.
    const start = seq.length - orf.end + 1;
    const end = seq.length - orf.start + 1;
    return { ...orf, start, end, sequence: reverseComplement(orf.sequence) };
  });
  return [...plus, ...minus].sort((a, b) => a.start - b.start || a.strand.localeCompare(b.strand));
}

const MOTIFS: { motif: string; pattern: string }[] = [
  { motif: "Caja TATA", pattern: "TATAAA" },
  { motif: "Caja CAAT", pattern: "CCAAT" },
  { motif: "Caja GC", pattern: "GGGCGG" },
  { motif: "Codón de inicio", pattern: "ATG" },
  { motif: "Codón de parada", pattern: "TAA" },
  { motif: "Codón de parada", pattern: "TAG" },
  { motif: "Codón de parada", pattern: "TGA" },
];

function findPatternPositions(seq: string, pattern: string): number[] {
  const positions: number[] = [];
  let idx = seq.indexOf(pattern);
  while (idx !== -1) {
    positions.push(idx + 1); // 1-based
    idx = seq.indexOf(pattern, idx + 1);
  }
  return positions;
}

/** Búsqueda de motivos conocidos en ambas hebras. */
export function findMotifs(seq: string): MotifHit[] {
  const hits: MotifHit[] = [];
  const rc = reverseComplement(seq);
  for (const { motif, pattern } of MOTIFS) {
    for (const pos of findPatternPositions(seq, pattern)) {
      hits.push({ motif, pattern, position: pos, strand: "+", sequence: pattern });
    }
    for (const pos of findPatternPositions(rc, pattern)) {
      // Posición en la hebra reversa -> coordenada en la original.
      const position = seq.length - pos - pattern.length + 2;
      hits.push({ motif, pattern, position, strand: "-", sequence: pattern });
    }
  }
  return hits.sort((a, b) => a.position - b.position || a.motif.localeCompare(b.motif));
}

/**
 * Islas CpG por escaneo de ventanas: GC >= 50% y CpG observado/esperado >= 0.6.
 * Las ventanas solapadas que cumplen el criterio se fusionan en una sola isla.
 */
export function cpgIslands(seq: string, windowSize = 100, step = 10): CpgIsland[] {
  if (seq.length < 20) return [];
  const size = Math.min(windowSize, seq.length);
  const windows: { start: number; end: number; gc: number; obsExp: number }[] = [];
  for (let start = 0; start + size <= seq.length; start += step) {
    const window = seq.slice(start, start + size);
    const c = baseCounts(window);
    const gc = ((c.G + c.C) / size) * 100;
    const cpg = (window.match(/CG/g) ?? []).length;
    const expected = (c.C * c.G) / size;
    const obsExp = expected > 0 ? cpg / expected : 0;
    if (gc >= 50 && obsExp >= 0.6) {
      windows.push({ start: start + 1, end: start + size, gc, obsExp });
    }
  }
  // Si la secuencia es más corta que la ventana, evaluar la secuencia completa.
  if (windows.length === 0 && seq.length < windowSize) {
    const c = baseCounts(seq);
    const gc = ((c.G + c.C) / seq.length) * 100;
    const cpg = (seq.match(/CG/g) ?? []).length;
    const expected = (c.C * c.G) / seq.length;
    const obsExp = expected > 0 ? cpg / expected : 0;
    if (gc >= 50 && obsExp >= 0.6) {
      windows.push({ start: 1, end: seq.length, gc, obsExp });
    }
  }
  const islands: CpgIsland[] = [];
  for (const w of windows) {
    const last = islands[islands.length - 1];
    if (last && w.start <= last.end + step) {
      last.end = Math.max(last.end, w.end);
      last.length = last.end - last.start + 1;
      const sub = seq.slice(last.start - 1, last.end);
      last.gcContent = gcContent(sub);
      const c = baseCounts(sub);
      const cpg = (sub.match(/CG/g) ?? []).length;
      const expected = (c.C * c.G) / sub.length;
      last.obsExpCpg = expected > 0 ? cpg / expected : 0;
    } else {
      islands.push({
        start: w.start,
        end: w.end,
        length: w.end - w.start + 1,
        gcContent: w.gc,
        obsExpCpg: w.obsExp,
      });
    }
  }
  return islands;
}

/** Distancia p: proporción de posiciones diferentes (sobre la longitud menor). */
export function pDistance(seqA: string, seqB: string): number {
  const n = Math.min(seqA.length, seqB.length);
  if (n === 0) return 0;
  let diffs = 0;
  for (let i = 0; i < n; i++) {
    if (seqA[i] !== seqB[i]) diffs++;
  }
  return diffs / n;
}

/** Distancia de Jukes-Cantor a partir de la distancia p. */
export function jukesCantorDistance(seqA: string, seqB: string): number {
  const p = pDistance(seqA, seqB);
  const inner = 1 - (4 * p) / 3;
  if (inner <= 0) return 10; // saturación: tope práctico
  return -0.75 * Math.log(inner);
}

export interface DistanceMatrix {
  ids: string[];
  labels: string[];
  matrix: number[][]; // distancias de Jukes-Cantor
  pMatrix: number[][]; // distancias p
}

/** Matriz de distancias por pares (Jukes-Cantor y p) para varias secuencias. */
export function distanceMatrix(entries: SequenceEntry[]): DistanceMatrix {
  const ids = entries.map((e) => e.id);
  const labels = entries.map((e) => e.label);
  const n = entries.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const pMatrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const jc = jukesCantorDistance(entries[i].sequence, entries[j].sequence);
      const p = pDistance(entries[i].sequence, entries[j].sequence);
      matrix[i][j] = matrix[j][i] = jc;
      pMatrix[i][j] = pMatrix[j][i] = p;
    }
  }
  return { ids, labels, matrix, pMatrix };
}

interface NjCluster {
  node: TreeNode;
  label: string;
}

/**
 * Árbol por neighbor-joining (Saitou & Nei, 1987).
 * Devuelve un árbol anidado con longitudes de rama.
 */
export function neighborJoining(entries: SequenceEntry[]): TreeNode {
  const n = entries.length;
  if (n === 0) return { length: 0 };
  if (n === 1) return { name: entries[0].label, length: 0 };
  if (n === 2) {
    const d = jukesCantorDistance(entries[0].sequence, entries[1].sequence) / 2;
    return {
      length: 0,
      children: [
        { name: entries[0].label, length: d },
        { name: entries[1].label, length: d },
      ],
    };
  }

  const { matrix } = distanceMatrix(entries);
  let clusters: NjCluster[] = entries.map((e) => ({
    node: { name: e.label, length: 0 },
    label: e.label,
  }));
  // Matriz de distancias mutable entre clusters (por índice).
  let dist: number[][] = matrix.map((row) => [...row]);

  while (clusters.length > 2) {
    const m = clusters.length;
    const rowSums = dist.map((row) => row.reduce((a, b) => a + b, 0));
    let bestI = 0;
    let bestJ = 1;
    let bestQ = Infinity;
    for (let i = 0; i < m; i++) {
      for (let j = i + 1; j < m; j++) {
        const q = (m - 2) * dist[i][j] - rowSums[i] - rowSums[j];
        if (q < bestQ) {
          bestQ = q;
          bestI = i;
          bestJ = j;
        }
      }
    }
    const i = bestI;
    const j = bestJ;
    const dij = dist[i][j];
    const li = 0.5 * dij + (rowSums[i] - rowSums[j]) / (2 * (m - 2));
    const lj = dij - li;
    const nodeI = clusters[i].node;
    const nodeJ = clusters[j].node;
    const newNode: TreeNode = {
      length: 0,
      children: [
        { ...nodeI, length: Math.max(0, li) },
        { ...nodeJ, length: Math.max(0, lj) },
      ],
    };
    const newLabel = `(${clusters[i].label}+${clusters[j].label})`;
    const remaining: number[] = [];
    for (let k = 0; k < m; k++) {
      if (k !== i && k !== j) remaining.push(k);
    }
    const newDist: number[][] = [];
    const newClusters: NjCluster[] = remaining.map((k) => clusters[k]);
    newClusters.push({ node: newNode, label: newLabel });
    for (let a = 0; a < newClusters.length; a++) {
      newDist.push([]);
      for (let b = 0; b < newClusters.length; b++) {
        if (a === b) {
          newDist[a][b] = 0;
        } else if (a === newClusters.length - 1) {
          const k = remaining[b];
          newDist[a][b] = 0.5 * (dist[i][k] + dist[j][k] - dij);
        } else if (b === newClusters.length - 1) {
          const k = remaining[a];
          newDist[a][b] = 0.5 * (dist[i][k] + dist[j][k] - dij);
        } else {
          newDist[a][b] = dist[remaining[a]][remaining[b]];
        }
      }
    }
    clusters = newClusters;
    dist = newDist;
  }

  const d = dist[0][1] / 2;
  return {
    length: 0,
    children: [
      { ...clusters[0].node, length: Math.max(0, d) },
      { ...clusters[1].node, length: Math.max(0, d) },
    ],
  };
}
