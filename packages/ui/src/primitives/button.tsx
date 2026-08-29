import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-body font-button whitespace-nowrap focus-visible:ring-2 focus-visible:ring-racing-red-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transition-colors duration-fast',
  {
    variants: {
      variant: {
        primary: 'bg-racing-red-600 text-white hover:bg-racing-red-700 active:bg-racing-red-800',
        secondary:
          'bg-white border border-neutral-200 text-neutral-900 hover:bg-neutral-50 hover:border-neutral-300 active:bg-neutral-100',
        ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200',
        destructive:
          'bg-white border border-destructive-200 text-destructive-600 hover:bg-destructive-50 active:bg-destructive-100',
      },
      size: {
        sm: 'h-8 px-3 text-body-sm',
        md: 'h-9 px-4',
        lg: 'h-10 px-5',
        icon: 'h-8 w-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };