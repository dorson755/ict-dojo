import Groq from 'groq-sdk';

/**
 * Server-side only Groq client.
 * Never import this from a Client Component.
 */
let groqClient: Groq | null = null;

export function getGroqClient(): Groq {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY environment variable is not set.');
    }
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

export const GROQ_MODELS = {
  /** Fast — for exercise/passage generation */
  FAST: 'llama-3.3-70b-versatile',
  /** High quality — for explanations and structured output */
  QUALITY: 'llama-3.1-70b-versatile',
} as const;
