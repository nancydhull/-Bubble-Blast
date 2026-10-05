export type BubbleColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'cyan' | 'pink' | 'teal' | 'indigo' | 'lime' | 'amber';
export type BubbleType = 'normal' | 'bomb' | 'rainbow';

export interface GridBubble {
  r: number;
  c: number;
  color: BubbleColor;
  type: BubbleType;
  // For animation
  isPopping?: boolean;
  isDropping?: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: BubbleColor;
  type: BubbleType;
}

export interface Shooter {
  angle: number;
  currentBubble: { color: BubbleColor; type: BubbleType };
  nextBubbles: { color: BubbleColor; type: BubbleType }[];
}

export type GameState = 'login' | 'menu' | 'settings' | 'help' | 'playing' | 'paused' | 'gameover' | 'levelcomplete' | 'gamebeat';
export type Difficulty = 'easy' | 'hard' | 'extra_hard' | 'normal';

export interface ScoreEntry {
  id: string;
  name: string;
  score: number;
  level: number;
  difficulty: Difficulty;
  date: string;
}
