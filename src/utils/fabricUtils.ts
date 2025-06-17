
import { WhiteboardObject } from '../types/whiteboard';

// Convert Fabric.js object to our whiteboard object format
export function fabricToWhiteboardObject(fabricObj: any): Partial<WhiteboardObject> {
  const baseProps = {
    x: fabricObj.left || 0,
    y: fabricObj.top || 0,
    width: fabricObj.width,
    height: fabricObj.height,
    fill: fabricObj.fill as string,
    stroke: fabricObj.stroke as string,
    strokeWidth: fabricObj.strokeWidth,
    opacity: fabricObj.opacity
  };

  // Type-specific handling - only support types defined in WhiteboardObject
  switch (fabricObj.type) {
    case 'rect':
      return {
        ...baseProps,
        type: 'rectangle'
      };
    case 'circle':
      return {
        ...baseProps,
        type: 'circle'
      };
    case 'path':
      return {
        ...baseProps,
        type: 'path',
        data: {
          path: (fabricObj as any).path
        }
      };
    case 'i-text':
    case 'text':
      return {
        ...baseProps,
        type: 'text',
        data: {
          content: (fabricObj as any).text,
          fontSize: (fabricObj as any).fontSize,
          fontFamily: (fabricObj as any).fontFamily
        }
      };
    default:
      // For unsupported types, default to path
      return {
        ...baseProps,
        type: 'path'
      };
  }
}

// Convert whiteboard object to Fabric.js compatible format
export function whiteboardObjectToFabricProps(obj: WhiteboardObject): any {
  const baseProps = {
    left: obj.x,
    top: obj.y,
    width: obj.width,
    height: obj.height,
    fill: obj.fill,
    stroke: obj.stroke,
    strokeWidth: obj.strokeWidth,
    opacity: obj.opacity,
    selectable: true,
    evented: true
  };

  switch (obj.type) {
    case 'text':
      return {
        ...baseProps,
        text: obj.data?.content || '',
        fontSize: obj.data?.fontSize || 16,
        fontFamily: obj.data?.fontFamily || 'Arial'
      };
    case 'path':
      return {
        ...baseProps,
        path: obj.data?.path
      };
    default:
      return baseProps;
  }
}

// Generate unique object ID for Fabric objects
export function assignWhiteboardId(fabricObj: any, id: string): void {
  (fabricObj as any).whiteboardId = id;
}

// Get whiteboard ID from Fabric object
export function getWhiteboardId(fabricObj: any): string | undefined {
  return (fabricObj as any).whiteboardId;
}

// Serialize canvas state for network transmission
export function serializeCanvasState(objects: Record<string, WhiteboardObject>): string {
  return JSON.stringify(objects);
}

// Deserialize canvas state from network
export function deserializeCanvasState(serialized: string): Record<string, WhiteboardObject> {
  try {
    return JSON.parse(serialized);
  } catch (error) {
    console.error('Failed to deserialize canvas state:', error);
    return {};
  }
}
