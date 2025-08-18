
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
          // If the word fits or this is the first word on the line
          if (currentLine === '' && testWidth > maxWidth) {
            // Single word is too long, break it
            const brokenWords = breakLongWord(word, maxWidth, ctx);
            brokenWords.forEach((brokenWord, index) => {
              if (index === 0) {
                currentLine = brokenWord;
              } else {
                wrappedLines.push(currentLine);
                maxLineWidth = Math.max(maxLineWidth, ctx.measureText(currentLine).width);
                currentLine = brokenWord;
              }
            });
          } else {
            currentLine = testLine;
          }
        } else {
          // Word doesn't fit, start new line
          if (currentLine) {
            wrappedLines.push(currentLine);
            maxLineWidth = Math.max(maxLineWidth, ctx.measureText(currentLine).width);
          }
          
          // Check if the single word is too long for a line
          const wordWidth = ctx.measureText(word).width;
          if (wordWidth > maxWidth) {
            const brokenWords = breakLongWord(word, maxWidth, ctx);
            brokenWords.forEach((brokenWord, index) => {
              if (index === 0) {
                currentLine = brokenWord;
              } else {
                wrappedLines.push(currentLine);
                maxLineWidth = Math.max(maxLineWidth, ctx.measureText(currentLine).width);
                currentLine = brokenWord;
              }
            });
          } else {
            currentLine = word;
          }
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
 * Breaks a long word that exceeds maxWidth into smaller pieces
 */
const breakLongWord = (word: string, maxWidth: number, ctx: CanvasRenderingContext2D): string[] => {
  const pieces: string[] = [];
  let currentPiece = '';
  
  for (let i = 0; i < word.length; i++) {
    const testPiece = currentPiece + word[i];
    const testWidth = ctx.measureText(testPiece).width;
    
    if (testWidth <= maxWidth) {
      currentPiece = testPiece;
    } else {
      // Current piece is at max width, start a new piece
      if (currentPiece) {
        pieces.push(currentPiece);
        currentPiece = word[i];
      } else {
        // Even a single character is too wide, just add it anyway
        pieces.push(word[i]);
      }
    }
  }
  
  if (currentPiece) {
    pieces.push(currentPiece);
  }
  
  return pieces.length > 0 ? pieces : [word];
};

/**
 * Draws underlines for text lines
 */
export const drawTextUnderlines = (
  ctx: CanvasRenderingContext2D,
  lines: string[],
  textX: number,
  textY: number,
  lineHeight: number,
  fontSize: number,
  textAlign: 'left' | 'center' | 'right',
  strokeColor: string,
  objectWidth?: number
): void => {
  ctx.save();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1;

  lines.forEach((lineText, i) => {
    if (lineText.trim()) {
      const textMeasurement = ctx.measureText(lineText);
      const textWidth = textMeasurement.width;

      // Calculate underline position based on text alignment
      let underlineStartX = textX;
      if (textAlign === "center" && objectWidth) {
        underlineStartX = Math.round(textX - textWidth / 2);
      } else if (textAlign === "right" && objectWidth) {
        underlineStartX = Math.round(textX - textWidth);
      }

      const underlineEndX = Math.round(underlineStartX + textWidth);
      const underlineY = Math.round(textY + i * lineHeight + fontSize - 2);

      ctx.beginPath();
      ctx.moveTo(underlineStartX, underlineY);
      ctx.lineTo(underlineEndX, underlineY);
      ctx.stroke();
    }
  });

  ctx.restore();
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
