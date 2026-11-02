# Pokémon Typing Trails

First playable slice: `/games/pokemon-trails`. Single-player Meadow Trail,
three starters, two initial wild families, a Pidgeotto guardian after three wins,
and all five families' three-stage evolution lines (15 forms). Defeating the
guardian makes the other starters available as meadow encounters. More habitats,
multiplayer, trading, type effectiveness, and equipment are not implemented.

## Learning and gameplay

- Authenticated, onboarded students only. Words use the learner's current belt
  and weak keys through the existing words-only, validated 24-hour AI cache.
  No per-turn AI calls, generated dialogue, or additional model dependencies.
- Two words (including their separating space) power an attack. Typos do not
  advance the cursor. Clean turns earn extra damage and three consecutive clean
  turns power a focus move. Two one-word guards per encounter recover health
  and reduce incoming damage. The tutorial opponent deals no damage.
- No countdown or speed-based damage. The input pauses its practice clock on
  blur; hidden pages blur the input. WPM measures focused typing time.
- A wild win leads to a three-word capture packet requiring 90% accuracy, with
  one retry. Failed captures and guardian losses still count as valid practice.
- Each valid completed encounter trains the active partner once. Evolution is
  at four and nine training encounters (displayed levels 5 and 10). Training
  does not consume platform XP. Duplicate catches do not reset training.
- Partial encounters earn nothing. Reload resumes an unfinished encounter from
  its beginning. Abandon requires confirmation and preserves saved progress.
  Encounters expire after 30 minutes; leaving them starts a fresh encounter.

## Saves and rewards

`PK=USER#<authenticated-user>`, `SK=POKEMON#COLLECTION` stores a bounded collection,
optimistic version, daily reward count, partner, guardian status, and at most one
active encounter. The server chooses the encounter ID, opponent, words, and belt.
Client input contains only raw characters/guard commands and relative timestamps.
The server bounds the replay to 2,500 inputs, validates timing against server
elapsed time, recomputes the battle and capture outcome, then runs TypingEvaluator.
This rejects forged outcomes; it does not prove a human physically typed.

A DynamoDB transaction commits:

1. The version-checked collection and consumed encounter.
2. One session receipt at `SESSION#<encounter-created-at>#pokemon#<id>`.
3. Profile XP, platform level, and streak.
4. Typing DNA, common-word mastery, and mastery history.
5. Improved personal records and daily/weekly practice quest progress.

Receipts make retries idempotent, including a connection failure after commit.
The most recent encounter receipt is discoverable through the collection even
after its active encounter is consumed. Older or replaced encounter IDs cannot
award again. Transactions retry optimistic conflicts three times. No fallback to
non-atomic reward writes is allowed. Runtime IAM must permit the underlying
`dynamodb:PutItem`, `dynamodb:UpdateItem`, and `dynamodb:GetItem` actions without
an `EnclosingOperation` policy denying transactional use. No IAM changes are
made by this feature.

XP uses the shared GamificationService and per-game daily repeat decay. This slice
does not generate a new recommendation record, although saved mastery and weak keys
are available to the existing recommendation flow.

## Assets and accessibility

See `public/pokemon-trails/ASSET-CREDITS.md` for source URLs and the owner's reported
clearance. Downloaded assets are limited to 75 sprites/icons (about 1.2 MB total),
with source URLs and hashes in the manifest. No hotlinking, external game scripts,
game music, or fonts. Meadow SVG is original.

Native `picture` selects static sprites for reduced-motion preferences. Visible
typing labels, native buttons, focus outlines, text HP values, status messages,
and a responsive stacked layout support keyboard and small-screen use. The game
is silent in this release.

## Validation

Run `npx jest --runInBand`, `npx tsc --noEmit`, changed-file ESLint, and
`npm run build`. Tests cover battle/capture/guard rules, replay rejection, partner
ownership, student authorization, encounter reuse, idempotent receipts, lost
responses, and atomic transaction conflicts.
