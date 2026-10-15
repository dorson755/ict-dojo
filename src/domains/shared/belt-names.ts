const BELT_NAMES = [
  'White', 'Yellow', 'Orange', 'Green',
  'Blue', 'Purple', 'Brown', 'Black',
] as const;

export function getBeltName(belt: number): string {
  return BELT_NAMES[belt] ?? 'White';
}
