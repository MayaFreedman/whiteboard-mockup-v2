import { TextData } from '../types/whiteboard';

/**
 * Calculates the optimal font size for text content within sticky note bounds
 * Uses binary search to find the largest font size that fits all text
 */
export const calculateOptimalFontSize = (
  content: string,
  width: number,
  height: number,
  textData: TextData
): number => {
  if (!content.trim()) {
    // For empty content, return a large font size based on sticky note size
    return Math.min(width / 4, height / 2, 48);
  }

  // Create a temporary canvas for text measurement
  const tempCanvas = document.createElement('canvas');
  const ctx = tempCanvas.getContext('2d');
  if (!ctx) return 16; // Fallback

  // Account for padding (16px total - 8px on each side)
  const maxWidth = width - 16;
  const maxHeight = height - 16;

  if (maxWidth <= 0 || maxHeight <= 0) return 8; // Minimum readable size

  const minFontSize = 8;
  const maxFontSize = Math.min(width / 4, height / 2, 72);

  let bestFontSize = minFontSize;

  // Binary search for optimal font size
  let low = minFontSize;
  let high = maxFontSize;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    
    // Set font properties for measurement
    const fontWeight = textData.bold ? 'bold' : 'normal';
    const fontStyle = textData.italic ? 'italic' : 'normal';
    ctx.font = `${fontStyle} ${fontWeight} ${mid}px ${textData.fontFamily}`;

    // Handle word wrapping for each line
    const paragraphs = content.split('\n');
    let totalHeight = 0;
    let fitsInBounds = true;

    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') {
        // Empty line
        totalHeight += mid * 1.2;
        continue;
      }

      // Wrap words for this paragraph
      const words = paragraph.split(' ');
      let currentLine = '';
      let lineCount = 0;

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const lineWidth = ctx.measureText(testLine).width;

        if (lineWidth <= maxWidth || currentLine === '') {
          // Word fits on current line, or it's the first word
          currentLine = testLine;
        } else {
          // Word doesn't fit, start new line
          lineCount++;
          currentLine = word;
        }
      }
      
      // Count the last line of this paragraph
      if (currentLine) {
        lineCount++;
      }

      totalHeight += lineCount * mid * 1.2; // Line height multiplier
    }

    // Check if text fits within bounds
    if (totalHeight <= maxHeight) {
      bestFontSize = mid;
      low = mid + 1; // Try larger size
    } else {
      high = mid - 1; // Try smaller size
    }
  }

  return Math.max(bestFontSize, minFontSize);
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