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
 * Interpolates points between two points to ensure continuous coverage
 * @param point1 - Start point
 * @param point2 - End point
 * @param maxDistance - Maximum distance between interpolated points
 * @returns Array of interpolated points including start and end
 */
export const interpolatePoints = (point1: Point, point2: Point, maxDistance: number = 5): Point[] => {
  const distance = Math.sqrt((point2.x - point1.x) ** 2 + (point2.y - point1.y) ** 2);
  
  if (distance <= maxDistance) {
    return [point1, point2];
  }
  
  const steps = Math.ceil(distance / maxDistance);
  const points: Point[] = [point1];
  
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    points.push({
      x: point1.x + (point2.x - point1.x) * t,
      y: point1.y + (point2.y - point1.y) * t
    });
  }
  
  points.push(point2);
  return points;
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
 * Calculates the shortest distance from a point to a line segment
 * @param point - The point to check
 * @param lineStart - Start point of the line segment
 * @param lineEnd - End point of the line segment
 * @returns Distance from point to line segment
 */
export const distanceFromPointToLineSegment = (point: Point, lineStart: Point, lineEnd: Point): number => {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) {
    // Line segment is actually a point
    return Math.sqrt(A * A + B * B);
  }
  
  let param = dot / lenSq;
  
  let xx: number, yy: number;
  
  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }
  
  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Checks if a line segment intersects with a circle (eraser area)
 * @param lineStart - Start point of the line segment
 * @param lineEnd - End point of the line segment
 * @param centerX - Circle center X
 * @param centerY - Circle center Y
 * @param radius - Circle radius
 * @returns True if line segment intersects the circle
 */
export const lineSegmentIntersectsCircle = (
  lineStart: Point, 
  lineEnd: Point, 
  centerX: number, 
  centerY: number, 
  radius: number
): boolean => {
  const center = { x: centerX, y: centerY };
  const distance = distanceFromPointToLineSegment(center, lineStart, lineEnd);
  return distance <= radius;
};

/**
 * Optimized version: removes points from a path that intersect with eraser circles
 * Fixed to only erase points actually within eraser radius, not consecutive chunks
 * @param points - Original path points
 * @param eraserPoints - Array of eraser center points with radius
 * @returns Array of disconnected path segments
 */
export const erasePointsFromPathBatch = (
  points: Point[], 
  eraserPoints: Array<{ x: number; y: number; radius: number }>
): PathSegment[] => {
  if (points.length === 0 || eraserPoints.length === 0) return [];
  
  const segments: PathSegment[] = [];
  let currentSegment: Point[] = [];
  
  console.log('🧹 Starting eraser batch processing:', {
    totalPoints: points.length,
    eraserPoints: eraserPoints.length,
    eraserSizes: eraserPoints.map(e => e.radius * 2) // Show diameters for debugging
  });
  
  let totalErasedPoints = 0;
  
  for (let i = 0; i < points.length; i++) {
    const currentPoint = points[i];
    let shouldErase = false;
    
    // Check if current point is directly within any eraser circle
    shouldErase = eraserPoints.some(eraser => 
      isPointInCircle(currentPoint, eraser.x, eraser.y, eraser.radius)
    );
    
    // Also check if the line segment from previous point intersects any eraser
    if (!shouldErase && i > 0) {
      const previousPoint = points[i - 1];
      shouldErase = eraserPoints.some(eraser =>
        lineSegmentIntersectsCircle(
          previousPoint, 
          currentPoint, 
          eraser.x, 
          eraser.y, 
          eraser.radius
        )
      );
    }
    
    if (shouldErase) {
      totalErasedPoints++;
      console.log(`🧹 Erasing point ${i}:`, { x: currentPoint.x, y: currentPoint.y });
      
      // If we were building a segment, end it here
      if (currentSegment.length > 0) {
        segments.push({
          points: [...currentSegment],
          id: `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        console.log('🔗 Ended segment before erased point, segment had', currentSegment.length, 'points');
        currentSegment = [];
      }
      // Skip this point (don't add to any segment)
    } else {
      // Point survives erasing - add to current segment
      currentSegment.push(currentPoint);
    }
  }
  
  // Add final segment if it has points
  if (currentSegment.length > 0) {
    segments.push({
      points: currentSegment,
      id: `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    console.log('🔗 Added final segment, points:', currentSegment.length);
  }
  
  // Filter out segments that are too small to be meaningful
  const filteredSegments = segments.filter(segment => segment.points.length >= 2);
  
  console.log('✅ Eraser processing complete:', {
    originalPoints: points.length,
    erasedPoints: totalErasedPoints,
    resultingSegments: filteredSegments.length,
    totalRemainingPoints: filteredSegments.reduce((sum, seg) => sum + seg.points.length, 0)
  });
  
  return filteredSegments;
};

/**
 * Legacy function for single eraser point - now uses the batch version
 */
export const erasePointsFromPath = (
  points: Point[], 
  eraserX: number, 
  eraserY: number, 
  eraserRadius: number
): PathSegment[] => {
  return erasePointsFromPathBatch(points, [{ x: eraserX, y: eraserY, radius: eraserRadius }]);
};

/**
 * Optimized: checks if a path intersects with any of multiple eraser circles using line segment intersection
 * @param pathString - SVG path string
 * @param pathX - Path origin X
 * @param pathY - Path origin Y
 * @param eraserPoints - Array of eraser positions with radius (absolute coordinates)
 * @returns True if path intersects with any eraser
 */
export const doesPathIntersectEraserBatch = (
  pathString: string,
  pathX: number,
  pathY: number,
  eraserPoints: Array<{ x: number; y: number; radius: number }>
): boolean => {
  const points = pathToPoints(pathString);
  
  return eraserPoints.some(eraser => {
    // Convert eraser coordinates to path-relative coordinates
    const relativeEraserX = eraser.x - pathX;
    const relativeEraserY = eraser.y - pathY;
    
    // Check point intersections
    const pointIntersection = points.some(point => 
      isPointInCircle(point, relativeEraserX, relativeEraserY, eraser.radius)
    );
    
    if (pointIntersection) return true;
    
    // Check line segment intersections
    for (let i = 1; i < points.length; i++) {
      if (lineSegmentIntersectsCircle(
        points[i - 1], 
        points[i], 
        relativeEraserX, 
        relativeEraserY, 
        eraser.radius
      )) {
        return true;
      }
    }
    
    return false;
  });
};

/**
 * Legacy function - now uses the batch version
 */
export const doesPathIntersectEraser = (
  pathString: string,
  pathX: number,
  pathY: number,
  eraserX: number,
  eraserY: number,
  eraserRadius: number
): boolean => {
  return doesPathIntersectEraserBatch(pathString, pathX, pathY, [
    { x: eraserX, y: eraserY, radius: eraserRadius }
  ]);
};
