import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Twilio Webhook: Anruf speichern (wird bei Anruf-Eingang aufgerufen)
export async function POST(request: NextRequest) {
  const formData = await request.formData()

  // Twilio-Felder auslesen
  const callerPhone = formData.get('From') as string || ''
  const calledNumber = formData.get('To') as string || ''
  const callSid = formData.get('CallSid') as string || ''
  const callStatus = formData.get('CallStatus') as string || ''

  // In Supabase speichern
  try {
    const supabase = createServerClient()

    const { error } = await supabase.from('inbound_calls_+4915888651151').insert({
      caller_phone: callerPhone,
      called_number: calledNumber,
      twilio_call_sid: callSid,
      call_duration: 0,
      status: 'offen',
      notes: `CallStatus: ${callStatus}`,
      called_at: new Date().toISOString(),
      has_voicemail: false
    })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // WhatsApp Benachrichtigung wird im Status-Webhook gesendet
    // wenn der Anruf abgeschlossen ist (mit Recording URL)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving call:', error)
    return NextResponse.json({ error: 'Failed to save call' }, { status: 500 })
  }
}
