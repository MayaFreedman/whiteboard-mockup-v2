import { TextData } from '../types/whiteboard';
import { measureText } from './textMeasurement';

/**
 * Calculates the optimal font size for text content within sticky note bounds
 * Uses the robust measureText algorithm with intelligent wrapping-before-shrinking logic
 */
export const calculateOptimalFontSize = (
  content: string,
  width: number,
  height: number,
  textData: TextData
): number => {
  if (!content.trim()) {
    // For empty content, return a large font size based on sticky note size
    return Math.min(width / 3, height / 3, 48);
  }

  // Account for padding (16px total - 8px on each side) - this MUST match Canvas.tsx padding
  const maxWidth = width - 16;  // Available width within the sticky note bounds
  const maxHeight = height - 16; // Available height within the sticky note bounds

  if (maxWidth <= 0 || maxHeight <= 0) return 8; // Minimum readable size

  const minFontSize = 8;
  const maxFontSize = Math.min(width / 2, height / 2, 100); // Limit to 100px max

  
  // Test font sizes from largest to smallest, prioritizing wrapping over shrinking
  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize--) {
    // Use the proven measureText algorithm for accurate text measurement
    const metrics = measureText(
      content,
      fontSize,
      textData.fontFamily,
      textData.bold,
      textData.italic,
      maxWidth  // This enables proper word wrapping!
    );

    const fits = metrics.height <= maxHeight;
    const hasMultipleLines = metrics.lines.length > 1;
    const canWrapMore = content.includes(' ') && !hasMultipleLines;


    if (fits) {
      return fontSize;
    }
  }

  
  return minFontSize;
};

/**
 * Determines if the font size should be recalculated for a sticky note object
 */
export const shouldUpdateFontSize = (
  currentFontSize: number,
  content: string,
  width: number,
  height: number,
  textData: TextData
): boolean => {
  const optimalSize = calculateOptimalFontSize(content, width, height, textData);
  // Update if the difference is significant (more than 2px)
  return Math.abs(currentFontSize - optimalSize) > 2;
};