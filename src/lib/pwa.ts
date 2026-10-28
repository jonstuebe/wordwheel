import { registerSW } from 'virtual:pwa-register';

type Listener = () => void;

let needsRefresh = false;
let update: ((reload?: boolean) => Promise<void>) | null = null;
const listeners = new Set<Listener>();

/** Registers the service worker; a waiting update is surfaced, never auto-applied. */
export function initPwa(): void {
  if (!('serviceWorker' in navigator)) return;
  update = registerSW({
    onNeedRefresh() {
      needsRefresh = true;
      listeners.forEach((l) => l());
    },
  });
}

export function onUpdateAvailable(listener: Listener): () => void {
  listeners.add(listener);
  if (needsRefresh) listener();
  return () => listeners.delete(listener);
}

export function applyUpdate(): void {
  void update?.(true);
}
