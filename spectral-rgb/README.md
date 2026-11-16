# Plasmex Genomics — Motor de Proyección Espectral RGB

## Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
curl "http://localhost:8000/api/v1/analyze?accession_id=NC_045512.2" -o huella.png
curl "http://localhost:8000/api/v1/analyze?accession_id=NC_045512.2&format=json"
python test_processor.py   # verifica (13,13,3), GC 50%, PNG 104x104
```
- `processor.py`: padding simétrico, `ndarray (H, W, 3)` uint8, PIL.Image.
  156 nt → 13×13, pad 13 (6 izq + 7 der). Mapeo: A #FF5C5C, C #5CB8FF, G #4ADE80, T #FACC15, N #18181B.
- `main.py`: `GET/POST /api/v1/analyze` — `format=image` devuelve el PNG con headers `X-Plasmex-*`; `format=json` devuelve `{image_url, metadata}` con TTL 1 h. Intenta NCBI E-utilities y, si no hay red, usa secuencia demo determinista.

## Frontend (Next.js 15 + Tailwind + Framer Motion)
```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```
- `bg-[#09090b]`, `border-white/10`, `backdrop-blur-xl`, spring `stiffness: 400, damping: 30`, `active:scale-[0.98]`.
- Componentes: `AccessionInput` (validación NCBI en tiempo real), `FingerprintViewer` (hover glow, barra de progreso, descarga PNG), `MetadataPanel` (desplegable: longitud pb, resolución, padding, GC%, sincronización).
- `lib/processor.ts` replica el algoritmo en cliente para la demo inmediata; en producción `page.tsx` llama a `/api/v1/analyze`.
- Responsivo: móvil apilado (visor arriba, metadatos abajo), desktop `1fr + 320px`.
