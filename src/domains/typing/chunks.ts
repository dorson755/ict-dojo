export type ChunkType = 'suffix' | 'prefix' | 'blend';

export interface TypingChunk {
  id: string;
  pattern: string;
  label: string;
  type: ChunkType;
  examples: string[];
}

export const TYPING_CHUNKS: TypingChunk[] = [
  // Suffixes
  { id: 'tion', pattern: 'tion', label: '-tion', type: 'suffix', examples: ['nation', 'action', 'station', 'education', 'invitation'] },
  { id: 'sion', pattern: 'sion', label: '-sion', type: 'suffix', examples: ['vision', 'division', 'decision', 'explosion', 'revision'] },
  { id: 'ing', pattern: 'ing', label: '-ing', type: 'suffix', examples: ['typing', 'reading', 'running', 'learning', 'writing'] },
  { id: 'ed', pattern: 'ed', label: '-ed', type: 'suffix', examples: ['typed', 'walked', 'jumped', 'opened', 'closed'] },
  { id: 'ment', pattern: 'ment', label: '-ment', type: 'suffix', examples: ['movement', 'moment', 'government', 'agreement', 'development'] },
  { id: 'ness', pattern: 'ness', label: '-ness', type: 'suffix', examples: ['kindness', 'happiness', 'darkness', 'fitness', 'softness'] },
  { id: 'less', pattern: 'less', label: '-less', type: 'suffix', examples: ['careless', 'endless', 'fearless', 'homeless', 'effortless'] },
  { id: 'able', pattern: 'able', label: '-able', type: 'suffix', examples: ['able', 'comfortable', 'valuable', 'capable', 'suitable'] },
  { id: 'ible', pattern: 'ible', label: '-ible', type: 'suffix', examples: ['visible', 'possible', 'terrible', 'horrible', 'responsible'] },
  { id: 'ous', pattern: 'ous', label: '-ous', type: 'suffix', examples: ['famous', 'dangerous', 'nervous', 'curious', 'generous'] },
  { id: 'ity', pattern: 'ity', label: '-ity', type: 'suffix', examples: ['city', 'ability', 'reality', 'activity', 'community'] },
  { id: 'ance', pattern: 'ance', label: '-ance', type: 'suffix', examples: ['chance', 'distance', 'importance', 'balance', 'appearance'] },
  { id: 'ence', pattern: 'ence', label: '-ence', type: 'suffix', examples: ['sentence', 'difference', 'experience', 'confidence', 'existence'] },
  { id: 'ful', pattern: 'ful', label: '-ful', type: 'suffix', examples: ['beautiful', 'careful', 'helpful', 'powerful', 'wonderful'] },
  { id: 'ly', pattern: 'ly', label: '-ly', type: 'suffix', examples: ['quickly', 'slowly', 'happily', 'easily', 'carefully'] },
  // Prefixes
  { id: 'un', pattern: 'un', label: 'un-', type: 'prefix', examples: ['unhappy', 'unable', 'uncover', 'unfair', 'unknown'] },
  { id: 're', pattern: 're', label: 're-', type: 'prefix', examples: ['return', 'rewrite', 'review', 'repeat', 'replace'] },
  { id: 'pre', pattern: 'pre', label: 'pre-', type: 'prefix', examples: ['preview', 'prepare', 'predict', 'prevent', 'prefix'] },
  { id: 'dis', pattern: 'dis', label: 'dis-', type: 'prefix', examples: ['disagree', 'disappear', 'dismiss', 'discover', 'distant'] },
  { id: 'mis', pattern: 'mis', label: 'mis-', type: 'prefix', examples: ['mistake', 'misunderstand', 'misplace', 'mislead', 'misspell'] },
  { id: 'over', pattern: 'over', label: 'over-', type: 'prefix', examples: ['overcome', 'overflow', 'overlook', 'overhead', 'overtime'] },
  { id: 'under', pattern: 'under', label: 'under-', type: 'prefix', examples: ['understand', 'undergo', 'underneath', 'underestimate', 'underground'] },
  { id: 'im', pattern: 'im', label: 'im-/in-', type: 'prefix', examples: ['impossible', 'incorrect', 'invisible', 'independent', 'immature'] },
  { id: 'non', pattern: 'non', label: 'non-', type: 'prefix', examples: ['nonsense', 'nonstop', 'nonfiction', 'nonverbal', 'nonfat'] },
  { id: 'anti', pattern: 'anti', label: 'anti-', type: 'prefix', examples: ['antibody', 'antibiotic', 'antifreeze', 'antisocial', 'antidote'] },
  { id: 'sub', pattern: 'sub', label: 'sub-', type: 'prefix', examples: ['subway', 'submarine', 'subtract', 'subheading', 'subzero'] },
  { id: 'inter', pattern: 'inter', label: 'inter-', type: 'prefix', examples: ['international', 'interrupt', 'interview', 'interact', 'internet'] },
  { id: 'fore', pattern: 'fore', label: 'fore-', type: 'prefix', examples: ['forecast', 'forehead', 'foreword', 'foresee', 'foremost'] },
  { id: 'trans', pattern: 'trans', label: 'trans-', type: 'prefix', examples: ['transport', 'translate', 'transfer', 'transform', 'transparent'] },
  { id: 'super', pattern: 'super', label: 'super-', type: 'prefix', examples: ['supermarket', 'superhuman', 'superstar', 'supervise', 'supersonic'] },
  { id: 'auto', pattern: 'auto', label: 'auto-', type: 'prefix', examples: ['automatic', 'automobile', 'autopilot', 'autograph', 'autocorrect'] },
  // Blends
  { id: 'th', pattern: 'th', label: 'th', type: 'blend', examples: ['the', 'this', 'with', 'think', 'nothing'] },
  { id: 'sh', pattern: 'sh', label: 'sh', type: 'blend', examples: ['she', 'ship', 'wish', 'finish', 'splash'] },
  { id: 'ch', pattern: 'ch', label: 'ch', type: 'blend', examples: ['chair', 'school', 'much', 'teach', 'watch'] },
  { id: 'wh', pattern: 'wh', label: 'wh', type: 'blend', examples: ['what', 'when', 'where', 'while', 'white'] },
  { id: 'qu', pattern: 'qu', label: 'qu', type: 'blend', examples: ['quick', 'quiet', 'question', 'equal', 'square'] },
];

export function getChunkById(id: string): TypingChunk | undefined {
  return TYPING_CHUNKS.find((chunk) => chunk.id === id);
}

export function generateChunkDrill(chunk: TypingChunk, wordCount = 30): string {
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(chunk.examples[i % chunk.examples.length]);
  }
  // Add some filler words to force chunk recognition in context
  const fillers = ['the', 'and', 'a', 'to', 'of'];
  const mixed: string[] = [];
  words.forEach((word, index) => {
    mixed.push(word);
    if (index % 4 === 3) mixed.push(fillers[index % fillers.length]);
  });
  return mixed.join(' ');
}
