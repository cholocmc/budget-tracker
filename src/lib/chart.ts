/**
 * SVG arc for a ring slice (rI > 0) or a pie slice (rI = 0), angles in radians clockwise from 12 o'clock.
 * A full circle is drawn as a near-full arc so a single category still renders as a whole ring or pie.
 */
export function arcPath(cx: number, cy: number, rO: number, rI: number, a0: number, a1: number) {
  if (a1 - a0 >= Math.PI * 2 - 1e-6) a1 = a0 + Math.PI * 2 - 1e-4;
  const p = (r: number, a: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)].map((v) => v.toFixed(2));
  const lg = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(rO, a0);
  const [x1, y1] = p(rO, a1);
  if (rI <= 0) return `M${cx},${cy}L${x0},${y0}A${rO},${rO} 0 ${lg} 1 ${x1},${y1}Z`;
  const [x2, y2] = p(rI, a1);
  const [x3, y3] = p(rI, a0);
  return `M${x0},${y0}A${rO},${rO} 0 ${lg} 1 ${x1},${y1}L${x2},${y2}A${rI},${rI} 0 ${lg} 0 ${x3},${y3}Z`;
}
