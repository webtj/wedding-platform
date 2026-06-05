'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface VenueSetupDialogProps {
  open: boolean;
  onSubmit: (data: { width: number; height: number; name: string }) => void;
}

const VENUE_TEMPLATES = [
  { label: '自定义', width: 20, depth: 30 },
  { label: '小型宴会厅 (10×15m)', width: 10, depth: 15 },
  { label: '中型宴会厅 (15×25m)', width: 15, depth: 25 },
  { label: '大型宴会厅 (20×35m)', width: 20, depth: 35 },
  { label: '户外草坪 (25×40m)', width: 25, depth: 40 }
];

export function VenueSetupDialog({ open, onSubmit }: VenueSetupDialogProps) {
  const [name, setName] = useState('宴会厅');
  const [width, setWidth] = useState(20);
  const [height, setHeight] = useState(30);

  const handleTemplate = useCallback((value: string) => {
    const tpl = VENUE_TEMPLATES.find((t) => t.label === value);
    if (tpl) {
      setWidth(tpl.width);
      setHeight(tpl.depth);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (width > 0 && height > 0) {
      onSubmit({ width, height, name });
    }
  }, [width, height, name, onSubmit]);

  return (
    <Dialog open={open} onOpenChange={() => {/* prevent close before submission */}}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>设置场地</DialogTitle>
          <DialogDescription>设置婚礼场地的基本尺寸</DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label>场地模板</Label>
            <Select onValueChange={handleTemplate}>
              <SelectTrigger>
                <SelectValue placeholder='选择模板或自定义' />
              </SelectTrigger>
              <SelectContent>
                {VENUE_TEMPLATES.map((tpl) => (
                  <SelectItem key={tpl.label} value={tpl.label}>
                    {tpl.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label>场地名称</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder='如：三楼宴会厅' />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label>宽度 (m)</Label>
              <Input type='number' min={1} max={200} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
            </div>
            <div className='space-y-2'>
              <Label>深度 (m)</Label>
              <Input type='number' min={1} max={200} value={height} onChange={(e) => setHeight(Number(e.target.value))} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={width <= 0 || height <= 0}>
            创建场景
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
