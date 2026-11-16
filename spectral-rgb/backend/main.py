"""
FastAPI — Plasmex Genomics / Motor de Proyección Espectral RGB

Endpoint:
    GET /api/v1/analyze?accession_id=NC_045512.2&format=image
    POST /api/v1/analyze  {"accession_id": "NC_045512.2", "format": "image"}

- format=image (por defecto): devuelve el PNG procesado directamente
  (FileResponse, image/png) con metadatos en headers X-Plasmex-*.
- format=json: devuelve {"image_url": "/tmp/...png", "metadata": {...}}.
  La URL temporal es un archivo local con TTL; en despliegue se
  sustituye por un object storage con URL firmada (S3 / R2).

Secuencia:
  1. Si NCBI_API_KEY / acceso a E-utilities está disponible, intenta
     descargar la secuencia real de NCBI (efetch, fasta).
  2. Si no hay red o falla, usa deterministic_demo_sequence() para que
     el endpoint siga siendo demostrable y determinista.

Ejecutar:
    pip install -r requirements.txt
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    curl "http://localhost:8000/api/v1/analyze?accession_id=NC_045512.2" -o huella.png
"""

from __future__ import annotations

import io
import os
import time
import urllib.parse
import urllib.request
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from processor import (
    build_fingerprint,
    deterministic_demo_sequence,
    sequence_metadata,
    validate_accession,
)

app = FastAPI(
    title="Plasmex Genomics — Spectral RGB",
    version="1.0.0",
    description="Motor de Proyección Espectral RGB: secuencia -> huella PNG (H, W, 3).",
)

TMP_DIR = Path(os.environ.get("PLASMEX_TMP_DIR", "/tmp/plasmex-fingerprints"))
TMP_DIR.mkdir(parents=True, exist_ok=True)
TMP_TTL_SECONDS = int(os.environ.get("PLASMEX_TMP_TTL", "3600"))  # 1 hora

# Ejemplos conocidos para la demo (longitud sintética)
DEMO_LENGTHS = {
    "NC_045512.2": 29903,  # SARS-CoV-2 (longitud real; demo usa muestra de 4096)
    "NC_000913.3": 4639675,  # E. coli K-12 (demo usa muestra)
    "NM_001234567": 2048,
}
DEMO_SAMPLE_LEN = 4096  # la huella demo se genera con una muestra determinista


class AnalyzeRequest(BaseModel):
    accession_id: str = Field(..., examples=["NC_045512.2"])
    format: str = Field("image", pattern="^(image|json)$")
    scale: int = Field(8, ge=1, le=32)


def fetch_ncbi_sequence(accession_id: str, timeout: int = 15) -> str | None:
    """Intenta descargar la secuencia FASTA real desde NCBI E-utilities."""
    try:
        url = (
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
            f"?db=nuccore&id={urllib.parse.quote(accession_id)}"
            "&rettype=fasta&retmode=text"
        )
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            text = resp.read().decode("utf-8", errors="ignore")
        seq = "".join(line.strip() for line in text.splitlines() if not line.startswith(">"))
        return seq or None
    except Exception:
        return None


def get_sequence(accession_id: str) -> tuple[str, str]:
    """Devuelve (secuencia, origen): 'ncbi' o 'demo-determinista'."""
    seq = fetch_ncbi_sequence(accession_id)
    if seq:
        # Limitar a 65_536 bases para que la matriz siga siendo manejable
        return seq[:65536], "ncbi"
    return deterministic_demo_sequence(accession_id, DEMO_SAMPLE_LEN), "demo-determinista"


def _save_temp_png(accession_id: str, scale: int) -> tuple[Path, dict]:
    seq, source = get_sequence(accession_id)
    img = build_fingerprint(seq, scale=scale)
    meta = sequence_metadata(seq, accession_id)
    meta["source"] = source
    meta["image_size_px"] = f"{img.width}x{img.height}"
    out = TMP_DIR / f"{accession_id.replace('.', '_')}_{int(time.time())}.png"
    img.save(out, format="PNG", optimize=True)
    return out, meta


@app.get("/health")
def health():
    return {"status": "ok", "service": "plasmex-spectral-rgb"}


@app.get("/api/v1/analyze")
def analyze_get(
    accession_id: str = Query(..., examples=["NC_045512.2"]),
    format: str = Query("image", pattern="^(image|json)$"),
    scale: int = Query(8, ge=1, le=32),
):
    try:
        acc = validate_accession(accession_id)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    out, meta = _save_temp_png(acc, scale)

    if format == "json":
        return JSONResponse(
            {
                "accession_id": acc,
                "image_url": f"/tmp/plasmex-fingerprints/{out.name}",
                "image_path": str(out),
                "expires_in_seconds": TMP_TTL_SECONDS,
                "metadata": meta,
            }
        )

    # format=image: archivo procesado directo
    return FileResponse(
        out,
        media_type="image/png",
        filename=f"{acc}_fingerprint.png",
        headers={
            "X-Plasmex-Accession": acc,
            "X-Plasmex-Length-Bp": str(meta["length_bp"]),
            "X-Plasmex-Matrix": str(meta["matrix_resolution"]),
            "X-Plasmex-GC-Percent": str(meta["gc_percent"]),
            "X-Plasmex-Source": str(meta["source"]),
            "Cache-Control": "public, max-age=3600",
        },
    )


@app.post("/api/v1/analyze")
def analyze_post(body: AnalyzeRequest):
    return analyze_get(accession_id=body.accession_id, format=body.format, scale=body.scale)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
