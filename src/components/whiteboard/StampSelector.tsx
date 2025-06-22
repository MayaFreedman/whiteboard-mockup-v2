
import React, { useEffect } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { preloadAllStamps } from '../../utils/stampUtils';

/**
 * Stamp selector component for choosing stamp tools
 * Provides a grid of available stamps with visual previews
 */
export const StampSelector: React.FC = () => {
  const { 
    getAvailableStamps, 
    selectStamp, 
    getSelectedStamp,
    toolSettings 
  } = useToolStore();
  
  const availableStamps = getAvailableStamps();
  const selectedStamp = getSelectedStamp();

  // Preload all stamps when component mounts
  useEffect(() => {
    preloadAllStamps().catch(error => {
      console.warn('Failed to preload stamps:', error);
    });
  }, []);

  const handleStampSelect = (stampId: string) => {
    console.log('🖼️ User selected stamp:', stampId);
    selectStamp(stampId);
  };

  return (
    <div className="p-3">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Stamps</h3>
      
      <div className="grid grid-cols-2 gap-2">
        {availableStamps.map((stamp) => {
          const isSelected = selectedStamp?.id === stamp.id;
          
          return (
            <button
              key={stamp.id}
              onClick={() => handleStampSelect(stamp.id)}
              className={`
                relative p-2 rounded-lg border-2 transition-all duration-200 hover:scale-105 group
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
              `}
              title={`${stamp.name} stamp`}
            >
              {/* Stamp preview */}
              <div className="flex flex-col items-center justify-center space-y-1">
                <div className="w-8 h-8 flex items-center justify-center">
                  <img 
                    src={stamp.icon} 
                    alt={stamp.name}
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                </div>
                <span className="text-xs text-gray-600 group-hover:text-gray-800">
                  {stamp.name}
                </span>
              </div>
              
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
              )}
            </button>
          );
        })}
      </div>
      
      {selectedStamp && (
        <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-xs text-blue-700">
            <span className="font-medium">Selected:</span> {selectedStamp.name}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            Click on the canvas to place this stamp
          </div>
        </div>
      )}
    </div>
  );
};
