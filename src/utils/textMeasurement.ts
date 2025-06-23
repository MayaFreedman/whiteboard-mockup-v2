
/**
 * Utility functions for accurate text measurement
 */

export interface TextMetrics {
  width: number;
  height: number;
  lines: string[];
  lineHeight: number;
}

/**
 * Measures text dimensions using canvas context
 */
export const measureText = (
  text: string,
  fontSize: number,
  fontFamily: string,
  bold: boolean = false,
  italic: boolean = false,
  maxWidth?: number
): TextMetrics => {
  // Create a temporary canvas for measurement
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return { width: 0, height: 0, lines: [''], lineHeight: fontSize * 1.2 };
  }
  
  // Set the exact same font properties as rendering
  let fontStyle = '';
  if (italic) fontStyle += 'italic ';
  if (bold) fontStyle += 'bold ';
  ctx.font = `${fontStyle}${fontSize}px ${fontFamily}`;
  
  const lineHeight = Math.round(fontSize * 1.2);
  
  if (!text || text.trim() === '') {
    return { width: 0, height: lineHeight, lines: [''], lineHeight };
  }
  
  // Handle line breaks and word wrapping
  const paragraphs = text.split('\n');
  const wrappedLines: string[] = [];
  let maxLineWidth = 0;
  
  paragraphs.forEach(paragraph => {
    if (paragraph.trim() === '') {
      wrappedLines.push('');
      return;
    }
    
    if (maxWidth && maxWidth > 0) {
      // Wrap text if maxWidth is specified
      const words = paragraph.split(' ');
      let currentLine = '';
      
      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = ctx.measureText(testLine).width;
        
        if (testWidth <= maxWidth || currentLine === '') {
          currentLine = testLine;
        } else {
          if (currentLine) {
            wrappedLines.push(currentLine);
            maxLineWidth = Math.max(maxLineWidth, ctx.measureText(currentLine).width);
          }
          currentLine = word;
        }
      });
      
      if (currentLine) {
        wrappedLines.push(currentLine);
        maxLineWidth = Math.max(maxLineWidth, ctx.measureText(currentLine).width);
      }
    } else {
      // No wrapping - measure the full line
      wrappedLines.push(paragraph);
      maxLineWidth = Math.max(maxLineWidth, ctx.measureText(paragraph).width);
    }
  });
  
  const totalHeight = wrappedLines.length * lineHeight;
  
  return {
    width: maxLineWidth,
    height: totalHeight,
    lines: wrappedLines,
    lineHeight
  };
};

/**
 * Checks if a point is within text bounds using accurate measurement
 */
export const isPointInTextBounds = (
  x: number,
  y: number,
  textX: number,
  textY: number,
  text: string,
  fontSize: number,
  fontFamily: string,
  bold: boolean = false,
  italic: boolean = false,
  textAlign: 'left' | 'center' | 'right' = 'left',
  maxWidth?: number,
  padding: number = 8
): boolean => {
  const metrics = measureText(text, fontSize, fontFamily, bold, italic, maxWidth);
  
  if (metrics.width === 0 || metrics.height === 0) {
    return false;
  }
  
  // Calculate text bounds with padding
  let textStartX = textX - padding;
  let textEndX = textX + metrics.width + padding;
  
  // Adjust for text alignment
  if (textAlign === 'center' && maxWidth) {
    const centerOffset = (maxWidth - metrics.width) / 2;
    textStartX = textX + centerOffset - padding;
    textEndX = textX + centerOffset + metrics.width + padding;
  } else if (textAlign === 'right' && maxWidth) {
    textStartX = textX + maxWidth - metrics.width - padding;
    textEndX = textX + maxWidth + padding;
  }
  
  const textStartY = textY - padding;
  const textEndY = textY + metrics.height + padding;
  
  return x >= textStartX && x <= textEndX && y >= textStartY && y <= textEndY;
};
