import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function SourcePieChartSkeleton() {
  return (
    <Card className='border-0 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]'>
      <CardHeader className='pb-2'>
        <Skeleton className='h-5 w-20' />
      </CardHeader>
      <CardContent>
        <div className='flex items-center gap-6'>
          <Skeleton className='h-[160px] w-[160px] shrink-0 rounded-full' />
          <div className='flex-1 space-y-2.5'>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className='flex items-center justify-between'>
                <Skeleton className='h-3 w-16' />
                <Skeleton className='h-3 w-12' />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
