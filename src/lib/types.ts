// Status-Typen
export type CallStatus = 'offen' | 'bearbeitet' | 'erledigt'

// Basis Inbound-Call Interface (DB-Schema)
export interface InboundCall {
  id: string
  caller_phone: string
  called_number: string | null
  twilio_call_sid: string | null
  applicant_id: string | null
  customer_id: string | null
  assigned_to: string | null
  status: CallStatus
  call_duration: number
  has_voicemail: boolean
  voicemail_url: string | null
  voicemail_transcript: string | null
  callback_requested: boolean
  notes: string | null
  callback_notes: string | null
  called_at: string
  processed_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

// Bewerber-Daten
export interface Applicant {
  id: string
  first_name: string
  last_name: string
  phone?: string
  email?: string
}

// Kunden-Daten
export interface Customer {
  id: string
  name: string
  phone?: string
}

// Profil/Mitarbeiter-Daten
export interface Profile {
  id: string
  full_name: string
  email?: string
}

// Inbound-Call mit verknüpften Daten (View)
export interface InboundCallWithDetails extends InboundCall {
  applicants: Applicant | null
  customers: Customer | null
  profiles: Profile | null
}

// Filter-State für Dashboard
export interface FilterState {
  status: CallStatus | 'all'
  assignedTo: string | null
  timeRange: 'today' | 'yesterday' | 'week' | 'custom' | 'all'
  dateFrom: string | null
  dateTo: string | null
}

// API-Response Typen
export interface InboundCallsResponse {
  calls: InboundCallWithDetails[]
  count: number
}

// Stats für Dashboard-Karten
export interface InboundStats {
  total: number
  offen: number
  bearbeitet: number
  erledigt: number
  assignedToMe: number
}

// Update-Payload für PATCH
export interface UpdateInboundCallPayload {
  id: string
  status?: CallStatus
  assigned_to?: string | null
  notes?: string
  callback_notes?: string
  user_id?: string
  user_name?: string
}
