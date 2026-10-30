import type { KeystrokeEvent } from '@/domains/typing/types';
import { stageTitle } from '@/domains/typing/quest';
import type { QuestContent, QuestStage } from '@/domains/typing/quest';
import { pickGameWords } from '@/domains/typing/word-bank';

interface Actor {
  x: number;
  y: number;
}
interface Enemy extends Actor {
  word: string;
  typed: number;
  base: number;
  kind: string;
}
interface Effect extends Actor {
  age: number;
}
export interface QuestRound {
  won: boolean;
  cleared: number;
  hearts: number;
  passage: string;
  keystrokes: KeystrokeEvent[];
  durationMs: number;
}
export interface QuestStatus {
  phase: string;
  hearts: number;
  cleared: number;
  words: string[];
  target: string;
  scroll: string;
}

/** Imperative canvas loop. React owns the controls, loading, and persistence. */
export function createQuestGame(
  canvas: HTMLCanvasElement,
  stage: QuestStage,
  content: QuestContent,
  onEnd: (round: QuestRound) => void,
  onStatus: (status: QuestStatus) => void,
  onReady: () => void,
  onError: () => void,
) {
  if (!content.words.length) throw new Error('No words available for this stage.');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable.');
  const ctx = context;
  const W = 384,
    H = 216;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const prefix = stage.setting === 'courtyard' ? 'boss' : stage.setting;
  const files: Record<string, string> = {
    floor: 'TilesetFloor.png',
    nature: 'TilesetNature.png',
    house: 'TilesetHouse.png',
    idle: 'ninja-idle.png',
    attack: 'ninja-attack.png',
    hit: 'ninja-hit.png',
    slime: 'm-Slime.png',
    racoon: 'm-Racoon.png',
    bamboo: 'm-Bamboo.png',
    lantern: 'm-LanternRed.png',
    boss: `${prefix}-idle.png`,
    bossHit: `${prefix}-hit.png`,
    bossAttack: `${prefix}-attack.png`,
    bossFace: stage.setting === 'courtyard' ? 'f-boss.png' : `${prefix}-face.png`,
    master: 'f-master.png',
    dialog: 'dialog.png',
    heart: 'heart.png',
    cut: 'fx-cut.png',
    smoke: 'fx-smoke.png',
  };
  const images: Record<string, HTMLImageElement> = {};
  const audio = new Audio('/dojo-quest/hit.wav');
  audio.volume = 0.3;
  let sound = false,
    disposed = false,
    raf = 0,
    ready = 0;
  let phase = 'intro',
    hearts = 3,
    cleared = 0,
    spawned = 0;
  let time = 0,
    activeMs = 0,
    spawnTimer = 0.5,
    lastStatus = 0;
  let passage = '',
    bossBase = 0,
    bossTyped = 0,
    bossY = 72;
  let ninjaAnim = 'idle',
    animAge = 0,
    dir = 0,
    bossAnim = 'boss',
    bossAge = 0;
  const ninja = { x: W / 2, y: 128 };
  const enemies: Enemy[] = [],
    effects: Effect[] = [],
    strokes: KeystrokeEvent[] = [];
  const wordQueue: string[] = [];
  const targets = Object.fromEntries(content.focusKeys.map((key) => [key, 1]));
  while (wordQueue.length < stage.waveSize) {
    wordQueue.push(
      ...pickGameWords(targets, stage.waveSize - wordQueue.length, { pool: content.words }),
    );
  }
  let locked: Enemy | null = null;
  let ground: HTMLCanvasElement;
  const distance = (actor: Actor) => Math.hypot(actor.x - ninja.x, actor.y - ninja.y);
  const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
  const hit = () => {
    if (sound) {
      audio.currentTime = 0;
      void audio.play().catch(() => {});
    }
  };
  function finish(won: boolean) {
    if (phase === 'clear' || phase === 'over') return;
    phase = won ? 'clear' : 'over';
    onEnd({ won, cleared, hearts, passage, keystrokes: [...strokes], durationMs: activeMs });
  }
  function count(key: string, expected: string, position: number) {
    strokes.push({
      actual: key,
      expected,
      position,
      correct: key === expected,
      timestamp_ms: activeMs,
    });
  }
  function keydown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    const key = event.key;
    if (key === 'Enter' && (phase === 'intro' || phase === 'bossIntro')) {
      event.preventDefault();
      phase = phase === 'intro' ? 'play' : 'boss';
      return;
    }
    if (key.length !== 1 || (phase !== 'play' && phase !== 'boss')) return;
    event.preventDefault();
    if (phase === 'boss') {
      const expected = content.bossLine[bossTyped];
      count(key, expected, bossBase + bossTyped);
      bossAnim = key === expected ? 'bossHit' : 'bossAttack';
      bossAge = 0;
      if (key === expected) {
        bossTyped++;
        if (key === ' ' || bossTyped === content.bossLine.length) {
          bossY = Math.max(72, bossY - 2);
          ninjaAnim = 'attack';
          animAge = 0;
          dir = 1;
          effects.push({ x: W / 2, y: bossY, age: 0 });
          hit();
        }
        if (bossTyped === content.bossLine.length) finish(true);
      }
      return;
    }
    if (key === ' ' || !enemies.length) return;
    if (!locked) {
      locked =
        enemies
          .filter((enemy) => enemy.word[0] === key)
          .sort((a, b) => distance(a) - distance(b))[0] ?? null;
      if (!locked) {
        const nearest = [...enemies].sort((a, b) => distance(a) - distance(b))[0];
        count(key, nearest.word[0], nearest.base);
        return;
      }
    }
    const expected = locked.word[locked.typed];
    count(key, expected, locked.base + locked.typed);
    if (key !== expected) return;
    locked.typed++;
    const dx = locked.x - ninja.x,
      dy = locked.y - ninja.y;
    dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : dy < 0 ? 1 : 0;
    if (locked.typed === locked.word.length) {
      effects.push({ x: locked.x, y: locked.y, age: 0 });
      enemies.splice(enemies.indexOf(locked), 1);
      locked = null;
      cleared++;
      ninjaAnim = 'attack';
      animAge = 0;
      hit();
    }
  }
  function spawn() {
    const side = Math.floor(Math.random() * 3);
    const used = new Set(enemies.map((enemy) => enemy.word[0]));
    const index = wordQueue.findIndex((word) => !used.has(word[0]));
    const word = wordQueue.splice(index === -1 ? 0 : index, 1)[0];
    const base = passage.length;
    passage += word;
    enemies.push({
      x: side === 0 ? 20 : side === 1 ? W - 20 : 50 + Math.random() * (W - 100),
      y: side === 2 ? 48 : 56 + Math.random() * 48,
      kind:
        stage.setting === 'village'
          ? pick(['lantern', 'racoon'])
          : pick(['slime', 'racoon', 'bamboo']),
      word,
      base,
      typed: 0,
    });
    spawned++;
  }
  function update(dt: number) {
    time += dt;
    animAge += dt;
    bossAge += dt;
    if (animAge > 0.32) ninjaAnim = 'idle';
    if (bossAge > 0.45) bossAnim = 'boss';
    for (const effect of effects) effect.age += dt;
    while (effects[0]?.age > 0.5) effects.shift();
    if (phase === 'play' || phase === 'boss') activeMs += dt * 1000;
    if (phase === 'play') {
      spawnTimer -= dt;
      if (spawnTimer <= 0 && spawned < stage.waveSize && enemies.length < 4) {
        spawn();
        spawnTimer = Math.max(1.8, 3.5 - cleared * 0.08);
      }
      for (const enemy of [...enemies]) {
        const d = distance(enemy);
        if (d < 14) {
          enemies.splice(enemies.indexOf(enemy), 1);
          if (locked === enemy) locked = null;
          hearts--;
          ninjaAnim = 'hit';
          animAge = 0;
          hit();
          if (hearts <= 0) {
            finish(false);
            return;
          }
        } else {
          const speed = 12 * stage.speed * (reduced ? 0.7 : 1) * (locked === enemy ? 0.5 : 1);
          enemy.x += ((ninja.x - enemy.x) / d) * speed * dt;
          enemy.y += ((ninja.y - enemy.y) / d) * speed * dt;
        }
      }
      if (spawned >= stage.waveSize && !enemies.length) {
        phase = 'bossIntro';
        bossBase = passage.length;
        passage += content.bossLine;
      }
    }
    if (phase === 'boss') {
      bossY += (reduced ? 0.3 : 0.45) * dt;
      if (bossY > ninja.y - 28) {
        hearts = 0;
        finish(false);
      }
    }
  }
  function buildGround() {
    ground = document.createElement('canvas');
    ground.width = W;
    ground.height = H;
    const g = ground.getContext('2d')!;
    const tile = (tx: number, ty: number, x: number, y: number, w = 1, h = 1, sheet = 'floor') =>
      g.drawImage(images[sheet], tx * 16, ty * 16, w * 16, h * 16, x, y, w * 16, h * 16);
    let seed = 7;
    const random = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let y = 0; y < H; y += 16)
      for (let x = 0; x < W; x += 16) {
        const value = random();
        tile(value < 0.82 ? 2 : value < 0.92 ? 3 : 1, 12, x, y);
      }
    for (let y = 104; y < 168; y += 16) for (let x = 144; x < 240; x += 16) tile(1, 8, x, y);
    for (let x = -16; x < W; x += 48) tile(4, 2, x, -30, 4, 3, 'nature');
    for (let y = 30; y < H - 20; y += 44) {
      tile(0, 2, -36, y, 3, 3, 'nature');
      tile(0, 2, W - 12, y, 3, 3, 'nature');
    }
    [
      [60, 150],
      [300, 150],
      [96, 186],
      [276, 188],
      [40, 110],
      [330, 100],
    ].forEach(([x, y], i) => tile(i % 2, 10, x, y, 1, 1, 'nature'));
    if (stage.setting === 'forest') {
      for (const x of [28, 48, 330, 350])
        for (let y = 36; y < 190; y += 24) {
          g.fillStyle = '#294e3c';
          g.fillRect(x, y, 4, 24);
          g.fillStyle = '#80a460';
          g.fillRect(x, y + 8, 6, 2);
          g.fillStyle = '#427c44';
          g.fillRect(x - 5, y + 3, 15, 3);
        }
    }
    if (stage.setting === 'village' || stage.setting === 'temple') {
      g.fillStyle = stage.setting === 'temple' ? '#5f6b73' : '#554e48';
      g.fillRect(32, 32, W - 64, H - 32);
      for (let y = 32; y < H; y += 16)
        for (let x = 32; x < W - 32; x += 16) {
          g.fillStyle = stage.setting === 'temple' ? '#7b8590' : '#706965';
          g.fillRect(x, y, 15, 15);
          g.fillStyle = stage.setting === 'temple' ? '#929da6' : '#84796e';
          g.fillRect(x + 1, y + 1, 13, 1);
        }
      for (const x of [44, 324]) {
        g.fillStyle = '#44382e';
        g.fillRect(x, 48, 3, 106);
        for (const y of [52, 100]) {
          g.fillStyle = stage.setting === 'temple' ? '#c8ab59' : '#af423d';
          g.fillRect(x - 6, y, 16, 20);
          g.fillStyle = '#f7d98c';
          g.fillRect(x - 3, y + 3, 10, 13);
        }
      }
      tile(0, 5, W / 2 - 24, 18, 3, 2, 'house');
      if (stage.setting === 'village') {
        tile(0, 0, 36, -12, 4, 4, 'house');
        tile(0, 0, W - 100, -12, 4, 4, 'house');
      }
    }
  }
  function text(
    value: string,
    x: number,
    y: number,
    color = '#ffffff',
    size = 7,
    align: CanvasTextAlign = 'left',
  ) {
    ctx.font = `700 ${size}px ui-monospace, monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.fillStyle = color;
    ctx.fillText(value, Math.round(x), Math.round(y));
  }
  function sprite(sheet: string, col: number, row: number, size: number, x: number, y: number) {
    ctx.drawImage(
      images[sheet],
      col * size,
      row * size,
      size,
      size,
      Math.round(x - size / 2),
      Math.round(y - size + 4),
      size,
      size,
    );
  }
  function chip(word: string, typed: number, x: number, y: number, active: boolean) {
    ctx.font = '700 7px ui-monospace, monospace';
    const width = ctx.measureText(word).width + 8;
    const left = Math.max(2, Math.min(W - width - 2, x - width / 2));
    ctx.fillStyle = active ? '#1f5f66' : '#fffcf0';
    ctx.fillRect(left, y, width, 12);
    text(word.slice(0, typed), left + 4, y + 2, '#9fe3d8');
    const doneWidth = ctx.measureText(word.slice(0, typed)).width;
    text(word.slice(typed), left + 4 + doneWidth, y + 2, active ? '#fff' : '#1c2530');
  }
  function dialog(name: string, message: string, face: string) {
    ctx.drawImage(images.dialog, 42, 150);
    ctx.drawImage(images[face], 48, 163);
    text(name, 50, 151, '#fff1df');
    let line = '',
      y = 167;
    for (const word of message.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      ctx.font = '700 7px ui-monospace, monospace';
      if (ctx.measureText(next).width > 232 && line) {
        text(line, 98, y, '#3a2a20');
        y += 10;
        line = word;
      } else line = next;
    }
    text(line, 98, y, '#3a2a20');
  }
  function draw() {
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ground, 0, 0);
    const actors = enemies.map((enemy) => ({
      y: enemy.y,
      render: () => {
        const dx = ninja.x - enemy.x,
          dy = ninja.y - enemy.y;
        const facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : dy < 0 ? 1 : 0;
        sprite(enemy.kind, facing, reduced ? 0 : Math.floor(time / 0.18) % 4, 16, enemy.x, enemy.y);
      },
    }));
    actors.push({
      y: ninja.y,
      render: () =>
        sprite(
          ninjaAnim,
          dir,
          ninjaAnim === 'hit'
            ? Math.floor(animAge / 0.12) % 2
            : ninjaAnim === 'attack'
              ? Math.min(3, Math.floor(animAge / 0.08))
              : reduced
                ? 0
                : Math.floor(time / 0.25) % 4,
          32,
          ninja.x,
          ninja.y + 8,
        ),
    });
    if (phase === 'boss' || phase === 'bossIntro')
      actors.push({
        y: bossY,
        render: () => {
          const image = images[bossAnim],
            size = image.height;
          const frame = reduced
            ? 0
            : Math.floor((bossAnim === 'boss' ? time : bossAge) / 0.12) % (image.width / size);
          sprite(bossAnim, frame, 0, size, W / 2, bossY);
        },
      });
    actors.sort((a, b) => a.y - b.y).forEach((actor) => actor.render());
    for (const effect of effects) {
      sprite('cut', Math.min(3, Math.floor(effect.age / 0.07)), 0, 32, effect.x, effect.y);
      if (effect.age > 0.12)
        sprite(
          'smoke',
          Math.min(5, Math.floor((effect.age - 0.12) / 0.07)),
          0,
          32,
          effect.x,
          effect.y,
        );
    }
    for (const enemy of enemies)
      chip(enemy.word, enemy.typed, enemy.x, Math.max(20, enemy.y - 30), enemy === locked);
    ctx.fillStyle = '#182e30';
    ctx.fillRect(0, 0, W, 16);
    for (let i = 0; i < 3; i++)
      ctx.drawImage(images.heart, (i < hearts ? 4 : 0) * 16, 0, 16, 16, 3 + i * 15, 0, 16, 16);
    text(stageTitle(stage), 54, 5, '#e8f1ee', 6);
    text(`${cleared}/${stage.waveSize}`, W - 6, 5, '#e8f1ee', 7, 'right');
    if (phase === 'intro')
      dialog(
        'Sensei',
        'Type a creature word to strike. Match capitals and spaces in the boss scroll. Press Enter to begin.',
        'master',
      );
    if (phase === 'bossIntro')
      dialog(
        stage.boss,
        'The gate is clear. Type my scroll, including spaces and punctuation. Press Enter.',
        'bossFace',
      );
    if (phase === 'boss') {
      ctx.fillStyle = '#2b1d16';
      ctx.fillRect(131, 21, 122, 6);
      ctx.fillStyle = '#c44a3a';
      ctx.fillRect(132, 22, 120 * (1 - bossTyped / content.bossLine.length), 4);
      const before = content.bossLine.lastIndexOf(' ', Math.max(0, bossTyped - 1)) + 1;
      const after = content.bossLine.indexOf(' ', bossTyped);
      const end = after === -1 ? content.bossLine.length : after + 1;
      chip(content.bossLine.slice(before, end), bossTyped - before, W / 2, 172, true);
      text(content.bossLine.slice(end, end + 45), W / 2, 190, '#fff', 7, 'center');
      if (content.bossLine[bossTyped] === ' ')
        text('Space to continue', W / 2, 158, '#fff', 7, 'center');
    }
    if (phase === 'clear' || phase === 'over') {
      ctx.fillStyle = 'rgba(16,28,30,.85)';
      ctx.fillRect(0, 16, W, H - 16);
      text(phase === 'clear' ? 'STAGE CLEAR' : 'TRY AGAIN', W / 2, 74, '#ffe9a8', 16, 'center');
      text('Your round summary is below.', W / 2, 106, '#e8f1ee', 8, 'center');
      ctx.drawImage(images.master, W / 2 - 19, 128);
    } else if (document.activeElement !== canvas || document.hidden) {
      ctx.fillStyle = 'rgba(16,28,30,.75)';
      ctx.fillRect(0, 16, W, H - 16);
      text('Click the game to play', W / 2, 90, '#fff', 10, 'center');
    }
  }
  let last = performance.now();
  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (document.activeElement === canvas && !document.hidden) update(dt);
    draw();
    if (now - lastStatus > 200) {
      lastStatus = now;
      onStatus({
        phase,
        hearts,
        cleared,
        words: enemies.map((enemy) => enemy.word),
        target: locked ? locked.word.slice(locked.typed) : '',
        scroll: phase === 'boss' ? content.bossLine.slice(bossTyped) : '',
      });
    }
    if (!disposed) raf = requestAnimationFrame(frame);
  }
  for (const [key, file] of Object.entries(files)) {
    const image = new Image();
    images[key] = image;
    image.onload = () => {
      if (++ready === Object.keys(files).length && !disposed) {
        buildGround();
        last = performance.now();
        raf = requestAnimationFrame(frame);
        onReady();
      }
    };
    image.onerror = () => {
      if (!disposed) onError();
    };
    image.src = `/dojo-quest/${file}`;
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
