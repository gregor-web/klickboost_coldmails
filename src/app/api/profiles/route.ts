import { NextResponse } from 'next/server'

// Mitarbeiter-Liste
const TEAM_MEMBERS = [
  { id: 'loran', full_name: 'Loran', email: 'loran@klickboost.de' },
  { id: 'martin', full_name: 'Martin', email: 'martin@klickboost.de' },
  { id: 'dennis', full_name: 'Dennis', email: 'dennis@klickboost.de' },
  { id: 'yannick', full_name: 'Yannick', email: 'yannick@klickboost.de' }
]

// GET: Alle Mitarbeiter laden
export async function GET() {
  return NextResponse.json({ profiles: TEAM_MEMBERS })
}
