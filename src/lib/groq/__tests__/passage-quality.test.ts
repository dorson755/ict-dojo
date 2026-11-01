import { assessPassage, sanitizePassage } from '../passage-quality';

describe('sanitizePassage', () => {
  it('leaves a plain passage untouched', () => {
    const plain = 'Sam typed the odd symbol slowly and the class clapped.';
    expect(sanitizePassage(plain)).toBe(plain);
  });

  it('strips markdown code fences', () => {
    expect(sanitizePassage('```\nconst msg = "hello";\n```')).toBe('const msg = "hello";');
    expect(sanitizePassage('```html\nconst msg = "hello";\n```')).toBe('const msg = "hello";');
  });

  it('strips surrounding quotes', () => {
    expect(sanitizePassage('"the quick brown fox"')).toBe('the quick brown fox');
  });

  it('drops a preamble line when real text follows', () => {
    expect(
      sanitizePassage('Here is your passage:\nthe quick brown fox jumps over the lazy dog today.'),
    ).toBe('the quick brown fox jumps over the lazy dog today.');
    expect(
      sanitizePassage('Sure! Here you go:\nthe quick brown fox jumps over the lazy dog today.'),
    ).toBe('the quick brown fox jumps over the lazy dog today.');
  });

  it('keeps a short "here is" sentence that is the whole answer rather than a preamble', () => {
    expect(sanitizePassage('Here is my short answer.')).toBe('Here is my short answer.');
  });
});

describe('assessPassage', () => {
  const MIN = 100;
  const MAX = 140;

  it('accepts a passage of the right length that uses the target characters', () => {
    const passage =
      'the fox jumps over the lazy dog again and again, because the odd task keeps it going strong';
    const quality = assessPassage(passage, ['o', 't', 's'], MIN, MAX);
    expect(quality.ok).toBe(true);
    expect(quality.coverage).toBe(1);
  });

  it('accepts when most targets appear, since one odd symbol can slip', () => {
    const passage =
      'the fox jumps over the lazy dog again and again, because the odd task keeps it going strong';
    expect(assessPassage(passage, ['o', 't', 's', 'q', 'z'], MIN, MAX).ok).toBe(true);
  });

  it('rejects a passage missing most of the targets', () => {
    const passage =
      'zzz zzz zzz zzz zzz zzz zzz zzz zzz zzz zzz zzz zzz zzz zzz zzz zzz zzz zzz zzz zzz zzz';
    const quality = assessPassage(passage, ['o', 't', 's'], MIN, MAX);
    expect(quality.ok).toBe(false);
    expect(quality.reasons).toContain('missing-targets');
    expect(quality.coverage).toBe(0);
  });

  it('rejects empty, too-short, and wildly too-long passages', () => {
    expect(assessPassage('', ['a'], MIN, MAX).reasons).toContain('empty');
    expect(assessPassage('too short', ['a'], MIN, MAX).reasons).toContain('too-short');
    const long = 'a'.repeat(MAX * 4 + 1);
    expect(assessPassage(long, ['a'], MIN, MAX).reasons).toContain('too-long');
  });

  it('ignores whitespace-only targets when scoring coverage', () => {
    const passage =
      'the fox jumps over the lazy dog again and again, because the odd task keeps it going strong';
    const quality = assessPassage(passage, [' ', '  '], MIN, MAX);
    expect(quality.coverage).toBe(1);
    expect(quality.ok).toBe(true);
  });

  it('only checks length when no targets were requested', () => {
    expect(
      assessPassage(
        'the fox jumps over the lazy dog again and again, because the odd task keeps it going',
        [],
        MIN,
        MAX,
      ).ok,
    ).toBe(true);
  });
});
