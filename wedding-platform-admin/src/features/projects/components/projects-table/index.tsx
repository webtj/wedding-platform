'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { projectsQueryOptions } from '../../api/queries';
import type { Project, ProjectFilters } from '../../api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { toDateDisplay } from '@/lib/date-format';
import { useRouter } from 'next/navigation';

const STATUS = [
  { label: '未开始', value: 'pending' },
  { label: '进行中', value: 'active' },
  { label: '已完成', value: 'completed' }
];

const SC: Record<string, string> = {
  pending: 'bg-slate-50 text-slate-600 border-slate-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200'
};
const SL: Record<string, string> = Object.fromEntries(STATUS.map((s) => [s.value, s.label]));

export function ProjectsTable() {
  const [params, setParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(12),
    search: parseAsString.withDefault(''),
    status: parseAsString.withDefault('')
  });
  const [q, setQ] = useState(params.search);
  const debounce = useDebouncedCallback((v: string) => setParams({ search: v, page: 1 }), 400);

  const filters: ProjectFilters = {
    page: params.page,
    limit: params.perPage,
    ...(params.search && { search: params.search }),
    ...(params.status && { status: params.status })
  };
  const { data, isLoading } = useQuery(projectsQueryOptions(filters));

  const totalPages = data ? Math.ceil(data.total / params.perPage) : 0;

  return (
    <div className='space-y-5'>
      {/* Toolbar — unified with card aesthetic */}
      <div className='flex items-center gap-2.5'>
        <div className='relative flex-1 max-w-xs'>
          <Icons.search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='搜索项目...'
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              debounce(e.target.value);
            }}
            className='pl-8 h-8 text-sm'
          />
        </div>
        <Select
          value={params.status || '__all__'}
          onValueChange={(v) => setParams({ status: v === '__all__' ? '' : v, page: 1 })}
        >
          <SelectTrigger className='w-[120px] h-8 text-sm'>
            <SelectValue placeholder='全部状态' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__all__'>全部</SelectItem>
            {STATUS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className='flex-1' />
        <span className='text-xs text-muted-foreground'>{data?.total ?? 0} 个项目</span>
      </div>

      {/* Content */}
      {isLoading || !data ? (
        <div className='flex items-center justify-center gap-2 py-20 text-muted-foreground'>
          <Icons.spinner className='h-5 w-5 animate-spin' />
          <span className='text-sm'>加载中...</span>
        </div>
      ) : data.items.length === 0 ? (
        <div className='flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground rounded-lg border border-dashed'>
          <Icons.workspace className='h-10 w-10 stroke-1 opacity-30' />
          <p className='text-sm'>暂无项目</p>
        </div>
      ) : (
        <>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'>
            {data.items.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>

          {/* Pagination — only show when multiple pages */}
          {totalPages > 1 && (
            <div className='flex items-center justify-center gap-3 pt-2'>
              <Button
                variant='ghost'
                size='sm'
                className='h-7 text-xs'
                disabled={params.page <= 1}
                onClick={() => setParams({ page: params.page - 1 })}
              >
                <Icons.chevronLeft className='h-3.5 w-3.5' />
                上一页
              </Button>
              <span className='text-xs text-muted-foreground tabular-nums min-w-[3rem] text-center'>
                {params.page} / {totalPages || 1}
              </span>
              <Button
                variant='ghost'
                size='sm'
                className='h-7 text-xs'
                disabled={params.page >= totalPages}
                onClick={() => setParams({ page: params.page + 1 })}
              >
                下一页
                <Icons.chevronRight className='h-3.5 w-3.5' />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const r = useRouter();
  const wd = project.weddingDate ? new Date(project.weddingDate) : null;
  const days = wd ? Math.ceil((wd.getTime() - Date.now()) / 86400000) : null;
  const overdue = days !== null && days < 0;
  const urgent = days !== null && days >= 0 && days <= 30;
  const cs = project.contracts ?? [];

  return (
    <div
      className='group border rounded-lg bg-card hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer flex flex-col'
      role='link'
      tabIndex={0}
      onClick={() => r.push(`/studio/projects/${project.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          r.push(`/studio/projects/${project.id}`);
        }
      }}
    >
      <div className='p-3.5 flex-1 flex flex-col gap-2.5'>
        {/* Top line: code + status */}
        <div className='flex items-center gap-2 min-w-0'>
          <code className='text-[11px] text-muted-foreground font-mono truncate'>
            {project.projectNo}
          </code>
          <Badge
            variant='outline'
            className={`text-[11px] px-1.5 py-0 h-5 ml-auto flex-shrink-0 ${SC[project.status] ?? ''}`}
          >
            {SL[project.status] ?? project.status}
          </Badge>
        </div>

        {/* Names + date */}
        <div className='min-w-0'>
          <h3 className='text-sm font-semibold truncate'>
            {project.brideName || '?'} & {project.groomName || '?'}
          </h3>
          <div className='flex items-center gap-2 mt-1 text-xs text-muted-foreground'>
            {project.weddingDate && <span>{toDateDisplay(project.weddingDate)}</span>}
            {days !== null && (
              <span
                className={`font-medium tabular-nums ${overdue ? 'text-destructive' : urgent ? 'text-amber-600' : 'text-emerald-600'}`}
              >
                {overdue ? `已过 ${Math.abs(days)} 天` : days === 0 ? '今天' : `距婚期 ${days} 天`}
              </span>
            )}
          </div>
          {project.venue && (
            <p className='text-xs text-muted-foreground truncate mt-0.5'>
              {project.venue}
              {project.guestCount ? ` · ${project.guestCount}人` : ''}
            </p>
          )}
        </div>

        {/* Contracts */}
        {cs.length > 0 && (
          <div className='flex flex-wrap gap-1'>
            {cs.map((c) => (
              <a
                key={c.id}
                href={`/studio/contracts?search=${c.contractNo}`}
                onClick={(e) => e.stopPropagation()}
                className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-secondary/60 text-muted-foreground hover:text-primary transition-colors'
              >
                <Icons.post className='h-2.5 w-2.5' />
                {c.contractNo}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Actions bar */}
      <div className='flex items-center gap-1 px-3 py-2 border-t bg-secondary/20'>
        <Button
          variant='ghost'
          size='sm'
          className='h-6 text-[11px] px-1.5'
          onClick={(e) => {
            e.stopPropagation();
            r.push(`/studio/projects/${project.id}/designer`);
          }}
        >
          <Icons.sparkles className='mr-1 h-3 w-3' />
          设计器
        </Button>
        <Button
          variant='ghost'
          size='sm'
          className='h-6 text-[11px] px-1.5'
          onClick={(e) => {
            e.stopPropagation();
            r.push(`/studio/projects/${project.id}/edit`);
          }}
        >
          <Icons.edit className='mr-1 h-3 w-3' />
          编辑
        </Button>
        <Button
          variant='ghost'
          size='sm'
          className='h-6 text-[11px] px-1.5'
          onClick={(e) => {
            e.stopPropagation();
            r.push(`/studio/projects/${project.id}`);
          }}
        >
          查看
          <Icons.chevronRight className='ml-0.5 h-3 w-3' />
        </Button>
      </div>
    </div>
  );
}
