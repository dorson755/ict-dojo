import { AdaptiveGenerator } from './src/domains/typing/generators/AdaptiveGenerator';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  console.log('Testing Groq Generation...');
  const passage = await AdaptiveGenerator.generatePassage({ x: 5, c: 4 }, 20);
  console.log('\nGenerated Passage:\n', passage);
}

run().catch(console.error);
