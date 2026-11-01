// Builds the game's sprite sheets. Does not modify originals or send assets to AI services.
// Only these processed sheets ship; the kit's source files stay outside the repository.
import sharp from 'sharp';
import { mkdir, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const source = process.argv[2];
if (!source || !path.isAbsolute(source)) {
  throw new Error('Pass the absolute path to the extracted CraftPix kit.');
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'public/dojo-defense');
// Refuse to overwrite an existing import.
try {
  await access(output);
  throw new Error('Defense assets already exist. Move them aside before re-importing.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await mkdir(output);
const animations = {
  boxerIdle: 'CatBoxing/Idle',
  boxerAttack: 'CatBoxing/Attack',
  guardianIdle: 'Cat Guardian/Idle',
  guardianAttack: 'Cat Guardian/Attack',
  scout: 'Enemies/Enemy Reg 1/Walk',
  runner: 'Enemies/Enemy Reg 3/Walk',
  guard: 'Enemies/Enemy Reg 5/Walk',
  boss: 'Enemies/Enemy Boss 1/Walk',
};
for (const [name, directory] of Object.entries(animations)) {
  const folder = path.join(source, 'Png', directory);
  const files = (await readdir(folder)).filter((name) => name.endsWith('.png')).sort();
  if (!files.length) throw new Error(`No frames found for ${name}.`);
  const frames = await Promise.all(
    files.map((file) =>
      sharp(path.join(folder, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    ),
  );
  const { width, height } = frames[0].info;
  let left = width,
    top = height,
    right = 0,
    bottom = 0;
  // Shared bounds preserve each animation's anchor instead of trimming every pose differently.
  for (const { data, info } of frames) {
    if (info.width !== width || info.height !== height) throw new Error('Frame sizes differ.');
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 8) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
    }
  }
  const size = 192;
  const sprites = await Promise.all(
    files.map(async (file, index) => ({
      input: await sharp(path.join(folder, file))
        .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
        .resize(size, size, { fit: 'contain', background: '#00000000' })
        .png()
        .toBuffer(),
      left: index * size,
      top: 0,
    })),
  );
  await sharp({
    create: { width: size * files.length, height: size, channels: 4, background: '#00000000' },
  })
    .composite(sprites)
    .webp({ quality: 85 })
    .toFile(path.join(output, `${name}.webp`));
  console.log(`${name}: ${files.length} frames`);
}
await sharp(path.join(source, 'Png/Area/Area1.png'))
  .resize(1280)
  .webp({ quality: 88 })
  .toFile(path.join(output, 'street.webp'));
console.log('Defense sprite sheets prepared in public/dojo-defense.');
