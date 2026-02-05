import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Für Tests: Einzelne Nummer statt Gruppe
const TWOCHAT_RECIPIENT = '+436764509422'
// Gruppe für Produktion: 'WAG32655201-a822-49cc-87a3-4226054c0239'

// WhatsApp Nachricht mit Audio via TwoChat senden
async function sendWhatsAppNotification(
  callerPhone: string,
  callDuration: number,
  recordingUrl: string | null
) {
  const apiKey = process.env.TWOCHAT_API_KEY
  const phoneNumber = process.env.TWOCHAT_PHONE_NUMBER

  if (!apiKey || !phoneNumber) {
    console.log('TwoChat not configured, skipping WhatsApp notification')
    return
  }

  try {
    const message = `📞 Neuer Anruf!\n\nVon: ${callerPhone}\nDauer: ${callDuration} Sekunden`

    // Erst Text-Nachricht senden
    await fetch('https://api.p.2chat.io/open/whatsapp/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-API-Key': apiKey
      },
      body: JSON.stringify({
        to_number: TWOCHAT_RECIPIENT,
        from_number: phoneNumber,
        text: message
      })
    })

    console.log('WhatsApp text notification sent')

    // Falls Recording vorhanden, Audio senden
    if (recordingUrl) {
      // Twilio Recording URL mit .mp3 Extension für Audio
      const audioUrl = `${recordingUrl}.mp3`

      await fetch('https://api.p.2chat.io/open/whatsapp/send-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-API-Key': apiKey
        },
        body: JSON.stringify({
          to_number: TWOCHAT_RECIPIENT,
          from_number: phoneNumber,
          url: audioUrl
        })
      })

      console.log('WhatsApp audio sent:', audioUrl)
    }
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error)
  }
}

// Twilio Webhook: Anruf speichern
export async function POST(request: NextRequest) {
  const formData = await request.formData()

  // Twilio-Felder auslesen
  const callerPhone = formData.get('From') as string || ''
  const calledNumber = formData.get('To') as string || ''
  const callSid = formData.get('CallSid') as string || ''
  const callStatus = formData.get('CallStatus') as string || ''
  const callDuration = parseInt(formData.get('CallDuration') as string || '0')
  const recordingUrl = formData.get('RecordingUrl') as string | null

  // In Supabase speichern
  try {
    const supabase = createServerClient()

    const { error } = await supabase.from('inbound_calls_+4915888651151').insert({
      caller_phone: callerPhone,
      called_number: calledNumber,
      twilio_call_sid: callSid,
      call_duration: callDuration,
      status: 'offen',
      notes: `CallStatus: ${callStatus}`,
      called_at: new Date().toISOString(),
      voicemail_url: recordingUrl ? `${recordingUrl}.mp3` : null,
      has_voicemail: !!recordingUrl
    })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // WhatsApp Benachrichtigung mit Audio senden
    await sendWhatsAppNotification(callerPhone, callDuration, recordingUrl)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving call:', error)
    return NextResponse.json({ error: 'Failed to save call' }, { status: 500 })
  }
}
