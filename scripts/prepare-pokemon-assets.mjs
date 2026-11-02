// Downloads only the curated first-release roster. No external code is executed.
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../public/pokemon-trails/', import.meta.url));
const species = [
  'bulbasaur',
  'ivysaur',
  'venusaur',
  'charmander',
  'charmeleon',
  'charizard',
  'squirtle',
  'wartortle',
  'blastoise',
  'caterpie',
  'metapod',
  'butterfree',
  'pidgey',
  'pidgeotto',
  'pidgeot',
];
const variants = [
  ['front', 'https://play.pokemonshowdown.com/sprites/gen5', 'png'],
  ['back', 'https://play.pokemonshowdown.com/sprites/gen5-back', 'png'],
  ['animated', 'https://play.pokemonshowdown.com/sprites/gen5ani', 'gif'],
  ['animated-back', 'https://play.pokemonshowdown.com/sprites/gen5ani-back', 'gif'],
  [
    'icons',
    'https://raw.githubusercontent.com/msikma/pokesprite/c5aaa610ff2acdf7fd8e2dccd181bca8be9fcb3e/pokemon-gen8/regular',
    'png',
  ],
];
const manifest = [];
for (const [directory, source, extension] of variants) {
  await mkdir(path.join(root, directory), { recursive: true });
  for (const name of species) {
    const url = `${source}/${name}.${extension}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`${response.status}: ${url}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isGif = /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString());
    if (!(extension === 'png' ? isPng : isGif) || bytes.length > 1_000_000)
      throw new Error(`Unexpected image content: ${url}`);
    const file = `${directory}/${name}.${extension}`;
    await writeFile(path.join(root, file), bytes);
    manifest.push({
      file,
      source: url,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  }
}
await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(
  `Prepared ${manifest.length} Pokémon assets (${manifest.reduce((sum, image) => sum + image.bytes, 0)} bytes).`,
);
