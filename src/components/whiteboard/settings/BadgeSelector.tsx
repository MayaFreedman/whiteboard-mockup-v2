
import React from 'react';
import { Badge } from '../../ui/badge';

interface BadgeSelectorProps {
  label: string;
  items: Array<{ value: string; label: string }>;
  selectedValue: string;
  onChange: (value: string) => void;
}

export const BadgeSelector: React.FC<BadgeSelectorProps> = ({
  label,
  items,
  selectedValue,
  onChange
}) => {
  return (
    <div>
      <label className="text-sm font-medium mb-2 block">{label}</label>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <Badge
            key={item.value}
            variant={selectedValue === item.value ? 'default' : 'outline'}
            className="cursor-pointer capitalize text-xs px-2 py-1"
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </Badge>
        ))}
      </div>
    </div>
  );
};
