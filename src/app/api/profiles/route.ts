import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Hardcoded Mitarbeiter als Fallback
const TEAM_MEMBERS = [
  { id: 'loran', full_name: 'Loran', email: 'loran@klickboost.de' },
  { id: 'martin', full_name: 'Martin', email: 'martin@klickboost.de' },
  { id: 'dennis', full_name: 'Dennis', email: 'dennis@klickboost.de' },
  { id: 'yannick', full_name: 'Yannick', email: 'yannick@klickboost.de' }
]

// GET: Alle Profile/Mitarbeiter laden
export async function GET() {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .order('full_name')

  if (error || !data || data.length === 0) {
    // Fallback auf hardcoded Mitarbeiter
    return NextResponse.json({ profiles: TEAM_MEMBERS })
  }

  return NextResponse.json({ profiles: data })
}
