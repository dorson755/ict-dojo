import { getGroqClient, GROQ_MODELS } from './client';
import { assessPassage, sanitizePassage } from './passage-quality';

export interface PassageGenerationInput {
  gradeLevel: number;
  studentName?: string;
  targetSkills: string[];
  requiredCharacters: string[];
  lengthMin: number;
  lengthMax: number;
  theme?: string;
  vocabularyLevel: 'basic' | 'intermediate' | 'advanced' | 'technical';
  format?: 'story' | 'paragraph' | 'belt-test' | 'code-snippet' | 'data-entry';
}

export class ContentGenerator {
  public static async generatePassage(input: PassageGenerationInput): Promise<string> {
    const groq = getGroqClient();

    let formatContext = '';
    let nameContext = '';

    if (input.format === 'code-snippet') {
      formatContext = `Write a short, realistic code snippet in JavaScript or Python. Do NOT use markdown blocks, just the raw code. It should look like a real function or object definition.`;
    } else if (input.format === 'data-entry') {
      formatContext = `Write a block of raw data (like a spreadsheet row, IP addresses, or financial ledger entry) focused heavily on numbers and symbols. Do NOT use markdown.`;
    } else {
      nameContext = input.studentName
        ? `The student's name is ${input.studentName}. Incorporate their name as the main character.`
        : '';
      formatContext =
        input.format === 'belt-test'
          ? `This is a highly intense 'Belt Test' to evaluate their mastery. Make it sound epic, challenging, and slightly dramatic.`
          : input.format === 'story'
            ? `Write an engaging, short narrative story.`
            : `Write an educational paragraph.`;
    }

    const prompt = `
You are an expert educational content creator for a typing application.
Generate a typing passage for a student in grade ${input.gradeLevel}.
The vocabulary level should be ${input.vocabularyLevel}.

${nameContext}
${formatContext}

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
        temperature: 0.8,
        // Headroom for reasoning tokens, which count toward the budget on gpt-oss models.
        max_tokens: 800,
        // Keep the model's private thinking brief so the budget goes to the passage.
        reasoning_effort: 'low',
      });

      const raw = completion.choices[0]?.message?.content?.trim() || '';
      const passage = sanitizePassage(raw);
      const quality = assessPassage(
        passage,
        input.requiredCharacters,
        input.lengthMin,
        input.lengthMax,
      );
      if (!quality.ok) {
        throw new Error(`Generated passage failed quality checks: ${quality.reasons.join(', ')}`);
      }

      return passage;
    } catch (error) {
      console.error('Failed to generate passage:', error);
      throw new Error('Failed to generate passage.');
    }
  }

  public static async generateDashboardGreeting(
    name: string,
    weakKeys: string[],
    streak: number,
  ): Promise<string> {
    // Simple personalization needs no model call, tokens, or student data sent to Groq.
    const learner = name.trim() || 'Learner';
    const days = Number.isFinite(streak) ? Math.max(0, Math.floor(streak)) : 0;
    const keys = [
      ...new Set(
        weakKeys
          .filter((key) => /^[\x20-\x7e]$/.test(key))
          .map((key) => (key === ' ' ? 'Space' : key.toUpperCase())),
      ),
    ].slice(0, 3);
    const welcome = days
      ? `Welcome back, ${learner}, your ${days}-day streak shows real discipline.`
      : `Welcome back, ${learner}, today is a good day to build your rhythm.`;
    const challenge = keys.length
      ? `Focus on the ${keys.join(', ')} ${keys.length === 1 ? 'key' : 'keys'} with slow, accurate practice before adding speed.`
      : 'Keep your hands relaxed and aim for accuracy before speed.';
    return `${welcome} ${challenge}`;
  }
}
