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

// Twilio Webhook: Call Status Changes
export async function POST(request: NextRequest) {
  const formData = await request.formData()

  const callSid = formData.get('CallSid') as string || ''
  const callStatus = formData.get('CallStatus') as string || ''
  const callDuration = parseInt(formData.get('CallDuration') as string || '0')
  const callerPhone = formData.get('From') as string || ''
  const recordingUrl = formData.get('RecordingUrl') as string | null

  try {
    const supabase = createServerClient()

    // Update-Daten vorbereiten
    const updateData: Record<string, unknown> = {
      call_duration: callDuration,
      notes: `CallStatus: ${callStatus}`,
      updated_at: new Date().toISOString()
    }

    // Falls Recording vorhanden, speichern
    if (recordingUrl) {
      updateData.voicemail_url = `${recordingUrl}.mp3`
      updateData.has_voicemail = true
    }

    // Bestehenden Anruf aktualisieren
    const { error } = await supabase
      .from('inbound_calls_+4915888651151')
      .update(updateData)
      .eq('twilio_call_sid', callSid)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // WhatsApp Benachrichtigung NUR wenn Call abgeschlossen
    if (callStatus === 'completed') {
      await sendWhatsAppNotification(callerPhone, callDuration, recordingUrl)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating call status:', error)
    return NextResponse.json({ error: 'Failed to update call' }, { status: 500 })
  }
}
