import type { KeystrokeEvent } from './types';

// All 151 Kanto species, grouped by evolution family (Pokédex order).
// Single-stage and branched families (Eevee's evolutions stand alone) have one-entry lines.
export const POKEMON_LINES = {
  bulbasaur: ['bulbasaur', 'ivysaur', 'venusaur'],
  charmander: ['charmander', 'charmeleon', 'charizard'],
  squirtle: ['squirtle', 'wartortle', 'blastoise'],
  caterpie: ['caterpie', 'metapod', 'butterfree'],
  weedle: ['weedle', 'kakuna', 'beedrill'],
  pidgey: ['pidgey', 'pidgeotto', 'pidgeot'],
  rattata: ['rattata', 'raticate'],
  spearow: ['spearow', 'fearow'],
  ekans: ['ekans', 'arbok'],
  pikachu: ['pikachu', 'raichu'],
  sandshrew: ['sandshrew', 'sandslash'],
  nidoranf: ['nidoranf', 'nidorina', 'nidoqueen'],
  nidoranm: ['nidoranm', 'nidorino', 'nidoking'],
  clefairy: ['clefairy', 'clefable'],
  vulpix: ['vulpix', 'ninetales'],
  jigglypuff: ['jigglypuff', 'wigglytuff'],
  zubat: ['zubat', 'golbat'],
  oddish: ['oddish', 'gloom', 'vileplume'],
  paras: ['paras', 'parasect'],
  venonat: ['venonat', 'venomoth'],
  diglett: ['diglett', 'dugtrio'],
  meowth: ['meowth', 'persian'],
  psyduck: ['psyduck', 'golduck'],
  mankey: ['mankey', 'primeape'],
  growlithe: ['growlithe', 'arcanine'],
  poliwag: ['poliwag', 'poliwhirl', 'poliwrath'],
  abra: ['abra', 'kadabra', 'alakazam'],
  machop: ['machop', 'machoke', 'machamp'],
  bellsprout: ['bellsprout', 'weepinbell', 'victreebel'],
  tentacool: ['tentacool', 'tentacruel'],
  geodude: ['geodude', 'graveler', 'golem'],
  ponyta: ['ponyta', 'rapidash'],
  slowpoke: ['slowpoke', 'slowbro'],
  magnemite: ['magnemite', 'magneton'],
  farfetchd: ['farfetchd'],
  doduo: ['doduo', 'dodrio'],
  seel: ['seel', 'dewgong'],
  grimer: ['grimer', 'muk'],
  shellder: ['shellder', 'cloyster'],
  gastly: ['gastly', 'haunter', 'gengar'],
  onix: ['onix'],
  drowzee: ['drowzee', 'hypno'],
  krabby: ['krabby', 'kingler'],
  voltorb: ['voltorb', 'electrode'],
  exeggcute: ['exeggcute', 'exeggutor'],
  cubone: ['cubone', 'marowak'],
  hitmonlee: ['hitmonlee'],
  hitmonchan: ['hitmonchan'],
  lickitung: ['lickitung'],
  koffing: ['koffing', 'weezing'],
  rhyhorn: ['rhyhorn', 'rhydon'],
  chansey: ['chansey'],
  tangela: ['tangela'],
  kangaskhan: ['kangaskhan'],
  horsea: ['horsea', 'seadra'],
  goldeen: ['goldeen', 'seaking'],
  staryu: ['staryu', 'starmie'],
  mrmime: ['mrmime'],
  scyther: ['scyther'],
  jynx: ['jynx'],
  electabuzz: ['electabuzz'],
  magmar: ['magmar'],
  pinsir: ['pinsir'],
  tauros: ['tauros'],
  magikarp: ['magikarp', 'gyarados'],
  lapras: ['lapras'],
  ditto: ['ditto'],
  eevee: ['eevee'],
  vaporeon: ['vaporeon'],
  jolteon: ['jolteon'],
  flareon: ['flareon'],
  porygon: ['porygon'],
  omanyte: ['omanyte', 'omastar'],
  kabuto: ['kabuto', 'kabutops'],
  aerodactyl: ['aerodactyl'],
  snorlax: ['snorlax'],
  articuno: ['articuno'],
  zapdos: ['zapdos'],
  moltres: ['moltres'],
  dratini: ['dratini', 'dragonair', 'dragonite'],
  mewtwo: ['mewtwo'],
  mew: ['mew'],
} as const;
export type PokemonFamily = keyof typeof POKEMON_LINES;
export type PokemonSpecies = (typeof POKEMON_LINES)[PokemonFamily][number];
export const STARTERS: PokemonFamily[] = ['bulbasaur', 'charmander', 'squirtle'];
export const POKEMON_INFO: Record<
  PokemonFamily,
  { name: string; type: string; move: string; description: string }
