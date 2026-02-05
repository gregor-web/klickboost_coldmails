'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from './StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPhoneNumber, formatRelativeTime, formatDuration } from '@/lib/utils'
import type { InboundCallWithDetails, CallStatus, Profile } from '@/lib/types'
import {
  MoreHorizontal,
  Clock,
  CheckCircle2,
  Eye,
  Voicemail,
  PhoneForwarded,
  User
} from 'lucide-react'

interface CallsTableProps {
  calls: InboundCallWithDetails[]
  loading: boolean
  profiles: Profile[]
  onStatusChange: (id: string, status: CallStatus) => void
  onAssignmentChange: (id: string, assignedTo: string | null) => void
  onViewDetails: (call: InboundCallWithDetails) => void
}

export function CallsTable({
  calls,
  loading,
  profiles,
  onStatusChange,
  onAssignmentChange,
  onViewDetails
}: CallsTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (calls.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Voicemail className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Keine Anrufe gefunden</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Anrufer</TableHead>
            <TableHead>Bewerber/Kunde</TableHead>
            <TableHead>Zeitpunkt</TableHead>
            <TableHead>Art</TableHead>
            <TableHead>Zugewiesen</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calls.map((call) => (
            <TableRow key={call.id}>
              {/* Anrufer */}
              <TableCell>
                <div>
                  <div className="font-medium">
                    {formatPhoneNumber(call.caller_phone)}
                  </div>
                  {call.call_duration > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {formatDuration(call.call_duration)}
                    </div>
                  )}
                </div>
              </TableCell>

              {/* Bewerber/Kunde */}
              <TableCell>
                {call.applicants ? (
                  <div>
                    <div className="font-medium">
                      {call.applicants.first_name} {call.applicants.last_name}
                    </div>
                    {call.customers && (
                      <div className="text-xs text-muted-foreground">
                        {call.customers.name}
                      </div>
                    )}
                  </div>
                ) : call.customers ? (
                  <div className="font-medium">{call.customers.name}</div>
                ) : (
                  <span className="text-muted-foreground">Unbekannt</span>
                )}
              </TableCell>

              {/* Zeitpunkt */}
              <TableCell>
                <span className="text-sm">
                  {formatRelativeTime(call.called_at)}
                </span>
              </TableCell>

              {/* Art */}
              <TableCell>
                <div className="flex gap-1">
                  {call.has_voicemail && (
                    <Badge variant="secondary" className="gap-1">
                      <Voicemail className="h-3 w-3" />
                      Voicemail
                    </Badge>
                  )}
                  {call.callback_requested && (
                    <Badge variant="outline" className="gap-1">
                      <PhoneForwarded className="h-3 w-3" />
                      Rückruf
                    </Badge>
                  )}
                  {!call.has_voicemail && !call.callback_requested && (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              </TableCell>

              {/* Zugewiesen */}
              <TableCell>
                <Select
                  value={call.assigned_to || 'unassigned'}
                  onValueChange={(value) =>
                    onAssignmentChange(call.id, value === 'unassigned' ? null : value)
                  }
                >
                  <SelectTrigger className="w-[150px] h-8">
                    <SelectValue>
                      {call.profiles?.full_name || (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Niemand
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">
                      <span className="text-muted-foreground">Niemand</span>
                    </SelectItem>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>

              {/* Status */}
              <TableCell>
                <StatusBadge status={call.status} />
              </TableCell>

              {/* Aktionen */}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDetails(call)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Details anzeigen
                    </DropdownMenuItem>
                    {call.status === 'offen' && (
                      <DropdownMenuItem
                        onClick={() => onStatusChange(call.id, 'bearbeitet')}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Als bearbeitet markieren
                      </DropdownMenuItem>
                    )}
                    {call.status !== 'erledigt' && (
                      <DropdownMenuItem
                        onClick={() => onStatusChange(call.id, 'erledigt')}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Als erledigt markieren
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
