'use client';

import { useState } from 'react';
import type { StudyVideo as Video } from '@/domains/study/catalog';
import styles from './study.module.css';

export default function StudyVideo({ video }: { video: Video }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <article className={styles.video}>
      {loaded ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.id}`}
          title={video.title}
          loading="lazy"
          allow="encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <div className={styles.videoPlaceholder}>
          <p>{video.title}</p>
          <button type="button" className={styles.button} onClick={() => setLoaded(true)}>
            Load video
          </button>
          <small>Loading connects to YouTube. No video loads until you choose.</small>
        </div>
      )}
      <h3>{video.title}</h3>
      <p>{video.note}</p>
      <a
        href={`https://www.youtube.com/watch?v=${video.id}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Watch on YouTube (new tab)
      </a>
    </article>
  );
}
