import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function FunnelChartSkeleton() {
  return (
    <Card className='border-0 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]'>
      <CardHeader className='pb-3'>
        <Skeleton className='h-5 w-20' />
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className='mb-1 flex items-center justify-between'>
                <Skeleton className='h-3 w-16' />
                <Skeleton className='h-3 w-8' />
              </div>
              <Skeleton className='h-6 w-full rounded-md' />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
