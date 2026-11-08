import { Skeleton } from '@/components/ui/skeleton'
import type { FeedView } from './StoryCard'

interface StoryCardSkeletonProps {
  count?: number
  view?: FeedView
}

export function StoryCardSkeleton({ count = 1, view = 'grid' }: StoryCardSkeletonProps) {
  if (view === 'list') {
    return (
      <div className="space-y-1">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="flex gap-4 px-4 py-4">
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-3 w-36 rounded-full" />
              <Skeleton className="h-5 w-4/5 rounded-md" />
              <Skeleton className="h-3.5 w-full rounded-md" />
              <Skeleton className="h-3.5 w-2/3 rounded-md" />
            </div>
            <Skeleton className="w-24 sm:w-40 aspect-[16/10] rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-hairline overflow-hidden">
          {index % 3 !== 2 && <Skeleton className="aspect-[2/1] rounded-none" />}
          <div className="p-4 space-y-2.5">
            <Skeleton className="h-3 w-32 rounded-full" />
            <Skeleton className="h-5 w-11/12 rounded-md" />
            <Skeleton className="h-5 w-2/3 rounded-md" />
            <div className="space-y-2 pt-1">
              <Skeleton className="h-3.5 w-full rounded-md" />
              <Skeleton className="h-3.5 w-full rounded-md" />
              <Skeleton className="h-3.5 w-3/4 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default StoryCardSkeleton
