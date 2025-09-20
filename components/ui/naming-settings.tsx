import React from 'react'
import { Button } from '@/components/ui/button'
import { InfoIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SettingsProps, nameVariables } from '@/lib/settings-provider'

interface NamingSettingsProps {
  settings: SettingsProps
  setSettings: React.Dispatch<React.SetStateAction<SettingsProps>>
}

export const NamingSettings: React.FC<NamingSettingsProps> = ({
  settings,
  setSettings
}) => {
  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <div className='px-0.5 space-y-2'>
          <p className='font-medium text-sm'>Zip File Naming</p>
          <div className='flex gap-2'>
            <Dialog>
              <DialogTrigger asChild>
                <Button size='icon' className='aspect-square' variant='outline'>
                  <InfoIcon />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Zip File Naming</DialogTitle>
                  <DialogDescription>The variables used in the zip file name</DialogDescription>
                </DialogHeader>
                <p className='text-xs text-muted-foreground'>An example is {'{artists} - {name}'}</p>
                <div className='flex flex-col gap-2'>
                  {nameVariables.map((variable, index) => (
                    <div key={index} className='flex text-sm items-center justify-between gap-2'>
                      <p>
                        <span className='capitalize'>{variable}</span>{' '}
                        <span className='text-muted-foreground'>{`{${variable}}`}</span>
                      </p>
                      <p>{settings.zipName.includes(variable) ? 'Currently used' : 'Not used'}</p>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <Input
              value={settings.zipName}
              onChange={(e) => setSettings((prev) => ({ ...prev, zipName: e.target.value }))}
              placeholder='{artists} - {name}'
            />
          </div>
        </div>
      </div>

      <div className='space-y-2'>
        <div className='px-0.5 space-y-2'>
          <p className='font-medium text-sm'>Track File Naming</p>
          <div className='flex gap-2'>
            <Dialog>
              <DialogTrigger asChild>
                <Button size='icon' className='aspect-square' variant='outline'>
                  <InfoIcon />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Track File Naming</DialogTitle>
                  <DialogDescription>The variables used in the track file name</DialogDescription>
                </DialogHeader>
                <p className='text-xs text-muted-foreground'>An example is {'{track_number} - {name}{explicit}'}</p>
                <div className='flex flex-col gap-2'>
                  {nameVariables.map((variable, index) => (
                    <div key={index} className='flex text-sm items-center justify-between gap-2'>
                      <p>
                        <span className='capitalize'>{variable}</span>{' '}
                        <span className='text-muted-foreground'>{`{${variable}}`}</span>
                      </p>
                      <p>{settings.trackName.includes(variable) ? 'Currently used' : 'Not used'}</p>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <Input
              value={settings.trackName}
              onChange={(e) => setSettings((prev) => ({ ...prev, trackName: e.target.value }))}
              placeholder='{track_number} - {name}{explicit}'
            />
          </div>
        </div>
      </div>
    </div>
  )
}