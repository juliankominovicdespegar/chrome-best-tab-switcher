import * as React from 'react';
import { cn } from '@src/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'destructive';
  size?: 'default' | 'icon' | 'sm';
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  destructive: 'text-destructive hover:bg-destructive/10',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  default: 'h-9 px-4 py-2',
  sm: 'h-8 rounded-md px-3 text-xs',
  icon: 'h-8 w-8',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
