import { useEffect, useState } from 'react';
import { nextLocalMidnight } from '../lib/puzzle';

interface CountdownProps {
  /** Called once when the countdown reaches the next local midnight. */
  onExpire: () => void;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

export function Countdown({ onExpire }: CountdownProps) {
  const [target] = useState(() => nextLocalMidnight(new Date()).getTime());
  const [remaining, setRemaining] = useState(() => target - Date.now());

  useEffect(() => {
    let expired = false;
    const tick = () => {
      const left = target - Date.now();
      setRemaining(left);
      if (left <= 0 && !expired) {
        expired = true;
        onExpire();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target, onExpire]);

  return (
    <p className="countdown">
      Next puzzle in <time className="countdown-time">{formatDuration(remaining)}</time>
    </p>
  );
}
