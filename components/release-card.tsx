import ArtistDialog from './artist-dialog'
import React, { useEffect, useState } from 'react'
import { motion, useAnimation } from 'motion/react'
import {
  FetchedQobuzAlbum,
  formatTitle,
  getAlbum,
  getFullAlbumInfo,
  getType,
  QobuzAlbum,
  QobuzArtist,
  QobuzTrack
} from '@/lib/qobuz-dl'
import { useFFmpeg } from '@/lib/ffmpeg-provider'
import { useSettings } from '@/lib/settings-provider'
import { useStatusBar } from '@/lib/status-bar/context'
import { useToast } from '@/hooks/use-toast'
import { CardOverlay, CardActions, CardImage, CardContent, TracklistDialog } from './release-card/index'

const ReleaseCard = ({
  result,
  resolvedTheme,
  ref,
  showArtistDialog
}: {
  result: QobuzAlbum | QobuzTrack | QobuzArtist
  resolvedTheme: string
  ref?: React.Ref<HTMLDivElement>
  showArtistDialog?: boolean
}) => {
  if (typeof showArtistDialog === 'undefined') showArtistDialog = true
  const { ffmpegState } = useFFmpeg()
  const { setStatusBar } = useStatusBar()
  const { settings } = useSettings()

  const [openTracklist, setOpenTracklist] = useState(false)
  const [fetchedAlbumData, setFetchedAlbumData] = useState<FetchedQobuzAlbum | null>(null)
  const [focusCard, setFocusCard] = useState(false)
  const [openArtistDialog, setOpenArtistDialog] = useState(false)

  const { toast } = useToast()

  const album = getAlbum(result) || null

  const [imageLoaded, setImageLoaded] = useState(false)
  const imageAnimationControls = useAnimation()

  const artist = (result as QobuzAlbum).artist ?? (result as QobuzTrack).performer ?? (result as QobuzTrack).composer

  useEffect(() => {
    if (imageLoaded) imageAnimationControls.start({ scale: 1 })
  }, [imageLoaded, imageAnimationControls])

  const handleArtistClick = () => {
    setOpenArtistDialog(true)
  }

  const handleTracklistToggle = () => {
    setOpenTracklist(!openTracklist)
  }

  const handleAlbumInfoFetch = async () => {
    await getFullAlbumInfo(fetchedAlbumData, setFetchedAlbumData, result as QobuzAlbum)
  }

  return (
    <div className='space-y-2' title={formatTitle(result)} ref={ref || undefined}>
      <div className='relative w-full aspect-square group select-none rounded-sm overflow-hidden'>
        <CardOverlay
          result={result}
          album={album}
          resolvedTheme={resolvedTheme}
          focusCard={focusCard}
          showArtistDialog={showArtistDialog}
          onArtistClick={handleArtistClick}
        >
          {getType(result) !== 'artists' && (
            <CardActions
              result={result as QobuzAlbum | QobuzTrack}
              setStatusBar={setStatusBar}
              ffmpegState={ffmpegState}
              settings={settings}
              toast={toast}
              fetchedAlbumData={fetchedAlbumData}
              setFetchedAlbumData={setFetchedAlbumData}
              onFocusChange={setFocusCard}
              onTracklistToggle={handleTracklistToggle}
              onAlbumInfoFetch={handleAlbumInfoFetch}
            />
          )}
        </CardOverlay>
        
        <CardImage
          result={result}
          album={album}
          imageLoaded={imageLoaded}
          focusCard={focusCard}
          imageAnimationControls={imageAnimationControls}
          onImageLoad={() => setImageLoaded(true)}
        />
      </div>
      
      <CardContent result={result} />
      
      {getType(result) === 'artists' && (
        <ArtistDialog open={openArtistDialog} onOpenChange={setOpenArtistDialog} artist={result as QobuzArtist} />
      )}
      
      {getType(result) !== 'artists' && (
        <TracklistDialog
          open={openTracklist}
          onOpenChange={setOpenTracklist}
          result={result as QobuzAlbum}
          album={album}
          fetchedAlbumData={fetchedAlbumData}
          setFetchedAlbumData={setFetchedAlbumData}
          toast={toast}
          setStatusBar={setStatusBar}
          ffmpegState={ffmpegState}
          settings={settings}
          onClose={() => setOpenTracklist(false)}
        />
      )}
      
      {getType(result) !== 'artists' && showArtistDialog && (
        <ArtistDialog open={openArtistDialog} onOpenChange={setOpenArtistDialog} artist={artist} />
      )}
    </div>
  )
}

export default ReleaseCard