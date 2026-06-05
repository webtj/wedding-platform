'use client';

import { useEffect } from 'react';

export default function ThemeColorSync({ darkColor }: { darkColor: string }) {
  useEffect(() => {
    try {
      const isDark =
        localStorage.theme === 'dark' ||
        ((!('theme' in localStorage) || localStorage.theme === 'system') &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document
          .querySelector('meta[name="theme-color"]')
          ?.setAttribute('content', darkColor);
      }
    } catch {
      // ignore — localStorage or matchMedia may be unavailable
    }
  }, [darkColor]);

  return null;
}
