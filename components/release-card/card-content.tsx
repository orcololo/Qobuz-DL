import React from 'react'
import { UsersIcon, DiscAlbumIcon } from 'lucide-react'
import { getType, formatTitle, formatArtists, QobuzAlbum, QobuzArtist, QobuzTrack } from '@/lib/qobuz-dl'

interface CardContentProps {
  result: QobuzAlbum | QobuzTrack | QobuzArtist
}

export const CardContent: React.FC<CardContentProps> = ({ result }) => {
  const isArtist = getType(result) === 'artists'

  return (
    <div className='space-y-1'>
      <div className='flex gap-1.5 items-center'>
        {(result as QobuzAlbum | QobuzTrack).parental_warning && (
          <p
            className='text-[10px] bg-primary text-primary-foreground p-1 rounded-[3px] aspect-square w-[18px] h-[18px] text-center justify-center items-center shrink-0 flex font-semibold'
            title='Explicit'
          >
            E
          </p>
        )}
        <h1 className='text-sm truncate font-bold group-hover:underline text-wrap'>
          {formatTitle(result)}
        </h1>
      </div>
      {!isArtist && (
        <div className='text-xs truncate flex gap-x-0.5' title={formatArtists(result as QobuzAlbum | QobuzTrack)}>
          <UsersIcon className='size-3.5' />
          <span>{formatArtists(result as QobuzAlbum | QobuzTrack)}</span>
        </div>
      )}
      {(result as QobuzTrack).album?.title ? (
        <div className='text-xs truncate flex gap-x-0.5'>
          <DiscAlbumIcon className='size-3.5' />
          <span>{(result as QobuzTrack).album.title}</span>
        </div>
      ) : null}
    </div>
  )
}