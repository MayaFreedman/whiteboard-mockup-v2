
/**
 * Icon registry for stamp icons
 * Maps icon names to their file paths for dynamic loading
 * Uses authentic OpenMoji SVG files
 */

export interface IconInfo {
  name: string;
  category: string;
  path: string;
  preview: string; // Path to preview image or emoji character
}

// Use only authentic OpenMoji files from the user's collection
export const iconRegistry: IconInfo[] = [
  // Emotions - using correct Unicode codepoints
  {
    name: "Grinning Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F600.svg",
    preview: "😀",
  },
  {
    name: "Beaming Face",
    category: "emotions", 
    path: "/emojis/openmoji-svg-color (1)/1F601.svg",
    preview: "😁",
  },
  {
    name: "Face with Tears of Joy",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F602.svg",
    preview: "😂",
  },
  {
    name: "Grinning Face with Big Eyes",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F603.svg",
    preview: "😃",
  },
  {
    name: "Smiling Face with Smiling Eyes",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F60A.svg",
    preview: "😊",
  },
  {
    name: "Winking Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F609.svg",
    preview: "😉",
  },
  {
    name: "Smiling Face with Heart-Eyes",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F60D.svg",
    preview: "😍",
  },
  {
    name: "Smiling Face with Sunglasses",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F60E.svg",
    preview: "😎",
  },
  {
    name: "Face Blowing a Kiss",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F617.svg",
    preview: "😗",
  },
  {
    name: "Thinking Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F914.svg",
    preview: "🤔",
  },
  {
    name: "Crying Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F622.svg",
    preview: "😢",
  },
  {
    name: "Angry Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F620.svg",
    preview: "😠",
  },
  {
    name: "Astonished Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F632.svg",
    preview: "😲",
  },
  {
    name: "Neutral Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F610.svg",
    preview: "😐",
  },
  {
    name: "Confused Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F615.svg",
    preview: "😕",
  },
  // More kid-friendly emotions for therapy
  {
    name: "Smiling Face with Halo",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F607.svg",
    preview: "😇",
  },
  {
    name: "Relieved Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F60C.svg",
    preview: "😌",
  },
  {
    name: "Pensive Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F614.svg",
    preview: "😔",
  },
  {
    name: "Sleepy Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F62A.svg",
    preview: "😪",
  },
  {
    name: "Sleeping Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F634.svg",
    preview: "😴",
  },
  {
    name: "Dizzy Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F635.svg",
    preview: "😵",
  },
  {
    name: "Worried Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F61F.svg",
    preview: "😟",
  },
  {
    name: "Frowning Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F641.svg",
    preview: "🙁",
  },
  {
    name: "Face with Open Mouth",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F62E.svg",
    preview: "😮",
  },
  {
    name: "Hushed Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F62F.svg",
    preview: "😯",
  },
  {
    name: "Flushed Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F633.svg",
    preview: "😳",
  },
  {
    name: "Pleading Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F97A.svg",
    preview: "🥺",
  },
  {
    name: "Anguished Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F627.svg",
    preview: "😧",
  },
  {
    name: "Fearful Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F628.svg",
    preview: "😨",
  },
  {
    name: "Anxious Face with Sweat",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F630.svg",
    preview: "😰",
  },
  {
    name: "Loudly Crying Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F62D.svg",
    preview: "😭",
  },
  {
    name: "Face Screaming in Fear",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F631.svg",
    preview: "😱",
  },
  {
    name: "Disappointed Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F61E.svg",
    preview: "😞",
  },
  {
    name: "Weary Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F629.svg",
    preview: "😩",
  },
  {
    name: "Tired Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F62B.svg",
    preview: "😫",
  },
  {
    name: "Yawning Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F971.svg",
    preview: "🥱",
  },
  {
    name: "Face with Steam from Nose",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F624.svg",
    preview: "😤",
  },
  {
    name: "Pouting Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F621.svg",
    preview: "😡",
  },
  {
    name: "Star-Struck",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F929.svg",
    preview: "🤩",
  },
  {
    name: "Partying Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F973.svg",
    preview: "🥳",
  },
  {
    name: "Smiling Face with 3 Hearts",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F970.svg",
    preview: "🥰",
  },
  {
    name: "Hugging Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F917.svg",
    preview: "🤗",
  },
  {
    name: "Shushing Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F92B.svg",
    preview: "🤫",
  },
  {
    name: "Face with Hand Over Mouth",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F92D.svg",
    preview: "🤭",
  },
  {
    name: "Zipper-Mouth Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F910.svg",
    preview: "🤐",
  },
  {
    name: "Face with Raised Eyebrow",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F928.svg",
    preview: "🤨",
  },
  {
    name: "Expressionless Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F611.svg",
    preview: "😑",
  },
  {
    name: "Face Without Mouth",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F636.svg",
    preview: "😶",
  },
  {
    name: "Smirking Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F60F.svg",
    preview: "😏",
  },
  {
    name: "Unamused Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F612.svg",
    preview: "😒",
  },
  {
    name: "Face with Rolling Eyes",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F644.svg",
    preview: "🙄",
  },
  {
    name: "Grimacing Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F62C.svg",
    preview: "😬",
  },

  // Animals - kids love these cute animal friends!
  {
    name: "Dog Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F436.svg",
    preview: "🐶",
  },
  {
    name: "Cat Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F431.svg",
    preview: "🐱",
  },
  {
    name: "Mouse Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F42D.svg",
    preview: "🐭",
  },
  {
    name: "Hamster Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F439.svg",
    preview: "🐹",
  },
  {
    name: "Rabbit Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F430.svg",
    preview: "🐰",
  },
  {
    name: "Fox Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F98A.svg",
    preview: "🦊",
  },
  {
    name: "Bear Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F43B.svg",
    preview: "🐻",
  },
  {
    name: "Panda Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F43C.svg",
    preview: "🐼",
  },
  {
    name: "Monkey Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F435.svg",
    preview: "🐵",
  },
  {
    name: "Chicken",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F414.svg",
    preview: "🐔",
  },
  {
    name: "Penguin",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F427.svg",
    preview: "🐧",
  },
  {
    name: "Fish",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F41F.svg",
    preview: "🐟",
  },
  // More kid favorites
  {
    name: "Unicorn",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F984.svg",
    preview: "🦄",
  },
  {
    name: "Koala",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F428.svg",
    preview: "🐨",
  },
  {
    name: "Tiger Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F42F.svg",
    preview: "🐯",
  },
  {
    name: "Lion Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F981.svg",
    preview: "🦁",
  },
  {
    name: "Cow Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F42E.svg",
    preview: "🐮",
  },
  {
    name: "Pig Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F437.svg",
    preview: "🐷",
  },
  {
    name: "Frog Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F438.svg",
    preview: "🐸",
  },
  {
    name: "Octopus",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F419.svg",
    preview: "🐙",
  },
  {
    name: "Butterfly",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F98B.svg",
    preview: "🦋",
  },
  {
    name: "Bee",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F41D.svg",
    preview: "🐝",
  },
  {
    name: "Ladybug",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F41E.svg",
    preview: "🐞",
  },
  {
    name: "Turtle",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F422.svg",
    preview: "🐢",
  },
  {
    name: "Snail",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F40C.svg",
    preview: "🐌",
  },
  {
    name: "Duck",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F986.svg",
    preview: "🦆",
  },
  {
    name: "Owl",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F989.svg",
    preview: "🦉",
  },
  {
    name: "Eagle",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F985.svg",
    preview: "🦅",
  },
  {
    name: "Flamingo",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F9A9.svg",
    preview: "🦩",
  },
  {
    name: "Elephant",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F418.svg",
    preview: "🐘",
  },
  {
    name: "Giraffe",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F992.svg",
    preview: "🦒",
  },
  {
    name: "Zebra",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F993.svg",
    preview: "🦓",
  },
  {
    name: "Deer",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F98C.svg",
    preview: "🦌",
  },
  {
    name: "Sheep",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F411.svg",
    preview: "🐑",
  },
  {
    name: "Horse Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F434.svg",
    preview: "🐴",
  },

  // Nature - beautiful things kids see outdoors
  {
    name: "Sun",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/2600.svg",
    preview: "☀️",
  },
  {
    name: "Crescent Moon",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F319.svg",
    preview: "🌙",
  },
  {
    name: "Full Moon",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F315.svg",
    preview: "🌕",
  },
  {
    name: "Deciduous Tree",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F333.svg",
    preview: "🌳",
  },
  {
    name: "Evergreen Tree",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F332.svg",
    preview: "🌲",
  },
  {
    name: "Tulip",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F337.svg",
    preview: "🌷",
  },
  {
    name: "Rose",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F339.svg",
    preview: "🌹",
  },
  {
    name: "Sunflower",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F33B.svg",
    preview: "🌻",
  },
  {
    name: "Blossom",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F33C.svg",
    preview: "🌼",
  },
  {
    name: "Rainbow",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F308.svg",
    preview: "🌈",
  },
  {
    name: "Cloud",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/2601.svg",
    preview: "☁️",
  },
  {
    name: "Lightning",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/26A1.svg",
    preview: "⚡",
  },
  // More nature elements kids love
  {
    name: "Star",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/2B50.svg",
    preview: "⭐",
  },
  {
    name: "Glowing Star",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F31F.svg",
    preview: "🌟",
  },
  {
    name: "Shooting Star",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F320.svg",
    preview: "🌠",
  },
  {
    name: "Earth Globe",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F30D.svg",
    preview: "🌍",
  },
  {
    name: "Volcano",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F30B.svg",
    preview: "🌋",
  },
  {
    name: "Snowflake",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/2744.svg",
    preview: "❄️",
  },
  {
    name: "Snowman",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/2603.svg",
    preview: "☃️",
  },
  {
    name: "Ocean Wave",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F30A.svg",
    preview: "🌊",
  },
  {
    name: "Droplet",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F4A7.svg",
    preview: "💧",
  },
  {
    name: "Herb",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F33F.svg",
    preview: "🌿",
  },
  {
    name: "Four Leaf Clover",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F340.svg",
    preview: "🍀",
  },
  {
    name: "Maple Leaf",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F341.svg",
    preview: "🍁",
  },
  {
    name: "Fallen Leaves",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F342.svg",
    preview: "🍂",
  },
  {
    name: "Mushroom",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F344.svg",
    preview: "🍄",
  },
  {
    name: "Cactus",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F335.svg",
    preview: "🌵",
  },
  {
    name: "Palm Tree",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F334.svg",
    preview: "🌴",
  },
  {
    name: "Seedling",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F331.svg",
    preview: "🌱",
  },

  // Objects & Symbols - things kids see and play with
  {
    name: "Red Heart",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/2764.svg",
    preview: "❤️",
  },
  {
    name: "Blue Heart",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F499.svg",
    preview: "💙",
  },
  {
    name: "Green Heart",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F49A.svg",
    preview: "💚",
  },
  {
    name: "Yellow Heart",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F49B.svg",
    preview: "💛",
  },
  {
    name: "Purple Heart",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F49C.svg",
    preview: "💜",
  },
  {
    name: "Orange Heart",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F9E1.svg",
    preview: "🧡",
  },
  {
    name: "Gift",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F381.svg",
    preview: "🎁",
  },
  {
    name: "Birthday Cake",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F382.svg",
    preview: "🎂",
  },
  {
    name: "Trophy",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F3C6.svg",
    preview: "🏆",
  },
  {
    name: "Crown",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F451.svg",
    preview: "👑",
  },
  {
    name: "Key",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F511.svg",
    preview: "🔑",
  },
  {
    name: "Gem Stone",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F48E.svg",
    preview: "💎",
  },
  // More fun objects kids love
  {
    name: "Balloon",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F388.svg",
    preview: "🎈",
  },
  {
    name: "Party Popper",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F389.svg",
    preview: "🎉",
  },
  {
    name: "Confetti Ball",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F38A.svg",
    preview: "🎊",
  },
  {
    name: "Soccer Ball",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/26BD.svg",
    preview: "⚽",
  },
  {
    name: "Basketball",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F3C0.svg",
    preview: "🏀",
  },
  {
    name: "Baseball",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/26BE.svg",
    preview: "⚾",
  },
  {
    name: "Teddy Bear",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F9F8.svg",
    preview: "🧸",
  },
  {
    name: "Toy Block",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F9F1.svg",
    preview: "🧱",
  },
  {
    name: "Kite",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1FA81.svg",
    preview: "🪁",
  },
  {
    name: "Yo-Yo",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1FA80.svg",
    preview: "🪀",
  },
  {
    name: "Crystal Ball",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F52E.svg",
    preview: "🔮",
  },
  {
    name: "Magic Wand",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1FA84.svg",
    preview: "🪄",
  },
  {
    name: "Puzzle Piece",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F9E9.svg",
    preview: "🧩",
  },
  {
    name: "Game Die",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F3B2.svg",
    preview: "🎲",
  },
  {
    name: "Artist Palette",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F3A8.svg",
    preview: "🎨",
  },
  {
    name: "Crayon",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F58D.svg",
    preview: "🖍️",
  },
  {
    name: "Paintbrush",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F58C.svg",
    preview: "🖌️",
  },
  {
    name: "Books",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F4DA.svg",
    preview: "📚",
  },
  {
    name: "Open Book",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F4D6.svg",
    preview: "📖",
  },
  {
    name: "Notebook",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F4D3.svg",
    preview: "📓",
  },
  {
    name: "Backpack",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F392.svg",
    preview: "🎒",
  },

  // Symbols - fun shapes and signs kids recognize
  {
    name: "Star",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/2B50.svg",
    preview: "⭐",
  },
  {
    name: "Sparkles",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/2728.svg",
    preview: "✨",
  },
  {
    name: "Fire",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/1F525.svg",
    preview: "🔥",
  },
  {
    name: "Check Mark",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/2714.svg",
    preview: "✔️",
  },
  {
    name: "Cross Mark",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/274C.svg",
    preview: "❌",
  },
  {
    name: "Question Mark",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/2753.svg",
    preview: "❓",
  },
  {
    name: "Exclamation Mark",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/2757.svg",
    preview: "❗",
  },
  {
    name: "Musical Note",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/1F3B5.svg",
    preview: "🎵",
  },
  // More symbols kids love
  {
    name: "Lightning Bolt",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/26A1.svg",
    preview: "⚡",
  },
  {
    name: "Peace Symbol",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/262E.svg",
    preview: "☮️",
  },
  {
    name: "Yin Yang",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/262F.svg",
    preview: "☯️",
  },
  {
    name: "Recycling Symbol",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/267E.svg",
    preview: "♻️",
  },
  {
    name: "Heavy Plus Sign",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/2795.svg",
    preview: "➕",
  },
  {
    name: "Heavy Minus Sign",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/2796.svg",
    preview: "➖",
  },
  {
    name: "Multiplication Sign",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/2716.svg",
    preview: "✖️",
  },
  {
    name: "Division Sign",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/2797.svg",
    preview: "➗",
  },
  {
    name: "Heavy Equals Sign",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/1F7F0.svg",
    preview: "🟰",
  },
  {
    name: "Copyright",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/00A9.svg",
    preview: "©️",
  },
  {
    name: "Registered",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/00AE.svg",
    preview: "®️",
  },
  {
    name: "Trademark",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/2122.svg",
    preview: "™️",
  },
  {
    name: "Double Exclamation Mark",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/203C.svg",
    preview: "‼️",
  },
  {
    name: "Interrobang",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/2049.svg",
    preview: "⁉️",
  },

  // Travel & Places - exciting places kids dream about
  {
    name: "Airplane",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/2708.svg",
    preview: "✈️",
  },
  {
    name: "Castle",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F3F0.svg",
    preview: "🏰",
  },
  {
    name: "House",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F3E0.svg",
    preview: "🏠",
  },
  {
    name: "School",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F3EB.svg",
    preview: "🏫",
  },
  {
    name: "Car",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F697.svg",
    preview: "🚗",
  },
  {
    name: "Bicycle",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F6B2.svg",
    preview: "🚲",
  },
  {
    name: "Ship",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F6A2.svg",
    preview: "🚢",
  },
  {
    name: "Rocket",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F680.svg",
    preview: "🚀",
  },
  {
    name: "Mountain",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/26F0.svg",
    preview: "⛰️",
  },
  {
    name: "Beach",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F3D6.svg",
    preview: "🏖️",
  },
  // More places kids love to go
  {
    name: "Playground",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F3DE.svg",
    preview: "🏞️",
  },
  {
    name: "Ferris Wheel",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F3A1.svg",
    preview: "🎡",
  },
  {
    name: "Roller Coaster",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F3A2.svg",
    preview: "🎢",
  },
  {
    name: "Circus Tent",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F3AA.svg",
    preview: "🎪",
  },
  {
    name: "Train",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F686.svg",
    preview: "🚆",
  },
  {
    name: "Bus",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F68C.svg",
    preview: "🚌",
  },
  {
    name: "Fire Engine",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F692.svg",
    preview: "🚒",
  },
  {
    name: "Police Car",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F693.svg",
    preview: "🚓",
  },
  {
    name: "Ambulance",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F691.svg",
    preview: "🚑",
  },
  {
    name: "Helicopter",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F681.svg",
    preview: "🚁",
  },
  {
    name: "Sailboat",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/26F5.svg",
    preview: "⛵",
  },
  {
    name: "Speedboat",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F6A4.svg",
    preview: "🚤",
  },
  {
    name: "Hospital",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F3E5.svg",
    preview: "🏥",
  },
  {
    name: "Library",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F3DB.svg",
    preview: "🏛️",
  },
  {
    name: "Park",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F3DE.svg",
    preview: "🏞️",
  },
  {
    name: "Stadium",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F3DF.svg",
    preview: "🏟️",
  },
  {
    name: "Bridge",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F309.svg",
    preview: "🌉",
  },
  {
    name: "Tent",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/26FA.svg",
    preview: "⛺",
  },

  // Food & Drink - yummy treats kids love
  {
    name: "Apple",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F34E.svg",
    preview: "🍎",
  },
  {
    name: "Banana",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F34C.svg",
    preview: "🍌",
  },
  {
    name: "Orange",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F34A.svg",
    preview: "🍊",
  },
  {
    name: "Grapes",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F347.svg",
    preview: "🍇",
  },
  {
    name: "Strawberry",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F353.svg",
    preview: "🍓",
  },
  {
    name: "Pizza",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F355.svg",
    preview: "🍕",
  },
  {
    name: "Hamburger",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F354.svg",
    preview: "🍔",
  },
  {
    name: "Hot Dog",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F32D.svg",
    preview: "🌭",
  },
  {
    name: "Ice Cream",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F366.svg",
    preview: "🍦",
  },
  {
    name: "Coffee",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/2615.svg",
    preview: "☕",
  },
  // More kid-friendly foods
  {
    name: "Cookie",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F36A.svg",
    preview: "🍪",
  },
  {
    name: "Chocolate Bar",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F36B.svg",
    preview: "🍫",
  },
  {
    name: "Candy",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F36C.svg",
    preview: "🍬",
  },
  {
    name: "Lollipop",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F36D.svg",
    preview: "🍭",
  },
  {
    name: "Donut",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F369.svg",
    preview: "🍩",
  },
  {
    name: "Cupcake",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F9C1.svg",
    preview: "🧁",
  },
  {
    name: "Watermelon",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F349.svg",
    preview: "🍉",
  },
  {
    name: "Pineapple",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F34D.svg",
    preview: "🍍",
  },
  {
    name: "Cherries",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F352.svg",
    preview: "🍒",
  },
  {
    name: "Peach",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F351.svg",
    preview: "🍑",
  },
  {
    name: "Milk",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F95B.svg",
    preview: "🥛",
  },
  {
    name: "Juice Box",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F9C3.svg",
    preview: "🧃",
  },
];

/**
 * Get icon by path
 */
export const getIconByPath = (path: string): IconInfo | undefined => {
  return iconRegistry.find((icon) => icon.path === path);
};

/**
 * Get icons by category
 */
export const getIconsByCategory = (category: string): IconInfo[] => {
  return iconRegistry.filter((icon) => icon.category === category);
};

/**
 * Get all categories
 */
export const getCategories = (): string[] => {
  return [...new Set(iconRegistry.map((icon) => icon.category))];
};

/**
 * Gets human-readable category name
 */
export const getCategoryDisplayName = (category: string): string => {
  const categoryMap: Record<string, string> = {
    emotions: "Emotions & Faces",
    animals: "Animals",
    food: "Food & Drink",
    nature: "Nature",
    objects: "Objects",
    symbols: "Symbols",
    activities: "Activities & Sports",
    travel: "Travel & Places",
    weather: "Weather",
    hands: "Hands & People",
    fantasy: "Fantasy & Religion",
  };

  return (
    categoryMap[category] ||
    category.charAt(0).toUpperCase() + category.slice(1)
  );
};
