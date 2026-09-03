import { getGroqClient, GROQ_MODELS } from './client';

export interface PassageGenerationInput {
  gradeLevel: number;
  targetSkills: string[]; // e.g. "home row", "left-right alternation"
  requiredCharacters: string[]; // e.g. "a", "s", "d", "f"
  lengthMin: number;
  lengthMax: number;
  theme?: string;
  vocabularyLevel: 'basic' | 'intermediate' | 'advanced' | 'technical';
}

/**
 * Server-side service for generating typing passages using the Groq API.
 */
export class ContentGenerator {
  public static async generatePassage(input: PassageGenerationInput): Promise<string> {
    const groq = getGroqClient();

    const prompt = `
You are an expert educational content creator for a typing application.
Generate a typing passage for a student in grade ${input.gradeLevel}.
The vocabulary level should be ${input.vocabularyLevel}.

Constraints:
1. The passage MUST be between ${input.lengthMin} and ${input.lengthMax} characters long.
2. The passage MUST incorporate the following target skills: ${input.targetSkills.join(', ')}.
3. The passage MUST include these specific characters frequently: ${input.requiredCharacters.join(', ')}.
${input.theme ? `4. The passage should be about: ${input.theme}.` : ''}

Output ONLY the raw passage text. No markdown, no explanations, no quotes around the text. Just the text itself.
`;

    try {
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: GROQ_MODELS.FAST,
        temperature: 0.7,
        max_tokens: 500, // Enough for a long passage
      });

      const passage = completion.choices[0]?.message?.content?.trim() || '';
      
      if (!passage) {
        throw new Error('Groq API returned empty passage.');
      }

      return passage;
    } catch (error) {
      console.error('Failed to generate passage:', error);
      throw new Error('Failed to generate passage.');
    }
  }
}
