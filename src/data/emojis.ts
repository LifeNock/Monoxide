export interface CustomEmoji {
  id: string;
  name: string;
  category: string;
  src: string;
}

export const emojis: CustomEmoji[] = [
  { id: 'thumbs_up', name: 'Thumbs Up', category: 'reactions', src: '/emojis/thumbs-up.svg' },
  { id: 'thumbs_down', name: 'Thumbs Down', category: 'reactions', src: '/emojis/thumbs-down.svg' },
  { id: 'heart', name: 'Heart', category: 'reactions', src: '/emojis/heart.svg' },
  { id: 'fire', name: 'Fire', category: 'reactions', src: '/emojis/fire.svg' },
  { id: 'laugh', name: 'Laugh', category: 'faces', src: '/emojis/laugh.svg' },
  { id: 'cry', name: 'Cry', category: 'faces', src: '/emojis/cry.svg' },
  { id: 'angry', name: 'Angry', category: 'faces', src: '/emojis/angry.svg' },
  { id: 'cool', name: 'Cool', category: 'faces', src: '/emojis/cool.svg' },
  { id: 'think', name: 'Think', category: 'faces', src: '/emojis/think.svg' },
  { id: 'skull', name: 'Skull', category: 'faces', src: '/emojis/skull.svg' },
  { id: 'star', name: 'Star', category: 'reactions', src: '/emojis/star.svg' },
  { id: 'check', name: 'Check', category: 'reactions', src: '/emojis/check.svg' },
  { id: 'x_mark', name: 'X', category: 'reactions', src: '/emojis/x-mark.svg' },
  { id: 'clap', name: 'Clap', category: 'reactions', src: '/emojis/clap.svg' },
  { id: 'rocket', name: 'Rocket', category: 'objects', src: '/emojis/rocket.svg' },
  { id: 'trophy', name: 'Trophy', category: 'objects', src: '/emojis/trophy.svg' },
  { id: 'crown', name: 'Crown', category: 'objects', src: '/emojis/crown.svg' },
  { id: 'gem', name: 'Gem', category: 'objects', src: '/emojis/gem.svg' },
  { id: 'lightning', name: 'Lightning', category: 'objects', src: '/emojis/lightning.svg' },
  { id: 'eyes', name: 'Eyes', category: 'faces', src: '/emojis/eyes.svg' },
  { id: 'wave', name: 'Wave', category: 'reactions', src: '/emojis/wave.svg' },
  { id: 'party', name: 'Party', category: 'reactions', src: '/emojis/party.svg' },
  { id: 'ghost', name: 'Ghost', category: 'faces', src: '/emojis/ghost.svg' },
  { id: 'alien', name: 'Alien', category: 'faces', src: '/emojis/alien.svg' },
  { id: 'robot', name: 'Robot', category: 'faces', src: '/emojis/robot.svg' },
  { id: 'poop', name: 'Poop', category: 'faces', src: '/emojis/poop.svg' },
  { id: 'gaming', name: 'Gaming', category: 'objects', src: '/emojis/gaming.svg' },
  { id: 'music', name: 'Music', category: 'objects', src: '/emojis/music.svg' },
  { id: 'pizza', name: 'Pizza', category: 'objects', src: '/emojis/pizza.svg' },
  { id: 'coffee', name: 'Coffee', category: 'objects', src: '/emojis/coffee.svg' },
];

export function getEmojiById(id: string): CustomEmoji | undefined {
  return emojis.find((e) => e.id === id);
}

export const emojiCategories = ['reactions', 'faces', 'objects'] as const;
