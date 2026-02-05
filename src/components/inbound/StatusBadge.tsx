import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CallStatus } from '@/lib/types'

interface StatusBadgeProps {
  status: CallStatus
  className?: string
}

const statusConfig: Record<CallStatus, { label: string; variant: 'destructive' | 'secondary' | 'default'; className: string }> = {
  offen: {
    label: 'Offen',
    variant: 'destructive',
    className: 'bg-red-500 hover:bg-red-600'
  },
  bearbeitet: {
    label: 'In Bearbeitung',
    variant: 'secondary',
    className: 'bg-yellow-500 hover:bg-yellow-600 text-black'
  },
  erledigt: {
    label: 'Erledigt',
    variant: 'default',
    className: 'bg-green-500 hover:bg-green-600'
  }
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
