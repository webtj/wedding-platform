'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { ProjectTimelineView } from '@/features/projects/components/project-timeline-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { toDateDisplay } from '@/lib/date-format';
import PageContainer from '@/components/layout/page-container';

interface ProjectDetail {
  id: string;
  tenantId: string;
  projectNo: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  ceremonyType: string | null;
  venue: string | null;
  guestCount: number | null;
  guestCountFinal: number | null;
  colorTheme: string | null;
  style: string | null;
  specialRequirements: string | null;
  plannerId: string | null;
  status: string;
  members: Array<{
    id: string;
    userId: string;
    role: string;
    user: { id: string; displayName: string };
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    assigneeType: string;
    dueDate: string | null;
  }>;
}

const projectQ = (id: string) =>
  queryOptions({ queryKey: ['project', id], queryFn: () => apiClient<ProjectDetail>(`/projects/${id}`) });

type ViewMode = 'kanban' | 'timeline';

export default function ProjectDetailPage() {
  const { projectId } = useParams() as { projectId: string };
  const { data: proj } = useQuery(projectQ(projectId));
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

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

          {/* View toggle */}
          <div className='flex items-center gap-1 p-1 bg-muted rounded-lg w-fit'>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size='sm'
              onClick={() => setViewMode('kanban')}
              className='gap-1.5'
            >
              <Icons.kanban className='h-3.5 w-3.5' />
              看板
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'default' : 'ghost'}
              size='sm'
              onClick={() => setViewMode('timeline')}
              className='gap-1.5'
            >
              <Icons.calendar className='h-3.5 w-3.5' />
              时间线
            </Button>
          </div>

          {viewMode === 'kanban' ? (
            <KanbanBoard projectId={projectId} />
          ) : (
            <ProjectTimelineView projectId={projectId} />
          )}
        </div>
      )}
    </PageContainer>
  );
}
