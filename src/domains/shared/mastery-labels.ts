const LEVEL_NAME: Record<string, string> = {
  not_started: 'Not started',
  weak: 'Weak',
  developing: 'Developing',
  strong: 'Strong',
  mastered: 'Mastered',
};

export function masteryLevelName(level: string): string {
  return LEVEL_NAME[level] ?? 'Not started';
}
