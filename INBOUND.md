# Inbound-Anrufe - Technische Dokumentation

**Version:** 6.35+
**Letzte Aktualisierung:** Februar 2025

---

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Architektur](#architektur)
3. [Datenbank-Schema](#datenbank-schema)
4. [API-Endpunkte](#api-endpunkte)
5. [Twilio-Webhooks (IVR-Flow)](#twilio-webhooks-ivr-flow)
6. [Voicemail & Transkription](#voicemail--transkription)
7. [Frontend / UI](#frontend--ui)
8. [Webhook-Events](#webhook-events)
9. [Konfiguration](#konfiguration)

---

## Übersicht

Das Inbound-System ermöglicht das Handling eingehender Anrufe auf den Twilio-Nummern des CRM. Anrufer werden automatisch mit Bewerbern/Kunden gematcht und können:
- Eine Voicemail hinterlassen (wird automatisch transkribiert)
- Einen Rückruf anfordern

Alle eingehenden Anrufe landen in einer zentralen Übersicht mit Status-Workflow.

### Features

| Feature | Beschreibung |
|---------|--------------|
| **Auto-Matching** | Anrufer-Nummer wird automatisch mit Bewerbern/Kunden verknüpft |
| **IVR-Menü** | Dynamische Begrüßung + Menüauswahl (Voicemail/Rückruf) |
| **Voicemail-Recording** | Max. 2 Minuten, gespeichert bei Twilio |
| **KI-Transkription** | OpenAI Whisper (Deutsch) transkribiert Voicemails |
| **Status-Workflow** | offen → bearbeitet → erledigt |
| **Mitarbeiter-Zuweisung** | Anrufe können Mitarbeitern zugewiesen werden |
| **Historie-Logging** | Alle Änderungen werden in `applicant_history` geloggt |
| **Echtzeit-Updates** | Dashboard aktualisiert sich alle 30 Sekunden |
| **Webhook-Integration** | Events werden an externe Systeme gesendet |

---

## Architektur

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ANRUF-EINGANG                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Twilio                                                                      │
│  ┌──────────────────┐                                                        │
│  │ Incoming Call    │──────▶ Webhook: /api/twilio/inbound                   │
│  └──────────────────┘                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  /api/twilio/inbound/route.ts                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ 1. Anrufer-Nummer normalisieren                                        │ │
│  │ 2. Bewerber/Kunde in DB suchen (Auto-Match)                           │ │
│  │ 3. Dynamische Begrüßung generieren (TwiML)                            │ │
│  │ 4. IVR-Menü anbieten (1=Voicemail, 2=Rückruf)                         │ │
│  │ 5. Inbound-Call in DB speichern (Status: offen)                       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ Taste 1: Voicemail           │    │ Taste 2: Rückruf             │
│ /api/twilio/inbound/voicemail│    │ /api/twilio/inbound/menu     │
│                              │    │                              │
│ → Ansage + Recording         │    │ → callback_requested = true  │
│ → Max. 120 Sekunden          │    │ → Bestätigung abspielen      │
│ → # zum Beenden              │    │ → Auflegen                   │
└──────────────────────────────┘    └──────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────┐
│ /api/twilio/inbound/recording│
│                              │
│ → Recording-URL speichern    │
│ → Whisper-Transkription      │
│ → Transkript in DB speichern │
└──────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Supabase (PostgreSQL)                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ inbound_calls                                                          │ │
│  │ ├── caller_phone, called_number, twilio_call_sid                      │ │
│  │ ├── applicant_id, customer_id (auto-matched via Trigger)              │ │
│  │ ├── status: offen | bearbeitet | erledigt                             │ │
│  │ ├── has_voicemail, voicemail_url, voicemail_transcript                │ │
│  │ ├── callback_requested, callback_notes                                │ │
│  │ └── assigned_to, called_at, processed_at, completed_at                │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Frontend: /inbound (page.tsx)                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ • Tabellen-Ansicht aller Inbound-Calls                                │ │
│  │ • Status-Badges (rot/gelb/grün)                                       │ │
│  │ • Filter: Status, Mitarbeiter, Zeitraum                               │ │
│  │ • Detail-Modal: Voicemail-Player, Transkript, Notizen                 │ │
│  │ • Echtzeit-Aktualisierung (30s Polling)                               │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Datenbank-Schema

### Tabelle: `inbound_calls`

```sql
CREATE TABLE inbound_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Anruf-Details
  caller_phone VARCHAR(50) NOT NULL,        -- Anrufer-Telefonnummer
  called_number VARCHAR(50),                -- Unsere angerufene Nummer
  twilio_call_sid VARCHAR(100),             -- Twilio Call SID

  -- Zuordnung (automatisch via Trigger)
  applicant_id UUID REFERENCES applicants(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Status-Workflow
  status VARCHAR(20) DEFAULT 'offen'
    CHECK (status IN ('offen', 'bearbeitet', 'erledigt')),

  -- Anruf-Info
  call_duration INTEGER DEFAULT 0,          -- Dauer in Sekunden
  has_voicemail BOOLEAN DEFAULT false,
  voicemail_url TEXT,                       -- Twilio Recording URL
  voicemail_transcript TEXT,                -- OpenAI Whisper Transkript
  callback_requested BOOLEAN DEFAULT false,

  -- Notizen
  notes TEXT,
  callback_notes TEXT,

  -- Timestamps
  called_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,                 -- Wann auf "bearbeitet" gesetzt
  completed_at TIMESTAMPTZ,                 -- Wann auf "erledigt" gesetzt
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indizes

```sql
CREATE INDEX idx_inbound_calls_status ON inbound_calls(status);
CREATE INDEX idx_inbound_calls_caller_phone ON inbound_calls(caller_phone);
CREATE INDEX idx_inbound_calls_called_at ON inbound_calls(called_at DESC);
CREATE INDEX idx_inbound_calls_applicant ON inbound_calls(applicant_id);
```

### Auto-Matching Trigger

Beim INSERT wird automatisch versucht, die Anrufer-Nummer mit Bewerbern/Kunden zu matchen:

```sql
CREATE OR REPLACE FUNCTION match_inbound_caller()
RETURNS TRIGGER AS $$
BEGIN
  -- Bewerber anhand Telefonnummer finden
  SELECT id INTO NEW.applicant_id
  FROM applicants
  WHERE phone = NEW.caller_phone
     OR phone = REPLACE(NEW.caller_phone, '+49', '0')
     OR phone = REPLACE(NEW.caller_phone, '0049', '0')
     OR REPLACE(phone, ' ', '') = REPLACE(NEW.caller_phone, ' ', '')
  LIMIT 1;

  -- Wenn Bewerber gefunden, Kunde übernehmen
  IF NEW.applicant_id IS NOT NULL THEN
    SELECT customer_id INTO NEW.customer_id
    FROM applicants WHERE id = NEW.applicant_id;
  END IF;

  -- Falls kein Bewerber: Direkt nach Kunde suchen
  IF NEW.customer_id IS NULL THEN
    SELECT id INTO NEW.customer_id
    FROM customers
    WHERE phone = NEW.caller_phone
       OR phone = REPLACE(NEW.caller_phone, '+49', '0')
       OR REPLACE(phone, ' ', '') = REPLACE(NEW.caller_phone, ' ', '')
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_match_inbound_caller
  BEFORE INSERT ON inbound_calls
  FOR EACH ROW
  EXECUTE FUNCTION match_inbound_caller();
```

### View: `inbound_calls_with_details`

```sql
CREATE VIEW inbound_calls_with_details AS
SELECT
  ic.*,
  a.first_name as applicant_first_name,
  a.last_name as applicant_last_name,
  c.name as customer_name,
  p.full_name as assigned_name
FROM inbound_calls ic
LEFT JOIN applicants a ON ic.applicant_id = a.id
LEFT JOIN customers c ON ic.customer_id = c.id
LEFT JOIN profiles p ON ic.assigned_to = p.id;
```

### Row Level Security (RLS)

```sql
ALTER TABLE inbound_calls ENABLE ROW LEVEL SECURITY;

-- Alle authentifizierten User können lesen
CREATE POLICY "inbound_calls_select" ON inbound_calls
  FOR SELECT TO authenticated USING (true);

-- Alle authentifizierten User können erstellen
CREATE POLICY "inbound_calls_insert" ON inbound_calls
  FOR INSERT TO authenticated WITH CHECK (true);

-- Alle authentifizierten User können aktualisieren
CREATE POLICY "inbound_calls_update" ON inbound_calls
  FOR UPDATE TO authenticated USING (true);
```

---

## API-Endpunkte

### `GET /api/inbound-calls`

Lädt alle Inbound-Anrufe mit Filtern.

**Query-Parameter:**

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `status` | string | Filter: `offen`, `bearbeitet`, `erledigt`, `all` |
| `limit` | number | Max. Anzahl (Default: 50) |
| `count_only` | boolean | Nur Anzahl offener Anrufe zurückgeben (für Badge) |
| `time` | string | `today`, `yesterday`, `week`, `custom` |
| `from` | string | Start-Datum (für `time=custom`) |
| `to` | string | End-Datum (für `time=custom`) |

**Response:**
```json
{
  "calls": [
    {
      "id": "uuid",
      "caller_phone": "+4915123456789",
      "status": "offen",
      "has_voicemail": true,
      "voicemail_transcript": "Hallo, ich rufe an wegen...",
      "applicants": { "id": "uuid", "first_name": "Max", "last_name": "Muster" },
      "customers": { "id": "uuid", "name": "Firma GmbH" },
      "profiles": { "id": "uuid", "full_name": "Anna Admin" }
    }
  ],
  "count": 15
}
```

### `POST /api/inbound-calls`

Erstellt neuen Inbound-Anruf (wird von Twilio-Webhook genutzt).

**Request Body:**
```json
{
  "caller_phone": "+4915123456789",
  "called_number": "+4915199999999",
  "twilio_call_sid": "CA...",
  "call_duration": 45,
  "has_voicemail": true,
  "voicemail_url": "https://api.twilio.com/...",
  "callback_requested": false,
  "notes": "Eingehender Anruf"
}
```

### `PATCH /api/inbound-calls`

Aktualisiert einen Inbound-Anruf.

**Request Body:**
```json
{
  "id": "uuid",
  "status": "bearbeitet",
  "callback_notes": "Rückruf morgen um 10 Uhr",
  "assigned_to": "user-uuid",
  "user_id": "current-user-uuid",
  "user_name": "Max Mustermann"
}
```

**Automatische Aktionen:**
- `status: bearbeitet` → setzt `processed_at`
- `status: erledigt` → setzt `completed_at`
- Änderungen werden in `applicant_history` geloggt
- Webhooks werden getriggert

### `DELETE /api/inbound-calls?id=uuid`

Löscht einen Inbound-Anruf.

---

## Twilio-Webhooks (IVR-Flow)

### 1. Eingehender Anruf: `/api/twilio/inbound`

**Datei:** `app/api/twilio/inbound/route.ts`

Wird von Twilio aufgerufen, wenn ein Anruf eingeht.

**Ablauf:**
1. Anrufer-Nummer extrahieren (`From`)
2. Angerufene Nummer prüfen (`To`) - Mobil oder Festnetz?
3. Bewerber/Kunde in DB suchen
4. Dynamische Begrüßung mit Kundennamen
5. IVR-Menü generieren (TwiML `<Gather>`)
6. Anruf in DB speichern

**TwiML-Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Marlene" language="de-DE">
    Willkommen bei Firma GmbH. Bitte haben Sie einen Moment Geduld.
  </Say>
  <Pause length="1"/>
  <Gather numDigits="1" action="/api/twilio/inbound/menu?customer=Firma%20GmbH" method="POST" timeout="10">
    <Say voice="Polly.Marlene" language="de-DE">
      Drücken Sie die 1 um eine Nachricht zu hinterlassen.
      Drücken Sie die 2 um einen Rückruf anzufordern.
    </Say>
  </Gather>
  <Redirect method="POST">/api/twilio/inbound/voicemail?customer=Firma%20GmbH</Redirect>
</Response>
```

### 2. Menü-Auswahl: `/api/twilio/inbound/menu`

**Datei:** `app/api/twilio/inbound/menu/route.ts`

Verarbeitet die Tasteneingabe des Anrufers.

| Taste | Aktion |
|-------|--------|
| 1 | Redirect zu Voicemail |
| 2 | `callback_requested: true` setzen, Bestätigung, Auflegen |
| Andere | Ungültige Eingabe, Menü wiederholen |

### 3. Voicemail aufnehmen: `/api/twilio/inbound/voicemail`

**Datei:** `app/api/twilio/inbound/voicemail/route.ts`

Spielt Ansage ab und startet Recording.

**TwiML-Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Marlene" language="de-DE">
    Sie sprechen auf die Mailbox von Firma GmbH.
    Bitte hinterlassen Sie nach dem Signalton eine Nachricht.
    Drücken Sie die Raute-Taste wenn Sie fertig sind.
  </Say>
  <Record
    action="/api/twilio/inbound/recording?customer=Firma%20GmbH"
    method="POST"
    maxLength="120"
    finishOnKey="#"
    playBeep="true"
    transcribe="false"
  />
  <Say voice="Polly.Marlene" language="de-DE">
    Es wurde keine Nachricht aufgenommen. Auf Wiederhören.
  </Say>
  <Hangup/>
</Response>
```

### 4. Recording verarbeiten: `/api/twilio/inbound/recording`

**Datei:** `app/api/twilio/inbound/recording/route.ts`

Wird aufgerufen nachdem der Anrufer aufgelegt hat.

**Ablauf:**
1. Recording-URL von Twilio empfangen
2. `has_voicemail: true` und `voicemail_url` in DB speichern
3. Asynchrone Transkription starten (siehe nächster Abschnitt)
4. Abschiedsansage abspielen

---

## Voicemail & Transkription

### Transkriptions-Pipeline

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│ Twilio         │────▶│ Download MP3   │────▶│ OpenAI Whisper │
│ Recording URL  │     │ (Basic Auth)   │     │ (Deutsch)      │
└────────────────┘     └────────────────┘     └────────────────┘
                                                      │
                                                      ▼
                                              ┌────────────────┐
                                              │ Supabase       │
                                              │ voicemail_     │
                                              │ transcript     │
                                              └────────────────┘
```

**Code (vereinfacht):**

```typescript
async function transcribeVoicemail(callSid: string, recordingUrl: string) {
  // 1. Audio von Twilio herunterladen (mit Basic Auth)
  const authUrl = recordingUrl.replace(
    'https://',
    `https://${TWILIO_SID}:${TWILIO_TOKEN}@`
  )
  const audioBuffer = await fetch(authUrl).then(r => r.arrayBuffer())

  // 2. An OpenAI Whisper senden
  const formData = new FormData()
  formData.append('file', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'voicemail.mp3')
  formData.append('model', 'whisper-1')
  formData.append('language', 'de')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}` },
    body: formData
  })

  const { text } = await response.json()

  // 3. Transkript in DB speichern
  await supabase
    .from('inbound_calls')
    .update({ voicemail_transcript: text })
    .eq('twilio_call_sid', callSid)
}
```

### Voicemail-Proxy

**Datei:** `app/api/voicemail-proxy/route.ts`

Problem: Twilio-Recording-URLs benötigen Basic Auth. Browser zeigen Login-Popup.

Lösung: Proxy-Endpoint der das Audio serverseitig abruft.

**Nutzung im Frontend:**
```html
<audio controls>
  <source src="/api/voicemail-proxy?url={encodedTwilioUrl}" type="audio/mpeg" />
</audio>
```

---

## Frontend / UI

### Seite: `/inbound`

**Datei:** `app/inbound/page.tsx`

**Komponenten:**

1. **Statistik-Karten** (klickbar zum Filtern)
   - Gesamt
   - Offen (rot, pulsierend)
   - In Bearbeitung (gelb)
   - Erledigt (grün)
   - Mir zugewiesen (orange)

2. **Filter-Leiste**
   - Mitarbeiter-Dropdown
   - Zeitraum-Dropdown (Heute/Gestern/Woche/Custom)
   - Datums-Picker für Custom
   - "Filter zurücksetzen" Button

3. **Anruf-Tabelle**
   - Anrufer (Nummer, Dauer)
   - Bewerber/Kunde (verlinkt)
   - Zeitpunkt (relative Anzeige)
   - Art (Voicemail/Rückruf Badge)
   - Zugewiesen (Dropdown zur direkten Zuweisung)
   - Status (farbige Badges)
   - Aktionen (Bearbeiten/Erledigt/Details)

4. **Detail-Modal**
   - Anrufer-Info
   - Rückruf-Wunsch Badge
   - Bewerber/Kunde Link
   - Voicemail-Player mit Transkript
   - Status-Buttons
   - Rückruf-Notizen Textarea

### Auto-Refresh

```typescript
useEffect(() => {
  fetchData()
  const interval = setInterval(fetchCalls, 30000) // 30 Sekunden
  return () => clearInterval(interval)
}, [filterStatus, filterTime, customDateFrom, customDateTo])
```

### Sidebar-Badge

In `components/Sidebar.tsx` wird die Anzahl offener Inbound-Calls als Badge angezeigt:

```typescript
// Polling alle 30 Sekunden
const response = await fetch('/api/inbound-calls?count_only=true')
const { count } = await response.json()
setInboundCount(count)
```

---

## Webhook-Events

Das System triggert Webhooks bei bestimmten Events:

| Event | Trigger |
|-------|---------|
| `inbound.received` | Neuer eingehender Anruf |
| `inbound.completed` | Status auf "erledigt" gesetzt |
| `inbound.assigned` | Anruf wurde Mitarbeiter zugewiesen |

**Payload-Struktur:**
```json
{
  "call": {
    "id": "uuid",
    "caller_phone": "+4915123456789",
    "called_number": "+4915199999999",
    "has_voicemail": true,
    "callback_requested": false,
    "status": "offen",
    "called_at": "2025-02-05T10:30:00Z"
  },
  "applicant": {
    "id": "uuid",
    "name": "Max Mustermann"
  },
  "customer": {
    "id": "uuid",
    "name": "Firma GmbH"
  }
}
```

---

## Konfiguration

### Umgebungsvariablen

```env
# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...

# OpenAI (für Whisper Transkription)
OPENAI_API_KEY=sk-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Twilio-Konfiguration

1. **Webhook-URL setzen** für die Twilio-Telefonnummer:
   ```
   Voice & Fax → A call comes in:
   Webhook: https://your-domain.com/api/twilio/inbound
   Method: POST
   ```

2. **TwiML App** (für Browser-Telefonie - Outbound):
   - Voice Request URL: `https://your-domain.com/api/twilio/voice`

### Dateien-Übersicht

```
klickboost-crm/
├── app/
│   ├── api/
│   │   ├── inbound-calls/
│   │   │   └── route.ts          # CRUD API für Inbound-Calls
│   │   ├── twilio/
│   │   │   └── inbound/
│   │   │       ├── route.ts      # Haupt-Webhook (Anruf-Eingang)
│   │   │       ├── menu/
│   │   │       │   └── route.ts  # IVR-Menü Handler
│   │   │       ├── voicemail/
│   │   │       │   └── route.ts  # Voicemail-Recording starten
│   │   │       └── recording/
│   │   │           └── route.ts  # Recording verarbeiten + Transkription
│   │   └── voicemail-proxy/
│   │       └── route.ts          # Audio-Proxy für Browser
│   └── inbound/
│       └── page.tsx              # Frontend-Seite
├── components/
│   └── Sidebar.tsx               # Navigation mit Inbound-Badge
├── lib/
│   └── webhooks.ts               # Webhook-Trigger Funktion
└── sql-v6.35-inbound-calls.sql   # Datenbank-Migration
```