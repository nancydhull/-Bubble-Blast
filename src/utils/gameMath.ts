import { BubbleColor, BubbleType, GridBubble } from '../types';

export const COLORS: BubbleColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'pink', 'teal', 'indigo', 'lime', 'amber'];
export const BUBBLE_RADIUS = 20; 
export const COLS = 12;
export const ROW_HEIGHT = BUBBLE_RADIUS * Math.sqrt(3);
export const GRID_TOP_OFFSET = 45;

export function getBubbleX(r: number, c: number, radius: number): number {
  const xOffset = Math.abs(r) % 2 === 1 ? radius : 0;
  return c * radius * 2 + radius + xOffset;
}

export function getBubbleY(r: number, radius: number, roofDrop: number = 0): number {
  return r * radius * Math.sqrt(3) + radius + roofDrop + GRID_TOP_OFFSET;
}

export function distance(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function generateGrid(rows: number, numColors: number, level: number = 1): GridBubble[] {
  const grid: GridBubble[] = [];
  const levelColors = COLORS.slice(0, numColors);
  
  // Create beautiful structured patterns for high levels (V-shapes, chevrons, stripes, concentric rings)
  const patternType = level % 3; // 0: stripes, 1: V-shape / chevron, 2: concentric / block clusters

  for (let r = 0; r < rows; r++) {
    const colsInRow = Math.abs(r) % 2 === 0 ? COLS : COLS - 1;
    for (let c = 0; c < colsInRow; c++) {
      let colorIndex: number;
      if (level >= 8 && patternType === 0) {
        // Horizontal/diagonal color stripes pattern
        colorIndex = (r + Math.floor(c / 2)) % levelColors.length;
      } else if (level >= 8 && patternType === 1) {
        // V-shape / chevron pattern (like classic bubble shooter level images)
        const centerCol = COLS / 2;
        const vOffset = Math.abs(c - centerCol);
        colorIndex = Math.floor(r + vOffset) % levelColors.length;
      } else if (level >= 8 && patternType === 2) {
        // Diamond / concentric pattern
        const centerCol = COLS / 2;
        const distFromCenter = Math.abs(c - centerCol) + Math.abs(r - Math.floor(rows / 2));
        colorIndex = Math.floor(distFromCenter) % levelColors.length;
      } else {
        // standard random distribution with local variety
        colorIndex = Math.floor(Math.random() * levelColors.length);
      }

      grid.push({
        r,
        c,
        color: levelColors[colorIndex],
        type: 'normal',
      });
    }
  }

  // Place bomb bubbles among the grid - scales with level
  const bombCount = Math.max(2, Math.min(20, 2 + Math.floor((level - 1) * 1.5)));
  const candidates = grid.filter(b => b.r >= 1);
  const pool = candidates.length >= bombCount ? candidates : grid;

  const indices = Array.from({ length: pool.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  for (let i = 0; i < Math.min(bombCount, indices.length); i++) {
    pool[indices[i]].type = 'bomb';
  }

  return grid;
}

export function getNeighbors(r: number, c: number): { r: number; c: number }[] {
  const isOdd = Math.abs(r) % 2 === 1;
  return [
    { r: r, c: c - 1 },
    { r: r, c: c + 1 },
    { r: r - 1, c: isOdd ? c : c - 1 },
    { r: r - 1, c: isOdd ? c + 1 : c },
    { r: r + 1, c: isOdd ? c : c - 1 },
    { r: r + 1, c: isOdd ? c + 1 : c },
  ];
}

export function snapToGrid(px: number, py: number, radius: number, grid: GridBubble[], roofDrop: number = 0): { r: number; c: number } {
  let closestR = 0;
  let closestC = 0;
  let minD = Infinity;

  const estR = Math.max(0, Math.round((py - radius - roofDrop - GRID_TOP_OFFSET) / (radius * Math.sqrt(3))));
  
  for (let r = Math.max(0, estR - 2); r <= estR + 3; r++) {
    const colsInRow = Math.abs(r) % 2 === 0 ? COLS : COLS - 1;
    for (let c = 0; c < colsInRow; c++) {
      if (!grid.some((b) => b.r === r && b.c === c)) {
        const bx = getBubbleX(r, c, radius);
        const by = getBubbleY(r, radius, roofDrop);
        const d = distance(px, py, bx, by);
        if (d < minD) {
          minD = d;
          closestR = r;
          closestC = c;
        }
      }
    }
  }
  return { r: closestR, c: closestC };
}

export function getConnected(grid: GridBubble[], startNode: GridBubble, matchColor: BubbleColor, matchRainbow: boolean): GridBubble[] {
  const connected: GridBubble[] = [];
  const visited = new Set<string>();
  const queue: GridBubble[] = [startNode];
  visited.add(`${startNode.r},${startNode.c}`);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    connected.push(curr);

    const neighbors = getNeighbors(curr.r, curr.c);
    for (const n of neighbors) {
      const key = `${n.r},${n.c}`;
      if (!visited.has(key)) {
        const neighborBubble = grid.find((b) => b.r === n.r && b.c === n.c);
        if (neighborBubble && !neighborBubble.isPopping && !neighborBubble.isDropping) {
          if (neighborBubble.color === matchColor || (matchRainbow && neighborBubble.type === 'rainbow')) {
            visited.add(key);
            queue.push(neighborBubble);
          }
        }
      }
    }
  }
  return connected;
}

export function getDisconnected(grid: GridBubble[]): GridBubble[] {
  const visited = new Set<string>();
  const queue: GridBubble[] = [];

  const validBubbles = grid.filter(b => !b.isPopping && !b.isDropping);
  if (validBubbles.length === 0) return [];
  
  const minR = Math.min(...validBubbles.map(b => b.r));

  for (const b of validBubbles) {
    if (b.r === minR) {
      queue.push(b);
      visited.add(`${b.r},${b.c}`);
    }
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const neighbors = getNeighbors(curr.r, curr.c);
    for (const n of neighbors) {
      const key = `${n.r},${n.c}`;
      if (!visited.has(key)) {
        const neighborBubble = grid.find((b) => b.r === n.r && b.c === n.c);
        if (neighborBubble && !neighborBubble.isPopping && !neighborBubble.isDropping) {
          visited.add(key);
          queue.push(neighborBubble);
        }
      }
    }
  }

  return grid.filter((b) => !b.isPopping && !b.isDropping && !visited.has(`${b.r},${b.c}`));
}
