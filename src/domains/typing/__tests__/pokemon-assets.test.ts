import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { POKEMON_LINES } from '../pokemon';

it('bundles all five verified sprite variants for every Kanto species', () => {
  const root = path.join(process.cwd(), 'public/pokemon-trails');
  const manifest: { file: string; source: string; bytes: number; sha256: string }[] = JSON.parse(
    readFileSync(path.join(root, 'manifest.json'), 'utf8'),
  );
  const expected = Object.values(POKEMON_LINES)
    .flat()
    .flatMap((species) =>
      ['front', 'back', 'animated', 'animated-back', 'icons'].map(
        (variant) => `${variant}/${species}.${variant.startsWith('animated') ? 'gif' : 'png'}`,
      ),
    );
  expect(manifest).toHaveLength(755);
  expect(new Set(manifest.map((entry) => entry.file))).toEqual(new Set(expected));
  for (const entry of manifest) {
    const bytes = readFileSync(path.join(root, entry.file));
    expect(bytes.length).toBe(entry.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
    expect(entry.source).toMatch(/^https:\/\//);
    expect(
      entry.file.endsWith('.gif')
        ? /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString())
        : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    ).toBe(true);
  }
});
