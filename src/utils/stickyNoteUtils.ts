import { measureText } from './textMeasurement';

/**
 * Calculates the optimal font size to fit text content within sticky note dimensions
 */
export const calculateOptimalFontSize = (
  content: string,
  availableWidth: number,
  availableHeight: number,
  fontFamily: string = 'Arial',
  bold: boolean = false,
  italic: boolean = false,
  minFontSize: number = 8,
  maxFontSize: number = 32
): number => {
  if (!content || content.trim() === '' || content === 'Double-click to edit') {
    // For empty content, return a size proportional to the sticky note
    const baseFontSize = Math.min(availableWidth, availableHeight) * 0.1;
    return Math.max(minFontSize, Math.min(maxFontSize, baseFontSize));
  }

  // Binary search for optimal font size
  let low = minFontSize;
  let high = maxFontSize;
  let bestFit = minFontSize;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    
    const metrics = measureText(
      content,
      mid,
      fontFamily,
      bold,
      italic,
      availableWidth
    );

    if (metrics.width <= availableWidth && metrics.height <= availableHeight) {
      bestFit = mid;
      low = mid + 1; // Try larger font
    } else {
      high = mid - 1; // Try smaller font
    }
  }

  return bestFit;
};

/**
 * Calculates font size proportional to sticky note dimensions
 */
export const calculateProportionalFontSize = (
  width: number,
  height: number,
  scaleFactor: number = 0.08,
  minFontSize: number = 8,
  maxFontSize: number = 32
): number => {
  const baseFontSize = Math.min(width, height) * scaleFactor;
  return Math.max(minFontSize, Math.min(maxFontSize, Math.round(baseFontSize)));
};