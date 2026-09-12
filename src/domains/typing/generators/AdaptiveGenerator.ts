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
   */
  static async generatePassage(
    weakKeys: Record<string, number>,
    studentName: string = '',
    gradeLevel: number = 6,
    length: number = 20
  ): Promise<string> {
    const keys = Object.keys(weakKeys);
    
    if (keys.length === 0) {
      return this.generateRandomPassage(length);
    }

    const sortedWeaknesses = Object.entries(weakKeys)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0].toLowerCase());

    const topWeaknesses = sortedWeaknesses.slice(0, 5);

    try {
      const aiPassage = await ContentGenerator.generatePassage({
        gradeLevel,
        studentName,
        targetSkills: ['Adaptive Weakness Training'],
        requiredCharacters: topWeaknesses,
        lengthMin: length * 5,
        lengthMax: length * 7,
        vocabularyLevel: 'intermediate',
        format: 'story'
      });
      return aiPassage;
    } catch (err) {
      console.warn('Groq API generation failed, falling back to local dictionary:', err);
      return this.fallbackGeneration(topWeaknesses, length);
    }
  }

  /**
   * Generates a "Belt Test" passage that is longer and harder, testing all weaknesses.
   */
  static async generateBeltTest(
    weakKeys: Record<string, number>,
    studentName: string = '',
    gradeLevel: number = 6,
    length: number = 50
  ): Promise<string> {
    const keys = Object.keys(weakKeys);
    const sortedWeaknesses = Object.entries(weakKeys)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0].toLowerCase());

    const topWeaknesses = sortedWeaknesses.slice(0, 8); // Test more weaknesses

    try {
      const aiPassage = await ContentGenerator.generatePassage({
        gradeLevel: gradeLevel + 1, // Push them harder for the test
        studentName,
        targetSkills: ['Belt Mastery Test', 'Sustained Focus'],
        requiredCharacters: topWeaknesses,
        lengthMin: length * 5,
        lengthMax: length * 7,
        vocabularyLevel: 'advanced',
        format: 'belt-test'
      });
      return aiPassage;
    } catch (err) {
      console.warn('Groq API belt test failed, falling back:', err);
      return this.fallbackGeneration(topWeaknesses, length);
    }
  }

  private static fallbackGeneration(topWeaknesses: string[], length: number): string {
    const selectedWords: string[] = [];
    const targetedWords = DICTIONARY.filter(word => {
      const lowerWord = word.toLowerCase();
      return topWeaknesses.some(char => lowerWord.includes(char));
    });

    const pool = targetedWords.length > 5 ? targetedWords : DICTIONARY;

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      selectedWords.push(pool[randomIndex]);
    }
    return selectedWords.join(' ');
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
