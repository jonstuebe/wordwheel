import { describe, expect, it, vi } from 'vitest';
import { buildShareText, shareResults } from '../../src/lib/share';

describe('buildShareText', () => {
  it('gives the time, words and Hints without spoiling any word', () => {
    expect(buildShareText(12, 7, 161_000, 0)).toBe('WordWheel #12 · 2:41\n7 words · no hints\n\nwordwheel.jonstuebe.com');
    expect(buildShareText(3, 5, 3_725_000, 2)).toContain('1:02:05\n5 words · 2 hints');
  });
});

describe('shareResults', () => {
  it('falls back to the clipboard without a share sheet', async () => {
    const writeText = vi.fn(async () => {});
    expect(await shareResults('hi', { clipboard: { writeText } } as unknown as Navigator)).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('hi');
  });

  it('reports failure so the text can be shown instead', async () => {
    expect(await shareResults('hi', {} as Navigator)).toBe('failed');
  });
});
