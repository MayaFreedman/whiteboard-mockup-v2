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
 * Interpolates additional points into a path for smoother erasing
 * @param points - Original path points
 * @param maxDistance - Maximum distance between points
 * @returns Array of points with interpolated points added
 */
export const interpolatePathPoints = (points: Point[], maxDistance: number = 3): Point[] => {
  if (points.length < 2) return points;
  
  const interpolatedPoints: Point[] = [points[0]];
  
  for (let i = 1; i < points.length; i++) {
    const interpolated = interpolatePoints(points[i - 1], points[i], maxDistance);
    // Skip the first point since it's already in the array
    interpolatedPoints.push(...interpolated.slice(1));
  }
  
  return interpolatedPoints;
};

/**
 * Adjusted sensitivity: More responsive for smaller erasers while maintaining precision
 * Uses hybrid approach: direct point-in-circle + more generous line proximity for better sensitivity
 * @param points - Original path points
 * @param eraserPoints - Array of eraser center points with radius
 * @returns Array of disconnected path segments
 */
export const erasePointsFromPathBatch = (
  points: Point[], 
  eraserPoints: Array<{ x: number; y: number; radius: number }>
): PathSegment[] => {
  if (points.length === 0 || eraserPoints.length === 0) return [];
  
  // First, interpolate points for smoother erasing - adjust based on smallest eraser
  const minRadius = Math.min(...eraserPoints.map(e => e.radius));
  const interpolationDistance = Math.max(2, minRadius / 3); // More dense for smaller erasers
  const interpolatedPoints = interpolatePathPoints(points, interpolationDistance);
  
  const segments: PathSegment[] = [];
  let currentSegment: Point[] = [];
  
  console.log('🧹 Starting eraser batch processing:', {
    originalPoints: points.length,
    interpolatedPoints: interpolatedPoints.length,
    eraserPoints: eraserPoints.length,
    eraserSizes: eraserPoints.map(e => e.radius * 2), // Show diameters for debugging
    minRadius,
    interpolationDistance
  });
  
  let totalErasedPoints = 0;
  
  for (let i = 0; i < interpolatedPoints.length; i++) {
    const currentPoint = interpolatedPoints[i];
    
    let shouldErase = false;
    
    // Primary check: Is point directly within any eraser circle?
    shouldErase = eraserPoints.some(eraser => {
      const inCircle = isPointInCircle(currentPoint, eraser.x, eraser.y, eraser.radius);
      if (inCircle) {
        console.log(`🎯 Point ${i} directly in eraser circle`);
      }
      return inCircle;
    });
    
    // Secondary check: If point is close to eraser AND we have a previous point,
    // check if the line segment passes close to the eraser center
    // Make this more generous for smaller erasers
    if (!shouldErase && i > 0) {
      const previousPoint = interpolatedPoints[i - 1];
      
      shouldErase = eraserPoints.some(eraser => {
        // More generous proximity check - within 2x the eraser radius for small erasers
        const proximityMultiplier = eraser.radius < 15 ? 2.5 : 2.0;
        const distanceToCenter = Math.sqrt(
          (currentPoint.x - eraser.x) ** 2 + (currentPoint.y - eraser.y) ** 2
        );
        
        if (distanceToCenter <= eraser.radius * proximityMultiplier) {
          const lineDistance = distanceFromPointToLineSegment(
            { x: eraser.x, y: eraser.y }, 
            previousPoint, 
            currentPoint
          );
          
          // More generous line threshold - 85% of radius (was 70%)
          const lineThreshold = eraser.radius * 0.85;
          const isLineClose = lineDistance <= lineThreshold;
          
          if (isLineClose) {
            console.log(`🎯 Point ${i} erased via close line segment (distance: ${lineDistance.toFixed(1)}, threshold: ${lineThreshold.toFixed(1)})`);
          }
          
          return isLineClose;
        }
        
        return false;
      });
    }
    
    if (shouldErase) {
      totalErasedPoints++;
      
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
    interpolatedPoints: interpolatedPoints.length,
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
