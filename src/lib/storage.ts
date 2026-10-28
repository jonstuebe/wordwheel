import { DAILY_REWARD, LEVEL_REWARD, STARTING_COINS } from './game';
import { newRun, type Run } from './types';

export const STORAGE_KEY = 'wordwheel:v1';

/** Progress on one Daily puzzle, kept until the next day's replaces it. */
export interface DailyProgress {
  number: number;
  run: Run;
  /** Time spent solving so far, only counted while the puzzle is on screen. */
  elapsed: number;
}

export interface DailyResult {
  elapsed: number;
  hints: number;
}

export interface Stats {
  solved: number;
  currentStreak: number;
  maxStreak: number;
  /** The last Daily puzzle number solved. */
  lastSolved: number | null;
}

export interface GameState {
  coins: number;
  bonusTotal: number;
  daily: DailyProgress | null;
  results: Record<string, DailyResult>;
  stats: Stats;
  challenge: { level: number; run: Run };
  seenHelp: boolean;
}

export function defaultState(): GameState {
  return {
    coins: STARTING_COINS,
    bonusTotal: 0,
    daily: null,
    results: {},
    stats: { solved: 0, currentStreak: 0, maxStreak: 0, lastSolved: null },
    challenge: { level: 0, run: newRun() },
    seenHelp: false,
  };
}

const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

function readRun(v: unknown): Run {
  const r = v as Partial<Run> | null;
  return {
    found: isStrings(r?.found) ? r.found : [],
    bonusFound: isStrings(r?.bonusFound) ? r.bonusFound : [],
    hints: isStrings(r?.hints) ? r.hints : [],
    order: isStrings(r?.order) ? r.order : null,
  };
}

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** Reads state, tolerating missing, corrupt, or partial data and blocked storage. */
export function loadState(storage: Storage | undefined = safeStorage()): GameState {
  const base = defaultState();
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (!parsed || typeof parsed !== 'object') return base;
    const daily = parsed.daily && typeof parsed.daily.number === 'number'
      ? { number: parsed.daily.number, run: readRun(parsed.daily.run), elapsed: num(parsed.daily.elapsed, 0) }
      : null;
    return {
      coins: num(parsed.coins, base.coins),
      bonusTotal: num(parsed.bonusTotal, 0),
      daily,
      results: parsed.results && typeof parsed.results === 'object' ? parsed.results : {},
      stats: { ...base.stats, ...parsed.stats },
      challenge: { level: num(parsed.challenge?.level, 0), run: readRun(parsed.challenge?.run) },
      seenHelp: parsed.seenHelp === true,
    };
  } catch {
    return base;
  }
}

export function saveState(state: GameState, storage: Storage | undefined = safeStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or quota exceeded: the game still works for this session.
  }
}

function safeStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Today's Daily progress, starting fresh when the saved one is from another day. */
export function dailyProgress(state: GameState, number: number): DailyProgress {
  return state.daily?.number === number ? state.daily : { number, run: newRun(), elapsed: 0 };
}

/**
 * Records a solved Daily puzzle and pays its reward. A no-op if that puzzle
 * already has a result, so a day can never be paid twice.
 */
export function recordDailySolve(state: GameState, number: number, elapsed: number, hints: number): GameState {
  if (state.results[number]) return state;
  const continues = state.stats.lastSolved === number - 1;
  const currentStreak = continues ? state.stats.currentStreak + 1 : 1;
  return {
    ...state,
    coins: state.coins + DAILY_REWARD,
    results: { ...state.results, [number]: { elapsed, hints } },
    stats: {
      solved: state.stats.solved + 1,
      currentStreak,
      maxStreak: Math.max(state.stats.maxStreak, currentStreak),
      lastSolved: number,
    },
  };
}

/** Pays for a solved Level. The player stays on it, seeing its done card, until `nextLevel`. */
export function recordLevelSolve(state: GameState): GameState {
  return { ...state, coins: state.coins + LEVEL_REWARD };
}

export function nextLevel(state: GameState): GameState {
  return { ...state, challenge: { level: state.challenge.level + 1, run: newRun() } };
}

/** The Streak as of today: a missed day shows as 0 even before the next solve. */
export function effectiveStreak(state: GameState, today: number): number {
  if (state.stats.lastSolved === null) return 0;
  return today - state.stats.lastSolved <= 1 ? state.stats.currentStreak : 0;
}
