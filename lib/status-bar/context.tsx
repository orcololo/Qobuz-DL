'use client'
import React, { createContext, useContext, useState, ReactNode } from 'react'
import type { StatusBarProps } from '@/components/status-bar/status-bar'
import type { QobuzAlbum, QobuzTrack, FetchedQobuzAlbum } from '@/lib/qobuz-dl'
import type { SettingsProps } from '@/lib/settings-provider'
import type { FFmpegType } from '@/lib/ffmpeg-functions'

export type RetryReason = 
  | 'shorter_than_expected' 
  | 'network_error' 
  | 'quality_unavailable' 
  | 'processing_error'
  | 'unknown_error'

export type RetryItem = {
  id: string
  result: QobuzAlbum | QobuzTrack
  settings: SettingsProps
  fetchedAlbumData?: FetchedQobuzAlbum | null
  reason: RetryReason
  attempts: number
  maxAttempts: number
  lastError: string
  timestamp: number
  autoRetry: boolean
}

export type RetryQueueProps = {
  items: RetryItem[]
  processing: boolean
  addItem: (item: Omit<RetryItem, 'id' | 'attempts' | 'timestamp'>) => void
  removeItem: (id: string) => void
  retryItem: (id: string) => void
  retryAll: () => void
  clearAll: () => void
}

const StatusBarContext = createContext<
  | {
      statusBar: StatusBarProps
      setStatusBar: React.Dispatch<React.SetStateAction<StatusBarProps>>
      retryQueue: RetryQueueProps
    }
  | undefined
>(undefined)

export const StatusBarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [statusBar, setStatusBar] = useState<StatusBarProps>({
    title: '',
    open: false,
    openPreference: true,
    progress: 0,
    description: '',
    processing: false,
    onCancel: () => {}
  })

  const [retryItems, setRetryItems] = useState<RetryItem[]>([])
  const [retryProcessing, setRetryProcessing] = useState(false)

  const retryQueue: RetryQueueProps = {
    items: retryItems,
    processing: retryProcessing,
    
    addItem: (item: Omit<RetryItem, 'id' | 'attempts' | 'timestamp'>) => {
      const newItem: RetryItem = {
        ...item,
        id: Date.now().toString() + Math.random().toString(36),
        attempts: 0,
        timestamp: Date.now()
      }
      setRetryItems(prev => [...prev, newItem])
    },
    
    removeItem: (id: string) => {
      setRetryItems(prev => prev.filter(item => item.id !== id))
    },
    
    retryItem: async (id: string) => {
      const item = retryItems.find(item => item.id === id)
      if (!item) return
      
      setRetryProcessing(true)
      setRetryItems(prev => prev.map(item => 
        item.id === id ? { ...item, attempts: item.attempts + 1 } : item
      ))
      
      try {
        // Import createDownloadJob dynamically to avoid circular dependency
        const { createDownloadJob } = await import('@/lib/download-job')
        
        await createDownloadJob(
          item.result,
          setStatusBar,
          {} as FFmpegType, // Will be provided by the calling component
          item.settings,
          () => {}, // Toast function will be provided
          item.fetchedAlbumData
        )
        
        // If successful, remove from retry queue
        retryQueue.removeItem(id)
      } catch (error) {
        // Update the error message
        setRetryItems(prev => prev.map(retryItem => 
          retryItem.id === id 
            ? { ...retryItem, lastError: error instanceof Error ? error.message : 'Unknown error' }
            : retryItem
        ))
        
        // Remove if max attempts reached
        if (item.attempts >= item.maxAttempts) {
          retryQueue.removeItem(id)
        }
      } finally {
        setRetryProcessing(false)
      }
    },
    
    retryAll: async () => {
      for (const item of retryItems) {
        if (item.attempts < item.maxAttempts) {
          await retryQueue.retryItem(item.id)
        }
      }
    },
    
    clearAll: () => {
      setRetryItems([])
    }
  }

  return <StatusBarContext.Provider value={{ statusBar, setStatusBar, retryQueue }}>{children}</StatusBarContext.Provider>
}

export const useStatusBar = () => {
  const context = useContext(StatusBarContext)

  if (!context) {
    throw new Error('useStatusBar must be used within a StatusBarProvider')
  }

  return context
}

export const useRetryQueue = () => {
  const context = useContext(StatusBarContext)

  if (!context) {
    throw new Error('useRetryQueue must be used within a StatusBarProvider')
  }

  return context.retryQueue
}
