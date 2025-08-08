/**
 * Auto-generates complete PNG emoji registry from /public/png-emojis directory
 * Scans all PNG files and categorizes them properly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// FIXED: Enhanced semantic category system with explicit emoji mappings
// Addresses categorization issues like religious buildings in "animals" and teddy bear in "vehicles"
const EXPLICIT_EMOJI_MAPPINGS = {
  // Religious symbols and buildings (FIXED: no longer in "animals")
  'religious': [
    '1F54B', '1F54C', '1F54D', // Mosque, synagogue, menorah  
    '1F6D0', '1F6D5', // Place of worship, Hindu temple
    '26EA', '26CE', // Church, Ophiuchus
    '1F52F', // Six-pointed star
    '262A', '262B', '262C', // Star and crescent, orthodox cross, hammer and sickle
    '2721', '2626', // Star of David, orthodox cross
    '1F549', // Om symbol
    '2638', '262F', // Wheel of dharma, yin yang
  ],

  // Toys and dolls (FIXED: teddy bear and similar items properly categorized)
  'toys': [
    '1F9F8', // Teddy bear (FIXED: was incorrectly in vehicles)
    '1FA86', // Nesting dolls
    '1F3B2', // Game die
    '1F52E', // Crystal ball
    '1F0CF', // Joker
    '1F3AF', // Direct hit
    '1F9E9', // Puzzle piece
    '1FA70', '1FA71', '1FA72', // Ballet shoes, one-piece swimsuit, briefs
  ],

  // Clothing and accessories (separate from people/objects)
  'clothing': [
    '1F451', '1F452', '1F453', '1F454', '1F455', '1F456', '1F457', '1F458',
    '1F459', '1F45A', '1F45B', '1F45C', '1F45D', '1F45E', '1F45F', // Basic clothing
    '1F460', '1F461', '1F462', // Shoes
    '1F576', // Sunglasses
    '1F392', // School backpack
    '1F45B', // Purse
    '1F9E5', '1F9E6', '1F9E7', '1F9E8', '1F9E9', '1F9EA', // Socks to briefs
    '1F97B', '1F97C', '1F97D', '1F97E', '1F97F', // Sari to flat shoe
  ],

  // Household items (FIXED: better separation from vehicles)
  'household': [
    '1F6CF', '1F6CB', // Bed, couch and lamp
    '1F37D', // Fork and knife with plate
    '1F9F4', '1F9F5', '1F9F6', '1F9F7', // Lotion bottle, thread, yarn, safety pin
    '1F9FA', // Basket
    '1F6BF', '1F6C0', '1F6C1', // Shower, bath, bathtub
    '1F9FC', '1F9FD', '1F9FE', '1F9FF', // Soap, sponge, receipt, nazar amulet
    '1FA91', '1FA92', '1FA93', // Chair, luggage, window
    '1FAA0', '1FAA1', '1FAA2', '1FAA3', // Plunger, sewing needle, knot, bucket
  ],

  // Celebrations & Events
  'celebrations': [
    '1F380', '1F381', '1F382', '1F383', '1F384', '1F385', '1F386', '1F387', 
    '1F388', '1F389', '1F38A', '1F38B', '1F38C', '1F38D', '1F38E', '1F38F',
    '1F390', '1F391', '1F392', '1F393', '1F396', '1F397',
    '1F973', '1F972', // Party faces
    '1F9E8', // Firecracker
  ],
  
  // Sports & Recreation
  'sports': [
    '1F3C0', '1F3C1', '1F3C2', '1F3C3', '1F3C4', '1F3C5', '1F3C6', '1F3C7',
    '1F3C8', '1F3C9', '1F3CA', '1F3CB', '1F3CC', '1F3CD', '1F3CE', '1F3CF',
    '1F940', '1F941', '1F942', '1F943', '1F944', '1F945', '1F947', '1F948', 
    '1F949', '1F94A', '1F94B', '1F94C', '1F94D', '1F94E', '1F94F', '1F93A',
    '1F93C', '1F93D', '1F93E', '26BD', '26BE', '26F3', // Soccer, baseball, golf
  ],

  // Music & Entertainment
  'entertainment': [
    '1F3A0', '1F3A1', '1F3A2', '1F3A3', '1F3A4', '1F3A5', '1F3A6', '1F3A7',
    '1F3A8', '1F3A9', '1F3AA', '1F3AB', '1F3AC', '1F3AD', '1F3AE', '1F3AF',
    '1F3B0', '1F3B1', '1F3B2', '1F3B3', '1F3B4', '1F3B5', '1F3B6', '1F3B7',
    '1F3B8', '1F3B9', '1F3BA', '1F3BB', '1F3BC', '1F3BD', '1F3BE', '1F3BF',
    '1F39E', '1F39F', '1F579', '2660', '2663', '2665', '2666', // Cards
  ],

  // Buildings & Places (FIXED: religious buildings moved to religious category)
  'places': [
    '1F3E0', '1F3E1', '1F3E2', '1F3E3', '1F3E4', '1F3E5', '1F3E6', '1F3E7',
    '1F3E8', '1F3E9', '1F3EA', '1F3EB', '1F3EC', '1F3ED', '1F3EE', '1F3EF',
    '1F3F0', '1F5FA', '1F5FB', '1F5FC', '1F5FD', '1F5FE', '1F5FF',
    '1F6E4', '1F6E5', // Motorway, motor boat
    '1F3D5', '1F3D6', '1F3D7', '1F3D8', '1F3D9', '1F3DA', '1F3DB', // National park to beach
  ],

  // Weather & Sky
  'weather': [
    '1F300', '1F301', '1F302', '1F303', '1F304', '1F305', '1F306', '1F307',
    '1F308', '1F309', '1F30A', '1F30B', '1F30C', '1F311', '1F312', '1F313',
    '1F314', '1F315', '1F316', '1F317', '1F318', '1F319', '1F31A', '1F31B',
    '1F31C', '1F31D', '1F31E', '1F31F', '1F320', '1F321', '1F324', '1F325',
    '1F326', '1F327', '1F328', '1F329', '1F32A', '1F32B', '1F32C', '2600',
    '2601', '2602', '2603', '2604', '26C4', '26C5', '26C8', '26F0', '26F1',
    '2728', '2B50', '1F31F', // Sparkles, star, glowing star
  ],

  // Professions (ZWJ sequences)
  'professions': [
    '1F468-200D-2695-FE0F', '1F469-200D-2695-FE0F', // Doctor
    '1F468-200D-2696-FE0F', '1F469-200D-2696-FE0F', // Judge  
    '1F468-200D-2708-FE0F', '1F469-200D-2708-FE0F', // Pilot
    '1F468-200D-1F33E', '1F469-200D-1F33E', // Farmer
    '1F468-200D-1F373', '1F469-200D-1F373', // Cook
    '1F468-200D-1F393', '1F469-200D-1F393', // Student
    '1F468-200D-1F3A4', '1F469-200D-1F3A4', // Singer
    '1F468-200D-1F3A8', '1F469-200D-1F3A8', // Artist
    '1F468-200D-1F3EB', '1F469-200D-1F3EB', // Teacher
    '1F468-200D-1F3ED', '1F469-200D-1F3ED', // Factory worker
    '1F468-200D-1F4BB', '1F469-200D-1F4BB', // Technologist
    '1F468-200D-1F4BC', '1F469-200D-1F4BC', // Office worker
    '1F468-200D-1F527', '1F469-200D-1F527', // Mechanic
    '1F468-200D-1F52C', '1F469-200D-1F52C', // Scientist
    '1F468-200D-1F680', '1F469-200D-1F680', // Astronaut
    '1F468-200D-1F692', '1F469-200D-1F692', // Firefighter
    '1F46E', '1F482', '1F575', '1F477', '1F481', '1F486', '1F487', // Basic professions
    // Person emojis with ZWJ sequences
    '1F9D1-200D-2695-FE0F', '1F9D1-200D-2696-FE0F', '1F9D1-200D-2708-FE0F',
    '1F9D1-200D-1F33E', '1F9D1-200D-1F373', '1F9D1-200D-1F393', '1F9D1-200D-1F3A4',
    '1F9D1-200D-1F3A8', '1F9D1-200D-1F3EB', '1F9D1-200D-1F3ED', '1F9D1-200D-1F4BB',
    '1F9D1-200D-1F4BC', '1F9D1-200D-1F527', '1F9D1-200D-1F52C', '1F9D1-200D-1F680',
    '1F9D1-200D-1F692',
  ],

  // Gestures & Body Parts  
  'gestures': [
    '1F44A', '1F44B', '1F44C', '1F44D', '1F44E', '1F44F', '1F450', // Hands
    '1F590', '1F595', '1F596', // Raised hand, middle finger, vulcan salute
    '1F64A', '1F64B', '1F64C', '1F64D', '1F64E', '1F64F', // Monkey see/hear/speak
    '1F91A', '1F91B', '1F91C', '1F91D', '1F91E', '1F91F', '1F932', // Hand gestures
    '1F918', '1F919', '1F926', '1F937', '1F930', '1F931', '1F933', // More gestures
    '1F9B5', '1F9B6', // Leg, foot
  ],

  // Fantasy & Mythical
  'fantasy': [
    '1F470', '1F478', '1F479', '1F47A', '1F47B', '1F47C', '1F47D', '1F47E', '1F47F',
    '1F9DD', '1F9DE', '1F9DF', '1F934', '1F935', // Elf, vampire, zombie, prince, person in tuxedo
    '1F996', // T-Rex
    '1F409', // Dragon
    '1F984', // Unicorn
    '1F9C4', // Mage
  ],

  // Technology & Electronics
  'technology': [
    '1F4BB', '1F4BD', '1F4BE', '1F4BF', '1F4F0', '1F4F1', '1F4F2',
    '1F4F3', '1F4F4', '1F4F5', '1F4F6', '1F4F7', '1F4F8', '1F4F9', '1F4FA',
    '1F4FB', '1F4FC', '1F4FD', '1F4FE', '1F4FF', '1F50A', '1F50B', '1F50C',
    '1F50D', '1F50E', '1F50F', '1F510', '1F511', '1F512', '1F513', '1F514',
    '1F515', '1F516', '1F517', '1F518', '1F519', '1F51A', '1F51B', '1F51C',
    '1F51D', '1F5A4', '1F5A5', '1F5A8', '1F576', '1F579', '260E', '2328',
  ],

  // Tools & Instruments
  'tools': [
    '1F527', '1F528', '1F529', '1F52A', '1F52B', '1F52C', '1F52D',
    '1F6E0', '1F6E1', // Hammer and wrench, shield
    '2692', '2694', // Hammer and pick, crossed swords
    '26CF', '26D1', '26D3', // Pick, rescue worker helmet, chains
    '1F5E1', // Dagger
    '1F9AF', // White cane
    '1F9F0', '1F9F1', '1F9F2', // Toolbox, brick, magnet
  ],

  // Office & Documents
  'office': [
    '1F4C0', '1F4C1', '1F4C2', '1F4C3', '1F4C4', '1F4C5', '1F4C6', '1F4C7',
    '1F4C8', '1F4C9', '1F4CA', '1F4CB', '1F4CC', '1F4CD', '1F4CE', '1F4CF',
    '1F4D0', '1F4D1', '1F4D2', '1F4D3', '1F4D4', '1F4D5', '1F4D6', '1F4D7',
    '1F4D8', '1F4D9', '1F4DA', '1F4DB', '1F4DC', '1F4DD', '1F4DE', '1F4DF',
    '1F4E0', '1F4E1', '1F4E2', '1F4E3', '1F4E4', '1F4E5', '1F4E6', '1F4E7',
    '1F4E8', '1F4E9', '1F4EA', '1F4EB', '1F4EC', '1F4ED', '1F4EE', '1F4EF',
    '1F5B1', '1F5B2', '1F5BC', '1F5C2', '1F5C3', '1F5C4', '1F5D1', '1F5D2',
    '1F5D3', '1F5DC', '1F5DD', '1F5DE', '1F5E2', '1F5E3', '1F5E8', '1F5EF', '1F5F3',
    '2702', '2709', // Scissors, envelope
  ],
};

// FIXED: Improved Unicode-based category system with precise, non-overlapping ranges
const UNICODE_CATEGORY_RANGES = {
  // Emotions & Faces - Unicode Block: Emoticons (1F600-1F64F)
  emotions: {
    ranges: [
      { start: 0x1F600, end: 0x1F64F }, // Emoticons block  
      { start: 0x1F970, end: 0x1F978 }, // Additional faces
    ]
  },
  
  // Core People - Basic humans only, excluding professions/gestures
  people: {
    ranges: [
      { start: 0x1F466, end: 0x1F469 }, // Basic people: boy, girl, man, woman
      { start: 0x1F474, end: 0x1F476 }, // Older people, baby
      { start: 0x1F9B0, end: 0x1F9B3 }, // Hair components
      { start: 0x1F9D1, end: 0x1F9D2 }, // Person, adults (basic only)
    ],
    exclude: [
      /200D/, // ZWJ sequences for professions
    ]
  },
  
  // FIXED: Animals & Nature Creatures (excluded religious buildings) 
  animals: {
    ranges: [
      { start: 0x1F400, end: 0x1F43F }, // Main animals block
      { start: 0x1F577, end: 0x1F578 }, // Spider, spider web
      { start: 0x1F980, end: 0x1F9AE }, // Additional animals (crab to guide dog)
      { start: 0x1F9B4, end: 0x1F9BA }, // Bone to safety vest
    ],
    exclude: [
      // FIXED: Exclude religious buildings that were incorrectly categorized
      { start: 0x1F54B, end: 0x1F54D }, // Mosque, synagogue, menorah
      { start: 0x1F6D0, end: 0x1F6D0 }, // Place of worship
      { start: 0x1F6D5, end: 0x1F6D5 }, // Hindu temple
    ]
  },

  // Plants & Nature (botanical only)
  nature: {
    ranges: [
      { start: 0x1F330, end: 0x1F335 }, // Trees and plants
      { start: 0x1F337, end: 0x1F343 }, // Flowers and leaves  
      { start: 0x1F33E, end: 0x1F33F }, // Wheat, herbs
      { start: 0x1F490, end: 0x1F490 }, // Bouquet
      { start: 0x2618, end: 0x2618 },   // Shamrock
    ]
  },
  
  // Food & Drink
  'food-drink': {
    ranges: [
      { start: 0x1F32D, end: 0x1F32F }, // Hot dog, taco, burrito
      { start: 0x1F344, end: 0x1F37F }, // Food items (mushroom to baby bottle)
      { start: 0x1F950, end: 0x1F96F }, // Additional food (croissant to cut of meat)
      { start: 0x1F9C0, end: 0x1F9C7 }, // Cheese and other food
    ]
  },
  
  // FIXED: Vehicles & Transportation (excluded household items)
  vehicles: {
    ranges: [
      { start: 0x1F680, end: 0x1F6C5 }, // Transport vehicles
      { start: 0x1F6D1, end: 0x1F6D2 }, // Stop sign, shopping cart
      { start: 0x1F6F4, end: 0x1F6FC }, // Kick scooter to roller skate
      { start: 0x2708, end: 0x2708 },   // Airplane
      { start: 0x26F4, end: 0x26F5 },   // Ferry, sailboat
    ],
    exclude: [
      // FIXED: Exclude household items that were incorrectly in vehicles
      { start: 0x1F9F8, end: 0x1F9F8 }, // Teddy bear (moved to toys)
      { start: 0x1F6CF, end: 0x1F6CF }, // Bed (moved to household)
      { start: 0x1F6CB, end: 0x1F6CB }, // Couch and lamp (moved to household)
    ]
  },

  // Objects (general items) - FIXED: Better scoped
  objects: {
    ranges: [
      { start: 0x1F4A0, end: 0x1F4B9 }, // Diamond shape to chart increasing
      { start: 0x1F530, end: 0x1F567 }, // Japanese symbol to 12 o'clock
      { start: 0x1F570, end: 0x1F573 }, // Mantelpiece clock to hole
      { start: 0x1F52E, end: 0x1F52F }, // Crystal ball, six-pointed star
    ],
    exclude: [
      // Exclude items now in other specific categories
      { start: 0x1F9F8, end: 0x1F9F8 }, // Teddy bear (toys)
    ]
  },
  
  // FIXED: Symbols & Math - more restricted scope
  symbols: {
    ranges: [
      { start: 0x2000, end: 0x2BFF },   // General symbols, punctuation, misc
      { start: 0x1F170, end: 0x1F251 }, // Enclosed alphanumeric supplement  
      { start: 0x25A0, end: 0x25FF },   // Geometric shapes
      { start: 0x2190, end: 0x21FF },   // Arrows
    ],
    exclude: [
      // Exclude specific ranges handled by other categories
      { start: 0x2600, end: 0x26FF }, // Weather and misc symbols
      { start: 0x2764, end: 0x2764 }, // Heart (emotions)
    ]
  },
};

// Enhanced Unicode name database
const UNICODE_NAMES = {
  // Emotions
  '1F600': 'Grinning Face',
  '1F601': 'Beaming Face with Smiling Eyes', 
  '1F602': 'Face with Tears of Joy',
  '1F603': 'Grinning Face with Big Eyes',
  '1F604': 'Smiling Face with Smiling Eyes',
  '1F605': 'Grinning Face with Sweat',
  '1F606': 'Grinning Squinting Face',
  '1F607': 'Smiling Face with Halo',
  '1F608': 'Smiling Face with Horns',
  '1F609': 'Winking Face',
  '1F60A': 'Smiling Face with Smiling Eyes',
  '1F60B': 'Face Savoring Food',
  '1F60C': 'Relieved Face',
  '1F60D': 'Smiling Face with Heart-Eyes',
  '1F60E': 'Smiling Face with Sunglasses',
  '1F60F': 'Smirking Face',
  '1F610': 'Neutral Face',
  '1F611': 'Expressionless Face',
  '1F612': 'Unamused Face',
  '1F613': 'Downcast Face with Sweat',
  '1F614': 'Pensive Face',
  '1F615': 'Confused Face',
  '1F616': 'Confounded Face',
  '1F617': 'Kissing Face',
  '1F618': 'Face Blowing a Kiss',
  '1F619': 'Kissing Face with Smiling Eyes',
  '1F61A': 'Kissing Face with Closed Eyes',
  '1F61B': 'Face with Tongue',
  '1F61C': 'Winking Face with Tongue',
  '1F61D': 'Squinting Face with Tongue',
  '1F61E': 'Disappointed Face',
  '1F61F': 'Worried Face',
  '1F620': 'Angry Face',
  '1F621': 'Pouting Face',
  '1F622': 'Crying Face',
  '1F623': 'Persevering Face',
  '1F624': 'Face with Steam From Nose',
  '1F625': 'Sad but Relieved Face',
  '1F626': 'Frowning Face with Open Mouth',
  '1F627': 'Anguished Face',
  '1F628': 'Fearful Face',
  '1F629': 'Weary Face',
  '1F62A': 'Sleepy Face',
  '1F62B': 'Tired Face',
  '1F62C': 'Grimacing Face',
  '1F62D': 'Loudly Crying Face',
  '1F62E': 'Face with Open Mouth',
  '1F62F': 'Hushed Face',
  '1F630': 'Anxious Face with Sweat',
  '1F631': 'Face Screaming in Fear',
  '1F632': 'Astonished Face',
  '1F633': 'Flushed Face',
  '1F634': 'Sleeping Face',
  '1F635': 'Dizzy Face',
  '1F636': 'Face Without Mouth',
  '1F637': 'Face with Medical Mask',
  
  // Common objects & symbols
  '2764': 'Red Heart',
  '2665': 'Heart Suit',
  '2660': 'Spade Suit', 
  '2663': 'Club Suit',
  '2666': 'Diamond Suit',
  '2600': 'Sun',
  '2601': 'Cloud',
  '2602': 'Umbrella',
  '2603': 'Snowman',
  '2604': 'Comet',
  '26A0': 'Warning Sign',
  '26A1': 'High Voltage',
  '2728': 'Sparkles',
  '2B50': 'Star',
  
  // Common activities
  '1F3C0': 'Basketball',
  '1F3C1': 'Checkered Flag',
  '1F3C2': 'Snowboarder',
  '1F3C3': 'Person Running',
  '1F3C4': 'Person Surfing',
  '1F3C5': 'Sports Medal',
  '1F3C6': 'Trophy',
  '1F3C7': 'Horse Racing',
  '1F3C8': 'American Football',
  '1F3C9': 'Rugby Football',
  '1F3CA': 'Person Swimming',
  
  // Travel
  '1F680': 'Rocket',
  '1F681': 'Helicopter',
  '1F682': 'Steam Locomotive',
  '1F683': 'Railway Car',
  '1F684': 'High-Speed Train',
  '1F685': 'Bullet Train',
  '1F686': 'Train',
  '1F687': 'Metro',
  '1F688': 'Light Rail',
  '1F689': 'Station',
  '1F68A': 'Tram',
  '1F68B': 'Tram Car',
  '1F68C': 'Bus',
  '1F68D': 'Oncoming Bus',
  '1F68E': 'Trolleybus',
  '1F68F': 'Bus Stop',
  '1F690': 'Minibus',
  '1F691': 'Ambulance',
  '1F692': 'Fire Engine',
  '1F693': 'Police Car',
  
  // Nature
  '1F300': 'Cyclone',
  '1F301': 'Foggy',
  '1F302': 'Closed Umbrella',
  '1F303': 'Night with Stars',
  '1F304': 'Sunrise Over Mountains',
  '1F305': 'Sunrise',
  '1F306': 'Cityscape at Dusk',
  '1F307': 'Sunset',
  '1F308': 'Rainbow',
  '1F309': 'Bridge at Night',
  '1F30A': 'Water Wave',
  '1F30B': 'Volcano',
  '1F30C': 'Milky Way',
  '1F30D': 'Globe Showing Europe-Africa',
  '1F30E': 'Globe Showing Americas',
  '1F30F': 'Globe Showing Asia-Australia',
  '1F310': 'Globe with Meridians',
  '1F311': 'New Moon',
  '1F312': 'Waxing Crescent Moon',
  '1F313': 'First Quarter Moon',
  '1F314': 'Waxing Gibbous Moon',
  '1F315': 'Full Moon',
  '1F316': 'Waning Gibbous Moon',
  '1F317': 'Last Quarter Moon',
  '1F318': 'Waning Crescent Moon',
  '1F319': 'Crescent Moon',
  '1F31A': 'New Moon Face',
  '1F31B': 'First Quarter Moon Face',
  '1F31C': 'Last Quarter Moon Face',
  '1F31D': 'Full Moon Face',
  '1F31E': 'Sun with Face',
  '1F31F': 'Glowing Star',
  '1F320': 'Shooting Star',
  
  // Food
  '1F32D': 'Hot Dog',
  '1F32E': 'Taco',
  '1F32F': 'Burrito',
  '1F330': 'Chestnut',
  '1F331': 'Seedling',
  '1F332': 'Evergreen Tree',
  '1F333': 'Deciduous Tree',
  '1F334': 'Palm Tree',
  '1F335': 'Cactus',
  '1F336': 'Hot Pepper',
  '1F337': 'Tulip',
  '1F338': 'Cherry Blossom',
  '1F339': 'Rose',
  '1F33A': 'Hibiscus',
  '1F33B': 'Sunflower',
  '1F33C': 'Blossom',
  '1F33D': 'Ear of Corn',
  '1F33E': 'Sheaf of Rice',
  '1F33F': 'Herb',
  '1F340': 'Four Leaf Clover',
  '1F341': 'Maple Leaf',
  '1F342': 'Fallen Leaves',
  '1F343': 'Leaf Fluttering in Wind',
  '1F344': 'Mushroom',
  '1F345': 'Tomato',
  '1F346': 'Eggplant',
  '1F347': 'Grapes',
  '1F348': 'Melon',
  '1F349': 'Watermelon',
  '1F34A': 'Tangerine',
  '1F34B': 'Lemon',
  '1F34C': 'Banana',
  '1F34D': 'Pineapple',
  '1F34E': 'Red Apple',
  '1F34F': 'Green Apple',
  '1F350': 'Pear',
  '1F351': 'Peach',
  '1F352': 'Cherries',
  '1F353': 'Strawberry',
  '1F354': 'Hamburger',
  '1F355': 'Pizza',
  '1F356': 'Meat on Bone',
  '1F357': 'Poultry Leg',
  '1F358': 'Rice Cracker',
  '1F359': 'Rice Ball',
  '1F35A': 'Cooked Rice',
  '1F35B': 'Curry Rice',
  '1F35C': 'Steaming Bowl',
  '1F35D': 'Spaghetti',
  '1F35E': 'Bread',
  '1F35F': 'French Fries',
  '1F360': 'Roasted Sweet Potato',
  '1F361': 'Dango',
  '1F362': 'Oden',
  '1F363': 'Sushi',
  '1F364': 'Fried Shrimp',
  '1F365': 'Fish Cake with Swirl',
  '1F366': 'Soft Ice Cream',
  '1F367': 'Shaved Ice',
  '1F368': 'Ice Cream',
  '1F369': 'Doughnut',
  '1F36A': 'Cookie',
  '1F36B': 'Chocolate Bar',
  '1F36C': 'Candy',
  '1F36D': 'Lollipop',
  '1F36E': 'Custard',
  '1F36F': 'Honey Pot',
  '1F370': 'Shortcake',
  '1F371': 'Bento Box',
  '1F372': 'Pot of Food',
  '1F373': 'Cooking',
  '1F374': 'Fork and Knife',
  '1F375': 'Teacup Without Handle',
  '1F376': 'Sake',
  '1F377': 'Wine Glass',
  '1F378': 'Cocktail Glass',
  '1F379': 'Tropical Drink',
  '1F37A': 'Beer Mug',
  '1F37B': 'Clinking Beer Mugs',
  '1F37C': 'Baby Bottle',
  
  // Country flags (partial list)
  '1F1FA-1F1F8': 'United States Flag',
  '1F1EC-1F1E7': 'United Kingdom Flag',
  '1F1E8-1F1E6': 'Canada Flag',
  '1F1EB-1F1F7': 'France Flag',
  '1F1E9-1F1EA': 'Germany Flag',
  '1F1EF-1F1F5': 'Japan Flag',
  '1F1E8-1F1F3': 'China Flag',
  '1F1EE-1F1F3': 'India Flag',
  '1F1E6-1F1FA': 'Australia Flag',
  '1F1E7-1F1F7': 'Brazil Flag',
  '1F1F7-1F1FA': 'Russia Flag',
  '1F1F0-1F1F7': 'South Korea Flag',
  '1F1EE-1F1F9': 'Italy Flag',
  '1F1EA-1F1F8': 'Spain Flag',
};

// Helper function to convert hex string to number
function hexToNumber(hexString) {
  return parseInt(hexString, 16);
}

// Helper function to check if a codepoint falls within a range
function isInRange(codepoint, range) {
  const num = hexToNumber(codepoint);
  return num >= range.start && num <= range.end;
}

// Helper function to check if emoji is a profession (contains ZWJ sequence)
function isProfession(filename) {
  return filename.includes('200D') && (
    filename.includes('2695') || // Medical symbol
    filename.includes('2696') || // Scales of justice  
    filename.includes('2708') || // Airplane
    filename.includes('1F33E') || // Sheaf of rice (farmer)
    filename.includes('1F373') || // Cooking
    filename.includes('1F393') || // Graduation cap
    filename.includes('1F3A4') || // Microphone
    filename.includes('1F3A8') || // Artist palette
    filename.includes('1F3EB') || // School
    filename.includes('1F3ED') || // Factory
    filename.includes('1F4BB') || // Computer
    filename.includes('1F4BC') || // Briefcase
    filename.includes('1F527') || // Wrench
    filename.includes('1F52C') || // Microscope
    filename.includes('1F680') || // Rocket
    filename.includes('1F692')    // Fire engine
  );
}

// Helper function to check if emoji is a flag
function isFlag(filename) {
  const baseFilename = filename.replace('.png', '');
  
  // Check for flag combinations (two regional indicators)
  if (baseFilename.includes('-') && baseFilename.match(/^1F1[E-F][0-9A-F]-1F1[E-F][0-9A-F]$/)) {
    return true;
  }
  
  // Check for individual regional indicator symbols
  const match = baseFilename.match(/^1F1[E-F][0-9A-F]$/);
  return !!match;
}

function categorizeEmoji(filename) {
  const baseFilename = filename.replace('.png', '').toUpperCase();

  // Lazy-load and cache Unicode emoji index from scripts/data/emoji-test.txt
  // Build a robust lookup map using official group/subgroup semantics
  if (!categorizeEmoji._emojiIndexLoaded) {
    try {
      const dataPath = path.join(__dirname, './data/emoji-test.txt');
      const raw = fs.readFileSync(dataPath, 'utf8');
      const index = new Map();
      let currentGroup = '';
      let currentSubgroup = '';
      raw.split(/\r?\n/).forEach((line) => {
        if (line.startsWith('# group: ')) {
          currentGroup = line.slice(9).trim();
          return;
        }
        if (line.startsWith('# subgroup: ')) {
          currentSubgroup = line.slice(12).trim();
          return;
        }
        if (!line || line.startsWith('#')) return;
        const parts = line.split(';');
        if (parts.length < 2) return;
        const codeStr = parts[0].trim().toUpperCase();
        // Normalize to our filename key format (hyphen-separated hex, no FE0F)
        const seq = codeStr.split(/\s+/).map((cp) => cp.toUpperCase()).join('-');
        const noVS = seq.replace(/-FE0F/g, '');
        const baseNoTone = noVS.replace(/-1F3F[B-F]/g, '');
        // Extract human name (optional) after '#'
        const hashIdx = line.indexOf('#');
        let name = '';
        if (hashIdx >= 0) {
          const tail = line.slice(hashIdx + 1).trim();
          const m = tail.match(/^[^ ]+\s+(?:E\d+\.\d+\s+)?(.+)$/);
          if (m) name = m[1].trim();
        }
        const entry = { group: currentGroup, subgroup: currentSubgroup, name };
        index.set(seq, entry);
        index.set(noVS, entry);
        index.set(baseNoTone, entry);
      });
      categorizeEmoji._emojiIndex = index;
      categorizeEmoji._emojiIndexLoaded = true;
    } catch (e) {
      console.warn('⚠ Unicode emoji-test data not found, falling back to heuristics.', e?.message);
      categorizeEmoji._emojiIndex = null;
      categorizeEmoji._emojiIndexLoaded = true;
    }
  }

  // Helper: map Unicode group/subgroup to our 10 UI categories
  const mapGroupToUI = (group, subgroup) => {
    if (!group) return null;
    if ((subgroup || '').includes('religion')) return 'religion-culture';
    switch (group) {
      case 'Smileys & Emotion': return 'smileys-emotion';
      case 'People & Body': return 'people-body';
      case 'Animals & Nature': return 'animals-nature';
      case 'Food & Drink': return 'food-drink';
      case 'Activities': return 'activities-events';
      case 'Travel & Places': return 'travel-places';
      case 'Objects': return 'objects-tools';
      case 'Symbols': return 'symbols';
      case 'Flags': return 'flags';
      default: return null;
    }
  };

  // Treat flags as their own category
  if (isFlag(filename)) {
    return 'flags';
  }

  // Try Unicode-based mapping first
  const exactKey = baseFilename.replace(/-FE0F/g, '');
  const skinlessKey = exactKey.replace(/-1F3F[B-F]/g, '');
  const idx = categorizeEmoji._emojiIndex;
  if (idx) {
    const entry = idx.get(exactKey) || idx.get(skinlessKey);
    const ui = entry ? mapGroupToUI(entry.group, entry.subgroup) : null;
    if (ui) return ui;
  }

  // Fallback: explicit mappings (legacy)
  for (const [category, emojis] of Object.entries(EXPLICIT_EMOJI_MAPPINGS)) {
    for (const explicitEmoji of emojis) {
      if (
        baseFilename === explicitEmoji ||
        baseFilename.startsWith(explicitEmoji + '-') ||
        baseFilename.split('-')[0] === explicitEmoji
      ) {
        const legacyMap = {
          religious: 'religion-culture',
          vehicles: 'travel-places',
          sports: 'activities-events',
          entertainment: 'activities-events',
          weather: 'animals-nature',
          toys: 'objects-tools',
          clothing: 'objects-tools',
          household: 'objects-tools',
          technology: 'objects-tools',
          tools: 'objects-tools',
          office: 'objects-tools',
          celebrations: 'activities-events',
          places: 'travel-places',
          animals: 'animals-nature',
          nature: 'animals-nature',
          emotions: 'smileys-emotion',
          gestures: 'people-body',
          fantasy: 'activities-events',
          objects: 'objects-tools',
          symbols: 'symbols'
        };
        return legacyMap[category] || 'symbols';
      }
    }
  }

  // Fallback: legacy Unicode ranges
  const primaryCodepoint = baseFilename.split('-')[0];
  for (const [category, config] of Object.entries(UNICODE_CATEGORY_RANGES)) {
    for (const range of config.ranges) {
      if (isInRange(primaryCodepoint, range)) {
        const legacyMap = {
          emotions: 'smileys-emotion',
          people: 'people-body',
          animals: 'animals-nature',
          nature: 'animals-nature',
          'food-drink': 'food-drink',
          vehicles: 'travel-places',
          objects: 'objects-tools',
          symbols: 'symbols'
        };
        return legacyMap[category] || 'symbols';
      }
    }
  }

  return 'symbols';
}

function generateName(filename) {
  const baseFilename = filename.replace('.png', '');
  
  // Use exact match from Unicode names database
  if (UNICODE_NAMES[baseFilename]) {
    return UNICODE_NAMES[baseFilename];
  }
  
  // Handle skin tone variants
  const baseName = baseFilename.split('-')[0];
  if (UNICODE_NAMES[baseName]) {
    const skinTones = {
      '1F3FB': ' Light Skin Tone',
      '1F3FC': ' Medium-Light Skin Tone', 
      '1F3FD': ' Medium Skin Tone',
      '1F3FE': ' Medium-Dark Skin Tone',
      '1F3FF': ' Dark Skin Tone'
    };
    
    let name = UNICODE_NAMES[baseName];
    const parts = baseFilename.split('-');
    for (let i = 1; i < parts.length; i++) {
      if (skinTones[parts[i]]) {
        name += skinTones[parts[i]];
      } else if (parts[i] === '200D') {
        // Zero-width joiner sequences
        continue;
      } else if (parts[i] === '2640' || parts[i] === 'FE0F') {
        name += ' ♀️';
      } else if (parts[i] === '2642') {
        name += ' ♂️';
      }
    }
    return name;
  }
  
  // Generate fallback name
  return `Emoji ${baseName}`;
}

function generatePreview(filename) {
  // For PNG emojis, we can try to convert Unicode codepoint to actual emoji
  const baseFilename = filename.replace('.png', '');
  
  try {
    // Handle flag sequences
    if (baseFilename.includes('-') && baseFilename.match(/^1F1[E-F][0-9A-F]-1F1[E-F][0-9A-F]$/)) {
      const [first, second] = baseFilename.split('-');
      const firstChar = String.fromCodePoint(parseInt(first, 16));
      const secondChar = String.fromCodePoint(parseInt(second, 16));
      return firstChar + secondChar;
    }
    
    // Handle complex sequences with ZWJ (Zero Width Joiner)
    if (baseFilename.includes('-')) {
      const parts = baseFilename.split('-');
      let result = '';
      for (const part of parts) {
        if (part === '200D') {
          result += '\u200D'; // Zero Width Joiner
        } else if (part === 'FE0F') {
          result += '\uFE0F'; // Variation Selector
        } else {
          result += String.fromCodePoint(parseInt(part, 16));
        }
      }
      return result;
    }
    
    // Simple single codepoint
    return String.fromCodePoint(parseInt(baseFilename, 16));
  } catch (error) {
    // Fallback to filename
    return baseFilename;
  }
}

// Skin tone detection
function extractBaseEmoji(filename) {
  // Remove skin tone modifiers (1F3FB-1F3FF) to get base emoji
  return filename.replace(/-1F3F[B-F]/g, '').replace('.png', '');
}

function hasSkinToneModifier(filename) {
  return /-1F3F[B-F]/.test(filename);
}

function getSkinToneFromFilename(filename) {
  const match = filename.match(/-1F3F([B-F])/);
  if (!match) return null;
  
  const toneMap = {
    'B': 'light',
    'C': 'medium-light', 
    'D': 'medium',
    'E': 'medium-dark',
    'F': 'dark'
  };
  
  return toneMap[match[1]] || null;
}

async function generateRegistry() {
  const pngDir = path.join(__dirname, '../public/png-emojis');
  
  if (!fs.existsSync(pngDir)) {
    console.error('❌ PNG emoji directory not found:', pngDir);
    process.exit(1);
  }
  
  const files = fs.readdirSync(pngDir)
    .filter(file => file.endsWith('.png') && !file.includes('delete_emoji') && !file.includes('deleted_files'))
    .sort();
  
  console.log(`📁 Found ${files.length} PNG emoji files`);
  
  // Group files by base emoji to identify skin tone variants
  const emojiGroups = {};
  files.forEach(filename => {
    const baseEmoji = extractBaseEmoji(filename);
    if (!emojiGroups[baseEmoji]) {
      emojiGroups[baseEmoji] = [];
    }
    emojiGroups[baseEmoji].push(filename);
  });
  
  // Generate icons, only showing base emojis (neutral/yellow tone)
  const icons = [];
  const skinToneEmojiMap = new Map();
  
  Object.entries(emojiGroups).forEach(([baseEmoji, variants]) => {
    // Find the base emoji (without skin tone modifier)
    const baseFile = variants.find(v => !hasSkinToneModifier(v));
    if (!baseFile) return; // Skip if no base emoji found
    
    const category = categorizeEmoji(baseFile);
    if (!category) return; // Skip if emoji is filtered out (like flags)
    
    const name = generateName(baseFile);
    const preview = generatePreview(baseFile);
    
    // Check if this emoji has skin tone variants
    const skinToneVariants = variants.filter(v => hasSkinToneModifier(v));
    const hasSkinTones = skinToneVariants.length > 0;
    
    const iconInfo = {
      name,
      category,
      path: `/png-emojis/${baseFile}`,
      preview,
      hasSkinTones,
      baseEmoji,
      ...(hasSkinTones && { 
        skinToneVariants: skinToneVariants.map(v => `/png-emojis/${v}`)
      })
    };
    
    icons.push(iconInfo);
    
    // Store mapping for quick lookup
    if (hasSkinTones) {
      skinToneEmojiMap.set(baseEmoji, {
        base: `/png-emojis/${baseFile}`,
        variants: skinToneVariants.reduce((acc, variant) => {
          const tone = getSkinToneFromFilename(variant);
          if (tone) {
            acc[tone] = `/png-emojis/${variant}`;
          }
          return acc;
        }, {})
      });
    }
  });
  
  // Group by category for stats
  const categoryStats = {};
  icons.forEach(icon => {
    categoryStats[icon.category] = (categoryStats[icon.category] || 0) + 1;
  });
  
  console.log('📊 Category distribution:');
  Object.entries(categoryStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count} emojis`);
    });
  
  // Generate the TypeScript file
  const registryContent = `/**
 * Auto-generated PNG emoji registry
 * Generated from ${files.length} PNG files on ${new Date().toISOString()}
 * 
 * Categories: ${Object.keys(categoryStats).join(', ')}
 * DO NOT EDIT MANUALLY - Run 'node scripts/generatePngRegistry.js' to regenerate
 */

