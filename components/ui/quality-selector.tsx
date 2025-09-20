import React from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDownIcon, DotIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { SettingsProps } from '@/lib/settings-provider'
import { QUALITY_MAP, LOSSLESS_CODECS } from '@/lib/constants'

interface QualitySelectorProps {
  settings: SettingsProps
  setSettings: React.Dispatch<React.SetStateAction<SettingsProps>>
  disabled?: boolean
}

export const QualitySelector: React.FC<QualitySelectorProps> = ({
  settings,
  setSettings,
  disabled = false
}) => {
  return (
    <div className='space-y-2'>
      <p className='font-medium text-sm'>Output Quality</p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant='outline' 
            className={`flex gap-2 items-center ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={disabled}
          >
            <div className='flex items-center gap-1'>
              <p>{QUALITY_MAP[settings.outputQuality as keyof typeof QUALITY_MAP][0]}-bit</p>
              <DotIcon className='min-h-[24px] min-w-[24px]' size={24} />
              <p>{QUALITY_MAP[settings.outputQuality as keyof typeof QUALITY_MAP][1]} kHz</p>
            </div>
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start'>
          <DropdownMenuRadioGroup
            value={settings.outputQuality}
            onValueChange={(quality: string) => {
              setSettings((prev) => ({
                ...prev,
                outputQuality: quality as SettingsProps['outputQuality']
              }))
            }}
          >
            <DropdownMenuRadioItem value='27'>Hi-Res 24-bit/192 kHz</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value='7'>Hi-Res 24-bit/96 kHz</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value='6'>CD Quality 16-bit/44.1 kHz</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value='5'>MP3 320 kbps</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {!LOSSLESS_CODECS.includes(settings.outputCodec as any) && (
        <p className='text-xs text-muted-foreground'>
          Note: Lossy formats will be limited to their maximum quality regardless of source quality
        </p>
      )}
    </div>
  )
}