import styles from './study.module.css';

export default function StudyText({ text, example = false }: { text: string; example?: boolean }) {
  if (example) return <pre className={styles.example}>{text}</pre>;
  const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
  const numbered = paragraphs.length > 0 && paragraphs.every((line) => /^\d+\.\s/.test(line));
  if (numbered) {
    return (
      <ol className={styles.steps}>
        {paragraphs.map((line, index) => (
          <li key={index}>{line.replace(/^\d+\.\s/, '')}</li>
        ))}
      </ol>
    );
  }
  return (
    <div className={styles.prose}>
      {paragraphs.map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </div>
  );
}
