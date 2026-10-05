import * as React from 'react';
import { cn } from '../lib/cn';

export interface SegmentedOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onValueChange: (value: string) => void;
  'aria-label': string;
  className?: string;
}

export function SegmentedControl({ options, value, onValueChange, className, ...props }: SegmentedControlProps) {
  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % options.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + options.length) % options.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = options.length - 1;
    if (nextIndex == null) return;
    event.preventDefault();
    const next = options[nextIndex];
    if (next) onValueChange(next.value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={props['aria-label']}
      className={cn('inline-flex rounded-md border border-neutral-200 bg-white p-0.5', className)}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              'rounded px-3 py-1 text-body-sm font-medium transition-colors duration-fast focus-visible:outline-none',
              selected ? 'bg-racing-red-600 text-white' : 'text-neutral-600 hover:bg-neutral-50',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
