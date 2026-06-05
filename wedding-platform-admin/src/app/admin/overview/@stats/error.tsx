'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Icons } from '@/components/icons'

export default function StatsError({ error }: { error: Error }) {
  return (
    <Alert variant='destructive'>
      <Icons.alertCircle className='h-4 w-4' />
      <AlertTitle>错误</AlertTitle>
      <AlertDescription>加载统计数据失败: {error.message}</AlertDescription>
    </Alert>
  )
}
