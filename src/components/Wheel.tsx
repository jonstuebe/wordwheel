import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react';

const SIZE = 300;
const CENTER = SIZE / 2;

interface Node {
  ch: string;
  /** Stable across shuffles: the letter plus how many of it come earlier, e.g. "E1". */
  id: string;
  x: number;
  y: number;
  r: number;
}

function nodesFor(order: string[]): Node[] {
  const n = order.length;
  const radius = n <= 3 ? 78 : n <= 5 ? 92 : 98;
  const tile = n <= 5 ? 32 : n <= 6 ? 29 : 27;
  const seen = new Map<string, number>();
  return order.map((ch, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const count = seen.get(ch) ?? 0;
    seen.set(ch, count + 1);
    return { ch, id: `${ch}${count}`, x: CENTER + radius * Math.cos(a), y: CENTER + radius * Math.sin(a), r: tile };
  });
}

interface WheelProps {
  order: string[];
  /** Wheel indexes picked so far, in order. Owned by the parent so typing can share it. */
  path: number[];
  onPathChange: (path: number[]) => void;
  /** Lifting the finger submits the word. */
  onSubmit: (word: string) => void;
  disabled: boolean;
  reducedMotion: boolean;
  /** Bumped on every Shuffle so the disc gives a little spin. */
  spin: number;
}

export function Wheel({ order, path, onPathChange, onSubmit, disabled, reducedMotion, spin }: WheelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const discRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const dragging = pointer !== null;
  const nodes = nodesFor(order);

  // FLIP: after a Shuffle, start each tile where it was and let CSS move it home.
  const lastPositions = useRef(new Map<string, { x: number; y: number }>());
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const previous = lastPositions.current;
    lastPositions.current = new Map(nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
    if (reducedMotion || !previous.size) return;
    const moved: SVGGElement[] = [];
    for (const n of nodes) {
      const from = previous.get(n.id);
      const g = svg.querySelector<SVGGElement>(`[data-id="${n.id}"]`);
      if (!from || !g || (from.x === n.x && from.y === n.y)) continue;
      g.style.transition = 'none';
      g.style.transform = `translate(${from.x - n.x}px, ${from.y - n.y}px)`;
      moved.push(g);
    }
    if (!moved.length) return;
    svg.getBoundingClientRect();
    requestAnimationFrame(() =>
      moved.forEach((g) => {
        g.style.transition = '';
        g.classList.add('move');
        g.style.transform = '';
        g.addEventListener('transitionend', () => g.classList.remove('move'), { once: true });
      }),
    );
    // Keyed on the letter order alone: positions only change when it does.
  }, [order.join('')]);

  useLayoutEffect(() => {
    const disc = discRef.current;
    if (!disc || !spin || reducedMotion) return;
    disc.classList.remove('spin');
    void disc.offsetWidth;
    disc.classList.add('spin');
  }, [spin, reducedMotion]);

  const toSvg = (e: PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) * SIZE) / rect.width, y: ((e.clientY - rect.top) * SIZE) / rect.height };
  };
  const hit = (p: { x: number; y: number }) => nodes.findIndex((n) => Math.hypot(p.x - n.x, p.y - n.y) < n.r * 1.05);

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (disabled) return;
    const p = toSvg(e);
    const i = hit(p);
    if (i < 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setPointer(p);
    onPathChange([i]);
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const p = toSvg(e);
    setPointer(p);
    const i = hit(p);
    if (i < 0) return;
    if (!path.includes(i)) onPathChange([...path, i]);
    // Sliding back onto the previous letter undoes the last one.
    else if (path.length > 1 && path[path.length - 2] === i) onPathChange(path.slice(0, -1));
  };

  const end = () => {
    if (!dragging) return;
    setPointer(null);
    const word = path.map((i) => order[i]).join('');
    onPathChange([]);
    onSubmit(word);
  };

  const points = path.map((i) => nodes[i]).map((n) => ({ x: n.x, y: n.y }));
  if (pointer && points.length) points.push(pointer);

  return (
    <div className="disc glass" ref={discRef}>
      <svg
        ref={svgRef}
        className="wheel"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Wheel letters: ${order.join(' ')}. Swipe across them, or type, to spell a word.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <g>
          {points.length > 1 && (
            <polyline
              points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={9}
              strokeOpacity={0.85}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </g>
        {nodes.map((n, i) => {
          const on = path.includes(i);
          return (
            <g key={n.id} data-id={n.id} className={`tile${on ? ' sel' : ''}`}>
              <circle cx={n.x} cy={n.y} r={n.r} fill={on ? 'var(--accent)' : 'var(--tile)'} stroke="var(--edge)" strokeWidth={1.5} />
              <text
                x={n.x}
                y={n.y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={n.r * 1.15}
                fontWeight={650}
                fill={on ? 'var(--accent-ink)' : 'var(--tile-ink)'}
              >
                {n.ch}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
