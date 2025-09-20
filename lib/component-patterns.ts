/**
 * Component Standards and Patterns for Qobuz-DL
 * 
 * This file documents standardized patterns for consistent component development
 */

import React, { useState } from 'react'

// ========================================
// 1. PROP INTERFACE STANDARDS
// ========================================

// Base interface pattern for all components
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

// Dialog/Modal component props pattern
export interface BaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Error handling props pattern
export interface ErrorHandlingProps {
  onError?: (error: Error) => void
  fallback?: React.ComponentType<{ error: Error }>
}

// Loading state props pattern
export interface LoadingStateProps {
  loading?: boolean
  loadingText?: string
}

// ========================================
// 2. COMPONENT STRUCTURE STANDARDS
// ========================================

/**
 * Standard component structure:
 * 
 * 1. Imports (external libraries first, then internal)
 * 2. Type definitions and interfaces
 * 3. Constants and static data
 * 4. Component implementation
 * 5. Default props (if needed)
 * 6. Export statement
 */

// ========================================
// 3. NAMING CONVENTIONS
// ========================================

/**
 * Component naming:
 * - PascalCase for component names
 * - camelCase for props and functions
 * - UPPER_SNAKE_CASE for constants
 * - kebab-case for CSS classes (via Tailwind)
 */

// ========================================
// 4. ERROR HANDLING PATTERNS
// ========================================

// Standard error handling with toast notifications
export const handleApiError = (error: unknown, toast: any, fallbackMessage: string) => {
  const message = error instanceof Error ? error.message : fallbackMessage
  toast({
    title: 'Error',
    description: message,
    variant: 'destructive'
  })
}

// ========================================
// 5. ASYNC OPERATION PATTERNS
// ========================================

// Standard async function with loading and error states
export const useAsyncOperation = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const execute = async (operation: () => Promise<void>) => {
    try {
      setLoading(true)
      setError(null)
      await operation()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }
  
  return { loading, error, execute }
}