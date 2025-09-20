import axios, { AxiosResponse } from 'axios'
import { HTTP_STATUS } from './constants'

// Type for API response structure
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Enhanced error handling for API requests
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Generic API request wrapper with consistent error handling
export async function makeApiRequest<T>(
  requestFn: () => Promise<AxiosResponse<T>>
): Promise<T> {
  try {
    const response = await requestFn()
    return response.data
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      throw new ApiError('Request timeout', 408)
    }
    
    if (error.response) {
      throw new ApiError(
        error.response.data?.message || 'API request failed',
        error.response.status,
        error
      )
    }
    
    if (error.request) {
      throw new ApiError('Network error - no response received', undefined, error)
    }
    
    throw new ApiError(error.message || 'Unknown error occurred', undefined, error)
  }
}

// Utility for logging API calls consistently
export function logApiCall(
  endpoint: string,
  params: Record<string, any> = {},
  method: string = 'GET'
) {
  console.log('📊 API Full Response Data:', {
    endpoint,
    method,
    params,
    timestamp: new Date().toISOString()
  })
}

// Utility for handling file uploads with progress
export async function uploadFileWithProgress(
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<ApiResponse> {
  return makeApiRequest(() =>
    axios.post('/api/save-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percent)
        }
      }
    })
  )
}

// Utility for handling download streams
export async function downloadStream(
  url: string,
  onProgress?: (percent: number) => void
): Promise<ArrayBuffer> {
  return makeApiRequest(() =>
    axios.get(url, {
      responseType: 'arraybuffer',
      onDownloadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percent)
        }
      }
    })
  )
}