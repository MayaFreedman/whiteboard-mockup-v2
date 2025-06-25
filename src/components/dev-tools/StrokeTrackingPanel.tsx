
import React, { useMemo } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { historyManager } from '../../services/HistoryManager';
import { Badge } from '../ui/badge';

export const StrokeTrackingPanel: React.FC = () => {
  const { objects } = useWhiteboardStore();
  
  // Get action history from HistoryManager instead of store
  const globalHistory = historyManager.getHistorySnapshot().globalActionHistory;

  // Calculate stroke statistics
  const strokeStats = useMemo(() => {
    const pathObjects = Object.values(objects).filter(obj => obj.type === 'path');
    const drawingActions = globalHistory.filter(action => 
      action.type === 'ADD_OBJECT' && action.payload.object?.type === 'path'
    );

    // Color frequency analysis
    const colorFrequency: Record<string, number> = {};
    pathObjects.forEach(obj => {
      if (obj.stroke) {
        colorFrequency[obj.stroke] = (colorFrequency[obj.stroke] || 0) + 1;
      }
    });

    // Most used colors
    const sortedColors = Object.entries(colorFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    // Drawing session analysis
    const now = Date.now();
    const recentStrokes = drawingActions.filter(action => 
      now - action.timestamp < 5 * 60 * 1000 // Last 5 minutes
    );

    return {
      totalStrokes: pathObjects.length,
      totalDrawingActions: drawingActions.length,
      recentStrokes: recentStrokes.length,
      colorFrequency,
      mostUsedColors: sortedColors,
      averageStrokeWidth: pathObjects.length > 0 
        ? pathObjects.reduce((sum, obj) => sum + (obj.strokeWidth || 0), 0) / pathObjects.length 
        : 0
    };
  }, [objects, globalHistory]);

  const strokesByType = useMemo(() => {
    const pathObjects = Object.values(objects).filter(obj => obj.type === 'path');
    const byBrushType: Record<string, number> = {};
    
    pathObjects.forEach(obj => {
      const brushType = (obj as any).brushType || 'pencil';
      byBrushType[brushType] = (byBrushType[brushType] || 0) + 1;
    });
    
    return byBrushType;
  }, [objects]);

  return (
    <div className="space-y-4 text-xs">
      {/* Stroke Overview */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/50 p-2 rounded">
          <div className="font-medium">Total Strokes</div>
          <div className="text-lg font-bold">{strokeStats.totalStrokes}</div>
        </div>
        <div className="bg-muted/50 p-2 rounded">
          <div className="font-medium">Recent (5min)</div>
          <div className="text-lg font-bold">{strokeStats.recentStrokes}</div>
        </div>
      </div>

      {/* Stroke Statistics */}
      <div className="space-y-2">
        <div className="font-medium">Stroke Statistics</div>
        <div className="bg-muted/30 p-2 rounded space-y-1">
          <div>Total Drawing Actions: {strokeStats.totalDrawingActions}</div>
          <div>Average Stroke Width: {strokeStats.averageStrokeWidth.toFixed(1)}px</div>
          <div>Unique Colors Used: {Object.keys(strokeStats.colorFrequency).length}</div>
        </div>
      </div>

      {/* Brush Type Distribution */}
      {Object.keys(strokesByType).length > 0 && (
        <div className="space-y-2">
          <div className="font-medium">Brush Types</div>
          <div className="bg-muted/30 p-2 rounded space-y-1">
            {Object.entries(strokesByType).map(([brushType, count]) => (
              <div key={brushType} className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs py-0 capitalize">
                  {brushType}
                </Badge>
                <span>{count} strokes</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Most Used Colors */}
      {strokeStats.mostUsedColors.length > 0 && (
        <div className="space-y-2">
          <div className="font-medium">Most Used Colors</div>
          <div className="bg-muted/30 p-2 rounded space-y-2">
            {strokeStats.mostUsedColors.map(([color, count], index) => (
              <div key={color} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">#{index + 1}</span>
                  <span 
                    className="inline-block w-4 h-4 border rounded" 
                    style={{ backgroundColor: color }}
                  ></span>
                  <span className="text-xs font-mono">{color}</span>
                </div>
                <Badge variant="secondary" className="text-xs py-0">
                  {count}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Color Usage Chart */}
      {Object.keys(strokeStats.colorFrequency).length > 0 && (
        <div className="space-y-2">
          <div className="font-medium">Color Distribution</div>
          <div className="bg-muted/30 p-2 rounded">
            <div className="flex flex-wrap gap-1">
              {Object.entries(strokeStats.colorFrequency).map(([color, count]) => {
                const percentage = (count / strokeStats.totalStrokes) * 100;
                return (
                  <div 
                    key={color} 
                    className="flex-shrink-0"
                    title={`${color}: ${count} strokes (${percentage.toFixed(1)}%)`}
                  >
                    <div 
                      className="w-3 h-6 border rounded-sm"
                      style={{ 
                        backgroundColor: color,
                        opacity: Math.max(0.3, percentage / 100)
                      }}
                    ></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="space-y-2">
        <div className="font-medium">Performance</div>
        <div className="bg-muted/30 p-2 rounded space-y-1">
          <div>Actions in History: {globalHistory.length}</div>
          <div>Objects in Memory: {Object.keys(objects).length}</div>
          <div>Memory Usage: ~{((JSON.stringify(objects).length + JSON.stringify(globalHistory).length) / 1024).toFixed(1)}KB</div>
        </div>
      </div>

      {strokeStats.totalStrokes === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No strokes detected yet. Start drawing to see stroke analytics!
        </div>
      )}
    </div>
  );
};
