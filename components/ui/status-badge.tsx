import { cn } from '@/lib/utils';

type StatusBadgeProps = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Define status colors
  const statusConfig: Record<string, { bg: string; text: string }> = {
    // Supplier statuses
    PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    APPROVED: { bg: 'bg-green-100', text: 'text-green-800' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-800' },
    INACTIVE: { bg: 'bg-gray-100', text: 'text-gray-800' },
    
    // Contract statuses
    DRAFT: { bg: 'bg-gray-100', text: 'text-gray-800' },
    PENDING_APPROVAL: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    ACTIVE: { bg: 'bg-green-100', text: 'text-green-800' },
    EXPIRED: { bg: 'bg-red-100', text: 'text-red-800' },
    TERMINATED: { bg: 'bg-red-100', text: 'text-red-800' },
    
    // Payment statuses
    PAID: { bg: 'bg-green-100', text: 'text-green-800' },
  };

  const { bg, text } = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };

  // Format status for display
  const formattedStatus = status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      bg, 
      text,
      className
    )}>
      {formattedStatus}
    </span>
  );
}