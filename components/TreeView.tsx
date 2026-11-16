"use client";

import type { TreeNode } from "../lib/genomics";

interface Placed {
  node: TreeNode;
  x: number;
  y: number;
  children: Placed[];
}

function countLeaves(node: TreeNode): number {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((a, c) => a + countLeaves(c), 0);
}

function maxDepth(node: TreeNode): number {
  if (!node.children || node.children.length === 0) return node.length;
  return node.length + Math.max(...node.children.map(maxDepth));
}

/** Dibuja el árbol como cladograma SVG con longitudes de rama. */
export default function TreeView({ tree }: { tree: TreeNode }) {
  const leaves = countLeaves(tree);
  const height = Math.max(120, leaves * 34 + 20);
  const width = 640;
  const scale = maxDepth(tree) > 0 ? (width - 180) / maxDepth(tree) : 1;

  let leafIndex = 0;
  function place(node: TreeNode, x: number): Placed {
    const children = (node.children ?? []).map((c) =>
      place(c, x + Math.max(0, c.length) * scale),
    );
    const y =
      children.length > 0
        ? children.reduce((a, c) => a + c.y, 0) / children.length
        : 18 + leafIndex++ * 34;
    return { node, x, y, children };
  }
  const root = place(tree, 0);

  const lines: React.ReactNode[] = [];
  const labels: React.ReactNode[] = [];
  function walk(p: Placed, key: string) {
    for (const [i, c] of p.children.entries()) {
      lines.push(
        <line key={`${key}-${i}-h`} x1={p.x} y1={p.y} x2={c.x} y2={p.y} stroke="#6aa9ff" strokeWidth={1.5} />,
        <line key={`${key}-${i}-v`} x1={c.x} y1={p.y} x2={c.x} y2={c.y} stroke="#6aa9ff" strokeWidth={1.5} />,
      );
      walk(c, `${key}-${i}`);
    }
    if (!p.children.length && p.node.name) {
      labels.push(
        <text key={`label-${key}`} x={p.x + 8} y={p.y + 4} fill="#e8eef7" fontSize={13}>
          {p.node.name} ({p.node.length.toFixed(3)})
        </text>,
      );
    }
  }
  walk(root, "r");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      role="img"
      aria-label="Árbol filogenético por neighbor-joining"
    >
      {lines}
      {labels}
    </svg>
  );
}
