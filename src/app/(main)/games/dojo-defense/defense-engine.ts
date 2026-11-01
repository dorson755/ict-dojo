import {
  createDefense,
  defenseTarget,
  startDefenseWave,
  tickDefense,
  typeDefenseKey,
  DEFENSE_WORD_COUNT,
  DEFENSE_WAVES,
} from '@/domains/typing/defense';
import type { DefenseState, DefenseEvent } from '@/domains/typing/defense';
import type { QuestContent } from '@/domains/typing/quest';
import type { KeystrokeEvent } from '@/domains/typing/types';
import { pickGameWords } from '@/domains/typing/word-bank';
import type { QuestRound } from '../dojo-quest/quest-engine';

export interface DefenseStatus {
  phase: DefenseState['phase'];
  wave: number;
  health: number;
  shields: number;
  streak: number;
  cleared: number;
  word: string;
  typed: number;
  paused: boolean;
  remaining: number;
}

export function createDefenseGame(
  canvas: HTMLCanvasElement,
  content: QuestContent,
  onEnd: (round: QuestRound) => void,
  onStatus: (status: DefenseStatus) => void,
  onReady: () => void,
  onError: () => void,
) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable.');
  const ctx = context;
  const font = getComputedStyle(canvas).fontFamily;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = Object.fromEntries(content.focusKeys.map((key) => [key, 1]));
  if (!content.words.length) throw new Error('No defense words available.');
  const words: string[] = [];
  // A valid AI response can contain only sixteen unique words. Re-sample that
  // validated pool to fill the eighteen-word mission without inventing content.
  while (words.length < DEFENSE_WORD_COUNT) {
    words.push(
      ...pickGameWords(targets, DEFENSE_WORD_COUNT - words.length, { pool: content.words }),
    );
  }
  let state = createDefense(words);
  const offsets = words.map((_, i) => words.slice(0, i).join('').length);
  const passage = words.join('');
  const strokes: KeystrokeEvent[] = [];
  const files = [
    'street',
    'boxerIdle',
    'boxerAttack',
    'guardianIdle',
    'guardianAttack',
    'scout',
    'runner',
    'guard',
    'boss',
  ];
  const images: Record<string, HTMLImageElement> = {};
  let loaded = 0,
    disposed = false,
    finished = false,
    raf = 0;
  let last = performance.now(),
    lastStatus = 0,
    animation = 0,
    reactionAge = 2;
  let reaction: DefenseEvent = null;
  let effectX = 600,
    effectY = 260;
  const audio = new Audio('/dojo-quest/hit.wav');
  audio.preload = 'none';
  audio.volume = 0.2;
  let sound = false;

  function transition(result: { state: DefenseState; event: DefenseEvent }) {
    const target = defenseTarget(state);
    if (target && result.event) {
      effectX = 300 + 590 * Math.min(1, target.remaining / target.travelSeconds);
      effectY = state.wave > DEFENSE_WAVES ? 290 : 205 + (target.id % 3) * 96;
    }
    state = result.state;
    if (result.event) {
      reaction = result.event;
      reactionAge = 0;
      if (sound && reaction !== 'typo') {
        audio.currentTime = 0;
        void audio.play().catch(() => {});
      }
    }
    if (!finished && (state.phase === 'won' || state.phase === 'lost')) {
      finished = true;
      onEnd({
        won: state.phase === 'won',
        cleared: state.cleared,
        hearts: Math.ceil((state.health * 3) / 100),
        passage,
        keystrokes: [...strokes],
        durationMs: state.elapsed * 1000,
      });
    }
  }

  function keydown(event: KeyboardEvent) {
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.isComposing ||
      document.hidden ||
      document.activeElement !== canvas
    )
      return;
    if (event.key === 'Enter' && loaded === files.length) {
      event.preventDefault();
      state = startDefenseWave(state);
      return;
    }
    const target = defenseTarget(state);
    if (!target || state.phase !== 'playing' || event.key.length !== 1 || event.repeat) return;
    event.preventDefault();
    if (event.key === ' ') return;
    const expected = words[target.wordIndices[0]][target.typed];
    strokes.push({
      position: offsets[target.wordIndices[0]] + target.typed,
      expected,
      actual: event.key,
      correct: expected === event.key,
      timestamp_ms: state.elapsed * 1000,
    });
    transition(typeDefenseKey(state, event.key));
  }

  function text(
    value: string,
    x: number,
    y: number,
    size = 18,
    color = '#fff',
    align: CanvasTextAlign = 'left',
  ) {
    ctx.font = `700 ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  }
  function sprite(name: string, x: number, y: number, size: number, attacking = false) {
    const image = images[name];
    const frames = image.width / 192;
    const index = reduced
      ? 0
      : attacking
        ? Math.min(frames - 1, Math.floor(reactionAge * 30))
        : Math.floor(animation * 15) % frames;
    ctx.drawImage(image, index * 192, 0, 192, 192, x - size / 2, y - size, size, size);
  }
  function panel(x: number, y: number, width: number, height: number, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 10);
    ctx.fill();
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, 1024, 576);
    ctx.drawImage(images.street, 0, 64, 1024, 512);
    // A quiet solid HUD keeps the kit's busy street readable.
    ctx.fillStyle = '#193c43';
    ctx.fillRect(0, 0, 1024, 72);
    text('Dojo gate', 24, 14, 17);
    panel(24, 42, 210, 12, '#486068');
    panel(24, 42, Math.max(1, state.health * 2.1), 12, '#8bd8bd');
    text(`${state.health}/100`, 252, 39, 15);
    text(
      state.wave > DEFENSE_WAVES ? 'Boss arrives' : `Wave ${state.wave} of ${DEFENSE_WAVES}`,
      512,
      18,
      24,
      '#fff',
      'center',
    );
    text(`Shield ${state.shields}/2`, 1000, 16, 18, '#ffdc8a', 'right');
    text(`${state.streak} clean words`, 1000, 43, 15, '#d1e4e5', 'right');

    // The street barrier is at x=300. Defenders stay safely behind it.
    const attack = reactionAge < 0.65 && (reaction === 'strike' || reaction === 'team');
    sprite(attack ? 'boxerAttack' : 'boxerIdle', 200, 310, 146, attack);
    sprite(
      reactionAge < 0.65 && reaction === 'team' ? 'guardianAttack' : 'guardianIdle',
      192,
      440,
      145,
      reaction === 'team',
    );
    panel(114, 333, 150, 26, '#193c43');
    text('Mochi · striker', 189, 339, 14, '#fff', 'center');
    panel(106, 461, 168, 26, '#193c43');
    text('Miso · guardian', 190, 467, 14, '#fff', 'center');
    if (state.shields) {
      ctx.strokeStyle = '#8bd8bd';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(303, 160);
      ctx.lineTo(303, 435);
      ctx.stroke();
    }
    const placed = state.enemies.map((enemy) => ({
      enemy,
      x: 300 + 590 * Math.min(1, enemy.remaining / enemy.travelSeconds),
      y: state.wave > DEFENSE_WAVES ? 320 : 205 + (enemy.id % 3) * 96,
    }));
    for (const { enemy, x, y } of placed.slice().reverse()) {
      sprite(enemy.kind, x, y + 25, enemy.kind === 'boss' ? 180 : 112);
    }
    // Labels get their own pass: lanes are closer than sprite height, so a
    // later sprite would otherwise cover the word above the enemy behind it.
    for (const { enemy, x, y } of placed.slice().reverse()) {
      const active = enemy === defenseTarget(state);
      const word = words[enemy.wordIndices[0]];
      const top = enemy.kind === 'boss' ? y - 205 : y - 112;
      ctx.font = `700 23px ${font}`;
      const width = Math.max(96, ctx.measureText(word).width + 32);
      if (active) panel(x - width / 2 - 3, top - 3, width + 6, 42, '#1f5f66');
      panel(x - width / 2, top, width, 36, active ? '#fff' : '#e4ecee');
      text(word, x, top + 5, 23, active ? '#193c43' : '#4f6468', 'center');
      if (active) {
        const start = x - ctx.measureText(word).width / 2;
        text(word.slice(0, enemy.typed), start, top + 5, 23, '#1f7660');
        ctx.font = `700 23px ${font}`;
        ctx.fillStyle = '#1f5f66';
        ctx.fillRect(start + ctx.measureText(word.slice(0, enemy.typed)).width, top + 30, 12, 3);
      }
      if (enemy.kind === 'boss') {
        panel(x - 80, top + 44, 160, 26, '#193c43');
        const left = enemy.wordIndices.length;
        text(
          `${left} ${left === 1 ? 'word' : 'words'} to clear`,
          x,
          top + 49,
          15,
          '#fff',
          'center',
        );
      }
    }
    if (attack) {
      const progress = Math.min(1, reactionAge / 0.3);
      const x = reduced ? effectX : 260 + (effectX - 260) * progress;
      ctx.strokeStyle = reaction === 'team' ? '#ffdc8a' : '#fff';
      ctx.lineWidth = reaction === 'team' ? 9 : 5;
      ctx.beginPath();
      ctx.arc(x, effectY - 25, 20, -1, 1);
      ctx.stroke();
    }
    panel(338, 502, 650, 54, '#193c43');
    const target = defenseTarget(state);
    text(
      reactionAge < 1.2 && reaction === 'team'
        ? 'Team attack! Shield earned. Enemies pushed back.'
        : reactionAge < 1.2 && reaction === 'typo'
          ? 'Keep going. Only the next correct letter advances.'
          : reactionAge < 1.2 && reaction === 'shield'
            ? 'Miso blocked the hit with a shield.'
            : reactionAge < 1.2 && reaction === 'hurt'
              ? 'The gate took a hit. Focus on the next word.'
              : target
                ? `Type ${words[target.wordIndices[0]]} to strike · ${Math.ceil(target.remaining)}s`
                : 'Three clean words earn a team attack and shield.',
      663,
      520,
      18,
      '#fff',
      'center',
    );
    if (state.phase !== 'playing') {
      panel(340, 173, 620, 170, '#193c43');
      text(
        state.phase === 'ready'
          ? 'Hold the street.'
          : state.phase === 'between'
            ? state.wave === DEFENSE_WAVES
              ? 'The boss is next.'
              : `Wave ${state.wave} complete.`
            : state.phase === 'won'
              ? 'The dojo is safe.'
              : 'Regroup. Your cats need you.',
        650,
        200,
        32,
        '#fff',
        'center',
      );
      text(
        state.phase === 'ready'
          ? 'Press Enter to start the first wave.'
          : state.phase === 'between'
            ? 'Take a breath. Press Enter when ready.'
            : 'Your round summary is below.',
        650,
        257,
        21,
        '#d1e4e5',
        'center',
      );
      text(
        `${state.cleared}/${DEFENSE_WORD_COUNT} words cleared`,
        650,
        300,
        17,
        '#ffdc8a',
        'center',
      );
    }
    if (!finished && (document.activeElement !== canvas || document.hidden)) {
      panel(340, 355, 620, 78, '#193c43');
      text('Paused · Click the battlefield to continue', 650, 382, 22, '#fff', 'center');
    }
  }

  function frame(now: number) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const paused = document.activeElement !== canvas || document.hidden;
    if (!paused) {
      animation += dt;
      reactionAge += dt;
      transition(tickDefense(state, dt));
    }
    draw();
    if (now - lastStatus > 100) {
      lastStatus = now;
      const target = defenseTarget(state);
      onStatus({
        phase: state.phase,
        wave: state.wave,
        health: state.health,
        shields: state.shields,
        streak: state.streak,
        cleared: state.cleared,
        paused,
        word: target ? words[target.wordIndices[0]] : '',
        typed: target?.typed ?? 0,
        remaining: target?.remaining ?? 0,
      });
    }
    if (!disposed) raf = requestAnimationFrame(frame);
  }
  for (const name of files) {
    const image = new Image();
    images[name] = image;
    image.onload = () => {
      if (++loaded === files.length && !disposed) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
        onReady();
      }
    };
    image.onerror = () => {
      if (!disposed) onError();
    };
    image.src = `/dojo-defense/${name}.webp`;
  }
  const focus = () => canvas.focus();
  canvas.addEventListener('keydown', keydown);
  canvas.addEventListener('pointerdown', focus);
  return {
    setSound(value: boolean) {
      sound = value;
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(raf);
      audio.pause();
      for (const image of Object.values(images)) {
        image.onload = null;
        image.onerror = null;
      }
      canvas.removeEventListener('keydown', keydown);
      canvas.removeEventListener('pointerdown', focus);
    },
  };
}
