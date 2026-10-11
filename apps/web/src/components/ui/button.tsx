import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-500',
        secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
        ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-10 px-4',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export function Button({
  className,
  variant,
  size,
  type = 'button',
  ...props
}: ComponentProps<'button'> & VariantProps<typeof buttonVariants>) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
