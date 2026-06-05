'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useSceneStore } from '../store/scene-store';
import { autoArrangeSeats, suggestLayout, generateSeatCards } from '../api/queries';
import type {
  GuestInfo,
  AutoArrangePayload,
  SuggestLayoutPayload,
  GenerateSeatCardsPayload
} from '../api/types';

interface AiPanelProps {
  sceneId: string;
  className?: string;
}

type AiMode = 'arrange' | 'layout' | 'cards';

export function AiPanel({ sceneId, className }: AiPanelProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<AiMode>('arrange');

  // Auto-arrange state
  const [guestInput, setGuestInput] = useState('');
  const [tableCount, setTableCount] = useState<number | undefined>();
  const [seatsPerTable, setSeatsPerTable] = useState<number | undefined>();
  const [keepGroupsTogether, setKeepGroupsTogether] = useState(true);
  const [vipTables, setVipTables] = useState(0);

  // Layout suggestion state
  const [guestCount, setGuestCount] = useState(100);
  const [layoutStyle, setLayoutStyle] = useState<SuggestLayoutPayload['style']>('round_tables');
  const [stagePosition, setStagePosition] = useState<SuggestLayoutPayload['stagePosition']>('north');

  // Seat cards state
  const [cardStyle, setCardStyle] = useState<GenerateSeatCardsPayload['style']>('elegant');
  const [cardLanguage, setCardLanguage] = useState<GenerateSeatCardsPayload['language']>('zh');

  // Store actions
  const addObject = useSceneStore((s) => s.addObject);
  const venue = useSceneStore((s) => s.venue);
  const objects = useSceneStore((s) => s.objects);

  // Parse guest input text into guest list
  const parseGuestInput = useCallback((input: string): GuestInfo[] => {
    return input
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const parts = line.split(',').map((p) => p.trim());
        return {
          name: parts[0],
          group: parts[1] || undefined,
          tablePreference: parts[2] || undefined,
        };
      });
  }, []);

  // Auto-arrange mutation
  const autoArrangeMutation = useMutation({
    mutationFn: async () => {
      const guestList = parseGuestInput(guestInput);
      if (guestList.length === 0) {
        throw new Error('请输入至少一位宾客');
      }

      const payload: AutoArrangePayload = {
        guestList,
        tableCount,
        seatsPerTable,
        constraints: {
          keepGroupsTogether,
          vipTables,
        },
      };

      return autoArrangeSeats(sceneId, payload);
    },
    onSuccess: (data) => {
      // Add new tables from AI arrangement
      data.tables.forEach((table) => {
        addObject({
          type: 'round_table_10',
          category: 'table',
          name: table.tableName,
          position: table.position,
          size: { width: 2, depth: 2, height: 0.75 },
          rotation: 0,
          layerId: 'tables',
          locked: false,
          visible: true,
          style: { color: '#C9A45C' },
          business: {
            tableNumber: table.tableNumber,
            guests: table.guests,
            aiGenerated: true,
          },
        });
      });

      toast.success(`已安排 ${data.tables.length} 桌座位`);
      queryClient.invalidateQueries({ queryKey: ['scene', sceneId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'AI安排座位失败');
    },
  });

  // Suggest layout mutation
  const suggestLayoutMutation = useMutation({
    mutationFn: async () => {
      const payload: SuggestLayoutPayload = {
        guestCount,
        venueWidth: venue.width,
        venueDepth: venue.depth,
        style: layoutStyle,
        stagePosition,
      };

      return suggestLayout(sceneId, payload);
    },
    onSuccess: (data) => {
      if (data.suggestions.length === 0) {
        toast.info('AI未返回布局建议');
        return;
      }

      // Apply the highest-scored layout
      const bestLayout = data.suggestions.reduce((best, current) =>
        current.score > best.score ? current : best
      );

      // Add tables from the suggested layout
      bestLayout.tables.forEach((table) => {
        addObject({
          type: table.type === 'round' ? 'round_table_10' : 'rect_table_8',
          category: 'table',
          name: `桌号 ${table.tableNumber}`,
          position: table.position,
          size: { width: table.size.width, depth: table.size.depth, height: 0.75 },
          rotation: 0,
          layerId: 'tables',
          locked: false,
          visible: true,
          style: { color: '#C9A45C' },
          business: {
            tableNumber: table.tableNumber,
            capacity: table.capacity,
            aiGenerated: true,
          },
        });
      });

      toast.success(`已应用布局: ${bestLayout.name}`);
      queryClient.invalidateQueries({ queryKey: ['scene', sceneId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'AI布局建议失败');
    },
  });

  // Generate seat cards mutation
  const generateSeatCardsMutation = useMutation({
    mutationFn: async () => {
      // Extract table assignments from current scene objects
      const tables = objects.filter((o) => o.category === 'table' && o.business?.guests);

      if (tables.length === 0) {
        throw new Error('请先安排座位，然后再生成席位卡');
      }

      const payload: GenerateSeatCardsPayload = {
        tableAssignments: tables.map((table) => {
          const guests = Array.isArray(table.business?.guests) ? table.business.guests : [];
          return {
            tableNumber: (table.business?.tableNumber as number) || 1,
            tableName: table.name,
            guests: guests.map((g: { name?: string; group?: string }) => ({
              name: g.name || '',
              title: g.group,
            })),
          };
        }),
        style: cardStyle,
        language: cardLanguage,
      };

      return generateSeatCards(sceneId, payload);
    },
    onSuccess: (data) => {
      toast.success(`已生成 ${data.generated} 张席位卡`);
      // You could open a modal or download the cards here
    },
    onError: (err: Error) => {
      toast.error(err.message || '生成席位卡失败');
    },
  });

  return (
    <div className={cn('flex flex-col border-l bg-background', className)}>
      <div className='shrink-0 border-b px-3 py-2'>
        <h3 className='flex items-center gap-2 text-xs font-semibold'>
          <Icons.sparkles className='size-4 text-primary' />
          AI 助手
        </h3>
      </div>

      {/* Mode selector */}
      <div className='flex shrink-0 gap-0.5 border-b px-2 py-1'>
        {[
          { id: 'arrange' as const, label: '座位安排', icon: Icons.teams },
          { id: 'layout' as const, label: '布局建议', icon: Icons.grid },
          { id: 'cards' as const, label: '席位卡', icon: Icons.media },
        ].map((item) => (
          <button
            key={item.id}
            type='button'
            onClick={() => setMode(item.id)}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors',
              mode === item.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <item.icon className='size-3' />
            {item.label}
          </button>
        ))}
      </div>

      <ScrollArea className='flex-1'>
        <div className='space-y-4 p-3'>
          {/* Auto-arrange mode */}
          {mode === 'arrange' && (
            <>
              <div className='space-y-2'>
                <Label className='text-xs' htmlFor='guest-list'>
                  宾客名单
                </Label>
                <p className='text-muted-foreground text-[10px]'>
                  每行一位宾客，格式: 姓名,分组,桌位偏好
                </p>
                <textarea
                  id='guest-list'
                  aria-label='宾客名单'
                  value={guestInput}
                  onChange={(e) => setGuestInput(e.target.value)}
                  placeholder='张三,家人,VIP&#10;李四,朋友&#10;王五,同事'
                  className='h-32 w-full rounded-md border bg-background px-2 py-1.5 text-xs'
                />
              </div>

              <div className='grid grid-cols-2 gap-2'>
                <div className='space-y-1'>
                  <Label className='text-xs'>桌数 (可选)</Label>
                  <Input
                    type='number'
                    value={tableCount ?? ''}
                    onChange={(e) => setTableCount(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder='自动'
                    min={1}
                    max={50}
                    className='h-7 text-xs'
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs'>每桌人数</Label>
                  <Input
                    type='number'
                    value={seatsPerTable ?? ''}
                    onChange={(e) => setSeatsPerTable(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder='10'
                    min={2}
                    max={20}
                    className='h-7 text-xs'
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <input
                    type='checkbox'
                    id='keepGroups'
                    aria-label='同组宾客安排在一起'
                    checked={keepGroupsTogether}
                    onChange={(e) => setKeepGroupsTogether(e.target.checked)}
                    className='size-3'
                  />
                  <Label htmlFor='keepGroups' className='text-xs'>
                    同组宾客安排在一起
                  </Label>
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs'>VIP桌数</Label>
                  <Input
                    type='number'
                    value={vipTables}
                    onChange={(e) => setVipTables(Number(e.target.value))}
                    min={0}
                    max={10}
                    className='h-7 text-xs'
                  />
                </div>
              </div>

              <Button
                onClick={() => autoArrangeMutation.mutate()}
                disabled={autoArrangeMutation.isPending || !guestInput.trim()}
                className='w-full'
                size='sm'
              >
                {autoArrangeMutation.isPending ? (
                  <Icons.spinner className='mr-2 size-3 animate-spin' />
                ) : (
                  <Icons.sparkles className='mr-2 size-3' />
                )}
                AI 自动安排座位
              </Button>
            </>
          )}

          {/* Layout suggestion mode */}
          {mode === 'layout' && (
            <>
              <div className='space-y-2'>
                <Label className='text-xs'>宾客人数</Label>
                <Input
                  type='number'
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  min={1}
                  max={500}
                  className='h-7 text-xs'
                />
              </div>

              <div className='space-y-2'>
                <Label className='text-xs'>桌型偏好</Label>
                <div className='grid grid-cols-2 gap-1'>
                  {([
                    { value: 'round_tables', label: '圆桌' },
                    { value: 'rectangular_tables', label: '长桌' },
                    { value: 'mixed', label: '混合' },
                    { value: 'banquet_hall', label: '宴会厅' },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      type='button'
                      onClick={() => setLayoutStyle(option.value)}
                      className={cn(
                        'rounded-md px-2 py-1 text-[11px] transition-colors',
                        layoutStyle === option.value
                          ? 'bg-primary text-primary-foreground'
                          : 'border text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className='space-y-2'>
                <Label className='text-xs'>舞台位置</Label>
                <div className='grid grid-cols-4 gap-1'>
                  {([
                    { value: 'north', label: '北' },
                    { value: 'south', label: '南' },
                    { value: 'east', label: '东' },
                    { value: 'west', label: '西' },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      type='button'
                      onClick={() => setStagePosition(option.value)}
                      className={cn(
                        'rounded-md px-2 py-1 text-[11px] transition-colors',
                        stagePosition === option.value
                          ? 'bg-primary text-primary-foreground'
                          : 'border text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className='rounded-md bg-muted/50 p-2 text-[10px] text-muted-foreground'>
                场地尺寸: {venue.width}m × {venue.depth}m
              </div>

              <Button
                onClick={() => suggestLayoutMutation.mutate()}
                disabled={suggestLayoutMutation.isPending}
                className='w-full'
                size='sm'
              >
                {suggestLayoutMutation.isPending ? (
                  <Icons.spinner className='mr-2 size-3 animate-spin' />
                ) : (
                  <Icons.sparkles className='mr-2 size-3' />
                )}
                AI 建议布局
              </Button>
            </>
          )}

          {/* Seat cards mode */}
          {mode === 'cards' && (
            <>
              <div className='space-y-2'>
                <Label className='text-xs'>卡片风格</Label>
                <div className='grid grid-cols-2 gap-1'>
                  {([
                    { value: 'elegant', label: '优雅' },
                    { value: 'modern', label: '现代' },
                    { value: 'rustic', label: '田园' },
                    { value: 'minimalist', label: '简约' },
                    { value: 'floral', label: '花艺' },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      type='button'
                      onClick={() => setCardStyle(option.value)}
                      className={cn(
                        'rounded-md px-2 py-1 text-[11px] transition-colors',
                        cardStyle === option.value
                          ? 'bg-primary text-primary-foreground'
                          : 'border text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className='space-y-2'>
                <Label className='text-xs'>语言</Label>
                <div className='grid grid-cols-3 gap-1'>
                  {([
                    { value: 'zh', label: '中文' },
                    { value: 'en', label: '英文' },
                    { value: 'both', label: '双语' },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      type='button'
                      onClick={() => setCardLanguage(option.value)}
                      className={cn(
                        'rounded-md px-2 py-1 text-[11px] transition-colors',
                        cardLanguage === option.value
                          ? 'bg-primary text-primary-foreground'
                          : 'border text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className='rounded-md bg-muted/50 p-2 text-[10px] text-muted-foreground'>
                当前场景有 {objects.filter((o) => o.category === 'table').length} 桌
              </div>

              <Button
                onClick={() => generateSeatCardsMutation.mutate()}
                disabled={generateSeatCardsMutation.isPending || objects.filter((o) => o.category === 'table').length === 0}
                className='w-full'
                size='sm'
              >
                {generateSeatCardsMutation.isPending ? (
                  <Icons.spinner className='mr-2 size-3 animate-spin' />
                ) : (
                  <Icons.sparkles className='mr-2 size-3' />
                )}
                生成席位卡
              </Button>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
