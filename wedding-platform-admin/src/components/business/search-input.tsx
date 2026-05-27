'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';

type Props = {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function SearchInput({ placeholder, value, onChange, className }: Props) {
  const [input, setInput] = useState(value);
  const debounced = useDebouncedCallback(onChange, 400);

  return (
    <div className={`relative flex-1 max-w-xs ${className ?? ''}`}>
      <Icons.search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
      <Input
        placeholder={placeholder}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          debounced(e.target.value);
        }}
        className='pl-9'
      />
    </div>
  );
}
