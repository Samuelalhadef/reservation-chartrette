import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const variants: Record<Variant, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  neutral: 'badge-neutral',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export default function Badge({ variant = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span className={cn('badge', variants[variant], className)} {...props}>
      {children}
    </span>
  );
}
