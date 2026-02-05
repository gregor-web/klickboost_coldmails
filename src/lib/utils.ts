import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, format, isToday, isYesterday, startOfDay, endOfDay, subDays } from "date-fns"
import { de } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Telefonnummer formatieren (z.B. +49 151 12345678)
export function formatPhoneNumber(phone: string): string {
  if (!phone) return ''

  // Bereits formatiert?
  if (phone.includes(' ')) return phone

  // Deutsche Nummern
  if (phone.startsWith('+49')) {
    const rest = phone.slice(3)
    if (rest.length >= 10) {
      return `+49 ${rest.slice(0, 3)} ${rest.slice(3, 7)} ${rest.slice(7)}`
    }
    return `+49 ${rest}`
  }

  return phone
}

// Relative Zeitangabe (z.B. "vor 5 Minuten")
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: de })
}

// Datum formatieren
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date

  if (isToday(d)) {
    return `Heute, ${format(d, 'HH:mm', { locale: de })} Uhr`
  }

  if (isYesterday(d)) {
    return `Gestern, ${format(d, 'HH:mm', { locale: de })} Uhr`
  }

  return format(d, 'dd.MM.yyyy, HH:mm', { locale: de }) + ' Uhr'
}

// Anruf-Dauer formatieren (z.B. "1:23")
export function formatDuration(seconds: number): string {
  if (!seconds || seconds === 0) return '0:00'

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Zeitraum-Filter Daten berechnen
export function getDateRangeForFilter(timeRange: string): { from: Date; to: Date } | null {
  const now = new Date()

  switch (timeRange) {
    case 'today':
      return {
        from: startOfDay(now),
        to: endOfDay(now)
      }
    case 'yesterday':
      const yesterday = subDays(now, 1)
      return {
        from: startOfDay(yesterday),
        to: endOfDay(yesterday)
      }
    case 'week':
      return {
        from: startOfDay(subDays(now, 7)),
        to: endOfDay(now)
      }
    default:
      return null
  }
}
