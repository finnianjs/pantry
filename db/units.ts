export const UNITS = [
  '',
  'tsp',
  'tbsp',
  'cup',
  'oz',
  'lb',
  'g',
  'kg',
  'ml',
  'l',
  'can',
  'bag',
  'bunch',
  'clove',
  'slice',
  'piece',
  'pinch',
  'dash',
] as const;

export type Unit = (typeof UNITS)[number];
