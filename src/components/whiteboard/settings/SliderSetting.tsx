
import React from 'react';
import { Slider } from '../../ui/slider';

interface SliderSettingProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  valueFormatter?: (value: number) => string;
  showValue?: boolean;
}

export const SliderSetting: React.FC<SliderSettingProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  valueFormatter,
  showValue = true
}) => {
  const displayValue = showValue 
    ? (valueFormatter ? valueFormatter(value) : value.toString())
    : '';

  return (
    <div>
      <label className="text-sm font-medium mb-2 block">
        {label}{showValue && `: ${displayValue}`}
      </label>
      <Slider
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
};
