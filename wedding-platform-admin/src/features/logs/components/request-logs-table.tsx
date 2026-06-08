'use client';

import { useEffect, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { requestLogsOptions } from '../api/queries';
import type { DateRangeParams, RequestLogQueryParams } from '../api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Icons } from '@/components/icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface RequestLogsTableProps {
  dateRange?: DateRangeParams;
}

function getStatusBadgeVariant(
  code: number
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (code >= 500) return 'destructive';
  if (code >= 400) return 'outline';
  return 'default';
}

function getMethodBadgeVariant(
  method: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'secondary';
    case 'POST':
      return 'default';
    case 'PUT':
    case 'PATCH':
      return 'outline';
    case 'DELETE':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

export function RequestLogsTable({ dateRange }: RequestLogsTableProps) {
  const [page, setPage] = useState(1);
  const [pathSearch, setPathSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  useEffect(() => {
    setPage(1);
  }, [dateRange?.startDate, dateRange?.endDate]);

  const params: RequestLogQueryParams = {
    page,
    pageSize: 20,
    ...(dateRange?.startDate && { startDate: dateRange.startDate }),
    ...(dateRange?.endDate && { endDate: dateRange.endDate }),
    ...(pathSearch && { path: pathSearch }),
    ...(statusFilter !== 'all' && { statusCode: Number(statusFilter) }),
    ...(methodFilter !== 'all' && { method: methodFilter }),
  };

  const { data } = useSuspenseQuery(requestLogsOptions(params));
  const totalPages = Math.ceil(data.total / data.pageSize) || 1;

  return (
    <div className='space-y-4'>
      {/* Filters */}
      <div className='flex items-center gap-3 flex-wrap'>
        <div className='relative max-w-xs flex-1'>
          <Icons.search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search path...'
            value={pathSearch}
            onChange={(e) => {
              setPathSearch(e.target.value);
              setPage(1);
            }}
            className='pl-9'
          />
        </div>
        <Select
          value={methodFilter}
          onValueChange={(v) => {
            setMethodFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className='w-[120px]'>
            <SelectValue placeholder='Method' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All methods</SelectItem>
            <SelectItem value='GET'>GET</SelectItem>
            <SelectItem value='POST'>POST</SelectItem>
            <SelectItem value='PUT'>PUT</SelectItem>
            <SelectItem value='PATCH'>PATCH</SelectItem>
            <SelectItem value='DELETE'>DELETE</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className='w-[140px]'>
            <SelectValue placeholder='Status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All status</SelectItem>
            <SelectItem value='200'>200 OK</SelectItem>
            <SelectItem value='201'>201 Created</SelectItem>
            <SelectItem value='400'>400 Bad Request</SelectItem>
            <SelectItem value='401'>401 Unauthorized</SelectItem>
            <SelectItem value='403'>403 Forbidden</SelectItem>
            <SelectItem value='404'>404 Not Found</SelectItem>
            <SelectItem value='500'>500 Server Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>User</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='h-24 text-center text-muted-foreground'
                >
                  No request logs found
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className='whitespace-nowrap text-xs text-muted-foreground'>
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getMethodBadgeVariant(log.method)}
                      className='text-xs'
                    >
                      {log.method}
                    </Badge>
                  </TableCell>
                  <TableCell className='max-w-[300px] truncate font-mono text-xs'>
                    {log.path}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getStatusBadgeVariant(log.statusCode)}
                      className='text-xs'
                    >
                      {log.statusCode}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-xs tabular-nums'>
                    <span
                      className={
                        log.duration >= 1000
                          ? 'text-destructive font-medium'
                          : log.duration >= 500
                            ? 'text-yellow-600 dark:text-yellow-500'
                            : ''
                      }
                    >
                      {formatDuration(log.duration)}
                    </span>
                  </TableCell>
                  <TableCell className='text-xs text-muted-foreground'>
                    {log.userId ? (
                      <code className='text-xs'>{log.userId.slice(0, 8)}</code>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className='flex items-center justify-between'>
        <span className='text-sm text-muted-foreground'>
          {data.total.toLocaleString()} total
        </span>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className='text-sm'>
            {page} / {totalPages}
          </span>
          <Button
            variant='outline'
            size='sm'
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
