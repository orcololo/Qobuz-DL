import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(request: NextRequest) {
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
    
    const fileBuffer = await readFile(targetPath)
    const fileName = filePath.split('/').pop() || 'download'
    const extension = fileName.split('.').pop()?.toLowerCase() || ''
    
    // Set appropriate content type based on file extension
    let contentType = 'application/octet-stream'
    switch (extension) {
      case 'flac':
        contentType = 'audio/flac'
        break
      case 'mp3':
        contentType = 'audio/mpeg'
        break
      case 'wav':
        contentType = 'audio/wav'
        break
      case 'm4a':
      case 'aac':
        contentType = 'audio/aac'
        break
      case 'opus':
        contentType = 'audio/opus'
        break
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg'
        break
      case 'png':
        contentType = 'image/png'
        break
    }
    
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString()
      }
    })
    
  } catch (error: any) {
    console.error('Error serving file:', error)
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to serve file'
      }),
      { status: 500 }
    )
  }
}