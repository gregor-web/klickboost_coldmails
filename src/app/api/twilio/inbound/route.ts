import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// TwiML Response erstellen
function createTwiMLResponse(twiml: string) {
  return new NextResponse(twiml, {
    headers: {
      'Content-Type': 'text/xml'
    }
  })
}

// Twilio Webhook: Anruf speichern und TwiML zurückgeben
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

    await supabase.from('inbound_calls_+4915888651151').insert({
      caller_phone: callerPhone,
      called_number: calledNumber,
      twilio_call_sid: callSid,
      call_duration: 0,
      status: 'offen',
      notes: `CallStatus: ${callStatus}`,
      called_at: new Date().toISOString(),
      has_voicemail: false
    })
  } catch (error) {
    console.error('Error saving call:', error)
  }

  // Produktions-URL für Recording Callback (VERCEL_URL gibt Preview-URLs zurück!)
  const baseUrl = 'https://klickboost-crm.vercel.app'

  // TwiML: Ansage abspielen und Voicemail aufnehmen
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="de-DE">Hallo, leider sind wir gerade nicht erreichbar. Bitte hinterlassen Sie eine Nachricht nach dem Signalton.</Say>
  <Record
    maxLength="120"
    playBeep="true"
    recordingStatusCallback="${baseUrl}/api/twilio/recording"
    recordingStatusCallbackMethod="POST"
  />
  <Say language="de-DE">Danke für Ihre Nachricht. Auf Wiederhören.</Say>
</Response>`

  return createTwiMLResponse(twiml)
}
