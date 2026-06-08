'use client';

import { useEffect, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { eventLogsOptions } from '../api/queries';
import type { DateRangeParams, EventLogQueryParams } from '../api/types';
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

interface BehaviorEventsTableProps {
  dateRange?: DateRangeParams;
}

export function BehaviorEventsTable({ dateRange }: BehaviorEventsTableProps) {
  const [page, setPage] = useState(1);
  const [eventNameSearch, setEventNameSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  useEffect(() => {
    setPage(1);
  }, [dateRange?.startDate, dateRange?.endDate]);

  const params: EventLogQueryParams = {
    page,
    pageSize: 20,
    ...(dateRange?.startDate && { startDate: dateRange.startDate }),
    ...(dateRange?.endDate && { endDate: dateRange.endDate }),
    ...(eventNameSearch && { eventName: eventNameSearch }),
    ...(eventTypeFilter !== 'all' && { eventType: eventTypeFilter }),
  };

  const { data } = useSuspenseQuery(eventLogsOptions(params));
  const totalPages = Math.ceil(data.total / data.pageSize) || 1;

  return (
    <div className='space-y-4'>
      {/* Filters */}
      <div className='flex items-center gap-3 flex-wrap'>
        <div className='relative max-w-xs flex-1'>
          <Icons.search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search event name...'
            value={eventNameSearch}
            onChange={(e) => {
              setEventNameSearch(e.target.value);
              setPage(1);
            }}
            className='pl-9'
          />
        </div>
        <Select
          value={eventTypeFilter}
          onValueChange={(v) => {
            setEventTypeFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className='w-[160px]'>
            <SelectValue placeholder='Event type' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All types</SelectItem>
            <SelectItem value='page_view'>Page View</SelectItem>
            <SelectItem value='click'>Click</SelectItem>
            <SelectItem value='form_submit'>Form Submit</SelectItem>
            <SelectItem value='api_call'>API Call</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Page</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Properties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='h-24 text-center text-muted-foreground'
                >
                  No behavior events found
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className='whitespace-nowrap text-xs text-muted-foreground'>
                    {new Date(event.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className='text-sm font-medium'>
                    {event.eventName}
                  </TableCell>
                  <TableCell>
                    <Badge variant='secondary' className='text-xs'>
                      {event.eventType}
                    </Badge>
                  </TableCell>
                  <TableCell className='max-w-[200px] truncate font-mono text-xs text-muted-foreground'>
                    {event.page ?? '-'}
                  </TableCell>
                  <TableCell className='text-xs text-muted-foreground'>
                    {event.userId ? (
                      <code className='text-xs'>
                        {event.userId.slice(0, 8)}
                      </code>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className='max-w-[300px]'>
                    {event.properties ? (
                      <details className='group'>
                        <summary className='cursor-pointer text-xs text-muted-foreground hover:text-foreground'>
                          View properties
                        </summary>
                        <pre className='mt-2 text-xs font-mono bg-muted p-2 rounded-md overflow-x-auto max-h-[200px] overflow-y-auto'>
                          {JSON.stringify(event.properties, null, 2)}
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
