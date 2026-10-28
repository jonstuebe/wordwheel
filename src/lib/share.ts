import { formatElapsed } from './puzzle';

export const GAME_URL = 'wordwheel.jonstuebe.com';

/** Spoiler-free: the time, words found, and Hints used, never the words themselves. */
export function buildShareText(puzzleNumber: number, words: number, elapsed: number, hints: number): string {
  const hintText = hints === 0 ? 'no hints' : hints === 1 ? '1 hint' : `${hints} hints`;
  return `WordWheel #${puzzleNumber} · ${formatElapsed(elapsed)}\n${words} words · ${hintText}\n\n${GAME_URL}`;
}

export type ShareOutcome = 'shared' | 'copied' | 'aborted' | 'failed';

/**
 * Native share sheet where available (phones),
 * clipboard otherwise. 'failed' means the caller should show the text for
 * manual copying.
 */
export async function shareResults(text: string, nav: Navigator = navigator): Promise<ShareOutcome> {
  if (typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ text })) {
    try {
      await nav.share({ text });
      return 'shared';
    } catch (err) {
      if ((err as { name?: string } | null)?.name === 'AbortError') return 'aborted';
      // Otherwise fall through to the clipboard.
    }
  }
  try {
    if (!nav.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await nav.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
