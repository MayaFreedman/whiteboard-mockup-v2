import { TextData } from '../types/whiteboard';

/**
 * Calculates the optimal font size for text content within sticky note bounds
 * Prioritizes line wrapping over shrinking - only shrinks when content won't fit on available lines
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

  // Helper function to check if text fits at a given font size
  const doesTextFitAtSize = (text: string, fontSize: number): boolean => {
    const fontWeight = textData.bold ? 'bold' : 'normal';
    const fontStyle = textData.italic ? 'italic' : 'normal';
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${textData.fontFamily}`;
    
    const lineHeight = fontSize * 1.2;
    const paragraphs = text.split('\n');
    let totalHeight = 0;
    
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
          // Word doesn't fit, start new line
          if (currentLine === '') {
            // Single word is too wide - this font size won't work
            return false;
          } else {
            lineCount++;
            currentLine = word;
          }
        }
      }
      
      // Don't forget the last line of the paragraph
      if (currentLine !== '') {
        lineCount++;
      }
      
      totalHeight += lineCount * lineHeight;
      
      // Early exit if already too tall
      if (totalHeight > maxHeight) {
        return false;
      }
    }
    
    return totalHeight <= maxHeight;
  };

  // Start from the maximum size and work down until text fits
  // This ensures we prioritize wrapping over shrinking
  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize--) {
    if (doesTextFitAtSize(content, fontSize)) {
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