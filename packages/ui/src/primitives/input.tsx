import * as React from 'react';
import { cn } from '../lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, error, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border bg-white px-3 text-body text-neutral-900 placeholder:text-neutral-400',
        'file:border-0 file:bg-transparent file:text-body-sm file:font-medium',
        'hover:border-neutral-300',
        'focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20',
        error && 'border-destructive-500 ring-2 ring-destructive-500/20',
        'disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400',
        'transition-colors duration-fast',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };