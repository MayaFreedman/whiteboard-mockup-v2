import { Point, pathToPoints } from './pathConversion';
import { interpolatePathPoints, preprocessPathForSmallErasers } from './pathInterpolation';
import { isPointInCircle, distanceFromPointToLineSegment, lineSegmentIntersectsCircle } from './pathIntersection';

export interface PathSegment {
  points: Point[];
  id: string;
}

/**
 * Restored fallback detection for all eraser sizes with proper thresholds
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
  
  console.log(`🔍 Running fallback detection for ${eraserPoints.length} erasers on ${strokeWidth}px stroke`);
  
  for (let i = 1; i < points.length; i++) {
    for (const eraser of eraserPoints) {
      const lineDistance = distanceFromPointToLineSegment(
        { x: eraser.x, y: eraser.y },
        points[i-1],
        points[i]
      );
      
      // Restored effective threshold calculation
      const baseMultiplier = 2.5; // Restored from the toned-down 1.8-2.2 range
      const strokeCompensation = strokeWidth * 0.5; // Restored from the toned-down 0.1-0.3 range
      const threshold = eraser.radius * baseMultiplier + strokeCompensation;
      
      if (lineDistance <= threshold) {
        console.log(`🎯 Fallback: Line segment ${i-1}-${i} within ${lineDistance.toFixed(1)}px of eraser (threshold: ${threshold.toFixed(1)}px)`);
        pointsToErase.push(i-1, i);
        
        // Mark neighboring points for better coverage
        if (i > 1) pointsToErase.push(i-2);
        if (i < points.length - 1) pointsToErase.push(i+1);
      }
    }
  }
  
  return [...new Set(pointsToErase)]; // Remove duplicates
};

/**
 * Restored eraser with proper detection thresholds for all sizes
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
  
  console.log('🧹 Starting eraser batch processing:', {
    originalPoints: points.length,
    eraserPoints: eraserPoints.length,
    eraserSizes: eraserPoints.map(e => e.radius * 2),
    strokeWidth,
    minRadius,
    isSmallEraser
  });
  
  // Step 1: Pre-process path for small erasers
  let processedPoints = points;
  if (isSmallEraser) {
    processedPoints = preprocessPathForSmallErasers(points, minRadius);
  }
  
  // Step 2: Restored proper interpolation distance
  const interpolationDistance = Math.max(1.0, minRadius / 4); // Restored from the overly conservative calculations
  const interpolatedPoints = interpolatePathPoints(processedPoints, interpolationDistance);
  
  console.log('🔧 Point processing complete:', {
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
  
  // Step 3: Restored fallback detection for all erasers
  const fallbackIndices = fallbackEraserDetection(interpolatedPoints, eraserPoints, strokeWidth);
  const fallbackErasedIndices = new Set(fallbackIndices);
  detectionStats.fallbackHits = fallbackIndices.length;
  
  for (let i = 0; i < interpolatedPoints.length; i++) {
    const currentPoint = interpolatedPoints[i];
    let shouldErase = false;
    let detectionMethod = '';
    
    // Check if this point was marked for fallback erasing
    if (fallbackErasedIndices.has(i)) {
      shouldErase = true;
      detectionMethod = 'fallback';
    }
    
    // Primary check: Is point directly within any eraser circle?
    if (!shouldErase) {
      shouldErase = eraserPoints.some(eraser => {
        // Restored effective generosity multiplier
        const generosityMultiplier = 1.2; // Restored from the toned-down 1.05-1.1 range
        
        const inCircle = isPointInCircle(currentPoint, eraser.x, eraser.y, eraser.radius, strokeWidth * generosityMultiplier);
        
        if (inCircle) {
          detectionMethod = 'direct';
          detectionStats.directHits++;
        }
        return inCircle;
      });
    }
    
    // Secondary check: Line segment intersection
    if (!shouldErase && i > 0) {
      const previousPoint = interpolatedPoints[i - 1];
      
      shouldErase = eraserPoints.some(eraser => {
        // Restored effective proximity check
        const proximityMultiplier = 3.0; // Restored from the toned-down 2.5-2.8 range
        
        const distanceToCenter = Math.sqrt(
          (currentPoint.x - eraser.x) ** 2 + (currentPoint.y - eraser.y) ** 2
        );
        
        const strokeCompensation = strokeWidth * 0.5; // Restored from the toned-down 0.1-0.3 range
        const proximityThreshold = (eraser.radius + strokeCompensation) * proximityMultiplier;
        
        if (distanceToCenter <= proximityThreshold) {
          const lineDistance = distanceFromPointToLineSegment(
            { x: eraser.x, y: eraser.y }, 
            previousPoint, 
            currentPoint
          );
          
          // Restored effective line threshold
          const lineThreshold = eraser.radius * 1.1 + strokeCompensation; // Restored from the toned-down 0.85-1.05 range
          
          const isLineClose = lineDistance <= lineThreshold;
          
          if (isLineClose) {
            detectionMethod = 'line-segment';
            detectionStats.lineSegmentHits++;
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
  
  console.log('✅ Eraser processing complete:', {
    originalPoints: points.length,
    interpolatedPoints: interpolatedPoints.length,
    erasedPoints: totalErasedPoints,
    detectionStats,
    resultingSegments: filteredSegments.length,
    totalRemainingPoints: filteredSegments.reduce((sum, seg) => sum + seg.points.length, 0),
    strokeWidth
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
    
    // Check point intersections with toned-down stroke width awareness
    const pointIntersection = points.some(point => 
      isPointInCircle(point, relativeEraserX, relativeEraserY, eraser.radius, strokeWidth)
    );
    
    if (pointIntersection) return true;
    
    // Check line segment intersections with toned-down stroke width awareness
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
