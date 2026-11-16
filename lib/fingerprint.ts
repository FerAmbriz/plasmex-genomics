// Huella Espectral RGB: padding simétrico + reshape (H, W, 3) + mapeo ACGT -> RGB 8 bits.
// Espejo del motor de spectral-rgb (backend/processor.py y frontend/lib/processor.ts):
// mismo mapeo de color, mismo padding y misma demo determinista por accession.

export const NUCLEOTIDE_RGB: Record<string, [number, number, number]> = {
  A: [255, 92, 92],
  C: [92, 184, 255],
  G: [74, 222, 128],
  T: [250, 204, 21],
  N: [24, 24, 27],
};

export const ACCESSION_RE =
  /^(?:NC|NM|NP|NR|NT|NW|NZ|XM|XP|XR|WP|CP|AP|AE|AC|AL|BX|CR|CU)_?[A-Z]{0,2}\d{5,9}(?:\.\d+)?$|^[A-Z]{1,2}\d{5,8}(?:\.\d+)?$|^[A-Z]{3}\d{5,7}(?:\.\d+)?$/i;

export function validateAccession(v: string): boolean {
  const acc = v.trim().toUpperCase();
  return acc.length > 0 && acc.length <= 20 && ACCESSION_RE.test(acc);
}

export function normalizeSequence(seq: string): string {
  return seq.toUpperCase().replace(/[^ACGTN]/g, "N");
}

// Secuencia sintética determinista derivada del accession_id (seed = FNV-1a
// + generador LCG). El mismo accession siempre da la misma huella, pero NO
// es la secuencia real de NCBI: para la real hace falta el backend FastAPI.
export function demoSequence(accessionId: string, length = 4096): string {
  let h = 2166136261;
  for (const c of accessionId.toUpperCase()) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  let s = h >>> 0;
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const bases = "ACGT";
  const w = [0.225, 0.275, 0.275, 0.225];
  let out = "";
  for (let i = 0; i < length; i++) {
    const r = rand();
    let acc = 0;
    for (let j = 0; j < 4; j++) {
      acc += w[j];
      if (r <= acc) {
        out += bases[j];
        break;
      }
    }
  }
  return out;
}

export type BaseCounts = Record<"A" | "C" | "G" | "T" | "N", number>;

export interface FingerprintData {
  side: number;
  lengthBp: number;
  padLeft: number;
  padRight: number;
  gcPercent: number;
  counts: BaseCounts;
  pixels: Uint8ClampedArray;
  padded: string;
}

export function buildFingerprintPixels(sequence: string): FingerprintData {
  const seq = normalizeSequence(sequence);
  const n = seq.length;
  const side = Math.ceil(Math.sqrt(n));
  const pad = side * side - n;
  const padLeft = Math.floor(pad / 2);
  const padRight = pad - padLeft;
  const padded = "N".repeat(padLeft) + seq + "N".repeat(padRight);
  const pixels = new Uint8ClampedArray(side * side * 4);
  for (let i = 0; i < padded.length; i++) {
    const [r, g, b] = NUCLEOTIDE_RGB[padded[i]];
    pixels[i * 4] = r;
    pixels[i * 4 + 1] = g;
    pixels[i * 4 + 2] = b;
    pixels[i * 4 + 3] = 255;
  }
  const counts: BaseCounts = { A: 0, C: 0, G: 0, T: 0, N: 0 };
  for (const ch of seq) counts[ch as keyof BaseCounts]++;
  const gcPercent = n ? Math.round(((counts.G + counts.C) / n) * 10000) / 100 : 0;
  return { side, lengthBp: n, padLeft, padRight, gcPercent, counts, pixels, padded };
}
