import { getGroqClient, GROQ_MODELS } from './client';

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
      nameContext = input.studentName ? `The student's name is ${input.studentName}. Incorporate their name as the main character.` : '';
      formatContext = input.format === 'belt-test'
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
        max_tokens: 500,
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

  public static async generateDashboardGreeting(name: string, weakKeys: string[], streak: number): Promise<string> {
    const groq = getGroqClient();
    
    const weakKeysText = weakKeys.length > 0 
      ? `They are currently struggling with the following keys: ${weakKeys.join(', ')}.`
      : `They have no specific weak keys right now.`;
      
    const streakText = streak > 0
      ? `They have a ${streak} day practice streak.`
      : `They don't have an active streak.`;

    const prompt = `
You are an encouraging martial arts Sensei inside a typing application called "ICT Dojo".
Write a short, punchy, 2-sentence welcome greeting for a student named ${name}.
${weakKeysText}
${streakText}

Provide ONLY the raw text. Do not use quotes. Keep it highly encouraging, acknowledge their streak if they have one, and give them a quick tip or challenge based on their weak keys (if any).
`;

    try {
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: GROQ_MODELS.FAST,
        temperature: 0.7,
        max_tokens: 150,
      });
      return completion.choices[0]?.message?.content?.trim() || `Welcome back, ${name}. Keep practicing to improve your skills.`;
    } catch (error) {
      console.error('Failed to generate greeting:', error);
      return `Welcome back, ${name}. Let's get to work!`;
    }
  }
}

