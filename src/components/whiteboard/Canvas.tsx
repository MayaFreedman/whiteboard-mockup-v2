import React, { useRef, useEffect, useState } from "react";
import { useWhiteboardStore } from "../../stores/whiteboardStore";
import { useToolStore } from "../../stores/toolStore";
import { useCanvasInteractions } from "../../hooks/canvas/useCanvasInteractions";
import { useCanvasRendering } from "../../hooks/useCanvasRendering";
import { useToolSelection } from "../../hooks/useToolSelection";
import { useUser } from "../../contexts/UserContext";
import { useActionBatching } from "../../hooks/useActionBatching";
import { useScreenSizeStore } from "../../stores/screenSizeStore";
import { useScreenSizeSync } from "../../hooks/useScreenSizeSync";
import { calculateOptimalFontSize } from "../../utils/stickyNoteTextSizing";
import { useCanvasOffset } from "../../hooks/useCanvasOffset";
import { CustomCursor } from "./CustomCursor";
import { ResizeHandles } from "./ResizeHandles";
import { measureText } from "../../utils/textMeasurement";

/**
 * Gets the appropriate cursor style based on the active tool
 * @param activeTool - The currently active tool
 * @returns CSS cursor value
 */
const getCursorStyle = (activeTool: string): string => {
  switch (activeTool) {
    case "select":
      return "default";
    case "text":
    case "sticky-note":
      return "text";
    case "hand":
      return "grab";
    case "fill":
      return "none"; // Hide default cursor for fill tool (uses custom cursor)
    case "pencil":
    case "brush":
    case "eraser":
      return "none"; // Hide default cursor for tools with custom cursor
    default:
      return "crosshair";
  }
};

/**
 * Main canvas component for the whiteboard
 * Handles rendering of background patterns, objects, and user interactions
 */
