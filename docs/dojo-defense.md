# Dojo Defense

A typing defense game at `/games/dojo-defense`, open to signed-in students.

## Play

- Five waves of three enemies, followed by a boss needing three typed words.
- Type the highlighted word. Typos break the clean-word streak, not gate health.
- Three clean words earn a shield (up to two) and knock remaining enemies back.
- Enemies that reach the gate consume a shield or deal damage.
- A boss timeout deals damage but cannot skip the boss's required words.
- Press Enter to begin each wave. Blur or hide the page to pause.
- Music and effects are separately opt-in. Motion reduction disables sprite animation.

The authenticated preparation action uses the student's actually earned belt and
server-side weak keys through the existing validated Quest generator/fallback.
Only common-word practice receives mastery credit. Progress saves through
`submitPracticeSession` with exercise ID `game-dojo-defense`.

## Artwork

Art comes from the CraftPix
[Free Cartoon Cat Defense Game Asset Kit](https://craftpix.net/freebies/free-cartoon-cat-defense-game-asset-kit/)
([license](https://craftpix.net/file-licenses/)). CraftPix confirmed in November 2026
that ICT Dojo's educational use is covered. Keep that confirmation on file outside
this repository.

Only processed WebP sprite sheets in `public/dojo-defense/` ship. The original kit,
including its AI, EPS, Spine, and PNG source files, stays outside the repository.
To rebuild the sheets from an extracted kit (move the existing folder aside first;
the script refuses to overwrite it):

```sh
node scripts/prepare-defense-assets.mjs "/absolute/path/to/extracted-craftpix-kit"
```

License limits that still apply:

- Do not offer the art as a download, export, or standalone pack.
- Do not use the art, or anything derived from it, to train, develop, test,
  validate, or improve AI or machine-learning systems. The game sends only
  vocabulary and letter targets to the word generator, never artwork.

Music and the hit effect reuse the CC0 Ninja Adventure assets; see
`public/dojo-quest/ASSET-CREDITS.md`.
