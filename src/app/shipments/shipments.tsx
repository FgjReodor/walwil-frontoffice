'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchShipments } from './actions/shipments';
import { ShipmentCard } from '@/components/shipment-card';
import { ShipmentCardSkeletonList } from '@/components/shipment-card-skeleton';
import { ShipmentFilters } from '@/components/shipment-filters';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { calculatePriority } from '@/lib/priority';
import type { Shipment, Priority, ShipmentFilters as Filters } from '@/types/shipment';

export function Shipments() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({});

  // Fetch shipments from API
  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['shipments'],
    queryFn: fetchShipments,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });

  const shipments = response?.success ? response.data : [];

  // Filter shipments
  const filteredShipments = shipments.filter((shipment) => {
    // Search filter - check BL number, vessel, VIN (from vehiclesMissingWeight), manufacturer
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesBl = shipment.blNumber?.toLowerCase().includes(searchLower);
      const matchesVessel = shipment.vesselVoyage?.toLowerCase().includes(searchLower);
      const matchesManufacturer = shipment.manufacturer?.toLowerCase().includes(searchLower);
      const matchesVin = shipment.vehiclesMissingWeight?.toLowerCase().includes(searchLower);
      const matchesDestination = (shipment.podCode || shipment.portOfDestination)?.toLowerCase().includes(searchLower);

      if (!matchesBl && !matchesVessel && !matchesManufacturer && !matchesVin && !matchesDestination) {
        return false;
      }
    }
    if (filters.manufacturer && shipment.manufacturer !== filters.manufacturer) {
      return false;
    }
    if (filters.priority && calculatePriority(shipment) !== filters.priority) {
      return false;
    }
    if (filters.departureFrom && (shipment.polCode || shipment.departureFrom) !== filters.departureFrom) {
      return false;
    }
    if (filters.hasMissingData !== undefined && shipment.hasMissingData !== filters.hasMissingData) {
      return false;
    }
    return true;
  });

  // Sort by priority (critical first, then medium, then ready)
  const priorityOrder: Record<Priority, number> = { critical: 0, medium: 1, ready: 2 };
  const sortedShipments = [...filteredShipments].sort((a, b) => {
    return priorityOrder[calculatePriority(a)] - priorityOrder[calculatePriority(b)];
  });

  // Get unique values for filters
  const manufacturers = [...new Set(shipments.map((s) => s.manufacturer))];
  const departures = [...new Set(shipments.map((s) => s.polCode || s.departureFrom).filter((d): d is string => Boolean(d)))];

  const activeTaskCount = shipments.filter((s) => s.hasMissingData).length;

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-8">
          {/* Header skeleton */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-40 bg-gray-200 rounded mt-2 animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 bg-gray-200 rounded animate-pulse" />
              <div className="h-9 w-28 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>

          {/* Filters skeleton */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="h-10 w-[220px] bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-[160px] bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-[150px] bg-gray-200 rounded animate-pulse" />
          </div>

          {/* Cards skeleton */}
          <ShipmentCardSkeletonList count={5} />
        </div>
      </div>
    );
  }

  // Error state
  if (isError || (response && !response.success)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-4 text-lg font-semibold text-red-800">Failed to load shipments</h2>
            <p className="mt-2 text-sm text-red-600">
              {response?.message || (error as Error)?.message || 'An unknown error occurred'}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => refetch()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
            <p className="text-sm text-gray-500">
              {activeTaskCount} active task{activeTaskCount !== 1 ? 's' : ''}
              {response?.count !== undefined && ` of ${response.count} total`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Filters */}
        <ShipmentFilters
          filters={filters}
          onFiltersChange={setFilters}
          manufacturers={manufacturers}
          departures={departures}
        />

        {/* Shipment Cards */}
        <div className="mt-6 space-y-4">
          {sortedShipments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
              <p className="text-gray-500">
                {shipments.length === 0
                  ? 'No shipments found'
                  : 'No shipments match your filters'}
              </p>
              {shipments.length > 0 && (
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setFilters({})}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            sortedShipments.map((shipment) => (
              <ShipmentCard
                key={shipment.id}
                shipment={shipment}
                isExpanded={expandedId === shipment.id}
                onToggleExpand={() => handleToggleExpand(shipment.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
