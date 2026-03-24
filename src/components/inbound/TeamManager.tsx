'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Plus, Users } from 'lucide-react'
import type { Profile } from '@/lib/types'

interface TeamManagerProps {
  profiles: Profile[]
  onProfilesChange: (profiles: Profile[]) => void
}

export function TeamManager({ profiles, onProfilesChange }: TeamManagerProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async () => {
    if (!name.trim() || isAdding) return
    setIsAdding(true)
    setError('')

    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name.trim(), email: email.trim() || undefined })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler beim Anlegen')
      }

      const newProfile = await res.json()
      onProfilesChange([...profiles, newProfile])
      setName('')
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Anlegen')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setError('')

    try {
      const res = await fetch(`/api/profiles?id=${deleteTarget.id}`, { method: 'DELETE' })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler beim Loeschen')
      }

      onProfilesChange(profiles.filter(p => p.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Loeschen')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Users className="mr-2 h-4 w-4" />
        Mitarbeiter verwalten
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mitarbeiter verwalten</DialogTitle>
            <DialogDescription>
              Mitarbeiter hinzufuegen oder entfernen
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Aktuelle Mitarbeiter */}
            <div className="space-y-2">
              {profiles.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Keine Mitarbeiter vorhanden
                </p>
              )}
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <div className="font-medium">{profile.full_name}</div>
                    {profile.email && (
                      <div className="text-sm text-muted-foreground">{profile.email}</div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteTarget(profile)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Neuen Mitarbeiter hinzufuegen */}
            <div className="border-t pt-4 space-y-3">
              <Label className="text-sm font-medium">Neuer Mitarbeiter</Label>
              <Input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <Input
                placeholder="E-Mail (optional)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <Button
                onClick={handleAdd}
                disabled={!name.trim() || isAdding}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                {isAdding ? 'Wird angelegt...' : 'Hinzufuegen'}
              </Button>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Loeschen-Bestaetigung */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mitarbeiter loeschen?</DialogTitle>
            <DialogDescription>
              {deleteTarget?.full_name} wird entfernt. Zugewiesene Anrufe werden auf &quot;Niemand&quot; gesetzt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Loeschen...' : 'Loeschen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
