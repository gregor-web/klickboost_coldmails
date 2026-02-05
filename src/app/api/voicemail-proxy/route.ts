import { NextRequest, NextResponse } from 'next/server'

// Proxy für Twilio Recording URLs (benötigen Basic Auth)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 })
  }

  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioToken = process.env.TWILIO_AUTH_TOKEN

  if (!twilioSid || !twilioToken) {
    return NextResponse.json({ error: 'Twilio credentials not configured' }, { status: 500 })
  }

  try {
    // Basic Auth Header erstellen
    const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')

    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader
      }
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch audio: ${response.status}` },
        { status: response.status }
      )
    }

    // Audio-Daten streamen
    const audioBuffer = await response.arrayBuffer()

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'private, max-age=3600'
      }
    })
  } catch (error) {
    console.error('Voicemail proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy voicemail audio' },
      { status: 500 }
    )
  }
}
