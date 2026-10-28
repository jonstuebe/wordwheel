/** Decorative motion that lives outside React: flying words and confetti. */

/** Flies a copy of `from`'s text into `to`, then calls `done`. Calls `done` at once when there's nothing to animate. */
export function flyTo(from: Element | null, to: Element | null, text: string, done: () => void): void {
  const src = from?.getBoundingClientRect();
  const dst = to?.getBoundingClientRect();
  if (!src || !dst || !src.width || typeof document.body.animate !== 'function') return done();
  const fly = document.createElement('div');
  fly.className = 'fly';
  fly.textContent = text;
  fly.style.left = `${src.left}px`;
  fly.style.top = `${src.top}px`;
  document.body.appendChild(fly);
  const dx = dst.left + dst.width / 2 - (src.left + src.width / 2);
  const dy = dst.top + dst.height / 2 - (src.top + src.height / 2);
  const animation = fly.animate(
    [
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 30}px) scale(.8)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${dx}px,${dy}px) scale(.2)`, opacity: 0 },
    ],
    { duration: 650, easing: 'cubic-bezier(.5,0,.6,1)' },
  );
  animation.onfinish = () => {
    fly.remove();
    done();
  };
}

const CONFETTI_COLORS = ['#007AFF', '#5AC8FA', '#AF52DE', '#34C759', '#FF9F0A', '#FF2D55'];
const CONFETTI_SECONDS = 2.4;

export function confetti(canvas: HTMLCanvasElement | null): void {
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const { innerWidth: w, innerHeight: h } = window;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pieces = Array.from({ length: 110 }, () => ({
    x: w / 2,
    y: h * 0.45,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 14 - 4,
    size: Math.random() * 7 + 5,
    angle: Math.random() * 6,
    spin: (Math.random() - 0.5) * 0.3,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    round: Math.random() < 0.4,
  }));
  const start = performance.now();
  const frame = (t: number) => {
    ctx.clearRect(0, 0, w, h);
    const age = (t - start) / 1000;
    for (const p of pieces) {
      p.vy += 0.35;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - age / CONFETTI_SECONDS);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, 7);
        ctx.fill();
      } else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (age < CONFETTI_SECONDS) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, w, h);
  };
  requestAnimationFrame(frame);
}

/** Restarts a one-shot CSS animation class on an element. */
export function bump(el: Element | null, className = 'pulse'): void {
  if (!el) return;
  el.classList.remove(className);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(className);
}
