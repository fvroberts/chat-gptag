import type { Arena } from "./maps";
export interface Edge {
  to: number;
  kind: "jump" | "drop" | "portal" | "bounce";
  cost: number;
  takeoff: number;
  land: number;
}
export function graphFor(arena: Arena): Edge[][] {
  const ps = arena.platforms;
  return ps.map((a, i) => {
    const edges: Edge[] = [];
    ps.forEach((b, j) => {
      if (i === j) return;
      const rise = a.y - b.y;
      const left = b.x + b.w < a.x,
        right = b.x > a.x + a.w;
      const gap = left ? a.x - b.x - b.w : right ? b.x - a.x - a.w : 0;
      const pad = arena.pads.some(
        (p) => Math.abs(p.y - a.y) < 5 && p.x >= a.x && p.x <= a.x + a.w,
      );
      const v = pad ? 950 : 650,
        maxRise = (v * v) / 3200;
      if (rise > maxRise - 6) return;
      const time = (v + Math.sqrt(v * v - 3200 * rise)) / 1600;
      if (gap > 300 * time - 25) return;
      if (rise < -145 && gap > 180) return;
      const takeoff = left
        ? a.x + 20
        : right
          ? a.x + a.w - 20
          : Math.max(a.x + 20, Math.min(a.x + a.w - 20, b.x + b.w / 2));
      const land = Math.max(b.x + 24, Math.min(b.x + b.w - 24, takeoff));
      edges.push({
        to: j,
        kind: rise < 0 ? "drop" : rise > 126 ? "bounce" : "jump",
        cost:
          Math.abs(a.x + a.w / 2 - b.x - b.w / 2) + Math.abs(rise) * 1.8 + 100,
        takeoff,
        land,
      });
    });
    arena.portals.forEach((p, k) => {
      if (Math.abs(p.y + 26 - a.y) < 4 && p.x >= a.x && p.x <= a.x + a.w) {
        const other = arena.portals[1 - k];
        const j = ps.findIndex(
          (b) =>
            Math.abs(b.y - other.y - 26) < 4 &&
            other.x >= b.x &&
            other.x <= b.x + b.w,
        );
        if (j >= 0)
          edges.push({
            to: j,
            kind: "portal",
            takeoff: p.x,
            land: other.x,
            cost: 80,
          });
      }
    });
    return edges;
  });
}
export function route(graph: Edge[][], from: number, to: number): Edge[] {
  if (from < 0 || to < 0 || from === to) return [];
  const dist = graph.map(() => Infinity),
    prev = new Map<number, { from: number; edge: Edge }>(),
    open = new Set(graph.map((_, i) => i));
  dist[from] = 0;
  while (open.size) {
    let n = -1;
    let best = Infinity;
    for (const i of open)
      if (dist[i] < best) {
        best = dist[i];
        n = i;
      }
    if (n < 0 || n === to) break;
    open.delete(n);
    for (const edge of graph[n]) {
      const d = best + edge.cost;
      if (d < dist[edge.to]) {
        dist[edge.to] = d;
        prev.set(edge.to, { from: n, edge });
      }
    }
  }
  const out: Edge[] = [];
  let n = to;
  while (n !== from) {
    const p = prev.get(n);
    if (!p) return [];
    out.unshift(p.edge);
    n = p.from;
  }
  return out;
}
