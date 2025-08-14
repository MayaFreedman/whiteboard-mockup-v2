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
  const doesTextFitAtSize = (text: string, fontSize: number): { fits: boolean, debug: any } => {
    const fontWeight = textData.bold ? 'bold' : 'normal';
    const fontStyle = textData.italic ? 'italic' : 'normal';
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${textData.fontFamily}`;
    
    const lineHeight = fontSize * 1.2;
    const paragraphs = text.split('\n');
    let totalHeight = 0;
    let totalLines = 0;
    let maxLineWidth = 0;
    let wrapOpportunities = 0;
    let unwrappableWords = 0;
    
    const debugInfo = {
      fontSize,
      maxWidth,
      maxHeight,
      paragraphs: paragraphs.length,
      lines: [],
      totalLines: 0,
      totalHeight: 0,
      wrapOpportunities: 0,
      unwrappableWords: 0,
      fits: false
    };
    
    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') {
        // Empty line
        totalHeight += lineHeight;
        totalLines++;
        debugInfo.lines.push({ type: 'empty', content: '', width: 0 });
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
            const wordWidth = ctx.measureText(word).width;
            debugInfo.lines.push({ 
              type: 'unwrappable', 
              content: word, 
              width: wordWidth,
              exceedsBy: wordWidth - maxWidth 
            });
            unwrappableWords++;
            currentLine = word; // Still need to place it somewhere
          } else {
            // Successfully wrapped - record the completed line
            const lineWidth = ctx.measureText(currentLine).width;
            maxLineWidth = Math.max(maxLineWidth, lineWidth);
            debugInfo.lines.push({ 
              type: 'wrapped', 
              content: currentLine, 
              width: lineWidth 
            });
            lineCount++;
            wrapOpportunities++;
            currentLine = word;
          }
        }
      }
      
      // Don't forget the last line of the paragraph
      if (currentLine !== '') {
        const lineWidth = ctx.measureText(currentLine).width;
        maxLineWidth = Math.max(maxLineWidth, lineWidth);
        debugInfo.lines.push({ 
          type: 'final', 
          content: currentLine, 
          width: lineWidth 
        });
        lineCount++;
      }
      
      totalLines += lineCount;
      totalHeight += lineCount * lineHeight;
      
      // Early exit if already too tall
      if (totalHeight > maxHeight) {
        debugInfo.totalLines = totalLines;
        debugInfo.totalHeight = totalHeight;
        debugInfo.wrapOpportunities = wrapOpportunities;
        debugInfo.unwrappableWords = unwrappableWords;
        debugInfo.fits = false;
        return { fits: false, debug: debugInfo };
      }
    }
    
    debugInfo.totalLines = totalLines;
    debugInfo.totalHeight = totalHeight;
    debugInfo.wrapOpportunities = wrapOpportunities;
    debugInfo.unwrappableWords = unwrappableWords;
    debugInfo.fits = totalHeight <= maxHeight && unwrappableWords === 0;
    
    return { fits: debugInfo.fits, debug: debugInfo };
  };

  console.log('🔍 Sticky Note Text Analysis:', {
    content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
    contentLength: content.length,
    hasSpaces: content.includes(' '),
    hasLineBreaks: content.includes('\n'),
    dimensions: { width, height },
    availableSpace: { maxWidth, maxHeight },
    fontSizeRange: { min: minFontSize, max: maxFontSize }
  });

  // Start from the maximum size and work down until text fits
  // This ensures we prioritize wrapping over shrinking
  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize--) {
    const result = doesTextFitAtSize(content, fontSize);
    
    if (fontSize === maxFontSize || fontSize % 5 === 0 || result.fits || fontSize === minFontSize) {
      console.log(`📏 Font size ${fontSize}px test:`, {
        fits: result.fits,
        lines: result.debug.totalLines,
        height: `${result.debug.totalHeight.toFixed(1)}/${maxHeight}`,
        wrapOpportunities: result.debug.wrapOpportunities,
        unwrappableWords: result.debug.unwrappableWords,
        canWrapMore: result.debug.wrapOpportunities > 0 && result.debug.unwrappableWords === 0,
        decision: result.fits ? '✅ USE THIS SIZE' : '❌ too big - shrink more'
      });
      
      if (result.debug.lines.length <= 3) {
        console.log('  📝 Line breakdown:', result.debug.lines);
      }
    }
    
    if (result.fits) {
      console.log('🎯 Final decision:', {
        chosenFontSize: fontSize,
        reason: fontSize === maxFontSize ? 'max size fits' : 'found size that fits with wrapping',
        couldWrapAtLargerSize: fontSize < maxFontSize ? 'checked larger sizes but they had unwrappable content' : 'started at max size'
      });
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