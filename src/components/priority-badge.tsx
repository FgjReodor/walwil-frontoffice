import { cn } from '@/lib/utils';
import { Priority } from '@/types/shipment';
import { getPriorityStyles, formatPriority } from '@/lib/priority';
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const styles = getPriorityStyles(priority);

  const Icon = {
    critical: AlertCircle,
    medium: AlertTriangle,
    ready: CheckCircle,
  }[priority];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
        styles.bg,
        styles.text,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {formatPriority(priority)}
    </span>
  );
}
