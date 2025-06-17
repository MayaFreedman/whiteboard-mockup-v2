import { Point } from '../utils/path/pathConversion';

export interface WhiteboardObject {
  id: string;
  type: 'path' | 'rectangle' | 'circle' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
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
}

export interface DeleteObjectAction extends BaseAction {
  type: 'DELETE_OBJECT';
  payload: {
    id: string;
  };
}

export interface SelectObjectsAction extends BaseAction {
  type: 'SELECT_OBJECTS';
  payload: {
    objectIds: string[];
  };
}

export interface UpdateViewportAction extends BaseAction {
  type: 'UPDATE_VIEWPORT';
  payload: Partial<WhiteboardState['viewport']>;
}

export interface UpdateSettingsAction extends BaseAction {
  type: 'UPDATE_SETTINGS';
  payload: Partial<WhiteboardState['settings']>;
}

export interface ClearCanvasAction extends BaseAction {
  type: 'CLEAR_CANVAS';
  payload: {};
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
}

export type WhiteboardAction = 
  | AddObjectAction
  | UpdateObjectAction
  | DeleteObjectAction
  | SelectObjectsAction
  | UpdateViewportAction
  | UpdateSettingsAction
  | ClearCanvasAction
  | BatchUpdateAction
  | ErasePixelsAction
  | DeleteObjectsInAreaAction
  | ErasePathAction;
