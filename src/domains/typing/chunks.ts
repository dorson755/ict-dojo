export interface TypingChunk {
  id: string;
  pattern: string;
  label: string;
  examples: string[];
}

export const TYPING_CHUNKS: TypingChunk[] = [
  { id: 'tion', pattern: 'tion', label: '-tion', examples: ['nation', 'action', 'station', 'education', 'invitation'] },
  { id: 'sion', pattern: 'sion', label: '-sion', examples: ['vision', 'division', 'decision', 'explosion', 'revision'] },
  { id: 'ing', pattern: 'ing', label: '-ing', examples: ['typing', 'reading', 'running', 'learning', 'writing'] },
  { id: 'ed', pattern: 'ed', label: '-ed', examples: ['typed', 'walked', 'jumped', 'opened', 'closed'] },
  { id: 'ment', pattern: 'ment', label: '-ment', examples: ['movement', 'moment', 'government', 'agreement', 'development'] },
  { id: 'ness', pattern: 'ness', label: '-ness', examples: ['kindness', 'happiness', 'darkness', 'fitness', 'softness'] },
  { id: 'less', pattern: 'less', label: '-less', examples: ['careless', 'endless', 'fearless', 'homeless', 'effortless'] },
  { id: 'able', pattern: 'able', label: '-able', examples: ['able', 'comfortable', 'valuable', 'capable', 'suitable'] },
  { id: 'ible', pattern: 'ible', label: '-ible', examples: ['visible', 'possible', 'terrible', 'horrible', 'responsible'] },
  { id: 'ous', pattern: 'ous', label: '-ous', examples: ['famous', 'dangerous', 'nervous', 'curious', 'generous'] },
  { id: 'ity', pattern: 'ity', label: '-ity', examples: ['city', 'ability', 'reality', 'activity', 'community'] },
  { id: 'ance', pattern: 'ance', label: '-ance', examples: ['chance', 'distance', 'importance', 'balance', 'appearance'] },
  { id: 'ence', pattern: 'ence', label: '-ence', examples: ['sentence', 'difference', 'experience', 'confidence', 'existence'] },
  { id: 'ful', pattern: 'ful', label: '-ful', examples: ['beautiful', 'careful', 'helpful', 'powerful', 'wonderful'] },
  { id: 'ly', pattern: 'ly', label: '-ly', examples: ['quickly', 'slowly', 'happily', 'easily', 'carefully'] },
  { id: 'th', pattern: 'th', label: 'th', examples: ['the', 'this', 'with', 'think', 'nothing'] },
  { id: 'sh', pattern: 'sh', label: 'sh', examples: ['she', 'ship', 'wish', 'finish', 'splash'] },
  { id: 'ch', pattern: 'ch', label: 'ch', examples: ['chair', 'school', 'much', 'teach', 'watch'] },
  { id: 'wh', pattern: 'wh', label: 'wh', examples: ['what', 'when', 'where', 'while', 'white'] },
  { id: 'qu', pattern: 'qu', label: 'qu', examples: ['quick', 'quiet', 'question', 'equal', 'square'] },
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
