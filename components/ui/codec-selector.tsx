import React from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDownIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { SettingsProps } from '@/lib/settings-provider'
import { LOSSLESS_CODECS, APP_CONSTANTS } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface CodecSelectorProps {
  settings: SettingsProps
  setSettings: React.Dispatch<React.SetStateAction<SettingsProps>>
  bitrateInput: React.RefObject<HTMLInputElement | null>
}

export const CodecSelector: React.FC<CodecSelectorProps> = ({
  settings,
  setSettings,
  bitrateInput
}) => {
  return (
    <div className='space-y-2'>
      <p className='font-medium text-sm'>Output Codec</p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant='outline' 
            className={cn('flex gap-2 items-center', settings.rawDownload && 'opacity-50 cursor-not-allowed')}
            disabled={settings.rawDownload}
          >
            <p>{settings.outputCodec}</p>
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start'>
          <DropdownMenuRadioGroup
            value={settings.outputCodec}
            onValueChange={(codec: string) => {
              setSettings((settings) => ({ ...settings, outputCodec: codec as SettingsProps['outputCodec'] }))
              if (!LOSSLESS_CODECS.includes(codec as any)) {
                setSettings((prev) => ({ ...prev, bitrate: APP_CONSTANTS.DEFAULT_BITRATE }))
                if (bitrateInput.current) {
                  bitrateInput.current.value = APP_CONSTANTS.DEFAULT_BITRATE.toString()
                }
              }
            }}
          >
            <DropdownMenuRadioItem value='FLAC'>FLAC (Lossless)</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value='ALAC'>ALAC (Lossless)</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value='WAV'>WAV (Lossless)</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value='MP3'>MP3 (Lossy)</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value='AAC'>AAC (Lossy)</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value='OPUS'>OPUS (Lossy)</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {!LOSSLESS_CODECS.includes(settings.outputCodec as any) && (
        <div className='space-y-2'>
          <p className='font-medium text-sm'>Bitrate (kbps)</p>
          <input
            ref={bitrateInput}
            type='number'
            min={APP_CONSTANTS.MIN_BITRATE}
            max={APP_CONSTANTS.MAX_BITRATE}
            defaultValue={settings.bitrate}
            className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
            placeholder='320'
          />
          <p className='text-xs text-muted-foreground'>
            Recommended: 320 kbps for MP3, 256 kbps for AAC/OPUS
          </p>
        </div>
      )}
    </div>
  )
}