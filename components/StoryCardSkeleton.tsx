import { Skeleton } from '@/components/ui/skeleton'

interface StoryCardSkeletonProps {
  count?: number
}

export function StoryCardSkeleton({ count = 1 }: StoryCardSkeletonProps) {
  return (
    <div className="divide-y divide-hairline">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="py-7">
          <div className="flex gap-4">
            <Skeleton className="hidden sm:block w-10 h-10 rounded-xl shrink-0 mt-1" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-3 w-40 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-11/12 rounded-md" />
                <Skeleton className="h-6 w-2/3 rounded-md" />
              </div>
              <div className="space-y-2 pt-1">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-5/6 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default StoryCardSkeleton
