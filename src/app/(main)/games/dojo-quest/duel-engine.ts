import {
  createDuel,
  currentDuelWord,
  RIVAL_HP,
  startDuel,
  tickDuel,
  typeDuelKey,
} from '@/domains/typing/duel';
import type { DuelEvent, DuelState } from '@/domains/typing/duel';
import type { QuestContent } from '@/domains/typing/quest';
import { pickGameWords } from '@/domains/typing/word-bank';
import type { KeystrokeEvent } from '@/domains/typing/types';
import type { QuestRound, QuestStatus } from './quest-engine';

export function createDuelGame(
  canvas: HTMLCanvasElement,
  content: QuestContent,
  onEnd: (round: QuestRound) => void,
  onStatus: (status: QuestStatus) => void,
  onReady: () => void,
  onError: () => void,
) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable.');
  const ctx = context;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = Object.fromEntries(content.focusKeys.map((key) => [key, 1]));
  let state = createDuel(pickGameWords(targets, 24, { pool: content.words }));
  const images: Record<string, HTMLImageElement> = {};
  const files = {
    floor: 'TilesetFloor.png',
    nature: 'TilesetNature.png',
    house: 'TilesetHouse.png',
    idle: 'ninja-idle.png',
    attack: 'ninja-attack.png',
    hit: 'ninja-hit.png',
    rivalIdle: 'rival-idle.png',
    rivalAttack: 'rival-attack.png',
    rivalDead: 'rival-dead.png',
    cut: 'fx-cut.png',
  };
  const audio = new Audio('/dojo-quest/hit.wav');
  audio.volume = 0.3;
  let loaded = 0,
    raf = 0,
    disposed = false,
    finished = false,
    sound = false;
  let reaction: DuelEvent = null,
    reactionAge = 1,
    animationTime = 0,
    lastStatus = 0;
  let passage = currentDuelWord(state),
    base = 0;
  const strokes: KeystrokeEvent[] = [];
  let ground: HTMLCanvasElement;

  function transition(result: { state: DuelState; event: DuelEvent }) {
    if (result.state.wordIndex !== state.wordIndex) {
      base = passage.length;
      passage += currentDuelWord(result.state);
    }
    state = result.state;
    if (result.event) {
      reaction = result.event;
      reactionAge = 0;
      if (sound && result.event !== 'block') {
        audio.currentTime = 0;
        void audio.play().catch(() => {});
      }
    }
    if (!finished && (state.phase === 'won' || state.phase === 'lost')) {
      finished = true;
      onEnd({
        won: state.phase === 'won',
        cleared: state.cleared,
        hearts: Math.ceil((state.playerHp / 100) * 3),
        passage,
        keystrokes: [...strokes],
        durationMs: state.elapsed * 1000,
      });
    }
  }
  function keydown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    if (event.key === 'Enter' && state.phase === 'ready' && loaded === Object.keys(files).length) {
      event.preventDefault();
      state = startDuel(state);
      return;
    }
    if (state.phase !== 'playing' || event.key.length !== 1) return;
    event.preventDefault();
    if (event.key === ' ') return;
    const expected = currentDuelWord(state)[state.typed];
    strokes.push({
      position: base + state.typed,
      expected,
      actual: event.key,
      correct: expected === event.key,
      timestamp_ms: state.elapsed * 1000,
    });
    transition(typeDuelKey(state, event.key));
  }
  function buildGround() {
    ground = document.createElement('canvas');
    ground.width = 384;
    ground.height = 216;
    const g = ground.getContext('2d')!;
    g.fillStyle = '#d7e1da';
    g.fillRect(0, 0, 384, 216);
    for (let y = 76; y < 216; y += 16)
      for (let x = 0; x < 384; x += 16) g.drawImage(images.floor, 32, 192, 16, 16, x, y, 16, 16);
    for (let x = -16; x < 384; x += 48) g.drawImage(images.nature, 64, 32, 64, 48, x, 36, 64, 48);
    g.drawImage(images.house, 0, 80, 48, 32, 168, 58, 48, 32);
    g.fillStyle = '#73583c';
    g.fillRect(24, 130, 336, 34);
    g.fillStyle = '#b99160';
    g.fillRect(24, 126, 336, 32);
    g.strokeStyle = '#967348';
    g.lineWidth = 1;
    for (let y = 132; y < 158; y += 8) {
      g.beginPath();
      g.moveTo(24, y);
      g.lineTo(360, y);
      g.stroke();
    }
  }
  function text(
    value: string,
    x: number,
    y: number,
    size = 8,
    color = '#fff',
    align: CanvasTextAlign = 'left',
  ) {
    ctx.font = `700 ${size}px ui-monospace, monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.fillStyle = color;
    ctx.fillText(value, Math.round(x), Math.round(y));
  }
  function sprite(
    key: string,
    col: number,
    row: number,
    size: number,
    x: number,
    y: number,
    scale: number,
  ) {
    ctx.drawImage(
      images[key],
      col * size,
      row * size,
      size,
      size,
      Math.round(x - (size * scale) / 2),
      Math.round(y - size * scale),
      size * scale,
      size * scale,
    );
  }
  function gem(x: number, y: number, filled: boolean, large = false) {
    const size = large ? 8 : 4;
    ctx.fillStyle = filled ? '#edc763' : '#4f6464';
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y);
    ctx.closePath();
    ctx.fill();
    if (filled) {
      ctx.fillStyle = '#fff0b1';
      ctx.fillRect(x - 1, y - size + 2, 2, 3);
    }
  }
  function draw() {
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ground, 0, 0);
    const attacking = reactionAge < 0.5 && (reaction === 'strike' || reaction === 'special');
    const hurt = reactionAge < 0.5 && reaction === 'hurt';
    const pulse = reduced ? 0 : Math.sin(Math.min(1, reactionAge / 0.5) * Math.PI);
    const playerX = 96 + (attacking ? pulse * 100 : hurt ? -pulse * 8 : 0);
    const rivalX = 280 + (attacking ? pulse * 8 : hurt ? -pulse * 90 : 0);
    ctx.fillStyle = 'rgba(37,49,39,.25)';
    for (const x of [playerX, rivalX]) {
      ctx.beginPath();
      ctx.ellipse(x, 148, 17, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const playerSheet = attacking ? 'attack' : hurt ? 'hit' : 'idle';
    const playerFrame = reduced
      ? 0
      : attacking
        ? Math.min(3, Math.floor(reactionAge / 0.08))
        : hurt
          ? Math.floor(reactionAge / 0.12) % 2
          : Math.floor(animationTime / 0.25) % 4;
    sprite(playerSheet, 3, playerFrame, 32, playerX, 166, 3);
    if (attacking && reactionAge < 0.3) ctx.globalAlpha = 0.6;
    if (state.phase === 'won') sprite('rivalDead', 0, 0, 16, rivalX, 151, 3);
    else
      sprite(
        hurt || (state.phase === 'playing' && state.remaining <= 3) ? 'rivalAttack' : 'rivalIdle',
        2,
        0,
        16,
        rivalX,
        150,
        3,
      );
    ctx.globalAlpha = 1;
    if ((attacking || hurt) && reactionAge < 0.4) {
      sprite('cut', Math.min(3, Math.floor(reactionAge / 0.08)), 0, 32, hurt ? 96 : 280, 151, 2);
    }
    if (reaction === 'special' && reactionAge < 0.5) {
      gem(reduced ? 250 : 128 + Math.min(1, reactionAge / 0.35) * 130, 113, true, true);
      text('FOCUS STRIKE', 192, 83, 10, '#173f43', 'center');
    }
    if (!reduced && reaction === 'strike' && state.combo > 0 && reactionAge < 0.6) {
      const progress = Math.min(1, reactionAge / 0.6);
      gem(
        280 + (21 + (state.gems - 1) * 13 - 280) * progress,
        113 - 56 * progress - Math.sin(progress * Math.PI) * 30,
        true,
      );
    }
    ctx.fillStyle = '#182e30';
    ctx.fillRect(0, 0, 384, 45);
    text('You', 14, 7);
    text('Crimson', 370, 7, 8, '#fff', 'right');
    text('Sparring', 192, 8, 7, '#e6d19b', 'center');
    ctx.fillStyle = '#466061';
    ctx.fillRect(14, 23, 145, 8);
    ctx.fillRect(225, 23, 145, 8);
    ctx.fillStyle = '#82c7b4';
    ctx.fillRect(14, 23, (145 * state.playerHp) / 100, 8);
    ctx.fillStyle = '#d98a76';
    ctx.fillRect(370 - (145 * state.rivalHp) / RIVAL_HP, 23, (145 * state.rivalHp) / RIVAL_HP, 8);
    text(`${state.playerHp}/100`, 14, 34, 6, '#e8f1ee');
    text(`${state.rivalHp}/${RIVAL_HP}`, 370, 34, 6, '#e8f1ee', 'right');
    ctx.fillStyle = '#d7e1da';
    ctx.fillRect(0, 45, 384, 22);
    for (let i = 0; i < 3; i++) gem(21 + i * 13, 57, i < state.gems);
    text(state.gems === 3 ? 'Special ready' : 'Focus gems', 64, 53, 7, '#173f43');
    text(`${state.combo}-word combo`, 370, 53, 7, '#173f43', 'right');
    if (state.phase === 'playing') {
      if (reaction === 'block' && reactionAge < 0.7)
        text('Guarded. Keep typing.', 192, 73, 7, '#173f43', 'center');
      else if (state.remaining <= 3)
        text('Crimson is winding up!', 192, 73, 7, '#843c30', 'center');
      const word = currentDuelWord(state);
      ctx.fillStyle = '#fff8e4';
      ctx.fillRect(64, 171, 256, 30);
      text(word, 192, 177, 13, '#173f43', 'center');
      ctx.font = '700 13px ui-monospace, monospace';
      const start = 192 - ctx.measureText(word).width / 2;
      text(word.slice(0, state.typed), start, 177, 13, '#31745b');
      const offset = ctx.measureText(word.slice(0, state.typed)).width;
      ctx.fillStyle = '#173f43';
      ctx.fillRect(start + offset, 193, 7, 1);
      text(`Next attack in ${Math.ceil(state.remaining)}s`, 192, 205, 6, '#173f43', 'center');
    }
    if (state.phase === 'ready' || finished) {
      ctx.fillStyle = 'rgba(16,28,30,.9)';
      ctx.fillRect(38, 169, 308, 40);
      text(
        state.phase === 'ready'
          ? 'Press Enter to spar'
          : state.phase === 'won'
            ? 'Sparring complete. Well played!'
            : 'Rest, then try again.',
        192,
        176,
        9,
        '#fff0b1',
        'center',
      );
      text(
        state.phase === 'ready'
          ? 'Type words. Build combos. Charge your gems.'
          : 'Your round summary is below.',
        192,
        192,
        6,
        '#e8f1ee',
        'center',
      );
    }
    if (document.activeElement !== canvas || document.hidden) {
      ctx.fillStyle = 'rgba(16,28,30,.8)';
      ctx.fillRect(0, 65, 384, 100);
      text('Click the arena to play', 192, 106, 10, '#fff', 'center');
    }
  }
  let last = performance.now();
  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (document.activeElement === canvas && !document.hidden) {
      animationTime += dt;
      reactionAge += dt;
      transition(tickDuel(state, dt));
    }
    draw();
    if (now - lastStatus > 100) {
      lastStatus = now;
      onStatus({
        phase:
          state.phase === 'playing'
            ? 'play'
            : state.phase === 'ready'
              ? 'intro'
              : state.phase === 'won'
                ? 'clear'
                : 'over',
        hearts: Math.ceil((state.playerHp / 100) * 3),
        cleared: state.cleared,
        words: state.phase === 'playing' ? [currentDuelWord(state)] : [],
        target: state.phase === 'playing' ? currentDuelWord(state).slice(state.typed) : '',
        scroll: '',
        paused: document.activeElement !== canvas || document.hidden,
        duel: {
          playerHp: state.playerHp,
          rivalHp: state.rivalHp,
          combo: state.combo,
          gems: state.gems,
          remaining: state.remaining,
        },
      });
    }
    if (!disposed) raf = requestAnimationFrame(frame);
  }
  for (const [key, filename] of Object.entries(files)) {
    const image = new Image();
    images[key] = image;
    image.onload = () => {
      if (++loaded === Object.keys(files).length && !disposed) {
        buildGround();
        last = performance.now();
        raf = requestAnimationFrame(frame);
        onReady();
      }
    };
    image.onerror = () => {
      if (!disposed) onError();
    };
    image.src = `/dojo-quest/${filename}`;
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
      canvas.removeEventListener('keydown', keydown);
      canvas.removeEventListener('pointerdown', focus);
    },
  };
}
