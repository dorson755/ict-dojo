/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import StudyDirectory from '../StudyDirectory';
import StudyVideo from '../StudyVideo';
import { studySubjects } from '@/domains/study/catalog';
import SubjectStudyPage from '@/app/(main)/study/[qualification]/[subject]/page';
import StudySessionPage from '@/app/(main)/study/[qualification]/[subject]/[session]/page';
import TeacherGuide from '@/app/(main)/study/[qualification]/[subject]/teacher-guide/page';

jest.mock('../study.module.css', () => ({}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));
jest.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

it('switches between the complete qualification directories', () => {
  act(() =>
    root.render(<StudyDirectory subjects={[...studySubjects('bgcse'), ...studySubjects('bjc')]} />),
  );
  expect(host.querySelector('[role="status"]')?.textContent).toBe('26 subjects in BGCSE');
  expect(host.querySelector('a[href="/study/bgcse/keyboarding"]')?.textContent).toContain(
    '25 sessions available',
  );
  act(() => host.querySelectorAll('button')[1].click());
  expect(host.querySelector('[role="status"]')?.textContent).toBe('11 subjects in BJC');
  expect(host.querySelector('a[href="/study/bgcse/keyboarding"]')).toBeNull();
  expect(host.querySelector('a[href="/study/bjc/general-science"]')).not.toBeNull();
  expect(host.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
});

it('loads no third-party video until explicitly requested and supplies a fallback link', () => {
  act(() =>
    root.render(
      <StudyVideo
        video={{ id: 'mXWvKHWe2Co', title: 'Word spacing', note: 'Practice spacing.' }}
      />,
    ),
  );
  expect(host.querySelector('iframe')).toBeNull();
  expect(host.querySelector('a')?.href).toBe('https://www.youtube.com/watch?v=mXWvKHWe2Co');
  act(() => host.querySelector('button')!.click());
  const iframe = host.querySelector('iframe')!;
  expect(iframe.src).toBe('https://www.youtube-nocookie.com/embed/mXWvKHWe2Co');
  expect(iframe.title).toBe('Word spacing');
});

it('renders all sessions, source limitations and public teacher guidance', async () => {
  const page = await SubjectStudyPage({
    params: Promise.resolve({ qualification: 'bgcse', subject: 'keyboarding' }),
  });
  act(() => root.render(page));
  expect(host.querySelectorAll('ol li')).toHaveLength(25);
  expect(host.textContent).toContain('Page 8 gives Paper 1 as 2½ hours; page 10 gives 2 hours');
  expect(host.textContent).toContain('do not yet teach every item');
  expect(host.querySelector('a[href="/study/bgcse/keyboarding/teacher-guide"]')).not.toBeNull();
});

it('keeps unavailable libraries honest and links to the matching paper archive', async () => {
  const page = await SubjectStudyPage({
    params: Promise.resolve({ qualification: 'bjc', subject: 'mathematics' }),
  });
  act(() => root.render(page));
  expect(host.textContent).toContain('no lessons are published yet');
  expect(host.querySelector('a[href="/past-papers?exam=bjc"]')).not.toBeNull();
});

it('renders lesson notes, video resources and sequential navigation', async () => {
  const page = await StudySessionPage({
    params: Promise.resolve({
      qualification: 'bgcse',
      subject: 'keyboarding',
      session: 'session-18',
    }),
  });
  act(() => root.render(page));
  expect(host.textContent).toContain('47 NWPM');
  expect(host.textContent).toContain('not a verified official BGCSE formula');
  expect(host.querySelector('a[href="/study/bgcse/keyboarding/session-17"]')).not.toBeNull();
  expect(host.querySelector('a[href="/study/bgcse/keyboarding/session-19"]')).not.toBeNull();
  expect(host.querySelector('iframe')).toBeNull();
});

it('renders all teaching plans and explains the distinct sequence', async () => {
  const page = await TeacherGuide({
    params: Promise.resolve({ qualification: 'bgcse', subject: 'keyboarding' }),
  });
  act(() => root.render(page));
  expect(host.querySelectorAll('details')).toHaveLength(26);
  expect(host.textContent).toContain('do not match these two sequences by number');
  expect(host.textContent).toContain('separate extended sittings');
});

it('returns not-found for invalid subjects, sessions and teacher guides', async () => {
  await expect(
    SubjectStudyPage({ params: Promise.resolve({ qualification: 'bjc', subject: 'keyboarding' }) }),
  ).rejects.toThrow('NOT_FOUND');
  await expect(
    StudySessionPage({
      params: Promise.resolve({
        qualification: 'bgcse',
        subject: 'keyboarding',
        session: 'session-26',
      }),
    }),
  ).rejects.toThrow('NOT_FOUND');
  await expect(
    TeacherGuide({ params: Promise.resolve({ qualification: 'bgcse', subject: 'biology' }) }),
  ).rejects.toThrow('NOT_FOUND');
});
