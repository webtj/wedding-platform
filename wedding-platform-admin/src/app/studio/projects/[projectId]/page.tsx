'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { toDateDisplay } from '@/lib/date-format';
import PageContainer from '@/components/layout/page-container';

const projectQ = (id: string) =>
  queryOptions({ queryKey: ['project', id], queryFn: () => apiClient<any>(`/projects/${id}`) });

export default function ProjectDetailPage() {
  const { projectId } = useParams() as { projectId: string };
  const { data: proj } = useQuery(projectQ(projectId));

  const weddingDate = proj?.weddingDate ? new Date(proj.weddingDate) : null;
  const days = weddingDate ? Math.ceil((weddingDate.getTime() - Date.now()) / 86400000) : null;

  return (
    <PageContainer pageTitle={proj ? `${proj.brideName} & ${proj.groomName}` : '加载中...'}>
      {proj && (
        <div className='space-y-6'>
          <div className='flex items-center gap-4 text-sm text-muted-foreground flex-wrap'>
            <code className='text-xs'>{proj.projectNo}</code>
            {proj.weddingDate && <span>{toDateDisplay(proj.weddingDate)}</span>}
            {proj.venue && <span>{proj.venue}</span>}
            <Badge variant='outline'>
              {proj.status === 'pending'
                ? '未开始'
                : proj.status === 'active'
                  ? '进行中'
                  : '已完成'}
            </Badge>
            {days !== null && (
              <span
                className={`ml-auto font-bold ${days < 0 ? 'text-destructive' : days <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}
              >
                {days < 0 ? `已过 ${Math.abs(days)} 天` : days === 0 ? '今天' : `距婚期 ${days} 天`}
              </span>
            )}
          </div>
          <KanbanBoard projectId={projectId} />
        </div>
      )}
    </PageContainer>
  );
}
