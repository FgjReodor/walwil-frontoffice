'use client';

import { Vehicle } from '@/types/shipment';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface VehicleTableProps {
  vehicles: Vehicle[];
  isEditMode?: boolean;
  onVehiclesChange?: (vehicles: Vehicle[]) => void;
}

export function VehicleTable({ vehicles, isEditMode, onVehiclesChange }: VehicleTableProps) {
  const vehiclesWithIssues = vehicles.filter(v => !v.weightKg);

  const handleVehicleChange = (index: number, field: keyof Vehicle, value: string | number | null) => {
    if (!onVehiclesChange) return;
    const updated = [...vehicles];
    updated[index] = { ...updated[index], [field]: value };
    onVehiclesChange(updated);
  };

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700">
          Vehicles ({vehicles.length})
          {vehiclesWithIssues.length > 0 && (
            <span className="ml-2 text-orange-600">
              • {vehiclesWithIssues.length} missing weight
            </span>
          )}
        </h3>
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
            {vehicles.map((vehicle, index) => (
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
                    vehicle.model || '-'
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
                    <span className="text-gray-900">{vehicle.weightKg.toLocaleString()}</span>
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
                    <span className="text-gray-700">{vehicle.cbm?.toFixed(2) || '-'}</span>
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
      </div>
    </div>
  );
}
