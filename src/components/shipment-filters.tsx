'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ShipmentFilters as Filters, Priority } from '@/types/shipment';

interface ShipmentFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  manufacturers: string[];
  departures: string[];
}

export function ShipmentFilters({
  filters,
  onFiltersChange,
  manufacturers,
  departures,
}: ShipmentFiltersProps) {
  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K] | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div className="flex flex-wrap gap-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search BL, VIN, vessel..."
          value={filters.search || ''}
          onChange={(e) => updateFilter('search', e.target.value || undefined)}
          className="pl-9 pr-8 w-[220px] bg-white"
        />
        {filters.search && (
          <button
            onClick={() => updateFilter('search', undefined)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Manufacturer / Customer Filter */}
      <Select
        value={filters.manufacturer || 'all'}
        onValueChange={(value) => updateFilter('manufacturer', value === 'all' ? undefined : value)}
      >
        <SelectTrigger className="w-[160px] bg-white">
          <SelectValue placeholder="All Customers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Customers</SelectItem>
          {manufacturers.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority Filter */}
      <Select
        value={filters.priority || 'all'}
        onValueChange={(value) =>
          updateFilter('priority', value === 'all' ? undefined : (value as Priority))
        }
      >
        <SelectTrigger className="w-[150px] bg-white">
          <SelectValue placeholder="All Priorities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="ready">Ready</SelectItem>
        </SelectContent>
      </Select>

      {/* Departure Filter */}
      <Select
        value={filters.departureFrom || 'all'}
        onValueChange={(value) => updateFilter('departureFrom', value === 'all' ? undefined : value)}
      >
        <SelectTrigger className="w-[160px] bg-white">
          <SelectValue placeholder="All Departures" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departures</SelectItem>
          {departures.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter (Active/All) */}
      <Select
        value={filters.hasMissingData === undefined ? 'all' : filters.hasMissingData ? 'active' : 'ready'}
        onValueChange={(value) => {
          if (value === 'all') {
            updateFilter('hasMissingData', undefined);
          } else if (value === 'active') {
            updateFilter('hasMissingData', true);
          } else {
            updateFilter('hasMissingData', false);
          }
        }}
      >
        <SelectTrigger className="w-[140px] bg-white">
          <SelectValue placeholder="Active Tasks" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Tasks</SelectItem>
          <SelectItem value="active">Active Tasks</SelectItem>
          <SelectItem value="ready">Ready Tasks</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
