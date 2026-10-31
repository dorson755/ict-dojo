import type { QuestStage } from '@/domains/typing/quest';

export type MusicScene = 'stage' | 'boss' | 'duel';

/** One lazy media element, independent of effects. Never autoplays on load. */
export function createStageMusic(setting: QuestStage['setting'], onUnavailable: () => void) {
  let audio: HTMLAudioElement | null = null;
  let enabled = false,
    active = false,
    disposed = false,
    volume = 0.25;
  let scene: MusicScene = 'stage',
    source = '',
    pending = false;
  function unavailable() {
    if (!disposed && enabled) {
      enabled = false;
      audio?.pause();
      onUnavailable();
    }
  }
  function sync() {
    if (disposed) return;
    if (!enabled || !active) {
      audio?.pause();
      return;
    }
    const next = `/dojo-quest/music/${scene === 'stage' ? setting : 'fight'}.mp3`;
    if (!audio) {
      audio = new Audio();
      audio.loop = true;
      audio.preload = 'none';
      audio.addEventListener('error', unavailable);
    }
    audio.volume = volume;
    if (source !== next) {
      audio.pause();
      audio.src = next;
      source = next;
      pending = false;
    }
    if (audio.paused && !pending) {
      pending = true;
      void audio
        .play()
        .catch((error: unknown) => {
          // Pausing or switching tracks while play is pending is not a failure.
          if (!(
            error &&
            typeof error === 'object' &&
            'name' in error &&
            error.name === 'AbortError'
          ))
            unavailable();
        })
        .finally(() => {
          pending = false;
          if (!disposed && enabled && active && audio?.paused) sync();
        });
    }
  }
  return {
    setEnabled(value: boolean) {
      enabled = value;
      sync();
    },
    setActive(value: boolean) {
      active = value;
      sync();
    },
    setScene(value: MusicScene) {
      scene = value;
      sync();
    },
    setVolume(value: number) {
      if (!Number.isFinite(value)) return;
      volume = Math.max(0, Math.min(1, value));
      if (audio) audio.volume = volume;
    },
    destroy() {
      disposed = true;
      if (audio) {
        audio.pause();
        audio.removeEventListener('error', unavailable);
        audio.removeAttribute('src');
        audio.load();
        audio = null;
      }
    },
  };
}
