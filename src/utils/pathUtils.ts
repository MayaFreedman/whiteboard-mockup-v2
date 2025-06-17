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
 * Checks if a point is within a circle (eraser area) with stroke width compensation
 * @param point - Point to check
 * @param centerX - Circle center X
 * @param centerY - Circle center Y
 * @param radius - Circle radius
 * @param strokeWidth - Stroke width of the target line (optional)
 * @returns True if point is within the circle
 */
export const isPointInCircle = (point: Point, centerX: number, centerY: number, radius: number, strokeWidth: number = 0): boolean => {
  const distance = Math.sqrt((point.x - centerX) ** 2 + (point.y - centerY) ** 2);
  
  // Expand effective radius based on stroke width
  const strokeCompensation = strokeWidth / 2;
  const effectiveRadius = radius + strokeCompensation;
  
  return distance <= effectiveRadius;
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
 * Checks if a line segment intersects with a circle (eraser area) with stroke width compensation
 * @param lineStart - Start point of the line segment
 * @param lineEnd - End point of the line segment
 * @param centerX - Circle center X
 * @param centerY - Circle center Y
 * @param radius - Circle radius
 * @param strokeWidth - Stroke width of the target line (optional)
 * @returns True if line segment intersects the circle
 */
export const lineSegmentIntersectsCircle = (
  lineStart: Point, 
  lineEnd: Point, 
  centerX: number, 
  centerY: number, 
  radius: number,
  strokeWidth: number = 0
): boolean => {
  const center = { x: centerX, y: centerY };
  const distance = distanceFromPointToLineSegment(center, lineStart, lineEnd);
  
  // Expand effective radius based on stroke width
  const strokeCompensation = strokeWidth / 2;
  const effectiveRadius = radius + strokeCompensation;
  
  return distance <= effectiveRadius;
};

/**
 * Enhanced interpolation for eraser-size-adaptive point density
 * Creates ultra-dense points for small erasers to ensure detection
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
 * Pre-processes long line segments by breaking them into smaller chunks
 * This ensures small erasers can detect paths with large gaps between points
 * @param points - Original path points
 * @param minEraserRadius - Smallest eraser radius for scaling
 * @returns Array of points with additional breakdown points
 */
export const preprocessPathForSmallErasers = (points: Point[], minEraserRadius: number): Point[] => {
  if (points.length < 2 || minEraserRadius >= 15) return points;
  
  // For very small erasers, break segments into even tinier chunks
  const maxSegmentLength = Math.max(0.5, minEraserRadius / 3);
  
  console.log(`🔧 Pre-processing path for small eraser (${minEraserRadius}px radius):`, {
    originalPoints: points.length,
    maxSegmentLength
  });
  
  const processedPoints: Point[] = [points[0]];
  
  for (let i = 1; i < points.length; i++) {
    const distance = Math.sqrt(
      (points[i].x - points[i-1].x) ** 2 + 
      (points[i].y - points[i-1].y) ** 2
    );
    
    if (distance > maxSegmentLength) {
      // Break this segment into smaller pieces
      const steps = Math.ceil(distance / maxSegmentLength);
      for (let j = 1; j < steps; j++) {
        const t = j / steps;
        processedPoints.push({
          x: points[i-1].x + (points[i].x - points[i-1].x) * t,
          y: points[i-1].y + (points[i].y - points[i-1].y) * t
        });
      }
    }
    
    processedPoints.push(points[i]);
  }
  
  console.log(`🔧 Path pre-processing complete:`, {
    originalPoints: points.length,
    processedPoints: processedPoints.length,
    pointsAdded: processedPoints.length - points.length
  });
  
  return processedPoints;
};

/**
 * Ultra-aggressive fallback detection for very small erasers
 * Checks if any line segments pass close to eraser centers with very generous thresholds
 * @param points - Path points to check
 * @param eraserPoints - Eraser positions and sizes
 * @param strokeWidth - Stroke width of the target line
 * @returns Array of point indices that should be erased
 */
export const fallbackEraserDetection = (
  points: Point[], 
  eraserPoints: Array<{ x: number; y: number; radius: number }>,
  strokeWidth: number = 2
): number[] => {
  const pointsToErase: number[] = [];
  
  // Only use fallback for very small erasers
  const verySmallErasers = eraserPoints.filter(e => e.radius < 12);
  if (verySmallErasers.length === 0) return pointsToErase;
  
  console.log(`🔍 Running stroke-aware fallback detection for ${verySmallErasers.length} very small erasers on ${strokeWidth}px stroke`);
  
  for (let i = 1; i < points.length; i++) {
    for (const eraser of verySmallErasers) {
      const lineDistance = distanceFromPointToLineSegment(
        { x: eraser.x, y: eraser.y },
        points[i-1],
        points[i]
      );
      
      // Stroke-width-aware threshold - more generous for thick strokes
      const strokeCompensation = strokeWidth / 2;
      const baseThreshold = eraser.radius * 3;
      const threshold = baseThreshold + strokeCompensation;
      
      if (lineDistance <= threshold) {
        console.log(`🎯 Stroke-aware fallback: Line segment ${i-1}-${i} within ${lineDistance.toFixed(1)}px of eraser (threshold: ${threshold.toFixed(1)}px, stroke: ${strokeWidth}px)`);
        pointsToErase.push(i-1, i);
        
        // Also mark neighboring points for very small erasers
        if (i > 1) pointsToErase.push(i-2);
        if (i < points.length - 1) pointsToErase.push(i+1);
      }
    }
  }
  
  return [...new Set(pointsToErase)]; // Remove duplicates
};

/**
 * Ultra-responsive eraser for small sizes with comprehensive stroke-width-aware detection
 * Multi-layered approach: preprocessing + ultra-dense interpolation + stroke-aware detection + fallback
 * @param points - Original path points
 * @param eraserPoints - Array of eraser center points with radius
 * @param strokeWidth - Stroke width of the target line
 * @returns Array of disconnected path segments
 */
export const erasePointsFromPathBatch = (
  points: Point[], 
  eraserPoints: Array<{ x: number; y: number; radius: number }>,
  strokeWidth: number = 2
): PathSegment[] => {
  if (points.length === 0 || eraserPoints.length === 0) return [];
  
  const minRadius = Math.min(...eraserPoints.map(e => e.radius));
  const isSmallEraser = minRadius < 15;
  const isVerySmallEraser = minRadius < 10;
  
  // Check if eraser size is similar to stroke width (within 50%)
  const isSimilarSize = eraserPoints.some(e => 
    Math.abs(e.radius * 2 - strokeWidth) / Math.max(e.radius * 2, strokeWidth) < 0.5
  );
  
  console.log('🧹 Starting stroke-aware eraser batch processing:', {
    originalPoints: points.length,
    eraserPoints: eraserPoints.length,
    eraserSizes: eraserPoints.map(e => e.radius * 2),
    strokeWidth,
    minRadius,
    isSmallEraser,
    isVerySmallEraser,
    isSimilarSize
  });
  
  // Step 1: Pre-process path for small erasers (even more aggressive)
  let processedPoints = points;
  if (isSmallEraser) {
    processedPoints = preprocessPathForSmallErasers(points, minRadius);
  }
  
  // Step 2: Ultra-dense interpolation for very small erasers or similar-sized erasers
  let interpolationDistance: number;
  if (isSimilarSize) {
    // Extra dense for similar-sized erasers
    interpolationDistance = Math.max(0.3, Math.min(minRadius, strokeWidth) / 10);
  } else if (isVerySmallEraser) {
    // Ultra-ultra-dense for very small erasers - every 0.5-1 pixel
    interpolationDistance = Math.max(0.5, minRadius / 8);
  } else if (isSmallEraser) {
    // Ultra-dense for small erasers - every 1-2 pixels
    interpolationDistance = Math.max(1, minRadius / 6);
  } else {
    // Normal density for larger erasers
    interpolationDistance = Math.max(2, minRadius / 3);
  }
  
  const interpolatedPoints = interpolatePathPoints(processedPoints, interpolationDistance);
  
  console.log('🔧 Stroke-aware point processing complete:', {
    originalPoints: points.length,
    processedPoints: processedPoints.length,
    interpolatedPoints: interpolatedPoints.length,
    interpolationDistance,
    strokeWidth
  });
  
  const segments: PathSegment[] = [];
  let currentSegment: Point[] = [];
  let totalErasedPoints = 0;
  let detectionStats = {
    directHits: 0,
    lineSegmentHits: 0,
    fallbackHits: 0
  };
  
  // Step 3: Run stroke-aware fallback detection for very small erasers
  let fallbackErasedIndices: Set<number> = new Set();
  if (isVerySmallEraser || isSimilarSize) {
    const fallbackIndices = fallbackEraserDetection(interpolatedPoints, eraserPoints, strokeWidth);
    fallbackErasedIndices = new Set(fallbackIndices);
    detectionStats.fallbackHits = fallbackIndices.length;
  }
  
  for (let i = 0; i < interpolatedPoints.length; i++) {
    const currentPoint = interpolatedPoints[i];
    let shouldErase = false;
    let detectionMethod = '';
    
    // Check if this point was marked for fallback erasing
    if (fallbackErasedIndices.has(i)) {
      shouldErase = true;
      detectionMethod = 'fallback';
    }
    
    // Primary check: Is point directly within any eraser circle? (stroke-width-aware)
    if (!shouldErase) {
      shouldErase = eraserPoints.some(eraser => {
        // Calculate stroke compensation
        const strokeCompensation = strokeWidth / 2;
        
        // Extra generous for similar-sized erasers
        let generosityMultiplier = 1.0;
        if (isSimilarSize) {
          generosityMultiplier = 1.3; // 30% more generous
        } else if (isVerySmallEraser) {
          generosityMultiplier = 1.2; // 20% more generous
        }
        
        const effectiveRadius = (eraser.radius + strokeCompensation) * generosityMultiplier;
        const inCircle = isPointInCircle(currentPoint, eraser.x, eraser.y, eraser.radius, strokeWidth * generosityMultiplier);
        
        if (inCircle) {
          detectionMethod = 'direct';
          detectionStats.directHits++;
          if (isSmallEraser || isSimilarSize) {
            console.log(`🎯 Stroke-aware direct hit at point ${i}: effective radius ${effectiveRadius.toFixed(1)}px (base: ${eraser.radius}px + stroke: ${strokeCompensation.toFixed(1)}px)`);
          }
        }
        return inCircle;
      });
    }
    
    // Secondary check: Line segment intersection (stroke-width-aware)
    if (!shouldErase && i > 0) {
      const previousPoint = interpolatedPoints[i - 1];
      
      shouldErase = eraserPoints.some(eraser => {
        // Calculate stroke compensation
        const strokeCompensation = strokeWidth / 2;
        
        // Proximity check with stroke awareness
        let proximityMultiplier: number;
        if (isSimilarSize) {
          proximityMultiplier = 5.0; // Very generous for similar sizes
        } else if (isVerySmallEraser) {
          proximityMultiplier = 4.0; // Very generous for tiny erasers
        } else if (isSmallEraser) {
          proximityMultiplier = 3.5; // Generous for small erasers
        } else {
          proximityMultiplier = 2.0; // Normal for large erasers
        }
        
        const distanceToCenter = Math.sqrt(
          (currentPoint.x - eraser.x) ** 2 + (currentPoint.y - eraser.y) ** 2
        );
        
        const proximityThreshold = (eraser.radius + strokeCompensation) * proximityMultiplier;
        
        if (distanceToCenter <= proximityThreshold) {
          const lineDistance = distanceFromPointToLineSegment(
            { x: eraser.x, y: eraser.y }, 
            previousPoint, 
            currentPoint
          );
          
          // Stroke-aware line threshold
          let lineThreshold: number;
          if (isSimilarSize) {
            lineThreshold = eraser.radius * 1.2 + strokeCompensation; // Very generous for similar sizes
          } else if (isVerySmallEraser) {
            lineThreshold = eraser.radius * 1.1 + strokeCompensation; // 110% + stroke for very small
          } else if (isSmallEraser) {
            lineThreshold = eraser.radius * 0.98 + strokeCompensation; // 98% + stroke for small
          } else {
            lineThreshold = eraser.radius * 0.85 + strokeCompensation; // 85% + stroke for large
          }
          
          const isLineClose = lineDistance <= lineThreshold;
          
          if (isLineClose) {
            detectionMethod = 'line-segment';
            detectionStats.lineSegmentHits++;
            if (isSmallEraser || isSimilarSize) {
              console.log(`🎯 Stroke-aware line hit at point ${i}: line distance ${lineDistance.toFixed(1)}px <= ${lineThreshold.toFixed(1)}px (stroke: ${strokeWidth}px)`);
            }
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
        currentSegment = [];
      }
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
  }
  
  // Filter out segments that are too small to be meaningful
  const filteredSegments = segments.filter(segment => segment.points.length >= 2);
  
  console.log('✅ Stroke-aware eraser processing complete:', {
    originalPoints: points.length,
    interpolatedPoints: interpolatedPoints.length,
    erasedPoints: totalErasedPoints,
    detectionStats,
    resultingSegments: filteredSegments.length,
    totalRemainingPoints: filteredSegments.reduce((sum, seg) => sum + seg.points.length, 0),
    strokeWidth,
    isSimilarSize
  });
  
  return filteredSegments;
};

/**
 * Legacy function for single eraser point - now uses the batch version with stroke width
 */
export const erasePointsFromPath = (
  points: Point[], 
  eraserX: number, 
  eraserY: number, 
  eraserRadius: number,
  strokeWidth: number = 2
): PathSegment[] => {
  return erasePointsFromPathBatch(points, [{ x: eraserX, y: eraserY, radius: eraserRadius }], strokeWidth);
};

/**
 * Optimized: checks if a path intersects with any of multiple eraser circles using stroke-width-aware line segment intersection
 * @param pathString - SVG path string
 * @param pathX - Path origin X
 * @param pathY - Path origin Y
 * @param eraserPoints - Array of eraser positions with radius (absolute coordinates)
 * @param strokeWidth - Stroke width of the target line
 * @returns True if path intersects with any eraser
 */
export const doesPathIntersectEraserBatch = (
  pathString: string,
  pathX: number,
  pathY: number,
  eraserPoints: Array<{ x: number; y: number; radius: number }>,
  strokeWidth: number = 2
): boolean => {
  const points = pathToPoints(pathString);
  
  return eraserPoints.some(eraser => {
    // Convert eraser coordinates to path-relative coordinates
    const relativeEraserX = eraser.x - pathX;
    const relativeEraserY = eraser.y - pathY;
    
    // Check point intersections with stroke width awareness
    const pointIntersection = points.some(point => 
      isPointInCircle(point, relativeEraserX, relativeEraserY, eraser.radius, strokeWidth)
    );
    
    if (pointIntersection) return true;
    
    // Check line segment intersections with stroke width awareness
    for (let i = 1; i < points.length; i++) {
      if (lineSegmentIntersectsCircle(
        points[i - 1], 
        points[i], 
        relativeEraserX, 
        relativeEraserY, 
        eraser.radius,
        strokeWidth
      )) {
        return true;
      }
    }
    
    return false;
  });
};

/**
 * Legacy function - now uses the batch version with stroke width
 */
export const doesPathIntersectEraser = (
  pathString: string,
  pathX: number,
  pathY: number,
  eraserX: number,
  eraserY: number,
  eraserRadius: number,
  strokeWidth: number = 2
): boolean => {
  return doesPathIntersectEraserBatch(pathString, pathX, pathY, [
    { x: eraserX, y: eraserY, radius: eraserRadius }
  ], strokeWidth);
};
