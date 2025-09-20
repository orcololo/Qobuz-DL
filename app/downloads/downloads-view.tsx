'use client'

import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { formatBytes } from '@/lib/utils'
import { 
  ArrowLeftIcon, 
  DownloadIcon, 
  FileIcon, 
  FolderIcon, 
  HomeIcon, 
  MusicIcon,
  PlayIcon,
  RefreshCwIcon,
  TrashIcon
} from 'lucide-react'

export interface DownloadItem {
  name: string
  type: 'file' | 'folder'
  path: string
  size?: number
  modifiedTime?: string
  extension?: string
}

interface DownloadsViewProps {}

const DownloadsView: React.FC<DownloadsViewProps> = () => {
  const [items, setItems] = useState<DownloadItem[]>([])
  const [currentPath, setCurrentPath] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchItems = async (path: string = '') => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await axios.get('/api/list-downloads', {
        params: { path }
      })
      
      if (response.data.success) {
        setItems(response.data.items)
        setCurrentPath(response.data.currentPath)
      } else {
        setError(response.data.error || 'Failed to load downloads')
      }
    } catch (err: any) {
      console.error('Error fetching downloads:', err)
      setError(err.response?.data?.error || 'Failed to load downloads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
    
    // Cleanup function to stop any playing audio when component unmounts
    return () => {
      const existingAudio = document.getElementById('downloads-audio-player') as HTMLAudioElement
      if (existingAudio) {
        existingAudio.pause()
        existingAudio.remove()
      }
    }
  }, [])

  const handleFolderClick = (item: DownloadItem) => {
    if (item.type === 'folder') {
      fetchItems(item.path)
    }
  }

  const handleBackClick = () => {
    const pathParts = currentPath.split('/').filter(p => p.length > 0)
    pathParts.pop()
    const newPath = pathParts.join('/')
    fetchItems(newPath)
  }

  const handleHomeClick = () => {
    fetchItems('')
  }

  const handleDownload = async (item: DownloadItem) => {
    try {
      const response = await axios.get('/api/download-file', {
        params: { path: item.path },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', item.name)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast({
        title: 'Success',
        description: `Downloaded ${item.name}`
      })
    } catch (err: any) {
      console.error('Error downloading file:', err)
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Failed to download file'
      })
    }
  }

  const handleDelete = async (item: DownloadItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return
    }

    try {
      const response = await axios.delete('/api/delete-file', {
        params: { path: item.path }
      })
      
      if (response.data.success) {
        toast({
          title: 'Success',
          description: `Deleted ${item.name}`
        })
        // Refresh the current directory
        fetchItems(currentPath)
      } else {
        toast({
          title: 'Error',
          description: response.data.error || 'Failed to delete file'
        })
      }
    } catch (err: any) {
      console.error('Error deleting file:', err)
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Failed to delete file'
      })
    }
  }

  const handlePlay = async (item: DownloadItem) => {
    try {
      // Stop any currently playing audio
      const existingAudio = document.getElementById('downloads-audio-player') as HTMLAudioElement
      if (existingAudio) {
        existingAudio.pause()
        existingAudio.remove()
      }

      if (currentlyPlaying === item.path) {
        setCurrentlyPlaying(null)
        return
      }

      const response = await axios.get('/api/download-file', {
        params: { path: item.path },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const audio = document.createElement('audio')
      audio.id = 'downloads-audio-player'
      audio.src = url
      audio.controls = false
      audio.volume = 0.7
      
      audio.onended = () => {
        setCurrentlyPlaying(null)
        window.URL.revokeObjectURL(url)
      }
      
      audio.onerror = () => {
        toast({
          title: 'Error',
          description: 'Failed to play audio file'
        })
        setCurrentlyPlaying(null)
        window.URL.revokeObjectURL(url)
      }
      
      document.body.appendChild(audio)
      audio.play()
      setCurrentlyPlaying(item.path)
      
      toast({
        title: 'Now Playing',
        description: item.name
      })
    } catch (err: any) {
      console.error('Error playing file:', err)
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Failed to play file'
      })
    }
  }

  const getFileIcon = (extension: string | undefined) => {
    if (!extension) return <FileIcon className="h-4 w-4" />
    
    const audioExtensions = ['flac', 'mp3', 'wav', 'm4a', 'aac', 'opus']
    if (audioExtensions.includes(extension)) {
      return <MusicIcon className="h-4 w-4" />
    }
    
    return <FileIcon className="h-4 w-4" />
  }

  const isAudioFile = (extension: string | undefined) => {
    if (!extension) return false
    const audioExtensions = ['flac', 'mp3', 'wav', 'm4a', 'aac', 'opus']
    return audioExtensions.includes(extension)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + 
           new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const pathParts = currentPath.split('/').filter(p => p.length > 0)

  return (
    <div className="w-full max-w-6xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MusicIcon className="h-6 w-6" />
              Downloads
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchItems(currentPath)}
              disabled={loading}
            >
              <RefreshCwIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleHomeClick}
              className="h-8 px-2"
            >
              <HomeIcon className="h-4 w-4" />
              Downloads
            </Button>
            
            {pathParts.map((part, index) => (
              <React.Fragment key={index}>
                <span>/</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    const newPath = pathParts.slice(0, index + 1).join('/')
                    fetchItems(newPath)
                  }}
                  className="h-8 px-2"
                >
                  {part}
                </Button>
              </React.Fragment>
            ))}
          </div>
        </CardHeader>
        
        <CardContent>
          {error && (
            <div className="text-center py-8">
              <p className="text-destructive">{error}</p>
              <Button 
                variant="outline" 
                onClick={() => fetchItems(currentPath)} 
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          )}
          
          {loading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          )}
          
          {!loading && !error && (
            <ScrollArea className="h-[400px]">
              {currentPath && (
                <>
                  <Button 
                    variant="ghost" 
                    onClick={handleBackClick}
                    className="w-full justify-start mb-2"
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Back to parent folder
                  </Button>
                  <Separator className="mb-4" />
                </>
              )}
              
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MusicIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No downloads found</p>
                  <p className="text-sm">Downloaded files will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div 
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => handleFolderClick(item)}
                      >
                        {item.type === 'folder' ? (
                          <FolderIcon className="h-5 w-5 text-blue-500" />
                        ) : (
                          getFileIcon(item.extension)
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.modifiedTime && formatDate(item.modifiedTime)}
                            {item.size && ` • ${formatBytes(item.size)}`}
                          </p>
                        </div>
                      </div>
                      
                      {item.type === 'file' && (
                        <div className="flex gap-2">
                          {isAudioFile(item.extension) && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handlePlay(item)}
                              title={currentlyPlaying === item.path ? "Stop playing" : "Play audio"}
                              className={currentlyPlaying === item.path ? "text-green-500" : ""}
                            >
                              <PlayIcon className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDownload(item)}
                            title="Download file"
                          >
                            <DownloadIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(item)}
                        title={`Delete ${item.type}`}
                        className="text-destructive hover:text-destructive"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default DownloadsView