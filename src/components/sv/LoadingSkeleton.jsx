import React from 'react';
import { cn } from '@/lib/utils';

export function SkeletonBlock({ className }) {
  return <div className={cn('animate-pulse rounded-lg bg-secondary/70', className)} />;
}

export function PanelSkeleton({ rows = 3 }) {
  return (
    <div className="sv-panel space-y-3 p-4">
      <SkeletonBlock className="h-3 w-24" />
      <SkeletonBlock className="h-8 w-36" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} className="h-3 w-full opacity-70" />
      ))}
    </div>
  );
}

export function MetricGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <PanelSkeleton key={i} rows={1} />
      ))}
    </div>
  );
}