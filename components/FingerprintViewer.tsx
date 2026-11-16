"use client";

import { useEffect, useRef, useState } from "react";
import type { FingerprintData } from "../lib/fingerprint";

export default function FingerprintViewer({
  fingerprint,
  label,
}: {
  fingerprint: FingerprintData;
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(8);
  const [hover, setHover] = useState("");
  const { side, pixels, padded } = fingerprint;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(side, side);
    img.data.set(pixels);
    ctx.putImageData(img, 0, 0);
  }, [side, pixels]);

  function handleMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.min(side - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * side)));
    const y = Math.min(side - 1, Math.max(0, Math.floor(((e.clientY - rect.top) / rect.height) * side)));
    const idx = y * side + x;
    setHover(`Píxel ${idx + 1} de ${side * side} · posición (${x}, ${y}) · base ${padded[idx]}`);
  }

  function download() {
    const src = canvasRef.current;
    if (!src) return;
    const out = document.createElement("canvas");
    out.width = side * scale;
    out.height = side * scale;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, out.width, out.height);
    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${label}_fingerprint.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={side}
        height={side}
        style={{
          width: 256,
          height: 256,
          imageRendering: "pixelated",
          border: "1px solid var(--border)",
          borderRadius: 8,
        }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover("")}
      />
      <p className="muted">
        {hover || "Pasa el cursor sobre la huella para ver la base de cada píxel."}
      </p>
      <div>
        {[4, 8, 12].map((s) => (
          <button
            key={s}
            className={scale === s ? "secondary active" : "secondary"}
            onClick={() => setScale(s)}
          >
            {s}×
          </button>
        ))}
        <button className="secondary" onClick={download}>
          Descargar PNG ({side * scale}×{side * scale})
        </button>
      </div>
    </div>
  );
}
