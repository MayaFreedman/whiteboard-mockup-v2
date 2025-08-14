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
  const maxFontSize = Math.min(width / 2, height / 2, 72);

  console.log('🔍 Sticky Note Text Analysis:', {
    content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
    contentLength: content.length,
    hasSpaces: content.includes(' '),
    hasLineBreaks: content.includes('\n'),
    dimensions: { width, height },
    availableSpace: { maxWidth, maxHeight },
    fontSizeRange: { min: minFontSize, max: maxFontSize }
  });

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

    // Enhanced debugging
    if (fontSize === maxFontSize || fontSize % 5 === 0 || fits || fontSize === minFontSize) {
      console.log(`📏 Font size ${fontSize}px test:`, {
        fits,
        lines: metrics.lines.length,
        height: `${metrics.height}/${maxHeight}`,
        hasMultipleLines,
        canWrapMore,
        maxLineWidth: metrics.width,
        actualLines: metrics.lines.slice(0, 3), // Show first 3 lines
        decision: fits ? '✅ USE THIS SIZE' : '❌ too big - shrink more',
        wrappingEnabled: maxWidth > 0 ? '✅' : '❌'
      });
    }

    if (fits) {
      console.log('🎯 Final decision:', {
        chosenFontSize: fontSize,
        totalLines: metrics.lines.length,
        reason: fontSize === maxFontSize ? 'max size fits perfectly' : 'found optimal size with proper wrapping',
        actualHeight: `${metrics.height}px/${maxHeight}px`,
        wrappedCorrectly: hasMultipleLines && content.includes(' ') ? '✅ text wrapped to multiple lines' : '⚪ single line or no spaces'
      });
      return fontSize;
    }
  }

  console.log('⚠️ Fallback to minimum font size');
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