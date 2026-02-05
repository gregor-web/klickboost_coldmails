import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Für Tests: Einzelne Nummer statt Gruppe
const TWOCHAT_RECIPIENT = '+436764509422'
// Gruppe für Produktion: 'WAG32655201-a822-49cc-87a3-4226054c0239'

// Produktions-URL
const BASE_URL = 'https://klickboost-coldmails.vercel.app'

// WhatsApp Nachricht mit Audio via TwoChat senden
async function sendWhatsAppNotification(
  callerPhone: string,
  recordingUrl: string
) {
  const apiKey = process.env.TWOCHAT_API_KEY
  const phoneNumber = process.env.TWOCHAT_PHONE_NUMBER

  if (!apiKey || !phoneNumber) {
    console.log('TwoChat not configured, skipping WhatsApp notification')
    return
  }

  console.log('Sending WhatsApp notification to:', TWOCHAT_RECIPIENT)
  console.log('Recording URL:', recordingUrl)

  try {
    // Proxy-URL erstellen (öffentlich zugänglich, ohne Twilio-Auth)
    const proxyUrl = `${BASE_URL}/api/voicemail-proxy?url=${encodeURIComponent(recordingUrl + '.mp3')}`
    console.log('Proxy URL:', proxyUrl)

    const message = `📞 Neue Voicemail!\n\nVon: ${callerPhone}`

    // Text-Nachricht senden
    const textResponse = await fetch('https://api.p.2chat.io/open/whatsapp/send-message', {
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

    const textResult = await textResponse.json()
    console.log('WhatsApp text response:', textResponse.status, textResult)

    // Audio über unsere Proxy-URL senden
    console.log('Sending audio via proxy URL')

    const audioResponse = await fetch('https://api.p.2chat.io/open/whatsapp/send-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-API-Key': apiKey
      },
      body: JSON.stringify({
        to_number: TWOCHAT_RECIPIENT,
        from_number: phoneNumber,
        url: proxyUrl
      })
    })

    const audioResult = await audioResponse.json()
    console.log('WhatsApp audio response:', audioResponse.status, audioResult)
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error)
  }
}

// Twilio Recording Status Callback
export async function POST(request: NextRequest) {
  console.log('=== RECORDING CALLBACK RECEIVED ===')

  const formData = await request.formData()

  // Alle Form-Felder loggen
  const allFields: Record<string, string> = {}
  formData.forEach((value, key) => {
    allFields[key] = value.toString()
  })
  console.log('All form fields:', JSON.stringify(allFields))

  const callSid = formData.get('CallSid') as string || ''
  const recordingUrl = formData.get('RecordingUrl') as string || ''
  const recordingStatus = formData.get('RecordingStatus') as string || ''
  const recordingDuration = parseInt(formData.get('RecordingDuration') as string || '0')

  console.log('Recording callback parsed:', { callSid, recordingUrl, recordingStatus, recordingDuration })

  // Nur wenn Recording fertig ist
  if (recordingStatus !== 'completed') {
    console.log('Recording not completed yet, status:', recordingStatus)
    return NextResponse.json({ success: true })
  }

  console.log('Recording completed, processing...')

  try {
    const supabase = createServerClient()

    // Anruf-Daten laden um Caller Phone zu bekommen
    console.log('Looking for call with SID:', callSid)
    const { data: callDataArray, error: fetchError } = await supabase
      .from('inbound_calls_+4915888651151')
      .select('caller_phone')
      .eq('twilio_call_sid', callSid)
      .limit(1)

    const callData = callDataArray?.[0] || null
    console.log('Supabase fetch result:', { callData, fetchError })

    // Anruf mit Recording-URL aktualisieren
    const { error: updateError } = await supabase
      .from('inbound_calls_+4915888651151')
      .update({
        voicemail_url: `${recordingUrl}.mp3`,
        has_voicemail: true,
        call_duration: recordingDuration,
        updated_at: new Date().toISOString()
      })
      .eq('twilio_call_sid', callSid)

    console.log('Supabase update result:', { updateError })

    // WhatsApp Benachrichtigung senden
    if (callData?.caller_phone) {
      console.log('Sending WhatsApp to caller:', callData.caller_phone)
      await sendWhatsAppNotification(callData.caller_phone, recordingUrl)
    } else {
      console.log('No caller_phone found for callSid:', callSid)
    }

    console.log('=== RECORDING CALLBACK DONE ===')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing recording:', error)
    return NextResponse.json({ error: 'Failed to process recording' }, { status: 500 })
  }
}
