import React from 'react'
import { Button } from '@/components/ui/button'
import { DownloadIcon, AlignJustifyIcon } from 'lucide-react'
import { createDownloadJob } from '@/lib/download-job'
import DownloadAlbumButton from '@/components/download-album-button'
import { getType, QobuzAlbum, QobuzTrack, FetchedQobuzAlbum } from '@/lib/qobuz-dl'
import { SettingsProps } from '@/lib/settings-provider'
import { FFmpegType } from '@/lib/ffmpeg-functions'

interface CardActionsProps {
  result: QobuzAlbum | QobuzTrack
  setStatusBar: (status: any) => void
  ffmpegState: FFmpegType
  settings: SettingsProps
  toast: any
  fetchedAlbumData: FetchedQobuzAlbum | null
  setFetchedAlbumData: React.Dispatch<React.SetStateAction<FetchedQobuzAlbum | null>>
  onFocusChange: (focused: boolean) => void
  onTracklistToggle: () => void
  onAlbumInfoFetch: () => void
}

export const CardActions: React.FC<CardActionsProps> = ({
  result,
  setStatusBar,
  ffmpegState,
  settings,
  toast,
  fetchedAlbumData,
  setFetchedAlbumData,
  onFocusChange,
  onTracklistToggle,
  onAlbumInfoFetch
}) => {
  const isTrack = !!(result as QobuzTrack).album
  const isArtist = getType(result) === 'artists'

  if (isArtist) return null

  return (
    <div className='flex items-center justify-between gap-4 p-2'>
      {isTrack ? (
        <Button
          size='icon'
          variant='ghost'
          onClick={async () => {
            await createDownloadJob(
              result as QobuzTrack,
              setStatusBar,
              ffmpegState,
              settings,
              toast,
              fetchedAlbumData,
              setFetchedAlbumData
            )
          }}
        >
          <DownloadIcon />
        </Button>
      ) : (
        <DownloadAlbumButton
          variant='ghost'
          size='icon'
          result={result as QobuzAlbum}
          toast={toast}
          setStatusBar={setStatusBar}
          ffmpegState={ffmpegState}
          settings={settings}
          fetchedAlbumData={fetchedAlbumData}
          setFetchedAlbumData={setFetchedAlbumData}
          onOpen={() => onFocusChange(true)}
          onClose={() => onFocusChange(false)}
        />
      )}
      {!isTrack && (
        <Button
          size='icon'
          variant='ghost'
          onClick={async () => {
            onTracklistToggle()
            await onAlbumInfoFetch()
          }}
        >
          <AlignJustifyIcon />
        </Button>
      )}
    </div>
  )
}