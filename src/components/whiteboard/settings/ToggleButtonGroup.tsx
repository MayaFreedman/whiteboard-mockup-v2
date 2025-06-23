
import React from 'react';
import { Button } from '../../ui/button';
import { Bold, Italic, Underline } from 'lucide-react';

interface ToggleButtonGroupProps {
  label: string;
  items: Array<{ value: string; label: string; icon: string }>;
  values: Record<string, boolean>;
  onChange: (key: string, value: boolean) => void;
}

const iconMap = {
  Bold,
  Italic,
  Underline
};

export const ToggleButtonGroup: React.FC<ToggleButtonGroupProps> = ({
  label,
  items,
  values,
  onChange
}) => {
  return (
    <div>
      <label className="text-sm font-medium mb-2 block">{label}</label>
      <div className="flex gap-1">
        {items.map((item) => {
          const IconComponent = iconMap[item.icon as keyof typeof iconMap];
          return (
            <Button
              key={item.value}
              variant={values[item.value] ? "default" : "outline"}
              size="sm"
              onClick={() => onChange(item.value, !values[item.value])}
              className="p-2"
              title={item.label}
            >
              {IconComponent && <IconComponent className="w-4 h-4" />}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
