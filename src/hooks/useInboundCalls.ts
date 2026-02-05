'use client'

import { useState, useEffect, useCallback } from 'react'
import type {
  InboundCallWithDetails,
  FilterState,
  InboundStats,
  CallStatus,
  UpdateInboundCallPayload
} from '@/lib/types'

const DEFAULT_FILTER: FilterState = {
  status: 'all',
  assignedTo: null,
  timeRange: 'all',
  dateFrom: null,
  dateTo: null
}

export function useInboundCalls(currentUserId?: string) {
  const [calls, setCalls] = useState<InboundCallWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)

  // Stats berechnen
  const stats: InboundStats = {
    total: calls.length,
    offen: calls.filter(c => c.status === 'offen').length,
    bearbeitet: calls.filter(c => c.status === 'bearbeitet').length,
    erledigt: calls.filter(c => c.status === 'erledigt').length,
    assignedToMe: currentUserId
      ? calls.filter(c => c.assigned_to === currentUserId).length
      : 0
  }

  // Daten laden
  const fetchCalls = useCallback(async () => {
    try {
      const params = new URLSearchParams()

      if (filter.status !== 'all') {
        params.set('status', filter.status)
      }

      if (filter.assignedTo) {
        params.set('assigned_to', filter.assignedTo)
      }

      if (filter.timeRange !== 'all') {
        params.set('time', filter.timeRange)

        if (filter.timeRange === 'custom') {
          if (filter.dateFrom) params.set('from', filter.dateFrom)
          if (filter.dateTo) params.set('to', filter.dateTo)
        }
      }

      const response = await fetch(`/api/inbound-calls?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch calls')
      }

      const data = await response.json()
      setCalls(data.calls)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [filter])

  // Initial load und Auto-Refresh
  useEffect(() => {
    fetchCalls()

    // Auto-Refresh alle 30 Sekunden
    const interval = setInterval(fetchCalls, 30000)
    return () => clearInterval(interval)
  }, [fetchCalls])

  // Status aktualisieren
  const updateCallStatus = useCallback(async (id: string, status: CallStatus) => {
    // Optimistic Update
    setCalls(prev =>
      prev.map(call =>
        call.id === id ? { ...call, status } : call
      )
    )

    try {
      const response = await fetch('/api/inbound-calls', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      const updatedCall = await response.json()

      // Mit Server-Response aktualisieren
      setCalls(prev =>
        prev.map(call =>
          call.id === id ? updatedCall : call
        )
      )
    } catch (err) {
      // Rollback bei Fehler
      fetchCalls()
      throw err
    }
  }, [fetchCalls])

  // Zuweisung aktualisieren
  const updateCallAssignment = useCallback(async (id: string, assignedTo: string | null) => {
    // Optimistic Update
    setCalls(prev =>
      prev.map(call =>
        call.id === id ? { ...call, assigned_to: assignedTo } : call
      )
    )

    try {
      const response = await fetch('/api/inbound-calls', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, assigned_to: assignedTo })
      })

      if (!response.ok) {
        throw new Error('Failed to update assignment')
      }

      const updatedCall = await response.json()
      setCalls(prev =>
        prev.map(call =>
          call.id === id ? updatedCall : call
        )
      )
    } catch (err) {
      fetchCalls()
      throw err
    }
  }, [fetchCalls])

  // Allgemeines Update
  const updateCall = useCallback(async (payload: UpdateInboundCallPayload) => {
    try {
      const response = await fetch('/api/inbound-calls', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error('Failed to update call')
      }

      const updatedCall = await response.json()
      setCalls(prev =>
        prev.map(call =>
          call.id === payload.id ? updatedCall : call
        )
      )

      return updatedCall
    } catch (err) {
      fetchCalls()
      throw err
    }
  }, [fetchCalls])

  // Filter aktualisieren
  const setFilterStatus = useCallback((status: CallStatus | 'all') => {
    setFilter(prev => ({ ...prev, status }))
  }, [])

  const setFilterAssignedTo = useCallback((assignedTo: string | null) => {
    setFilter(prev => ({ ...prev, assignedTo }))
  }, [])

  const setFilterTimeRange = useCallback((
    timeRange: FilterState['timeRange'],
    dateFrom?: string,
    dateTo?: string
  ) => {
    setFilter(prev => ({
      ...prev,
      timeRange,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null
    }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilter(DEFAULT_FILTER)
  }, [])

  return {
    calls,
    loading,
    error,
    stats,
    filter,
    fetchCalls,
    updateCallStatus,
    updateCallAssignment,
    updateCall,
    setFilterStatus,
    setFilterAssignedTo,
    setFilterTimeRange,
    resetFilters
  }
}
