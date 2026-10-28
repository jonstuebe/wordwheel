import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import levelsData from './data/levels.json';
import { cachedDaily, estimatedPuzzleNumber, loadDaily, type Daily } from './lib/daily';
import { DAILY_REWARD, LEVEL_REWARD, isSolved, runFits } from './lib/game';
import { dailyOrder, formatElapsed, localDateKey, shuffle } from './lib/puzzle';
import { buildShareText, shareResults } from './lib/share';
import {
  dailyProgress,
  effectiveStreak,
  loadState,
  recordDailySolve,
  nextLevel as advanceLevel,
  recordLevelSolve,
  saveState,
  type GameState,
} from './lib/storage';
import { newRun, type Puzzle, type Run } from './lib/types';
import { applyUpdate, onUpdateAvailable } from './lib/pwa';
import { usePrefersReducedMotion } from './lib/usePrefersReducedMotion';
import { Countdown } from './components/Countdown';
import { HelpModal } from './components/HelpModal';
import { Menu } from './components/Menu';
import { Play, type Earnings } from './components/Play';

const LEVELS = levelsData as Puzzle[];

type Screen = 'menu' | 'daily' | 'challenge';

const earn = (s: GameState, e: Earnings = {}): GameState => ({
  ...s,
  coins: s.coins + (e.coins ?? 0),
  bonusTotal: s.bonusTotal + (e.bonus ?? 0),
});

