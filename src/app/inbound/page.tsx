'use client'

import { useState, useEffect } from 'react'
import { useInboundCalls } from '@/hooks/useInboundCalls'
import { StatsCards } from '@/components/inbound/StatsCards'
import { FilterBar } from '@/components/inbound/FilterBar'
import { CallsTable } from '@/components/inbound/CallsTable'
import { CallDetailModal } from '@/components/inbound/CallDetailModal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { InboundCallWithDetails, Profile, CallStatus } from '@/lib/types'

export default function InboundPage() {
  const [selectedCall, setSelectedCall] = useState<InboundCallWithDetails | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [deleteTarget, setDeleteTarget] = useState<InboundCallWithDetails | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    calls,
    loading,
    stats,
    filter,
    updateCallStatus,
    updateCallAssignment,
    updateCall,
    deleteCall,
    setFilterStatus,
    setFilterAssignedTo,
    setFilterTimeRange,
    resetFilters
  } = useInboundCalls()

  // Mitarbeiter-Liste laden
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const res = await fetch('/api/profiles')
        if (res.ok) {
          const data = await res.json()
          setProfiles(data.profiles || [])
        }
      } catch {
        // Silently ignore - profiles are optional
      }
    }
    fetchProfiles()
  }, [])

  const handleViewDetails = (call: InboundCallWithDetails) => {
    setSelectedCall(call)
    setModalOpen(true)
  }

  const handleStatusChange = async (id: string, status: CallStatus) => {
    try {
      await updateCallStatus(id, status)
      // Modal aktualisieren wenn geöffnet
      if (selectedCall?.id === id) {
        setSelectedCall(prev => prev ? { ...prev, status } : null)
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleAssignmentChange = async (id: string, assignedTo: string | null) => {
    try {
      await updateCallAssignment(id, assignedTo)
    } catch (error) {
      console.error('Failed to update assignment:', error)
    }
  }

  const handleNotesChange = async (id: string, notes: string) => {
    try {
      await updateCall({ id, callback_notes: notes })
      if (selectedCall?.id === id) {
        setSelectedCall(prev => prev ? { ...prev, callback_notes: notes } : null)
      }
    } catch (error) {
      console.error('Failed to update notes:', error)
    }
  }

  const handleDeleteRequest = (call: InboundCallWithDetails) => {
    setDeleteTarget(call)
    setDeleteOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)

    try {
      await deleteCall(deleteTarget.id)
      if (selectedCall?.id === deleteTarget.id) {
        setSelectedCall(null)
        setModalOpen(false)
      }
      setDeleteOpen(false)
      setDeleteTarget(null)
    } catch (error) {
      console.error('Failed to delete call:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Inbound-Anrufe</h1>
        <p className="text-muted-foreground mt-1">
          Verwaltung eingehender Anrufe und Voicemails
        </p>
      </div>

      {/* Statistik-Karten */}
      <StatsCards
        stats={stats}
        activeFilter={filter.status}
        onFilterClick={setFilterStatus}
      />

      {/* Filter */}
      <FilterBar
        filter={filter}
        profiles={profiles}
        onTimeRangeChange={setFilterTimeRange}
        onAssignedToChange={setFilterAssignedTo}
        onReset={resetFilters}
      />

      {/* Tabelle */}
      <CallsTable
        calls={calls}
        loading={loading}
        profiles={profiles}
        onStatusChange={handleStatusChange}
        onAssignmentChange={handleAssignmentChange}
        onViewDetails={handleViewDetails}
        onDelete={handleDeleteRequest}
      />

      {/* Detail-Modal */}
      <CallDetailModal
        call={selectedCall}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onStatusChange={handleStatusChange}
        onNotesChange={handleNotesChange}
        onDelete={handleDeleteRequest}
      />

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anruf loeschen?</DialogTitle>
            <DialogDescription>
              Der Anruf wird dauerhaft geloescht und kann nicht wiederhergestellt werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Loeschen...' : 'Loeschen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
