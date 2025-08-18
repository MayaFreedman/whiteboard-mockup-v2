# Developer Documentation

## Project Overview

This is a collaborative whiteboard application built by **Maya Freedman** in **Summer 2025**. The application provides a rich drawing experience with real-time multiplayer capabilities, supporting various drawing tools, shapes, stamps, and collaborative features.

## Technology Stack

### Core Technologies
- **React 18** - UI framework with TypeScript
- **Vite** - Build tool and development server
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library built on Radix UI

### State Management
- **Zustand** - Lightweight state management for stores
- **React Query** - Server state management and caching
- **React Context** - For user and multiplayer contexts

### Multiplayer & Networking
- **Colyseus.js** - Real-time multiplayer client
- **WebSocket** - Real-time communication (via Colyseus)

### Additional Libraries
- **Lucide React** - Icon library
- **React Router DOM** - Client-side routing
- **Sonner** - Toast notifications
- **nanoid** - Unique ID generation
- **date-fns** - Date utilities

## Directory Structure

### `/src` - Main Source Code

```
src/
├── components/          # All React components
│   ├── ui/             # shadcn/ui components (buttons, dialogs, etc.)
│   ├── whiteboard/     # Whiteboard-specific components
│   │   ├── settings/   # Tool settings and configuration components
│   │   └── ...         # Canvas, toolbar, sidebar components
│   └── dev-tools/      # Development and debugging components
│       └── multiplayer/ # Multiplayer debugging tools
├── contexts/           # React context providers
├── hooks/              # Custom React hooks
│   └── canvas/         # Canvas-specific hooks
├── stores/             # Zustand state stores
├── utils/              # Utility functions and helpers
│   └── path/           # Path manipulation utilities
├── types/              # TypeScript type definitions
├── config/             # Configuration files
├── pages/              # Route components
└── assets/             # Static assets (SVGs, backgrounds)
```

### Key Directories Explained

- **`components/ui/`** - Reusable UI components from shadcn/ui
- **`components/whiteboard/`** - Core whiteboard functionality
- **`components/whiteboard/settings/`** - Tool configuration panels
- **`hooks/canvas/`** - Canvas interaction logic
- **`stores/`** - Application state management
- **`utils/`** - Pure utility functions and helpers
- **`config/`** - Application configuration and constants

## Core Systems

### State Management (Zustand Stores)

#### `whiteboardStore.ts`
- Manages whiteboard objects, viewport, and canvas state
- Handles object creation, modification, and deletion
- Manages viewport (zoom, pan)
- Tracks action history for undo/redo functionality

#### `toolStore.ts` 
- Manages active tool selection
- Stores tool-specific settings (colors, sizes, etc.)
- Handles tool state persistence
- Tracks tool change history

#### `screenSizeStore.ts`
- Manages responsive design breakpoints
- Tracks screen size changes
- Provides mobile/desktop detection

### Multiplayer Architecture

#### `MultiplayerContext.tsx`
- Manages Colyseus room connections
- Handles user presence and synchronization
- Provides real-time communication interface
- Manages connection status and errors

#### `useMultiplayerSync.ts`
- Synchronizes local state with remote users
- Handles conflict resolution
- Manages action broadcasting

### Canvas System

#### Canvas Rendering
- Custom canvas implementation (not using Fabric.js despite the dependency)
- Direct 2D context manipulation for performance
- Progressive rendering for large numbers of objects

#### Drawing Tools
- **Pencil/Brush** - Freehand drawing with various brush effects
- **Shapes** - Rectangles, circles, lines with customizable properties
- **Text** - Text objects with font customization
- **Stamps** - Emoji and custom image stamps
- **Sticky Notes** - Resizable note objects

#### Eraser System
- **Pixel Mode** - Erases drawn pixels directly
- **Object Mode** - Removes entire objects
- Optimized erasing with batching for performance

### Performance Optimizations

#### Progressive Loading
- `progressiveLoader.ts` - Loads stamps and emojis progressively
- `imagePreloader.ts` - Preloads frequently used images
- `sharedImageCache.ts` - Caches loaded images across components

#### Rendering Optimizations
- `brushCache.ts` - Caches brush patterns
- `pathPointsCache.ts` - Caches path calculations
- Viewport-based culling for off-screen objects

## Component Architecture

### Whiteboard Components

