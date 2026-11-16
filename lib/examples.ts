// Ejemplos SINTÉTICOS con fines ilustrativos. No son datos reales de
// ningún organismo: son fragmentos inventados para probar los análisis.
// Se componen de bloques compartidos con variaciones, de modo que las
// distancias y el árbol tengan estructura visible.

import type { SequenceEntry } from "./genomics";

const p1 = "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG";
const p1b = "ATGGCGATTGTAATGGGCCGTTGAAAGGGTCCCCGATAG";
const p2 = "TATAAAGGCGCATGCTAGCTAGCTAGCTAGCTAGCTAGC";
const p3 = "CCAATGGGCCCAAATTTGGGCCCAATATGGGCCCGCGCG";
const p4 = "GCGCGCGCGCATATATGCGCGCGCGCATATATATATATA";
const p5 = "TTTTAAAACCCCGGGGTTTTAAAACCCCGGGGTTTTAAAA";
const p6 = "ACGTACGTACGTACGTACGTACGTACGTACGTACGTACGT";

export const EXAMPLE_SEQUENCES: SequenceEntry[] = [
  {
    id: "gen-a",
    label: "Gen ejemplo A",
    sequence: p1 + p2 + p3 + p4,
  },
  {
    id: "gen-b",
    label: "Gen ejemplo B",
    sequence: p1b + p2 + p5 + p4,
  },
  {
    id: "gen-c",
    label: "Gen ejemplo C",
    sequence: p3 + p4 + p5 + p6,
  },
  {
    id: "gen-d",
    label: "Gen ejemplo D",
    sequence: p6 + p5 + p2 + p1,
  },
];

export const EXAMPLE_DESCRIPTIONS: Record<string, string> = {
  "gen-a": "Fragmento sintético con caja TATA, caja CAAT y un ORF inicial.",
  "gen-b": "Variante cercana de A: comparte bloques con algunas sustituciones.",
  "gen-c": "Fragmento sintético con regiones ricas en GC y en AT.",
  "gen-d": "Mismos bloques en otro orden: el más distante de A y B.",
};
