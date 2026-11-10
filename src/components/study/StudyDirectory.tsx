'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { StudySubjectSummary } from '@/domains/study/catalog';
import styles from './study.module.css';

export default function StudyDirectory({ subjects }: { subjects: StudySubjectSummary[] }) {
  const [qualification, setQualification] = useState('bgcse');
  const [query, setQuery] = useState('');
  const visible = subjects.filter(
    (subject) =>
      subject.qualification === qualification &&
      `${subject.name} ${subject.group}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const groups = [...new Set(visible.map((subject) => subject.group))];

  return (
    <section aria-label="Subject directory">
      <div className={styles.filters}>
        <div className={styles.choices} role="group" aria-label="Qualification">
          {['bgcse', 'bjc'].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={qualification === value}
              onClick={() => setQualification(value)}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>
        <div className={styles.search}>
          <label htmlFor="study-search">Find a subject</label>
          <input
            id="study-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Subject or category"
          />
        </div>
      </div>
      <p className={styles.muted} role="status">
        {visible.length} subjects in {qualification.toUpperCase()}
      </p>
      {groups.map((group) => (
        <section key={group} className={styles.subjectGroup} aria-label={group}>
          <h2>{group}</h2>
          <ul className={styles.subjectList}>
            {visible
              .filter((subject) => subject.group === group)
              .map((subject) => (
                <li key={subject.id}>
                  <Link href={`/study/${qualification}/${subject.id}`}>
                    <span>{subject.name}</span>
                    <span className={subject.sessionCount ? styles.available : styles.muted}>
                      {subject.sessionCount
                        ? `${subject.sessionCount} sessions available`
                        : 'Coming soon'}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
      {!visible.length && (
        <p className={styles.notice}>
          No subjects match “{query}”. Try another name or clear your search.
        </p>
      )}
    </section>
  );
}
