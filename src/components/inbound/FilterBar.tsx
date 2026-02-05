'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { CalendarIcon, X } from 'lucide-react'
import type { FilterState, Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

interface FilterBarProps {
  filter: FilterState
  profiles: Profile[]
  onTimeRangeChange: (range: FilterState['timeRange'], from?: string, to?: string) => void
  onAssignedToChange: (userId: string | null) => void
  onReset: () => void
}

export function FilterBar({
  filter,
  profiles,
  onTimeRangeChange,
  onAssignedToChange,
  onReset
}: FilterBarProps) {
  const hasActiveFilters =
    filter.status !== 'all' ||
    filter.assignedTo !== null ||
    filter.timeRange !== 'all'

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Mitarbeiter-Filter */}
      <Select
        value={filter.assignedTo || 'all'}
        onValueChange={(value) => onAssignedToChange(value === 'all' ? null : value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Mitarbeiter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Mitarbeiter</SelectItem>
          {profiles.map((profile) => (
            <SelectItem key={profile.id} value={profile.id}>
              {profile.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Zeitraum-Filter */}
      <Select
        value={filter.timeRange}
        onValueChange={(value) => onTimeRangeChange(value as FilterState['timeRange'])}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Zeitraum" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Zeit</SelectItem>
          <SelectItem value="today">Heute</SelectItem>
          <SelectItem value="yesterday">Gestern</SelectItem>
          <SelectItem value="week">Letzte 7 Tage</SelectItem>
          <SelectItem value="custom">Benutzerdefiniert</SelectItem>
        </SelectContent>
      </Select>

      {/* Custom Date Picker */}
      {filter.timeRange === 'custom' && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[140px] justify-start text-left font-normal',
                  !filter.dateFrom && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filter.dateFrom
                  ? format(new Date(filter.dateFrom), 'dd.MM.yyyy', { locale: de })
                  : 'Von'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filter.dateFrom ? new Date(filter.dateFrom) : undefined}
                onSelect={(date) =>
                  onTimeRangeChange('custom', date?.toISOString(), filter.dateTo || undefined)
                }
                locale={de}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[140px] justify-start text-left font-normal',
                  !filter.dateTo && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filter.dateTo
                  ? format(new Date(filter.dateTo), 'dd.MM.yyyy', { locale: de })
                  : 'Bis'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filter.dateTo ? new Date(filter.dateTo) : undefined}
                onSelect={(date) =>
                  onTimeRangeChange('custom', filter.dateFrom || undefined, date?.toISOString())
                }
                locale={de}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </>
      )}

      {/* Reset Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-muted-foreground"
        >
          <X className="mr-1 h-4 w-4" />
          Filter zurücksetzen
        </Button>
      )}
    </div>
  )
}
