import { TextData } from '../types/whiteboard';

/**
 * Calculates the optimal font size for text content within sticky note bounds
 * Uses binary search to find the largest font size that fits all text with proper word wrapping
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

  // Create a temporary canvas for text measurement
  const tempCanvas = document.createElement('canvas');
  const ctx = tempCanvas.getContext('2d');
  if (!ctx) return 16; // Fallback

  // Account for padding (16px total - 8px on each side)
  const maxWidth = width - 16;
  const maxHeight = height - 16;

  if (maxWidth <= 0 || maxHeight <= 0) return 8; // Minimum readable size

  const minFontSize = 8;
  const maxFontSize = Math.min(width / 2, height / 2, 72);

  let bestFontSize = minFontSize;

  // Helper function to wrap text and calculate total height
  const calculateWrappedTextDimensions = (text: string, fontSize: number) => {
    const fontWeight = textData.bold ? 'bold' : 'normal';
    const fontStyle = textData.italic ? 'italic' : 'normal';
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${textData.fontFamily}`;
    
    const lineHeight = fontSize * 1.2;
    const paragraphs = text.split('\n');
    let totalHeight = 0;
    let maxLineWidth = 0;
    
    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') {
        // Empty line
        totalHeight += lineHeight;
        continue;
      }
      
      const words = paragraph.split(' ');
      let currentLine = '';
      let lineCount = 0;
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = ctx.measureText(testLine).width;
        
        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          // If single word is too long, it still needs to go on its own line
          if (currentLine === '') {
            currentLine = word;
          } else {
            // Line is complete, measure it
            const lineWidth = ctx.measureText(currentLine).width;
            maxLineWidth = Math.max(maxLineWidth, lineWidth);
            lineCount++;
            currentLine = word;
          }
        }
      }
      
      // Don't forget the last line of the paragraph
      if (currentLine !== '') {
        const lineWidth = ctx.measureText(currentLine).width;
        maxLineWidth = Math.max(maxLineWidth, lineWidth);
        lineCount++;
      }
      
      totalHeight += lineCount * lineHeight;
    }
    
    return { totalHeight, maxLineWidth };
  };

  // Binary search for optimal font size
  let low = minFontSize;
  let high = maxFontSize;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const { totalHeight, maxLineWidth } = calculateWrappedTextDimensions(content, mid);

    // Check if text fits within bounds
    if (totalHeight <= maxHeight && maxLineWidth <= maxWidth) {
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