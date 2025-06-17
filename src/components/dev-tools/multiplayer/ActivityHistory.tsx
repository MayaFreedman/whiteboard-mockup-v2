
import React from 'react';
import { Badge } from '../../ui/badge';
import { ScrollArea } from '../../ui/scroll-area';
import { Activity } from 'lucide-react';

interface ActivityHistoryProps {
  recentActions: Array<{
    type: string;
    timestamp: number;
    id: string;
    payload: any;
  }>;
  recentToolChanges: Array<{
    timestamp: number;
    tool: string;
  }>;
}

export const ActivityHistory: React.FC<ActivityHistoryProps> = ({
  recentActions,
  recentToolChanges
}) => {
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const combinedActivity = [
    ...recentActions,
    ...recentToolChanges.map(change => ({
      type: 'TOOL_CHANGE',
      timestamp: change.timestamp,
      id: `tool-${change.timestamp}`,
      payload: { tool: change.tool }
    }))
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 font-medium">
        <Activity className="w-4 h-4" />
        Recent Activity (30s)
      </div>
      <ScrollArea className="h-32">
        <div className="space-y-1">
          {combinedActivity.map((item) => (
            <div key={item.id} className="text-xs p-1 bg-muted/20 rounded">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs py-0">
                  {item.type}
                </Badge>
                <span className="text-muted-foreground">
                  {formatTimestamp(item.timestamp)}
                </span>
              </div>
              {item.type === 'TOOL_CHANGE' && 'tool' in item.payload && (
                <div className="text-muted-foreground">
                  Tool: {item.payload.tool}
                </div>
              )}
              {item.type === 'ADD_OBJECT' && 'object' in item.payload && item.payload.object && (
                <div className="text-muted-foreground">
                  Added: {item.payload.object.type} at ({item.payload.object.x}, {item.payload.object.y})
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
