import { Shipment, Priority, ShipmentStatus } from '@/types/shipment';

/**
 * Calculate priority based on shipment data
 * - Critical: Has missing data AND received more than 24 hours ago
 * - Medium: Has missing data but received within 24 hours
 * - Ready: No missing data
 */
export function calculatePriority(shipment: Shipment): Priority {
  if (!shipment.hasMissingData) {
    return 'ready';
  }

  const receivedDate = new Date(shipment.receivedDate);
  const now = new Date();
  const hoursAgo = (now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60);

  if (hoursAgo > 24) {
    return 'critical';
  }

  return 'medium';
}

/**
 * Derive display status from shipment data
 */
export function deriveStatus(shipment: Shipment): ShipmentStatus {
  // If reply was received, check if still has missing data
  if (shipment.replyReceived && !shipment.hasMissingData) {
    return 'completed';
  }

  // If has missing data = awaiting customer response
  if (shipment.hasMissingData) {
    // If critical priority, also mark as urgent
    if (calculatePriority(shipment) === 'critical') {
      return 'urgent';
    }
    return 'awaiting_customer';
  }

  // Default to the status from API or 'new'
  const status = shipment.status?.toLowerCase();
  if (status === 'processing' || status === 'completed') {
    return status as ShipmentStatus;
  }

  return 'new';
}

/**
 * Get priority badge styling
 */
export function getPriorityStyles(priority: Priority) {
  switch (priority) {
    case 'critical':
      return {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-500',
        cardBorder: 'border-l-red-500',
        icon: 'text-red-500',
      };
    case 'medium':
      return {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        border: 'border-amber-500',
        cardBorder: 'border-l-amber-500',
        icon: 'text-amber-500',
      };
    case 'ready':
      return {
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        border: 'border-emerald-500',
        cardBorder: 'border-l-emerald-500',
        icon: 'text-emerald-500',
      };
  }
}

/**
 * Get status badge styling
 */
export function getStatusStyles(status: ShipmentStatus) {
  switch (status) {
    case 'urgent':
      return {
        bg: 'bg-transparent',
        text: 'text-orange-500',
        border: 'border border-orange-500',
      };
    case 'awaiting_customer':
      return {
        bg: 'bg-orange-200',
        text: 'text-orange-800',
        border: 'border-transparent',
      };
    case 'completed':
      return {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-transparent',
      };
    case 'processing':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-transparent',
      };
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-transparent',
      };
  }
}

/**
 * Format priority for display
 */
export function formatPriority(priority: Priority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

/**
 * Format status for display
 */
export function formatStatus(status: ShipmentStatus): string {
  switch (status) {
    case 'awaiting_customer':
      return 'Awaiting Customer';
    case 'urgent':
      return 'Urgent';
    case 'completed':
      return 'Completed';
    case 'processing':
      return 'Processing';
    default:
      return 'New';
  }
}

/**
 * Parse missing fields string into structured issues
 */
export function parseMissingFields(missingFields?: string): string[] {
  if (!missingFields) return [];
  return missingFields.split(',').map(field => field.trim()).filter(Boolean);
}

/**
 * Parse vehicles missing weight into VIN list
 */
export function parseVehiclesMissingWeight(vehiclesMissingWeight?: string): string[] {
  if (!vehiclesMissingWeight) return [];
  return vehiclesMissingWeight.split(',').map(vin => vin.trim()).filter(Boolean);
}

/**
 * Parse ambiguous fields string into structured entries
 * Format: "field:reason, field2:reason2" or just "field, field2"
 */
export function parseAmbiguousFields(ambiguousFields?: string): { field: string; reason: string }[] {
  if (!ambiguousFields) return [];
  return ambiguousFields.split(',').map(entry => {
    const trimmed = entry.trim();
    if (!trimmed) return null;

    // Check if entry has a colon separator for field:reason format
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      return {
        field: trimmed.substring(0, colonIndex).trim(),
        reason: trimmed.substring(colonIndex + 1).trim(),
      };
    }

    // No colon - just the field name
    return {
      field: trimmed,
      reason: 'Requires verification',
    };
  }).filter((entry): entry is { field: string; reason: string } => entry !== null);
}
