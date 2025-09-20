'use client'
import React, { useEffect, useRef, useState } from 'react'
import { Button } from './button'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronDownIcon, DotIcon, InfoIcon, SettingsIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from './input'
import { ModeToggle } from '../mode-toggle'
import { nameVariables, SettingsProps, useSettings } from '@/lib/settings-provider'
import { Separator } from './separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Slider } from './slider'
import { LOSSLESS_CODECS, QUALITY_MAP, APP_CONSTANTS } from '@/lib/constants'
import { QualitySelector } from './quality-selector'
import { CodecSelector } from './codec-selector'
import { NamingSettings } from './naming-settings'

const SettingsForm = () => {
  const { settings, setSettings, resetSettings } = useSettings()

  const [open, setOpen] = useState(false)

  const bitrateInput = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open && bitrateInput.current) {
      let numberInput = parseInt(bitrateInput.current.value)
      if (isNaN(numberInput)) numberInput = APP_CONSTANTS.DEFAULT_BITRATE
      if (numberInput > APP_CONSTANTS.MAX_BITRATE) numberInput = APP_CONSTANTS.DEFAULT_BITRATE
      if (numberInput < APP_CONSTANTS.MIN_BITRATE) numberInput = APP_CONSTANTS.DEFAULT_BITRATE
      setSettings((prev) => ({ ...prev, bitrate: numberInput || APP_CONSTANTS.DEFAULT_BITRATE }))
    }
  }, [open, setSettings])

  return (
    <Sheet open={open} onOpenChange={setOpen} modal={true}>
      <Button
        variant='outline'
        size='icon'
        onClick={() => {
          setOpen(true)
        }}
      >
        <SettingsIcon />
      </Button>
      <SheetContent className='flex flex-col gap-4 overflow-hidden'>
        <div className='flex flex-col gap-4 pt-4 h-full overflow-y-scroll scrollbar-hide'>
          <SheetHeader>
            <div className='flex flex-col my-1'>
              <SheetTitle>Theme</SheetTitle>
              <SheetDescription>Change the way {process.env.NEXT_PUBLIC_APPLICATION_NAME} looks</SheetDescription>
            </div>
            <ModeToggle />
          </SheetHeader>
          <Separator />
          <SheetHeader>
            <div className='flex flex-col my-1'>
              <SheetTitle>Background</SheetTitle>
              <SheetDescription>Change the background of {process.env.NEXT_PUBLIC_APPLICATION_NAME}</SheetDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' className='flex gap-2 items-center'>
                  <p className='capitalize'>{settings.particles ? 'Particles' : 'Solid Color'}</p>
                  <ChevronDownIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start'>
                <DropdownMenuRadioGroup
                  value={settings.particles ? 'particles' : 'solid color'}
                  onValueChange={(value: string) => {
                    setSettings((prev) => ({ ...prev, particles: value === 'particles' }))
                  }}
                >
                  <DropdownMenuRadioItem value='particles'>Particles</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value='solid color'>Solid Color</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SheetHeader>
          <Separator />
          <SheetHeader className='space-y-4'>
            <div className='flex flex-col my-1'>
              <SheetTitle>Output Settings</SheetTitle>
              <SheetDescription>Change the way your music is saved</SheetDescription>
            </div>
            
            <NamingSettings settings={settings} setSettings={setSettings} />
            
            <CodecSelector settings={settings} setSettings={setSettings} bitrateInput={bitrateInput} />
            
            <QualitySelector 
              settings={settings} 
              setSettings={setSettings} 
              disabled={settings.rawDownload}
            />
          </SheetHeader>
          <Separator />
          <SheetHeader>
            <div className='flex items-center gap-2'>
              <div className='flex flex-col'>
                <p className='font-medium'>Fix MD5 Hash</p>
                <p className='text-xs text-muted-foreground'>
                  If enabled (default), MD5 hashes will be fixed, improving compatiablity with old software. This will
                  take longer to download.
                </p>
              </div>
              <Checkbox
                checked={settings.fixMD5}
                onCheckedChange={(checked: boolean) => setSettings((settings) => ({ ...settings, fixMD5: checked }))}
              />
            </div>
          </SheetHeader>
          <Separator />
          <SheetHeader>
            <div className='flex items-center gap-2'>
              <div className='flex flex-col'>
                <p className='font-medium'>Create ZIP files</p>
                <p className='text-xs text-muted-foreground'>
                  If enabled, downloads will be packaged as ZIP files. If disabled, files will be saved directly to the downloads folder.
                </p>
              </div>
              <Checkbox
                checked={settings.createZip}
                onCheckedChange={(checked: boolean) => setSettings((settings) => ({ ...settings, createZip: checked }))}
              />
            </div>
          </SheetHeader>
          <Separator />
          <SheetHeader>
            <div className='flex items-center gap-2'>
              <div className='flex flex-col'>
                <p className='font-medium'>Raw download mode</p>
                <p className='text-xs text-muted-foreground'>
                  If enabled, files will be downloaded in their original format with metadata applied but without format conversion. Faster downloads while preserving quality and tags.
                </p>
              </div>
              <Checkbox
                checked={settings.rawDownload}
                onCheckedChange={(checked: boolean) => setSettings((settings) => ({ ...settings, rawDownload: checked }))}
              />
            </div>
          </SheetHeader>
          {settings.rawDownload && (
            <div className='bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mx-6'>
              <p className='text-sm font-medium text-blue-800 dark:text-blue-200'>Raw Download Mode Active</p>
              <p className='text-xs text-blue-700 dark:text-blue-300 mt-1'>
                Files will be downloaded in original format (FLAC for Hi-Res, MP3 for 320kbps) with metadata applied but without format conversion. 
                Quality fallback is enabled - lower qualities will be tried if requested quality is unavailable.
              </p>
            </div>
          )}
          <Separator />
          <SheetHeader>
            <div className='flex flex-col items-center gap-2'>
              <div className='flex flex-col'>
                <p className='font-medium'>Max Concurrent Downloads</p>
                <p className='text-xs text-muted-foreground'>
                  Maximum number of downloads that can run simultaneously. Higher values may improve speed but use more bandwidth and resources.
                </p>
              </div>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[settings.maxConcurrentDownloads]}
                onValueChange={(value: number[]) =>
                  setSettings((settings) => ({ ...settings, maxConcurrentDownloads: value[0] }))
                }
              />
              <p>
                {settings.maxConcurrentDownloads} download{settings.maxConcurrentDownloads !== 1 ? 's' : ''} at once
              </p>
            </div>
          </SheetHeader>
          <Separator />
          <SheetHeader>
            <div className='flex items-center gap-2'>
              <div className='flex flex-col'>
                <p className='font-medium'>Allow Explicit content</p>
                <p className='text-xs text-muted-foreground'>
                  If enabled (default), explicit songs will be shown when searching.
                </p>
              </div>
              <Checkbox
                checked={settings.explicitContent}
                onCheckedChange={(checked: boolean) =>
                  setSettings((settings) => ({ ...settings, explicitContent: checked }))
                }
              />
            </div>
          </SheetHeader>
          <Separator />
          <SheetHeader>
            <div className='flex flex-col items-center gap-2'>
              <div className='flex flex-col'>
                <p className='font-medium'>Max Album Art Size</p>
                <p className='text-xs text-muted-foreground'>
                  If apply metadata is enabled, album art will be resized to this size.
                </p>
              </div>
              <Slider
                min={100}
                max={3600}
                step={100}
                value={[settings.albumArtSize]}
                onValueChange={(value: number[]) =>
                  setSettings((settings) => ({ ...settings, albumArtSize: value[0] }))
                }
              />
              <p>
                {settings.albumArtSize}x{settings.albumArtSize}
              </p>
            </div>
          </SheetHeader>
          <Separator />
          <SheetHeader>
            <div className='flex flex-col items-center gap-2'>
              <div className='flex flex-col'>
                <p className='font-medium'>Album Art Quality</p>
                <p className='text-xs text-muted-foreground'>
                  If apply metadata is enabled, album art will be compressed to this quality. 100% is lossless.
                </p>
              </div>
              <Slider
                min={10}
                max={100}
                step={1}
                value={[settings.albumArtQuality * 100]}
                onValueChange={(value: number[]) =>
                  setSettings((settings) => ({ ...settings, albumArtQuality: value[0] / 100 }))
                }
              />
              <p>{Math.round(settings.albumArtQuality * 100)}%</p>
            </div>
          </SheetHeader>
          <Button variant='destructive' onClick={resetSettings}>
            Reset Settings
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export const parseQualityHTML = (quality: string) => {
  try {
    return (
      <div className='flex items-center'>
        <p>{QUALITY_MAP[quality as keyof typeof QUALITY_MAP][0]}-bit</p>
        <DotIcon className='min-h-[24px] min-w-[24px]' size={24} />
        <p>{QUALITY_MAP[quality as keyof typeof QUALITY_MAP][1]} kHz</p>
      </div>
    )
  } catch {
    return quality
  }
}

export default SettingsForm
