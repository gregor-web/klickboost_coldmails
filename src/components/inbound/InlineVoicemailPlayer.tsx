'use client'

import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, Voicemail } from 'lucide-react'
import { formatDuration } from '@/lib/utils'

interface InlineVoicemailPlayerProps {
  url: string
}

export function InlineVoicemailPlayer({ url }: InlineVoicemailPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const proxyUrl = `/api/voicemail-proxy?url=${encodeURIComponent(url)}`

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation()
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const audio = audioRef.current
    if (!audio || !duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    audio.currentTime = percent * duration
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <Button
        variant={isPlaying ? 'default' : 'outline'}
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={togglePlayPause}
      >
        {isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3 ml-0.5" />
        )}
      </Button>

      <div className="flex-1 min-w-[80px]">
        <div
          className="h-1.5 bg-muted rounded-full cursor-pointer"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {isPlaying || currentTime > 0
          ? formatDuration(Math.floor(currentTime))
          : <Voicemail className="h-3 w-3 inline" />
        }
      </span>

      <audio ref={audioRef} src={proxyUrl} preload="metadata" />
    </div>
  )
}
