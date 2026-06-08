'use client';

import { useEffect, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { auditLogsOptions } from '../api/queries';
import type { AuditLogQueryParams, DateRangeParams } from '../api/types';
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

function getActionBadgeVariant(
  action: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const normalized = action.toLowerCase();
  if (normalized.endsWith(':failed')) {
    return 'destructive';
  }

  switch (normalized) {
    case 'create':
      return 'default';
    case 'update':
      return 'secondary';
    case 'delete':
      return 'destructive';
    default:
      return 'outline';
  }
}

function formatActionLabel(action: string): string {
  if (action.toLowerCase().endsWith(':failed')) {
    return `${action.slice(0, -7)} failed`;
  }

  return action;
}

interface AuditLogsTableProps {
  dateRange?: DateRangeParams;
}

export function AuditLogsTable({ dateRange }: AuditLogsTableProps) {
  const [page, setPage] = useState(1);
  const [entitySearch, setEntitySearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    setPage(1);
  }, [dateRange?.startDate, dateRange?.endDate]);

  const params: AuditLogQueryParams = {
    page,
    pageSize: 20,
    ...(dateRange?.startDate && { startDate: dateRange.startDate }),
    ...(dateRange?.endDate && { endDate: dateRange.endDate }),
    ...(entitySearch && { entity: entitySearch }),
    ...(actionFilter !== 'all' && { action: actionFilter }),
  };

  const { data } = useSuspenseQuery(auditLogsOptions(params));
  const totalPages = Math.ceil(data.total / data.pageSize) || 1;

  return (
    <div className='space-y-4'>
      {/* Filters */}
      <div className='flex items-center gap-3 flex-wrap'>
        <div className='relative max-w-xs flex-1'>
          <Icons.search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search entity...'
            value={entitySearch}
            onChange={(e) => {
              setEntitySearch(e.target.value);
              setPage(1);
            }}
            className='pl-9'
          />
        </div>
        <Select
          value={actionFilter}
          onValueChange={(v) => {
            setActionFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className='w-[140px]'>
            <SelectValue placeholder='Action' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All actions</SelectItem>
            <SelectItem value='create'>Create</SelectItem>
            <SelectItem value='create:failed'>Create failed</SelectItem>
            <SelectItem value='update'>Update</SelectItem>
            <SelectItem value='update:failed'>Update failed</SelectItem>
            <SelectItem value='delete'>Delete</SelectItem>
            <SelectItem value='delete:failed'>Delete failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Changes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='h-24 text-center text-muted-foreground'
                >
                  No audit logs found
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
                      variant={getActionBadgeVariant(log.action)}
                      className='text-xs'
                    >
                      {formatActionLabel(log.action)}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-sm font-medium'>
                    {log.entity}
                  </TableCell>
                  <TableCell className='font-mono text-xs text-muted-foreground'>
                    {log.entityId.slice(0, 12)}
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
                  <TableCell className='max-w-[300px]'>
                    {log.changes ? (
                      <details className='group'>
                        <summary className='cursor-pointer text-xs text-muted-foreground hover:text-foreground'>
                          View changes
                        </summary>
                        <pre className='mt-2 text-xs font-mono bg-muted p-2 rounded-md overflow-x-auto max-h-[200px] overflow-y-auto'>
                          {JSON.stringify(log.changes, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span className='text-xs text-muted-foreground'>-</span>
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
