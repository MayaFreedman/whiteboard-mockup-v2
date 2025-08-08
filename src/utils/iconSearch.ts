import { IconInfo, getAllIcons, getIconsByCategoryWithCustom } from './iconRegistry';
import { SEARCH_CONCEPTS } from './searchConcepts';
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

function expandQuery(tokens: string[]): { expanded: string[]; concept: string[] } {
  const set = new Set<string>();
  const conceptSet = new Set<string>();

  const stem = (w: string): string | null => {
    if (w.length <= 3) return null;
    if (/ing$/.test(w)) return w.replace(/ing$/, '');
    if (/ers$/.test(w)) return w.replace(/ers$/, 'er');
    if (/er$/.test(w)) return w.replace(/er$/, '');
    if (/ed$/.test(w)) return w.replace(/ed$/, '');
    return null;
  };

  const add = (w: string) => {
    if (!w) return;
    set.add(w);
    const s = singularize(w);
    if (s) set.add(s);
    const b = stem(w);
    if (b && b !== w) {
      set.add(b);
      const s2 = singularize(b);
      if (s2) set.add(s2);
    }
  };

  tokens.forEach((t) => {
    add(t);

    // Synonyms
    Object.entries(SYNONYMS).forEach(([key, vals]) => {
      if (t === key || vals.includes(t)) {
        add(key);
        vals.forEach((v) => add(v));
      }
    });

    // Concepts
    const conceptVals = SEARCH_CONCEPTS[t];
    if (conceptVals && conceptVals.length) {
      conceptVals.forEach((cv) => {
        tokenize(cv).forEach((tok) => {
          add(tok);
          conceptSet.add(tok);
        });
      });
    }
  });

  return { expanded: Array.from(set), concept: Array.from(conceptSet) };
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
  const keywordTokens: string[] = Array.isArray((icon as any).keywords)
    ? ((icon as any).keywords as string[]).flatMap((k) => tokenize(k))
    : [];
  const groupTokens = [
    ...tokenize(((icon as any).group as string) || ''),
    ...tokenize(((icon as any).subgroup as string) || ''),
  ];
  const catTokens = categoryTokens(icon.category);
  const code = getBaseCodeFromIcon(icon);
  return {
    nameTokens,
    keywordTokens,
    groupTokens,
    catTokens,
    code,
    preview: icon.preview,
  };
}

function scoreIcon(
  icon: IconInfo,
  q: string,
  directTokens: string[],
  expandedTokens: string[],
  conceptTokens: string[],
  stage: 1 | 2
): number {
  const { nameTokens, keywordTokens, groupTokens, catTokens, code, preview } = buildIndexFields(icon);
  let score = 0;
  let strongHit = false; // name/keyword/code/emoji
  let categoryHit = false;
  let groupHit = false;

  // Direct emoji paste
  if (q.length <= 3 && preview && q.includes(preview)) {
    score += 20; // strong
    strongHit = true;
  }

  const weighDirect = (t: string) => {
    const nameExact = nameTokens.includes(t);
    const keyExact = keywordTokens.includes(t);
    const nameStart = nameTokens.some((w) => w.startsWith(t));
    const keyStart = keywordTokens.some((w) => w.startsWith(t));
    const nameSub = nameTokens.some((w) => w.includes(t));
    const keySub = keywordTokens.some((w) => w.includes(t));

    if (nameExact) { score += 16; strongHit = true; }
    if (keyExact) { score += 12; strongHit = true; }
    if (!nameExact && nameStart) { score += 8; strongHit = true; }
    if (!keyExact && keyStart) { score += 6; strongHit = true; }
    if (!nameExact && !nameStart && nameSub) { score += 2; strongHit = true; }
    if (!keyExact && !keyStart && keySub) { score += 2; strongHit = true; }

    if (code && code.toLowerCase() === t) { score += 10; strongHit = true; }
  };

  const weighExpanded = (t: string) => {
    const nameExact = nameTokens.includes(t);
    const keyExact = keywordTokens.includes(t);
    const nameStart = nameTokens.some((w) => w.startsWith(t));
    const keyStart = keywordTokens.some((w) => w.startsWith(t));
    const nameSub = nameTokens.some((w) => w.includes(t));
    const keySub = keywordTokens.some((w) => w.includes(t));

    if (nameExact) { score += 6; strongHit = true; }
    if (keyExact) { score += 6; strongHit = true; }
    if (!nameExact && nameStart) { score += 4; strongHit = true; }
    if (!keyExact && keyStart) { score += 4; strongHit = true; }
    if (!nameExact && !nameStart && nameSub) { score += 1; strongHit = true; }
    if (!keyExact && !keyStart && keySub) { score += 1; strongHit = true; }

    if (groupTokens.includes(t)) { score += 3; groupHit = true; }
    if (catTokens.includes(t)) { score += 1; categoryHit = true; }
  };

  // Stage 1: only direct tokens
  directTokens.forEach(weighDirect);

  // Stage 2: expand
  if (stage === 2) {
    expandedTokens.forEach(weighExpanded);

    // Concept nudges
    for (const ct of conceptTokens) {
      const inName = nameTokens.includes(ct);
      const inKey = keywordTokens.includes(ct);
      if (inName || inKey) {
        score += 3;
        strongHit = true;
      }
    }
  }

  // Gate: drop weak-only matches when query isn't generic
  const isGeneric = directTokens.some((t) => GENERIC_TERMS.has(t));
  if (score > 0 && !strongHit && !isGeneric) {
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
  const directTokens = tokenize(q);
  const { expanded: qExpanded, concept: conceptTokens } = expandQuery(directTokens);

  const source: IconInfo[] = options.category
    ? getIconsByCategoryWithCustom(options.category)
    : getAllIcons();

  // Stage 1: direct-only
  let scored = source
    .map((icon) => ({ icon, s: scoreIcon(icon, q, directTokens, [], conceptTokens, 1) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => {
      if (b.s !== a.s) return b.s - a.s;
      if (a.icon.category !== b.icon.category) return a.icon.category.localeCompare(b.icon.category);
      return a.icon.name.localeCompare(b.icon.name);
    })
    .map((x) => x.icon);

  const THRESHOLD = 30;
  if (scored.length >= THRESHOLD) {
    return options.limit ? scored.slice(0, options.limit) : scored;
  }

  // Stage 2: broaden with expansions
  scored = source
    .map((icon) => ({ icon, s: scoreIcon(icon, q, directTokens, qExpanded, conceptTokens, 2) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => {
      if (b.s !== a.s) return b.s - a.s;
      if (a.icon.category !== b.icon.category) return a.icon.category.localeCompare(b.icon.category);
      return a.icon.name.localeCompare(b.icon.name);
    })
    .map((x) => x.icon);

  return options.limit ? scored.slice(0, options.limit) : scored;
}
