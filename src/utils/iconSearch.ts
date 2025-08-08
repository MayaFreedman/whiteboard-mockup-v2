import { IconInfo, getAllIcons, getIconsByCategoryWithCustom } from './iconRegistry';

// Normalize string: lowercase, remove diacritics, collapse punctuation
function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // diacritics
    .replace(/[._/]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(input: string): string[] {
  const n = normalize(input);
  return n ? n.split(' ') : [];
}

// Basic synonyms/intents map
const SYNONYMS: Record<string, string[]> = {
  heart: ['love', 'valentine', 'romance', 'heart'],
  smile: ['happy', 'grin', 'smiley', 'joy', 'lol', 'face'],
  sad: ['frown', 'unhappy', 'cry', 'tear', 'sob', 'face'],
  angry: ['mad', 'rage', 'annoyed', 'face'],
  sick: ['ill', 'nausea', 'vomit', 'mask', 'face'],
  sleep: ['zzz', 'sleepy', 'snore', 'bed', 'night'],
  laugh: ['haha', 'lol', 'rofl', 'face'],
  work: ['job', 'office', 'briefcase', 'suit', 'profession'],
  food: ['drink', 'snack', 'meal', 'lunch', 'dinner', 'restaurant'],
  coffee: ['tea', 'cafe', 'espresso', 'latte', 'cup', 'drink'],
  weather: ['sun', 'rain', 'cloud', 'snow', 'storm', 'umbrella', 'wind'],
  animal: ['dog', 'cat', 'bird', 'fish', 'monkey', 'pet', 'animals'],
  face: ['emoji', 'smiley', 'expression', 'emotion'],
  flag: ['country', 'nation', 'banner'],
  star: ['favorite', 'favourite', 'rating'],
  check: ['tick', 'ok', 'done', 'confirm'],
  cross: ['x', 'close', 'cancel', 'delete'],
};

function expandTokens(tokens: string[]): string[] {
  const set = new Set<string>();
  tokens.forEach((t) => {
    set.add(t);
    Object.entries(SYNONYMS).forEach(([key, vals]) => {
      if (t === key || vals.includes(t)) {
        set.add(key);
        vals.forEach((v) => set.add(v));
      }
    });
  });
  return Array.from(set);
}

function categoryTokens(category: string): string[] {
  const parts = category.split('-');
  const extra: string[] = [];
  if (category === 'smileys-emotion') extra.push('smileys', 'emotion', 'faces', 'face');
  if (category === 'people-body') extra.push('people', 'body', 'person', 'profession');
  if (category === 'animals-nature') extra.push('animals', 'nature');
  if (category === 'food-drink') extra.push('food', 'drink');
  if (category === 'objects-tools') extra.push('objects', 'tools');
  if (category === 'activities-events') extra.push('activities', 'events');
  if (category === 'travel-places') extra.push('travel', 'places');
  return [...parts, ...extra].map(normalize);
}

function getBaseCodeFromIcon(icon: IconInfo): string | null {
  const p = icon.path;
  if (p.startsWith('data:')) return null;
  const file = p.split('/').pop() || '';
  const id = file.replace('.png', '');
  const base = id.split('-')[0].toUpperCase().replace('FE0F', '');
  return base || null;
}

function buildIndexFields(icon: IconInfo) {
  const nameTokens = tokenize(icon.name);
  const catTokens = categoryTokens(icon.category);
  const code = getBaseCodeFromIcon(icon);
  return {
    nameTokens,
    catTokens,
    code,
    preview: icon.preview,
  };
}

function scoreIcon(icon: IconInfo, q: string, qTokens: string[], qExpanded: string[]): number {
  const { nameTokens, catTokens, code, preview } = buildIndexFields(icon);
  let score = 0;

  // Direct emoji paste
  if (q.length <= 3 && preview && q.includes(preview)) score += 12;

  for (const t of qTokens) {
    const tStart = nameTokens.some((w) => w.startsWith(t));
    const tExact = nameTokens.includes(t);
    const tSub = nameTokens.some((w) => w.includes(t));

    if (tExact) score += 8;
    else if (tStart) score += 6;
    else if (tSub) score += 3;

    if (catTokens.includes(t)) score += 2;
    if (code && code.toLowerCase() === t) score += 2;
  }

  for (const t of qExpanded) {
    if (nameTokens.includes(t)) score += 3;
    else if (catTokens.includes(t)) score += 2;
  }

  // Small boosts based on known patterns
  if (icon.category === 'smileys-emotion' && (qExpanded.includes('face') || qExpanded.includes('smile'))) {
    score += 2;
  }
  if (icon.category === 'food-drink' && (qExpanded.includes('food') || qExpanded.includes('coffee'))) {
    score += 2;
  }

  return score;
}

export interface SearchOptions {
  category?: string; // limit to a category
  limit?: number;
}

export function searchIcons(query: string, options: SearchOptions = {}): IconInfo[] {
  const q = normalize(query);
  if (!q) return [];
  const qTokens = tokenize(q);
  const qExpanded = expandTokens(qTokens);

  const source: IconInfo[] = options.category
    ? getIconsByCategoryWithCustom(options.category)
    : getAllIcons();

  const scored = source
    .map((icon) => ({ icon, s: scoreIcon(icon, q, qTokens, qExpanded) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => {
      if (b.s !== a.s) return b.s - a.s;
      if (a.icon.category !== b.icon.category) return a.icon.category.localeCompare(b.icon.category);
      return a.icon.name.localeCompare(b.icon.name);
    })
    .map((x) => x.icon);

  return options.limit ? scored.slice(0, options.limit) : scored;
}
