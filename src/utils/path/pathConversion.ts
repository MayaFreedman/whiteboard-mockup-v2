
/**
 * Utility functions for converting between paths and points
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Converts an SVG path string to a series of points
 * @param pathString - SVG path string (e.g., "M 0 0 L 10 10 L 20 5")
 * @returns Array of points representing the path
 */
export const pathToPoints = (pathString: string): Point[] => {
  const points: Point[] = [];
  const commands = pathString.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
  
  let currentX = 0;
  let currentY = 0;
  
  commands.forEach(command => {
    const type = command[0].toUpperCase();
    const coords = command.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    
    switch (type) {
      case 'M': // Move to
        if (coords.length >= 2) {
          currentX = coords[0];
          currentY = coords[1];
          points.push({ x: currentX, y: currentY });
        }
        break;
      case 'L': // Line to
        for (let i = 0; i < coords.length; i += 2) {
          if (i + 1 < coords.length) {
            currentX = coords[i];
            currentY = coords[i + 1];
            points.push({ x: currentX, y: currentY });
          }
        }
        break;
    }
  });
  
  return points;
};

/**
 * Converts points back to an SVG path string
 * @param points - Array of points
 * @returns SVG path string
 */
export const pointsToPath = (points: Point[]): string => {
  if (points.length === 0) return '';
  
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  
  return path;
};
