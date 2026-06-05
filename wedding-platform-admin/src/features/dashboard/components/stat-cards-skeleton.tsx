import { Card, CardHeader, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function StatCardsSkeleton() {
  return (
    <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4'>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card
          key={i}
          className='border-0 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]'
        >
          <CardHeader className='pb-1'>
            <div className='flex items-center gap-2'>
              <Skeleton className='h-7 w-7 rounded-md' />
              <Skeleton className='h-3 w-16' />
            </div>
            <Skeleton className='mt-3 h-9 w-24' />
          </CardHeader>
          <CardFooter className='pt-0 pb-4'>
            <Skeleton className='h-3 w-28' />
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
