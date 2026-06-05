import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Icons } from '@/components/icons'

export function AiUsageSummarySkeleton() {
  return (
    <Card className='border-0 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]'>
      <CardHeader className='pb-3'>
        <div className='flex items-center gap-2'>
          <Icons.sparkles className='h-4 w-4 text-primary/60' />
          <Skeleton className='h-5 w-24' />
        </div>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='space-y-1.5'>
              <Skeleton className='h-3 w-16' />
              <Skeleton className='h-8 w-20' />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
