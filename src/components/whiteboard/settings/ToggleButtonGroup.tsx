
import React from 'react';
import { Button } from '../../ui/button';
import { SimpleTooltip } from '../../ui/simple-tooltip';
import { Bold, Italic, Underline } from 'lucide-react';

interface ToggleButtonGroupProps {
  label: string;
  items: Array<{ value: string; label: string; icon?: string }>;
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
          const IconComponent = item.icon ? iconMap[item.icon as keyof typeof iconMap] : null;
          return (
            <SimpleTooltip key={item.value} content={item.label}>
              <Button
                variant={values[item.value] ? "default" : "outline"}
                size="sm"
                onClick={() => onChange(item.value, !values[item.value])}
                className="p-2"
              >
                {IconComponent ? <IconComponent className="w-4 h-4" /> : <span>{item.label}</span>}
              </Button>
            </SimpleTooltip>
          );
        })}
      </div>
    </div>
  );
};
