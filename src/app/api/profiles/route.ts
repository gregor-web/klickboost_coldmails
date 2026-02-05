import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET: Alle Profile/Mitarbeiter laden
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
