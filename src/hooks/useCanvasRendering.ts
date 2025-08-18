import { useEffect, useCallback, useRef } from "react";
import { useWhiteboardStore } from "../stores/whiteboardStore";
import { useToolStore } from "../stores/toolStore";
import { useScreenSizeStore } from "../stores/screenSizeStore";
import { WhiteboardObject, TextData, ImageData } from "../types/whiteboard";
import { measureText, drawTextUnderlines } from "@/utils/textMeasurement";
import {
  getCachedImage,
  setCachedImage,
  setImageLoading,
  setImageFailed,
  getCacheStats,
} from "../utils/sharedImageCache";
// Import optimized brush effects
import {
  renderPaintbrushOptimized,
  renderChalkOptimized,
  renderSprayOptimized,
  renderCrayonOptimized,
} from "../utils/brushEffectsOptimized";
import {
  renderTriangle,
  renderDiamond,
  renderPentagon,
  renderHexagon,
  renderStar,
  renderHeart,
} from "../utils/shapeRendering";

import { pathPointsCache } from "../utils/pathPointsCache";

/**
 * Custom hook for handling canvas rendering operations
 * Manages drawing of objects, backgrounds, and selection indicators
 */
export const useCanvasRendering = (
  canvas: HTMLCanvasElement | null,
  getCurrentDrawingPreview: () => any,
  getCurrentShapePreview: () => any,
  getCurrentSelectionBox: () => any,
  editingTextId?: string | null,
  editingText?: string,
  getCurrentDragDeltas?: () => { x: number; y: number },
  getLiveDragPositions?: () => Record<string, { x: number; y: number }>
) => {
  const { objects, selectedObjectIds, viewport, settings } =
    useWhiteboardStore();
  const { toolSettings } = useToolStore();
  const { activeWhiteboardSize } = useScreenSizeStore();

  // Image cache to prevent blinking/glitching
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const loadingImages = useRef<Set<string>>(new Set());
  // Failed images cache to prevent infinite retry loops
  const failedImages = useRef<Set<string>>(new Set());
  // Debounce redraw to prevent excessive calls
  const redrawTimeoutRef = useRef<number | null>(null);

  /**
   * Normalizes image path for consistent cache keys
   */
  const normalizeImagePath = useCallback((path: string): string => {
    // Remove any URL encoding and normalize path separators
    const decoded = decodeURIComponent(path);

    const normalized = decoded.replace(/\\/g, "/");

    return normalized;
  }, []);

  /**
   * Loads and caches an image for synchronous rendering
   */
  const getOrLoadImage = useCallback(
    async (src: string): Promise<HTMLImageElement | null> => {
      const normalizedSrc = normalizeImagePath(src);

      // Check shared cache first
      const sharedCacheResult = getCachedImage(normalizedSrc);

      if (sharedCacheResult.image) {
        // Also store in local cache for consistency
        imageCache.current.set(normalizedSrc, sharedCacheResult.image);
        return sharedCacheResult.image;
      }

      if (sharedCacheResult.hasFailed) {
        failedImages.current.add(normalizedSrc);
        return null;
      }

      if (sharedCacheResult.isLoading) {
        return null;
      }

      // Add detailed cache lookup logging with FULL paths
      console.log(`🔍 Cache lookup for FULL PATH: "${normalizedSrc}"`);
      const cacheStats = getCacheStats();
      console.log(
        `📦 Shared cache has ${cacheStats.cached} images, local cache has ${imageCache.current.size} images`
      );

      // Return cached image if available in local cache
      if (imageCache.current.has(normalizedSrc)) {
        console.log(`✨ Cache HIT for FULL PATH: "${normalizedSrc}"`);
        return imageCache.current.get(normalizedSrc)!;
      }

      // Don't retry failed images to prevent infinite loops
      if (failedImages.current.has(normalizedSrc)) {
        console.log(`🚫 Skipping failed image FULL PATH: "${normalizedSrc}"`);
        return null;
      }

      // Prevent duplicate loading requests
      if (loadingImages.current.has(normalizedSrc)) {
        return null;
      }

      loadingImages.current.add(normalizedSrc);
      setImageLoading(normalizedSrc); // Mark in shared cache too

      try {
        const img = new Image();

        return new Promise((resolve, reject) => {
          // Set up timeout for hanging loads
          const timeoutId = setTimeout(() => {
            loadingImages.current.delete(normalizedSrc);
            failedImages.current.add(normalizedSrc);
            console.error(`⏰ TIMEOUT loading image: "${normalizedSrc}"`);
            reject(new Error(`Timeout loading image: ${normalizedSrc}`));
          }, 10000); // 10 second timeout

          img.onload = () => {
            clearTimeout(timeoutId);
            // Cache the loaded image with normalized key
            imageCache.current.set(normalizedSrc, img);
            setCachedImage(normalizedSrc, img); // Add to shared cache
            loadingImages.current.delete(normalizedSrc);
            resolve(img);
          };

          img.onerror = (error) => {
            clearTimeout(timeoutId);
            loadingImages.current.delete(normalizedSrc);
            failedImages.current.add(normalizedSrc); // Mark as failed to prevent retries
            setImageFailed(normalizedSrc, error); // Mark as failed in shared cache
            console.error(
              `❌ img.onerror for FULL PATH: "${normalizedSrc}"`,
              error
            );
            reject(new Error(`Failed to load image: ${normalizedSrc}`));
          };

          // Handle SVG files by converting to blob URL
          if (normalizedSrc.endsWith(".svg")) {
            fetch(normalizedSrc)
              .then((response) => {
                if (!response.ok) {
                  throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`
                  );
                }

                return response.text();
              })
              .then((svgText) => {
                console.log(
                  `📄 SVG TEXT received for: "${normalizedSrc}", length: ${svgText.length}`
                );

                const blob = new Blob([svgText], { type: "image/svg+xml" });
                const url = URL.createObjectURL(blob);
                console.log(
                  `🔗 SVG BLOB URL created for: "${normalizedSrc}" -> ${url}`
                );

                // Override onload for SVG
                img.onload = () => {
                  clearTimeout(timeoutId);
                  imageCache.current.set(normalizedSrc, img);
                  setCachedImage(normalizedSrc, img); // Add to shared cache
                  loadingImages.current.delete(normalizedSrc);
                  URL.revokeObjectURL(url);
                  resolve(img);
                };

                // Override onerror for SVG
                img.onerror = (error) => {
                  clearTimeout(timeoutId);
                  loadingImages.current.delete(normalizedSrc);
                  failedImages.current.add(normalizedSrc);
                  setImageFailed(normalizedSrc, error); // Mark as failed in shared cache
                  URL.revokeObjectURL(url);
                  console.error(
                    `❌ SVG img.onerror for FULL PATH: "${normalizedSrc}"`,
                    error
                  );
                  reject(
                    new Error(`Failed to load SVG image: ${normalizedSrc}`)
                  );
                };

                img.src = url;
                console.log(`🎯 SVG img.src set for: "${normalizedSrc}"`);
              })
              .catch((error) => {
                clearTimeout(timeoutId);
                loadingImages.current.delete(normalizedSrc);
                failedImages.current.add(normalizedSrc);
                setImageFailed(normalizedSrc, error); // Mark as failed in shared cache
                console.error(
                  `❌ SVG FETCH failed for FULL PATH: "${normalizedSrc}"`,
                  error
                );
                reject(error);
              });
          } else {
            img.src = normalizedSrc;
          }
        });
      } catch (error) {
        loadingImages.current.delete(normalizedSrc);
        return null;
      }
    },
    [normalizeImagePath]
  );

  /**
   * Sets up canvas for crisp rendering with proper pixel alignment
   * @param canvas - Canvas element
   * @param ctx - Canvas rendering context
   */
  const setupCanvasForCrispRendering = useCallback(
    (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      // Get device pixel ratio for high-DPI displays
      const devicePixelRatio = window.devicePixelRatio || 1;

      // Get the display size (CSS pixels)
      const displayWidth = Math.floor(canvas.offsetWidth);
      const displayHeight = Math.floor(canvas.offsetHeight);

      // Set the actual size in memory (scaled up for high-DPI)
      canvas.width = displayWidth * devicePixelRatio;
      canvas.height = displayHeight * devicePixelRatio;

      // Scale the canvas back down using CSS
      canvas.style.width = displayWidth + "px";
      canvas.style.height = displayHeight + "px";

      // Scale the drawing context so everything draws at the correct size
      ctx.scale(devicePixelRatio, devicePixelRatio);

      // Configure text rendering for crisp display
      ctx.textBaseline = "top";
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Enable font smoothing
      if ("textRenderingOptimizeSpeed" in ctx) {
        (ctx as any).textRenderingOptimizeSpeed = false;
      }
    },
    []
  );

  /**
   * Renders a single whiteboard object on the canvas
   * @param ctx - Canvas rendering context
   * @param obj - Whiteboard object to render
   * @param isSelected - Whether the object is currently selected
   */
  const renderObject = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      obj: WhiteboardObject,
      isSelected: boolean = false
    ) => {
      ctx.save();

      // Apply object transformations
      ctx.globalAlpha = obj.opacity || 1;

      // Check if this is an eraser object
      const isEraser = obj.data?.isEraser;
      if (isEraser) {
        // Set blend mode for eraser objects - this removes pixels
        ctx.globalCompositeOperation = "destination-out";
      }

      // Draw selection highlight FIRST (behind the object) if selected and not an eraser AND not text, image, or sticky-note
      // Text, image, and sticky-note objects are excluded because they have their own selection highlighting
      if (isSelected && !isEraser && obj.type !== "text" && obj.type !== "image" && obj.type !== "sticky-note") {
        ctx.save();
        ctx.strokeStyle = "#007AFF";
        ctx.globalAlpha = 0.6;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        switch (obj.type) {
          case "path": {
            // Draw the exact same path but with a thicker blue stroke
            ctx.translate(Math.round(obj.x), Math.round(obj.y));
            const path = new Path2D(obj.data.path);
            ctx.lineWidth = (obj.strokeWidth || 2) + 6; // Add 6px to the original stroke width
            ctx.stroke(path);
            break;
          }
          case "rectangle": {
            // Draw the exact same rectangle but with thicker blue stroke - use pixel-perfect positioning
            ctx.lineWidth = (obj.strokeWidth || 2) + 6;
            ctx.strokeRect(
              Math.round(obj.x),
              Math.round(obj.y),
              Math.round(obj.width),
              Math.round(obj.height)
            );
            break;
          }
          case "circle": {
            // Draw the exact same circle but with thicker blue stroke - use pixel-perfect positioning
            const radiusX = Math.round(obj.width / 2);
            const radiusY = Math.round(obj.height / 2);
            const centerX = Math.round(obj.x + radiusX);
            const centerY = Math.round(obj.y + radiusY);
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            ctx.lineWidth = (obj.strokeWidth || 2) + 6;
            ctx.stroke();
            break;
          }
          case "triangle":
          case "diamond":
          case "pentagon":
          case "hexagon":
          case "star":
          case "heart": {
            // Draw selection outline for complex shapes - use pixel-perfect positioning
            ctx.lineWidth = (obj.strokeWidth || 2) + 6;

            // Use rounded coordinates for pixel-perfect rendering
            const roundedX = Math.round(obj.x);
            const roundedY = Math.round(obj.y);
            const roundedWidth = Math.round(obj.width);
            const roundedHeight = Math.round(obj.height);

            // Render the shape outline with thick blue stroke
            switch (obj.type) {
              case "triangle":
                renderTriangle(
                  ctx,
                  roundedX,
                  roundedY,
                  roundedWidth,
                  roundedHeight,
                  undefined,
                  "#007AFF",
                  ctx.lineWidth
                );
                break;
              case "diamond":
                renderDiamond(
                  ctx,
                  roundedX,
                  roundedY,
                  roundedWidth,
                  roundedHeight,
                  undefined,
                  "#007AFF",
                  ctx.lineWidth
                );
                break;
              case "pentagon":
                renderPentagon(
                  ctx,
                  roundedX,
                  roundedY,
                  roundedWidth,
                  roundedHeight,
                  undefined,
                  "#007AFF",
                  ctx.lineWidth
                );
                break;
              case "hexagon":
                renderHexagon(
                  ctx,
                  roundedX,
                  roundedY,
                  roundedWidth,
                  roundedHeight,
                  undefined,
                  "#007AFF",
                  ctx.lineWidth
                );
                break;
              case "star":
                renderStar(
                  ctx,
                  roundedX,
                  roundedY,
                  roundedWidth,
                  roundedHeight,
                  undefined,
                  "#007AFF",
                  ctx.lineWidth
                );
                break;
              case "heart":
                renderHeart(
                  ctx,
                  roundedX,
                  roundedY,
                  roundedWidth,
                  roundedHeight,
                  undefined,
                  "#007AFF",
                  ctx.lineWidth
                );
                break;
            }
            break;
          }
        }
        ctx.restore();
      }

      // Now draw the actual object ON TOP of the selection highlight
      switch (obj.type) {
        case "path": {
          // For paths, we need to apply translation and then draw the relative path
          ctx.translate(obj.x, obj.y);

          const brushType = obj.data?.brushType;
          const strokeColor = obj.stroke || "#000000";
          const strokeWidth = obj.strokeWidth || 2;
          const opacity = obj.opacity || 1;

          // Stable object ID for caching
          const objectId = obj.id;

          // Render based on brush type or if it's an eraser
          if (isEraser) {
            // Render eraser as a solid path with round caps for smooth erasing
            const path = new Path2D(obj.data.path);
            ctx.strokeStyle = "#000000"; // Color doesn't matter for destination-out
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.stroke(path);
          } else if (brushType === "paintbrush") {
            renderPaintbrushOptimized(
              ctx,
              obj.data.path,
              strokeColor,
              strokeWidth,
              opacity
            );
          } else if (brushType === "chalk") {
            renderChalkOptimized(
              ctx,
              obj.data.path,
              strokeColor,
              strokeWidth,
              opacity,
              objectId
            );
          } else if (brushType === "spray") {
            renderSprayOptimized(
              ctx,
              obj.data.path,
              strokeColor,
              strokeWidth,
              opacity,
              objectId
            );
          } else if (brushType === "crayon") {
            renderCrayonOptimized(
              ctx,
              obj.data.path,
              strokeColor,
              strokeWidth,
              opacity
            );
          } else {
            // Default rendering for pencil or unknown brush types
            const path = new Path2D(obj.data.path);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.stroke(path);
          }
          break;
        }

        case "rectangle": {
          if (obj.width && obj.height) {
            // Draw the original object
            if (obj.fill && obj.fill !== "none") {
              ctx.fillStyle = obj.fill;
              ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
            }
            if (obj.stroke) {
              ctx.strokeStyle = obj.stroke;
              ctx.lineWidth = obj.strokeWidth || 2;
              ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
            }
          }
          break;
        }

        case "circle": {
          if (obj.width) {
            const radiusX = obj.width / 2;
            const radiusY = obj.height / 2;
            const centerX = obj.x + radiusX;
            const centerY = obj.y + radiusY;

            // Draw the original object as an ellipse
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);

            if (obj.fill && obj.fill !== "none") {
              ctx.fillStyle = obj.fill;
              ctx.fill();
            }
            if (obj.stroke) {
              ctx.strokeStyle = obj.stroke;
              ctx.lineWidth = obj.strokeWidth || 2;
              ctx.stroke();
            }
          }
          break;
        }

        case "image": {
          const imageData = obj.data as any;
          let imageSrc: string | null = null;
          let fallbackSrc: string | null = null;

          // Handle custom stamps vs regular stamps with fallback
          if (imageData?.isCustomStamp && imageData?.customStampId) {
            // For custom stamps, try the customStampId first
            imageSrc = imageData.customStampId;
            // Use fallback if available, otherwise default fallback
            fallbackSrc = imageData?.fallbackSrc || "/icons/emotions/happy.svg";
          } else if (imageData?.src) {
            // For regular stamps, use src directly
            imageSrc = imageData.src;
          }

          if (imageSrc && obj.width && obj.height) {
            const normalizedSrc = normalizeImagePath(imageSrc);
            const cachedImage = imageCache.current.get(normalizedSrc);

            if (cachedImage) {
              // Calculate render dimensions
              let renderWidth = obj.width;
              let renderHeight = obj.height;
              let renderX = obj.x;
              let renderY = obj.y;

              // For custom stamps with aspect ratio preservation
              if (imageData?.isCustomStamp && imageData?.preserveAspectRatio) {
                const imageAspectRatio =
                  cachedImage.naturalWidth / cachedImage.naturalHeight;
                const objectAspectRatio = obj.width / obj.height;

                if (imageAspectRatio > objectAspectRatio) {
                  // Image is wider - fit to width
                  renderHeight = obj.width / imageAspectRatio;
                  renderY = obj.y + (obj.height - renderHeight) / 2;
                } else {
                  // Image is taller - fit to height
                  renderWidth = obj.height * imageAspectRatio;
                  renderX = obj.x + (obj.width - renderWidth) / 2;
                }
              }

              // Image is ready, render it
              ctx.drawImage(
                cachedImage,
                Math.round(renderX),
                Math.round(renderY),
                Math.round(renderWidth),
                Math.round(renderHeight)
              );
            } else {
              // Load image asynchronously using normalized src for consistency
              getOrLoadImage(normalizedSrc)
                .then(() => {
                  // Only redraw if canvas still exists
                  if (canvas) {
                    redrawCanvas(false, `image-loaded:${normalizedSrc}`);
                  }
                })
                .catch((error) => {
                  console.warn("Failed to load image for rendering:", error);

                  // If it's a custom stamp and we have a fallback, try loading that ONCE
                  if (fallbackSrc) {
                    const normalizedFallbackSrc =
                      normalizeImagePath(fallbackSrc);
                    if (
                      !imageCache.current.has(normalizedFallbackSrc) &&
                      !failedImages.current.has(normalizedFallbackSrc)
                    ) {
                      getOrLoadImage(normalizedFallbackSrc)
                        .then(() => {
                          if (canvas) {
                            redrawCanvas(
                              false,
                              `fallback-loaded:${normalizedFallbackSrc}`
                            );
                          }
                        })
                        .catch((fallbackError) => {
                          console.error(
                            "Failed to load fallback image:",
                            fallbackError
                          );
                          // Don't trigger more redraws here - fallback failed permanently
                        });
                    }
                  }
                });

              // If we have a fallback and the main image failed, try rendering the fallback
              if (fallbackSrc) {
                const normalizedFallbackSrc = normalizeImagePath(fallbackSrc);
                if (imageCache.current.has(normalizedFallbackSrc)) {
                  const fallbackImage = imageCache.current.get(
                    normalizedFallbackSrc
                  )!;
                  ctx.globalAlpha = 0.7; // Slightly transparent to indicate fallback
                  ctx.drawImage(
                    fallbackImage,
                    Math.round(obj.x),
                    Math.round(obj.y),
                    Math.round(obj.width),
                    Math.round(obj.height)
                  );
                  ctx.globalAlpha = 1;
                }
              }
            }
          }
          break;
        }

        case "triangle":
        case "diamond":
        case "pentagon":
        case "hexagon":
        case "star":
        case "heart": {
          if (obj.width && obj.height) {
            switch (obj.type) {
              case "triangle":
                renderTriangle(
                  ctx,
                  obj.x,
                  obj.y,
                  obj.width,
                  obj.height,
                  obj.fill,
                  obj.stroke,
                  obj.strokeWidth
                );
                break;
              case "diamond":
                renderDiamond(
                  ctx,
                  obj.x,
                  obj.y,
                  obj.width,
                  obj.height,
                  obj.fill,
                  obj.stroke,
                  obj.strokeWidth
                );
                break;
              case "pentagon":
                renderPentagon(
                  ctx,
                  obj.x,
                  obj.y,
                  obj.width,
                  obj.height,
                  obj.fill,
                  obj.stroke,
                  obj.strokeWidth
                );
                break;
              case "hexagon":
                renderHexagon(
                  ctx,
                  obj.x,
                  obj.y,
                  obj.width,
                  obj.height,
                  obj.fill,
                  obj.stroke,
                  obj.strokeWidth
                );
                break;
              case "star":
                renderStar(
                  ctx,
                  obj.x,
                  obj.y,
                  obj.width,
                  obj.height,
                  obj.fill,
                  obj.stroke,
                  obj.strokeWidth
                );
                break;
              case "heart":
                renderHeart(
                  ctx,
                  obj.x,
                  obj.y,
                  obj.width,
                  obj.height,
                  obj.fill,
                  obj.stroke,
                  obj.strokeWidth
                );
                break;
            }
          }
          break;
        }

        case "text": {
          if (obj.data?.content && obj.width && obj.height) {
            const textData = obj.data as TextData;

            // Get the text content to render - use live editing text if this object is being edited
            const isBeingEdited =
              editingTextId ===
              Object.keys(objects).find((id) => objects[id] === obj);
            let contentToRender =
              isBeingEdited && editingText !== undefined
                ? editingText
                : textData.content;

            // Always show placeholder for empty content
            if (!contentToRender || contentToRender.trim() === "") {
              contentToRender = "Double-click to edit";
            }

            // Set font properties - make placeholder text lighter
            let fontStyle = "";
            if (textData.italic) fontStyle += "italic ";
            if (textData.bold) fontStyle += "bold ";

            ctx.font = `${fontStyle}${textData.fontSize}px ${textData.fontFamily}`;

            // Make placeholder text lighter but not too light
            if (contentToRender === "Double-click to edit") {
              ctx.fillStyle = obj.stroke ? `${obj.stroke}B3` : "#000000B3"; // 70% opacity for placeholder
            } else {
              ctx.fillStyle = obj.stroke || "#000000";
            }
            ctx.textBaseline = "top";

            // Handle text alignment
            switch (textData.textAlign) {
              case "left":
                ctx.textAlign = "left";
                break;
              case "center":
                ctx.textAlign = "center";
                break;
              case "right":
                ctx.textAlign = "right";
                break;
              default:
                ctx.textAlign = "left";
            }

            // Calculate pixel-aligned text positions - use consistent 8px padding to match textarea
            const textXBase = Math.round(obj.x + 8); // Add 8px left padding to match textarea
            const textYBase = Math.round(obj.y + 8); // 8px padding from top to match textarea

            // Calculate available width for text wrapping - use object's actual width
            const availableWidth = Math.max((obj.width || 100) - 16, 50); // Use object width minus padding, minimum 50px

            // Use the same measureText function as the measurement system for consistent wrapping
            const textMetrics = measureText(
              contentToRender,
              textData.fontSize,
              textData.fontFamily,
              textData.bold,
              textData.italic,
              availableWidth
            );

            console.log("🎯 CANVAS TEXT RENDER DEBUG:", {
              content:
                contentToRender.slice(0, 50) +
                (contentToRender.length > 50 ? "..." : ""),
              contentLength: contentToRender.length,
              availableWidth,
              measuredLines: textMetrics.lines.length,
              lines: textMetrics.lines,
              maxLineLength: Math.max(
                ...textMetrics.lines.map((line) => line.length)
              ),
              avgLineLength:
                textMetrics.lines.reduce((sum, line) => sum + line.length, 0) /
                textMetrics.lines.length,
              stickyNotePosition: { x: obj.x, y: obj.y },
              stickyNoteDimensions: { width: obj.width, height: obj.height },
              fontSettings: {
                fontSize: textData.fontSize,
                fontFamily: textData.fontFamily,
                bold: textData.bold,
                italic: textData.italic,
              },
              timestamp: Date.now(),
            });

            // Render each line with proper alignment
            for (let i = 0; i < textMetrics.lines.length; i++) {
              const line = textMetrics.lines[i];
              const lineY = Math.round(textYBase + i * textMetrics.lineHeight);

              let textX = textXBase;
              if (textData.textAlign === "center") {
                textX = Math.round(obj.x + obj.width / 2);
              } else if (textData.textAlign === "right") {
                textX = Math.round(obj.x + obj.width - 8); // Subtract right padding (8px)
              }

              ctx.fillText(line, textX, lineY);
            }

            // Draw underline if enabled - using accurate text measurements and closer positioning
            if (textData.underline) {
              ctx.save();
              ctx.strokeStyle = obj.stroke || "#000000";
              ctx.lineWidth = 1;

              // Draw underline for each line individually
              for (let i = 0; i < textMetrics.lines.length; i++) {
                const lineText = textMetrics.lines[i];
                if (lineText.length === 0) continue; // Skip empty lines

                // Measure the actual text width
                const textMeasurement = ctx.measureText(lineText);
                const textWidth = textMeasurement.width;

                // Calculate underline position based on text alignment
                let underlineStartX = textXBase;
                if (textData.textAlign === "center") {
                  underlineStartX = Math.round(
                    obj.x + obj.width / 2 - textWidth / 2
                  );
                } else if (textData.textAlign === "right") {
                  underlineStartX = Math.round(
                    obj.x + obj.width - 8 - textWidth
                  ); // Use 8px padding
                }

                const underlineEndX = Math.round(underlineStartX + textWidth);
                // Move underline much closer to text - only 2px below baseline instead of fontSize + 2
                const underlineY = Math.round(
                  textYBase + i * textMetrics.lineHeight + textData.fontSize - 2
                );

                ctx.beginPath();
                ctx.moveTo(underlineStartX, underlineY);
                ctx.lineTo(underlineEndX, underlineY);
                ctx.stroke();
              }
              ctx.restore();
            }

            // Draw text box border - only show dashed border when selected (not being edited) or for placeholder
            if (
              (isSelected && !isBeingEdited) ||
              contentToRender === "Double-click to edit"
            ) {
              ctx.save();
              // Use blue color if selected, otherwise use gray for placeholder
              ctx.strokeStyle = isSelected ? "#007AFF" : "#cccccc";
              ctx.lineWidth = 1;
              ctx.setLineDash([2, 2]);
              ctx.strokeRect(
                Math.round(obj.x),
                Math.round(obj.y),
                Math.round(obj.width),
                Math.round(obj.height)
              );
              ctx.restore();
            }
          }
          break;
        }

        case "sticky-note": {
          if (obj.width && obj.height) {
            const stickyNoteData = obj.data;
            const isBeingEdited =
              editingTextId ===
              Object.keys(objects).find((id) => objects[id] === obj);
            let contentToRender =
              isBeingEdited && editingText !== undefined
                ? editingText
                : stickyNoteData.content;
            const objectId = Object.keys(objects).find(
              (id) => objects[id] === obj
            );

            // Debug: Show all sticky notes in store to detect duplicates
            const allStickyNotes = Object.entries(objects).filter(
              ([id, obj]) => obj.type === "sticky-note"
            );
            console.log(
              "🗒️ ALL STICKY NOTES IN STORE:",
              allStickyNotes.map(([id, obj]) => ({
                id: id.slice(0, 8),
                fullId: id,
                content: obj.data?.content?.slice(0, 10),
                position: { x: obj.x, y: obj.y },
                size: { w: obj.width, h: obj.height },
              }))
            );

            
            // Draw sticky note background with shadow and rounded corners
            ctx.save();
            ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 2;

            ctx.fillStyle = stickyNoteData.backgroundColor || "#fef3c7";
            ctx.beginPath();
            ctx.roundRect(obj.x, obj.y, obj.width, obj.height, 8);
            ctx.fill();

            ctx.shadowColor = "transparent";
            ctx.restore();

            // Render text if present
            if (contentToRender && contentToRender.trim()) {
              const fontWeight = stickyNoteData.bold ? "bold" : "normal";
              const fontStyle = stickyNoteData.italic ? "italic" : "normal";

              ctx.font = `${fontStyle} ${fontWeight} ${stickyNoteData.fontSize}px ${stickyNoteData.fontFamily}`;
              ctx.fillStyle = obj.stroke || "#000000";
              ctx.textAlign = stickyNoteData.textAlign || "center";
              ctx.textBaseline = "top"; // Changed from 'middle' to 'top'

              const maxWidth = obj.width - 16;
              const textMetrics = measureText(
                contentToRender,
                stickyNoteData.fontSize,
                stickyNoteData.fontFamily,
                stickyNoteData.bold,
                stickyNoteData.italic,
                maxWidth
              );
              const lines = textMetrics.lines;
              const lineHeight = textMetrics.lineHeight;
              // Simplified positioning: start from top + padding (20px) to match textarea
              const test = stickyNoteData.fontSize;
              const offsetFromTop =
                test > 50
                  ? 20
                  : test > 40
                  ? 18
                  : test > 30
                  ? 16
                  : test > 20
                  ? 14
                  : test > 15
                  ? 12
                  : test > 10
                  ? 10
                  : 8;
              const startY = obj.y + offsetFromTop;

              let startX = obj.x + obj.width / 2;

              console.log("🗒️ STICKY TEXT COORDINATES (SIMPLIFIED):");
              console.log("  - id:", objectId?.slice(0, 8));
              console.log("  - canvasTextPosition:", { x: startX, y: startY });
              console.log("  - objectBounds:", {
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height,
              });
              console.log("  - textMetrics:", {
                lines: lines.length,
                lineHeight,
              });
              console.log(
                "  - CANVAS TEXT WILL START AT Y:",
                startY,
                "(obj.y + 8 =",
                obj.y,
                "+ 8)"
              );
              if (stickyNoteData.textAlign === "left") startX = obj.x + 8;
              else if (stickyNoteData.textAlign === "right")
                startX = obj.x + obj.width - 8;

              lines.forEach((line, index) => {
                ctx.fillText(line, startX, startY + index * lineHeight);
              });

              // Draw underline if enabled
              if (stickyNoteData.underline) {
                drawTextUnderlines(
                  ctx,
                  lines,
                  startX,
                  startY,
                  lineHeight,
                  stickyNoteData.fontSize,
                  stickyNoteData.textAlign || "center",
                  obj.stroke || "#000000",
                  obj.width
                );
              }
            }

            // Selection border - use dashed border like text objects
            if (isSelected) {
              ctx.save();
              ctx.strokeStyle = "#007AFF";
              ctx.lineWidth = 1;
              ctx.setLineDash([2, 2]);
              ctx.strokeRect(
                Math.round(obj.x),
                Math.round(obj.y),
                Math.round(obj.width),
                Math.round(obj.height)
              );
              ctx.restore();
            }
          }
          break;
        }

        default: {
          // Handle unknown object types gracefully
          console.warn("Unknown object type:", obj.type);
          break;
        }
      }

      ctx.restore();
    },
    [editingTextId, editingText, objects, getOrLoadImage, canvas]
  );

  /**
   * Renders the current drawing preview (work-in-progress path)
   * @param ctx - Canvas rendering context
   * @param preview - Drawing preview data
   */
  const renderDrawingPreview = useCallback(
    (ctx: CanvasRenderingContext2D, preview: any) => {
      if (!preview) return;

      ctx.save();
      ctx.translate(preview.startX, preview.startY);

      // Check if this is an eraser preview
      if (preview.isEraser) {
        // Render eraser preview with a semi-transparent red outline to show where it will erase
        ctx.globalCompositeOperation = "source-over"; // Normal blend for preview
        ctx.strokeStyle = preview.strokeColor;
        ctx.lineWidth = preview.strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = preview.opacity;

        const path = new Path2D(preview.path);
        ctx.stroke(path);
      } else {
        const brushType = preview.brushType;

        // Render preview based on brush type (no caching for previews)
        if (brushType === "paintbrush") {
          renderPaintbrushOptimized(
            ctx,
            preview.path,
            preview.strokeColor,
            preview.strokeWidth,
            preview.opacity
          );
        } else if (brushType === "chalk") {
          renderChalkOptimized(
            ctx,
            preview.path,
            preview.strokeColor,
            preview.strokeWidth,
            preview.opacity
          );
        } else if (brushType === "spray") {
          renderSprayOptimized(
            ctx,
            preview.path,
            preview.strokeColor,
            preview.strokeWidth,
            preview.opacity
          );
        } else if (brushType === "crayon") {
          renderCrayonOptimized(
            ctx,
            preview.path,
            preview.strokeColor,
            preview.strokeWidth,
            preview.opacity
          );
        } else {
          // Default rendering for pencil
          const path = new Path2D(preview.path);
          ctx.strokeStyle = preview.strokeColor;
          ctx.lineWidth = preview.strokeWidth;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.globalAlpha = preview.opacity;
          ctx.stroke(path);
        }
      }

      ctx.restore();
    },
    []
  );

  /**
   * Renders the current shape preview (work-in-progress shape)
   * @param ctx - Canvas rendering context
   * @param preview - Shape preview data
   */
  const renderShapePreview = useCallback(
    (ctx: CanvasRenderingContext2D, preview: any) => {
      if (!preview) return;

      ctx.save();
      ctx.globalAlpha = preview.opacity * 0.7; // Make preview slightly transparent

      const width = Math.abs(preview.endX - preview.startX);
      const height = Math.abs(preview.endY - preview.startY);
      const x = Math.min(preview.startX, preview.endX);
      const y = Math.min(preview.startY, preview.endY);

      // Set stroke and fill styles
      if (preview.strokeColor) {
        ctx.strokeStyle = preview.strokeColor;
        ctx.lineWidth = preview.strokeWidth;
      }
      if (preview.fillColor && preview.fillColor !== "transparent") {
        ctx.fillStyle = preview.fillColor;
      }

      switch (preview.type) {
        case "text": {
          // Draw text box preview with dashed border only - no placeholder text
          ctx.save();
          ctx.strokeStyle = preview.strokeColor || "#000000";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(x, y, width, height);
          ctx.restore();
          break;
        }

        case "rectangle": {
          if (preview.fillColor && preview.fillColor !== "transparent") {
            ctx.fillRect(x, y, width, height);
          }
          if (preview.strokeColor) {
            ctx.strokeRect(x, y, width, height);
          }
          break;
        }

        case "circle": {
          const radiusX = width / 2;
          const radiusY = height / 2;
          const centerX = x + radiusX;
          const centerY = y + radiusY;

          ctx.beginPath();
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);

          if (preview.fillColor && preview.fillColor !== "transparent") {
            ctx.fill();
          }
          if (preview.strokeColor) {
            ctx.stroke();
          }
          break;
        }

        case "triangle":
        case "diamond":
        case "pentagon":
        case "hexagon":
        case "star":
        case "heart": {
          const shapePath = generateShapePathPreview(
            preview.type,
            x,
            y,
            width,
            height
          );
          if (shapePath) {
            const path = new Path2D(shapePath);

            if (preview.fillColor && preview.fillColor !== "transparent") {
              ctx.fill(path);
            }
            if (preview.strokeColor) {
              ctx.stroke(path);
            }
          }
          break;
        }
      }

      ctx.restore();
    },
    []
  );

  /**
   * Generates SVG path data for complex shape previews
   */
  const generateShapePathPreview = useCallback(
    (
      shapeType: string,
      x: number,
      y: number,
      width: number,
      height: number
    ): string => {
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      switch (shapeType) {
        case "triangle":
          return `M ${centerX} ${y} L ${x + width} ${y + height} L ${x} ${
            y + height
          } Z`;

        case "diamond":
          return `M ${centerX} ${y} L ${x + width} ${centerY} L ${centerX} ${
            y + height
          } L ${x} ${centerY} Z`;

        case "pentagon": {
          const pentagonPoints = [];
          for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
            // Use separate width and height scaling instead of circular radius
            const px = centerX + (width / 2) * Math.cos(angle);
            const py = centerY + (height / 2) * Math.sin(angle);
            pentagonPoints.push(`${i === 0 ? "M" : "L"} ${px} ${py}`);
          }
          return pentagonPoints.join(" ") + " Z";
        }

        case "hexagon": {
          const hexagonPoints = [];
          for (let i = 0; i < 6; i++) {
            const angle = (i * 2 * Math.PI) / 6;
            // Use separate width and height scaling instead of circular radius
            const px = centerX + (width / 2) * Math.cos(angle);
            const py = centerY + (height / 2) * Math.sin(angle);
            hexagonPoints.push(`${i === 0 ? "M" : "L"} ${px} ${py}`);
          }
          return hexagonPoints.join(" ") + " Z";
        }

        case "star": {
          const starPoints = [];
          const outerRadiusX = width / 2;
          const outerRadiusY = height / 2;
          const innerRadiusX = outerRadiusX * 0.4;
          const innerRadiusY = outerRadiusY * 0.4;

          for (let i = 0; i < 10; i++) {
            const angle = (i * Math.PI) / 5 - Math.PI / 2;
            // Use separate X and Y scaling for non-circular stars
            const radiusX = i % 2 === 0 ? outerRadiusX : innerRadiusX;
            const radiusY = i % 2 === 0 ? outerRadiusY : innerRadiusY;
            const px = centerX + radiusX * Math.cos(angle);
            const py = centerY + radiusY * Math.sin(angle);
            starPoints.push(`${i === 0 ? "M" : "L"} ${px} ${py}`);
          }
          return starPoints.join(" ") + " Z";
        }

        case "heart": {
          // Heart shape using cubic bezier curves
          const heartWidth = width;
          const heartHeight = height;
          const topCurveHeight = heartHeight * 0.3;
          const centerXHeart = x + width / 2;
          const centerYHeart = y + height / 2;

          return `M ${centerXHeart} ${y + heartHeight * 0.3}
                C ${centerXHeart} ${y + topCurveHeight * 0.5}, ${
            centerXHeart - heartWidth * 0.2
          } ${y}, ${centerXHeart - heartWidth * 0.4} ${y}
                C ${centerXHeart - heartWidth * 0.6} ${y}, ${
            centerXHeart - heartWidth * 0.8
          } ${y + topCurveHeight * 0.5}, ${centerXHeart - heartWidth * 0.5} ${
            y + topCurveHeight
          }
                C ${centerXHeart - heartWidth * 0.5} ${
            y + topCurveHeight
          }, ${centerXHeart} ${y + heartHeight * 0.6}, ${centerXHeart} ${
            y + heartHeight
          }
                C ${centerXHeart} ${y + heartHeight * 0.6}, ${
            centerXHeart + heartWidth * 0.5
          } ${y + topCurveHeight}, ${centerXHeart + heartWidth * 0.5} ${
            y + topCurveHeight
          }
                C ${centerXHeart + heartWidth * 0.8} ${
            y + topCurveHeight * 0.5
          }, ${centerXHeart + heartWidth * 0.6} ${y}, ${
            centerXHeart + heartWidth * 0.4
          } ${y}
                C ${centerXHeart + heartWidth * 0.2} ${y}, ${centerXHeart} ${
            y + topCurveHeight * 0.5
          }, ${centerXHeart} ${y + heartHeight * 0.3} Z`;
        }

        default:
          return "";
      }
    },
    []
  );

  /**
   * Renders all whiteboard objects on the canvas
   * @param ctx - Canvas rendering context
   */
  const renderAllObjects = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const objectEntries = Object.entries(objects);
      const liveDragPositions = getLiveDragPositions
        ? getLiveDragPositions()
        : {};

      // Sort by creation time to maintain z-order
      objectEntries.sort(([, a], [, b]) => a.createdAt - b.createdAt);

      objectEntries.forEach(([id, obj]) => {
        const isSelected = selectedObjectIds.includes(id);

        // Apply live drag position if object is being dragged
        let renderObj = obj;
        if (liveDragPositions[id]) {
          console.log("🎯 Canvas rendering - applying live drag position for:", id.slice(0, 8), liveDragPositions[id]);
          renderObj = {
            ...obj,
            x: liveDragPositions[id].x,
            y: liveDragPositions[id].y,
          };
        }

        renderObject(ctx, renderObj, isSelected);
      });
    },
    [objects, selectedObjectIds, renderObject, getLiveDragPositions]
  );

  // Throttle canvas redraws to improve performance during drawing
  const lastRedrawTime = useRef<number>(0);
  const REDRAW_THROTTLE_MS = 16; // 60fps throttling for smooth interactions

  const redrawCanvas = useCallback(
    (immediate = false, source = "unknown") => {
      if (!canvas) return;

      const now = Date.now();

      // Always redraw immediately if explicitly requested OR if we have a drawing preview (drawing is active) OR if we have live drag positions
      const hasDrawingPreview =
        getCurrentDrawingPreview && getCurrentDrawingPreview();
      const liveDragPositions = getLiveDragPositions && getLiveDragPositions();
      const hasActiveDrag =
        liveDragPositions && Object.keys(liveDragPositions).length > 0;
      const shouldRedrawImmediately =
        immediate || hasDrawingPreview || hasActiveDrag;

      // If immediate redraw is requested, drawing preview exists (drawing is active), or enough time has passed, redraw now
      if (
        shouldRedrawImmediately ||
        now - lastRedrawTime.current >= REDRAW_THROTTLE_MS
      ) {
        lastRedrawTime.current = now;

        // Clear any pending timeout
        if (redrawTimeoutRef.current) {
          window.clearTimeout(redrawTimeoutRef.current);
          redrawTimeoutRef.current = null;
        }

        performRedraw();
      } else {
        // Schedule normal throttled redraw
        if (!redrawTimeoutRef.current) {
          const timeUntilNextRedraw =
            REDRAW_THROTTLE_MS - (now - lastRedrawTime.current);

          redrawTimeoutRef.current = window.setTimeout(() => {
            redrawTimeoutRef.current = null;
            lastRedrawTime.current = Date.now();
            performRedraw();
          }, timeUntilNextRedraw);
        }
      }
    },
    [
      canvas,
      viewport,
      objects,
      selectedObjectIds,
      settings,
      getCurrentDrawingPreview,
      getCurrentShapePreview,
      editingTextId,
      editingText,
      getLiveDragPositions,
    ]
  );

  const performRedraw = useCallback(() => {
    if (!canvas) return;

    // Set up canvas for crisp, pixel-aligned rendering using the constrained whiteboard size
    const devicePixelRatio = window.devicePixelRatio || 1;

    canvas.width = activeWhiteboardSize.width * devicePixelRatio;
    canvas.height = activeWhiteboardSize.height * devicePixelRatio;
    canvas.style.width = activeWhiteboardSize.width + "px";
    canvas.style.height = activeWhiteboardSize.height + "px";

    const ctx = canvas.getContext("2d")!;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Clear the entire canvas completely
    ctx.clearRect(
      0,
      0,
      activeWhiteboardSize.width,
      activeWhiteboardSize.height
    );

    // Draw background color or image first
    const bg = settings.backgroundColor || "#ffffff";
    const canvasW = activeWhiteboardSize.width;
    const canvasH = activeWhiteboardSize.height;

    // Always start with a solid base to avoid transparency flashes
    const baseColor = bg.startsWith("url(") ? "#ffffff" : bg;
    try {
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, canvasW, canvasH);
    } catch {}

    // If background is an image URL or data URL, draw it to cover without distortion
    if (typeof bg === "string" && bg.startsWith("url(")) {
      const match = bg.match(/url\((['"]?)(.*?)\1\)/);
      const srcRaw = match?.[2];
      if (srcRaw) {
        const normalizedSrc = normalizeImagePath(srcRaw);
        const cached = getCachedImage(normalizedSrc);
        const img =
          cached.image || imageCache.current.get(normalizedSrc) || null;

        if (img) {
          // Compute cover dimensions (maintain aspect ratio, no stretching)
          const scale = Math.max(canvasW / img.width, canvasH / img.height);
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          const dx = (canvasW - drawW) / 2;
          const dy = (canvasH - drawH) / 2;
          ctx.drawImage(img, dx, dy, drawW, drawH);
        } else {
          // Trigger async load and redraw when ready
          getOrLoadImage(normalizedSrc)
            .then(() => {
              if (canvas) {
                redrawCanvas(false, "bg-image-loaded");
              }
            })
            .catch(() => {});
        }
      }
    }

    // Draw background patterns on top of image/color
    if (settings.gridVisible) {
      drawGrid(ctx, activeWhiteboardSize.width, activeWhiteboardSize.height);
    }

    if (settings.linedPaperVisible) {
      drawLinedPaper(
        ctx,
        activeWhiteboardSize.width,
        activeWhiteboardSize.height
      );
    }

    if (settings.showDots) {
      drawDots(ctx, activeWhiteboardSize.width, activeWhiteboardSize.height);
    }

    // Draw all objects with their current positions
    renderAllObjects(ctx);

    // Draw current drawing preview if available
    if (getCurrentDrawingPreview) {
      const preview = getCurrentDrawingPreview();
      if (preview) {
        renderDrawingPreview(ctx, preview);
      }
    }

    // Draw current shape preview if available
    if (getCurrentShapePreview) {
      const shapePreview = getCurrentShapePreview();
      if (shapePreview) {
        renderShapePreview(ctx, shapePreview);
      }
    }

    // Draw selection box if available
    if (getCurrentSelectionBox) {
      const selectionBox = getCurrentSelectionBox();
      if (selectionBox && selectionBox.isActive) {
        ctx.save();

        // Calculate box dimensions
        const width = selectionBox.endX - selectionBox.startX;
        const height = selectionBox.endY - selectionBox.startY;
        const left = Math.min(selectionBox.startX, selectionBox.endX);
        const top = Math.min(selectionBox.startY, selectionBox.endY);

        // Draw selection box with blue border and light blue fill
        ctx.strokeStyle = "#007AFF";
        ctx.fillStyle = "rgba(0, 122, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]); // Dashed border

        // Fill the selection area
        ctx.fillRect(left, top, Math.abs(width), Math.abs(height));

        // Stroke the border
        ctx.strokeRect(left, top, Math.abs(width), Math.abs(height));

        ctx.restore();
      }
    }
  }, [
    canvas,
    viewport,
    objects,
    selectedObjectIds,
    getCurrentDrawingPreview,
    getCurrentShapePreview,
    getCurrentSelectionBox,
    editingTextId,
    editingText,
    settings,
    toolSettings,
    renderAllObjects,
    renderDrawingPreview,
    renderShapePreview,
  ]);

  // Auto-redraw when state changes - with debugging
  useEffect(() => {
    redrawCanvas(false, "state-change");
  }, [redrawCanvas]);

  // Debug: Track objects changes specifically
  useEffect(() => {}, [objects]);

  // Cleanup throttle timeout on unmount
  useEffect(() => {
    return () => {
      if (redrawTimeoutRef.current) {
        window.clearTimeout(redrawTimeoutRef.current);
      }
    };
  }, []);

  // Watch for canvas size changes and trigger redraw
  // Use a ref to track if we're in a manual resize operation to prevent infinite loops
  const isManualResizing = useRef(false);

  useEffect(() => {
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      // Only trigger redraw if we're not in a manual resize operation
      if (!isManualResizing.current) {
        for (const entry of entries) {
          redrawCanvas();
        }
      } else {
        console.log(
          "📐 Canvas size changed during manual resize - skipping redraw"
        );
      }
    });

    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, [canvas, redrawCanvas]);

  return {
    redrawCanvas,
    renderObject,
    renderAllObjects,
    isManualResizing,
  };
};

/**
 * Draws a grid pattern on the canvas
 * @param ctx - Canvas rendering context
 * @param width - Canvas width
 * @param height - Canvas height
 */
const drawGrid = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void => {
  const GRID_SIZE = 20;
  const GRID_COLOR = "#e5e7eb"; // Subtle light grey like grid paper

  ctx.save();
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5; // Thinner lines for subtlety

  // Draw vertical lines
  for (let x = 0; x <= width; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }

  // Draw horizontal lines
  for (let y = 0; y <= height; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
};

const drawLinedPaper = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void => {
  const LINE_SPACING = 24;
  const LINE_COLOR = "#d1d5db"; // Subtle light grey like notebook paper

  ctx.save();
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 0.5; // Thin lines like real paper

  for (let y = LINE_SPACING; y <= height; y += LINE_SPACING) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
};

const drawDots = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void => {
  const DOT_SPACING = 20;
  const DOT_COLOR = "#d1d5db"; // Subtle light grey like graph paper
  const DOT_RADIUS = 1; // Small dots like real graph paper

  ctx.save();
  ctx.fillStyle = DOT_COLOR;

  for (let x = DOT_SPACING; x <= width; x += DOT_SPACING) {
    for (let y = DOT_SPACING; y <= height; y += DOT_SPACING) {
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
  ctx.restore();
};
