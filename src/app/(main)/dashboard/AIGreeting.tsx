import { ContentGenerator } from '@/lib/groq/content-generator';
import styles from './dashboard.module.css';

interface AIGreetingProps {
  name: string;
  weakKeys: string[];
  streak: number;
}

export default async function AIGreeting({ name, weakKeys, streak }: AIGreetingProps) {
  // Generate greeting dynamically using Groq on the server side
  const greeting = await ContentGenerator.generateDashboardGreeting(name, weakKeys, streak);

  return (
    <div className={styles.aiGreeting}>
      <p className={styles.greetingText}>{greeting}</p>
    </div>
  );
}
