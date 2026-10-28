import { useEffect, useRef, useState } from 'react';

/** Eases a displayed number toward `target` over half a second. */
export function useCountUp(target: number, reducedMotion: boolean): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (reducedMotion) {
      from.current = target;
      setShown(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const frame = (t: number) => {
      const k = Math.min(1, (t - start) / 500);
      const value = Math.round(origin + (target - origin) * (1 - (1 - k) ** 3));
      from.current = value;
      setShown(value);
      if (k < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, reducedMotion]);
  return shown;
}
