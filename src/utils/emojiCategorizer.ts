/**
 * Enhanced emoji categorization system
 * Uses Unicode ranges and patterns to automatically categorize emojis
 */

export interface CategoryRule {
  pattern: RegExp | ((filename: string) => boolean);
  category: string | ((filename: string) => string);
  subcategory?: string;
}

/**
 * Categorization rules based on Unicode ranges and patterns
 */
export const categorizationRules: CategoryRule[] = [
  // Flags (regional indicator symbols)
  {
    pattern: /^1F1[E-F][0-9A-F]-1F1[E-F][0-9A-F]\.svg$/i,
    category: 'flags'
  },
  
  // Single regional indicators (standalone flag components)
  {
    pattern: /^1F1[E-F][0-9A-F]\.svg$/i,
    category: 'flags'
  },

  // Skin tone modifiers
  {
    pattern: /-1F3F[B-F](-|\.)/i,
    category: 'people'
  },

  // Gender variants
  {
    pattern: /-200D-264[0-2]-FE0F/i,
    category: 'people'
  },

  // Emoticons & faces (1F600-1F64F)
  {
    pattern: /^1F6[0-4][0-9A-F]\.svg$/i,
    category: 'emotions'
  },

  // People & body (1F440-1F4FF, 1F90F-1F93A, 1F3C0-1F3FF)
  {
    pattern: /^1F(4[4-9A-F][0-9A-F]|90[F]|9[1-3][0-9A-F]|3[C-F][0-9A-F])\.svg$/i,
    category: 'people'
  },

  // Sports & activities
  {
    pattern: /^1F3[C-F][0-9A-F]\.svg$/i,
    category: 'activities'
  },

  // Animals & nature (1F400-1F4FF nature subset, 1F300-1F3BF nature)
  {
    pattern: /^1F(40[0-9A-F]|41[0-9A-F]|42[0-9A-F]|43[0-9A-F]|30[0-9A-F]|31[0-9A-F]|32[0-9A-C]|33[0-9A-F])\.svg$/i,
    category: 'animals'
  },

  // Food & drink (1F32D-1F37F, 1F950-1F96B)
  {
    pattern: /^1F(32[D-F]|3[4-7][0-9A-F]|95[0-9A-F]|96[0-9B])\.svg$/i,
    category: 'food'
  },

  // Travel & places (1F680-1F6FF, 1F6FB-1F6FF)
  {
    pattern: /^1F6[8-9A-F][0-9A-F]\.svg$/i,
    category: 'travel'
  },

  // Objects (1F4A0-1F4FF objects subset, 1F4F0-1F4FF)
  {
    pattern: /^1F4[A-F][0-9A-F]\.svg$/i,
    category: 'objects'
  },

  // Symbols (2600-26FF, 2700-27BF, 1F170-1F251)
  {
    pattern: /^(26[0-9A-F][0-9A-F]|27[0-9A-B][0-9A-F]|1F[12][0-9A-F][0-9A-F])\.svg$/i,
    category: 'symbols'
  },

  // Numbers and letters
  {
    pattern: /^[0-9A-F]{4,5}\.svg$/i,
    category: (filename: string) => {
      const code = filename.replace('.svg', '').toUpperCase();
      if (code.match(/^[0-9]|1F51[0-9]|002[0-9]|003[0-9]/)) return 'symbols';
      if (code.match(/^1F170|1F171|1F17[2-9]|1F18[0-9]|1F19[0-9]|1F1A[0-9]/)) return 'symbols';
      return 'misc';
    }
  }
];

/**
 * Categorize an emoji file based on its filename
 */
export function categorizeEmoji(filename: string): string {
  for (const rule of categorizationRules) {
    if (typeof rule.pattern === 'function') {
      if (rule.pattern(filename)) {
        return typeof rule.category === 'function' ? rule.category(filename) : rule.category;
      }
    } else if (rule.pattern.test(filename)) {
      return typeof rule.category === 'function' ? rule.category(filename) : rule.category;
    }
  }

  // Default categorization based on Unicode ranges
  const codepoint = filename.replace('.svg', '').toUpperCase();
  const firstCode = codepoint.split('-')[0];
  
  if (firstCode.startsWith('1F6')) return 'travel';
  if (firstCode.startsWith('1F5')) return 'objects';
  if (firstCode.startsWith('1F4')) return 'objects';
  if (firstCode.startsWith('1F3')) return 'activities';
  if (firstCode.startsWith('1F2')) return 'symbols';
  if (firstCode.startsWith('26') || firstCode.startsWith('27')) return 'symbols';
  
  return 'misc';
}

/**
 * Get a human-readable name for an emoji based on its codepoint
 */
export function generateEmojiName(filename: string): string {
  const codepoint = filename.replace('.svg', '').toUpperCase();
  
  // Handle complex sequences
  if (codepoint.includes('-200D-')) {
    return `Emoji ${codepoint.replace(/-/g, ' ')}`;
  }
  
  // Handle skin tone variants
  if (codepoint.includes('-1F3F')) {
    const skinTone = codepoint.match(/-1F3F([B-F])/)?.[1];
    const baseName = generateEmojiName(codepoint.split('-1F3F')[0] + '.svg');
    const toneNames = { B: 'light', C: 'medium-light', D: 'medium', E: 'medium-dark', F: 'dark' };
    return `${baseName} (${toneNames[skinTone as keyof typeof toneNames] || ''} skin tone)`;
  }
  
  // Handle flags
  if (codepoint.match(/^1F1[E-F][0-9A-F]-1F1[E-F][0-9A-F]$/)) {
    return `Flag ${codepoint}`;
  }
  
  // Generate generic name
  try {
    const unicodeChar = String.fromCodePoint(parseInt(codepoint.split('-')[0], 16));
    return `Emoji ${unicodeChar}` || `Emoji ${codepoint}`;
  } catch {
    return `Emoji ${codepoint}`;
  }
}