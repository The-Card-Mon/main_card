export const CARD_TYPES = [
  'Fire',
  'Water',
  'Grass',
  'Electric',
  'Psychic',
  'Fighting',
  'Darkness',
  'Metal',
  'Fairy',
  'Dragon',
  'Colorless',
  'Lightning',
] as const;

export const RARITIES = [
  'Common',
  'Uncommon',
  'Rare',
  'Ultra Rare',
  'Legendary',
  'Secret Rare',
] as const;

export const CONDITIONS = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Lightly Played'] as const;

export const CARD_TYPE_COLORS: Record<string, string> = {
  Fire: 'from-orange-500 to-red-600',
  Water: 'from-blue-400 to-blue-600',
  Grass: 'from-green-400 to-green-600',
  Electric: 'from-yellow-400 to-amber-500',
  Psychic: 'from-pink-400 to-purple-500',
  Fighting: 'from-amber-600 to-orange-700',
  Darkness: 'from-gray-700 to-gray-900',
  Metal: 'from-gray-400 to-gray-600',
  Fairy: 'from-pink-300 to-rose-400',
  Dragon: 'from-red-500 to-orange-600',
  Colorless: 'from-gray-200 to-gray-400',
  Lightning: 'from-yellow-300 to-yellow-500',
};

// Solid accent colors for type indicator bars on cards
export const CARD_TYPE_ACCENT: Record<string, string> = {
  Fire: 'bg-orange-500',
  Water: 'bg-blue-500',
  Grass: 'bg-green-500',
  Electric: 'bg-yellow-400',
  Psychic: 'bg-pink-500',
  Fighting: 'bg-amber-600',
  Darkness: 'bg-gray-800',
  Metal: 'bg-slate-500',
  Fairy: 'bg-pink-400',
  Dragon: 'bg-red-600',
  Colorless: 'bg-gray-400',
  Lightning: 'bg-yellow-400',
};

// Type pill colors with more vivid feel
export const CARD_TYPE_PILL: Record<string, string> = {
  Fire: 'bg-orange-100 text-orange-700 border-orange-300',
  Water: 'bg-blue-100 text-blue-700 border-blue-300',
  Grass: 'bg-green-100 text-green-700 border-green-300',
  Electric: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  Psychic: 'bg-pink-100 text-pink-700 border-pink-300',
  Fighting: 'bg-amber-100 text-amber-700 border-amber-300',
  Darkness: 'bg-gray-100 text-gray-700 border-gray-300',
  Metal: 'bg-slate-100 text-slate-700 border-slate-300',
  Fairy: 'bg-rose-100 text-rose-600 border-rose-300',
  Dragon: 'bg-red-100 text-red-700 border-red-300',
  Colorless: 'bg-gray-100 text-gray-600 border-gray-300',
  Lightning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
};

// Whether a rarity gets the holographic shimmer
export const RARITY_HOLO: Record<string, boolean> = {
  Common: false,
  Uncommon: false,
  Rare: true,
  'Ultra Rare': true,
  Legendary: true,
  'Secret Rare': true,
};

// Foil border class (gold for Legendary, rainbow for Secret Rare)
export const RARITY_FOIL: Record<string, string> = {
  Common: '',
  Uncommon: '',
  Rare: '',
  'Ultra Rare': '',
  Legendary: 'foil-border',
  'Secret Rare': 'foil-border foil-rainbow',
};

export const CARD_TYPE_BG: Record<string, string> = {
  Fire: 'bg-orange-50 border-orange-200',
  Water: 'bg-blue-50 border-blue-200',
  Grass: 'bg-green-50 border-green-200',
  Electric: 'bg-yellow-50 border-amber-200',
  Psychic: 'bg-pink-50 border-purple-200',
  Fighting: 'bg-amber-50 border-orange-200',
  Darkness: 'bg-gray-50 border-gray-300',
  Metal: 'bg-slate-50 border-gray-300',
  Fairy: 'bg-pink-50 border-rose-200',
  Dragon: 'bg-red-50 border-orange-200',
  Colorless: 'bg-gray-50 border-gray-200',
  Lightning: 'bg-yellow-50 border-yellow-200',
};

export const RARITY_COLORS: Record<string, string> = {
  Common: 'bg-gray-100 text-gray-700 border-gray-300',
  Uncommon: 'bg-green-100 text-green-700 border-green-300',
  Rare: 'bg-blue-100 text-blue-700 border-blue-300',
  'Ultra Rare': 'bg-purple-100 text-purple-700 border-purple-300',
  Legendary: 'bg-amber-100 text-amber-700 border-amber-300',
  'Secret Rare': 'bg-rose-100 text-rose-700 border-rose-300',
};

export const POKEMON_IMAGES = [
  'https://images.pexels.com/photos/2909224/pexels-photo-2909224.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/1095814/pexels-photo-1095814.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/3974145/pexels-photo-3974145.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/326082/pexels-photo-326082.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/357756/pexels-photo-357756.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/45201/kitty-cat-kitten-pet-45201.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/617278/pexels-photo-617278.jpeg?auto=compress&cs=tinysrgb&w=400',
];

export const SET_NAMES = [
  'Base Set',
  'Jungle',
  'Fossil',
  'Base Set 2',
  'Team Rocket',
  'Gym Heroes',
  'Gym Challenge',
  'Neo Genesis',
  'Sword & Shield',
  'Brilliant Stars',
  'Evolving Skies',
  'Fusion Strike',
  'Vivid Voltage',
  'Champion\'s Path',
  'Shining Fates',
  'Hidden Fates',
  'Crown Zenith',
  'Obsidian Flames',
  'Paldea Evolved',
  '151',
];
