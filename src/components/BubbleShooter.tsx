import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BubbleColor, BubbleType, GameState, GridBubble, Projectile, Shooter, ScoreEntry, Difficulty } from '../types';
import { audio } from '../utils/audio';
import { GameUI } from './UI';
import bgImage from '../assets/images/dark_arcade_bubbles_1785299834606.jpg';
import { 
  BUBBLE_RADIUS, 
  COLORS, 
  COLS,
  ROW_HEIGHT, 
  GRID_TOP_OFFSET,
  generateGrid, 
  getBubbleX, 
  getBubbleY, 
  getConnected, 
  getDisconnected, 
  getNeighbors,
  snapToGrid
} from '../utils/gameMath';

const CANVAS_WIDTH = COLS * BUBBLE_RADIUS * 2;
const CANVAS_HEIGHT = 720;
const SHOOTER_Y = CANVAS_HEIGHT - BUBBLE_RADIUS * 3.5;
const DANGER_LINE_Y = CANVAS_HEIGHT - BUBBLE_RADIUS * 4;
const BUBBLE_SPEED = 30;
const COLORS_MAP: Record<BubbleColor, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
  cyan: '#06b6d4',
  pink: '#ec4899',
  teal: '#14b8a6',
  indigo: '#6366f1',
  lime: '#84cc16',
  amber: '#f59e0b'
};
const COLORS_DARK_MAP: Record<BubbleColor, string> = {
  red: '#991b1b',
  blue: '#1e3a8a',
  green: '#14532d',
  yellow: '#854d0e',
  purple: '#581c87',
  orange: '#9a3412',
  cyan: '#155e75',
  pink: '#831843',
  teal: '#134e4a',
  indigo: '#312e81',
  lime: '#3f6212',
  amber: '#78350f'
};

