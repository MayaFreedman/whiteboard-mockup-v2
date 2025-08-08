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
  smile: ['happy', 'grin', 'smiley', 'joy', 'lol'],
  sad: ['frown', 'unhappy', 'cry', 'tear', 'sob'],
  angry: ['mad', 'rage', 'annoyed'],
  sick: ['ill', 'nausea', 'vomit', 'mask'],
  sleep: ['zzz', 'sleepy', 'snore', 'bed', 'night'],
  laugh: ['haha', 'lol', 'rofl'],
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

// Tokens we should not promote when coming from expansions (avoid broad matches)
const STOP_EXPANDED_TOKENS = new Set<string>(['flag', 'flags', 'face', 'emoji', 'smiley', 'expression', 'emotion']);

// Negative sentiment/meaning opposites to nudge down irrelevant results
const NEGATIVE_SYNONYMS: Readonly<Record<string, string[]>> = Object.freeze({
  happy: ['sad', 'angry', 'annoyed', 'frown', 'cry', 'tear', 'sob', 'sick', 'ill'],
  smile: ['sad', 'angry', 'annoyed', 'frown', 'cry'],
  laugh: ['sad', 'angry'],
  sad: ['happy', 'smile', 'laugh', 'joy'],
  angry: ['happy', 'smile', 'laugh', 'joy'],
});

// Emotion classification helpers
const POSITIVE_EMOTION_TERMS = new Set<string>(['happy','smile','smiley','grin','joy','laugh','lol','rofl','love','heart']);
const NEGATIVE_EMOTION_QUERY_TERMS = new Set<string>(['sad','unhappy','cry','tear','sob','angry','mad','annoyed']);
function classifyEmotionQuery(tokens: string[]): 'positive' | 'negative' | 'angry' | null {
  for (const t of tokens) {
    if (POSITIVE_EMOTION_TERMS.has(t)) return 'positive';
    if (t === 'sad' || t === 'unhappy' || t === 'cry' || t === 'tear' || t === 'sob') return 'negative';
    if (t === 'angry' || t === 'mad' || t === 'annoyed' || t === 'rage') return 'angry';
  }
  return null;
}

function expandQuery(tokens: string[]): { expanded: string[]; concept: string[]; negative: string[] } {
  const set = new Set<string>();
  const conceptSet = new Set<string>();
  const negativeSet = new Set<string>();

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

    // Negatives
    const negVals = NEGATIVE_SYNONYMS[t];
    if (negVals && negVals.length) {
      negVals.forEach((nv) => tokenize(nv).forEach((tok) => negativeSet.add(tok)));
    }

    // Concepts
    const conceptVals = SEARCH_CONCEPTS[t];
    if (conceptVals && conceptVals.length) {
      conceptVals.forEach((cv) => {
        tokenize(cv).forEach((tok) => {
          if (STOP_EXPANDED_TOKENS.has(tok)) return; // avoid overly generic tokens
          add(tok);
          conceptSet.add(tok);
        });
      });
    }
  });

  return { expanded: Array.from(set), concept: Array.from(conceptSet), negative: Array.from(negativeSet) };
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
  negativeTokens: string[],
  emotionHint: 'positive' | 'negative' | 'angry' | null,
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
    if (STOP_EXPANDED_TOKENS.has(t)) return; // don't let generic tokens dominate

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

  // Emotion-aware adjustments
  const subgroupRaw = ((((icon as any).subgroup as string) || '') as string).toLowerCase();
  if (emotionHint === 'positive') {
    const positiveSubgroups = new Set(['face-smiling', 'face-affection']);
    const negativeSubgroups = new Set(['face-negative','face-concerned','face-neutral-skeptical','face-unwell','face-sleeping','face-sleepy']);
    if (positiveSubgroups.has(subgroupRaw)) {
      score += 6;
    }
    if (negativeSubgroups.has(subgroupRaw)) {
      const hasDirectPositiveToken = nameTokens.some((w)=>POSITIVE_EMOTION_TERMS.has(w)) || keywordTokens.some((w)=>POSITIVE_EMOTION_TERMS.has(w));
      score -= hasDirectPositiveToken ? 4 : 12;
    }
  }

  // Apply negative sentiment dampening (broader match; stronger for positive queries)
  const hasNegative =
    negativeTokens.some((t) =>
      nameTokens.some((w) => w === t || w.startsWith(t) || w.includes(t)) ||
      keywordTokens.some((w) => w === t || w.startsWith(t) || w.includes(t))
    );
  if (hasNegative) {
    score -= emotionHint === 'positive' ? 12 : 8;
  }

  // Suppress country flags unless query directly asks for flags
  const isFlagCategory = icon.category === 'flags' || catTokens.includes('flags');
  const hasDirectOverlap = directTokens.some((t) => nameTokens.includes(t) || keywordTokens.includes(t));
  const directHasFlag = directTokens.includes('flag') || directTokens.includes('flags');
  if (isFlagCategory && !hasDirectOverlap && !directHasFlag) {
    return 0;
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
  const { expanded: qExpanded, concept: conceptTokens, negative: negativeTokens } = expandQuery(directTokens);
  const emotionHint = classifyEmotionQuery(directTokens);

  const source: IconInfo[] = options.category
    ? getIconsByCategoryWithCustom(options.category)
    : getAllIcons();

  // Stage 1: direct-only
  let scored = source
    .map((icon) => ({ icon, s: scoreIcon(icon, q, directTokens, [], conceptTokens, negativeTokens, emotionHint, 1) }))
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
    .map((icon) => ({ icon, s: scoreIcon(icon, q, directTokens, qExpanded, conceptTokens, negativeTokens, emotionHint, 2) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => {
      if (b.s !== a.s) return b.s - a.s;
      if (a.icon.category !== b.icon.category) return a.icon.category.localeCompare(b.icon.category);
      return a.icon.name.localeCompare(b.icon.name);
    })
    .map((x) => x.icon);

  return options.limit ? scored.slice(0, options.limit) : scored;
}
