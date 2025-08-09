// Emoji data mapping - lightweight and decoupled
export interface EmojiData {
  name: string;
  char: string;
  keywords: string[];
}

export const EMOJI_MAP: Record<string, EmojiData> = {
  // Faces & Emotions
  'smile': { name: 'smile', char: '😊', keywords: ['happy', 'joy', 'pleased'] },
  'heart': { name: 'heart', char: '❤️', keywords: ['love', 'like', 'valentine'] },
  'fire': { name: 'fire', char: '🔥', keywords: ['hot', 'burn', 'flame'] },
  'thumbs_up': { name: 'thumbs_up', char: '👍', keywords: ['good', 'approve', 'like'] },
  'thumbs_down': { name: 'thumbs_down', char: '👎', keywords: ['bad', 'disapprove', 'dislike'] },
  'laugh': { name: 'laugh', char: '😂', keywords: ['funny', 'lol', 'haha'] },
  'cry': { name: 'cry', char: '😢', keywords: ['sad', 'tear', 'upset'] },
  'wink': { name: 'wink', char: '😉', keywords: ['flirt', 'joke', 'playful'] },
  'cool': { name: 'cool', char: '😎', keywords: ['sunglasses', 'awesome', 'swag'] },
  'thinking': { name: 'thinking', char: '🤔', keywords: ['hmm', 'wonder', 'ponder'] },
  
  // Gestures & People
  'clap': { name: 'clap', char: '👏', keywords: ['applause', 'good job', 'bravo'] },
  'wave': { name: 'wave', char: '👋', keywords: ['hello', 'goodbye', 'hi'] },
  'point_right': { name: 'point_right', char: '👉', keywords: ['direction', 'indicate'] },
  'point_left': { name: 'point_left', char: '👈', keywords: ['direction', 'indicate'] },
  'point_up': { name: 'point_up', char: '👆', keywords: ['direction', 'up', 'above'] },
  'point_down': { name: 'point_down', char: '👇', keywords: ['direction', 'down', 'below'] },
  
  // Objects & Symbols  
  'rocket': { name: 'rocket', char: '🚀', keywords: ['space', 'launch', 'fast'] },
  'star': { name: 'star', char: '⭐', keywords: ['favorite', 'rating', 'quality'] },
  'lightning': { name: 'lightning', char: '⚡', keywords: ['fast', 'energy', 'power'] },
  'check': { name: 'check', char: '✅', keywords: ['done', 'complete', 'correct'] },
  'x': { name: 'x', char: '❌', keywords: ['wrong', 'error', 'no'] },
  'warning': { name: 'warning', char: '⚠️', keywords: ['caution', 'alert', 'attention'] },
  'info': { name: 'info', char: 'ℹ️', keywords: ['information', 'help', 'details'] },
  'question': { name: 'question', char: '❓', keywords: ['help', 'unknown', 'confused'] },
  'exclamation': { name: 'exclamation', char: '❗', keywords: ['important', 'alert', 'attention'] },
  
  // Activities
  'party': { name: 'party', char: '🎉', keywords: ['celebration', 'confetti', 'happy'] },
  'gift': { name: 'gift', char: '🎁', keywords: ['present', 'surprise', 'birthday'] },
  'cake': { name: 'cake', char: '🎂', keywords: ['birthday', 'dessert', 'celebration'] },
  'coffee': { name: 'coffee', char: '☕', keywords: ['drink', 'morning', 'caffeine'] },
  'pizza': { name: 'pizza', char: '🍕', keywords: ['food', 'italian', 'slice'] },
  
  // Nature
  'sun': { name: 'sun', char: '☀️', keywords: ['sunny', 'bright', 'day'] },
  'moon': { name: 'moon', char: '🌙', keywords: ['night', 'sleep', 'crescent'] },
  'tree': { name: 'tree', char: '🌳', keywords: ['nature', 'green', 'environment'] },
  'flower': { name: 'flower', char: '🌸', keywords: ['nature', 'pink', 'spring'] },
  'rainbow': { name: 'rainbow', char: '🌈', keywords: ['colorful', 'weather', 'pride'] }
};

export const EMOJI_LIST = Object.values(EMOJI_MAP);

export function searchEmojis(query: string): EmojiData[] {
  if (!query) return EMOJI_LIST.slice(0, 10); // Show first 10 by default
  
  const lowerQuery = query.toLowerCase();
  return EMOJI_LIST.filter(emoji => 
    emoji.name.includes(lowerQuery) || 
    emoji.keywords.some(keyword => keyword.includes(lowerQuery))
  ).slice(0, 10); // Limit to 10 results
}

export function getEmojiByName(name: string): EmojiData | undefined {
  return EMOJI_MAP[name];
}