import * as React from 'react';
import { cn } from '@/lib/cn';

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('mb-1.5 block text-body-sm font-medium text-neutral-700 cursor-pointer', className)}
      {...props}
    />
  ),
);
Label.displayName = 'Label';

export { Label };