import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { CallStatus, UpdateInboundCallPayload } from '@/lib/types'

// GET: Alle Inbound-Calls laden (mit Filtern)
export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)

  const status = searchParams.get('status') as CallStatus | 'all' | null
  const limit = parseInt(searchParams.get('limit') || '50')
  const countOnly = searchParams.get('count_only') === 'true'
  const timeRange = searchParams.get('time')
  const dateFrom = searchParams.get('from')
  const dateTo = searchParams.get('to')
  const assignedTo = searchParams.get('assigned_to')

  // Nur Anzahl offener Anrufe (für Badge)
  if (countOnly) {
    const { count, error } = await supabase
      .from('inbound_calls')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'offen')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ count: count || 0 })
  }

  // Query aufbauen mit verknüpften Daten
  let query = supabase
    .from('inbound_calls')
    .select(`
      *,
      applicants:applicant_id (id, first_name, last_name, phone, email),
      customers:customer_id (id, name, phone),
      profiles:assigned_to (id, full_name, email)
    `)
    .order('called_at', { ascending: false })
    .limit(limit)

  // Status-Filter
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  // Mitarbeiter-Filter
  if (assignedTo) {
    query = query.eq('assigned_to', assignedTo)
  }

  // Zeit-Filter
  if (timeRange) {
    const now = new Date()

    switch (timeRange) {
      case 'today':
        const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString()
        query = query.gte('called_at', todayStart)
        break
      case 'yesterday':
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStart = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString()
        const yesterdayEnd = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString()
        query = query.gte('called_at', yesterdayStart).lte('called_at', yesterdayEnd)
        break
      case 'week':
        const weekAgo = new Date(now)
        weekAgo.setDate(weekAgo.getDate() - 7)
        query = query.gte('called_at', weekAgo.toISOString())
        break
      case 'custom':
        if (dateFrom) query = query.gte('called_at', dateFrom)
        if (dateTo) query = query.lte('called_at', dateTo)
        break
    }
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    calls: data || [],
    count: count || data?.length || 0
  })
}

// POST: Neuen Inbound-Call erstellen (von Twilio-Webhook)
export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('inbound_calls')
      .insert({
        caller_phone: body.caller_phone,
        called_number: body.called_number,
        twilio_call_sid: body.twilio_call_sid,
        call_duration: body.call_duration || 0,
        has_voicemail: body.has_voicemail || false,
        voicemail_url: body.voicemail_url,
        callback_requested: body.callback_requested || false,
        notes: body.notes,
        status: 'offen'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// PATCH: Inbound-Call aktualisieren
export async function PATCH(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body: UpdateInboundCallPayload = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Update-Objekt aufbauen
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (body.status) {
      updates.status = body.status

      // Timestamps setzen
      if (body.status === 'bearbeitet') {
        updates.processed_at = new Date().toISOString()
      } else if (body.status === 'erledigt') {
        updates.completed_at = new Date().toISOString()
      }
    }

    if (body.assigned_to !== undefined) {
      updates.assigned_to = body.assigned_to
    }

    if (body.notes !== undefined) {
      updates.notes = body.notes
    }

    if (body.callback_notes !== undefined) {
      updates.callback_notes = body.callback_notes
    }

    const { data, error } = await supabase
      .from('inbound_calls')
      .update(updates)
      .eq('id', body.id)
      .select(`
        *,
        applicants:applicant_id (id, first_name, last_name, phone, email),
        customers:customer_id (id, name, phone),
        profiles:assigned_to (id, full_name, email)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// DELETE: Inbound-Call löschen
export async function DELETE(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('inbound_calls')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
