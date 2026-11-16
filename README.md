# Plasmex Genomics

Plataforma web de procesamiento genómico básico, construida con **Next.js**.
Todo el análisis se hace en el navegador: no hay backend ni se envían datos
a ningún servidor.

Página pública: **https://ferambriz.github.io/plasmex-genomics/**

## Qué analiza

Pega una secuencia de ADN (A, C, G, T, N) o usa uno de los ejemplos
sintéticos incluidos, y la plataforma muestra:

1. **Conteos** — longitud, conteo de bases A/T/G/C/N, contenido GC y AT,
   reverso complementario, transcripción a ARN, traducción a proteína y
   k-mers (2-mers y 3-mers) más frecuentes.
2. **Árbol filogenético** — árbol por neighbor-joining (Saitou & Nei, 1987)
   a partir de distancias de Jukes-Cantor entre las secuencias de ejemplo
   y tu secuencia, con matriz de distancias.
3. **Relaciones distantes** — mapa de calor de distancias por pares, par más
   cercano y par más distante, con una interpretación en lenguaje sencillo.
4. **Regulación** — motivos de promotor (caja TATA, caja CAAT, caja GC),
   codones de inicio/parada, ORFs en ambas hebras e islas CpG. Son
   predicciones de patrones, no evidencia experimental.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## Build y publicación

El sitio es una exportación estática de Next.js (`output: "export"`):

```bash
npm run build   # genera ./out
```

Cada push a `main` despliega automáticamente a GitHub Pages mediante
`.github/workflows/deploy-pages.yml`.

## Notas honestas

- Los 4 ejemplos incluidos son **sintéticos**, no datos reales de ningún
  organismo.
- Las distancias se calculan sobre la longitud menor de cada par y el árbol
  es una reconstrucción simple por neighbor-joining, adecuada para explorar
  patrones, no para publicar una filogenia.
- No hay base de datos ni cuentas de usuario: nada de lo que pegues sale de
  tu navegador.
