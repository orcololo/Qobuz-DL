import axios, { AxiosError } from 'axios'
import saveAs from 'file-saver'
import { applyMetadata, codecMap, FFmpegType, fixMD5Hash, loadFFmpeg } from './ffmpeg-functions'
import { artistReleaseCategories } from '@/components/artist-dialog'
import { cleanFileName, formatBytes, formatCustomTitle, resizeImage, getArtistFolderName, getAlbumFolderName } from './utils'
import { createJob, setMaxConcurrentJobs } from './status-bar/jobs'
import { Disc3Icon, DiscAlbumIcon } from 'lucide-react'
import {
  FetchedQobuzAlbum,
  formatTitle,
  getFullResImageUrl,
  QobuzAlbum,
  QobuzArtistResults,
  QobuzTrack
} from './qobuz-dl'
import { SettingsProps } from './settings-provider'
import { StatusBarProps } from '@/components/status-bar/status-bar'
import { ToastAction } from '@/components/ui/toast'
import { zipSync } from 'fflate'
import type { RetryQueueProps, RetryReason } from './status-bar/context'
import { APP_CONSTANTS, RETRY_REASONS } from './constants'
import { uploadFileWithProgress, ApiError } from './api-utils'

// Helper function to handle retryable errors
const handleRetryableError = (
  result: QobuzAlbum | QobuzTrack,
  settings: SettingsProps,
  fetchedAlbumData: FetchedQobuzAlbum | null | undefined,
  retryQueue: RetryQueueProps | undefined,
  reason: RetryReason,
  errorMessage: string,
  autoRetry: boolean = true
) => {
  if (retryQueue) {
    retryQueue.addItem({
      result,
      settings,
      fetchedAlbumData,
      reason,
      maxAttempts: autoRetry ? APP_CONSTANTS.MAX_AUTO_RETRIES : APP_CONSTANTS.MANUAL_RETRY_ATTEMPTS,
      lastError: errorMessage,
      autoRetry
    })
  }
}

// Helper function to save files directly to downloads folder
async function saveFileToDownloads(fileBuffer: ArrayBuffer, artistName: string, albumName: string, fileName: string) {
  try {
    const formData = new FormData()
    const blob = new Blob([fileBuffer])
    formData.append('file', blob, fileName)
    formData.append('artistName', artistName)
    formData.append('albumName', albumName)
    formData.append('fileName', fileName)
    
    await uploadFileWithProgress(formData, (percent) => {
      console.log(`Upload progress: ${percent}%`)
    })
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.originalError?.code === 'ECONNABORTED') {
        throw new Error('Upload timeout - file may be too large')
      }
      if (error.message?.includes('out of memory')) {
        throw new Error('File too large to process')
      }
    }
    throw error
  }
}