export function App() {
  const [now, setNow] = useState(() => new Date());
  const date = localDateKey(now);
  const [daily, setDaily] = useState<Daily>(() => cachedDaily(date) ?? { status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const [state, setState] = useState<GameState>(loadState);
  const [screen, setScreen] = useState<Screen>('menu');
  const [helpOpen, setHelpOpen] = useState(() => !state.seenHelp);
  const [toast, setToast] = useState<ReactNode>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const reducedMotion = usePrefersReducedMotion();

  // Persist every state change.
  useEffect(() => saveState(state), [state]);

  // Roll over to a new Puzzle at local midnight, or when the app returns from the background on a new day.
  const refreshDate = useCallback(() => setNow(new Date()), []);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && refreshDate();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refreshDate);
    window.addEventListener('online', retry);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refreshDate);
      window.removeEventListener('online', retry);
    };
  }, [refreshDate, retry]);

  // Fetch the Puzzle for the local date, unless it's already loaded. Retries when asked or back online.
  const dailyRef = useRef(daily);
  dailyRef.current = daily;
  useEffect(() => {
    const current = dailyRef.current;
    if (current.status === 'ready' && current.date === date) return;
    let cancelled = false;
    setDaily({ status: 'loading' });
    void loadDaily(date).then((d) => {
      if (!cancelled) setDaily(d);
    });
    return () => {
      cancelled = true;
    };
  }, [date, attempt]);

  // A new day while playing yesterday's Daily goes back to the menu.
  useEffect(() => {
    if (screen === 'daily' && daily.status !== 'ready') setScreen('menu');
  }, [screen, daily.status]);

  const showToast = useCallback((content: ReactNode, persistent = false) => {
    setToast(content);
    if (!persistent) window.setTimeout(() => setToast((t: ReactNode) => (t === content ? null : t)), 2500);
  }, []);

  useEffect(
    () =>
      onUpdateAvailable(() =>
        showToast(
          <>
            New version available{' '}
            <button type="button" className="toast-action" onClick={applyUpdate}>
              Refresh
            </button>
          </>,
          true,
        ),
      ),
    [showToast],
  );

  const announce = useCallback((message: string) => {
    // Clear first so repeating the same message is still announced.
    setLiveMessage('');
    window.requestAnimationFrame(() => setLiveMessage(message));
  }, []);

  const closeHelp = () => {
    setHelpOpen(false);
    if (!state.seenHelp) setState((s) => ({ ...s, seenHelp: true }));
  };

  const todayNumber = daily.status === 'ready' ? daily.number : (estimatedPuzzleNumber(date) ?? state.stats.lastSolved ?? 0);
  const streak = effectiveStreak(state, todayNumber);
  const dailyNumber = daily.status === 'ready' ? daily.number : null;
  const dailyResult = dailyNumber !== null ? (state.results[dailyNumber] ?? null) : null;
  const dailySolved = dailyResult !== null;

  // The Daily timer runs only while its puzzle is on screen and unsolved.
  useEffect(() => {
    if (screen !== 'daily' || dailyNumber === null || dailySolved) return;
    let last = Date.now();
    const id = window.setInterval(() => {
      const t = Date.now();
      const delta = document.hidden ? 0 : t - last;
      last = t;
      if (delta) setState((s) => {
        const progress = dailyProgress(s, dailyNumber);
        return { ...s, daily: { ...progress, elapsed: progress.elapsed + delta } };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [screen, dailyNumber, dailySolved]);

  const onDailyChange = useCallback(
    (run: Run, earnings?: Earnings) => {
      if (daily.status !== 'ready') return;
      setState((s) => {
        const progress = dailyProgress(s, daily.number);
        const next = { ...earn(s, earnings), daily: { ...progress, run } };
        return isSolved(daily.puzzle, run) ? recordDailySolve(next, daily.number, progress.elapsed, run.hints.length) : next;
      });
    },
    [daily],
  );

  const level = state.challenge.level;
  const levelPuzzle: Puzzle | undefined = LEVELS[level];
  // A Run saved against a Level since regenerated starts over rather than showing the old Wheel.
  const levelRun = levelPuzzle && runFits(levelPuzzle, state.challenge.run) ? state.challenge.run : newRun();
  // A solved level stays on screen, showing its done card, until the player moves on.
  const levelSolved = levelPuzzle ? isSolved(levelPuzzle, levelRun) : false;
  const nextLevel = useCallback(() => setState(advanceLevel), []);

  const onLevelChange = useCallback(
    (run: Run, earnings?: Earnings) => {
      setState((s) => {
        const puzzle = LEVELS[s.challenge.level];
        const next = { ...earn(s, earnings), challenge: { ...s.challenge, run } };
        const solvedNow = puzzle && isSolved(puzzle, run) && !isSolved(puzzle, s.challenge.run);
        return solvedNow ? recordLevelSolve(next) : next;
      });
    },
    [],
  );

  const openChallenge = () => {
    if (levelSolved) nextLevel();
    setScreen('challenge');
  };

  const openDaily = () => {
    if (daily.status === 'offline' || daily.status === 'none') retry();
    else if (daily.status === 'ready') setScreen('daily');
  };

  const share = async () => {
    if (!dailyResult || dailyNumber === null || daily.status !== 'ready') return;
    const text = buildShareText(dailyNumber, daily.puzzle.words.length, dailyResult.elapsed, dailyResult.hints);
    const outcome = await shareResults(text);
    if (outcome === 'copied') showToast('Copied to clipboard');
    else if (outcome === 'failed') showToast(<span className="share-fallback">{text}</span>);
  };

  const menu = () => setScreen('menu');
  const shownLevel = levelSolved ? level + 1 : level;

  return (
    <>
      {screen === 'menu' && (
        <Menu
          now={now}
          daily={daily}
          progress={dailyNumber !== null && state.daily?.number === dailyNumber ? state.daily : null}
          result={dailyResult}
          streak={streak}
          level={shownLevel}
          levelCount={LEVELS.length}
          coins={state.coins}
          bonusTotal={state.bonusTotal}
          onDaily={openDaily}
          onChallenge={openChallenge}
          onHelp={() => setHelpOpen(true)}
        />
      )}

      {screen === 'daily' && daily.status === 'ready' && (
        <Play
          key={`daily-${daily.number}`}
          puzzle={daily.puzzle}
          run={dailyProgress(state, daily.number).run}
          startOrder={() => dailyOrder(daily.puzzle.letters, daily.number)}
          title={`Daily #${daily.number}`}
          coins={state.coins}
          bonusTotal={state.bonusTotal}
          timer={formatElapsed(dailyResult?.elapsed ?? dailyProgress(state, daily.number).elapsed)}
          locked={dailySolved}
          reducedMotion={reducedMotion}
          onChange={onDailyChange}
          onBack={menu}
          announce={announce}
          done={
            <DoneCard title="Daily solved">
              <p>
                {dailyResult && `+${DAILY_REWARD} coins. Solved in ${formatElapsed(dailyResult.elapsed)}. `}
                Streak: {streak} {streak === 1 ? 'day' : 'days'}.
              </p>
              <Countdown onExpire={refreshDate} />
              <button type="button" className="primary" onClick={share} data-autofocus>
                Share
              </button>
              <button type="button" className="ghost" onClick={menu}>
                Main menu
              </button>
            </DoneCard>
          }
        />
      )}

      {screen === 'challenge' && levelPuzzle && (
        <Play
          key={`level-${level}`}
          puzzle={levelPuzzle}
          run={levelRun}
          startOrder={() => shuffle([...levelPuzzle.letters])}
          title={`Level ${level + 1}`}
          coins={state.coins}
          bonusTotal={state.bonusTotal}
          locked={false}
          reducedMotion={reducedMotion}
          onChange={onLevelChange}
          onBack={menu}
          announce={announce}
          done={
            <DoneCard title={`Level ${level + 1} done`}>
              <p>+{LEVEL_REWARD} coins</p>
              {level + 1 < LEVELS.length ? (
                <button type="button" className="primary" onClick={nextLevel} data-autofocus>
                  Next level
                </button>
              ) : (
                <p>You've played all {LEVELS.length} levels. More are on the way.</p>
              )}
              <button type="button" className="ghost" onClick={menu}>
                Main menu
              </button>
            </DoneCard>
          }
        />
      )}

      {screen === 'challenge' && !levelPuzzle && (
        <main className="app menu">
          <DoneCard title="All caught up">
            <p>You've played all {LEVELS.length} levels. More are on the way.</p>
            <button type="button" className="primary" onClick={menu}>
              Main menu
            </button>
          </DoneCard>
        </main>
      )}

      <HelpModal open={helpOpen} onClose={closeHelp} />
      {toast && (
        <div className="app-toast glass" role="status">
          {toast}
        </div>
      )}
      <div className="visually-hidden" aria-live="assertive" aria-atomic="true">
        {liveMessage}
      </div>
    </>
  );
}

function DoneCard({ title, children }: { title: string; children: ReactNode }) {
  // Focus the card's main action when it appears, so keyboard players can carry on.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus(), []);
  return (
    <div className="card glass" ref={ref}>
      <h2 id="done-title">{title}</h2>
      {children}
    </div>
  );
}
