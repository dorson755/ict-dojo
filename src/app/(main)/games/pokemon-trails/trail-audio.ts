import type { TrailElement, TrailFeedback } from './trail-feedback';

export interface TrailSoundPreferences {
  enabled: boolean;
  volume: number;
}
export interface TrailMusicPreferences {
  enabled: boolean;
  volume: number;
}
export const TRAIL_SOUND_KEY = 'ict-dojo:trail-sound';
export const TRAIL_MUSIC_KEY = 'ict-dojo:trail-music';
export const DEFAULT_TRAIL_SOUND: TrailSoundPreferences = { enabled: false, volume: 0.35 };
export const DEFAULT_TRAIL_MUSIC: TrailMusicPreferences = { enabled: false, volume: 0.3 };
// A four-second, 120 BPM melody and bass made for this game. No sampled or borrowed theme.
const BATTLE_MELODY = [
  659.25, 0, 783.99, 659.25, 880, 0, 783.99, 0, 587.33, 0, 659.25, 783.99, 523.25, 0, 587.33, 0,
];
const BATTLE_BASS = [
  130.81, 0, 130.81, 0, 174.61, 0, 174.61, 0, 196, 0, 196, 0, 130.81, 0, 130.81, 0,
];
const MUSIC_STEP_SECONDS = 0.25;
const MUSIC_NOTE_SECONDS = 0.17;
function clampVolume(volume: number) {
  return Math.max(0, Math.min(1, volume));
}
export function readTrailSound(): TrailSoundPreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(TRAIL_SOUND_KEY) ?? 'null');
    if (typeof saved?.enabled === 'boolean' && Number.isFinite(saved.volume))
      return { enabled: saved.enabled, volume: clampVolume(saved.volume) };
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
export function readTrailMusic(): TrailMusicPreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(TRAIL_MUSIC_KEY) ?? 'null');
    if (typeof saved?.enabled === 'boolean' && Number.isFinite(saved.volume))
      return { enabled: saved.enabled, volume: clampVolume(saved.volume) };
  } catch {
    /* Storage can be blocked; music remains optional. */
  }
  return { ...DEFAULT_TRAIL_MUSIC };
}
export function writeTrailMusic(preferences: TrailMusicPreferences) {
  try {
    localStorage.setItem(TRAIL_MUSIC_KEY, JSON.stringify(preferences));
  } catch {
    /* Optional. */
  }
}

/** Original synthesized effects and a battle loop. No downloaded audio or audio requests. */
export class TrailAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Set<OscillatorNode>();
  private musicMaster: GainNode | null = null;
  private musicVoices = new Set<OscillatorNode>();
  private enabled = false;
  private volume = DEFAULT_TRAIL_SOUND.volume;
  private musicEnabled = DEFAULT_TRAIL_MUSIC.enabled;
  private musicVolume = DEFAULT_TRAIL_MUSIC.volume;
  private musicActive = false;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicStep = 0;
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
  configureMusic(preferences: TrailMusicPreferences) {
    this.musicEnabled = preferences.enabled;
    this.musicVolume = clampVolume(preferences.volume);
    if (this.musicMaster && this.context) {
      try {
        this.musicMaster.gain.setValueAtTime(
          this.musicEnabled ? this.musicVolume * 0.5 : 0,
          this.context.currentTime,
        );
      } catch {
        this.stopMusic();
      }
    }
    if (!this.musicEnabled || !this.musicVolume) this.stopMusic();
    else this.startMusicIfPossible();
  }
  setMusicActive(active: boolean) {
    this.musicActive = active;
    if (!active) this.stopMusic();
    else this.startMusicIfPossible();
  }
  /** Call only from a user gesture, never while loading saved preferences. */
  async unlock(): Promise<boolean> {
    if ((!this.enabled && !this.musicEnabled) || this.disposed) return false;
    try {
      if (!this.context) {
        if (typeof window.AudioContext !== 'function') return false;
        this.context = new window.AudioContext();
        this.master = this.context.createGain();
        this.master.gain.setValueAtTime(
          this.enabled ? this.volume * 0.12 : 0,
          this.context.currentTime,
        );
        this.master.connect(this.context.destination);
        this.musicMaster = this.context.createGain();
        this.musicMaster.gain.setValueAtTime(
          this.musicEnabled ? this.musicVolume * 0.5 : 0,
          this.context.currentTime,
        );
        this.musicMaster.connect(this.context.destination);
      }
      if (this.context.state !== 'running') await this.context.resume();
      this.startMusicIfPossible();
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
  private startMusicIfPossible() {
    if (
      !this.musicActive ||
      !this.musicEnabled ||
      !this.musicVolume ||
      !this.context ||
      this.context.state !== 'running' ||
      this.musicTimer !== null
    )
      return;
    this.musicStep = 0;
    try {
      this.playMusicStep();
      this.musicTimer = setInterval(() => {
        try {
          this.playMusicStep();
        } catch {
          this.stopMusic();
        }
      }, MUSIC_STEP_SECONDS * 1000);
    } catch {
      this.stopMusic();
    }
  }
  private playMusicStep() {
    const context = this.context;
    if (!context || !this.musicMaster || context.state !== 'running') return;
    const step = this.musicStep;
    this.musicStep = (step + 1) % BATTLE_MELODY.length;
    const start = context.currentTime + 0.025;
    if (BATTLE_MELODY[step])
      this.musicTone(BATTLE_MELODY[step], start, MUSIC_NOTE_SECONDS, 'square', 0.18);
    if (BATTLE_BASS[step])
      this.musicTone(BATTLE_BASS[step], start, MUSIC_NOTE_SECONDS, 'triangle', 0.22);
  }
  private musicTone(
    frequency: number,
    start: number,
    duration: number,
    type: OscillatorType,
    level: number,
  ) {
    const context = this.context;
    if (!context || !this.musicMaster) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.musicMaster);
    this.musicVoices.add(oscillator);
    oscillator.onended = () => {
      this.musicVoices.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  }
  private stopMusic() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    for (const voice of this.musicVoices) {
      try {
        voice.stop();
      } catch {
        /* A note may already have ended. */
      }
    }
    this.musicVoices.clear();
    this.musicStep = 0;
  }
  pause() {
    this.stop();
    this.setMusicActive(false);
    if (this.context && this.context.state !== 'closed')
      void this.context.suspend().catch(() => {});
  }
  destroy() {
    this.disposed = true;
    this.stop();
    this.setMusicActive(false);
    if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => {});
  }
}
