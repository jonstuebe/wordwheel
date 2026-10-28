import { BONUS_REWARD, DAILY_REWARD, HINT_COST, LEVEL_REWARD } from '../lib/game';
import { Modal } from './Modal';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  return (
    <Modal title="How to play" open={open} onClose={onClose}>
      <ul className="help-list">
        <li>Swipe across the letters on the wheel to spell a word, then lift to submit. Slide back to undo a letter.</li>
        <li>On a keyboard, type the word and press Enter.</li>
        <li>Words must be at least 3 letters, and each letter can be used once per word.</li>
        <li>Find every word in the grid to solve the puzzle.</li>
        <li>Other real words are bonus words, worth {BONUS_REWARD} coins each.</li>
        <li>Shuffle the wheel for free. A hint costs {HINT_COST} coins and reveals one letter.</li>
        <li>
          The Daily puzzle is the same for everyone and timed; solving it earns {DAILY_REWARD} coins. Each Challenge level earns {LEVEL_REWARD}.
        </li>
      </ul>
      <button type="button" className="primary" data-autofocus onClick={onClose}>
        Let's play
      </button>
    </Modal>
  );
}