export const BubbleShooter: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // App States
  const [gameState, setGameState] = useState<GameState>('login');
  const [playerName, setPlayerName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Game Session States
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [shotsLeft, setShotsLeft] = useState(35);
  const [startingLevel, setStartingLevel] = useState(1);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(1);
  const [inventory, setInventory] = useState({ bombs: 3, rainbows: 3 });

  // Helper to unlock next level
  const unlockNextLevel = useCallback((clearedLevel: number) => {
    const nextLvl = Math.min(100, clearedLevel + 1);
    setMaxUnlockedLevel(prev => {
      const updated = Math.max(prev, nextLvl);
      localStorage.setItem('bubbleMaxUnlockedLevel', String(updated));
      return updated;
    });
  }, []);
  
  // Game Engine Refs
  const gridRef = useRef<GridBubble[]>([]);
  const missesCount = useRef(0);
  const isAimingRef = useRef(false);
  const shooterRef = useRef<Shooter>({
    angle: -Math.PI / 2,
    currentBubble: { color: COLORS[0], type: 'normal' },
    nextBubbles: [
      { color: COLORS[1], type: 'normal' },
      { color: COLORS[2], type: 'normal' }
    ]
  } as Shooter);
  const projectileRef = useRef<Projectile | null>(null);
  const poppingRef = useRef<{ bubbles: GridBubble[], time: number }[]>([]);
  const droppingRef = useRef<GridBubble[]>([]);
  const roofDrop = useRef(0);
  const highestRowSpawned = useRef(0);

  // Load preferences on mount
  useEffect(() => {
    const savedName = localStorage.getItem('bubblePlayerName');
    if (savedName) {
      setPlayerName(savedName);
      setGameState('menu');
    }
    const savedDiff = localStorage.getItem('bubbleDifficulty') as Difficulty;
    if (savedDiff) setDifficulty(savedDiff);
    const savedSound = localStorage.getItem('bubbleSound');
    if (savedSound !== null) {
      const isEnabled = savedSound === 'true';
      setSoundEnabled(isEnabled);
      audio.toggle(isEnabled);
    }
    const savedMaxUnlocked = localStorage.getItem('bubbleMaxUnlockedLevel');
    let maxUnlocked = 1;
    if (savedMaxUnlocked) {
      maxUnlocked = Math.max(1, parseInt(savedMaxUnlocked, 10) || 1);
      setMaxUnlockedLevel(maxUnlocked);
    }
    const savedLevel = localStorage.getItem('bubbleStartingLevel');
    if (savedLevel) {
      const parsedLvl = parseInt(savedLevel, 10) || 1;
      setStartingLevel(Math.min(parsedLvl, maxUnlocked));
    }
  }, []);

  // Save preferences
  useEffect(() => {
    if (playerName) localStorage.setItem('bubblePlayerName', playerName);
    localStorage.setItem('bubbleDifficulty', difficulty);
    localStorage.setItem('bubbleSound', String(soundEnabled));
    localStorage.setItem('bubbleStartingLevel', String(startingLevel));
    localStorage.setItem('bubbleMaxUnlockedLevel', String(maxUnlockedLevel));
  }, [playerName, difficulty, soundEnabled, startingLevel, maxUnlockedLevel]);

  // Sync sound toggle and game state with Audio Engine
  useEffect(() => {
    audio.toggle(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    audio.updateBGMState(gameState);
  }, [gameState]);

  // One-time interaction listener to unlock AudioContext on initial click/touch
  useEffect(() => {
    const handleFirstInteraction = () => {
      audio.init();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('pointerdown', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  const getRandomColor = useCallback((currentLevel: number, currentDifficulty: Difficulty, excludeColor?: string) => {
    // Pick color from remaining active bubbles on the grid
    const remaining = gridRef.current ? gridRef.current.filter(b => !b.isPopping && !b.isDropping) : [];
    const activeColors = Array.from(new Set(remaining.map(b => b.color)));

    if (activeColors.length > 0) {
      let available = activeColors;
      if (excludeColor && activeColors.length > 1) {
        available = activeColors.filter(c => c !== excludeColor);
      }
      const chosenColor = available[Math.floor(Math.random() * available.length)];
      return { color: chosenColor, type: 'normal' } as const;
    }

    let diffBoost = 0;
    if (currentDifficulty === 'hard') diffBoost = 1;
    if (currentDifficulty === 'extra_hard') diffBoost = 2;

    const numColors = Math.min(COLORS.length, Math.max(3, 3 + Math.floor((currentLevel - 1) / 2) + diffBoost));
    const validColors = COLORS.slice(0, numColors);
    let available = validColors;
    if (excludeColor && validColors.length > 1) {
      available = validColors.filter(c => c !== excludeColor);
    }
    
    return { 
      color: available[Math.floor(Math.random() * available.length)], 
      type: 'normal' 
    } as const;
  }, []);

  const validateShooterColors = useCallback(() => {
    if (!shooterRef.current) return;
    const remaining = gridRef.current ? gridRef.current.filter(b => !b.isPopping && !b.isDropping) : [];
    if (remaining.length === 0) return;

    const activeColors = Array.from(new Set(remaining.map(b => b.color)));
    if (activeColors.length === 0) return;

    // Fix current shooter bubble if its color no longer exists on board
    if (!activeColors.includes(shooterRef.current.currentBubble.color)) {
      const newColor = activeColors[Math.floor(Math.random() * activeColors.length)];
      shooterRef.current.currentBubble = {
        ...shooterRef.current.currentBubble,
        color: newColor
      };
    }

    // Fix queue bubbles if their color no longer exists on board
    if (shooterRef.current.nextBubbles) {
      shooterRef.current.nextBubbles = shooterRef.current.nextBubbles.map(b => {
        if (!activeColors.includes(b.color)) {
          const newColor = activeColors[Math.floor(Math.random() * activeColors.length)];
          return { ...b, color: newColor };
        }
        return b;
      });
    }
  }, []);

  const initGame = useCallback((newLevel = 1, keepScore = false) => {
    if (newLevel > 100) {
      setGameState('gamebeat');
      return;
    }

    if (!keepScore) setScore(0);
    setLevel(newLevel);
    setInventory({ 
      bombs: Math.floor(newLevel / 5) + 3, 
      rainbows: Math.floor(newLevel / 5) + 3 
    });
    
    // Initial rows scaling with level (e.g. Level 1: 5 rows, Level 15+: 13-14 rows as shown in user photos)
    let startRows = Math.min(14, 5 + Math.floor((newLevel - 1) * 0.6));
    if (difficulty === 'hard') startRows = Math.min(14, startRows + 1);
    if (difficulty === 'extra_hard') startRows = Math.min(14, startRows + 2);

    let diffBoost = 0;
    if (difficulty === 'hard') diffBoost = 1;
    if (difficulty === 'extra_hard') diffBoost = 2;
    const numColors = Math.min(COLORS.length, Math.max(3, 3 + Math.floor((newLevel - 1) / 2) + diffBoost));

    // Shots limit scaled with initial row count and level so player has adequate shots for dense levels
    const baseShots = Math.max(35, Math.floor(startRows * 3.8 + 15 + newLevel * 0.5));
    const extraShots = difficulty === 'easy' ? 12 : difficulty === 'hard' ? -5 : difficulty === 'extra_hard' ? -8 : 0;
    setShotsLeft(baseShots + extraShots);

    gridRef.current = generateGrid(startRows, numColors, newLevel);
    
    // Determine number of swap/queue balls based on Level
    let baseNext = 2;
    if (newLevel >= 5) baseNext = 3;
    if (newLevel >= 15) baseNext = 4;
    if (newLevel >= 35) baseNext = 5;
    if (newLevel >= 60) baseNext = 6;

    if (difficulty === 'easy') baseNext = Math.min(6, baseNext + 1);
    if (difficulty === 'hard' || difficulty === 'extra_hard') baseNext = Math.max(2, baseNext - 1);

    const firstBubble = getRandomColor(newLevel, difficulty);
    let lastColor = firstBubble.color;
    const queued: ReturnType<typeof getRandomColor>[] = [];
    for (let i = 0; i < baseNext; i++) {
      const b = getRandomColor(newLevel, difficulty, lastColor);
      lastColor = b.color;
      queued.push(b);
    }

    shooterRef.current = {
      angle: -Math.PI / 2,
      currentBubble: firstBubble,
      nextBubbles: queued
    };
    
    projectileRef.current = null;
    poppingRef.current = [];
    droppingRef.current = [];
    roofDrop.current = 0;
    highestRowSpawned.current = 0;
    missesCount.current = 0;
    
    setGameState('playing');
  }, [getRandomColor, difficulty]);

  // Handle Input
  const updateAngle = useCallback((clientX: number, clientY: number) => {
    if (gameState !== 'playing' || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    
    const mouseX = (clientX - rect.left) * scaleX;
    const mouseY = (clientY - rect.top) * scaleY;
    
    const shooterX = CANVAS_WIDTH / 2;
    const shooterY = SHOOTER_Y;
    
    const dx = mouseX - shooterX;
    const dy = mouseY - shooterY;
    
    let angle = Math.atan2(dy, dx);
    
    // Slingshot mode: if pointing downwards, invert it to aim upwards
    if (angle > 0) {
      angle = angle - Math.PI;
    }
    
    if (angle > -0.1) angle = -0.1;
    if (angle < -Math.PI + 0.1) angle = -Math.PI + 0.1;
    
    shooterRef.current.angle = angle;
  }, [gameState]);

  const shoot = useCallback(() => {
    if (gameState !== 'playing') return;
    if (projectileRef.current !== null) return;
    
    audio.shoot();
    setShotsLeft(prev => Math.max(0, prev - 1));
    
    const shooterX = CANVAS_WIDTH / 2;
    const shooterY = SHOOTER_Y;
    const angle = shooterRef.current.angle;
    
    projectileRef.current = {
      x: shooterX,
      y: shooterY,
      vx: Math.cos(angle) * BUBBLE_SPEED,
      vy: Math.sin(angle) * BUBBLE_SPEED,
      color: shooterRef.current.currentBubble.color,
      type: shooterRef.current.currentBubble.type
    };
    
    shooterRef.current.currentBubble = shooterRef.current.nextBubbles[0];
    const len = shooterRef.current.nextBubbles.length;
    for (let i = 0; i < len - 1; i++) {
      shooterRef.current.nextBubbles[i] = shooterRef.current.nextBubbles[i + 1];
    }
    const lastColorInQueue = shooterRef.current.nextBubbles[len - 2]?.color || shooterRef.current.currentBubble.color;
    shooterRef.current.nextBubbles[len - 1] = getRandomColor(level, difficulty, lastColorInQueue);
    validateShooterColors();
  }, [gameState, level, difficulty, getRandomColor, validateShooterColors]);

  useEffect(() => {
    let isDragging = false;
    
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || gameState !== 'playing') return;
      updateAngle(e.clientX, e.clientY);
    };
    
    const handlePointerDown = (e: PointerEvent) => {
      if (gameState !== 'playing') return;
      // Ignore clicks on buttons/UI
      if ((e.target as HTMLElement).closest('button')) return;
      
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        
        const shooterX = CANVAS_WIDTH / 2;
        const shooterY = SHOOTER_Y;

        // Direct click/tap on any numbered queued ball -> swaps that ball into launcher position
        const nextBubbles = shooterRef.current.nextBubbles;
        if (nextBubbles && nextBubbles.length > 0) {
          const total = nextBubbles.length;
          const startAngle = Math.PI * 0.15;
          const endAngle = Math.PI * 0.85;
          for (let i = 0; i < total; i++) {
            const angle = total === 1 ? Math.PI / 2 : startAngle + (endAngle - startAngle) * (i / (total - 1));
            const nx = shooterX + Math.cos(angle) * (BUBBLE_RADIUS * 2.8);
            const ny = shooterY + Math.sin(angle) * (BUBBLE_RADIUS * 2.8);
            const dx_ball = mouseX - nx;
            const dy_ball = mouseY - ny;
            if (dx_ball*dx_ball + dy_ball*dy_ball <= (BUBBLE_RADIUS * 1.5) ** 2) {
              audio.pop();
              const temp = shooterRef.current.currentBubble;
              shooterRef.current.currentBubble = nextBubbles[i];
              shooterRef.current.nextBubbles[i] = temp;
              isDragging = false;
              isAimingRef.current = false;
              return;
            }
          }
        }
      }

      isDragging = true;
      isAimingRef.current = true;
      if (e.target === canvasRef.current) e.preventDefault();
      updateAngle(e.clientX, e.clientY);
    };
    
    const handlePointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      isAimingRef.current = false;
      shoot();
    };

    const handlePointerCancel = () => {
      isDragging = false;
      isAimingRef.current = false;
    };

    // Use passive: false to prevent scrolling on touch devices
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerdown', handlePointerDown, { passive: false });
    window.addEventListener('pointerup', handlePointerUp, { passive: false });
    window.addEventListener('pointercancel', handlePointerCancel, { passive: false });
    
    // Prevent default touch behaviors on canvas only
    const canvas = canvasRef.current;
    const preventDefault = (e: TouchEvent) => {
      if (gameState === 'playing') e.preventDefault();
    };
    if (canvas) {
      canvas.addEventListener('touchstart', preventDefault, { passive: false });
      canvas.addEventListener('touchmove', preventDefault, { passive: false });
    }
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      if (canvas) {
        canvas.removeEventListener('touchstart', preventDefault);
        canvas.removeEventListener('touchmove', preventDefault);
      }
    };
  }, [updateAngle, shoot, gameState]);

  // Main Game Loop
  const update = useCallback(() => {
    if (gameState !== 'playing') return;

    // --- ROOF & SPAWNING ---
    // Roof drops on miss streaks automatically handled in collision detection

    // --- PROJECTILE UPDATE ---
    if (projectileRef.current) {
      const proj = projectileRef.current;
      const subSteps = 6;
      let stepVx = proj.vx / subSteps;
      const stepVy = proj.vy / subSteps;
      let collision = false;
      let hitGridBomb: GridBubble | null = null;

      for (let s = 0; s < subSteps; s++) {
        proj.x += stepVx;
        proj.y += stepVy;
        
        // Wall collision
        if (proj.x - BUBBLE_RADIUS <= 0) {
          const overshoot = BUBBLE_RADIUS - proj.x;
          proj.vx *= -1;
          stepVx = proj.vx / subSteps;
          proj.x = BUBBLE_RADIUS + overshoot;
        } else if (proj.x + BUBBLE_RADIUS >= CANVAS_WIDTH) {
          const overshoot = proj.x + BUBBLE_RADIUS - CANVAS_WIDTH;
          proj.vx *= -1;
          stepVx = proj.vx / subSteps;
          proj.x = CANVAS_WIDTH - BUBBLE_RADIUS - overshoot;
        }
        
        // Top collision (visual top edge, adjusting for roofDrop and GRID_TOP_OFFSET)
        if (proj.y - BUBBLE_RADIUS <= GRID_TOP_OFFSET + roofDrop.current) {
          collision = true;
          break;
        }

        // Check collision with existing grid bubbles (using tight radius so balls squeeze through gaps)
        for (const b of gridRef.current) {
          if (b.isPopping || b.isDropping) continue;
          const bx = getBubbleX(b.r, b.c, BUBBLE_RADIUS);
          const by = getBubbleY(b.r, BUBBLE_RADIUS, roofDrop.current);
          const distSq = (proj.x - bx) ** 2 + (proj.y - by) ** 2;
          if (distSq < (BUBBLE_RADIUS * 1.85) ** 2) { 
            collision = true;
            if (b.type === 'bomb') {
              hitGridBomb = b;
            }
            break;
          }
        }

        if (collision) break;
      }
      
      if (collision) {
        // If projectile hit a bomb on the board (and wasn't a player bomb power-up)
        if (hitGridBomb && proj.type !== 'bomb') {
          audio.bomb();
          const toPop: GridBubble[] = [hitGridBomb];
          for (const b of gridRef.current) {
            if (b.isPopping || b.isDropping) continue;
            const distR = Math.abs(b.r - hitGridBomb.r);
            const distC = Math.abs(b.c - hitGridBomb.c);
            if (distR <= 1 && distC <= 1) {
              toPop.push(b);
            }
          }
          toPop.forEach(b => b.isPopping = true);
          poppingRef.current.push({ bubbles: toPop, time: 0 });
          projectileRef.current = null;

          setTimeout(() => {
            audio.gameover();
            setGameState('gameover');
          }, 350);
          return;
        }

        const { r, c } = snapToGrid(proj.x, proj.y, BUBBLE_RADIUS, gridRef.current, roofDrop.current);
        const newBubble: GridBubble = {
          r, c, color: proj.color, type: proj.type
        };

        // Check if placed ball touched an adjacent bomb in grid
        const neighbors = getNeighbors(r, c);
        const adjacentBomb = proj.type !== 'bomb' ? gridRef.current.find(b => 
          !b.isPopping && !b.isDropping && b.type === 'bomb' && 
          neighbors.some(n => n.r === b.r && n.c === b.c)
        ) : null;

        if (adjacentBomb) {
          audio.bomb();
          gridRef.current.push(newBubble);
          projectileRef.current = null;

          const toPop: GridBubble[] = [adjacentBomb, newBubble];
          for (const b of gridRef.current) {
            if (b.isPopping || b.isDropping) continue;
            const distR = Math.abs(b.r - adjacentBomb.r);
            const distC = Math.abs(b.c - adjacentBomb.c);
            if (distR <= 1 && distC <= 1) {
              toPop.push(b);
            }
          }
          toPop.forEach(b => b.isPopping = true);
          poppingRef.current.push({ bubbles: toPop, time: 0 });

          setTimeout(() => {
            audio.gameover();
            setGameState('gameover');
          }, 350);
          return;
        }

        gridRef.current.push(newBubble);
        projectileRef.current = null;
        
        let toPop: GridBubble[] = [];
        
        if (newBubble.type === 'bomb') {
          audio.bomb();
          toPop.push(newBubble);
          for (const b of gridRef.current) {
            if (b.isPopping || b.isDropping) continue;
            const distR = Math.abs(b.r - newBubble.r);
            const distC = Math.abs(b.c - newBubble.c);
            if (distR <= 1 && distC <= 1) {
               toPop.push(b);
            }
          }
        } else if (newBubble.type === 'rainbow') {
          audio.bomb();
          toPop.push(newBubble);
          
          const neighborColors = new Set<string>();
          const neighbors = getNeighbors(newBubble.r, newBubble.c);
          
          for (const n of neighbors) {
            const b = gridRef.current.find(b => b.r === n.r && b.c === n.c && !b.isPopping && !b.isDropping);
            if (b) neighborColors.add(b.color);
          }
          
          if (neighborColors.size > 0) {
            for (const b of gridRef.current) {
              if (b.isPopping || b.isDropping) continue;
              if (neighborColors.has(b.color)) {
                toPop.push(b);
              }
            }
          }
        } else {
          const connected = getConnected(gridRef.current, newBubble, newBubble.color, true);
          if (connected.length >= 3) {
            toPop = connected;
          }
        }
        
        if (toPop.length >= (newBubble.type === 'bomb' ? 1 : 3)) {
          audio.pop();
          missesCount.current = 0;
          toPop.forEach(b => b.isPopping = true);
          poppingRef.current.push({ bubbles: toPop, time: 0 });
          setScore(s => s + toPop.length * 10);
          
          setTimeout(() => {
            const disconnected = getDisconnected(gridRef.current);
            if (disconnected.length > 0) {
              disconnected.forEach(b => {
                b.isDropping = true;
                b.x = getBubbleX(b.r, b.c, BUBBLE_RADIUS);
                b.y = getBubbleY(b.r, BUBBLE_RADIUS, roofDrop.current);
                b.vx = (Math.random() - 0.5) * 5;
                b.vy = 0;
              });
              droppingRef.current.push(...disconnected);
              setScore(s => s + disconnected.length * 20);
            }
          }, 50);
        } else {
          // Missed shot -> increment miss counter
          missesCount.current += 1;
          const maxMisses = difficulty === 'easy' ? 6 : difficulty === 'hard' ? 4 : 5;
          if (missesCount.current >= maxMisses) {
            roofDrop.current += ROW_HEIGHT;
            missesCount.current = 0;
          }
        }
        
      }
    }

    // --- GAME OVER AND WIN CHECK ---
    const remaining = gridRef.current.filter(b => !b.isPopping && !b.isDropping).length;
    
    if (remaining === 0 && poppingRef.current.length === 0 && droppingRef.current.length === 0 && projectileRef.current === null) {
      audio.win();
      unlockNextLevel(level);
      setGameState('levelcomplete');
    } else {
      let isGameOver = false;
      
      // Danger line check
      for (const b of gridRef.current) {
        if (b.isPopping || b.isDropping) continue;
        const by = getBubbleY(b.r, BUBBLE_RADIUS, roofDrop.current);
        if (by >= DANGER_LINE_Y) {
          isGameOver = true;
          break;
        }
      }

      // Out of shots check
      if (!isGameOver && shotsLeft <= 0 && projectileRef.current === null && poppingRef.current.length === 0 && droppingRef.current.length === 0 && remaining > 0) {
        isGameOver = true;
      }

      if (isGameOver) {
        audio.gameover();
        setGameState('gameover');
      }
    }
    
    // --- ANIMATION UPDATES ---
    for (let i = poppingRef.current.length - 1; i >= 0; i--) {
      const popGroup = poppingRef.current[i];
      popGroup.time += 0.05;
      if (popGroup.time >= 1) {
        gridRef.current = gridRef.current.filter(b => !popGroup.bubbles.includes(b));
        poppingRef.current.splice(i, 1);
        validateShooterColors();
      }
    }
    
    for (let i = droppingRef.current.length - 1; i >= 0; i--) {
      const drop = droppingRef.current[i];
      if (drop.y !== undefined && drop.vy !== undefined && drop.x !== undefined) {
        drop.vy += 0.5;
        drop.y += drop.vy;
        drop.x += drop.vx || 0;
        
        if (drop.y > CANVAS_HEIGHT + BUBBLE_RADIUS) {
          gridRef.current = gridRef.current.filter(b => b !== drop);
          droppingRef.current.splice(i, 1);
          validateShooterColors();
        }
      }
    }

  }, [gameState, level, difficulty, validateShooterColors]);

  // Render Loop
  const drawBubble = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, color: string, type: BubbleType, scale = 1, alpha = 1, text?: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    
    // Outer shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    
    ctx.beginPath();
    ctx.arc(0, 0, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
    
    if (type === 'rainbow') {
      const gradient = ctx.createLinearGradient(-BUBBLE_RADIUS, -BUBBLE_RADIUS, BUBBLE_RADIUS, BUBBLE_RADIUS);
      gradient.addColorStop(0, '#ef4444');
      gradient.addColorStop(0.2, '#eab308');
      gradient.addColorStop(0.4, '#22c55e');
      gradient.addColorStop(0.6, '#3b82f6');
      gradient.addColorStop(0.8, '#a855f7');
      gradient.addColorStop(1, '#ef4444');
      ctx.fillStyle = gradient;
    } else if (type === 'bomb') {
      const gradient = ctx.createRadialGradient(-BUBBLE_RADIUS*0.2, -BUBBLE_RADIUS*0.2, BUBBLE_RADIUS*0.1, 0, 0, BUBBLE_RADIUS);
      gradient.addColorStop(0, '#6b7280');
      gradient.addColorStop(1, '#111827');
      ctx.fillStyle = gradient;
    } else {
      const baseColor = COLORS_MAP[color as BubbleColor] || color;
      const darkColor = COLORS_DARK_MAP[color as BubbleColor] || '#000000';
      const gradient = ctx.createRadialGradient(-BUBBLE_RADIUS*0.3, -BUBBLE_RADIUS*0.3, BUBBLE_RADIUS*0.1, 0, 0, BUBBLE_RADIUS);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, baseColor);
      gradient.addColorStop(0.9, darkColor);
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
    }
    
    ctx.fill();
    ctx.shadowColor = 'transparent';
    
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.stroke();
    
    // Glossy Highlight
    ctx.beginPath();
    ctx.arc(-BUBBLE_RADIUS * 0.3, -BUBBLE_RADIUS * 0.3, BUBBLE_RADIUS * 0.35, 0, Math.PI * 2);
    const hlGradient = ctx.createLinearGradient(-BUBBLE_RADIUS*0.6, -BUBBLE_RADIUS*0.6, 0, 0);
    hlGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    hlGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = hlGradient;
    ctx.fill();
    
    if (type === 'bomb') {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💣', 0, 0);
    } else if (type === 'rainbow') {
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', 0, 0);
    }

    if (text) {
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 1;
      ctx.fillText(text, 0, 0);
      ctx.shadowColor = 'transparent';
    }

    ctx.restore();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // High-DPI Canvas Scaling to fix blurriness on all displays
    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(CANVAS_WIDTH * dpr);
    const targetH = Math.round(CANVAS_HEIGHT * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Draw clean dark polished stage background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.6, '#1e1b4b');
    bgGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Crisp grid dots pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    for (let x = 15; x < CANVAS_WIDTH; x += 30) {
      for (let y = 15; y < CANVAS_HEIGHT; y += 30) {
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Playfield outer border
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, CANVAS_WIDTH - 2, CANVAS_HEIGHT - 2);
    
    for (const b of gridRef.current) {
      if (b.isPopping || b.isDropping) continue;
      const x = getBubbleX(b.r, b.c, BUBBLE_RADIUS);
      const y = getBubbleY(b.r, BUBBLE_RADIUS, roofDrop.current);
      drawBubble(ctx, x, y, b.color, b.type);
    }
    
    for (const popGroup of poppingRef.current) {
      const scale = 1 + popGroup.time * 0.5;
      const alpha = 1 - popGroup.time;
      for (const b of popGroup.bubbles) {
        const x = getBubbleX(b.r, b.c, BUBBLE_RADIUS);
        const y = getBubbleY(b.r, BUBBLE_RADIUS, roofDrop.current);
        drawBubble(ctx, x, y, b.color, b.type, scale, alpha);
      }
    }
    
    for (const b of droppingRef.current) {
      if (b.x !== undefined && b.y !== undefined) {
        drawBubble(ctx, b.x, b.y, b.color, b.type);
      }
    }
    
    if (gameState === 'playing' || gameState === 'paused') {
      const shooterX = CANVAS_WIDTH / 2;
      const shooterY = SHOOTER_Y;
      const { angle, currentBubble, nextBubbles } = shooterRef.current;
      
      // Draw Danger Line
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, DANGER_LINE_Y);
      ctx.lineTo(CANVAS_WIDTH, DANGER_LINE_Y);
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'; // red dash
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
  
      // Draw Aiming Line
      if (!projectileRef.current) {
        ctx.save();
        ctx.beginPath();
        let cx = shooterX;
        let cy = shooterY;
        let vx = Math.cos(angle);
        let vy = Math.sin(angle);
        
        ctx.moveTo(cx, cy);
        ctx.setLineDash([8, 12]);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)'; // purple dash
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        let hit = false;
        const step = BUBBLE_SPEED / 6;
        for (let i = 0; i < 300; i++) {
          cx += vx * step;
          cy += vy * step;
          
          if (cx <= BUBBLE_RADIUS) {
            const overshoot = BUBBLE_RADIUS - cx;
            cx = BUBBLE_RADIUS;
            ctx.lineTo(cx, cy);
            cx = BUBBLE_RADIUS + overshoot;
            vx = -vx;
          } else if (cx >= CANVAS_WIDTH - BUBBLE_RADIUS) {
            const overshoot = cx - (CANVAS_WIDTH - BUBBLE_RADIUS);
            cx = CANVAS_WIDTH - BUBBLE_RADIUS;
            ctx.lineTo(cx, cy);
            cx = CANVAS_WIDTH - BUBBLE_RADIUS - overshoot;
            vx = -vx;
          }
          
          if (cy <= BUBBLE_RADIUS + GRID_TOP_OFFSET + roofDrop.current) {
            cy = BUBBLE_RADIUS + GRID_TOP_OFFSET + roofDrop.current;
            ctx.lineTo(cx, cy);
            hit = true;
            break;
          }
          
          // Check collision with grid bubbles
          let hitBubble = false;
          for (const b of gridRef.current) {
             if (b.isPopping || b.isDropping) continue;
             const bx = getBubbleX(b.r, b.c, BUBBLE_RADIUS);
             const by = getBubbleY(b.r, BUBBLE_RADIUS, roofDrop.current);
             const distSq = (cx - bx) * (cx - bx) + (cy - by) * (cy - by);
             if (distSq < (BUBBLE_RADIUS * 1.85) * (BUBBLE_RADIUS * 1.85)) {
                hitBubble = true;
                break;
             }
          }
          if (hitBubble) {
             ctx.lineTo(cx, cy);
             hit = true;
             break;
          }
        }
        if (!hit) {
           ctx.lineTo(cx, cy);
        }
        ctx.stroke();
        
        if (hit) {
           ctx.beginPath();
           ctx.arc(cx, cy, BUBBLE_RADIUS, 0, Math.PI * 2);
           ctx.strokeStyle = isAimingRef.current ? 'rgba(234, 179, 8, 0.95)' : 'rgba(168, 85, 247, 0.8)';
           ctx.lineWidth = isAimingRef.current ? 3 : 2;
           ctx.setLineDash([]);
           ctx.stroke();

           ctx.beginPath();
           ctx.arc(cx, cy, 6, 0, Math.PI * 2);
           ctx.fillStyle = isAimingRef.current ? '#facc15' : 'rgba(168, 85, 247, 0.8)';
           ctx.fill();
        }
        
        ctx.restore();
      }
      
      // Draw Shooter Base Ring / Circular Launcher Pedestal
      ctx.save();
      ctx.beginPath();
      ctx.arc(shooterX, shooterY, BUBBLE_RADIUS * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'; // slate-900 background
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = isAimingRef.current ? 'rgba(234, 179, 8, 0.9)' : 'rgba(168, 85, 247, 0.7)'; // glowing border
      ctx.stroke();
      ctx.restore();

      // Draw Next Bubbles Circle Track
      if (nextBubbles && nextBubbles.length > 0) {
        const total = nextBubbles.length;
        const startAngle = Math.PI * 0.15;
        const endAngle = Math.PI * 0.85;

        // Curved arc connecting the swap ball slots
        ctx.save();
        ctx.beginPath();
        ctx.arc(shooterX, shooterY, BUBBLE_RADIUS * 2.8, startAngle, endAngle);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.restore();

        nextBubbles.forEach((nextB, idx) => {
          ctx.save();
          const arcAngle = total === 1 ? Math.PI / 2 : startAngle + (endAngle - startAngle) * (idx / (total - 1));
          const nx = shooterX + Math.cos(arcAngle) * (BUBBLE_RADIUS * 2.8);
          const ny = shooterY + Math.sin(arcAngle) * (BUBBLE_RADIUS * 2.8);
          ctx.translate(nx, ny);
          
          // Outer glowing ring slot
          ctx.beginPath();
          ctx.arc(0, 0, BUBBLE_RADIUS * 0.85, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.8)';
          ctx.stroke();

          // Draw bubble
          drawBubble(ctx, 0, 0, nextB.color, nextB.type, 0.7);

          // Draw Number Badge Circle on top right of ball
          ctx.beginPath();
          ctx.arc(BUBBLE_RADIUS * 0.45, -BUBBLE_RADIUS * 0.45, 10, 0, Math.PI * 2);
          ctx.fillStyle = '#a855f7';
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(idx + 1), BUBBLE_RADIUS * 0.45, -BUBBLE_RADIUS * 0.45);

          ctx.restore();
        });
      }
      
      // Draw current shooter bubble
      if (projectileRef.current) {
        const p = projectileRef.current;
        drawBubble(ctx, p.x, p.y, p.color, p.type);
        // Draw a placeholder where it was
        ctx.beginPath();
        ctx.arc(shooterX, shooterY, BUBBLE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fill();
      } else {
        drawBubble(ctx, shooterX, shooterY, currentBubble.color, currentBubble.type);

        // Draw 3D Aiming Arrow on top of the shooter ball
        ctx.save();
        ctx.translate(shooterX, shooterY);
        ctx.rotate(angle);

        const isAiming = isAimingRef.current;
        const arrowLength = isAiming ? BUBBLE_RADIUS * 2.2 : BUBBLE_RADIUS * 1.8;
        const arrowHeadWidth = 16;
        const arrowHeadLen = 18;

        // Glowing shadow effect for the arrow
        ctx.shadowColor = isAiming ? '#f59e0b' : '#ec4899';
        ctx.shadowBlur = isAiming ? 15 : 8;

        // Arrow Shaft / Stem
        ctx.beginPath();
        ctx.rect(0, -4, arrowLength - arrowHeadLen, 8);
        ctx.fillStyle = isAiming ? '#fef08a' : '#ffffff';
        ctx.fill();

        // Arrow Head Triangle
        ctx.beginPath();
        ctx.moveTo(arrowLength, 0);
        ctx.lineTo(arrowLength - arrowHeadLen, -arrowHeadWidth / 2);
        ctx.lineTo(arrowLength - arrowHeadLen, arrowHeadWidth / 2);
        ctx.closePath();

        const arrowGradient = ctx.createLinearGradient(0, 0, arrowLength, 0);
        if (isAiming) {
          arrowGradient.addColorStop(0, '#facc15'); // bright amber
          arrowGradient.addColorStop(1, '#ef4444'); // red tip
        } else {
          arrowGradient.addColorStop(0, '#a855f7'); // purple
          arrowGradient.addColorStop(1, '#ec4899'); // pink tip
        }
        ctx.fillStyle = arrowGradient;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Inner Arrow Center Ring
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.restore();
      }
    }

    ctx.restore();
    
  }, [drawBubble, gameState]);

  const loop = useCallback(() => {
    update();
    draw();
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    audio.init();
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [loop]);

  // Save score on game over or game beat
  useEffect(() => {
    if (gameState === 'gameover' || gameState === 'gamebeat') {
      const saved = localStorage.getItem('bubbleLeaderboard');
      let leaderboard: ScoreEntry[] = saved ? JSON.parse(saved) : [];
      
      const newEntry: ScoreEntry = {
        id: Date.now().toString(),
        name: playerName,
        score,
        level,
        difficulty,
        date: new Date().toISOString()
      };
      
      leaderboard.push(newEntry);
      leaderboard.sort((a, b) => b.score - a.score);
      leaderboard = leaderboard.slice(0, 10);
      
      localStorage.setItem('bubbleLeaderboard', JSON.stringify(leaderboard));
    }
  }, [gameState, score, level, playerName, difficulty]);

  const handleUsePowerup = (type: 'bomb' | 'rainbow') => {
    if (gameState !== 'playing' || projectileRef.current) return;
    if (type === 'bomb' && inventory.bombs > 0) {
      shooterRef.current.currentBubble = { color: 'black', type: 'bomb' };
      setInventory(prev => ({ ...prev, bombs: prev.bombs - 1 }));
    } else if (type === 'rainbow' && inventory.rainbows > 0) {
      shooterRef.current.currentBubble = { color: 'white', type: 'rainbow' };
      setInventory(prev => ({ ...prev, rainbows: prev.rainbows - 1 }));
    }
  };

  return (
    <div 
      className="relative w-full h-[100dvh] bg-slate-950 overflow-hidden flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `linear-gradient(to bottom right, rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.94)), url(${bgImage})` }}
    >
      {/* Game Canvas Container - scaled proportionally to fill full available screen height */}
      <div 
        className="relative h-full w-full max-h-[100dvh] flex items-center justify-center overflow-hidden mx-auto shadow-2xl shadow-purple-950/60 border-0 sm:border border-slate-700/60 rounded-none sm:rounded-3xl"
        style={{
          width: '100%',
          maxWidth: `min(100%, calc(100dvh * ${CANVAS_WIDTH} / ${CANVAS_HEIGHT}))`,
          aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
        }}
      >
        <canvas 
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full cursor-crosshair touch-none block z-0 object-contain rounded-none sm:rounded-3xl"
        />

        <GameUI 
          gameState={gameState}
          setGameState={setGameState}
          score={score}
          level={level}
          shotsLeft={shotsLeft}
          playerName={playerName}
          setPlayerName={setPlayerName}
          startingLevel={startingLevel}
          setStartingLevel={setStartingLevel}
          maxUnlockedLevel={maxUnlockedLevel}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          onStart={() => initGame(startingLevel)}
          onRestart={() => initGame(level)}
          onNextLevel={() => initGame(level + 1, true)}
          onHome={() => setGameState('menu')}
          inventory={inventory}
          onUsePowerup={handleUsePowerup}
        />
      </div>
    </div>
  );
};
