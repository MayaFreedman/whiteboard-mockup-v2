export interface WhiteboardObject {
  id: string;
  type: 'path' | 'rectangle' | 'circle' | 'ellipse' | 'line' | 'triangle' | 'text' | 'image';
  x: number;
  y: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  data?: any; // For storing tool-specific data
  createdAt: number;
  updatedAt: number;
  createdBy?: string; // For multiplayer user tracking
}

export interface DrawingPath extends WhiteboardObject {
  type: 'path';
  data: {
    path: string; // SVG path string
    brushType: 'pencil' | 'chalk' | 'spray' | 'crayon';
  };
}

export interface TextObject extends WhiteboardObject {
  type: 'text';
  data: {
    content: string;
    fontSize: number;
    fontFamily: string;
    textAlign: 'left' | 'center' | 'right';
  };
}

export interface ImageObject extends WhiteboardObject {
  type: 'image';
  data: {
    src: string;
    originalWidth: number;
    originalHeight: number;
  };
}

export interface WhiteboardState {
  objects: Record<string, WhiteboardObject>;
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

export interface WhiteboardAction {
  type: string;
  payload: any;
  timestamp: number;
  userId?: string;
  id: string;
}

// Action types for multiplayer synchronization
export type WhiteboardActionType =
  | 'ADD_OBJECT'
  | 'UPDATE_OBJECT' 
  | 'DELETE_OBJECT'
  | 'SELECT_OBJECTS'
  | 'CLEAR_SELECTION'
  | 'UPDATE_VIEWPORT'
  | 'UPDATE_SETTINGS'
  | 'CLEAR_CANVAS'
  | 'BATCH_UPDATE';

export interface AddObjectAction extends WhiteboardAction {
  type: 'ADD_OBJECT';
  payload: {
    object: WhiteboardObject;
  };
}

export interface UpdateObjectAction extends WhiteboardAction {
  type: 'UPDATE_OBJECT';
  payload: {
    id: string;
    updates: Partial<WhiteboardObject>;
  };
}

export interface DeleteObjectAction extends WhiteboardAction {
  type: 'DELETE_OBJECT';
  payload: {
    id: string;
  };
}

export interface SelectObjectsAction extends WhiteboardAction {
  type: 'SELECT_OBJECTS';
  payload: {
    objectIds: string[];
  };
}

export interface UpdateViewportAction extends WhiteboardAction {
  type: 'UPDATE_VIEWPORT';
  payload: {
    x?: number;
    y?: number;
    zoom?: number;
  };
}

export interface UpdateSettingsAction extends WhiteboardAction {
  type: 'UPDATE_SETTINGS';
  payload: Partial<WhiteboardState['settings']>;
}

export interface ClearCanvasAction extends WhiteboardAction {
  type: 'CLEAR_CANVAS';
  payload: {};
}

export interface BatchUpdateAction extends WhiteboardAction {
  type: 'BATCH_UPDATE';
  payload: {
    actions: WhiteboardAction[];
  };
}
