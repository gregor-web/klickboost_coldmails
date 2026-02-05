'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Phone, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Sidebar() {
  const [inboundCount, setInboundCount] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Polling für offene Inbound-Calls
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/inbound-calls?count_only=true')
        if (res.ok) {
          const data = await res.json()
          setInboundCount(data.count || 0)
        }
      } catch {
        // Silently ignore errors
      }
    }

    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 border-r bg-background transition-transform md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center border-b px-6">
          <h1 className="text-xl font-bold">Klickboost CRM</h1>
        </div>
        <nav className="p-4">
          <Link
            href="/inbound"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-primary text-primary-foreground"
          >
            <Phone className="h-5 w-5" />
            Inbound-Anrufe
            {inboundCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-auto animate-pulse bg-primary-foreground text-primary"
              >
                {inboundCount}
              </Badge>
            )}
          </Link>
        </nav>
      </aside>
    </>
  )
}
