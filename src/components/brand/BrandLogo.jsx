import React from 'react';
import { cn } from '@/lib/utils';

export default function BrandLogo({ className = '', symbolClassName = '', nameClassName = '' }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-2', className)}>
      <img
        src="/brand/vitalstep-symbol.png"
        alt=""
        aria-hidden="true"
        width="40"
        height="40"
        className={cn('h-10 w-10 shrink-0 object-contain', symbolClassName)}
      />
      <span className={cn('font-heading text-lg font-bold tracking-tight text-foreground', nameClassName)}>
        VitalStep
      </span>
    </span>
  );
}
