"""
Motor de Proyección Espectral RGB — Plasmex Genomics
====================================================

Convierte una secuencia de nucleótidos en una huella digital genómica
visual: un numpy.ndarray (H, W, 3) uint8 -> PIL.Image (PNG).

Algoritmo
---------
1. Normalizar: mayúsculas, sólo ACGT N (otros caracteres -> N).
2. Padding simétrico: side = ceil(sqrt(n)), total = side*side,
   pad = total - n, pad_left = pad // 2, pad_right = pad - pad_left.
   El relleno usa el token N (color de fondo oscuro), repartido a
   ambos lados para que la huella quede centrada.
3. Mapeo nucleótido -> canal RGB de 8 bits (un píxel por base):
       A  (adenina)  -> #FF5C5C  (255,  92,  92)  rojo
       C  (citosina) -> #5CB8FF  ( 92, 184, 255)  azul
       G  (guanina)  -> #4ADE80  ( 74, 222, 128)  verde
       T  (timina)   -> #FACC15  (250, 204,  21)  ámbar
       N  (desconocido / padding) -> #18181B (24, 24, 27) fondo
4. Reshape matricial: (side*side, 3) -> (side, side, 3).

Ejemplo: 156 nt -> side=13 (13x13=169), pad=13 (6 izq, 7 der).
"""

from __future__ import annotations

import hashlib
import math
import re

import numpy as np
from PIL import Image

# Mapeo nucleótido -> RGB 8 bits
NUCLEOTIDE_RGB: dict[str, tuple[int, int, int]] = {
    "A": (255, 92, 92),    # rojo
    "C": (92, 184, 255),   # azul
    "G": (74, 222, 128),   # verde
    "T": (250, 204, 21),   # ámbar
    "N": (24, 24, 27),     # fondo oscuro #18181B (padding / desconocido)
}

VALID_BASES = set("ACGTN")

# Formato NCBI accession: NC_045512.2, NM_001234, NP_..., XR_..., NZ_CP123456, etc.
ACCESSION_RE = re.compile(
    r"^(?:NC|NM|NP|NR|NT|NW|NZ|XM|XP|XR|WP|CP|AP|AE|AC|AL|BX|CR|CU)"
    r"_?[A-Z]{0,2}\d{5,9}(?:\.\d+)?$"
    r"|^[A-Z]{1,2}\d{5,8}(?:\.\d+)?$"
    r"|^[A-Z]{3}\d{5,7}(?:\.\d+)?$",
    re.IGNORECASE,
)


def validate_accession(accession_id: str) -> str:
    """Valida y normaliza un accession ID del NCBI. Lanza ValueError si no es válido."""
    acc = (accession_id or "").strip().upper()
    if not acc or len(acc) > 20 or not ACCESSION_RE.match(acc):
        raise ValueError(
            f"Accession ID inválido: {accession_id!r}. "
            "Formato esperado NCBI, ej. NC_045512.2, NM_001234567, NZ_CP123456.1"
        )
    return acc


def normalize_sequence(sequence: str) -> str:
    """Mayúsculas y sólo ACGTN; cualquier otro carácter se convierte en N."""
    return "".join(b if b in VALID_BASES else "N" for b in (sequence or "").upper())


def symmetric_pad_size(n: int) -> tuple[int, int, int]:
    """
    Devuelve (side, pad_left, pad_right) para n bases.
    side = ceil(sqrt(n)); total = side*side; pad repartido simétricamente.
    """
    if n <= 0:
        raise ValueError("La secuencia no puede estar vacía")
    side = math.ceil(math.sqrt(n))
    total = side * side
    pad = total - n
    return side, pad // 2, pad - pad // 2


def encode_sequence(sequence: str) -> np.ndarray:
    """
    Secuencia -> ndarray (H, W, 3) uint8.
    H == W == ceil(sqrt(len(seq))) tras padding simétrico.
    """
    seq = normalize_sequence(sequence)
    side, pad_left, pad_right = symmetric_pad_size(len(seq))
    padded = "N" * pad_left + seq + "N" * pad_right
    # (total, 3) -> reshape (H, W, 3)
    arr = np.array([NUCLEOTIDE_RGB[b] for b in padded], dtype=np.uint8)
    return arr.reshape((side, side, 3))


def build_fingerprint(sequence: str, scale: int = 8) -> Image.Image:
    """
    Secuencia -> PIL.Image RGB.
    scale: factor de escalado con NEAREST para mantener píxeles nítidos.
    """
    arr = encode_sequence(sequence)
    img = Image.fromarray(arr, mode="RGB")
    if scale and scale > 1:
        img = img.resize((img.width * scale, img.height * scale), Image.NEAREST)
    return img


def sequence_metadata(sequence: str, accession_id: str = "") -> dict:
    """Metadatos técnicos para el panel lateral."""
    seq = normalize_sequence(sequence)
    side, pad_left, pad_right = symmetric_pad_size(len(seq))
    n = len(seq)
    gc = sum(1 for b in seq if b in "GC")
    counts = {b: seq.count(b) for b in "ACGTN"}
    return {
        "accession_id": accession_id,
        "length_bp": n,
        "matrix_resolution": f"{side}x{side}",
        "matrix_side": side,
        "matrix_pixels": side * side,
        "padding_total": pad_left + pad_right,
        "padding_left": pad_left,
        "padding_right": pad_right,
        "gc_percent": round(100 * gc / n, 2) if n else 0.0,
        "counts": counts,
        "sync_status": "synchronized",
    }


def deterministic_demo_sequence(accession_id: str, length: int = 1024) -> str:
    """
    Secuencia sintética determinista derivada del accession_id (seed = SHA-256).
    Permite demo / tests sin depender de la red del NCBI; la misma entrada
    siempre produce la misma huella. En producción se sustituye por la
    secuencia real obtenida de NCBI E-utilities (ver main.py).
    """
    seed = int(hashlib.sha256(accession_id.encode()).hexdigest()[:8], 16)
    rng = np.random.default_rng(seed)
    # Composición realista: 55% GC aprox. con sesgo por seed
    bases = np.array(list("ACGT"))
    weights = np.array([0.225, 0.275, 0.275, 0.225])
    return "".join(rng.choice(bases, size=length, p=weights))


if __name__ == "__main__":
    demo = "ACGTACGTNNACGT" * 12  # 168 nt (14 x 12)
    meta = sequence_metadata(demo, "DEMO_156")
    print(meta)
    img = build_fingerprint(demo, scale=8)
    img.save("/tmp/fingerprint_demo.png")
    print(f"Imagen guardada: /tmp/fingerprint_demo.png {img.size} {img.mode}")
