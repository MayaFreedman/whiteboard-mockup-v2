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
  sad: ['frown', 'unhappy', 'cry', 'crying', 'tears', 'sob'],
  angry: ['mad', 'rage', 'annoyed'],
  sick: ['ill', 'nausea', 'vomit', 'mask'],
  sleep: ['zzz', 'sleepy', 'snore', 'bed', 'night'],
  laugh: ['haha', 'lol', 'rofl'],
  work: ['job', 'office', 'briefcase', 'suit', 'profession'],
  food: ['snack', 'meal', 'lunch', 'dinner', 'restaurant'],
  coffee: ['espresso', 'latte', 'mug', 'cafe'],
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
const STOP_EXPANDED_TOKENS = new Set<string>([
  'flag', 'flags', 'face', 'emoji', 'smiley', 'expression', 'emotion',
  // Colors (avoid concept bleeding by color words)
  'red','green','blue','orange','yellow','purple','pink','white','black','brown','grey','gray'
]);

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
    const NO_SINGULARIZE = new Set<string>(['tears']);
    const s = NO_SINGULARIZE.has(w) ? null : singularize(w);
    if (s) set.add(s);
    const b = stem(w);
    if (b && b !== w) {
      set.add(b);
      const s2 = NO_SINGULARIZE.has(b) ? null : singularize(b);
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

  // Phrase concepts (handle known multi-word intents)
  const tokenSet = new Set(tokens);
  if (tokenSet.has('red') && tokenSet.has('flag')) {
    add('1f6a9'); // triangular flag codepoint
    add('triangular');
    conceptSet.add('1f6a9');
    conceptSet.add('triangular');
  }

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
  let exactHit = false; // exact name/keyword/code match
  let categoryHit = false;
  let groupHit = false;
  const subgroupRaw = ((((icon as any).subgroup as string) || '') as string).toLowerCase();

  // Direct emoji paste
  if (q.length <= 3 && preview && q.includes(preview)) {
    score += 20; // strong
    strongHit = true;
  }

  // Multi-word strict gating: every token must be covered (exact/prefix/code). For generic 'face', require face subgroup.
  if (directTokens.length >= 2) {
    const isRedFlagQuery = directTokens.includes('red') && (directTokens.includes('flag') || directTokens.includes('flags'));
    let allCovered = directTokens.every((t) => {
      const allowPrefix = t.length >= 4;
      const codeMatch = code && code.toLowerCase() === t;

      // Generic 'face' must be an actual face subgroup
      if (t === 'face' || t === 'faces' || t === 'emoji' || t === 'smiley') {
        return subgroupRaw.startsWith('face');
      }

      const nameExact = nameTokens.includes(t);
      const keyExact = keywordTokens.includes(t);
      const nameStart = allowPrefix && nameTokens.some((w) => w.startsWith(t));
      const keyStart = allowPrefix && keywordTokens.some((w) => w.startsWith(t));

      // Allow direct synonyms only (not broad concepts) to satisfy token coverage
      const syns = SYNONYMS[t] || [];
      const synonymHit = syns.some((s) =>
        nameTokens.includes(s) ||
        keywordTokens.includes(s) ||
        (allowPrefix && (nameTokens.some((w) => w.startsWith(s)) || keywordTokens.some((w) => w.startsWith(s))))
      );

      return nameExact || keyExact || nameStart || keyStart || synonymHit || !!codeMatch;
    });

    // Phrase override: 'red flag' should include triangular red flag (🚩) even if 'red' isn't in the name
    if (!allCovered && isRedFlagQuery) {
      const isTriangularFlag = (code && code.toLowerCase() === '1f6a9') ||
        ((nameTokens.includes('triangular') || keywordTokens.includes('triangular')) &&
         (nameTokens.includes('flag') || keywordTokens.includes('flag')));
      if (isTriangularFlag) allCovered = true;
    }

    if (!allCovered) return 0;
  }

  // If query is like 'happy face', restrict to smiling faces only
  if (directTokens.length >= 2 && directTokens.includes('face') && directTokens.some((t) => POSITIVE_EMOTION_TERMS.has(t))) {
    if (!subgroupRaw.startsWith('face-smiling')) return 0;
  }

  const weighDirect = (t: string) => {
    const nameExact = nameTokens.includes(t);
    const keyExact = keywordTokens.includes(t);
    const nameStart = nameTokens.some((w) => w.startsWith(t));
    const keyStart = keywordTokens.some((w) => w.startsWith(t));
    const nameSub = nameTokens.some((w) => w.includes(t));
    const keySub = keywordTokens.some((w) => w.includes(t));

    if (nameExact) { score += 16; strongHit = true; exactHit = true; }
    if (keyExact) { score += 12; strongHit = true; exactHit = true; }
    const allowPrefix = t.length >= 4;
    if (!nameExact && allowPrefix && nameStart) { score += 8; strongHit = true; }
    if (!keyExact && allowPrefix && keyStart) { score += 6; strongHit = true; }
    // Avoid substring noise for short tokens like 'ice' in 'office' or 'cry' in 'crystal'
    const allowSubstring = t.length >= 4;
    if (allowSubstring && !nameExact && !nameStart && nameSub) { score += 2; strongHit = true; }
    if (allowSubstring && !keyExact && !keyStart && keySub) { score += 2; strongHit = true; }

    if (code && code.toLowerCase() === t) { score += 10; strongHit = true; exactHit = true; }
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
    const allowPrefix = t.length >= 4;
    if (!nameExact && allowPrefix && nameStart) { score += 4; strongHit = true; }
    if (!keyExact && allowPrefix && keyStart) { score += 4; strongHit = true; }
    // Intentionally avoid substring matches for expanded tokens to reduce false positives like
    // 'rage' matching within 'beverage'.

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

  // Emotion strict gating: if query expresses an emotion, restrict to smileys unless we have an exact match
  if (emotionHint && !(subgroupRaw.startsWith('face') || catTokens.includes('smileys') || groupTokens.includes('face'))) {
    if (!exactHit) return 0;
  }

  // Phrase bonus: if all direct tokens appear as exact or prefix in name/keywords, reward
  if (directTokens.length > 1) {
    const phraseHit = directTokens.every((t) =>
      nameTokens.includes(t) ||
      keywordTokens.includes(t) ||
      nameTokens.some((w) => w.startsWith(t)) ||
      keywordTokens.some((w) => w.startsWith(t))
    );
    if (phraseHit) {
      score += 6;
    }
  }

  // Suppress country flags unless query directly asks for flags
  const isFlagCategory = icon.category === 'flags' || catTokens.includes('flags');
  const hasDirectOverlap = directTokens.some((t) => nameTokens.includes(t) || keywordTokens.includes(t));
  const directHasFlag = directTokens.includes('flag') || directTokens.includes('flags');
  if (isFlagCategory && !hasDirectOverlap && !directHasFlag) {
    return 0;
  }

  // Gate: drop weak-only matches; for single specific queries, be strict even if 'generic'
  const isGeneric = directTokens.some((t) => GENERIC_TERMS.has(t));
  const singleSpecific = directTokens.length === 1 && !['food','drink','animal','animals','face','emoji','flags','flag'].includes(directTokens[0]);
  if (score > 0 && !strongHit && (singleSpecific || !isGeneric)) {
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
