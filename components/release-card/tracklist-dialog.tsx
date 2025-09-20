import React from 'react'
import { Button } from '@/components/ui/button'
import { DownloadIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { createDownloadJob } from '@/lib/download-job'
import DownloadAlbumButton from '@/components/download-album-button'
import { 
  formatTitle, 
  formatArtists, 
  formatDuration, 
  QobuzAlbum, 
  QobuzTrack, 
  FetchedQobuzAlbum 
} from '@/lib/qobuz-dl'
import { SettingsProps } from '@/lib/settings-provider'
import { FFmpegType } from '@/lib/ffmpeg-functions'

interface TracklistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: QobuzAlbum
  album: QobuzAlbum | null
  fetchedAlbumData: FetchedQobuzAlbum | null
  setFetchedAlbumData: React.Dispatch<React.SetStateAction<FetchedQobuzAlbum | null>>
  toast: any
  setStatusBar: (status: any) => void
  ffmpegState: FFmpegType
  settings: SettingsProps
  onClose: () => void
}

export const TracklistDialog: React.FC<TracklistDialogProps> = ({
  open,
  onOpenChange,
  result,
  album,
  fetchedAlbumData,
  setFetchedAlbumData,
  toast,
  setStatusBar,
  ffmpegState,
  settings,
  onClose
}) => {
  const displayAlbum = album || result

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[600px] max-w-[90%] md:max-w-[80%] overflow-hidden'>
        <div className='flex gap-3 overflow-hidden'>
          <div className='relative shrink-0 aspect-square min-w-[100px] min-h-[100px] rounded-sm overflow-hidden'>
            <Skeleton className='absolute aspect-square w-full h-full' />
            {displayAlbum.image?.small && (
              <img
                src={displayAlbum.image.small}
                alt={formatTitle(result)}
                crossOrigin='anonymous'
                className='absolute aspect-square w-full h-full'
              />
            )}
          </div>

          <div className='flex w-full flex-col justify-between overflow-hidden'>
            <div className='space-y-1.5 overflow-visible'>
              <DialogTitle title={formatTitle(displayAlbum)} className='truncate overflow-visible py-0.5 pr-2'>
                {formatTitle(displayAlbum)}
              </DialogTitle>
              <DialogDescription
                title={formatArtists(result)}
                className='truncate overflow-visible'
              >
                {formatArtists(result)}
              </DialogDescription>
            </div>
            <div className='flex items-center w-full justify-between gap-2'>
              <div className='space-y-1.5 w-fit'>
                <DialogDescription className='truncate'>
                  {displayAlbum.tracks_count} {displayAlbum.tracks_count > 1 ? 'tracks' : 'track'} -{' '}
                  {formatDuration(displayAlbum.duration)}
                </DialogDescription>
              </div>
              <DownloadAlbumButton
                result={result}
                toast={toast}
                setStatusBar={setStatusBar}
                ffmpegState={ffmpegState}
                settings={settings}
                fetchedAlbumData={fetchedAlbumData}
                setFetchedAlbumData={setFetchedAlbumData}
                variant='ghost'
                size='icon'
                onClick={onClose}
              />
            </div>
          </div>
        </div>
        <Separator />
        {fetchedAlbumData && (
          <ScrollArea className='max-h-[40vh]'>
            <motion.div initial={{ maxHeight: '0vh' }} animate={{ maxHeight: '40vh' }}>
              <div className='flex flex-col overflow-hidden pr-3'>
                {fetchedAlbumData.tracks.items.map((track: QobuzTrack, index: number) => {
                  track.album = displayAlbum
                  return (
                    <div key={track.id}>
                      <div
                        className={cn(
                          'flex items-center justify-between gap-2 overflow-hidden hover:bg-primary/5 transition-all p-2 rounded group',
                          !track.streamable && 'opacity-50'
                        )}
                      >
                        <div className='gap-2 flex items-center overflow-hidden'>
                          <span className='text-muted-foreground text-sm'>{index + 1}</span>
                          {track.parental_warning && (
                            <p
                              className='text-[10px] bg-primary text-primary-foreground p-1 rounded-[3px] aspect-square w-[18px] h-[18px] shrink-0 text-center justify-center items-center flex font-semibold'
                              title='Explicit'
                            >
                              E
                            </p>
                          )}
                          <p className='truncate font-medium'>{formatTitle(track)}</p>
                        </div>
                        {track.streamable && (
                          <Button
                            title={`Download '${formatTitle(track)}'`}
                            className='md:group-hover:flex md:hidden justify-center aspect-square h-6 w-6 [&_svg]:size-5 hover:bg-transparent'
                            size='icon'
                            variant='ghost'
                            onClick={async () => {
                              await createDownloadJob(track, setStatusBar, ffmpegState, settings, toast)
                              toast({
                                title: `Added '${formatTitle(track)}' to the queue`,
                                description: 'Track has been added to the queue'
                              })
                            }}
                          >
                            <DownloadIcon className='!size-4' />
                          </Button>
                        )}
                      </div>
                      {index < fetchedAlbumData.tracks.items.length - 1 && <Separator />}
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}