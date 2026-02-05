import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Twilio Webhook: Call Status Changes (nur DB Update, keine WhatsApp)
export async function POST(request: NextRequest) {
  const formData = await request.formData()

  const callSid = formData.get('CallSid') as string || ''
  const callStatus = formData.get('CallStatus') as string || ''
  const callDuration = parseInt(formData.get('CallDuration') as string || '0')

  console.log('Status callback:', { callSid, callStatus, callDuration })

  try {
    const supabase = createServerClient()

    // Bestehenden Anruf aktualisieren
    const { error } = await supabase
      .from('inbound_calls_+4915888651151')
      .update({
        call_duration: callDuration,
        notes: `CallStatus: ${callStatus}`,
        updated_at: new Date().toISOString()
      })
      .eq('twilio_call_sid', callSid)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // WhatsApp wird im Recording-Webhook gesendet (mit Audio)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating call status:', error)
    return NextResponse.json({ error: 'Failed to update call' }, { status: 500 })
  }
}
