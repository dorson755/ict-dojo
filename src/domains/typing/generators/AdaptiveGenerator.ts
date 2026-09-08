const DICTIONARY = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "I",
  "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
  "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
  "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
  "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
  "people", "into", "year", "your", "good", "some", "could", "them", "see", "other",
  "than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
  "back", "after", "use", "two", "how", "our", "work", "first", "well", "way",
  "even", "new", "want", "because", "any", "these", "give", "day", "most", "us",
  "program", "system", "data", "computer", "function", "variable", "class", "object", "method", "string",
  "array", "number", "boolean", "return", "import", "export", "default", "const", "let", "var"
];

import { ContentGenerator } from '@/lib/groq/content-generator';

export class AdaptiveGenerator {
  /**
   * Generates a passage tailored to a user's weak keys.
   * @param weakKeys A record of characters the user struggles with, mapped to their error score.
   * @param length The target number of words for the passage (default 20).
   */
  static async generatePassage(weakKeys: Record<string, number>, length: number = 20): Promise<string> {
    const keys = Object.keys(weakKeys);
    
    // If no specific weaknesses, generate a random passage
    if (keys.length === 0) {
      return this.generateRandomPassage(length);
    }

    // Sort weaknesses by highest error score first
    const sortedWeaknesses = Object.entries(weakKeys)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0].toLowerCase());

    const topWeaknesses = sortedWeaknesses.slice(0, 5); // Focus on top 5 weak keys

    try {
      // 1. Try to generate a beautiful, coherent passage using Groq API
      const aiPassage = await ContentGenerator.generatePassage({
        gradeLevel: 6, // Default for now
        targetSkills: ['Adaptive Weakness Training'],
        requiredCharacters: topWeaknesses,
        lengthMin: length * 5, // Approx characters (5 chars per word)
        lengthMax: length * 7,
        vocabularyLevel: 'intermediate'
      });
      return aiPassage;
    } catch (err) {
      // 2. Fallback to dictionary stitching if API fails or rate limits
      console.warn('Groq API generation failed, falling back to local dictionary:', err);
      
      const selectedWords: string[] = [];

      // Prioritize words that contain the weak keys
      const targetedWords = DICTIONARY.filter(word => {
        const lowerWord = word.toLowerCase();
        return topWeaknesses.some(char => lowerWord.includes(char));
      });

      // If we can't find enough targeted words, fallback to the full dictionary
      const pool = targetedWords.length > 5 ? targetedWords : DICTIONARY;

      for (let i = 0; i < length; i++) {
        // Pick randomly from the pool, but favor targeted words heavily
        const randomIndex = Math.floor(Math.random() * pool.length);
        selectedWords.push(pool[randomIndex]);
      }

      return selectedWords.join(' ');
    }
  }

  static generateRandomPassage(length: number = 20): string {
    const selectedWords: string[] = [];
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * DICTIONARY.length);
      selectedWords.push(DICTIONARY[randomIndex]);
    }
    return selectedWords.join(' ');
  }
}