> = {
  bulbasaur: {
    name: 'Bulbasaur',
    type: 'Grass',
    move: 'Vine Whip',
    description: 'Patient and steady. A little courage, a little sunshine.',
  },
  charmander: {
    name: 'Charmander',
    type: 'Fire',
    move: 'Ember',
    description: 'Bright and curious. Ready for the next trail.',
  },
  squirtle: {
    name: 'Squirtle',
    type: 'Water',
    move: 'Water Gun',
    description: 'Calm and determined. Small steps, strong rhythm.',
  },
  caterpie: {
    name: 'Caterpie',
    type: 'Bug',
    move: 'Tackle',
    description: 'A small discovery with a big transformation ahead.',
  },
  weedle: {
    name: 'Weedle',
    type: 'Bug',
    move: 'Poison Sting',
    description: 'Tiny but tenacious, with a sharp point to prove.',
  },
  pidgey: {
    name: 'Pidgey',
    type: 'Flying',
    move: 'Gust',
    description: 'An eager companion from the meadow canopy.',
  },
  rattata: {
    name: 'Rattata',
    type: 'Normal',
    move: 'Quick Attack',
    description: 'Quick paws and quicker wits. Never skips a shortcut.',
  },
  spearow: {
    name: 'Spearow',
    type: 'Flying',
    move: 'Peck',
    description: 'Loud, bold, and first to the morning chorus.',
  },
  ekans: {
    name: 'Ekans',
    type: 'Poison',
    move: 'Wrap',
    description: 'Slides through the grass without a sound.',
  },
  pikachu: {
    name: 'Pikachu',
    type: 'Electric',
    move: 'Thunder Shock',
    description: 'Stores a spark for exactly the right moment.',
  },
  sandshrew: {
    name: 'Sandshrew',
    type: 'Ground',
    move: 'Scratch',
    description: 'Curls into a ball and weathers any storm.',
  },
  nidoranf: {
    name: 'Nidoran♀',
    type: 'Poison',
    move: 'Poison Sting',
    description: 'Small ears, sharp senses, steady courage.',
  },
  nidoranm: {
    name: 'Nidoran♂',
    type: 'Poison',
    move: 'Horn Attack',
    description: 'A proud little horn and a challenger’s spirit.',
  },
  clefairy: {
    name: 'Clefairy',
    type: 'Fairy',
    move: 'Pound',
    description: 'Dances by moonlight and hums while it works.',
  },
  vulpix: {
    name: 'Vulpix',
    type: 'Fire',
    move: 'Ember',
    description: 'Six tails, each one warm as a campfire story.',
  },
  jigglypuff: {
    name: 'Jigglypuff',
    type: 'Normal',
    move: 'Sing',
    description: 'Sings a melody the whole meadow slows down for.',
  },
  zubat: {
    name: 'Zubat',
    type: 'Poison',
    move: 'Leech Life',
    description: 'Navigates the dark by listening carefully.',
  },
  oddish: {
    name: 'Oddish',
    type: 'Grass',
    move: 'Absorb',
    description: 'Roots down by day, wanders by night.',
  },
  paras: {
    name: 'Paras',
    type: 'Bug',
    move: 'Scratch',
    description: 'Carries its little mushrooms everywhere it goes.',
  },
  venonat: {
    name: 'Venonat',
    type: 'Bug',
    move: 'Confusion',
    description: 'Big eyes that spot what others miss.',
  },
  diglett: {
    name: 'Diglett',
    type: 'Ground',
    move: 'Dig',
    description: 'Pops up, sizes up, ducks back down.',
  },
  meowth: {
    name: 'Meowth',
    type: 'Normal',
    move: 'Pay Day',
    description: 'A collector of shiny things and clever plans.',
  },
  psyduck: {
    name: 'Psyduck',
    type: 'Water',
    move: 'Confusion',
    description: 'A headache, a mystery, a hidden strength.',
  },
  mankey: {
    name: 'Mankey',
    type: 'Fighting',
    move: 'Karate Chop',
    description: 'All energy and enthusiasm. Practice cools it down.',
  },
  growlithe: {
    name: 'Growlithe',
    type: 'Fire',
    move: 'Bite',
    description: 'Loyal, brave, and always happy to see you.',
  },
  poliwag: {
    name: 'Poliwag',
    type: 'Water',
    move: 'Bubble',
    description: 'Newly on land and wobbling with determination.',
  },
  abra: {
    name: 'Abra',
    type: 'Psychic',
    move: 'Teleport',
    description: 'Sleeps eighteen hours and still wins the race.',
  },
  machop: {
    name: 'Machop',
    type: 'Fighting',
    move: 'Low Kick',
    description: 'Trains every morning before the meadow wakes.',
  },
  bellsprout: {
    name: 'Bellsprout',
    type: 'Grass',
    move: 'Vine Whip',
    description: 'Sways in the breeze, strikes like a whip.',
  },
  tentacool: {
    name: 'Tentacool',
    type: 'Water',
    move: 'Bubble Beam',
    description: 'Drifts with the current, calm as the tide.',
  },
  geodude: {
    name: 'Geodude',
    type: 'Rock',
    move: 'Rock Throw',
    description: 'Solid as the trail beneath your feet.',
  },
  ponyta: {
    name: 'Ponyta',
    type: 'Fire',
    move: 'Stomp',
    description: 'Hooves spark when it gallops at dawn.',
  },
  slowpoke: {
    name: 'Slowpoke',
    type: 'Water',
    move: 'Water Gun',
    description: 'Slow to notice, impossible to rush.',
  },
  magnemite: {
    name: 'Magnemite',
    type: 'Electric',
    move: 'Thunder Wave',
    description: 'Hums with static and hovers with interest.',
  },
  farfetchd: {
    name: "Farfetch'd",
    type: 'Flying',
    move: 'Cut',
    description: 'Carries its leek like a knight carries a lance.',
  },
  doduo: {
    name: 'Doduo',
    type: 'Flying',
    move: 'Peck',
    description: 'Two heads, one decision: run.',
  },
  seel: {
    name: 'Seel',
    type: 'Water',
    move: 'Headbutt',
    description: 'Balances anything on that single white horn.',
  },
  grimer: {
    name: 'Grimer',
    type: 'Poison',
    move: 'Sludge',
    description: 'A puddle with personality. Approach kindly.',
  },
  shellder: {
    name: 'Shellder',
    type: 'Water',
    move: 'Clamp',
    description: 'Clams up tight and waits out the noise.',
  },
  gastly: {
    name: 'Gastly',
    type: 'Ghost',
    move: 'Lick',
    description: 'A grin in the fog, here and then not.',
  },
  onix: {
    name: 'Onix',
    type: 'Rock',
    move: 'Bind',
    description: 'The trail itself seems to rise and move.',
  },
  drowzee: {
    name: 'Drowzee',
    type: 'Psychic',
    move: 'Hypnosis',
    description: 'Counts dreams the way others count sheep.',
  },
  krabby: {
    name: 'Krabby',
    type: 'Water',
    move: 'Crabhammer',
    description: 'Pinches first, asks questions later.',
  },
  voltorb: {
    name: 'Voltorb',
    type: 'Electric',
    move: 'Spark',
    description: 'Round, shiny, and full of surprises.',
  },
  exeggcute: {
    name: 'Exeggcute',
    type: 'Grass',
    move: 'Confusion',
    description: 'Six seeds sharing one quiet thought.',
  },
  cubone: {
    name: 'Cubone',
    type: 'Ground',
    move: 'Bone Club',
    description: 'Wears its helmet bravely and keeps its stories close.',
  },
  hitmonlee: {
    name: 'Hitmonlee',
    type: 'Fighting',
    move: 'Jump Kick',
    description: 'Legs like springs, kicks like a drumbeat.',
  },
  hitmonchan: {
    name: 'Hitmonchan',
    type: 'Fighting',
    move: 'Mach Punch',
    description: 'Jabs faster than the eye can follow.',
  },
  lickitung: {
    name: 'Lickitung',
    type: 'Normal',
    move: 'Lick',
    description: 'That tongue is longer than you are tall.',
  },
  koffing: {
    name: 'Koffing',
    type: 'Poison',
    move: 'Smog',
    description: 'Floats on its own cheerful fumes.',
  },
  rhyhorn: {
    name: 'Rhyhorn',
    type: 'Ground',
    move: 'Horn Attack',
    description: 'Charges straight through any obstacle course.',
  },
  chansey: {
    name: 'Chansey',
    type: 'Normal',
    move: 'Egg Bomb',
    description: 'Shares its egg and its kindness freely.',
  },
  tangela: {
    name: 'Tangela',
    type: 'Grass',
    move: 'Constrict',
    description: 'A tangle of vines with a hidden face.',
  },
  kangaskhan: {
    name: 'Kangaskhan',
    type: 'Normal',
    move: 'Comet Punch',
    description: 'Fierce protector of the littlest teammate.',
  },
  horsea: {
    name: 'Horsea',
    type: 'Water',
    move: 'Bubble',
    description: 'Dances in the current, ink at the ready.',
  },
  goldeen: {
    name: 'Goldeen',
    type: 'Water',
    move: 'Horn Attack',
    description: 'The waterfall’s most elegant climber.',
  },
  staryu: {
    name: 'Staryu',
    type: 'Water',
    move: 'Swift',
    description: 'Its core glows like a small red star.',
  },
  mrmime: {
    name: 'Mr. Mime',
    type: 'Psychic',
    move: 'Confusion',
    description: 'Builds invisible walls with invisible effort.',
  },
  scyther: {
    name: 'Scyther',
    type: 'Bug',
    move: 'Slash',
    description: 'Blades ready, faster than a falling leaf.',
  },
  jynx: {
    name: 'Jynx',
    type: 'Ice',
    move: 'Ice Punch',
    description: 'Glides and twirls like a figure skater.',
  },
  electabuzz: {
    name: 'Electabuzz',
    type: 'Electric',
    move: 'Thunder Punch',
    description: 'Crackles with energy it can barely hold.',
  },
  magmar: {
    name: 'Magmar',
    type: 'Fire',
    move: 'Fire Punch',
    description: 'Warms the whole trail on a cold morning.',
  },
  pinsir: {
    name: 'Pinsir',
    type: 'Bug',
    move: 'Vice Grip',
    description: 'Horns that lift logs like twigs.',
  },
  tauros: {
    name: 'Tauros',
    type: 'Normal',
    move: 'Stomp',
    description: 'Three tails thumping a steady warning.',
  },
  magikarp: {
    name: 'Magikarp',
    type: 'Water',
    move: 'Splash',
    description: 'Splashes with all its heart. Heart counts.',
  },
  lapras: {
    name: 'Lapras',
    type: 'Water',
    move: 'Ice Beam',
    description: 'A gentle ferry across any water.',
  },
  ditto: {
    name: 'Ditto',
    type: 'Normal',
    move: 'Transform',
    description: 'Becomes whatever the moment calls for.',
  },
  eevee: {
    name: 'Eevee',
    type: 'Normal',
    move: 'Swift',
    description: 'Full of possibilities, all of them exciting.',
  },
  vaporeon: {
    name: 'Vaporeon',
    type: 'Water',
    move: 'Hydro Pump',
    description: 'Melts into water like morning mist.',
  },
  jolteon: {
    name: 'Jolteon',
    type: 'Electric',
    move: 'Thunderbolt',
    description: 'Every quill bristles with lightning.',
  },
  flareon: {
    name: 'Flareon',
    type: 'Fire',
    move: 'Flamethrower',
    description: 'A warm heart with a hotter breath.',
  },
  porygon: {
    name: 'Porygon',
    type: 'Normal',
    move: 'Tri Attack',
    description: 'A creature of pure code, curious about grass.',
  },
  omanyte: {
    name: 'Omanyte',
    type: 'Water',
    move: 'Water Gun',
    description: 'An ancient swimmer from a fossil shell.',
  },
  kabuto: {
    name: 'Kabuto',
    type: 'Water',
    move: 'Scratch',
    description: 'A small fossil with a long memory.',
  },
  aerodactyl: {
    name: 'Aerodactyl',
    type: 'Rock',
    move: 'Wing Attack',
    description: 'Screeches across the sky from another age.',
  },
  snorlax: {
    name: 'Snorlax',
    type: 'Normal',
    move: 'Body Slam',
    description: 'Sleeps anywhere, eats everything, wakes smiling.',
  },
  articuno: {
    name: 'Articuno',
    type: 'Ice',
    move: 'Ice Beam',
    description: 'Winter follows the beat of its wings.',
  },
  zapdos: {
    name: 'Zapdos',
    type: 'Electric',
    move: 'Thunder',
    description: 'The storm given feathers and a cry.',
  },
  moltres: {
    name: 'Moltres',
    type: 'Fire',
    move: 'Fire Spin',
    description: 'Embers trail behind it like a sunrise.',
  },
  dratini: {
    name: 'Dratini',
    type: 'Dragon',
    move: 'Dragon Rage',
    description: 'A rare ripple beneath the lake’s surface.',
  },
  mewtwo: {
    name: 'Mewtwo',
    type: 'Psychic',
    move: 'Psychic',
    description: 'Power beyond measure, watching quietly.',
  },
  mew: {
    name: 'Mew',
    type: 'Psychic',
    move: 'Metronome',
    description: 'A myth that giggles and vanishes.',
  },
};
// Species ids match the sprite file names; a few display names need more than capitalising.
const SPECIES_NAMES: Record<string, string> = {
  nidoranf: 'Nidoran♀',
  nidoranm: 'Nidoran♂',
  farfetchd: "Farfetch'd",
  mrmime: 'Mr. Mime',
};
export function pokemonName(species: string): string {
  return SPECIES_NAMES[species] ?? species.charAt(0).toUpperCase() + species.slice(1);
}
// Three-stage families evolve at 4 and 9 trainings; two-stage at 6; singles never evolve.
export function pokemonForm(family: PokemonFamily, training: number): PokemonSpecies {
  const line: readonly string[] = POKEMON_LINES[family];
  const stage =
    line.length === 1
      ? 0
      : line.length === 2
        ? training >= 6
          ? 1
          : 0
        : training >= 9
          ? 2
          : training >= 4
            ? 1
            : 0;
  return line[stage] as PokemonSpecies;
}
export function trainingToEvolve(family: PokemonFamily, training: number): number | null {
  const line = POKEMON_LINES[family];
  const milestones = line.length === 3 ? [4, 9] : line.length === 2 ? [6] : [];
  const next = milestones.find((milestone) => training < milestone);
  return next === undefined ? null : next - training;
}
// Wild families unlock as the learner's belt grows (8 belts, 0-7).
// Legendaries wait for the highest belts so early encounters stay friendly.
const ENCOUNTER_TIERS: PokemonFamily[][] = [
  ['caterpie', 'weedle', 'pidgey', 'rattata', 'spearow'],
  [
    'pikachu',
    'zubat',
    'oddish',
    'paras',
    'venonat',
    'diglett',
    'meowth',
    'psyduck',
    'poliwag',
    'bellsprout',
    'magikarp',
  ],
  [
    'ekans',
    'sandshrew',
    'nidoranf',
    'nidoranm',
    'clefairy',
    'vulpix',
    'jigglypuff',
    'mankey',
    'growlithe',
    'slowpoke',
  ],
  [
    'abra',
    'machop',
    'tentacool',
    'geodude',
    'ponyta',
    'magnemite',
    'doduo',
    'seel',
    'grimer',
    'shellder',
    'gastly',
    'drowzee',
    'krabby',
    'voltorb',
    'exeggcute',
    'cubone',
    'koffing',
    'rhyhorn',
    'horsea',
    'goldeen',
    'staryu',
    'eevee',
  ],
  [
    'farfetchd',
    'onix',
    'lickitung',
    'chansey',
    'tangela',
    'kangaskhan',
    'mrmime',
    'scyther',
    'jynx',
    'electabuzz',
    'magmar',
    'pinsir',
    'tauros',
    'lapras',
    'ditto',
    'porygon',
    'omanyte',
    'kabuto',
    'aerodactyl',
  ],
  ['hitmonlee', 'hitmonchan', 'snorlax'],
  ['vaporeon', 'jolteon', 'flareon', 'dratini'],
  ['articuno', 'zapdos', 'moltres', 'mewtwo', 'mew'],
];
export function encounterPool(belt: number, guardian = false): PokemonFamily[] {
  const tier = Math.max(0, Math.min(ENCOUNTER_TIERS.length - 1, Math.floor(belt)));
  const pool = ENCOUNTER_TIERS.slice(0, tier + 1).flat();
  return guardian ? [...pool, ...STARTERS] : pool;
}
export function isPokemonFamily(value: unknown): value is PokemonFamily {
  return typeof value === 'string' && Object.hasOwn(POKEMON_LINES, value);
}
export interface PokemonCollection {
  version: number;
  partner: PokemonFamily;
  caught: Partial<Record<PokemonFamily, number>>;
  wins: number;
  guardian: boolean;
  rewardDay: string;
  rewardsToday: number;
  active?: PokemonEncounter;
  lastEncounter?: Pick<PokemonEncounter, 'id' | 'createdAt'>;
}
export interface PokemonEncounter {
  id: string;
  opponent: PokemonFamily;
  guardian: boolean;
  tutorial: boolean;
  words: string[];
  createdAt: string;
  belt: number;
  rulesVersion?: 2;
}
export type TrailInput = { kind: 'key'; key: string; at: number } | { kind: 'guard'; at: number };
export type TrailPhase = 'battle' | 'capture' | 'caught' | 'escaped' | 'lost';
export interface TrailBattle {
  phase: TrailPhase;
  playerHp: number;
  opponentHp: number;
  maxOpponentHp: number;
  guards: number;
  guarding: boolean;
  combo: number;
  turns: number;
  captureTries: number;
  message: string;
  prompt: string;
  cursor: number;
  clean: boolean;
  promptAttempts: number;
  wordOffset: number;
  passage: string;
  keystrokes: KeystrokeEvent[];
}
export function trailFinished(state: TrailBattle): boolean {
  return ['caught', 'escaped', 'lost'].includes(state.phase);
}
/** Old encounters retain their original response rules, including across a deployment. */
export function trailCounterDamage(
  encounter: PokemonEncounter,
  mistakes: number,
  guarding = false,
): number {
  if (encounter.tutorial) return 0;
  const response =
    encounter.rulesVersion === 2
      ? (encounter.guardian ? 9 : 6) * Math.min(3, Math.max(0, mistakes))
      : encounter.guardian
        ? 18
        : 12;
  return guarding ? Math.ceil(response / 4) : response;
}
function nextPrompt(state: TrailBattle, encounter: PokemonEncounter, count: number): TrailBattle {
  const prompt = Array.from(
    { length: count },
    (_, i) => encounter.words[(state.wordOffset + i) % encounter.words.length],
  ).join(' ');
  return {
    ...state,
    prompt,
    cursor: 0,
    clean: true,
    promptAttempts: 0,
    wordOffset: state.wordOffset + count,
    passage: state.passage ? `${state.passage}\n${prompt}` : prompt,
  };
}
export function createTrailBattle(encounter: PokemonEncounter): TrailBattle {
  if (encounter.words.length < 16 || encounter.words.some((word) => !/^[a-z]{3,9}$/.test(word)))
    throw new Error('This encounter needs valid typing words.');
  const hp = encounter.guardian ? 160 : encounter.tutorial ? 60 : 100;
  return nextPrompt(
    {
      phase: 'battle',
      playerHp: 100,
      opponentHp: hp,
      maxOpponentHp: hp,
      guards: 2,
      guarding: false,
      combo: 0,
      turns: 0,
      captureTries: 0,
      message: 'Type both words, including the space, to use your move.',
      prompt: '',
      cursor: 0,
      clean: true,
      promptAttempts: 0,
      wordOffset: 0,
      passage: '',
      keystrokes: [],
    },
    encounter,
    2,
  );
}
export function applyTrailInput(
  state: TrailBattle,
  encounter: PokemonEncounter,
  input: TrailInput,
): TrailBattle {
  if (trailFinished(state)) throw new Error('This encounter is already complete.');
  if (input.kind === 'guard') {
    if (
      state.phase !== 'battle' ||
      state.cursor ||
      state.promptAttempts ||
      state.guarding ||
      !state.guards
    )
      throw new Error('Guard is only available before typing a turn.');
    // Replace the untouched attack prompt; do not log words that were never typed.
    const prefix = state.passage.slice(0, -state.prompt.length);
    const prompt = state.prompt.split(' ')[0];
    return {
      ...state,
      guarding: true,
      guards: state.guards - 1,
      prompt,
      passage: prefix + prompt,
      message: 'Type this word to guard and recover a little health.',
    };
  }
  const expected = state.prompt[state.cursor];
  const correct = input.key === expected;
  const typed: TrailBattle = {
    ...state,
    cursor: state.cursor + (correct ? 1 : 0),
    clean: state.clean && correct,
    promptAttempts: state.promptAttempts + 1,
    keystrokes: [
      ...state.keystrokes,
      {
        actual: input.key,
        expected,
        correct,
        position: state.passage.length - state.prompt.length + state.cursor,
        timestamp_ms: input.at,
      },
    ],
  };
  if (!correct)
    return {
      ...typed,
      message: 'Keep going. The highlighted letter is next; there is no time limit.',
    };
  if (typed.cursor < typed.prompt.length) return typed;
  if (state.phase === 'capture') {
    const accuracy = typed.prompt.length / typed.promptAttempts;
    if (accuracy >= 0.9)
      return {
        ...typed,
        phase: 'caught',
        message: 'A new friendship! Capture challenge complete.',
      };
    if (typed.captureTries >= 2)
      return {
        ...typed,
        phase: 'escaped',
        message: 'The Pokémon returned to the meadow. Your practice still counts.',
      };
    return nextPrompt(
      {
        ...typed,
        captureTries: typed.captureTries + 1,
        message: 'One more chance. Aim for at least 90% accuracy in these three words.',
      },
      encounter,
      3,
    );
  }
  const combo = typed.clean && !typed.guarding ? state.combo + 1 : 0;
  const damage = typed.guarding
    ? 0
    : 20 + (typed.clean ? 8 : 0) + (combo > 0 && combo % 3 === 0 ? 12 : 0);
  const opponentHp = Math.max(0, typed.opponentHp - damage);
  const turn = { ...typed, opponentHp, combo, turns: typed.turns + 1 };
  if (!opponentHp) {
    if (encounter.guardian)
      return {
        ...turn,
        phase: 'escaped',
        message: 'Meadow guardian defeated! The trail is yours to explore.',
      };
    return nextPrompt(
      {
        ...turn,
        phase: 'capture',
        captureTries: 1,
        message: 'Ready to befriend? Type these three words with at least 90% accuracy.',
      },
      encounter,
      3,
    );
  }
  const response = trailCounterDamage(
    encounter,
    typed.promptAttempts - typed.cursor,
    typed.guarding,
  );
  const playerHp = Math.max(0, Math.min(100, turn.playerHp + (typed.guarding ? 10 : 0)) - response);
  const resolved = {
    ...turn,
    playerHp,
    guarding: false,
    message: typed.guarding
      ? 'Guard held. Take a breath, then attack.'
      : damage > 28
        ? 'Focus move! Your clean typing gave that attack extra power.'
        : typed.clean
          ? 'Clean hit! Accuracy powered up your move.'
          : 'Your move landed. A clean turn will make it stronger.',
  };
  if (encounter.rulesVersion === 2 && !encounter.tutorial && !typed.guarding) {
    resolved.message += response
      ? ` The opponent counterattacked for ${response} HP.`
      : ' No mistakes, no counterattack.';
  }
  return playerHp
    ? nextPrompt(resolved, encounter, 2)
    : {
        ...resolved,
        phase: 'lost',
        message: 'Time to rest at camp. Your partner and collection are safe.',
      };
}
/** Replays only raw inputs, never trusting client-supplied damage, accuracy, or catches. */
export function replayTrail(
  encounter: PokemonEncounter,
  raw: unknown,
  wallMs: number,
): TrailBattle {
  if (!Array.isArray(raw) || !raw.length || raw.length > 2500)
    throw new Error('Invalid encounter inputs.');
  let state = createTrailBattle(encounter);
  let previous = 0;
  for (const value of raw) {
    if (!value || typeof value !== 'object') throw new Error('Invalid input.');
    const event = value as TrailInput;
    if (
      !Number.isFinite(event.at) ||
      event.at < previous ||
      event.at < 0 ||
      event.at > wallMs + 1000 ||
      event.at >= 1800_000
    )
      throw new Error('Invalid encounter timing.');
    if (
      event.kind !== 'guard' &&
      (event.kind !== 'key' || typeof event.key !== 'string' || !/^[\x20-\x7e]$/.test(event.key))
    )
      throw new Error('Invalid typing input.');
    state = applyTrailInput(state, encounter, event);
    previous = event.at;
  }
  if (!trailFinished(state) || previous < 1000)
    throw new Error('Finish this encounter before saving.');
  return state;
}
export function applyTrailReward(
  collection: PokemonCollection,
  encounter: PokemonEncounter,
  battle: TrailBattle,
): PokemonCollection {
  const caught = { ...collection.caught };
  caught[collection.partner] = Math.min(99, (caught[collection.partner] ?? 0) + 1);
  if (battle.phase === 'caught' && caught[encounter.opponent] === undefined)
    caught[encounter.opponent] = 0;
  return {
    ...collection,
    caught,
    version: collection.version + 1,
    wins: collection.wins + (battle.opponentHp === 0 ? 1 : 0),
    guardian: collection.guardian || (encounter.guardian && battle.opponentHp === 0),
    active: undefined,
    lastEncounter: { id: encounter.id, createdAt: encounter.createdAt },
  };
}
