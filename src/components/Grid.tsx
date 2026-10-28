import { useEffect, useRef, useState } from 'react';
import { cellKey, type CellKey, type GridLayout } from '../lib/grid';
import type { Puzzle, Run } from '../lib/types';

const GAP = 5;
const MAX_CELL = 52;

export interface CellEffects {
  /** Cells just filled by a found word, with their stagger delay in ms. */
  popped: Map<CellKey, number>;
  /** Cells of a word found again, flashed as a reminder. */
  flashed: Set<CellKey>;
  /** The cell a Hint just revealed. */
  hinted: CellKey | null;
}

interface GridProps {
  puzzle: Puzzle;
  grid: GridLayout;
  run: Run;
  effects: CellEffects;
  reducedMotion: boolean;
}

export function Grid({ puzzle, grid, run, effects, reducedMotion }: GridProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState(32);
  const [entering, setEntering] = useState(!reducedMotion);

  // Fit the largest square cells that fill the board.
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const fit = () => {
      const w = board.clientWidth;
      const h = board.clientHeight - 20;
      const size = Math.min((w - (puzzle.cols - 1) * GAP) / puzzle.cols, (h - (puzzle.rows - 1) * GAP) / puzzle.rows, MAX_CELL);
      setCell(Math.max(18, Math.floor(size)));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(board);
    return () => observer.disconnect();
  }, [puzzle.rows, puzzle.cols]);

  useEffect(() => {
    if (!entering) return;
    const id = window.setTimeout(() => setEntering(false), (puzzle.rows + puzzle.cols) * 35 + 450);
    return () => window.clearTimeout(id);
  }, [entering, puzzle.rows, puzzle.cols]);

  const found = new Set<CellKey>();
  for (const w of run.found) for (const k of grid.wordCells.get(w) ?? []) found.add(k);
  const hints = new Set(run.hints);

  const cells = [];
  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      const key = cellKey(r, c);
      const letter = grid.letters.get(key);
      if (!letter) {
        cells.push(<div key={key} className="cell" />);
        continue;
      }
      const got = found.has(key);
      const shown = got || hints.has(key);
      const classes = ['cell', 'on'];
      if (got) classes.push('got');
      else if (shown) classes.push('hint');
      const pop = effects.popped.get(key);
      if (entering) classes.push('enter');
      else if (effects.flashed.has(key)) classes.push('flash');
      else if (effects.hinted === key) classes.push('hintnew');
      else if (pop !== undefined) classes.push('pop');
      const delay = entering ? (r + c) * 35 : pop ?? 0;
      cells.push(
        <div key={key} className={classes.join(' ')} style={delay ? { animationDelay: `${delay}ms` } : undefined}>
          {shown ? letter : ''}
        </div>,
      );
    }
  }

  return (
    <div className="board" ref={boardRef}>
      <div
        className="grid"
        role="img"
        aria-label={`Grid: ${run.found.length} of ${puzzle.words.length} words found`}
        style={{
          gridTemplateColumns: `repeat(${puzzle.cols}, ${cell}px)`,
          gridTemplateRows: `repeat(${puzzle.rows}, ${cell}px)`,
          fontSize: cell * 0.6,
        }}
      >
        {cells}
      </div>
    </div>
  );
}
