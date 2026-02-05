'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { InboundStats, CallStatus } from '@/lib/types'
import {
  Phone,
  AlertCircle,
  Clock,
  CheckCircle2,
  UserCircle
} from 'lucide-react'
import { LucideIcon } from 'lucide-react'

interface StatsCardsProps {
  stats: InboundStats
  activeFilter: CallStatus | 'all'
  onFilterClick: (status: CallStatus | 'all') => void
  showAssignedToMe?: boolean
}

interface CardConfig {
  key: string
  filterKey: CallStatus | 'all'
  label: string
  value: number
  icon: LucideIcon
  color: string
  bgColor: string
  borderColor: string
  pulse?: boolean
}

export function StatsCards({
  stats,
  activeFilter,
  onFilterClick,
  showAssignedToMe = true
}: StatsCardsProps) {
  const cards: CardConfig[] = [
    {
      key: 'all',
      filterKey: 'all',
      label: 'Gesamt',
      value: stats.total,
      icon: Phone,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500'
    },
    {
      key: 'offen',
      filterKey: 'offen',
      label: 'Offen',
      value: stats.offen,
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500',
      pulse: stats.offen > 0
    },
    {
      key: 'bearbeitet',
      filterKey: 'bearbeitet',
      label: 'In Bearbeitung',
      value: stats.bearbeitet,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500'
    },
    {
      key: 'erledigt',
      filterKey: 'erledigt',
      label: 'Erledigt',
      value: stats.erledigt,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500'
    }
  ]

  // "Mir zugewiesen" Karte hinzufügen wenn gewünscht
  if (showAssignedToMe) {
    cards.push({
      key: 'assignedToMe',
      filterKey: 'all',
      label: 'Mir zugewiesen',
      value: stats.assignedToMe,
      icon: UserCircle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500'
    })
  }

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const isActive = activeFilter === card.filterKey && card.key !== 'assignedToMe'
        const Icon = card.icon

        return (
          <Card
            key={card.key}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              isActive && `border-2 ${card.borderColor}`
            )}
            onClick={() => onFilterClick(card.filterKey)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <div className={cn('p-2 rounded-full', card.bgColor)}>
                <Icon className={cn('h-4 w-4', card.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={cn(
                'text-2xl font-bold',
                card.color,
                card.pulse && 'animate-pulse'
              )}>
                {card.value}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
