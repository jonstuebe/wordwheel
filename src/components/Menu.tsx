import type { Daily } from '../lib/daily';
import { formatElapsed, formatPuzzleDate, nextLocalMidnight } from '../lib/puzzle';
import type { DailyProgress, DailyResult } from '../lib/storage';

interface MenuProps {
  now: Date;
  daily: Daily;
  progress: DailyProgress | null;
  result: DailyResult | null;
  streak: number;
  level: number;
  levelCount: number;
  coins: number;
  bonusTotal: number;
  onDaily: () => void;
  onChallenge: () => void;
  onHelp: () => void;
}

/** Time until local midnight as `5h 3m` or `12m`. */
function untilMidnight(now: Date): string {
  const mins = Math.ceil((nextLocalMidnight(now).getTime() - now.getTime()) / 60_000);
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}

function dailyStatus({ daily, progress, result, now }: Pick<MenuProps, 'daily' | 'progress' | 'result' | 'now'>): string {
  switch (daily.status) {
    case 'loading':
      return "Loading today's puzzle…";
    case 'offline':
      return "Connect to get today's puzzle. Tap to retry.";
    case 'none':
      return 'No puzzle today. Back tomorrow.';
    case 'ready': {
      if (result) return `Solved in ${formatElapsed(result.elapsed)}. Next puzzle in ${untilMidnight(now)}.`;
      const found = progress?.run.found.length ?? 0;
      return found ? `In progress: ${found} of ${daily.puzzle.words.length} words` : `Play puzzle #${daily.number}`;
    }
  }
}

export function Menu(props: MenuProps) {
  const { streak, level, levelCount } = props;
  const allDone = level >= levelCount;
  return (
    <main className="app menu">
      <div className="menu-top">
        <h1>WordWheel</h1>
        <p className="today">{formatPuzzleDate(props.now)}</p>
      </div>
      <div className="modes">
        <button type="button" className="mode glass" onClick={props.onDaily} disabled={props.daily.status === 'loading'}>
          <span className="mode-head">
            <span className="mode-name">Daily puzzle</span>
            {streak > 0 && <span className="chip">{streak} day streak</span>}
          </span>
          <span className="mode-desc">Everyone gets the same puzzle. A new one arrives at midnight.</span>
          <span className="mode-status">{dailyStatus(props)}</span>
        </button>
        <button type="button" className="mode glass" onClick={props.onChallenge}>
          <span className="mode-head">
            <span className="mode-name">Challenge</span>
            <span className="chip">{allDone ? `All ${levelCount} done` : `Level ${level + 1} of ${levelCount}`}</span>
          </span>
          <span className="mode-desc">Work through the levels as fast as you like. New levels get added over time.</span>
          <span className="progress" aria-hidden="true">
            <span style={{ width: `${Math.min(100, (level / levelCount) * 100)}%` }} />
          </span>
        </button>
      </div>
      <div className="menu-foot">
        <span className="pill glass">
          Coins <b>{props.coins}</b>
        </span>
        <span className="pill glass">
          Bonus words <b>{props.bonusTotal}</b>
        </span>
        <button type="button" className="pill glass pill-button" onClick={props.onHelp}>
          How to play
        </button>
      </div>
    </main>
  );
}
