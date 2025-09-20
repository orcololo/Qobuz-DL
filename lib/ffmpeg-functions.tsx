import { formatArtists, formatTitle, getAlbum, getFullResImageUrl, QobuzTrack } from './qobuz-dl'
import axios from 'axios'
import { SettingsProps } from './settings-provider'
import { StatusBarProps } from '@/components/status-bar/status-bar'
import { resizeImage } from './utils'

declare const FFmpeg: { createFFmpeg: any; fetchFile: any }

export type FFmpegType = {
  FS: (action: string, filename: string, fileData?: Uint8Array) => Promise<any>
  run: (...args: string[]) => Promise<any>
  isLoaded: () => boolean
  load: ({ signal }: { signal: AbortSignal }) => Promise<any>
}

// FFmpeg concurrency management with single instance and operation queue
class FFmpegQueue {
  private queue: Array<() => Promise<any>>
  private processing: boolean
  private ffmpegInstance: FFmpegType | null

  constructor() {
    this.queue = []
    this.processing = false
    this.ffmpegInstance = null
  }

  async enqueue<T>(operation: (ffmpeg: FFmpegType) => Promise<T>, signal?: AbortSignal): Promise<T> {
    return new Promise((resolve, reject) => {
      const wrappedOperation = async () => {
        try {
          // Ensure FFmpeg is loaded
          if (!this.ffmpegInstance) {
            const { createFFmpeg } = FFmpeg
            this.ffmpegInstance = createFFmpeg({ log: false })
            if (this.ffmpegInstance && !this.ffmpegInstance.isLoaded()) {
              await this.ffmpegInstance.load({ signal: signal || new AbortController().signal })
            }
          }
          
          if (!this.ffmpegInstance) {
            throw new Error('Failed to create FFmpeg instance')
          }
          
          const result = await operation(this.ffmpegInstance)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }

      this.queue.push(wrappedOperation)
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true
    
    while (this.queue.length > 0) {
      const operation = this.queue.shift()!
      try {
        await operation()
      } catch (error) {
        console.error('FFmpeg operation failed:', error)
      }
    }
    
    this.processing = false
  }
}

const ffmpegQueue = new FFmpegQueue()

export const codecMap = {
  FLAC: {
    extension: 'flac',
    codec: 'flac'
  },
  WAV: {
    extension: 'wav',
    codec: 'pcm_s16le'
  },
  ALAC: {
    extension: 'm4a',
    codec: 'alac'
  },
  MP3: {
    extension: 'mp3',
    codec: 'libmp3lame'
  },
  AAC: {
    extension: 'm4a',
    codec: 'aac'
  },
  OPUS: {
    extension: 'opus',
    codec: 'libopus'
  }
}

export async function applyMetadata(
  trackBuffer: ArrayBuffer,
  resultData: QobuzTrack,
  ffmpeg: FFmpegType,
  settings: SettingsProps,
  setStatusBar?: React.Dispatch<React.SetStateAction<StatusBarProps>>,
  albumArt?: ArrayBuffer | false,
  upc?: string,
  signal?: AbortSignal
) {
  // Use the queue-based approach for safe concurrent FFmpeg operations
  return ffmpegQueue.enqueue(async (ffmpegInstance: FFmpegType) => {
    // Generate unique ID for this operation to avoid file conflicts
    const operationId = Math.random().toString(36).substring(2, 15)
    
    const skipRencode =
      (settings.outputQuality != '5' && settings.outputCodec === 'FLAC') ||
      (settings.outputQuality === '5' && settings.outputCodec === 'MP3' && settings.bitrate === 320)
    if (skipRencode && !settings.applyMetadata) {
      return trackBuffer
    }
    const extension = codecMap[settings.outputCodec].extension
    if (!skipRencode) {
      const inputExtension = settings.outputQuality === '5' ? 'mp3' : 'flac'
      if (setStatusBar)
        setStatusBar((prev) => {
          if (prev.processing) {
            return { ...prev, description: 'Re-encoding track...' }
          } else return prev
        })
      await ffmpegInstance.FS('writeFile', `input_${operationId}.${inputExtension}`, new Uint8Array(trackBuffer))
      await ffmpegInstance.run(
        '-i',
        `input_${operationId}.${inputExtension}`,
        '-c:a',
        codecMap[settings.outputCodec].codec,
        settings.bitrate ? '-b:a' : '',
        settings.bitrate ? settings.bitrate + 'k' : '',
        ['OPUS'].includes(settings.outputCodec) ? '-vbr' : '',
        ['OPUS'].includes(settings.outputCodec) ? 'on' : '',
        `output_${operationId}.${extension}`
      )
      trackBuffer = await ffmpegInstance.FS('readFile', `output_${operationId}.${extension}`)
      await ffmpegInstance.FS('unlink', `input_${operationId}.${inputExtension}`)
      await ffmpegInstance.FS('unlink', `output_${operationId}.${extension}`)
    }
  if (!settings.applyMetadata) {
    return trackBuffer
  }
  if (settings.outputCodec === 'WAV') {
    return trackBuffer
  }
  if (setStatusBar) setStatusBar((prev) => ({ ...prev, description: 'Applying metadata...' }))
  const artists = resultData.album.artists === undefined ? [resultData.performer] : resultData.album.artists
  let metadata = `;FFMETADATA1`
  metadata += `\ntitle=${formatTitle(resultData)}`
  if (artists.length > 0) {
    metadata += `\nartist=${formatArtists(resultData)}`
    metadata += `\nalbum_artist=${formatArtists(resultData)}`
  } else {
    metadata += `\nartist=Various Artists`
    metadata += `\nalbum_artist=Various Artists`
  }
  metadata += `\nalbum_artist=${artists[0]?.name || resultData.performer?.name || 'Various Artists'}`
  metadata += `\nalbum=${formatTitle(resultData.album)}`
  metadata += `\ngenre=${resultData.album.genre.name}`
  metadata += `\ndate=${resultData.album.release_date_original}`
  metadata += `\nyear=${new Date(resultData.album.release_date_original).getFullYear()}`
  metadata += `\nlabel=${getAlbum(resultData).label.name}`
  metadata += `\ncopyright=${resultData.copyright}`
  if (resultData.isrc) metadata += `\nisrc=${resultData.isrc}`
  if (upc) metadata += `\nbarcode=${upc}`
  if (resultData.track_number) metadata += `\ntrack=${resultData.track_number}`
  await ffmpegInstance.FS('writeFile', `input_${operationId}.${extension}`, new Uint8Array(trackBuffer))
  const encoder = new TextEncoder()
  await ffmpegInstance.FS('writeFile', `metadata_${operationId}.txt`, encoder.encode(metadata))
  if (!(albumArt === false)) {
    if (!albumArt) {
      const albumArtURL = await resizeImage(
        getFullResImageUrl(resultData),
        settings.albumArtSize,
        settings.albumArtQuality
      )
      if (albumArtURL) {
        albumArt = (await axios.get(albumArtURL, { responseType: 'arraybuffer' })).data
      } else albumArt = false
    }
    if (albumArt)
      await ffmpegInstance.FS(
        'writeFile',
        `albumArt_${operationId}.jpg`,
        new Uint8Array(
          albumArt
            ? albumArt
            : (
                await axios.get(
                  (await resizeImage(
                    getFullResImageUrl(resultData),
                    settings.albumArtSize,
                    settings.albumArtQuality
                  )) as string,
                  { responseType: 'arraybuffer' }
                )
              ).data
        )
      )
  }

  await ffmpegInstance.run(
    '-i',
    `input_${operationId}.${extension}`,
    '-i',
    `metadata_${operationId}.txt`,
    '-map_metadata',
    '1',
    '-codec',
    'copy',
    `secondInput_${operationId}.${extension}`
  )
  if (['WAV', 'OPUS'].includes(settings.outputCodec) || albumArt === false) {
    const output = await ffmpegInstance.FS('readFile', `secondInput_${operationId}.${extension}`)
    ffmpegInstance.FS('unlink', `input_${operationId}.${extension}`)
    ffmpegInstance.FS('unlink', `metadata_${operationId}.txt`)
    ffmpegInstance.FS('unlink', `secondInput_${operationId}.${extension}`)
    return output
  }
  await ffmpegInstance.run(
    '-i',
    `secondInput_${operationId}.${extension}`,
    '-i',
    `albumArt_${operationId}.jpg`,
    '-c',
    'copy',
    '-map',
    '0',
    '-map',
    '1',
    '-disposition:v:0',
    'attached_pic',
    `output_${operationId}.${extension}`
  )
  const output = await ffmpegInstance.FS('readFile', `output_${operationId}.${extension}`)
  ffmpegInstance.FS('unlink', `input_${operationId}.${extension}`)
  ffmpegInstance.FS('unlink', `metadata_${operationId}.txt`)
  ffmpegInstance.FS('unlink', `secondInput_${operationId}.${extension}`)
  ffmpegInstance.FS('unlink', `albumArt_${operationId}.jpg`)
  ffmpegInstance.FS('unlink', `output_${operationId}.${extension}`)
  return output
  }, signal)
}

export async function fixMD5Hash(
  trackBuffer: ArrayBuffer,
  setStatusBar?: React.Dispatch<React.SetStateAction<StatusBarProps>>
): Promise<Blob> {
  return new Promise((resolve) => {
    setStatusBar?.((prev) => ({ ...prev, description: 'Fixing MD5 hash...', progress: 0 }))
    const worker = new Worker('flac/EmsWorkerProxy.js')
    worker.onmessage = function (e) {
      if (e.data && e.data.reply === 'progress') {
        const vals = e.data.values
        if (vals[1]) {
          setStatusBar?.((prev) => ({ ...prev, progress: Math.floor((vals[0] / vals[1]) * 100) }))
        }
      } else if (e.data && e.data.reply === 'done') {
        for (const fileName in e.data.values) {
          resolve(e.data.values[fileName].blob)
        }
      }
    }
    worker.postMessage({
      command: 'encode',
      args: ['input.flac', '-o', 'output.flac'],
      outData: {
        'output.flac': {
          MIME: 'audio/flac'
        }
      },
      fileData: {
        'input.flac': new Uint8Array(trackBuffer)
      }
    })
  })
}

export function createFFmpeg() {
  if (typeof FFmpeg === 'undefined') return null
  const { createFFmpeg } = FFmpeg
  const ffmpeg = createFFmpeg({ log: false })
  return ffmpeg
}

export async function loadFFmpeg(ffmpeg: FFmpegType, signal: AbortSignal) {
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load({ signal })
    return ffmpeg
  }
}
