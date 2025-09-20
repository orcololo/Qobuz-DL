import React from 'react'
import Image from 'next/image'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { getType, formatTitle, QobuzAlbum, QobuzArtist, QobuzTrack } from '@/lib/qobuz-dl'
import { filterData } from '@/app/search-view'
import { Skeleton } from '@/components/ui/skeleton'

interface CardImageProps {
  result: QobuzAlbum | QobuzTrack | QobuzArtist
  album: QobuzAlbum | null
  imageLoaded: boolean
  focusCard: boolean
  imageAnimationControls: any
  onImageLoad: () => void
}

export const CardImage: React.FC<CardImageProps> = ({
  result,
  album,
  imageLoaded,
  focusCard,
  imageAnimationControls,
  onImageLoad
}) => {
  const imageSource = album ? album.image?.small : (result as QobuzAlbum | QobuzArtist).image?.small
  const isArtist = getType(result) === 'artists'

  return (
    <motion.div
      initial={imageSource ? { scale: 0.9 } : { scale: 1 }}
      animate={imageAnimationControls}
      transition={{ duration: 0.1 }}
      className={cn('absolute left-0 top-0 z-[2] w-full aspect-square transition-all')}
    >
      {imageSource ? (
        <>
          {isArtist ? (
            <Image
              fill
              src={imageSource}
              alt={formatTitle(result)}
              className={cn(
                'object-cover group-hover:scale-105 transition-all w-full h-full text-[0px]',
                focusCard && 'scale-105',
                imageLoaded && 'opacity-100'
              )}
              sizes='(min-width: 1280px) calc((100vw - 96px) / 7), (min-width: 1024px) calc((100vw - 80px) / 6), (min-width: 768px) calc((100vw - 64px) / 5), (min-width: 640px) calc((100vw - 48px) / 3), calc((100vw - 32px) / 2)'
              onLoad={onImageLoad}
            />
          ) : (
            <img
              crossOrigin='anonymous'
              src={imageSource}
              alt={formatTitle(result)}
              className={cn(
                'object-cover group-hover:scale-105 transition-all w-full h-full text-[0px]',
                focusCard && 'scale-105',
                imageLoaded && 'opacity-100'
              )}
              onLoad={onImageLoad}
            />
          )}
        </>
      ) : (
        <motion.div
          className='flex items-center justify-center bg-secondary w-full h-full'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {filterData.map((filter, index) => {
            if (filter.value === getType(result)) {
              return <filter.icon key={index} className='w-1/2 h-1/2 opacity-20' />
            }
          })}
        </motion.div>
      )}
      <Skeleton className='absolute left-0 top-0 z-[1] w-full aspect-square flex items-center justify-center' />
    </motion.div>
  )
}