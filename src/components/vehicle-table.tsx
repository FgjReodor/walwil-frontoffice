'use client';

import { useState } from 'react';
import { Vehicle } from '@/types/shipment';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const COLLAPSED_LIMIT = 5;
const PAGE_SIZE = 50;

/** Detect and fix UTF-8 mojibake (e.g. "CoupÃ©" → "Coupé") */
function fixMojibake(str: string): string {
  try {
    const bytes = new Uint8Array([...str].map(c => c.charCodeAt(0)));
    const decoded = new TextDecoder('utf-8').decode(bytes);
    // Only use decoded version if it's shorter (mojibake expands chars)
    return decoded.length < str.length ? decoded : str;
  } catch {
    return str;
  }
}

interface VehicleTableProps {
  vehicles: Vehicle[];
  isEditMode?: boolean;
  onVehiclesChange?: (vehicles: Vehicle[]) => void;
}

export function VehicleTable({ vehicles, isEditMode, onVehiclesChange }: VehicleTableProps) {
  const vehiclesWithIssues = vehicles.filter(v => !v.weightKg);
  const isCollapsible = vehicles.length > COLLAPSED_LIMIT;
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // In edit mode, always show all. Otherwise show first 5 when collapsed.
  const displayVehicles = isEditMode
    ? vehicles
    : isExpanded
      ? vehicles.slice(0, visibleCount)
      : vehicles.slice(0, COLLAPSED_LIMIT);

  const handleVehicleChange = (index: number, field: keyof Vehicle, value: string | number | null) => {
    if (!onVehiclesChange) return;
    const updated = [...vehicles];
    updated[index] = { ...updated[index], [field]: value };
    onVehiclesChange(updated);
  };

  const handleShowMore = () => {
    const next = visibleCount + PAGE_SIZE;
    setVisibleCount(Math.min(next, vehicles.length));
  };

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div
        className={`bg-gray-50 px-4 py-2 border-b border-gray-200 ${isCollapsible && !isEditMode ? 'cursor-pointer hover:bg-gray-100' : ''}`}
        onClick={isCollapsible && !isEditMode ? () => {
          setIsExpanded(!isExpanded);
          if (!isExpanded) setVisibleCount(PAGE_SIZE);
        } : undefined}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            Vehicles ({vehicles.length})
            {vehiclesWithIssues.length > 0 && (
              <span className="ml-2 text-orange-600">
                &bull; {vehiclesWithIssues.length} missing weight
              </span>
            )}
          </h3>
          {isCollapsible && !isEditMode && (
            <div className={`flex items-center gap-2 text-sm font-medium ${isExpanded ? 'text-gray-500' : 'text-blue-600'}`}>
              <span>{isExpanded ? 'Collapse' : `Show all ${vehicles.length} vehicles`}</span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2 font-medium">VIN</th>
              <th className="text-left px-4 py-2 font-medium">Model</th>
              <th className="text-right px-4 py-2 font-medium">Weight (KG)</th>
              <th className="text-right px-4 py-2 font-medium">CBM</th>
              <th className="text-left px-4 py-2 font-medium">HS Code</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayVehicles.map((vehicle, index) => (
              <tr
                key={vehicle.id}
                className={!vehicle.weightKg ? 'bg-orange-50' : 'hover:bg-gray-50'}
              >
                <td className="px-4 py-2 font-mono text-xs">
                  {vehicle.vin}
                  {!vehicle.weightKg && !isEditMode && (
                    <AlertCircle className="inline ml-2 h-4 w-4 text-orange-500" />
                  )}
                </td>
                <td className="px-4 py-2 text-gray-700">
                  {isEditMode ? (
                    <Input
                      value={vehicle.model || ''}
                      onChange={(e) => handleVehicleChange(index, 'model', e.target.value)}
                      className="h-8 text-sm"
                    />
                  ) : (
                    fixMojibake(vehicle.model) || '-'
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {isEditMode ? (
                    <Input
                      type="number"
                      value={vehicle.weightKg ?? ''}
                      onChange={(e) => handleVehicleChange(index, 'weightKg', e.target.value ? Number(e.target.value) : null)}
                      className="h-8 text-sm text-right w-24 ml-auto"
                    />
                  ) : vehicle.weightKg ? (
                    <span className="text-gray-900">{vehicle.weightKg}</span>
                  ) : (
                    <span className="text-orange-600 font-medium">Missing</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {isEditMode ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={vehicle.cbm ?? ''}
                      onChange={(e) => handleVehicleChange(index, 'cbm', e.target.value ? Number(e.target.value) : 0)}
                      className="h-8 text-sm text-right w-20 ml-auto"
                    />
                  ) : (
                    <span className="text-gray-700">
                      {vehicle.cbm
                        ? (vehicle.cbm > 100 ? vehicle.cbm / 1000 : vehicle.cbm).toFixed(3)
                        : '-'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-gray-700">
                  {isEditMode ? (
                    <Input
                      value={vehicle.hsCode || ''}
                      onChange={(e) => handleVehicleChange(index, 'hsCode', e.target.value)}
                      className="h-8 text-sm w-28"
                      placeholder="e.g. 8703.23"
                    />
                  ) : (
                    vehicle.hsCode || '-'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination for very large expanded lists */}
        {isExpanded && !isEditMode && visibleCount < vehicles.length && (
          <div className="flex items-center justify-center gap-3 py-3 border-t border-gray-100 bg-gray-50">
            <Button variant="outline" size="sm" onClick={handleShowMore}>
              Show next {Math.min(PAGE_SIZE, vehicles.length - visibleCount)}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500"
              onClick={() => setVisibleCount(vehicles.length)}
            >
              Show all {vehicles.length}
            </Button>
            <span className="text-xs text-gray-400">
              Showing {visibleCount} of {vehicles.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
