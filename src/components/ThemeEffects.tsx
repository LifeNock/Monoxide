'use client';

import { useTheme } from '@/contexts/ThemeContext';
import dynamic from 'next/dynamic';

const SnowEffect = dynamic(() => import('./SnowEffect'), { ssr: false });

export default function ThemeEffects() {
  const { theme } = useTheme();
  if (theme === 'christmas') return <SnowEffect />;
  return null;
}