#### Core Layout
- **`Whiteboard.tsx`** - Main container orchestrating layout
- **`Canvas.tsx`** - Canvas rendering and interaction
- **`Toolbar.tsx`** - Tool selection interface
- **`Sidebar.tsx`** - Settings and properties panel

#### Tool Settings
- **`DynamicToolSettings.tsx`** - Adaptive settings based on active tool
- **`ShapeSettings.tsx`** - Shape-specific configurations
- **`EraserSettings.tsx`** - Eraser mode and size settings
- **`BackgroundSettings.tsx`** - Canvas background options

#### Property Panels
- **`TextPropertiesPanel.tsx`** - Text object editing
- **`StampPropertiesPanel.tsx`** - Stamp customization
- **`StickyNotePropertiesPanel.tsx`** - Sticky note editing

### Development Tools

#### Debug Components
- **`DevToolsOverlay.tsx`** - Development mode overlay
- **`MultiplayerStatePanel.tsx`** - Real-time multiplayer state debugging
- **`ActionHistoryPanel.tsx`** - Action tracking and replay
- **`StrokeTrackingPanel.tsx`** - Drawing performance analysis

#### Configuration
- **`devMode.ts`** - Debug mode toggles and logging utilities

## Key Features

### Drawing & Annotation
- Multiple brush types with pressure sensitivity simulation
- Shape tools with customizable properties
- Text annotations with font options
- Stamp system with emoji support (OpenMoji library)
- Sticky notes with auto-sizing

### Collaboration
- Real-time multiplayer editing
- User presence indicators
- Conflict-free state synchronization
- Shared viewport management

### Canvas Management
- Infinite canvas with smooth panning/zooming
- Grid and lined paper backgrounds
- Custom background images
- Boundary constraints for objects

### Productivity Features
- Undo/redo with user-specific history
- Object selection and manipulation
- Copy/paste functionality
- Bulk operations and grouping

## Development Workflow

### Running the Project
```bash
npm install
npm run dev
```

### Debug Configuration

The application includes several debug toggles in `src/config/devMode.ts`:

```typescript
export const DEV_MODE = false;          // Enable dev tools overlay
export const DEBUG_LOGGING = false;     // Console logging
export const BOUNDING_BOX_DEBUG = false; // Visual debug overlays
```

### Development Tools

When `DEV_MODE` is enabled, the application shows:
- Connection status indicators
- Real-time state debugging panels
- Action history tracking
- Performance monitoring tools
- Multiplayer synchronization status

### Adding New Tools

1. **Define tool in `toolsConfig.ts`**
2. **Create tool settings component** in `components/whiteboard/settings/`
3. **Add canvas interaction logic** in `hooks/canvas/`
4. **Update `DynamicToolSettings.tsx`** to include new tool
5. **Add tool-specific rendering** in canvas system

### Adding New Object Types

1. **Define type in `types/whiteboard.ts`**
2. **Update stores** to handle new object type
3. **Add rendering logic** in canvas components
4. **Create property panel** if needed
5. **Add serialization/deserialization** support

## Code Organization Principles

### State Management
- Store state in Zustand stores, not component state
- Use actions for state mutations
- Keep stores focused and single-responsibility

### Component Design
- Small, focused components with clear responsibilities
- Use composition over inheritance
- Leverage React hooks for reusable logic

### Performance
- Minimize re-renders with proper memoization
- Use progressive loading for large datasets
- Implement caching for expensive computations

### Type Safety
- Comprehensive TypeScript coverage
- Strict type checking enabled
- Interfaces for all data structures

## Testing & Quality

### Code Quality
- ESLint configuration for consistent code style
- TypeScript for compile-time error detection
- Component composition for maintainability

### Performance Monitoring
- Built-in performance tracking in dev tools
- Canvas rendering optimization metrics
- Memory usage monitoring for object lifecycle

---

## Contributing Guidelines

When working on this codebase:

1. **Follow the existing patterns** - Look at similar components/features for consistency
2. **Use the design system** - Leverage Tailwind semantic tokens from `index.css`
3. **Test multiplayer scenarios** - Changes should work in collaborative environments
4. **Consider performance** - Large numbers of objects should render smoothly
5. **Update this documentation** when adding new major features or systems

The codebase is designed to be modular and extensible. Most new features can be added by following the existing patterns for tools, objects, and components.