import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BONUS_REWARD, HINT_COST, applyHint, isSolved, pickHint, submit } from '../lib/game';
import { layout, type CellKey, type GridLayout } from '../lib/grid';
import { reshuffle } from '../lib/puzzle';
import type { Puzzle, Run } from '../lib/types';
import { bump, confetti, flyTo } from '../lib/effects';
import { useCountUp } from '../lib/useCountUp';
import { Grid, type CellEffects } from './Grid';
import { Wheel } from './Wheel';
import { BackIcon, HintIcon, ShuffleIcon } from './Icons';

/** What a change to the Run is worth: coins earned or spent, Bonus words found. */
export interface Earnings {
  coins?: number;
  bonus?: number;
}

interface PlayProps {
  puzzle: Puzzle;
  run: Run;
  /** The Wheel order to start from when the Run has none yet. */
  startOrder: () => string[];
  title: string;
  coins: number;
  bonusTotal: number;
  /** Daily only: the solve time so far, already formatted. */
  timer?: string;
  /** View only: the Daily puzzle is already solved. */
  locked: boolean;
  reducedMotion: boolean;
  onChange: (run: Run, earnings?: Earnings) => void;
  onBack: () => void;
  announce: (message: string) => void;
  /** The card shown once the Puzzle is solved. */
  done: ReactNode;
}

const NO_EFFECTS: CellEffects = { popped: new Map(), flashed: new Set(), hinted: null };
type Tone = '' | 'bad' | 'same';

/** Cells of words found in `next` but not in `prev`, staggered letter by letter. */
function newlyFilled(grid: GridLayout, prev: Run, next: Run): Map<CellKey, number> {
  const before = new Set(prev.found.flatMap((w) => grid.wordCells.get(w) ?? []));
  const popped = new Map<CellKey, number>();
  for (const w of next.found.filter((w) => !prev.found.includes(w))) {
    (grid.wordCells.get(w) ?? []).forEach((k, i) => {
      if (!before.has(k) && !popped.has(k)) popped.set(k, i * 60);
    });
  }
  return popped;
}

