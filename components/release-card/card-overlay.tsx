import React from 'react'
import { Button } from '@/components/ui/button'
import { DotIcon, UsersIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getType, formatTitle, formatDuration, QobuzAlbum, QobuzArtist, QobuzTrack } from '@/lib/qobuz-dl'

interface CardOverlayProps {
  result: QobuzAlbum | QobuzTrack | QobuzArtist
  album: QobuzAlbum | null
  resolvedTheme: string
  focusCard: boolean
  showArtistDialog?: boolean
  onArtistClick: () => void
  children: React.ReactNode
}

export const CardOverlay: React.FC<CardOverlayProps> = ({
  result,
  album,
  resolvedTheme,
  focusCard,
  showArtistDialog = true,
  onArtistClick,
  children
}) => {
  const isArtist = getType(result) === 'artists'

  return (
    <div
      className={cn(
        `w-full z-[3] backdrop-blur-md top-0 left-0 absolute transition-all aspect-square opacity-0 group-hover:opacity-100 ${focusCard && 'opacity-100'}`,
        resolvedTheme != 'light'
          ? `group-hover:bg-black/40 ${focusCard && 'bg-black/40'}`
          : `group-hover:bg-white/20 ${focusCard && 'bg-white/20'}`
      )}
      onClick={() => {
        if (isArtist) onArtistClick()
      }}
    >
      <div className='flex flex-col h-full justify-between'>
        <div className='space-y-0.5 p-4 flex justify-between relative overflow-x-hidden'>
          <div className='w-full pr-9'>
            <p className='text-sm truncate capitalize font-bold'>
              {!isArtist
                ? album?.genre.name
                : (result as QobuzArtist).albums_count + ' Releases'}
            </p>
            {!isArtist && album && (
              <p className='text-xs truncate capitalize font-medium'>
                {new Date(album.released_at * 1000).getFullYear()}
              </p>
            )}
            {!isArtist && (
              <div className='flex text-[10px] truncate font-semibold items-center justify-start'>
                <p>{(result as QobuzAlbum | QobuzTrack).maximum_bit_depth}-bit</p>
                <DotIcon size={16} />
                <p>{(result as QobuzAlbum | QobuzTrack).maximum_sampling_rate} kHz</p>
              </div>
            )}
            <div className='flex text-[10px] truncate font-semibold items-center justify-start'>
              {(result as QobuzAlbum).tracks_count ? (
                <>
                  <p>
                    {(result as QobuzAlbum).tracks_count}{' '}
                    {(result as QobuzAlbum).tracks_count > 1 ? 'tracks' : 'track'}
                  </p>
                  <DotIcon size={16} />
                </>
              ) : null}
              {!isArtist && (
                <p>{formatDuration((result as QobuzAlbum | QobuzTrack).duration)}</p>
              )}
            </div>
          </div>
          {!isArtist && showArtistDialog && (
            <div className='absolute top-0 right-0 p-4'>
              <Button
                size='icon'
                variant='ghost'
                className='aspect-square'
                onClick={onArtistClick}
              >
                <UsersIcon />
              </Button>
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}