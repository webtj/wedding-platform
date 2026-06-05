import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function LeadTrendChartSkeleton() {
  return (
    <Card className='border-0 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]'>
      <CardHeader className='pb-2'>
        <Skeleton className='h-5 w-20' />
      </CardHeader>
      <CardContent className='pt-2'>
        <Skeleton className='h-[260px] w-full rounded-lg' />
      </CardContent>
    </Card>
  )
}
