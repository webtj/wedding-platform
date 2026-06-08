'use client';

import { useEffect, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { errorLogsOptions } from '../api/queries';
import type { DateRangeParams, ErrorLogQueryParams } from '../api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ErrorLogsTableProps {
  dateRange?: DateRangeParams;
}

export function ErrorLogsTable({ dateRange }: ErrorLogsTableProps) {
  const [page, setPage] = useState(1);
  const [pathSearch, setPathSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [dateRange?.startDate, dateRange?.endDate]);

  const params: ErrorLogQueryParams = {
    page,
    pageSize: 20,
    ...(dateRange?.startDate && { startDate: dateRange.startDate }),
    ...(dateRange?.endDate && { endDate: dateRange.endDate }),
    ...(pathSearch && { path: pathSearch }),
  };

  const { data } = useSuspenseQuery(errorLogsOptions(params));
  const totalPages = Math.ceil(data.total / data.pageSize) || 1;

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

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
      </div>

      {/* Table */}
      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-8' />
              <TableHead>Time</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Trace ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='h-24 text-center text-muted-foreground'
                >
                  No error logs found
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((log) => (
                <>
                  <TableRow
                    key={log.id}
                    className='cursor-pointer'
                    onClick={() => toggleExpand(log.id)}
                  >
                    <TableCell>
                      {expandedId === log.id ? (
                        <Icons.chevronDown className='h-4 w-4 text-muted-foreground' />
                      ) : (
                        <Icons.chevronRight className='h-4 w-4 text-muted-foreground' />
                      )}
                    </TableCell>
                    <TableCell className='whitespace-nowrap text-xs text-muted-foreground'>
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className='max-w-[300px] truncate text-sm'>
                      <span className='text-destructive font-medium'>
                        {log.message}
                      </span>
                    </TableCell>
                    <TableCell className='font-mono text-xs text-muted-foreground'>
                      {log.path ?? '-'}
                    </TableCell>
                    <TableCell className='text-xs text-muted-foreground'>
                      {log.userId ? (
                        <code className='text-xs'>
                          {log.userId.slice(0, 8)}
                        </code>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className='font-mono text-xs text-muted-foreground'>
                      <Badge variant='outline' className='text-xs'>
                        {log.traceId.slice(0, 8)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  {expandedId === log.id && (
                    <TableRow key={`${log.id}-expanded`}>
                      <TableCell colSpan={6} className='bg-muted/30 p-4'>
                        <div className='space-y-3'>
                          {log.stack && (
                            <div>
                              <p className='text-xs font-medium mb-1'>
                                Stack Trace
                              </p>
                              <pre className='text-xs font-mono bg-muted p-3 rounded-md overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap break-all'>
                                {log.stack}
                              </pre>
                            </div>
                          )}
                          {log.requestBody != null && (
                            <div>
                              <p className='text-xs font-medium mb-1'>
                                Request Body
                              </p>
                              <pre className='text-xs font-mono bg-muted p-3 rounded-md overflow-x-auto max-h-[200px] overflow-y-auto'>
                                {String(JSON.stringify(log.requestBody, null, 2))}
                              </pre>
                            </div>
                          )}
                          <div className='flex items-center gap-2'>
                            <span className='text-xs text-muted-foreground'>
                              Full Trace ID:
                            </span>
                            <code className='text-xs'>{log.traceId}</code>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
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
