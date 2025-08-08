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
  orange: ['tangerine', 'citrus', 'mandarin', '1f34a'],

  // Love/heart
  heart: ['love', 'valentine', 'romance'],
  love: ['heart', 'romance'],
});
