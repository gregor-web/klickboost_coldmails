import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET: Alle Mitarbeiter laden
export async function GET() {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .order('full_name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profiles: data || [] })
}

// POST: Neuen Mitarbeiter anlegen
export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body = await request.json()

    if (!body.full_name) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })
    }

    // Duplikat-Pruefung nach Name
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('full_name', body.full_name.trim())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Mitarbeiter mit diesem Namen existiert bereits' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: body.id || crypto.randomUUID(),
        full_name: body.full_name,
        email: body.email || null
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

// DELETE: Mitarbeiter loeschen
export async function DELETE(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID ist erforderlich' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
