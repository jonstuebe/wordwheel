# WordWheel

A word puzzle game where the player swipes across letters on a wheel to spell words that fill a grid. Players earn and spend coins, and play either a Daily puzzle or Challenge levels.

## Language

### Puzzle

**Puzzle**:
One set of wheel letters paired with a grid of target words. A puzzle is finished when every grid word is found.
_Avoid_: Board, round, game

**Wheel**:
The circular arrangement of letters the player swipes across to build a word. Each letter on the wheel can be used at most once per word.
_Avoid_: Letter circle, dial, tiles

**Grid**:
The crossword-style layout of slots for the puzzle's target words.
_Avoid_: Board, crossword

**Grid word**:
A target word with a place on the grid. Finding it fills in its slots.
_Avoid_: Answer, target, solution word

**Root word**:
The common word that uses every Wheel letter. It is always a Grid word, and the generator builds each Puzzle around it.
_Avoid_: Seed word, main word

**Bonus word**:
A real word of at least 3 letters, spellable from the wheel, that is not a grid word. Each one found earns 5 coins.
_Avoid_: Extra word, hidden word

**Swipe**:
One continuous gesture across wheel letters that spells a word. Lifting the finger submits it. Sliding back to the previous letter undoes the last letter.
_Avoid_: Drag, trace, path

**Submission**:
The word formed when a swipe ends. It must be at least 3 letters long and is checked against grid words, then bonus words.
_Avoid_: Guess, attempt

### Economy

**Coins**:
The single in-game currency, shared across all modes. A new player starts with 100.
_Avoid_: Points, gold, credits

**Hint**:
A tool, shown as a lightbulb, that costs 25 coins and reveals one letter on the grid.
_Avoid_: Clue, reveal

**Shuffle**:
A free tool, shown as arrows, that rearranges the letters on the wheel.
_Avoid_: Scramble, rotate

### Modes

**Daily puzzle**:
The one puzzle everyone shares on a given day. A new one starts at midnight. It allows one timed solve per day and earns 30 coins.
_Avoid_: Daily challenge, puzzle of the day

**Puzzle number**:
Which Daily puzzle a date gets, counting from #1 on the Launch date (2026-10-28). Only the server knows it.
_Avoid_: Day number, puzzle id

**Streak**:
The count of consecutive days the player has solved the Daily puzzle.
_Avoid_: Combo, chain

**Challenge**:
The mode made of a series of levels that get harder as you go, with no daily limit.
_Avoid_: Campaign, adventure, story mode

**Level**:
One puzzle within Challenge. Each level solved earns 20 coins. The player's place is kept when new levels are added.
_Avoid_: Stage, round