export const createDownloadJob = async (
  result: QobuzAlbum | QobuzTrack,
  setStatusBar: React.Dispatch<React.SetStateAction<StatusBarProps>>,
  ffmpegState: FFmpegType,
  settings: SettingsProps,
  toast: (toast: any) => void,
  fetchedAlbumData?: FetchedQobuzAlbum | null,
  setFetchedAlbumData?: React.Dispatch<React.SetStateAction<FetchedQobuzAlbum | null>>,
  retryQueue?: RetryQueueProps
) => {
  // Update max concurrent jobs from settings
  setMaxConcurrentJobs(settings.maxConcurrentDownloads)
  
  if ((result as QobuzTrack).album) {
    const formattedTitle = formatCustomTitle(settings.trackName, result as QobuzTrack)
    await createJob(setStatusBar, formattedTitle, Disc3Icon, async () => {
      return new Promise(async (resolve) => {
        try {
          const controller = new AbortController()
          const signal = controller.signal
          let cancelled = false
          setStatusBar((prev) => ({
            ...prev,
            progress: 0,
            title: `Downloading ${formatTitle(result)}`,
            description: `Loading FFmpeg`,
            onCancel: () => {
              cancelled = true
              controller.abort()
            }
          }))
          if (
            !settings.rawDownload &&
            (settings.applyMetadata ||
            !(
              (settings.outputQuality === '27' && settings.outputCodec === 'FLAC') ||
              (settings.bitrate === 320 && settings.outputCodec === 'MP3')
            ))
          ) {
            await loadFFmpeg(ffmpegState, signal)
          } else if (settings.rawDownload) {
            // Raw downloads still need FFmpeg for metadata application
            await loadFFmpeg(ffmpegState, signal)
          }
          
          // Quality fallback: try requested quality first, then fallback to lower qualities
          const qualityFallbackOrder = ['27', '7', '6', '5'] as const
          const startIndex = qualityFallbackOrder.indexOf(settings.outputQuality as any)
          const qualitiesAttempt = startIndex >= 0 ? qualityFallbackOrder.slice(startIndex) : [settings.outputQuality]
          
          let APIResponse: any
          let actualQuality = settings.outputQuality
          let trackURL = ''
          
          for (const quality of qualitiesAttempt) {
            try {
              setStatusBar((prev) => ({ ...prev, description: `Trying quality ${quality}...` }))
              
              APIResponse = await axios.get('/api/download-music', {
                params: { track_id: (result as QobuzTrack).id, quality },
                signal
              })
              
              console.log('📊 Internal API Full Response Data - DownloadMusic:', {
                endpoint: '/api/download-music',
                track_id: (result as QobuzTrack).id,
                quality,
                responseData: APIResponse.data,
                timestamp: new Date().toISOString()
              })
              
              trackURL = APIResponse.data.data.url
              actualQuality = quality
              break
            } catch (error: any) {
              if (quality === qualitiesAttempt[qualitiesAttempt.length - 1]) {
                // If this is the last quality to try, throw the error
                throw error
              }
              // Otherwise, continue to next quality
              console.log(`Quality ${quality} failed, trying next...`)
            }
          }
          
          if (actualQuality !== settings.outputQuality) {
            setStatusBar((prev) => ({ 
              ...prev, 
              description: `Using quality ${actualQuality} (${settings.outputQuality} not available)` 
            }))
            
            // Show toast notification about quality fallback
            const qualityNames = {
              '27': '24-bit 192kHz',
              '7': '24-bit 96kHz', 
              '6': '16-bit 44.1kHz',
              '5': '320kbps MP3'
            }
            
            toast({
              title: "Quality Fallback",
              description: `Requested ${qualityNames[settings.outputQuality as keyof typeof qualityNames]} not available. Downloaded as ${qualityNames[actualQuality as keyof typeof qualityNames]}.`,
              duration: 5000,
            })
          }
          
          setStatusBar((prev) => ({ ...prev, description: 'Fetching track size...' }))
          const fileSizeResponse = await axios.head(trackURL, { signal })
          const fileSize = fileSizeResponse.headers['content-length']
          
          const response = await axios.get(trackURL, {
            responseType: 'arraybuffer',
            onDownloadProgress: (progressEvent) => {
              setStatusBar((statusbar) => {
                if (statusbar.processing && !cancelled)
                  return {
                    ...statusbar,
                    progress: Math.floor((progressEvent.loaded / fileSize) * 100),
                    description: `${formatBytes(progressEvent.loaded)} / ${formatBytes(fileSize)}`
                  }
                else return statusbar
              })
            },
            signal
          })
          
          setStatusBar((prev) => ({ ...prev, description: settings.rawDownload ? `Applying metadata...` : `Applying metadata...`, progress: 100 }))
          const inputFile = response.data
          let outputFile: ArrayBuffer
          
          if (settings.rawDownload) {
            // For raw downloads, apply metadata but skip format conversion
            // Use the actual quality that was successfully fetched
            const rawSettings: SettingsProps = {
              ...settings,
              outputQuality: actualQuality as '27' | '7' | '6' | '5',
              outputCodec: (actualQuality === '5' ? 'MP3' : 'FLAC') as 'FLAC' | 'WAV' | 'ALAC' | 'MP3' | 'AAC' | 'OPUS',
              bitrate: actualQuality === '5' ? 320 : undefined,
              applyMetadata: true // Always apply metadata in raw mode
            }
            outputFile = await applyMetadata(inputFile, result as QobuzTrack, ffmpegState, rawSettings, setStatusBar, undefined, undefined, signal)
          } else {
            // Apply metadata and conversion as usual
            outputFile = await applyMetadata(inputFile, result as QobuzTrack, ffmpegState, settings, setStatusBar, undefined, undefined, signal)
            if (settings.outputCodec === 'FLAC' && settings.fixMD5) {
              const fixedBlob = await fixMD5Hash(outputFile, setStatusBar)
              outputFile = await fixedBlob.arrayBuffer()
            }
          }
          
          const objectURL = URL.createObjectURL(new Blob([outputFile]))
          
          // Determine file extension based on raw download setting
          let fileExtension: string
          if (settings.rawDownload) {
            // Use original format based on actual quality downloaded
            fileExtension = actualQuality === '5' ? 'mp3' : 'flac'
          } else {
            fileExtension = codecMap[settings.outputCodec].extension
          }
          
          const title = formattedTitle + '.' + fileExtension
          
          // Create folder structure with artist name and album name
          const artistFolder = getArtistFolderName(result as QobuzTrack)
          const albumFolder = getAlbumFolderName(result as QobuzTrack)
          
          if (settings.createZip) {
            // Create ZIP file with folder structure
            const folderPath = `${artistFolder}/${albumFolder}/`
            const zipFiles = {
              [folderPath + cleanFileName(title)]: new Uint8Array(outputFile)
            } as { [key: string]: Uint8Array }
            
            const zippedFile = zipSync(zipFiles, { level: 0 })
            const zipBlob = new Blob([zippedFile as BlobPart], { type: 'application/zip' })
            const zipObjectURL = URL.createObjectURL(zipBlob)
            
            const audioElement = document.createElement('audio')
            audioElement.id = `track_${result.id}`
            audioElement.src = objectURL
            audioElement.onloadedmetadata = function () {
              if (audioElement.duration >= result.duration) {
                proceedDownload(zipObjectURL, `${artistFolder} - ${albumFolder}.zip`)
                URL.revokeObjectURL(objectURL)
                resolve()
              } else {
                toast({
                  title: 'Error',
                  description: `Qobuz provided a file shorter than expected for "${title}". This can indicate the file being a sample track rather than the full track`,
                  duration: Infinity,
                  action: (
                    <ToastAction
                      altText='Copy Stack'
                      onClick={() => {
                        proceedDownload(zipObjectURL, `${artistFolder} - ${albumFolder}.zip`)
                        URL.revokeObjectURL(objectURL)
                      }}
                    >
                      Download anyway
                    </ToastAction>
                  )
                })
                resolve()
              }
            }
            document.body.append(audioElement)
          } else {
            // Save file directly to downloads folder
            const audioElement = document.createElement('audio')
            audioElement.id = `track_${result.id}`
            audioElement.src = objectURL
            audioElement.onloadedmetadata = async function () {
              if (audioElement.duration >= result.duration) {
                await saveFileToDownloads(outputFile, artistFolder, albumFolder, cleanFileName(title))
                toast({
                  title: 'Success',
                  description: `Track saved to downloads/${artistFolder}/${albumFolder}/`
                })
                URL.revokeObjectURL(objectURL)
                resolve()
              } else {
                // Add to retry queue for auto-retry
                const errorMsg = `Qobuz provided a file shorter than expected for "${title}". This can indicate the file being a sample track rather than the full track`
                handleRetryableError(
                  result as QobuzTrack,
                  settings,
                  fetchedAlbumData,
                  retryQueue,
                  'shorter_than_expected',
                  errorMsg,
                  true
                )
                
                toast({
                  title: 'Error - Added to Retry Queue',
                  description: errorMsg,
                  duration: 8000,
                  action: (
                    <ToastAction
                      altText='Download Anyway'
                      onClick={async () => {
                        await saveFileToDownloads(outputFile, artistFolder, albumFolder, cleanFileName(title))
                        toast({
                          title: 'Success',
                          description: `Track saved to downloads/${artistFolder}/${albumFolder}/`
                        })
                        URL.revokeObjectURL(objectURL)
                      }}
                    >
                      Download anyway
                    </ToastAction>
                  )
                })
                
                // Auto-retry after a short delay
                setTimeout(async () => {
                  if (retryQueue && retryQueue.items.some(item => 
                    item.result.id === result.id && item.attempts < item.maxAttempts
                  )) {
                    const retryItem = retryQueue.items.find(item => item.result.id === result.id)
                    if (retryItem) {
                      await retryQueue.retryItem(retryItem.id)
                    }
                  }
                }, 2000)
                
                resolve()
              }
            }
            document.body.append(audioElement)
          }
        } catch (e) {
          if (e instanceof AxiosError && e.code === 'ERR_CANCELED') resolve()
          else {
            // Determine if this is a retryable error
            let reason: RetryReason = 'unknown_error'
            let autoRetry = false
            
            if (e instanceof AxiosError) {
              if (e.code === 'ECONNABORTED' || e.code === 'NETWORK_ERR') {
                reason = 'network_error'
                autoRetry = true
              }
            } else if (e instanceof Error && e.message.includes('quality')) {
              reason = 'quality_unavailable'
              autoRetry = true
            } else if (e instanceof Error && e.message.includes('processing')) {
              reason = 'processing_error'
              autoRetry = true
            }
            
            // Add to retry queue if it's a retryable error
            if (autoRetry && retryQueue) {
              handleRetryableError(
                result as QobuzTrack,
                settings,
                fetchedAlbumData,
                retryQueue,
                reason,
                e instanceof Error ? e.message : 'Unknown error occurred',
                autoRetry
              )
            }
            
            toast({
              title: autoRetry ? 'Error - Added to Retry Queue' : 'Error',
              description: e instanceof Error ? e.message : 'An unknown error occurred',
              action: (
                <ToastAction altText='Copy Stack' onClick={() => navigator.clipboard.writeText((e as Error).stack!)}>
                  Copy Stack
                </ToastAction>
              )
            })
            resolve()
          }
        }
      })
    })
  } else {
    const formattedZipTitle = formatCustomTitle(settings.zipName, result as QobuzAlbum)

    await createJob(setStatusBar, formattedZipTitle, DiscAlbumIcon, async () => {
      return new Promise(async (resolve) => {
        try {
          const controller = new AbortController()
          const signal = controller.signal
          let cancelled = false
          setStatusBar((prev) => ({
            ...prev,
            progress: 0,
            title: `Downloading ${formatTitle(result)}`,
            description: `Loading FFmpeg...`,
            onCancel: () => {
              cancelled = true
              controller.abort()
            }
          }))
          if (
            settings.applyMetadata ||
            !(
              (settings.outputQuality === '27' && settings.outputCodec === 'FLAC') ||
              (settings.bitrate === 320 && settings.outputCodec === 'MP3')
            )
          )
            await loadFFmpeg(ffmpegState, signal)
          setStatusBar((prev) => ({ ...prev, description: 'Fetching album data...' }))
          if (!fetchedAlbumData) {
            const albumDataResponse = await axios.get('/api/get-album', {
              params: { album_id: (result as QobuzAlbum).id },
              signal
            })
            
            console.log('📊 Internal API Full Response Data - GetAlbum (Download):', {
              endpoint: '/api/get-album',
              album_id: (result as QobuzAlbum).id,
              responseData: albumDataResponse.data,
              timestamp: new Date().toISOString()
            })
            
            if (setFetchedAlbumData) {
              setFetchedAlbumData(albumDataResponse.data.data)
            }
            fetchedAlbumData = albumDataResponse.data.data
          }
          const albumTracks = fetchedAlbumData!.tracks.items.map((track: QobuzTrack) => ({
            ...track,
            album: fetchedAlbumData
          })) as QobuzTrack[]
          let totalAlbumSize = 0
          const albumUrls = [] as string[]
          setStatusBar((prev) => ({ ...prev, description: 'Fetching album size...' }))
          let currentDisk = 1
          let trackOffset = 0
          for (const [index, track] of albumTracks.entries()) {
            if (track.streamable) {
              const fileURLResponse = await axios.get('/api/download-music', {
                params: { track_id: track.id, quality: settings.outputQuality },
                signal
              })
              
              console.log('📊 Internal API Full Response Data - DownloadMusic (Album):', {
                endpoint: '/api/download-music',
                track_id: track.id,
                responseData: fileURLResponse.data,
                timestamp: new Date().toISOString()
              })
              
              const trackURL = fileURLResponse.data.data.url
              if (!(currentDisk === track.media_number)) {
                trackOffset = albumUrls.length
                currentDisk = track.media_number
                albumUrls.push(trackURL)
              } else albumUrls[track.track_number + trackOffset - 1] = trackURL
              const fileSizeResponse = await axios.head(trackURL, { signal })
              setStatusBar((statusBar) => ({ ...statusBar, progress: (100 / albumTracks.length) * (index + 1) }))
              const fileSize = parseInt(fileSizeResponse.headers['content-length'])
              totalAlbumSize += fileSize
            }
          }
          const trackBuffers = [] as ArrayBuffer[]
          let totalBytesDownloaded = 0
          setStatusBar((statusBar) => ({ ...statusBar, progress: 0, description: `Fetching album art...` }))
          const albumArtURL = await resizeImage(
            getFullResImageUrl(fetchedAlbumData!),
            settings.albumArtSize,
            settings.albumArtQuality
          )
          
          console.log('🖼️ Album Art Download:', {
            url: albumArtURL,
            album_id: (result as QobuzAlbum).id,
            timestamp: new Date().toISOString()
          })
          
          const albumArt = albumArtURL ? (await axios.get(albumArtURL, { responseType: 'arraybuffer' })).data : false
          
          for (const [index, url] of albumUrls.entries()) {
            if (url) {
              console.log('📥 Album Track Content Download:', {
                url: url,
                trackIndex: index + 1,
                totalTracks: albumUrls.length,
                album_id: (result as QobuzAlbum).id,
                timestamp: new Date().toISOString()
              })
              
              const response = await axios.get(url, {
                responseType: 'arraybuffer',
                onDownloadProgress: (progressEvent) => {
                  if (totalBytesDownloaded + progressEvent.loaded < totalAlbumSize)
                    setStatusBar((statusBar) => {
                      if (statusBar.processing && !cancelled)
                        return {
                          ...statusBar,
                          progress: Math.floor(((totalBytesDownloaded + progressEvent.loaded) / totalAlbumSize) * 100),
                          description: `${formatBytes(totalBytesDownloaded + progressEvent.loaded)} / ${formatBytes(totalAlbumSize)}`
                        }
                      else return statusBar
                    })
                },
                signal
              })
              await new Promise((resolve) => setTimeout(resolve, 100))
              totalBytesDownloaded += response.data.byteLength
              const inputFile = response.data
              let outputFile = await applyMetadata(
                inputFile,
                albumTracks[index],
                ffmpegState,
                settings,
                undefined,
                albumArt,
                fetchedAlbumData!.upc,
                signal
              )
              if (settings.outputCodec === 'FLAC' && settings.fixMD5)
                outputFile = await (await fixMD5Hash(outputFile)).arrayBuffer()
              trackBuffers[index] = outputFile
            }
          }
          setStatusBar((statusBar) => ({ ...statusBar, progress: 0, description: settings.createZip ? `Zipping album...` : `Saving album files...` }))
          await new Promise((resolve) => setTimeout(resolve, 500))
          
          // Create folder structure with artist name and album name
          const artistFolder = getArtistFolderName(result as QobuzAlbum)
          const albumFolder = getAlbumFolderName(result as QobuzAlbum)
          
          if (settings.createZip) {
            // Create ZIP file
            const folderPath = `${artistFolder}/${albumFolder}/`
            
            const zipFiles = {
              [folderPath + 'cover.jpg']: new Uint8Array(albumArt),
              ...trackBuffers.reduce(
                (acc, buffer, index) => {
                  if (buffer) {
                    const fileName = `${formatCustomTitle(settings.trackName, albumTracks[index])}.${codecMap[settings.outputCodec].extension}`

                    acc[folderPath + cleanFileName(fileName)] = new Uint8Array(buffer)
                  }
                  return acc
                },
                {} as { [key: string]: Uint8Array }
              )
            } as { [key: string]: Uint8Array }
            if (albumArt === false) delete zipFiles[folderPath + 'cover.jpg']
            const zippedFile = zipSync(zipFiles, { level: 0 })
            const zipBlob = new Blob([zippedFile as BlobPart], { type: 'application/zip' })
            setStatusBar((prev) => ({ ...prev, progress: 100 }))
            const objectURL = URL.createObjectURL(zipBlob)
            saveAs(objectURL, `${artistFolder} - ${albumFolder}.zip`)
            setTimeout(() => {
              URL.revokeObjectURL(objectURL)
            }, 100)
          } else {
            // Save files directly to downloads folder
            try {
              // Save cover art if available
              if (albumArt) {
                await saveFileToDownloads(albumArt, artistFolder, albumFolder, 'cover.jpg')
              }
              
              // Save each track
              for (let index = 0; index < trackBuffers.length; index++) {
                const buffer = trackBuffers[index]
                if (buffer) {
                  const fileName = `${formatCustomTitle(settings.trackName, albumTracks[index])}.${codecMap[settings.outputCodec].extension}`
                  await saveFileToDownloads(buffer, artistFolder, albumFolder, cleanFileName(fileName))
                  setStatusBar((prev) => ({ ...prev, progress: Math.floor(((index + 1) / trackBuffers.length) * 100) }))
                }
              }
              
              toast({
                title: 'Success',
                description: `Album saved to downloads/${artistFolder}/${albumFolder}/`
              })
            } catch (error) {
              console.error('Failed to save album files:', error)
              toast({
                title: 'Error',
                description: 'Failed to save some album files to downloads folder',
                action: (
                  <ToastAction altText='Copy Stack' onClick={() => navigator.clipboard.writeText((error as Error).stack!)}>
                    Copy Stack
                  </ToastAction>
                )
              })
            }
          }
          resolve()
        } catch (e) {
          if (e instanceof AxiosError && e.code === 'ERR_CANCELED') resolve()
          else {
            toast({
              title: 'Error',
              description: e instanceof Error ? e.message : 'An unknown error occurred',
              action: (
                <ToastAction altText='Copy Stack' onClick={() => navigator.clipboard.writeText((e as Error).stack!)}>
                  Copy Stack
                </ToastAction>
              )
            })
            resolve()
          }
        }
      })
    })
  }
}