export function Play(props: PlayProps) {
  const { puzzle, run, startOrder, coins, locked, reducedMotion, onChange, announce } = props;
  const grid = useMemo(() => layout(puzzle), [puzzle]);
  const order = run.order?.length === puzzle.letters.length ? run.order : null;
  const [fallbackOrder] = useState(startOrder);
  const letters = order ?? fallbackOrder;

  // Save the starting order so the Wheel looks the same on return.
  useEffect(() => {
    if (!order) onChange({ ...run, order: fallbackOrder });
  }, [order, run, fallbackOrder, onChange]);

  const [path, setPath] = useState<number[]>([]);
  const [preview, setPreview] = useState<{ word: string; tone: Tone }>({ word: '', tone: '' });
  const [toast, setToast] = useState('');
  const [effects, setEffects] = useState<CellEffects>(NO_EFFECTS);
  const [spin, setSpin] = useState(0);

  const solved = isSolved(puzzle, run);
  const [showDone, setShowDone] = useState(solved);
  const solvedAtStart = useRef(solved);

  const previewRef = useRef<HTMLSpanElement>(null);
  const coinsRef = useRef<HTMLElement>(null);
  const bonusRef = useRef<HTMLElement>(null);
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const timers = useRef<number[]>([]);
  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  useEffect(() => {
    if (!solved || solvedAtStart.current) return;
    const id = window.setTimeout(() => {
      setShowDone(true);
      if (!reducedMotion) confetti(confettiRef.current);
    }, 700);
    return () => window.clearTimeout(id);
  }, [solved, reducedMotion]);

  const shownCoins = useCountUp(coins, reducedMotion);

  /** Shows cell effects for `ms`, unless a newer effect of the same kind replaces them first. */
  const flash = (patch: Partial<CellEffects>, ms: number) => {
    setEffects((e) => ({ ...e, ...patch }));
    later(ms, () =>
      setEffects((e) => {
        const next = { ...e };
        for (const key of Object.keys(patch) as (keyof CellEffects)[]) {
          if (e[key] === patch[key]) Object.assign(next, { [key]: NO_EFFECTS[key] });
        }
        return next;
      }),
    );
  };

  const showToast = (message: string) => {
    setToast(message);
    later(1600, () => setToast((t) => (t === message ? '' : t)));
  };

  const settlePreview = (word: string, tone: Tone) => {
    setPreview({ word, tone });
    later(tone ? 500 : 350, () => setPreview((p) => (p.word === word ? { word: '', tone: '' } : p)));
  };

  const handleSubmit = (word: string) => {
    const outcome = submit(puzzle, grid, run, word);
    switch (outcome.kind) {
      case 'short':
        setPreview({ word: '', tone: '' });
        return;
      case 'grid':
        flash({ popped: newlyFilled(grid, run, outcome.run) }, 1200);
        onChange(outcome.run);
        announce(`Found ${word}`);
        settlePreview(word, '');
        return;
      case 'repeat':
        flash({ flashed: new Set(grid.wordCells.get(word)) }, 520);
        showToast('Already found');
        announce(`${word} is already found`);
        settlePreview(word, 'same');
        return;
      case 'bonus':
        onChange(outcome.run, { coins: BONUS_REWARD, bonus: 1 });
        showToast(`Bonus word +${BONUS_REWARD} coins`);
        announce(`Bonus word ${word}, plus ${BONUS_REWARD} coins`);
        if (!reducedMotion) {
          flyTo(previewRef.current, props.timer ? coinsRef.current : bonusRef.current, word, () => {
            bump(coinsRef.current);
            bump(bonusRef.current);
          });
        }
        settlePreview(word, '');
        return;
      case 'bonus-repeat':
        showToast('Bonus word already found');
        settlePreview(word, 'same');
        return;
      case 'miss':
        announce(`${word} is not a word here`);
        settlePreview(word, 'bad');
    }
  };

  const shuffleWheel = () => {
    setPath([]);
    onChange({ ...run, order: reshuffle(letters) });
    setSpin((s) => s + 1);
  };

  const canHint = !locked && !solved && coins >= HINT_COST && pickHint(grid, run, () => 0) !== null;
  const hint = () => {
    const cell = canHint ? pickHint(grid, run) : null;
    if (!cell) return;
    const next = applyHint(grid, run, cell);
    flash({ hinted: cell, popped: newlyFilled(grid, run, next) }, 800);
    onChange(next, { coins: -HINT_COST });
    bump(coinsRef.current);
    announce(`Revealed a letter for ${HINT_COST} coins`);
  };

  // Typing works like swiping: each key picks the next unused tile with that letter.
  const pathRef = useRef(path);
  pathRef.current = path;
  const submitRef = useRef(handleSubmit);
  submitRef.current = handleSubmit;
  useEffect(() => {
    if (locked || solved) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || document.querySelector('dialog[open]')) return;
      const current = pathRef.current;
      if (e.key === 'Enter' && current.length) {
        e.preventDefault();
        setPath([]);
        submitRef.current(current.map((i) => letters[i]).join(''));
      } else if (e.key === 'Backspace') {
        setPath(current.slice(0, -1));
      } else if (e.key === 'Escape') {
        setPath([]);
      } else if (/^[a-z]$/i.test(e.key)) {
        const i = letters.findIndex((ch, idx) => ch === e.key.toUpperCase() && !current.includes(idx));
        if (i >= 0) setPath([...current, i]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [letters, locked, solved]);

  const typed = path.map((i) => letters[i]).join('');
  const shown = typed || preview.word;

  return (
    <main className="app game">
      <header className="bar-header glass">
        <button type="button" className="back" onClick={props.onBack} aria-label="Back to menu">
          <BackIcon />
        </button>
        <h1 className="level">{props.title}</h1>
        <div className="stats">
          {props.timer !== undefined ? (
            <span>
              <b className="timer" aria-label={`Time ${props.timer}`}>
                {props.timer}
              </b>
            </span>
          ) : (
            <span>
              Bonus <b ref={bonusRef}>{props.bonusTotal}</b>
            </span>
          )}
          <span>
            Coins <b ref={coinsRef} data-testid="coins">{shownCoins}</b>
          </span>
        </div>
      </header>

      <Grid puzzle={puzzle} grid={grid} run={run} effects={effects} reducedMotion={reducedMotion} />

      <div className={`preview${typed ? '' : preview.tone ? ` ${preview.tone}` : ''}`} aria-hidden="true">
        <span ref={previewRef}>{shown}</span>
      </div>
      <div className="toast" role="status">
        {toast}
      </div>

      <div className="play">
        <button type="button" className="side glass shuffle" onClick={shuffleWheel} aria-label="Shuffle letters" disabled={locked}>
          <ShuffleIcon />
        </button>
        <Wheel
          order={letters}
          path={path}
          onPathChange={setPath}
          onSubmit={handleSubmit}
          disabled={locked || solved}
          reducedMotion={reducedMotion}
          spin={spin}
        />
        <button
          type="button"
          className="side glass hint"
          onClick={hint}
          aria-label={`Reveal a letter for ${HINT_COST} coins`}
          disabled={!canHint}
        >
          <HintIcon />
          {HINT_COST}
        </button>
      </div>

      <canvas className="confetti" ref={confettiRef} aria-hidden="true" />
      {showDone && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="done-title">
          {props.done}
        </div>
      )}
    </main>
  );
}
