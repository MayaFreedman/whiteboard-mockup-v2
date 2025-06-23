
import React from 'react';
import { Button } from '../../ui/button';
import { Upload } from 'lucide-react';

interface GridSelectorProps {
  label: string;
  items: Array<{ name: string; url: string; preview: string }>;
  selectedValue: string;
  onChange: (value: string) => void;
  showUpload?: boolean;
}

export const GridSelector: React.FC<GridSelectorProps> = ({
  label,
  items,
  selectedValue,
  onChange,
  showUpload = false
}) => {
  return (
    <div>
      <label className="text-sm font-medium mb-3 block">{label}</label>
      <div className="grid grid-cols-2 gap-3 mb-3">
        {items.map((item) => (
          <button
            key={item.name}
            className={`relative w-full h-20 rounded border-2 transition-colors overflow-hidden group ${
              selectedValue === item.url
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-border hover:border-primary'
            }`}
            onClick={() => onChange(item.url)}
            title={item.name}
          >
            <img 
              src={item.preview} 
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
      {showUpload && (
        <Button variant="outline" size="sm" className="w-full gap-2">
          <Upload className="w-4 h-4" />
          Upload Custom Sticker
        </Button>
      )}
    </div>
  );
};
