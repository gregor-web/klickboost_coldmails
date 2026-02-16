'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from './StatusBadge'
import { VoicemailPlayer } from './VoicemailPlayer'
import { formatPhoneNumber, formatDate, formatDuration } from '@/lib/utils'
import type { InboundCallWithDetails, CallStatus } from '@/lib/types'
import {
  Phone,
  Clock,
  CheckCircle2,
  PhoneForwarded,
  Voicemail,
  Trash2
} from 'lucide-react'

interface CallDetailModalProps {
  call: InboundCallWithDetails | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: (id: string, status: CallStatus) => void
  onNotesChange: (id: string, notes: string) => void
  onDelete: (call: InboundCallWithDetails) => void
}

export function CallDetailModal({
  call,
  open,
  onOpenChange,
  onStatusChange,
  onNotesChange,
  onDelete
}: CallDetailModalProps) {
  const [notes, setNotes] = useState(call?.callback_notes || '')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setNotes(call?.callback_notes || '')
  }, [call])

  if (!call) return null

  const handleSaveNotes = async () => {
    setIsSaving(true)
    try {
      await onNotesChange(call.id, notes)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Phone className="h-5 w-5" />
            Anruf-Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Kopfzeile mit Status */}
          <div className="flex items-center justify-between">
            <StatusBadge status={call.status} />
            <span className="text-sm text-muted-foreground">
              {formatDate(call.called_at)}
            </span>
          </div>

          {/* Rückruf-Wunsch Badge */}
          {call.callback_requested && (
            <Badge variant="outline" className="gap-1 text-orange-500 border-orange-500">
              <PhoneForwarded className="h-4 w-4" />
              Rückruf angefordert
            </Badge>
          )}

          <Separator />

          {/* Anrufer-Info */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              Anrufer
            </div>
            <div className="font-medium text-lg">
              {formatPhoneNumber(call.caller_phone)}
            </div>
            {call.call_duration > 0 && (
              <div className="text-sm text-muted-foreground mt-1">
                Dauer: {formatDuration(call.call_duration)}
              </div>
            )}
          </div>

          {/* Voicemail */}
          {call.has_voicemail && call.voicemail_url && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                  <Voicemail className="h-4 w-4" />
                  Voicemail
                </div>
                <VoicemailPlayer
                  url={call.voicemail_url}
                  transcript={call.voicemail_transcript}
                />
              </div>
            </>
          )}

          <Separator />

          {/* Rückruf-Notizen */}
          <div>
            <Label htmlFor="callback-notes" className="text-sm font-medium">
              Rückruf-Notizen
            </Label>
            <Textarea
              id="callback-notes"
              placeholder="Notizen zum Rückruf eingeben..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2"
              rows={3}
            />
            <Button
              size="sm"
              className="mt-2"
              onClick={handleSaveNotes}
              disabled={isSaving || notes === (call.callback_notes || '')}
            >
              {isSaving ? 'Speichern...' : 'Notizen speichern'}
            </Button>
          </div>

          <Separator />

          {/* Status-Aktionen */}
          <div className="flex gap-2">
            {call.status === 'offen' && (
              <Button
                variant="outline"
                onClick={() => onStatusChange(call.id, 'bearbeitet')}
              >
                <Clock className="mr-2 h-4 w-4" />
                Als bearbeitet markieren
              </Button>
            )}
            {call.status !== 'erledigt' && (
              <Button onClick={() => onStatusChange(call.id, 'erledigt')}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Als erledigt markieren
              </Button>
            )}
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button variant="destructive" onClick={() => onDelete(call)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Anruf loeschen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
