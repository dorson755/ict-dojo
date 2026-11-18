# Pokémon Typing Trails

`/games/pokemon-trails` is a single-player Meadow Trail with three starters,
a Pidgeotto guardian after three wins, and all 151 Kanto species across 82
collection lines. Defeating the guardian makes the other starters available as
meadow encounters. Wild families unlock cumulatively with typing belts:
White starts with Caterpie, Weedle, Pidgey, Rattata, and Spearow; Black makes the
five legendary/mythical species available. Every species is reachable by catching
and training. Eevee, Vaporeon, Jolteon, and Flareon are separate catches rather
than an artificial linear evolution chain. The field guide supports name search
(including evolved forms) and an owned-only filter. More habitats,
multiplayer, trading, type effectiveness, and equipment are not implemented.

## Learning and gameplay

- Authenticated, onboarded students only. Words use the learner's current belt
  and weak keys through the existing words-only, validated 24-hour AI cache.
  No per-turn AI calls, generated dialogue, or additional model dependencies.
- Two words (including their separating space) power an attack. Typos do not
  advance the cursor. Clean turns earn extra damage and three consecutive clean
  turns power a focus move. Two one-word guards per encounter recover health
  and reduce incoming damage. The tutorial opponent deals no damage.
- New encounters use `rulesVersion: 2`: mistakes queue one counterattack at the
  end of the typing turn, never mid-word. Each mistake adds 6 HP of response
  (9 for guardians), capped at three mistakes: 18/27 HP. Clean turns avoid the
  response. Guard recovers up to 10 HP before taking a quarter of the queued
  damage, rounded up. Defeated opponents and capture prompts cannot counterattack.
  Encounters without a rules version retain the original 12/18 HP response,
  preserving client/server replay compatibility for already-active encounters.
- No countdown or speed-based damage. The input pauses its practice clock on
  blur; hidden pages blur the input. WPM measures focused typing time.
- A wild win leads to a three-word capture packet requiring 90% accuracy, with
  one retry. Failed captures and guardian losses still count as valid practice.
- Each valid completed encounter trains the active partner once. Evolution is
  at four and nine training encounters for three-stage lines (displayed levels
  5 and 10), and six for two-stage lines (level 7). Single-form partners do not
  evolve. Existing three-stage collection progress is unchanged. Training
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
clearance. Downloaded assets comprise 755 sprites/icons (about 9.2 MB total),
with source URLs and hashes in the manifest. No hotlinking, external game scripts,
game music, or fonts. Meadow SVG is original.

Native `picture` selects static sprites for reduced-motion preferences. Visible
typing labels, native buttons, focus outlines, text HP values, status messages,
and a responsive stacked layout support keyboard and small-screen use.

Battle feedback includes attack lunges, four reusable elemental projectiles
(leaf, ember, bubble, spark), recoil, delayed counterattacks, guard shields, smooth
HP bars, and a capture throw/shake/reveal. Effects never delay typing, move its
prompt, or determine damage. Rapid turns replace the previous visual effect
instead of queuing animations. Reduced-motion mode disables movement and HP
transitions, hides projectiles, and keeps text feedback available.

Sound is muted by default, with an effects-volume control and browser-local
preferences (`ict-dojo:trail-sound`). Web Audio starts only from a user gesture,
even when an enabled preference is restored. Original synthesized word, warning,
elemental attack, guard, counterattack, and capture sounds use no external audio
files or copyrighted music/cries. Repeated typo sounds are throttled and synthesis
is capped at 12 simultaneous/scheduled voices. Muting, focus loss, hidden tabs,
leaving, and unmounting cancel pending sounds; completion can finish its short
celebration. Unsupported audio or blocked local storage does not block play.
Background music and extended evolution sequences remain out of scope.

## Validation

Run `npx jest --runInBand`, `npx tsc --noEmit`, changed-file ESLint, and
`npm run build`. Tests cover battle/capture/guard rules, replay rejection, partner
ownership, student authorization, encounter reuse, idempotent receipts, lost
responses, and atomic transaction conflicts.
