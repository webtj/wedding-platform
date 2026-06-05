'use client';

import Image from 'next/image';

export function StaticHeroFallback() {
  return (
    <div className='absolute inset-0 overflow-hidden'>
      <Image
        src='/assets/auth-hero/visual-target-selected.png'
        alt=''
        fill
        priority
        unoptimized
        className='object-cover'
      />
      <div className='absolute inset-0 bg-gradient-to-r from-black/12 via-transparent to-black/16' />
    </div>
  );
}
