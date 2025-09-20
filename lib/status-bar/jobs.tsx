import { StatusBarProps } from '@/components/status-bar/status-bar'
import { LucideIcon } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

let jobs = [] as { ready: () => Promise<void>; UUID: string }[]
let runningJobs = 0
let maxConcurrentJobs = 3 // Default value, will be updated from settings

export function setMaxConcurrentJobs(max: number) {
  maxConcurrentJobs = Math.max(1, Math.min(10, max)) // Clamp between 1-10
}

export function loadStatusBarValue(
  setStatusBar: React.Dispatch<React.SetStateAction<StatusBarProps>>
): Promise<StatusBarProps> {
  return new Promise((resolve) => {
    setStatusBar((prev) => (resolve(prev), prev))
  })
}

export async function createJob(
  setStatusBar: React.Dispatch<React.SetStateAction<StatusBarProps>>,
  QueueTitle: string,
  QueueIcon: LucideIcon,
  ready: () => Promise<void>
) {
  const UUID = uuidv4()
  const job = { ready, UUID }
  
  const updateJob = async () => {
    const statusBar: StatusBarProps = await loadStatusBarValue(setStatusBar)
    
    // Always add to queue initially
    setStatusBar((prev) => ({
      ...prev,
      queue: [
        ...(prev.queue || []),
        {
          title: QueueTitle,
          UUID: UUID,
          icon: QueueIcon,
          remove: () => {
            jobs = jobs.filter((item) => item.UUID !== UUID)
            setStatusBar((prev) => ({
              ...prev,
              queue: prev.queue?.filter((item) => item.UUID !== UUID)
            }))
          }
        }
      ]
    }))
  }

  await updateJob()
  jobs.push(job)
  
  // Check if we can start this job immediately
  processJobQueue(setStatusBar)
}

async function processJobQueue(setStatusBar: React.Dispatch<React.SetStateAction<StatusBarProps>>) {
  // Start jobs if we have capacity and jobs waiting
  while (runningJobs < maxConcurrentJobs && jobs.length > 0) {
    const job = jobs.shift()!
    runningJobs++
    
    // Update status bar if this is the first job starting
    if (runningJobs === 1) {
      setStatusBar((prev) => ({ ...prev, processing: true, open: prev.openPreference }))
    }
    
    // Start the job (don't await - let it run concurrently)
    job.ready().then(() => {
      runningJobs--
      
      // Remove from queue UI
      setStatusBar((prev) => ({
        ...prev,
        queue: prev.queue?.filter((item) => item.UUID !== job.UUID)
      }))
      
      // If no jobs are running, update status bar
      if (runningJobs === 0 && jobs.length === 0) {
        setStatusBar((prev) => ({ 
          ...prev, 
          open: false, 
          title: '', 
          description: '', 
          progress: 0, 
          processing: false 
        }))
      }
      
      // Try to start more jobs
      processJobQueue(setStatusBar)
    }).catch((error) => {
      console.error('Job failed:', error)
      runningJobs--
      
      // Remove from queue UI
      setStatusBar((prev) => ({
        ...prev,
        queue: prev.queue?.filter((item) => item.UUID !== job.UUID)
      }))
      
      // Try to start more jobs even if this one failed
      processJobQueue(setStatusBar)
    })
  }
}
