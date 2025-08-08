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

function singularize(t: string): string | null {
  if (t.length <= 3) return null;
  if (t.endsWith('ies')) return t.slice(0, -3) + 'y';
  if (/(ses|xes|zes|ches|shes)$/.test(t)) return t.slice(0, -2);
  if (t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1);
  return null;
}

// Basic synonyms/intents map (kept tight to avoid over-expansion)
const SYNONYMS: Record<string, string[]> = {
  heart: ['love', 'valentine', 'romance'],
  smile: ['happy', 'grin', 'smiley', 'joy', 'lol', 'face'],
  sad: ['frown', 'unhappy', 'cry', 'tear', 'sob', 'face'],
  angry: ['mad', 'rage', 'annoyed', 'face'],
  sick: ['ill', 'nausea', 'vomit', 'mask', 'face'],
  sleep: ['zzz', 'sleepy', 'snore', 'bed', 'night'],
  laugh: ['haha', 'lol', 'rofl', 'face'],
  work: ['job', 'office', 'briefcase', 'suit', 'profession'],
  food: ['snack', 'meal', 'lunch', 'dinner', 'restaurant', 'drink'],
  coffee: ['espresso', 'latte', 'cup', 'cafe', 'drink'],
  weather: ['sun', 'rain', 'cloud', 'snow', 'storm', 'umbrella', 'wind'],
  animal: ['animals', 'pet', 'wildlife'],
  face: ['emoji', 'smiley', 'expression', 'emotion'],
  flag: ['country', 'nation', 'banner'],
  star: ['favorite', 'favourite', 'rating'],
  check: ['tick', 'ok', 'done', 'confirm'],
  cross: ['x', 'close', 'cancel', 'delete'],
  dog: ['puppy', 'doggo', 'hound', 'pup', 'canine'],
  cat: ['kitty', 'kitten', 'feline'],
  pig: ['hog', 'boar', 'piggy', 'swine'],
  bird: ['avian', 'birdie'],
  fish: ['seafood'],
};

const GENERIC_TERMS = new Set<string>([
  'face','emoji','smile','smileys','emotion',
  'animal','animals','pet','wildlife',
  'food','drink','coffee',
  'weather','sun','rain','cloud','snow','storm','umbrella','wind',
  'flag','country','nation','banner',
  'star','check','cross',
  'people','person','body','objects','tools','travel','places','activities','events',
]);

function expandTokens(tokens: string[]): string[] {
  const set = new Set<string>();
  const add = (w: string) => {
    set.add(w);
    const s = singularize(w);
    if (s) set.add(s);
  };
  tokens.forEach((t) => {
    add(t);
    Object.entries(SYNONYMS).forEach(([key, vals]) => {
      if (t === key || vals.includes(t)) {
        add(key);
        vals.forEach((v) => add(v));
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
  let nameMatch = false;
  let codeMatch = false;
  let emojiMatch = false;
  let categoryHit = false;

  // Direct emoji paste
  if (q.length <= 3 && preview && q.includes(preview)) {
    score += 12;
    emojiMatch = true;
  }

  for (const t of qTokens) {
    const tExact = nameTokens.includes(t);
    const tStart = nameTokens.some((w) => w.startsWith(t));
    const tSub = nameTokens.some((w) => w.includes(t));

    if (tExact) { score += 10; nameMatch = true; }
    else if (tStart) { score += 6; nameMatch = true; }
    else if (tSub) { score += 2; nameMatch = true; }

    if (catTokens.includes(t)) { score += 1; categoryHit = true; }
    if (code && code.toLowerCase() === t) { score += 3; codeMatch = true; }
  }

  for (const t of qExpanded) {
    if (nameTokens.includes(t)) { score += 2; nameMatch = true; }
    else if (catTokens.includes(t)) { score += 1; categoryHit = true; }
  }

  // Small contextual nudges
  if (icon.category === 'smileys-emotion' && (qExpanded.includes('face') || qExpanded.includes('smile'))) {
    score += 1;
  }
  if (icon.category === 'food-drink' && (qExpanded.includes('food') || qExpanded.includes('coffee'))) {
    score += 1;
  }

  // Gate: drop category-only matches for specific queries
  const isGeneric = qTokens.some((t) => GENERIC_TERMS.has(t));
  if (score > 0 && !nameMatch && !codeMatch && !emojiMatch && !isGeneric) {
    return 0;
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
