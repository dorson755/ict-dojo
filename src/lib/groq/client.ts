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
  FAST: 'openai/gpt-oss-20b',
  /** High quality — for explanations and structured output */
  QUALITY: 'openai/gpt-oss-120b',
} as const;

// The previous llama-3.x models were decommissioned by Groq; every generation
// silently fell back to the local dictionary until this was updated. Verify a
// model still exists here before swapping it: `groq.models.list()`.
