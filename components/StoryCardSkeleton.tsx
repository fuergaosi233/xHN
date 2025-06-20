import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface StoryCardSkeletonProps {
  count?: number
}

export function StoryCardSkeleton({ count = 1 }: StoryCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="hover:shadow-sm transition-all duration-300 border-l-0 border-r-0 border-t-0 border-b-0 last:border-b">
          <CardContent className="py-6 px-6">
            <div className="space-y-4">
              {/* Title skeleton */}
              <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
              </div>
              
              {/* Summary skeleton */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
              </div>
              
              {/* Meta information skeleton */}
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-8" />
                  <Skeleton className="h-3 w-10" />
                </div>
                
                <div className="flex items-center gap-1">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-16 rounded" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}

export default StoryCardSkeleton