
/**
 * Utility functions for path manipulation and intersection detection
 */

export interface Point {
  x: number;
  y: number;
}

export interface PathSegment {
  points: Point[];
  id: string;
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

/**
 * Checks if a point is within a circle (eraser area)
 * @param point - Point to check
 * @param centerX - Circle center X
 * @param centerY - Circle center Y
 * @param radius - Circle radius
 * @returns True if point is within the circle
 */
export const isPointInCircle = (point: Point, centerX: number, centerY: number, radius: number): boolean => {
  const distance = Math.sqrt((point.x - centerX) ** 2 + (point.y - centerY) ** 2);
  return distance <= radius;
};

/**
 * Removes points from a path that intersect with an eraser circle
 * @param points - Original path points
 * @param eraserX - Eraser center X (relative to path origin)
 * @param eraserY - Eraser center Y (relative to path origin)
 * @param eraserRadius - Eraser radius
 * @returns Array of disconnected path segments
 */
export const erasePointsFromPath = (
  points: Point[], 
  eraserX: number, 
  eraserY: number, 
  eraserRadius: number
): PathSegment[] => {
  if (points.length === 0) return [];
  
  const segments: PathSegment[] = [];
  let currentSegment: Point[] = [];
  
  points.forEach((point, index) => {
    const isErased = isPointInCircle(point, eraserX, eraserY, eraserRadius);
    
    if (!isErased) {
      // Point survives erasing
      currentSegment.push(point);
    } else {
      // Point is erased - end current segment if it has points
      if (currentSegment.length > 0) {
        segments.push({
          points: [...currentSegment],
          id: `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        currentSegment = [];
      }
    }
  });
  
  // Add final segment if it has points
  if (currentSegment.length > 0) {
    segments.push({
      points: currentSegment,
      id: `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }
  
  // Filter out segments that are too small to be meaningful
  return segments.filter(segment => segment.points.length >= 2);
};

/**
 * Checks if a path intersects with an eraser circle at any point
 * @param pathString - SVG path string
 * @param pathX - Path origin X
 * @param pathY - Path origin Y
 * @param eraserX - Eraser center X (absolute coordinates)
 * @param eraserY - Eraser center Y (absolute coordinates)
 * @param eraserRadius - Eraser radius
 * @returns True if path intersects with eraser
 */
export const doesPathIntersectEraser = (
  pathString: string,
  pathX: number,
  pathY: number,
  eraserX: number,
  eraserY: number,
  eraserRadius: number
): boolean => {
  const points = pathToPoints(pathString);
  
  // Convert eraser coordinates to path-relative coordinates
  const relativeEraserX = eraserX - pathX;
  const relativeEraserY = eraserY - pathY;
  
  return points.some(point => 
    isPointInCircle(point, relativeEraserX, relativeEraserY, eraserRadius)
  );
};
