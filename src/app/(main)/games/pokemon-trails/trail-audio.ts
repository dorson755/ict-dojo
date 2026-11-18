import type { TrailElement, TrailFeedback } from './trail-feedback';

export interface TrailSoundPreferences {
  enabled: boolean;
  volume: number;
}
export const TRAIL_SOUND_KEY = 'ict-dojo:trail-sound';
export const DEFAULT_TRAIL_SOUND: TrailSoundPreferences = { enabled: false, volume: 0.35 };
export function readTrailSound(): TrailSoundPreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(TRAIL_SOUND_KEY) ?? 'null');
    if (typeof saved?.enabled === 'boolean' && Number.isFinite(saved.volume))
      return { enabled: saved.enabled, volume: Math.max(0, Math.min(1, saved.volume)) };
  } catch {
    /* Storage can be blocked; audio remains optional. */
  }
  return { ...DEFAULT_TRAIL_SOUND };
}
export function writeTrailSound(preferences: TrailSoundPreferences) {
  try {
    localStorage.setItem(TRAIL_SOUND_KEY, JSON.stringify(preferences));
  } catch {
    /* Optional. */
  }
}

/** Original, short synthesized effects. No downloaded music, cries, or audio requests. */
export class TrailAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Set<OscillatorNode>();
  private enabled = false;
  private volume = DEFAULT_TRAIL_SOUND.volume;
  private lastCue = -Infinity;
  private disposed = false;

  configure(preferences: TrailSoundPreferences) {
    this.enabled = preferences.enabled;
    this.volume = Math.max(0, Math.min(1, preferences.volume));
    if (this.master && this.context)
      this.master.gain.setValueAtTime(
        this.enabled ? this.volume * 0.12 : 0,
        this.context.currentTime,
      );
    if (!this.enabled || !this.volume) this.stop();
  }
  /** Call only from a user gesture, never while loading saved preferences. */
  async unlock(): Promise<boolean> {
    if (!this.enabled || this.disposed) return false;
    try {
      if (!this.context) {
        if (typeof window.AudioContext !== 'function') return false;
        this.context = new window.AudioContext();
        this.master = this.context.createGain();
        this.master.gain.setValueAtTime(this.volume * 0.12, this.context.currentTime);
        this.master.connect(this.context.destination);
      }
      if (this.context.state !== 'running') await this.context.resume();
      return !this.disposed && this.context.state === 'running';
    } catch {
      return false;
    }
  }
  play(feedback: TrailFeedback, element: TrailElement) {
    try {
      this.playCue(feedback, element);
    } catch {
      // A browser/audio-device failure must never interrupt a typing replay.
      this.stop();
    }
  }
  private playCue(feedback: TrailFeedback, element: TrailElement) {
    if (!this.enabled || !this.volume || this.disposed || this.context?.state !== 'running') return;
    const now = this.context.currentTime;
    // Fast repeated typos must not produce a wall of sound.
    if ((feedback.cue === 'mistake' || feedback.cue === 'word') && now - this.lastCue < 0.12)
      return;
    this.lastCue = now;
    if (feedback.cue === 'capture') {
      [523.25, 659.25, 783.99, 1046.5].forEach((note, i) =>
        this.tone(note, note, 0.13, i * 0.12, 'sine'),
      );
    } else if (feedback.cue === 'attack') {
      const notes = { leaf: [420, 620], ember: [180, 75], bubble: [240, 720], spark: [740, 260] };
      const [from, to] = notes[element];
      this.tone(from, to, 0.18, 0, element === 'ember' ? 'triangle' : 'sine');
    } else if (feedback.cue === 'guard') {
      this.tone(330, 495, 0.2, 0, 'sine');
    } else if (feedback.cue === 'mistake' || feedback.cue === 'retry') {
      this.tone(190, 160, 0.055, 0, 'sine');
    } else if (feedback.cue === 'word') {
      this.tone(660, 780, 0.06, 0, 'sine');
    } else {
      this.tone(260, 160, 0.15, 0, 'sine');
    }
    if (feedback.counter) this.tone(140, 80, 0.13, 0.42, 'triangle');
  }
  private tone(from: number, to: number, duration: number, delay: number, type: OscillatorType) {
    const context = this.context;
    if (!context || !this.master || this.voices.size >= 12) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.5, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    this.voices.add(oscillator);
    oscillator.onended = () => {
      this.voices.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  }
  stop() {
    for (const voice of this.voices) {
      try {
        voice.stop();
      } catch {
        /* A voice may already have ended. */
      }
    }
    this.voices.clear();
  }
  pause() {
    this.stop();
    if (this.context && this.context.state !== 'closed')
      void this.context.suspend().catch(() => {});
  }
  destroy() {
    this.disposed = true;
    this.stop();
    if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => {});
  }
}
