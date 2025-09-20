import { NextRequest, NextResponse } from 'next/server'
import { unlink, rmdir, stat } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')
    
    if (!filePath) {
      return new NextResponse(JSON.stringify({ 
        success: false, 
        error: 'File path is required' 
      }), { status: 400 })
    }
    
    const downloadsDir = join(process.cwd(), 'downloads')
    const targetPath = join(downloadsDir, filePath)
    
    // Security check - ensure we're still within downloads directory
    if (!targetPath.startsWith(downloadsDir)) {
      return new NextResponse(JSON.stringify({ 
        success: false, 
        error: 'Invalid path' 
      }), { status: 400 })
    }
    
    if (!existsSync(targetPath)) {
      return new NextResponse(JSON.stringify({ 
        success: false, 
        error: 'File not found' 
      }), { status: 404 })
    }
    
    const stats = await stat(targetPath)
    
    if (stats.isDirectory()) {
      // For directories, try to remove (will only work if empty)
      await rmdir(targetPath)
    } else {
      // For files, delete directly
      await unlink(targetPath)
    }
    
    return new NextResponse(JSON.stringify({ 
      success: true, 
      message: `${stats.isDirectory() ? 'Folder' : 'File'} deleted successfully` 
    }), { status: 200 })
    
  } catch (error: any) {
    console.error('Error deleting file:', error)
    
    // Handle specific error cases
    if (error.code === 'ENOTEMPTY') {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Cannot delete folder: folder is not empty'
        }),
        { status: 400 }
      )
    }
    
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to delete file'
      }),
      { status: 500 }
    )
  }
}