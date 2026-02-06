import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Für Tests: Einzelne Nummer statt Gruppe
const TWOCHAT_RECIPIENT = '+436764509422'
// Gruppe für Produktion: 'WAG32655201-a822-49cc-87a3-4226054c0239'

// Audio von Twilio herunterladen und zu Supabase Storage hochladen
async function uploadAudioToStorage(
  recordingUrl: string,
  callSid: string
): Promise<string | null> {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioToken = process.env.TWILIO_AUTH_TOKEN
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!twilioSid || !twilioToken || !supabaseUrl) {
    console.log('Missing credentials for audio upload')
    return null
  }

  try {
    // Audio von Twilio herunterladen (mit Auth)
    const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')
    const audioUrl = `${recordingUrl}.mp3`

    console.log('Downloading audio from Twilio:', audioUrl)

    const audioResponse = await fetch(audioUrl, {
      headers: { 'Authorization': authHeader }
    })

    if (!audioResponse.ok) {
      console.error('Failed to download audio from Twilio:', audioResponse.status)
      return null
    }

    const audioBuffer = await audioResponse.arrayBuffer()
    console.log('Downloaded audio, size:', audioBuffer.byteLength, 'bytes')

    // Zu Supabase Storage hochladen
    const supabase = createServerClient()
    const fileName = `voicemail_${callSid}_${Date.now()}.mp3`

    const { data, error } = await supabase.storage
      .from('voicemails')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      })

    if (error) {
      console.error('Failed to upload to Supabase Storage:', error)
      return null
    }

    console.log('Uploaded to Supabase Storage:', data.path)

    // Öffentliche URL generieren
    const { data: publicUrlData } = supabase.storage
      .from('voicemails')
      .getPublicUrl(fileName)

    console.log('Public URL:', publicUrlData.publicUrl)
    return publicUrlData.publicUrl
  } catch (error) {
    console.error('Error uploading audio:', error)
    return null
  }
}

// WhatsApp Nachricht mit Audio via TwoChat senden
async function sendWhatsAppNotification(
  callerPhone: string,
  audioUrl: string
) {
  const apiKey = process.env.TWOCHAT_API_KEY
  const phoneNumber = process.env.TWOCHAT_PHONE_NUMBER

  if (!apiKey || !phoneNumber) {
    console.log('TwoChat not configured, skipping WhatsApp notification')
    return
  }

  console.log('Sending WhatsApp notification to:', TWOCHAT_RECIPIENT)
  console.log('Audio URL:', audioUrl)

  try {
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

    // Audio über Supabase URL senden (öffentlich zugänglich!)
    console.log('Sending audio via public URL')

    const audioResponse = await fetch('https://api.p.2chat.io/open/whatsapp/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-API-Key': apiKey
      },
      body: JSON.stringify({
        to_number: TWOCHAT_RECIPIENT,
        from_number: phoneNumber,
        text: '🎵 Voicemail Audio:',
        url: audioUrl
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

    // Audio zu Supabase Storage hochladen
    const publicAudioUrl = await uploadAudioToStorage(recordingUrl, callSid)

    // WhatsApp Benachrichtigung senden
    if (callData?.caller_phone && publicAudioUrl) {
      console.log('Sending WhatsApp to caller:', callData.caller_phone)
      await sendWhatsAppNotification(callData.caller_phone, publicAudioUrl)
    } else if (callData?.caller_phone) {
      // Fallback: Nur Text-Nachricht senden wenn Audio-Upload fehlschlägt
      console.log('Audio upload failed, sending text-only notification')
      const apiKey = process.env.TWOCHAT_API_KEY
      const phoneNumber = process.env.TWOCHAT_PHONE_NUMBER
      if (apiKey && phoneNumber) {
        await fetch('https://api.p.2chat.io/open/whatsapp/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-API-Key': apiKey
          },
          body: JSON.stringify({
            to_number: TWOCHAT_RECIPIENT,
            from_number: phoneNumber,
            text: `📞 Neue Voicemail!\n\nVon: ${callData.caller_phone}\n\n(Audio konnte nicht geladen werden)`
          })
        })
      }
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
