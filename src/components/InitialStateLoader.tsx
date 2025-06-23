
import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface InitialStateLoaderProps {
  onReload?: () => void;
  showReloadButton?: boolean;
}

export const InitialStateLoader: React.FC<InitialStateLoaderProps> = ({ 
  onReload,
  showReloadButton = false 
}) => {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center">
      <div className="bg-card border rounded-lg p-6 shadow-lg max-w-sm mx-4 text-center">
        {!showReloadButton ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">Loading whiteboard...</h3>
            <p className="text-sm text-muted-foreground">
              Fetching the current state from other users
            </p>
          </>
        ) : (
          <>
            <RefreshCw className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Unable to load state</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try reloading the page to sync with other users
            </p>
            <Button onClick={onReload} variant="default" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