function proceedDownload(objectURL: string, title: string) {
  saveAs(objectURL, title)
  setTimeout(() => {
    URL.revokeObjectURL(objectURL)
  }, 100)
}

export async function downloadArtistDiscography(
  artistResults: QobuzArtistResults,
  setArtistResults: React.Dispatch<React.SetStateAction<QobuzArtistResults | null>>,
  fetchMore: (searchField: any, artistResults: QobuzArtistResults) => Promise<void>,
  type: 'album' | 'epSingle' | 'live' | 'compilation' | 'all',
  setStatusBar: React.Dispatch<React.SetStateAction<StatusBarProps>>,
  settings: SettingsProps,
  toast: (toast: any) => void,
  ffmpegState: FFmpegType
) {
  let types: ('album' | 'epSingle' | 'live' | 'compilation')[] = []
  if (type === 'all') types = ['album', 'epSingle', 'live', 'compilation']
  else types = [type]
  for (const type of types) {
    while (artistResults.artist.releases[type].has_more) {
      await fetchMore(type, artistResults)
      artistResults = (await loadArtistResults(setArtistResults)) as QobuzArtistResults
    }
    for (const release of artistResults.artist.releases[type].items) {
      await createDownloadJob(release, setStatusBar, ffmpegState, settings, toast)
    }
  }
  toast({
    title: `Added all ${artistReleaseCategories.find((category) => category.value === type)?.label ?? 'releases'} by '${artistResults.artist.name.display}'`,
    description: 'All releases have been added to the queue'
  })
}

export async function loadArtistResults(
  setArtistResults: React.Dispatch<React.SetStateAction<QobuzArtistResults | null>>
): Promise<QobuzArtistResults | null> {
  return new Promise((resolve) => {
    setArtistResults((prev: QobuzArtistResults | null) => (resolve(prev), prev))
  })
}
