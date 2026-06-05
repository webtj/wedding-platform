import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function RecentContractsSkeleton() {
  return (
    <Card className='border-0 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]'>
      <CardHeader className='pb-3'>
        <Skeleton className='h-5 w-20' />
      </CardHeader>
      <CardContent>
        <div className='space-y-3.5'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='flex items-center gap-3.5'>
              <Skeleton className='h-9 w-9 shrink-0 rounded-full' />
              <div className='flex-1 space-y-1'>
                <Skeleton className='h-4 w-28' />
                <Skeleton className='h-3 w-20' />
              </div>
              <div className='space-y-1'>
                <Skeleton className='h-4 w-16' />
                <Skeleton className='h-3 w-12' />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
