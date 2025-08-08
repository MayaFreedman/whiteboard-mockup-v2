// Curated, compact concept expansions for search. All keys and values must be lowercase and normalized.
export const SEARCH_CONCEPTS: Readonly<Record<string, string[]>> = Object.freeze({
  // Holidays
  christmas: ['santa', 'xmas', 'tree', 'christmas tree', 'gift', 'present', 'holly', 'bell', 'snow', 'snowman'],
  santa: ['christmas', 'xmas'],
  xmas: ['christmas', 'santa'],

  // Water & weather related
  water: ['wave', 'droplet', 'ocean', 'sea', 'rain', 'shower', 'bathtub', 'bath', 'swim', 'swimming', 'surfer', 'surfing'],
  wave: ['water', 'ocean', 'sea'],
  rain: ['umbrella', 'water'],

  // Sports
  golf: ['golfer', 'golfing', 'putt', 'putting', 'putter', 'tee', 'teeing', '26f3'],
  golfer: ['golf', 'golfing'],
  swimming: ['swim', 'swimmer', 'water', 'pool', 'ocean', 'sea'],
  swim: ['swimming', 'swimmer', 'water'],
  surfer: ['surfing', 'water', 'wave'],

  // Celebrations
  party: ['celebration', 'confetti', 'balloon', 'fireworks'],
  celebration: ['party', 'confetti', 'balloon', 'fireworks'],

  // Food & drink
  coffee: ['espresso', 'latte', 'mug', 'cafe'],
  orange: ['tangerine', '1f34a', 'carrot', '1f955'],

  // Love/heart
  heart: ['love', 'valentine', 'romance'],
  love: ['heart', 'romance'],

  // Colors (query-side only via items/codepoints; no back-link to items)
  purple: ['grape', '1f347', 'eggplant', 'aubergine', '1f346', '1f49c', 'devil', 'smiling face with horns', 'angry face with horns', '1f608', '1f47f'],
  red: ['2764', 'strawberry', '1f353', 'tomato', '1f345', 'cherries', '1f352', 'devil', 'smiling face with horns', 'angry face with horns', '1f608', '1f47f', 'angry face', 'pouting face', '1f620', '1f621'],
  blue: ['1f499', 'droplet', 'water droplet', '1f4a7', 'cold face', '1f976'],
  green: ['1f49a', '1f34f', 'avocado', '1f951', 'broccoli', '1f966', '26f3'],
  yellow: ['1f49b', 'banana', '1f34c', 'lemon', '1f34b', 'sun', '1f31e'],
  orange_color: ['1f9e1', '1f34a', 'tangerine', 'carrot', '1f955', 'pumpkin', 'jack o lantern', '1f383', 'fox', '1f98a'],
  black: ['1f5a4'],
  white: ['1f90d'],
  brown: ['1f90e', 'poop', 'poo', 'pile of poo', '1f4a9', 'chocolate', 'chocolate bar', '1f36b', 'bear', 'bear face', '1f43b', 'cookie', '1f36a'],
});
