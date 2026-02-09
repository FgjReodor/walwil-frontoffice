import { cn } from '@/lib/utils';
import { ShipmentStatus } from '@/types/shipment';
import { getStatusStyles, formatStatus } from '@/lib/priority';

interface StatusBadgeProps {
  status: ShipmentStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles = getStatusStyles(status);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles.bg,
        styles.text,
        styles.border,
        className
      )}
    >
      {formatStatus(status)}
    </span>
  );
}