import { getCustomStamps, CustomStamp } from './customStamps';

export interface IconInfo {
  name: string;
  category: string;
  path: string;
  preview: string;
  hasSkinTones?: boolean;
  skinToneVariants?: string[];
  baseEmoji?: string;
}

// Auto-generated PNG emoji registry (${icons.length} emojis)
export const iconRegistry: IconInfo[] = [
${icons.map(icon => `  {
    name: "${icon.name.replace(/"/g, '\\"')}",
    category: "${icon.category}",
    path: "${icon.path}",
    preview: "${icon.preview}",${icon.hasSkinTones ? `
    hasSkinTones: true,
    baseEmoji: "${icon.baseEmoji}",
    skinToneVariants: ${JSON.stringify(icon.skinToneVariants)},` : ''}
  }`).join(',\n')}
];

/**
 * Get icon by path
 */
export function getIconByPath(path: string): IconInfo | undefined {
  return iconRegistry.find(icon => icon.path === path);
}

/**
 * Get icons by category
 */
export function getIconsByCategory(category: string): IconInfo[] {
  return iconRegistry.filter(icon => icon.category === category);
}

/**
 * Get all available categories
 */
export function getCategories(): string[] {
  const categories = Array.from(new Set(iconRegistry.map(icon => icon.category)));
  return categories.sort();
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: string): string {
  const displayNames: Record<string, string> = {
    'smileys-emotion': 'Smileys & Emotion',
    'people-body': 'People & Body',
    'animals-nature': 'Animals & Nature',
    'food-drink': 'Food & Drink',
    'activities-events': 'Activities & Events',
    'travel-places': 'Travel & Places',
    'objects-tools': 'Objects & Tools',
    'symbols': 'Symbols',
    'flags': 'Flags',
    'religion-culture': 'Religion & Culture',
    'custom': 'Custom'
  };
  return displayNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Get skin tone variants for an emoji
 */
export function getSkinToneVariants(baseEmojiPath: string): string[] {
  const baseEmoji = baseEmojiPath.split('/').pop()?.replace('.png', '') || '';
  const emoji = iconRegistry.find(icon => icon.baseEmoji === baseEmoji);
  return emoji?.skinToneVariants || [];
}

/**
 * Check if emoji has skin tone variants
 */
export function hasSkinToneVariants(emojiPath: string): boolean {
  const baseEmoji = emojiPath.split('/').pop()?.replace('.png', '') || '';
  const emoji = iconRegistry.find(icon => icon.baseEmoji === baseEmoji);
  return emoji?.hasSkinTones || false;
}

/**
 * Get custom stamps as icons
 */
export function getCustomStampsAsIcons(): IconInfo[] {
  const customStamps = getCustomStamps();
  return customStamps.map((stamp: CustomStamp) => ({
    name: stamp.name,
    category: 'custom',
    path: stamp.dataUrl,
    preview: stamp.preview
  }));
}

/**
 * Get all categories including custom
 */
export function getAllCategories(): string[] {
  const standardCategories = getCategories();
  const customStamps = getCustomStamps();
  
  if (customStamps.length > 0) {
    return ['custom', ...standardCategories];
  }
  
  return standardCategories;
}

/**
 * Get icons by category including custom stamps
 */
export function getIconsByCategoryWithCustom(category: string): IconInfo[] {
  if (category === 'custom') {
    return getCustomStampsAsIcons();
  }
  return getIconsByCategory(category);
}

/**
 * Get all icons including custom stamps
 */
export function getAllIcons(): IconInfo[] {
  return [...iconRegistry, ...getCustomStampsAsIcons()];
}

// Export category statistics for debugging
export const CATEGORY_STATS = ${JSON.stringify(categoryStats, null, 2)};
export const TOTAL_EMOJIS = ${files.length};
export const GENERATED_AT = "${new Date().toISOString()}";

// Skin tone mapping for quick lookup
export const SKIN_TONE_MAP = new Map([
${Array.from(skinToneEmojiMap.entries()).map(([baseEmoji, data]) => 
  `  ["${baseEmoji}", ${JSON.stringify(data)}]`
).join(',\n')}
]);
`;

  // Write the generated file
  const outputPath = path.join(__dirname, '../src/utils/iconRegistry.ts');
  fs.writeFileSync(outputPath, registryContent, 'utf8');
  
  console.log(`✅ Generated ${outputPath} with ${files.length} emojis`);
  console.log(`📋 Categories: ${Object.keys(categoryStats).join(', ')}`);
  console.log('🔄 Registry updated! Restart your dev server to see changes.');
}

// Auto-run the generator
generateRegistry().catch(console.error);