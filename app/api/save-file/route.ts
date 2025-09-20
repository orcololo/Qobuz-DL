import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const file = formData.get('file') as File
    const artistName = formData.get('artistName') as string
    const albumName = formData.get('albumName') as string
    const fileName = formData.get('fileName') as string
    
    if (!file || !artistName || !albumName || !fileName) {
      return new NextResponse(JSON.stringify({ 
        success: false, 
        error: 'Missing required fields' 
      }), { status: 400 })
    }
    
    // Check file size (limit to 500MB to prevent memory issues)
    const maxFileSize = 720 * 1024 * 1024 // 500MB
    if (file.size > maxFileSize) {
      return new NextResponse(JSON.stringify({ 
        success: false, 
        error: 'File too large. Maximum size is 720MB.' 
      }), { status: 413 })
    }
    
    // Create downloads directory structure
    const downloadsDir = join(process.cwd(), 'downloads')
    const artistDir = join(downloadsDir, artistName)
    const albumDir = join(artistDir, albumName)
    
    // Ensure directories exist
    if (!existsSync(artistDir)) {
      await mkdir(artistDir, { recursive: true })
    }
    if (!existsSync(albumDir)) {
      await mkdir(albumDir, { recursive: true })
    }
    
    // Convert file to buffer and save (more memory efficient than reading all at once)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const filePath = join(albumDir, fileName)
    
    // Write file and immediately clear buffer from memory
    await writeFile(filePath, buffer)
    
    return new NextResponse(JSON.stringify({ 
      success: true, 
      message: `File saved to ${filePath}`,
      fileSize: file.size
    }), { status: 200 })
    
  } catch (error: any) {
    console.error('Error saving file:', error)
    
    // Handle specific memory errors
    if (error.message?.includes('out of memory') || error.code === 'ERR_BUFFER_OUT_OF_BOUNDS') {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'File too large to process. Try with a smaller file.'
        }),
        { status: 413 }
      )
    }
    
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: error?.message || 'Failed to save file'
      }),
      { status: 500 }
    )
  }
}