export const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const whiteboardStore = useWhiteboardStore();
  const {
    viewport,
    selectedObjectIds,
    updateObject,
    objects,
    deleteObject,
    clearSelection,
    addObject,
  } = whiteboardStore;
  const toolStore = useToolStore();
  const { activeTool } = toolStore;
  const { userId } = useUser();
  const { startBatch, endBatch } = useActionBatching({
    batchTimeout: 100,
    maxBatchSize: 50,
  });
  const { startBatch: startResizeBatch, endBatch: endResizeBatch } =
    useActionBatching({ batchTimeout: 0, maxBatchSize: 500 });
  const { activeWhiteboardSize, userScreenSizes } = useScreenSizeStore();
  const { canvasOffset } = useCanvasOffset();

  // Only show grey overlay when there are multiple users
  const hasMultipleUsers = Object.keys(userScreenSizes).length > 1;

  // Initialize screen size sync
  useScreenSizeSync();

  // Text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textEditorPosition, setTextEditorPosition] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    lineHeight: number;
  } | null>(null);
  const [editingText, setEditingText] = useState("");

  // Immediate text editing state
  const [isImmediateTextEditing, setIsImmediateTextEditing] = useState(false);
  const [immediateTextPosition, setImmediateTextPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [immediateTextContent, setImmediateTextContent] = useState("");
  const [immediateTextObjectId, setImmediateTextObjectId] = useState<
    string | null
  >(null);

  // Double-click protection flag - reduced timeout to 200ms
  const [isHandlingDoubleClick, setIsHandlingDoubleClick] = useState(false);
  const doubleClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle tool selection logic (clearing selection when switching tools)
  useToolSelection();

  // Initialize interactions hook first to get the preview functions
  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleMouseLeave,
    isDrawing,
    isDragging,
    getCurrentDrawingPreview,
    getCurrentShapePreview,
    getCurrentSelectionBox,
    getCurrentDragDeltas,
    getLiveDragPositions,
    setRedrawCanvas,
    setDoubleClickProtection,
    setEditingState,
    setImmediateTextTrigger,
    clearTextInteractionState,
  } = useCanvasInteractions();

  // Initialize rendering hook with both preview functions AND editing state
  const { redrawCanvas, isManualResizing } = useCanvasRendering(
    canvasRef.current,
    getCurrentDrawingPreview,
    getCurrentShapePreview,
    getCurrentSelectionBox,
    editingTextId,
    editingText,
    getCurrentDragDeltas,
    getLiveDragPositions
  );

  // Update interactions hook with redraw function and double-click protection AND editing state
  setRedrawCanvas(redrawCanvas);
  setDoubleClickProtection(isHandlingDoubleClick);
  setEditingState(editingTextId !== null || isImmediateTextEditing);

  // Set callback for immediate text editing
  setImmediateTextTrigger((coords, existingObjectId?) => {
    // Convert canvas-relative coordinates to screen coordinates
    // for textarea positioning
    const containerElement = containerRef.current;
    if (!containerElement) {
      console.warn("Container ref not available for coordinate conversion");
      return;
    }

    const whiteboardDiv = containerElement.querySelector(
      ".absolute.bg-background"
    ) as HTMLElement;
    const whiteboardRect = whiteboardDiv?.getBoundingClientRect();

    if (!whiteboardRect) {
      console.warn("Whiteboard div not found for coordinate conversion");
      return;
    }

    const screenCoords = {
      x: coords.x + whiteboardRect.left,
      y: coords.y + whiteboardRect.top - 60, // Moved down more to align with cursor
    };

    // If we have an existing object ID (sticky note), use that instead of creating a new text object
    if (existingObjectId) {
      const existingObject = objects[existingObjectId];
      if (existingObject && existingObject.type === "sticky-note") {
        // Position textarea to align with sticky note boundaries
        // CSS text alignment handles centering the text content
        const stickyScreenCoords = {
          x: existingObject.x + whiteboardRect.left,
          y: existingObject.y + whiteboardRect.top - 65,
        };

        setIsImmediateTextEditing(true);
        setImmediateTextPosition(stickyScreenCoords);
        setImmediateTextContent(existingObject.data?.content || "");
        setImmediateTextObjectId(existingObjectId);

        redrawCanvas();

        // Focus the textarea after a short delay
        setTimeout(() => {
          const textarea = document.querySelector(
            "[data-immediate-text]"
          ) as HTMLTextAreaElement;
          if (textarea) {
            textarea.focus();
          }
        }, 50);

        return;
      }
    }

    // Create canvas text object immediately with empty content (for regular text tool)
    const fontSize = toolStore.toolSettings.fontSize || 16;
    const fontFamily = toolStore.toolSettings.fontFamily || "Arial";
    const bold = toolStore.toolSettings.textBold || false;
    const italic = toolStore.toolSettings.textItalic || false;

    // Create initial text object with placeholder content
    const textData = {
      content: "",
      fontSize,
      fontFamily,
      bold,
      italic,
      underline: toolStore.toolSettings.textUnderline || false,
      textAlign: "left",
    };

    const textObject = {
      type: "text" as const,
      x: coords.x - 4, // Account for canvas text 4px left padding
      y: coords.y,
      width: 800, // Wide initial width to prevent early wrapping
      height: fontSize + 8, // Initial height with padding
      stroke: toolStore.toolSettings.strokeColor,
      fill: "transparent",
      strokeWidth: 1,
      opacity: 1,
      data: textData,
    };

    const objectId = addObject(textObject, userId);

    // Use regular text editing instead of immediate text editing
    setEditingTextId(objectId);
    
    // Calculate exact text position using canvas metrics
    const position = calculateTextPosition(textObject, canvasRef.current);
    if (position) {
      setTextEditorPosition(position);
    }
    
    setEditingText("");

    redrawCanvas();

    // Focus the textarea after a short delay
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 50);
  });

  // Handle resize for selected objects
  const handleResize = (
    objectId: string,
    newBounds: { x: number; y: number; width: number; height: number }
  ) => {
    console.log("🎯 Canvas handleResize called:", {
      objectId,
      newBounds,
      objectType: objects[objectId]?.type,
    });

    // Set manual resizing flag to prevent ResizeObserver from triggering additional redraws
    if (isManualResizing) {
      isManualResizing.current = true;
    }

    const obj = objects[objectId];

    if (
      obj &&
      obj.type === "text" &&
      typeof obj.width === "number" &&
      typeof obj.height === "number"
    ) {
      // For text objects, scale font size AND update dimensions
      const currentWidth = obj.width;
      const currentHeight = obj.height;

      // Calculate scale factors
      const scaleX = newBounds.width / currentWidth;
      const scaleY = newBounds.height / currentHeight;

      // Use average scale for proportional font scaling, with min/max limits
      const scale = Math.max(0.1, Math.min(5, (scaleX + scaleY) / 2));

      // Calculate new font size
      const currentFontSize = obj.data.fontSize || 16;
      const newFontSize = Math.round(currentFontSize * scale);

      // Update object with new font size AND new dimensions
      const changedWidth = newBounds.width !== obj.width;
      const changedHeight = newBounds.height !== obj.height;

      const updates = {
        ...newBounds, // Include new position and dimensions
        data: {
          ...(obj.data || {}),
          fontSize: newFontSize,
          ...(changedWidth ? { fixedWidth: true } : {}),
          ...(changedHeight ? { fixedHeight: true } : {}),
        },
      };

      updateObject(objectId, updates, userId);
    } else if (
      obj &&
      obj.type === "sticky-note" &&
      typeof obj.width === "number" &&
      typeof obj.height === "number"
    ) {
      // For sticky notes, keep them square and recalculate font size
      const size = Math.max(newBounds.width, newBounds.height); // Keep square
      const newFontSize = calculateOptimalFontSize(
        obj.data.content || "",
        size,
        size,
        obj.data
      );

      const updates = {
        x: newBounds.x,
        y: newBounds.y,
        width: size,
        height: size,
        data: {
          ...obj.data,
          fontSize: newFontSize,
          stickySize: size,
        },
      };

      updateObject(objectId, updates, userId);
    } else {
      // For other objects, update position and dimensions normally
      let updates: any = { ...newBounds };
      updateObject(objectId, updates, userId);
    }

    // Don't call redrawCanvas here - let the state change trigger it naturally for smoother updates

    // Clear the flag after a short delay to allow the resize operation to complete
    setTimeout(() => {
      if (isManualResizing) {
        isManualResizing.current = false;
      }
    }, 50); // Reduced timeout for more responsive feel
  };

  // Auto-resize text object to fit content using the same measureText function
  const updateTextBounds = (textObject: any, content: string) => {
    if (!textObject.data) return;

    const textData = textObject.data;
    const isFixedW = !!textData.fixedWidth;
    const isFixedH = !!textData.fixedHeight;
    const padding = 8;
    const isPlaceholder =
      !content || content.trim() === "" || content === "Double-click to edit";

    // Calculate maxWidth based on context
    let maxWidth = undefined;
    if (isFixedW) {
      // Use fixed width constraint
      maxWidth = Math.max((textObject.width || 0) - padding, 0);
      console.log("🔧 updateTextBounds - Fixed width:", { maxWidth, objectWidth: textObject.width });
    } else if (isImmediateTextEditing && immediateTextObjectId === textObject.id) {
      // Only use dynamic width calculation during immediate editing of this specific object
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        const textScreenX = textObject.x + (canvasRect?.left || 0);
        const availableWidth = canvasRect.width - (textScreenX - canvasRect.left) - 10;
        maxWidth = Math.max(availableWidth - padding, 100);
        
        console.log("🔧 updateTextBounds - Immediate editing dynamic width:", {
          textObjectX: textObject.x,
          canvasRectLeft: canvasRect.left,
          canvasRectWidth: canvasRect.width,
          textScreenX,
          availableWidth,
          maxWidth,
          padding
        });
      }
    } else {
      // For existing text objects, use their current width as constraint
      maxWidth = Math.max((textObject.width || 0) - padding, 100);
      console.log("🔧 updateTextBounds - Using existing object width:", { 
        maxWidth, 
        objectWidth: textObject.width,
        isImmediate: isImmediateTextEditing,
        editingObjectId: immediateTextObjectId,
        thisObjectId: textObject.id
      });
    }
    
    const metrics = measureText(
      content || "Double-click to edit",
      textData.fontSize,
      textData.fontFamily,
      textData.bold,
      textData.italic,
      maxWidth
    );

    console.log("📏 Text bounds update:", {
      content:
        content?.slice(0, 50) + (content && content.length > 50 ? "..." : ""),
      isFixedWidth: isFixedW,
      isFixedHeight: isFixedH,
      availableWidth: maxWidth,
      measuredDimensions: { width: metrics.width, height: metrics.height },
      lineCount: metrics.lines.length,
    });

    const measuredWidth = metrics.width + padding;
    const measuredHeight = Math.max(
      metrics.height + padding,
      textData.fontSize + padding
    );

    const updates: any = {};

    if (isFixedW && isFixedH) {
      // Preserve both dimensions when both are fixed
    } else if (isFixedW) {
      // Preserve manual width; update height only. Avoid shrinking due to placeholder.
      const currentHeight = textObject.height || 0;
      const newHeight = isPlaceholder
        ? Math.max(currentHeight, measuredHeight)
        : measuredHeight;
      if (newHeight !== textObject.height) updates.height = newHeight;
    } else if (isFixedH) {
      // Preserve manual height; update width only
      const newWidth = Math.max(measuredWidth, 100);
      if (newWidth !== textObject.width) updates.width = newWidth;
    } else {
      // Neither fixed - update both
      const newWidth = Math.max(measuredWidth, 100);
      const newHeight = measuredHeight;
      if (newWidth !== textObject.width) updates.width = newWidth;
      if (newHeight !== textObject.height) updates.height = newHeight;
    }

    if (Object.keys(updates).length) {
      updateObject(textObject.id, updates);
    }
  };

  // Utility function to calculate exact text positioning using canvas metrics
  const calculateTextPosition = (
    textObject: any,
    canvas: HTMLCanvasElement
  ) => {
    const ctx = canvas.getContext("2d");
    if (!ctx || !textObject.data) return null;

    const textData = textObject.data;

    // Set the exact same font properties as canvas rendering
    let fontStyle = "";
    if (textData.italic) fontStyle += "italic ";
    if (textData.bold) fontStyle += "bold ";
    ctx.font = `${fontStyle}${textData.fontSize}px ${textData.fontFamily}`;

    // Use the exact same line height calculation as canvas
    const lineHeight = Math.round(textData.fontSize * 1.2);

    // Use whiteboard container rect to be consistent with coordinate conversion
    const whiteboardContainer = canvas.closest(
      ".absolute.bg-background"
    ) as HTMLElement;
    const rect = whiteboardContainer
      ? whiteboardContainer.getBoundingClientRect()
      : canvas.getBoundingClientRect();

    // Calculate font-size proportional offset - much smaller base offset for tiny fonts
    const fontSizeOffset = textObject.data.fontSize < 30 
      ? -(textObject.data.fontSize * 0.01 + 55) // Much smaller offset for tiny fonts
      : textObject.data.fontSize < 40
      ? -(textObject.data.fontSize * 0.02 + 65) // Very minimal scaling for small fonts
      : -(textObject.data.fontSize * 0.1 + 63);  // Normal scaling for larger fonts
    
    return {
      x: Math.round(textObject.x + 4 + rect.left - 4), // Canvas position + padding + screen offset - 4 left
      y: Math.round(textObject.y + rect.top + fontSizeOffset), // Font-size aware cursor alignment
      width: Math.round(textObject.width - 8), // Account for left/right padding
      height: Math.round(textObject.height - 8), // Account for top/bottom padding
      lineHeight: lineHeight,
    };
  };

  // Handle double-click on text objects
  const handleDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    console.log(
      "🖱️ Double-click detected - setting protection flag and clearing text interaction state"
    );
    setIsHandlingDoubleClick(true);

    // Clear any existing timeout
    if (doubleClickTimeoutRef.current) {
      clearTimeout(doubleClickTimeoutRef.current);
    }

    // CRITICAL: Clear any residual text interaction state from previous single clicks
    // This prevents phantom text editor from appearing when clicking on empty space
    clearTextInteractionState();

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    

    // Find text object OR sticky note at click position using improved hit detection
    const textObject = Object.entries(objects).find(([id, obj]) => {
      if (obj.type !== "text" || !obj.width || !obj.height || !obj.data)
        return false;

      const textData = obj.data;
      const currentContent = textData.content || "Double-click to edit";

      // Use accurate text measurement for hit detection with same available width as canvas
      const availableWidth = obj.width - 8; // Same calculation as canvas rendering
      const metrics = measureText(
        currentContent,
        textData.fontSize,
        textData.fontFamily,
        textData.bold,
        textData.italic,
        availableWidth
      );

      // Horizontal offset based on text alignment within available area
      let alignOffset = 0;
      switch (textData.textAlign || "left") {
        case "center":
          alignOffset = (availableWidth - metrics.width) / 2;
          break;
        case "right":
          alignOffset = availableWidth - metrics.width;
          break;
        default:
          alignOffset = 0;
      }

      // Clamp offset to avoid negative shift if metrics exceed available width (safety)
      if (!isFinite(alignOffset)) alignOffset = 0;

      // Actual text bounds inside the textbox considering padding and alignment
      const textStartX = obj.x + 4 + Math.max(0, alignOffset);
      const textStartY = obj.y + 4; // top padding
      const textEndX = textStartX + metrics.width;
      const textEndY = textStartY + metrics.height;

      // Add some tolerance for easier clicking
      const tolerance = 8;
      const isInBounds =
        x >= textStartX - tolerance &&
        x <= textEndX + tolerance &&
        y >= textStartY - tolerance &&
        y <= textEndY + tolerance;

      console.log("🖱️ Checking text object with accurate bounds:", {
        id: id.slice(0, 8),
        textAlign: textData.textAlign,
        availableWidth,
        alignOffset,
        textBounds: {
          x: textStartX,
          y: textStartY,
          width: metrics.width,
          height: metrics.height,
        },
        clickPos: { x, y },
        tolerance,
        isInBounds,
      });

      return isInBounds;
    });

    // Check for sticky notes if no text object was found
    const stickyNoteObject = !textObject ? Object.entries(objects).find(([id, obj]) => {
      if (obj.type !== "sticky-note" || !obj.width || !obj.height) return false;

      // For sticky notes, check if click is within the rectangle bounds
      const tolerance = 5;
      const isInBounds =
        x >= obj.x - tolerance &&
        x <= obj.x + obj.width + tolerance &&
        y >= obj.y - tolerance &&
        y <= obj.y + obj.height + tolerance;

      console.log("🗒️ Checking sticky note bounds:", {
        id: id.slice(0, 8),
        bounds: { x: obj.x, y: obj.y, width: obj.width, height: obj.height },
        clickPos: { x, y },
        tolerance,
        isInBounds,
      });

      return isInBounds;
    }) : null;

    if (textObject) {
      const [objectId, obj] = textObject;
      

      setEditingTextId(objectId);

      // Calculate exact text position using canvas metrics
      const position = calculateTextPosition(obj, canvasRef.current);
      if (position) {
        setTextEditorPosition(position);
      }

      // Only clear text if it's the placeholder text, otherwise keep the existing text
      const currentContent = obj.data?.content || "";
      const isPlaceholderText =
        currentContent === "Double-click to edit" ||
        currentContent.trim() === "";
      setEditingText(isPlaceholderText ? "" : currentContent);

      // Set cursor to end of text after a short delay to ensure textarea is rendered
      if (!isPlaceholderText) {
        setTimeout(() => {
          if (textareaRef.current) {
            const textLength = currentContent.length;
            textareaRef.current.setSelectionRange(textLength, textLength);
            textareaRef.current.focus();
          }
        }, 0);
      }
    } else if (stickyNoteObject) {
      const [objectId, obj] = stickyNoteObject;
      

      // For sticky notes, trigger immediate text editing using the existing system
      const coords = { x: x, y: y };
      
      console.log("🗒️ Double-click triggering sticky note immediate editing:", {
        objectId: objectId.slice(0, 8),
        canvasCoords: coords
      });

      // Trigger immediate sticky note editing - the setImmediateTextTrigger callback will handle coordinate conversion
      setTimeout(() => {
        // Use the same immediate text trigger system that's already set up
        const containerElement = containerRef.current;
        if (containerElement) {
          const whiteboardDiv = containerElement.querySelector(".absolute.bg-background") as HTMLElement;
          const whiteboardRect = whiteboardDiv?.getBoundingClientRect();
          
          if (whiteboardRect) {
            // Convert canvas coordinates to match what the trigger expects
            const triggerCoords = { x: x, y: y };
            
            // The setImmediateTextTrigger callback is already configured above, just call it
            // Find and call the trigger function manually since we're in a double-click context
            const stickyScreenCoords = {
              x: obj.x + whiteboardRect.left,
              y: obj.y + whiteboardRect.top - 65,
            };

            setIsImmediateTextEditing(true);
            setImmediateTextPosition(stickyScreenCoords);
            setImmediateTextContent(obj.data?.content || "");
            setImmediateTextObjectId(objectId);

            redrawCanvas();

            // Focus the textarea after a short delay and position cursor at end
            setTimeout(() => {
              const textarea = document.querySelector("[data-immediate-text]") as HTMLTextAreaElement;
              if (textarea) {
                textarea.focus();
                
                // Position cursor at the end of the text, just like regular text objects
                const currentContent = obj.data?.content || "";
                if (currentContent) {
                  const textLength = currentContent.length;
                  textarea.setSelectionRange(textLength, textLength);
                  console.log("🗒️ Positioned cursor at end of sticky note text (double-click), length:", textLength);
                } else {
                  console.log("🗒️ Focused sticky note textarea with empty content (double-click)");
                }
              }
            }, 50);
          }
        }
      }, 10);
    } else {
      console.log("🖱️ No text object or sticky note found at double-click position");
    }

    // Reset protection flag after a shorter delay - reduced to 200ms
    doubleClickTimeoutRef.current = setTimeout(() => {
      console.log("🖱️ Clearing double-click protection flag");
      setIsHandlingDoubleClick(false);
    }, 200);
  };

  // Handle text editing completion (for double-click editing)
  const handleTextEditComplete = () => {
    if (editingTextId && objects[editingTextId]) {
      const finalText = editingText?.trim() || "";
      const textObject = objects[editingTextId];

      // If text is empty, revert to placeholder text
      const contentToSave = finalText || "Double-click to edit";

      // Update the text content
      updateObject(editingTextId, {
        data: {
          ...textObject.data,
          content: contentToSave,
        },
      });

      // DO NOT auto-resize for double-click editing - preserve original dimensions
      console.log(
        "📝 Text editing completed without auto-resize for:",
        editingTextId.slice(0, 8)
      );

      redrawCanvas();
    }

    setEditingTextId(null);
    setTextEditorPosition(null);
    setEditingText("");
  };

  // Handle immediate text input changes - update canvas text in real-time
  const handleImmediateTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const newText = e.target.value;
    
    
    // Calculate the available width for text wrapping - use canvas width for no early wrapping
    const editingObject = immediateTextObjectId ? objects[immediateTextObjectId] : null;
    const isEditingStickyNote = editingObject?.type === "sticky-note";
    const canvasWidth = 800; // Use a wide constraint so text doesn't wrap early
    const availableWidth = isEditingStickyNote ? undefined : canvasWidth;
    
    setImmediateTextContent(newText);

    // Check if we're editing a sticky note for dynamic font sizing
    if (
      immediateTextObjectId &&
      objects[immediateTextObjectId]?.type === "sticky-note"
    ) {
      const obj = objects[immediateTextObjectId];
      const { width, height } = obj;
      const textData = {
        content: newText,
        fontFamily: obj.data.fontFamily || "Inter",
        fontSize: obj.data.fontSize || 32,
        bold: obj.data.bold || false,
        italic: obj.data.italic || false,
        underline: obj.data.underline || false,
        textAlign: obj.data.textAlign || "center",
      };

      const optimalFontSize = calculateOptimalFontSize(
        newText,
        width,
        height,
        textData
      );

      console.log("🗒️ Sticky note dynamic font size:", {
        text: newText.slice(0, 20),
        optimalFontSize,
        dimensions: { width, height },
        currentFontSize: obj.data.fontSize,
      });

      // Update textarea styling to match the dynamic font size
      const textarea = e.target;
      textarea.style.fontSize = optimalFontSize + "px";
      textarea.style.lineHeight = optimalFontSize * 1.2 + "px";

      console.log("🗒️ Updated textarea font size to:", optimalFontSize + "px");

      updateObject(
        immediateTextObjectId,
        {
          data: {
            ...obj.data,
            content: newText,
            fontSize: optimalFontSize,
          },
        },
        userId
      );
      return;
    }

    const fontSize = toolStore.toolSettings.fontSize || 16;
    const fontFamily = toolStore.toolSettings.fontFamily || "Arial";
    const bold = toolStore.toolSettings.textBold || false;
    const italic = toolStore.toolSettings.textItalic || false;

    const minWidth = 100;
    const textarea = e.target;

    // Calculate available space from text position to screen edge
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect && immediateTextPosition) {
      // For text objects, use the object's current width for consistent wrapping with canvas
      if (immediateTextObjectId && objects[immediateTextObjectId]) {
        const textObject = objects[immediateTextObjectId];
        const objectWidth = textObject.width || 100;
        
        // Use same calculation as canvas rendering: obj.width - 16
        const effectiveWidth = Math.max(objectWidth - 16, 50);
        textarea.style.width = effectiveWidth + "px";
        textarea.style.maxWidth = effectiveWidth + "px";

        // Measure text with the same width for consistent wrapping
        const wrappedMetrics = measureText(
          newText || "",
          fontSize,
          fontFamily,
          bold,
          italic,
          effectiveWidth
        );

        // Update textarea height to match wrapped text height so cursor moves correctly
        textarea.style.height = Math.max(wrappedMetrics.height, fontSize * 1.2) + "px";

        // Update only content during typing, NOT dimensions to prevent wrapping changes
        updateObject(immediateTextObjectId, {
          data: {
            ...textObject.data,
            content: newText || "",
          },
        });
      } else {
        // Fallback for new objects: use available screen width
        const availableWidth = canvasRect.width - (immediateTextPosition.x - canvasRect.left) - 10;
        const effectiveWidth = availableWidth - 16;
        textarea.style.width = effectiveWidth + "px";
        textarea.style.maxWidth = effectiveWidth + "px";

        const wrappedMetrics = measureText(
          newText || "",
          fontSize,
          fontFamily,
          bold,
          italic,
          effectiveWidth
        );

        textarea.style.height = Math.max(wrappedMetrics.height, fontSize * 1.2) + "px";
      }
    } else {
      // Fallback to original behavior if we can't calculate boundaries
      const metrics = measureText(
        newText || "",
        fontSize,
        fontFamily,
        bold,
        italic
      );
      const newWidth = Math.max(metrics.width + 20, minWidth);
      textarea.style.width = newWidth + "px";
      textarea.style.height =
        Math.max(metrics.height + 10, fontSize * 1.2) + "px";

      if (immediateTextObjectId && objects[immediateTextObjectId]) {
        const textObject = objects[immediateTextObjectId];
        updateObject(immediateTextObjectId, {
          data: {
            ...textObject.data,
            content: newText || "",
          },
          width: newWidth,
          height: Math.max(metrics.height, fontSize * 1.2),
        });
      }
    }

    // Redraw canvas immediately to keep preview in sync with textarea
    redrawCanvas();
  };

  // Handle immediate text editing completion
  const handleImmediateTextComplete = () => {
    const finalText = immediateTextContent?.trim() || "";

    if (immediateTextObjectId && objects[immediateTextObjectId]) {
      const currentObject = objects[immediateTextObjectId];

      if (finalText) {
        // Keep the existing object with final content
        updateObject(immediateTextObjectId, {
          data: {
            ...currentObject.data,
            content: finalText,
          },
        });

        // For regular text objects, ensure final dimensions are correct (no setTimeout delay)
        if (currentObject.type === "text") {
          updateTextBounds(currentObject, finalText);
        }
      } else {
        // Delete the object if no text was entered
        deleteObject(immediateTextObjectId, userId);
      }

      redrawCanvas();
    }

    // Reset immediate editing state
    setIsImmediateTextEditing(false);
    setImmediateTextPosition(null);
    setImmediateTextContent("");
    setImmediateTextObjectId(null);
  };

  // Handle text input changes with logging
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setEditingText(newText);

    // Update textarea height dynamically for proper cursor positioning
    const textarea = e.target;
    if (editingTextId && objects[editingTextId] && textEditorPosition) {
      const textObject = objects[editingTextId];
      const fontSize = textObject.data?.fontSize || 16;
      const fontFamily = textObject.data?.fontFamily || "Arial";
      const bold = textObject.data?.bold || false;
      const italic = textObject.data?.italic || false;

      // For sticky notes, recalculate font size dynamically
      if (textObject.type === "sticky-note") {
        const newFontSize = calculateOptimalFontSize(
          newText,
          textObject.width,
          textObject.height,
          textObject.data
        );

        // Update font size in real-time
        textarea.style.fontSize = newFontSize + "px";
        textarea.style.lineHeight = newFontSize * 1.2 + "px";

        // Update the object with new content and font size
        updateObject(
          editingTextId,
          {
            data: {
              ...textObject.data,
              content: newText,
              fontSize: newFontSize,
            },
          },
          userId
        );
      } else {
        // Regular text handling
        // Measure text to get proper height - use same width calculation as canvas rendering
        const textRenderingWidth = Math.max((textObject.width || 100) - 16, 50);
        const wrappedMetrics = measureText(
          newText || "",
          fontSize,
          fontFamily,
          bold,
          italic,
          textRenderingWidth
        );

        // Update textarea height so it expands downward and cursor moves correctly
        const newHeight = Math.max(wrappedMetrics.height, fontSize * 1.2);
        textarea.style.height = newHeight + "px";

        // Also update the canvas object bounds to match
        const isFixedH = !!textObject.data?.fixedHeight;
        updateObject(
          editingTextId,
          {
            data: {
              ...textObject.data,
              content: newText,
            },
            ...(isFixedH ? {} : { height: newHeight }),
          },
          userId
        );
      }
    }

    console.log("✏️ Text changed:", {
      length: newText.length,
      content: newText.slice(0, 50) + (newText.length > 50 ? "..." : ""),
      lines: newText.split("\n").length,
      hasLongWords: newText.split(" ").some((word) => word.length > 20),
    });
  };

  // Handle text input key events (double-click editing)
  const handleTextKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleTextEditComplete();
    } else if (event.key === "Escape") {
      setEditingTextId(null);
      setTextEditorPosition(null);
      setEditingText("");
    }
  };

  // Handle immediate text input key events
  const handleImmediateTextKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    // For sticky notes, allow Enter to create line breaks, only Shift+Enter completes editing
    if (
      immediateTextObjectId &&
      objects[immediateTextObjectId]?.type === "sticky-note"
    ) {
      if (event.key === "Enter" && event.shiftKey) {
        event.preventDefault();
        handleImmediateTextComplete();
      } else if (event.key === "Escape") {
        // Cancel immediate text editing and clean up the canvas object
        if (immediateTextObjectId && objects[immediateTextObjectId]) {
          deleteObject(immediateTextObjectId, userId);
          redrawCanvas();
        }
        setIsImmediateTextEditing(false);
        setImmediateTextPosition(null);
        setImmediateTextContent("");
        setImmediateTextObjectId(null);
      }
      // Allow Enter key to pass through for line breaks in sticky notes
      return;
    }

    // For regular text objects, Enter completes editing
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleImmediateTextComplete();
    } else if (event.key === "Escape") {
      // Cancel immediate text editing and clean up the canvas object
      if (immediateTextObjectId && objects[immediateTextObjectId]) {
        deleteObject(immediateTextObjectId, userId);
        redrawCanvas();
      }
      setIsImmediateTextEditing(false);
      setImmediateTextPosition(null);
      setImmediateTextContent("");
      setImmediateTextObjectId(null);
    }
  };

  // Set up non-passive touch event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (event: TouchEvent) => {
      event.preventDefault();
      handlePointerDown(event, canvas);
    };

    const handleTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      handlePointerMove(event, canvas);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      event.preventDefault();
      handlePointerUp(event, canvas);
    };

    // Add touch event listeners with { passive: false } to allow preventDefault
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp]);

  // Handle keyboard events for object deletion
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle delete when:
      // 1. Not editing text (any kind)
      // 2. Objects are selected
      // 3. Focus is on the canvas container or its children
      if (
        editingTextId ||
        isImmediateTextEditing ||
        selectedObjectIds.length === 0
      ) {
        return;
      }

      // Check if the delete key or backspace was pressed
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();

        // Start a batch for multi-delete
        const batchId = startBatch("DELETE_OBJECT", "multi-delete", userId);

        // Delete all selected objects
        selectedObjectIds.forEach((objectId) => {
          deleteObject(objectId, userId);
        });

        // End the batch
        endBatch();

        // Clear selection after deletion (not part of undo/redo)
        clearSelection(userId);

        console.log(
          "🗑️ Deleted selected objects in batch:",
          selectedObjectIds.length,
          "objects"
        );
      }
    };

    // Add event listener to document to capture keyboard events
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    editingTextId,
    isImmediateTextEditing,
    selectedObjectIds,
    deleteObject,
    clearSelection,
    userId,
    startBatch,
    endBatch,
  ]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (doubleClickTimeoutRef.current) {
        clearTimeout(doubleClickTimeoutRef.current);
      }
    };
  }, []);

  // Watch for batch updates and trigger canvas redraw
  useEffect(() => {
    if (whiteboardStore.lastBatchUpdateTime) {
      console.log(
        "🎨 Triggering redraw after batch update:",
        whiteboardStore.lastBatchUpdateTime
      );
      redrawCanvas(true); // immediate redraw
    }
  }, [whiteboardStore.lastBatchUpdateTime, redrawCanvas]);

  // Reset viewport when screen size changes to recenter canvas
  useEffect(() => {
    whiteboardStore.resetViewport();
    redrawCanvas();
  }, [activeWhiteboardSize]); // Only depend on activeWhiteboardSize

  /**
   * Handles mouse down events on the canvas
   * @param event - Mouse event
   */
  const onMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    // Block events during double-click protection
    if (isHandlingDoubleClick) {
      console.log("🖱️ Mouse down blocked - double-click protection active");
      return;
    }

    // Handle click outside immediate text editing area - complete the text
    // This should work regardless of which tool is active
    if (isImmediateTextEditing) {
      console.log("🖱️ Click outside immediate text editing - completing text");
      handleImmediateTextComplete();
      // Don't return here - allow the tool interaction to continue
      // This ensures we can start a new text editing session immediately
    }

    // Handle click outside regular text editing area - complete the text editing
    if (editingTextId) {
      console.log(
        "🖱️ Click outside regular text editing - completing text edit"
      );
      handleTextEditComplete();
      // Don't return here - allow the tool interaction to continue
    }

    if (canvasRef.current) {
      console.log(
        "🖱️ Mouse down - protection flag:",
        isHandlingDoubleClick,
        "editing text:",
        !!editingTextId,
        "immediate editing:",
        isImmediateTextEditing
      );
      handlePointerDown(event.nativeEvent, canvasRef.current);
    }
  };

  /**
   * Handles mouse move events on the canvas
   * @param event - Mouse event
   */
  const onMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvasRef.current) {
      handlePointerMove(event.nativeEvent, canvasRef.current);
    }
  };

  /**
   * Handles mouse up events on the canvas
   * @param event - Mouse event
   */
  const onMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvasRef.current) {
      handlePointerUp(event.nativeEvent, canvasRef.current);
    }
  };

  /**
   * Handles mouse leaving the canvas area
   * @param event - Mouse event
   */
  const onMouseLeave = (event: React.MouseEvent<HTMLCanvasElement>) => {
    handleMouseLeave();
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative bg-muted/20 overflow-hidden"
      tabIndex={0}
      style={{ outline: "none" }}
    >
      {/* Whiteboard area with elegant styling - centered only when smaller than container */}
      <div
        className="absolute bg-background"
        style={{
          width: activeWhiteboardSize.width,
          height: activeWhiteboardSize.height,
          // Only center if whiteboard is smaller than container
          left:
            containerRef.current &&
            activeWhiteboardSize.width < containerRef.current.offsetWidth
              ? `calc(50% - ${activeWhiteboardSize.width / 2}px)`
              : 0,
          top:
            containerRef.current &&
            activeWhiteboardSize.height < containerRef.current.offsetHeight
              ? `calc(50% - ${activeWhiteboardSize.height / 2}px)`
              : 0,
          boxShadow:
            "0 8px 32px -4px hsl(var(--foreground) / 0.08), 0 2px 8px -2px hsl(var(--foreground) / 0.04), 0 0 0 1px hsl(var(--border) / 0.1)",
          borderRadius: hasMultipleUsers ? "12px" : "4px",
        }}
      >
        <canvas
          id="whiteboard-canvas"
          ref={canvasRef}
          className="absolute inset-0"
          style={{
            width: activeWhiteboardSize.width,
            height: activeWhiteboardSize.height,
            cursor: isDragging ? "grabbing" : getCursorStyle(activeTool),
            touchAction: "none", // Prevent default touch behaviors
            backgroundColor: "hsl(var(--background))",
            borderRadius: hasMultipleUsers ? "12px" : "4px",
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onDoubleClick={handleDoubleClick}
        />
      </div>

      {/* Enhanced non-whiteboard areas - only show in multiplayer */}
      {hasMultipleUsers && (
        <>
          {/* Left side overlay */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              left: 0,
              right: `calc(50% + ${activeWhiteboardSize.width / 2}px)`,
              background:
                "linear-gradient(90deg, hsl(var(--muted) / 0.5) 0%, hsl(var(--muted) / 0.3) 100%)",
              backgroundImage: `
                repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 30px,
                  hsl(var(--border) / 0.05) 30px,
                  hsl(var(--border) / 0.05) 32px
                )
              `,
            }}
          />

          {/* Right side overlay */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              left: `calc(50% + ${activeWhiteboardSize.width / 2}px)`,
              right: 0,
              background:
                "linear-gradient(90deg, hsl(var(--muted) / 0.3) 0%, hsl(var(--muted) / 0.5) 100%)",
              backgroundImage: `
                repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 30px,
                  hsl(var(--border) / 0.05) 30px,
                  hsl(var(--border) / 0.05) 32px
                )
              `,
            }}
          />

          {/* Top overlay */}
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: 0,
              bottom: `calc(50% + ${activeWhiteboardSize.height / 2}px)`,
              background:
                "linear-gradient(180deg, hsl(var(--muted) / 0.5) 0%, hsl(var(--muted) / 0.3) 100%)",
              backgroundImage: `
                repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 30px,
                  hsl(var(--border) / 0.05) 30px,
                  hsl(var(--border) / 0.05) 32px
                )
              `,
            }}
          />

          {/* Bottom overlay */}
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: `calc(50% + ${activeWhiteboardSize.height / 2}px)`,
              bottom: 0,
              background:
                "linear-gradient(180deg, hsl(var(--muted) / 0.3) 0%, hsl(var(--muted) / 0.5) 100%)",
              backgroundImage: `
                repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 30px,
                  hsl(var(--border) / 0.05) 30px,
                  hsl(var(--border) / 0.05) 32px
                )
              `,
            }}
          />
        </>
      )}

      {/* Text Editor Overlay - Positioned to match canvas text exactly */}
      {editingTextId && textEditorPosition && (
        <>
          <textarea
            ref={textareaRef}
            className="absolute border-none resize-none outline-none overflow-hidden"
          style={{
            left: textEditorPosition.x + 2,
            top: textEditorPosition.y + 7,
            width: Math.max((objects[editingTextId]?.width || 100) - 16, 50) + 16, // Match text measurement width calculation
            height: textEditorPosition.height + 16,
            fontSize: objects[editingTextId]?.data?.fontSize || 16,
            fontFamily: objects[editingTextId]?.data?.fontFamily || "Arial",
            fontWeight: objects[editingTextId]?.data?.bold ? "bold" : "normal",
            fontStyle: objects[editingTextId]?.data?.italic
              ? "italic"
              : "normal",
            textDecoration: objects[editingTextId]?.data?.underline
              ? "underline"
              : "none",
            // Conditional styling for sticky notes
            backgroundColor:
              objects[editingTextId]?.type === "sticky-note"
                ? objects[editingTextId]?.data?.backgroundColor || "#fff3cd"
                : "transparent",
            borderRadius:
              objects[editingTextId]?.type === "sticky-note" ? "8px" : "0",
            boxShadow:
              objects[editingTextId]?.type === "sticky-note"
                ? "0px 2px 8px rgba(0,0,0,0.1)"
                : "none",
            padding: "8px",
            // Text visibility and alignment
            color:
              objects[editingTextId]?.type === "sticky-note"
                ? objects[editingTextId]?.stroke || "#000000"
                : "transparent",
            textAlign:
              objects[editingTextId]?.type === "sticky-note"
                ? "center"
                : objects[editingTextId]?.data?.textAlign || "left",
            caretColor: objects[editingTextId]?.stroke || "#000000",
            zIndex: 1000,
            lineHeight: "1.2",
            margin: "0",
            border: "none",
            wordWrap: "break-word",
            whiteSpace: "pre-wrap",
            overflowWrap: "break-word",
            textRendering: "optimizeLegibility",
            fontSmooth: "antialiased",
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            WebkitTextSizeAdjust: "100%",
            boxSizing: "border-box",
            letterSpacing: "normal",
            wordSpacing: "normal",
          }}
          value={editingText}
          onChange={handleTextChange}
          onBlur={handleTextEditComplete}
          onKeyDown={handleTextKeyDown}
          autoFocus
        />
        </>
      )}

      {/* Immediate Text Editor Overlay - For click-to-type functionality */}
      {isImmediateTextEditing &&
        immediateTextPosition &&
        (() => {
          const editingObject = immediateTextObjectId
            ? objects[immediateTextObjectId]
            : null;
          const isEditingStickyNote = editingObject?.type === "sticky-note";
          const fontSize = isEditingStickyNote
            ? editingObject.data?.fontSize || 32
            : toolStore.toolSettings.fontSize || 16;


          return (
            <>
              <textarea
                data-immediate-text="true"
                className="absolute border-none resize-none outline-none overflow-hidden placeholder-opacity-70"
                style={
                  {
                    left: immediateTextPosition.x,
                    top: immediateTextPosition.y,
                    // Calculate available width for proper text wrapping - match text measurement
                    width: isEditingStickyNote ? editingObject.width : (() => {
                      const canvasRect = canvasRef.current?.getBoundingClientRect();
                      if (canvasRect) {
                        const availableWidth = canvasRect.width - (immediateTextPosition.x - canvasRect.left) - 10;
                        return Math.max(availableWidth - 16, 100) + "px"; // Use 16px padding to match text measurement
                      }
                      return "400px";
                    })(),
                   height: isEditingStickyNote
                     ? editingObject.height
                     : "auto", // Let height expand for regular text
                  padding: "8px",
                  fontSize: fontSize,
                  fontFamily: isEditingStickyNote
                    ? editingObject.data?.fontFamily || "Inter"
                    : toolStore.toolSettings.fontFamily || "Arial",
                  fontWeight: isEditingStickyNote
                    ? editingObject.data?.bold
                      ? "bold"
                      : "normal"
                    : toolStore.toolSettings.textBold
                    ? "bold"
                    : "normal",
                  fontStyle: isEditingStickyNote
                    ? editingObject.data?.italic
                      ? "italic"
                      : "normal"
                    : toolStore.toolSettings.textItalic
                    ? "italic"
                    : "normal",
                  textDecoration: isEditingStickyNote
                    ? editingObject.data?.underline
                      ? "underline"
                      : "none"
                    : toolStore.toolSettings.textUnderline
                    ? "underline"
                    : "none",
                  textAlign: isEditingStickyNote ? "center" : "left",
                  verticalAlign: isEditingStickyNote ? "top" : "top", // Changed from 'middle' to 'top' for better cursor alignment
                  color: isEditingStickyNote
                    ? editingObject.stroke || "#000000"
                    : "transparent", // Make sticky note text visible
                  backgroundColor: isEditingStickyNote
                    ? editingObject.data?.backgroundColor || "#fff3cd"
                    : "transparent", // Match sticky note background
                  zIndex: 1001,
                  lineHeight: `${fontSize * 1.2}px`, // Must match the text rendering lineHeight
                  margin: "0",
                  border: "none",
                  borderRadius: isEditingStickyNote ? "8px" : "0", // Match sticky note styling
                  boxShadow: isEditingStickyNote
                    ? "0px 2px 8px rgba(0,0,0,0.1)"
                    : "none", // Match sticky note shadow
                   whiteSpace: "pre-wrap",
                   overflowWrap: "break-word", 
                   wordBreak: "break-word",
                   wordWrap: "break-word",
                   overflow: "visible", // Allow textarea to expand
                  textRendering: "optimizeLegibility",
                  fontSmooth: "antialiased",
                  WebkitFontSmoothing: "antialiased",
                  MozOsxFontSmoothing: "grayscale",
                  caretColor: isEditingStickyNote
                    ? editingObject.stroke || "#000000"
                    : toolStore.toolSettings.strokeColor || "#000000",
                  WebkitTextSizeAdjust: "100%",
                  boxSizing: "border-box",
                  minHeight: fontSize * 1.2 + "px",
                  "--placeholder-color": `${
                    toolStore.toolSettings.strokeColor || "#000000"
                  }B3`,
                } as React.CSSProperties & { "--placeholder-color": string }
              }
              value={immediateTextContent}
              onChange={handleImmediateTextChange}
              onBlur={handleImmediateTextComplete}
               onKeyDown={handleImmediateTextKeyDown}
               placeholder={isEditingStickyNote ? "" : "Type here..."}
               autoFocus
             />
            </>
          );
        })()}

      {/* Custom Cursor */}
      <CustomCursor canvas={canvasRef.current} />

      {/* Resize Handles for Selected Objects */}
      {activeTool === "select" &&
        selectedObjectIds.map((objectId) => (
          <ResizeHandles
            key={objectId}
            objectId={objectId}
            onResizeStart={() =>
              startResizeBatch("UPDATE_OBJECT", objectId, userId)
            }
            onResize={(id, bounds) => handleResize(id, bounds)}
            onResizeEnd={() => endResizeBatch()}
          />
        ))}
    </div>
  );
};
