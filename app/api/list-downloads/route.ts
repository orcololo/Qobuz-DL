import { NextRequest, NextResponse } from 'next/server'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export interface DownloadItem {
  name: string
  type: 'file' | 'folder'
  path: string
  size?: number
  modifiedTime?: string
  extension?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subPath = searchParams.get('path') || ''
    
    const downloadsDir = join(process.cwd(), 'downloads')
    const targetPath = join(downloadsDir, subPath)
    
    // Security check - ensure we're still within downloads directory
    if (!targetPath.startsWith(downloadsDir)) {
      return new NextResponse(JSON.stringify({ 
        success: false, 
        error: 'Invalid path' 
      }), { status: 400 })
    }
    
    if (!existsSync(targetPath)) {
      return new NextResponse(JSON.stringify({ 
        success: true, 
        items: [] 
      }), { status: 200 })
    }
    
    const items = await readdir(targetPath)
    const itemDetails: DownloadItem[] = []
    
    for (const item of items) {
      if (item === '.gitkeep') continue // Skip gitkeep file
      
      const itemPath = join(targetPath, item)
      const stats = await stat(itemPath)
      const relativePath = join(subPath, item).replace(/\\/g, '/')
      
      if (stats.isDirectory()) {
        itemDetails.push({
          name: item,
          type: 'folder',
          path: relativePath,
          modifiedTime: stats.mtime.toISOString()
        })
      } else {
        const extension = item.split('.').pop()?.toLowerCase() || ''
        itemDetails.push({
          name: item,
          type: 'file',
          path: relativePath,
          size: stats.size,
          modifiedTime: stats.mtime.toISOString(),
          extension
        })
      }
    }
    
    // Sort: folders first, then files, both alphabetically
    itemDetails.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
    
    return new NextResponse(JSON.stringify({ 
      success: true, 
      items: itemDetails,
      currentPath: subPath
    }), { status: 200 })
    
  } catch (error: any) {
    console.error('Error listing downloads:', error)
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to list downloads'
      }),
      { status: 500 }
    )
  }
}