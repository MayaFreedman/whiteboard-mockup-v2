
import { Point, pathToPoints } from './pathConversion';
import { interpolatePathPoints, preprocessPathForSmallErasers } from './pathInterpolation';
import { isPointInCircle, distanceFromPointToLineSegment, lineSegmentIntersectsCircle } from './pathIntersection';

export interface PathSegment {
  points: Point[];
  id: string;
}

/**
 * Toned-down fallback detection for very small erasers with size-aware thresholds
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
  
  
  
  for (let i = 1; i < points.length; i++) {
    for (const eraser of verySmallErasers) {
      const lineDistance = distanceFromPointToLineSegment(
        { x: eraser.x, y: eraser.y },
        points[i-1],
        points[i]
      );
      
      // Calculate size ratio for dynamic threshold
      const eraserDiameter = eraser.radius * 2;
      const sizeRatio = Math.min(strokeWidth, eraserDiameter) / Math.max(strokeWidth, eraserDiameter);
      
      // Toned down threshold calculation
      let baseMultiplier: number;
      let strokeCompensation: number;
      
      if (sizeRatio > 0.7) { // Very similar sizes
        baseMultiplier = 1.8; // Much more conservative
        strokeCompensation = strokeWidth * 0.1;
      } else if (sizeRatio > 0.4) { // Moderately different
        baseMultiplier = 2.0; // Reduced from 2.5
        strokeCompensation = strokeWidth * 0.2;
      } else { // Very different sizes
        baseMultiplier = 2.2; // Reduced from 2.5
        strokeCompensation = strokeWidth * 0.3;
      }
      
      const threshold = eraser.radius * baseMultiplier + strokeCompensation;
      
      if (lineDistance <= threshold) {
        
        pointsToErase.push(i-1, i);
        
        // Reduced neighboring point marking for similar sizes
        if (sizeRatio <= 0.4) { // Only for very different sizes
          if (i > 1) pointsToErase.push(i-2);
          if (i < points.length - 1) pointsToErase.push(i+1);
        }
      }
    }
  }
  
  return [...new Set(pointsToErase)]; // Remove duplicates
};

/**
 * Toned-down eraser with size-aware detection thresholds
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
  
  // Check if eraser size is similar to stroke width
  const avgEraserDiameter = eraserPoints.reduce((sum, e) => sum + e.radius * 2, 0) / eraserPoints.length;
  const sizeRatio = Math.min(strokeWidth, avgEraserDiameter) / Math.max(strokeWidth, avgEraserDiameter);
  const isSimilarSize = sizeRatio > 0.7; // Within 30% of each other
  
  
  // Step 1: Pre-process path for small erasers (less aggressive for similar sizes)
  let processedPoints = points;
  if (isSmallEraser && !isSimilarSize) {
    processedPoints = preprocessPathForSmallErasers(points, minRadius);
  }
  
  // Step 2: Size-aware interpolation
  let interpolationDistance: number;
  if (isSimilarSize) {
    // Much more conservative for similar sizes
    interpolationDistance = Math.max(1.5, Math.min(minRadius, strokeWidth) / 4);
  } else if (isVerySmallEraser) {
    // Less dense for very small erasers
    interpolationDistance = Math.max(1.0, minRadius / 5);
  } else if (isSmallEraser) {
    // Normal density for small erasers
    interpolationDistance = Math.max(1.5, minRadius / 4);
  } else {
    // Normal density for larger erasers
    interpolationDistance = Math.max(2, minRadius / 3);
  }
  
  const interpolatedPoints = interpolatePathPoints(processedPoints, interpolationDistance);
  
  
  const segments: PathSegment[] = [];
  let currentSegment: Point[] = [];
  let totalErasedPoints = 0;
  let detectionStats = {
    directHits: 0,
    lineSegmentHits: 0,
    fallbackHits: 0
  };
  
  // Step 3: Toned-down fallback detection
  let fallbackErasedIndices: Set<number> = new Set();
  if (isVerySmallEraser && !isSimilarSize) { // Skip fallback for similar sizes
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
    
    // Primary check: Is point directly within any eraser circle? (size-aware)
    if (!shouldErase) {
      shouldErase = eraserPoints.some(eraser => {
        // Calculate size ratio for this specific eraser
        const eraserDiameter = eraser.radius * 2;
        const localSizeRatio = Math.min(strokeWidth, eraserDiameter) / Math.max(strokeWidth, eraserDiameter);
        
        // Toned down generosity multiplier
        let generosityMultiplier: number;
        if (localSizeRatio > 0.7) { // Very similar sizes
          generosityMultiplier = 1.05; // Minimal boost
        } else if (localSizeRatio > 0.4) { // Moderately different
          generosityMultiplier = 1.08; // Small boost
        } else { // Very different sizes
          generosityMultiplier = 1.1; // Moderate boost
        }
        
        const inCircle = isPointInCircle(currentPoint, eraser.x, eraser.y, eraser.radius, strokeWidth * generosityMultiplier);
        
        if (inCircle) {
          detectionMethod = 'direct';
          detectionStats.directHits++;
        }
        return inCircle;
      });
    }
    
    // Secondary check: Line segment intersection (size-aware)
    if (!shouldErase && i > 0) {
      const previousPoint = interpolatedPoints[i - 1];
      
      shouldErase = eraserPoints.some(eraser => {
        // Calculate size ratio for this specific eraser
        const eraserDiameter = eraser.radius * 2;
        const localSizeRatio = Math.min(strokeWidth, eraserDiameter) / Math.max(strokeWidth, eraserDiameter);
        
        // Toned down proximity check
        let proximityMultiplier: number;
        if (localSizeRatio > 0.7) { // Very similar sizes
          proximityMultiplier = 2.5; // Much more conservative
        } else if (localSizeRatio > 0.4) { // Moderately different
          proximityMultiplier = 2.8; // Conservative
        } else if (isVerySmallEraser) {
          proximityMultiplier = 3.0; // Moderate
        } else if (isSmallEraser) {
          proximityMultiplier = 2.5;
        } else {
          proximityMultiplier = 2.0;
        }
        
        const distanceToCenter = Math.sqrt(
          (currentPoint.x - eraser.x) ** 2 + (currentPoint.y - eraser.y) ** 2
        );
        
        // Use the toned-down stroke compensation from lineSegmentIntersectsCircle
        let strokeCompensation: number;
        if (localSizeRatio > 0.7) {
          strokeCompensation = strokeWidth * 0.1;
        } else if (localSizeRatio > 0.4) {
          strokeCompensation = strokeWidth * 0.2;
        } else {
          strokeCompensation = strokeWidth * 0.3;
        }
        
        const proximityThreshold = (eraser.radius + strokeCompensation) * proximityMultiplier;
        
        if (distanceToCenter <= proximityThreshold) {
          const lineDistance = distanceFromPointToLineSegment(
            { x: eraser.x, y: eraser.y }, 
            previousPoint, 
            currentPoint
          );
          
          // Toned down line threshold
          let lineThreshold: number;
          if (localSizeRatio > 0.7) { // Very similar sizes
            lineThreshold = eraser.radius * 0.95 + strokeCompensation; // More conservative
          } else if (localSizeRatio > 0.4) { // Moderately different
            lineThreshold = eraser.radius * 1.0 + strokeCompensation;
          } else if (isVerySmallEraser) {
            lineThreshold = eraser.radius * 1.05 + strokeCompensation;
          } else if (isSmallEraser) {
            lineThreshold = eraser.radius * 0.95 + strokeCompensation;
          } else {
            lineThreshold = eraser.radius * 0.85 + strokeCompensation;
          }
          
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
