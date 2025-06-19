import { Card, CardContent } from '@/components/ui/card'

interface LoadingSpinnerProps {
  message?: string
}

export default function LoadingSpinner({ message = '加载中...' }: LoadingSpinnerProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="loading-spinner mb-4"></div>
        <p className="text-muted-foreground text-sm">{message}</p>
      </CardContent>
    </Card>
  )
}