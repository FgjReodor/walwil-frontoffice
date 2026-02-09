'use client';

import { Card } from '@/components/ui/card';

export function ShipmentCardSkeleton() {
  return (
    <Card className="overflow-hidden border-l-4 border-l-gray-200 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          {/* Priority badge skeleton */}
          <div className="h-6 w-16 bg-gray-200 rounded-full" />
          <div className="flex items-center gap-2">
            {/* Manufacturer */}
            <div className="h-5 w-24 bg-gray-200 rounded" />
            <span className="text-gray-300">•</span>
            {/* Vessel/BL */}
            <div className="h-5 w-32 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* View SI button skeleton */}
          <div className="h-8 w-20 bg-gray-200 rounded" />
          {/* Chevron */}
          <div className="h-5 w-5 bg-gray-200 rounded" />
        </div>
      </div>

      {/* Issue Summary */}
      <div className="border-t px-4 py-2 bg-gray-50">
        <div className="h-4 w-64 bg-gray-200 rounded" />
      </div>
    </Card>
  );
}

export function ShipmentCardSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <ShipmentCardSkeleton key={i} />
      ))}
    </div>
  );
}
