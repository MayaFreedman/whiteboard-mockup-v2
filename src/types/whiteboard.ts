
import { Point } from '../utils/path/pathConversion';

export interface WhiteboardObject {
  id: string;
  type: 'path' | 'rectangle' | 'circle' | 'text' | 'triangle' | 'diamond' | 'pentagon' | 'hexagon' | 'star' | 'heart' | 'image';
  x: number;
  y: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
  data?: any;
  createdAt: number;
  updatedAt: number;
}

export interface WhiteboardState {
  objects: { [id: string]: WhiteboardObject };
  selectedObjectIds: string[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  settings: {
    gridVisible: boolean;
    linedPaperVisible: boolean;
    backgroundColor: string;
  };
  lastAction?: WhiteboardAction;
}

interface BaseAction {
  type: string;
  payload: any;
  timestamp: number;
  id: string;
  userId: string;
  previousState?: any; // Store previous state for reliable undo operations
}

export interface AddObjectAction extends BaseAction {
  type: 'ADD_OBJECT';
  payload: {
    object: WhiteboardObject;
  };
}

export interface UpdateObjectAction extends BaseAction {
  type: 'UPDATE_OBJECT';
  payload: {
    id: string;
    updates: Partial<WhiteboardObject>;
  };
  previousState?: {
    object: WhiteboardObject;
  };
}

export interface DeleteObjectAction extends BaseAction {
  type: 'DELETE_OBJECT';
  payload: {
    id: string;
  };
  previousState?: {
    object: WhiteboardObject;
  };
}

export interface SelectObjectsAction extends BaseAction {
  type: 'SELECT_OBJECTS';
  payload: {
    objectIds: string[];
  };
  previousState?: {
    selectedObjectIds: string[];
  };
}

export interface ClearSelectionAction extends BaseAction {
  type: 'CLEAR_SELECTION';
  payload: {};
  previousState?: {
    selectedObjectIds: string[];
  };
}

export interface UpdateViewportAction extends BaseAction {
  type: 'UPDATE_VIEWPORT';
  payload: Partial<WhiteboardState['viewport']>;
  previousState?: {
    viewport: WhiteboardState['viewport'];
  };
}

export interface UpdateSettingsAction extends BaseAction {
  type: 'UPDATE_SETTINGS';
  payload: Partial<WhiteboardState['settings']>;
  previousState?: {
    settings: WhiteboardState['settings'];
  };
}

export interface ClearCanvasAction extends BaseAction {
  type: 'CLEAR_CANVAS';
  payload: {};
  previousState?: {
    objects: { [id: string]: WhiteboardObject };
    selectedObjectIds: string[];
  };
}

export interface BatchUpdateAction extends BaseAction {
  type: 'BATCH_UPDATE';
  payload: {
    actions: WhiteboardAction[];
  };
}

export interface ErasePixelsAction extends BaseAction {
  type: 'ERASE_PIXELS';
  payload: {
    eraserPath: {
      path: string;
      x: number;
      y: number;
      size: number;
      opacity: number;
    };
  };
}

export interface DeleteObjectsInAreaAction extends BaseAction {
  type: 'DELETE_OBJECTS_IN_AREA';
  payload: {
    objectIds: string[];
    eraserArea: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

export interface ErasePathAction extends BaseAction {
  type: 'ERASE_PATH';
  payload: {
    originalObjectId: string;
    eraserPath: {
      x: number;
      y: number;
      size: number;
      path: string;
    };
    resultingSegments: Array<{
      points: Array<{ x: number; y: number }>;
      id: string;
    }>;
  };
  previousState?: {
    object: WhiteboardObject;
  };
}

// New sync actions for undo/redo synchronization
export interface SyncUndoAction extends BaseAction {
  type: 'SYNC_UNDO';
  payload: {
    stateChange: Partial<WhiteboardState>;
    originalActionId: string;
    originalUserId: string;
  };
}

export interface SyncRedoAction extends BaseAction {
  type: 'SYNC_REDO';
  payload: {
    stateChange: Partial<WhiteboardState>;
    redoneActionId: string;
    originalUserId: string;
  };
}

export type WhiteboardAction = 
  | AddObjectAction
  | UpdateObjectAction
  | DeleteObjectAction
  | SelectObjectsAction
  | ClearSelectionAction
  | UpdateViewportAction
  | UpdateSettingsAction
  | ClearCanvasAction
  | BatchUpdateAction
  | ErasePixelsAction
  |DeleteObjectsInAreaAction
  | ErasePathAction
  | SyncUndoAction
  | SyncRedoAction;

// Text-specific interfaces for better type safety
export interface TextData {
  content: string;
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  textAlign: 'left' | 'center' | 'right';
}

export interface TextObject extends WhiteboardObject {
  type: 'text';
  width: number;
  height: number;
  data: TextData;
}

// Image-specific interfaces for stamps
export interface ImageData {
  src: string;
  alt?: string;
}

export interface ImageObject extends WhiteboardObject {
  type: 'image';
  width: number;
  height: number;
  data: ImageData;
}
