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

  // Colors (strict: only explicit color items and codepoints)
  purple: ['1f49c', '1f7e3', '1f7ea'], // purple heart, circle, square
  red: ['2764', '1f534', '1f7e5'], // red heart, circle, square
  blue: ['1f499', '1f535', '1f7e6'], // blue heart, circle, square
  green: ['1f49a', '1f7e2'], // green heart, circle
  yellow: ['1f49b', '1f7e1', '1f7e8'], // yellow heart, circle, square
  orange_color: ['1f9e1', '1f7e0', '1f7e7'], // orange heart, circle, square
  black: ['1f5a4', '26ab', '2b1b', '25fc'], // black heart, circle, squares
  white: ['1f90d', '26aa', '2b1c'], // white heart, circle, large square
  brown: ['1f90e', '1f7e4', '1f7eb'], // brown heart, circle, square
});
